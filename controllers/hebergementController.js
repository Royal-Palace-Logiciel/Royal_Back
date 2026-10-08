// controllers/hebergementController.js
const heb = require('../models/hebergementModel');
const hotelReport = require('../models/hotelReport.model');
const hotelReservationReport = require('../models/hotelReservationReport.model');
const whatsappModel = require('../models/hotelReportWhatsapp.model');
const dispatcher = require('../services/hotelReportDispatcher');
const transport = require('../utils/whatsappTransport');
const { getHotelProductHistory } = require('../models/hotelProductHistory.model');
const stock = require('../models/stockModel');
const { withTransaction, pool } = require('../config/db');
const { createCrudController } = require('./controllerFactory');
const ApiError = require('../utils/ApiError');
const { ok, created, noContent } = require('../utils/apiResponse');

function isAdmin(req) {
  return String(req.user?.role || '').toLowerCase() === 'admin';
}

const roomTypesCrud = createCrudController(heb.RoomTypes, {});
const roomsCrud = createCrudController(heb.Rooms, { filterable: ['statut', 'room_type_id'] });

// Custom delete handler for equipment to handle foreign key constraints
const equipmentsCrud = createCrudController(heb.Equipments, { filterable: ['categorie'] });
equipmentsCrud.remove = async function(req, res, next) {
  const id = req.params.id;

  try {
    const result = await withTransaction(async (conn) => {
      const [maintenanceRows] = await conn.query(
        'SELECT COUNT(*) AS count FROM room_maintenance WHERE equipment_id = ?',
        [id]
      );
      if (Number(maintenanceRows[0].count) > 0) {
        throw ApiError.conflict('Cet équipement est utilisé dans des maintenances. Veuillez d\'abord supprimer ou modifier les maintenances associées.');
      }

      const [equipmentRows] = await conn.query(
        'SELECT id, product_id, nom FROM equipments WHERE id = ? FOR UPDATE',
        [id]
      );
      const equipment = equipmentRows[0];
      if (!equipment) throw ApiError.notFound('Équipement introuvable');

      const [roomRows] = await conn.query(
        'SELECT id, quantite FROM room_equipments WHERE equipment_id = ? FOR UPDATE',
        [id]
      );
      const assignedQuantity = roomRows.reduce((total, row) => total + Number(row.quantite || 0), 0);

      if (equipment.product_id && assignedQuantity > 0) {
        await stock.recordMovement({
          productId: equipment.product_id,
          locationId: 5,
          type: 'ENTREE',
          quantite: assignedQuantity,
          sourceModule: 'EQUIPEMENT_CHAMBRE',
          referenceId: id,
          motif: `Retour de l'équipement "${equipment.nom}" au stock hôtel`,
          userId: req.user?.id_admin || req.user?.id,
          conn,
        });
      }

      await conn.query('DELETE FROM room_equipments WHERE equipment_id = ?', [id]);
      const [result] = await conn.query('DELETE FROM equipments WHERE id = ?', [id]);
      if (result.affectedRows === 0) throw ApiError.notFound('Équipement introuvable');
      return true;
    });

    return result ? noContent(res) : undefined;
  } catch (error) {
    return next(error);
  }
};

async function createEquipmentHandler(req, res) {
  const data = { ...req.body };
  const quantity = Number(data.quantite ?? 1);
  if (!String(data.nom || '').trim() || !Number.isInteger(quantity) || quantity <= 0) {
    throw ApiError.badRequest('Le nom et une quantité entière positive sont requis');
  }
  const equipment = await withTransaction(async (conn) => {
    const equipmentFields = ['code', 'nom', 'categorie', 'description', 'zone', 'quantite', 'is_consumable'];
    const values = equipmentFields.filter((field) => data[field] !== undefined).map((field) => data[field]);
    const columns = equipmentFields.filter((field) => data[field] !== undefined);
    const [createdEquipment] = await conn.query(
      `INSERT INTO equipments (${columns.map((field) => `\`${field}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      values
    );
    const equipmentId = createdEquipment.insertId;
    const equipmentCode = data.code || `EQ-${equipmentId}`;
    let productId = data.product_id ? Number(data.product_id) : null;
    if (productId) {
      const [linkedProducts] = await conn.query('SELECT id FROM products WHERE id = ? LIMIT 1', [productId]);
      if (!linkedProducts[0]) throw ApiError.badRequest('Le produit associé est introuvable');
    } else {
      const [matchingProducts] = await conn.query('SELECT id FROM products WHERE code = ? ORDER BY id LIMIT 1', [equipmentCode]);
      productId = matchingProducts[0]?.id;
      if (!productId) {
        const [product] = await conn.query(
          `INSERT INTO products (nom, code, unite, type_produit, prix_vente, actif, source_module)
           VALUES (?, ?, 'unités', ?, 0, 1, 'HOTEL')`,
          [data.nom, equipmentCode, data.is_consumable ? 'CONSOMMABLE' : 'PRODUIT_FINI']
        );
        productId = product.insertId;
      }
    }
    await conn.query('UPDATE equipments SET product_id = ? WHERE id = ?', [productId, equipmentId]);
    await stock.recordMovement({
      productId,
      locationId: 5,
      type: 'ENTREE',
      quantite: quantity,
      sourceModule: 'EQUIPEMENT',
      referenceId: equipmentId,
      motif: `Création équipement: ${data.nom}`,
      userId: req.user?.id_admin || req.user?.id,
      conn,
    });
    const [rows] = await conn.query('SELECT * FROM equipments WHERE id = ?', [equipmentId]);
    return rows[0];
  });
  return created(res, equipment);
}

async function updateEquipmentHandler(req, res) {
  const id = req.params.id;
  const data = { ...req.body };
  if (data.quantite !== undefined && (!Number.isInteger(Number(data.quantite)) || Number(data.quantite) < 0)) {
    throw ApiError.badRequest('La quantité doit être un nombre entier positif ou nul');
  }
  const updatedEquipment = await withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM equipments WHERE id = ? FOR UPDATE', [id]);
    const existing = rows[0];
    if (!existing) throw ApiError.notFound('Équipement introuvable');
    if (data.quantite !== undefined) {
      const [[assigned]] = await conn.query(
        'SELECT COALESCE(SUM(quantite), 0) AS total FROM room_equipments WHERE equipment_id = ?',
        [id]
      );
      if (Number(data.quantite) < Number(assigned.total || 0)) {
        throw ApiError.conflict(`Quantité minimale requise : ${assigned.total} déjà assigné(s) à des chambres`);
      }
    }
    const fields = ['code', 'nom', 'categorie', 'description', 'zone', 'quantite', 'is_consumable'];
    const columns = fields.filter((field) => data[field] !== undefined);
    if (columns.length) {
      await conn.query(
        `UPDATE equipments SET ${columns.map((field) => `\`${field}\` = ?`).join(', ')} WHERE id = ?`,
        [...columns.map((field) => data[field]), id]
      );
    }
    const quantityDiff = data.quantite === undefined ? 0 : Number(data.quantite) - Number(existing.quantite || 0);
    if (quantityDiff !== 0 && existing.product_id) {
      await stock.recordMovement({
        productId: existing.product_id,
        locationId: 5,
        type: quantityDiff > 0 ? 'ENTREE' : 'SORTIE',
        quantite: Math.abs(quantityDiff),
        sourceModule: 'EQUIPEMENT',
        referenceId: id,
        motif: 'Modification équipement',
        userId: req.user?.id_admin || req.user?.id,
        allowNegative: false,
        conn,
      });
    }
    const [updated] = await conn.query('SELECT * FROM equipments WHERE id = ?', [id]);
    return updated[0];
  });
  return ok(res, updatedEquipment);
}

const roomEquipmentsCrud = createCrudController(heb.RoomEquipments, { filterable: ['room_id', 'statut'] });
async function persistRoomEquipment(data, id = null, userId = null) {
  return withTransaction(async (conn) => {
    let existing = null;
    if (id) {
      const [rows] = await conn.query('SELECT * FROM room_equipments WHERE id = ? FOR UPDATE', [id]);
      existing = rows[0];
      if (!existing) throw ApiError.notFound(`Équipement de chambre #${id} introuvable`);
    }
    const roomId = Number(data.room_id ?? existing?.room_id);
    const equipmentId = Number(data.equipment_id ?? existing?.equipment_id);
    const quantity = Number(data.quantite ?? existing?.quantite ?? 1);
    const zone = data.zone ?? existing?.zone ?? 'CHAMBRE';
    if (!roomId || !equipmentId || !Number.isInteger(quantity) || quantity <= 0) {
      throw ApiError.badRequest('room_id, equipment_id et une quantité entière positive sont requis');
    }
    const [roomRows] = await conn.query('SELECT id FROM rooms WHERE id = ? LIMIT 1', [roomId]);
    if (!roomRows[0]) throw ApiError.notFound('Chambre introuvable');

    const [equipmentRows] = await conn.query('SELECT * FROM equipments WHERE id = ? FOR UPDATE', [equipmentId]);
    const equipment = equipmentRows[0];
    if (!equipment) throw ApiError.notFound('Équipement introuvable');
    if (!equipment.product_id) {
      throw ApiError.conflict('Cet équipement n’est pas lié au stock hôtel. Reliez-le à un produit avant de l’assigner.');
    }
    const [assignedRows] = await conn.query(
      'SELECT COALESCE(SUM(quantite), 0) AS total FROM room_equipments WHERE equipment_id = ? AND id <> ?',
      [equipmentId, id || 0]
    );
    const proposedTotal = Number(assignedRows[0].total || 0) + quantity;
    if (proposedTotal > Number(equipment.quantite || 0)) {
      throw ApiError.conflict(`Quantité insuffisante : ${Math.max(0, Number(equipment.quantite || 0) - Number(assignedRows[0].total || 0))} disponible`);
    }

    let assignmentId = id;
    let movementQuantity = quantity;
    if (existing && Number(existing.equipment_id) === equipmentId) {
      movementQuantity = quantity - Number(existing.quantite || 0);
      const [duplicates] = await conn.query(
        'SELECT id FROM room_equipments WHERE room_id = ? AND equipment_id = ? AND COALESCE(zone, \'CHAMBRE\') = ? AND id <> ? LIMIT 1 FOR UPDATE',
        [roomId, equipmentId, zone, id]
      );
      if (duplicates[0]) {
        assignmentId = duplicates[0].id;
        await conn.query('UPDATE room_equipments SET quantite = quantite + ? WHERE id = ?', [quantity, assignmentId]);
        await conn.query('DELETE FROM room_equipments WHERE id = ?', [id]);
      } else {
        const fields = ['room_id', 'equipment_id', 'quantite', 'statut', 'zone'];
        const payload = { ...existing, ...data, room_id: roomId, equipment_id: equipmentId, quantite: quantity, zone };
        const columns = fields.filter((field) => payload[field] !== undefined);
        await conn.query(
          `UPDATE room_equipments SET ${columns.map((field) => `\`${field}\` = ?`).join(', ')} WHERE id = ?`,
          [...columns.map((field) => payload[field]), id]
        );
      }
    } else {
      if (existing) {
        const [oldEquipmentRows] = await conn.query('SELECT product_id FROM equipments WHERE id = ?', [existing.equipment_id]);
        if (oldEquipmentRows[0]?.product_id) {
          await stock.recordMovement({
            productId: oldEquipmentRows[0].product_id,
            locationId: 5,
            type: 'ENTREE',
            quantite: existing.quantite,
            sourceModule: 'EQUIPEMENT_CHAMBRE',
            referenceId: existing.id,
            motif: 'Retrait équipement de chambre',
            userId,
            conn,
          });
        }
        await conn.query('DELETE FROM room_equipments WHERE id = ?', [id]);
      }
      const [duplicates] = await conn.query(
        'SELECT * FROM room_equipments WHERE room_id = ? AND equipment_id = ? AND COALESCE(zone, \'CHAMBRE\') = ? FOR UPDATE',
        [roomId, equipmentId, zone]
      );
      if (duplicates[0]) {
        assignmentId = duplicates[0].id;
        await conn.query('UPDATE room_equipments SET quantite = quantite + ? WHERE id = ?', [quantity, assignmentId]);
      } else {
        const [inserted] = await conn.query(
          'INSERT INTO room_equipments (room_id, equipment_id, quantite, statut, zone) VALUES (?, ?, ?, ?, ?)',
          [roomId, equipmentId, quantity, data.statut || 'BON', zone]
        );
        assignmentId = inserted.insertId;
      }
    }

    if (movementQuantity !== 0) {
      await stock.recordMovement({
        productId: equipment.product_id,
        locationId: 5,
        type: movementQuantity > 0 ? 'SORTIE' : 'ENTREE',
        quantite: Math.abs(movementQuantity),
        sourceModule: 'EQUIPEMENT_CHAMBRE',
        referenceId: assignmentId,
        motif: movementQuantity > 0 ? 'Affectation équipement à une chambre' : 'Retour équipement au stock hôtel',
        userId,
        allowNegative: movementQuantity > 0 ? false : true,
        conn,
      });
    }
    const [savedRows] = await conn.query('SELECT * FROM room_equipments WHERE id = ?', [assignmentId]);
    return savedRows[0];
  });
}
roomEquipmentsCrud.create = async function(req, res) {
  return created(res, await persistRoomEquipment(req.body, null, req.user?.id_admin || req.user?.id));
};
roomEquipmentsCrud.update = async function(req, res) {
  return ok(res, await persistRoomEquipment(req.body, req.params.id, req.user?.id_admin || req.user?.id));
};
roomEquipmentsCrud.remove = async function(req, res) {
  const result = await withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM room_equipments WHERE id = ? FOR UPDATE', [req.params.id]);
    const assignment = rows[0];
    if (!assignment) throw ApiError.notFound(`room_equipments #${req.params.id} introuvable`);
    const [products] = await conn.query('SELECT product_id FROM equipments WHERE id = ?', [assignment.equipment_id]);
    if (products[0]?.product_id && Number(assignment.quantite) > 0) {
      await stock.recordMovement({
        productId: products[0].product_id,
        locationId: 5,
        type: 'ENTREE',
        quantite: assignment.quantite,
        sourceModule: 'EQUIPEMENT_CHAMBRE',
        referenceId: assignment.id,
        motif: 'Retour équipement au stock hôtel',
        userId: req.user?.id_admin || req.user?.id,
        conn,
      });
    }
    await conn.query('DELETE FROM room_equipments WHERE id = ?', [assignment.id]);
    return true;
  });
  return result ? ok(res, { message: 'Équipement retiré de la chambre et retourné au stock' }) : undefined;
};
const roomMaintenanceCrud = createCrudController(heb.RoomMaintenance, { filterable: ['room_id', 'statut', 'type_intervention'] });
const maintenanceWorkersCrud = createCrudController(heb.MaintenanceWorkers, { filterable: ['statut', 'specialite'] });
const roomMinibarCrud = createCrudController(heb.RoomMinibar, { filterable: ['room_id'] });
const roomStatusHistoryCrud = createCrudController(heb.RoomStatusHistory, { filterable: ['room_id'] });
const reservationsCrud = createCrudController(heb.Reservations, { filterable: ['client_id', 'room_id', 'statut'] });

// Transferts / excursions saisis manuellement : nettoie la liste reçue (tableau ou
// chaîne JSON) et calcule leur total. Retourne { json: null, total: 0 } si vide.
const EXTRA_SERVICE_TYPES = ['TRANSFERT', 'EXCURSION'];
function normalizeServicesExtras(raw) {
  let list = raw;
  if (typeof list === 'string') {
    try { list = JSON.parse(list || '[]'); } catch { list = []; }
  }
  if (!Array.isArray(list)) list = [];
  const items = list
    .map((item) => ({
      type: EXTRA_SERVICE_TYPES.includes(String(item?.type || '').toUpperCase()) ? String(item.type).toUpperCase() : 'TRANSFERT',
      description: String(item?.description || '').trim().slice(0, 255),
      date: item?.date ? String(item.date).slice(0, 10) : '',
      heure: item?.heure ? String(item.heure).slice(0, 5) : '',
      personnes: Math.max(0, Math.floor(Number(item?.personnes) || 0)),
      prix: Math.max(0, Number(item?.prix) || 0),
    }))
    .filter((item) => item.description || item.prix > 0);
  const total = items.reduce((sum, item) => sum + item.prix, 0);
  return { json: items.length ? JSON.stringify(items) : null, total };
}

// Custom update handler to track user modifications
const reservationsCrudUpdate = reservationsCrud.update;
reservationsCrud.update = async function(req, res) {
  const id = req.params.id || req.params.reservationId;
  const modifiedBy = req.user?.id_admin || req.user?.id;
  const body = { ...req.body };
  const role = String(req.user?.role || '').toLowerCase();
  if (String(body.moyen_paiement || '').toUpperCase() === 'GRATUIT'
      || String(body.statut || '').toUpperCase() === 'TERMINEE') {
    const existing = await heb.Reservations.findById(id);
    const effectiveMethod = String(body.moyen_paiement || existing?.moyen_paiement || '').toUpperCase();
    if (effectiveMethod === 'GRATUIT' && !['admin', 'manager'].includes(role)) {
      throw ApiError.forbidden('Seule la direction peut autoriser une gratuité.');
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, 'services_extras')) {
    const extras = normalizeServicesExtras(body.services_extras);
    body.services_extras = extras.json;
    body.services_extras_total = extras.total;
  }
  const row = await heb.Reservations.update(id, body, modifiedBy);
  return ok(res, row);
};
const reservationGuestsCrud = createCrudController(heb.ReservationGuests, { filterable: ['reservation_id'] });
const staysCrud = createCrudController(heb.Stays, { filterable: ['reservation_id'] });
const housekeepingCrud = createCrudController(heb.HousekeepingTasks, { filterable: ['room_id', 'statut', 'assigned_user_id'] });
housekeepingCrud.create = async function(req, res) {
  const row = await heb.saveHousekeepingTask(null, req.body);
  return created(res, row);
};
housekeepingCrud.update = async function(req, res) {
  const row = await heb.saveHousekeepingTask(req.params.id, req.body);
  return ok(res, row);
};
housekeepingCrud.remove = async function(req, res) {
  await heb.deleteHousekeepingTask(req.params.id);
  return ok(res, { message: 'Tâche supprimée' });
};
roomMaintenanceCrud.create = async function(req, res) {
  const row = await heb.saveMaintenance(null, { ...req.body, created_by: req.user?.id_admin || req.user?.id });
  return created(res, row);
};
roomMaintenanceCrud.update = async function(req, res) {
  const row = await heb.saveMaintenance(req.params.id, req.body);
  return ok(res, row);
};
roomMaintenanceCrud.remove = async function(req, res) {
  await heb.deleteMaintenance(req.params.id);
  return ok(res, { message: 'Maintenance supprimée' });
};
const lostAndFoundCrud = createCrudController(heb.LostAndFound, { filterable: ['room_id', 'statut'] });
const minibarConsumptionsCrud = createCrudController(heb.MinibarConsumptions, { filterable: ['room_id', 'client_id', 'facturee'] });

async function createMaintenanceHandler(req, res) {
  const data = { ...req.body };
  data.room_id = data.room_id ? Number(data.room_id) : null;
  data.equipment_id = data.equipment_id ? Number(data.equipment_id) : null;
  data.worker_id = data.worker_id ? Number(data.worker_id) : null;
  data.total_cost = Number(data.materials_cost || 0) + Number(data.labor_cost || 0);
  data.cout = data.total_cost;
  if (!data.location || !data.type_intervention) throw ApiError.badRequest('Le lieu et le type d\'intervention sont requis');
  data.created_by = req.user?.id_admin || req.user?.id;
  const row = await heb.saveMaintenance(null, data);
  return created(res, row);
}

async function updateRoomHandler(req, res) {
  if (Object.prototype.hasOwnProperty.call(req.body, 'prix_nuit') && !isAdmin(req)) {
    throw ApiError.forbidden('Seul un administrateur peut modifier le tarif d’une chambre');
  }
  const existing = await heb.Rooms.findById(req.params.id);
  if (!existing) throw ApiError.notFound(`rooms #${req.params.id} introuvable`);
  return ok(res, await heb.Rooms.update(req.params.id, req.body));
}

async function updateRoomTypeHandler(req, res) {
  if (Object.prototype.hasOwnProperty.call(req.body, 'prix_base') && !isAdmin(req)) {
    throw ApiError.forbidden('Seul un administrateur peut modifier le tarif du type de chambre');
  }
  const existing = await heb.RoomTypes.findById(req.params.id);
  if (!existing) throw ApiError.notFound(`room_types #${req.params.id} introuvable`);
  return ok(res, await heb.RoomTypes.update(req.params.id, req.body));
}

// --- Logique métier ----------------------------------------------------------

async function availabilityHandler(req, res) {
  const { room_id, date_arrivee, date_depart } = req.query;
  if (!room_id || !date_arrivee || !date_depart) throw ApiError.badRequest('room_id, date_arrivee, date_depart sont requis');
  const disponible = await heb.isRoomAvailable(room_id, date_arrivee, date_depart);
  return ok(res, { available: disponible, room_id: Number(room_id) });
}

async function availableRoomsHandler(req, res) {
  const rows = await heb.availableRooms({ typeId: req.query.room_type_id });
  return ok(res, rows);
}

async function createReservationHandler(req, res) {
  const { client_id, room_id, date_arrivee, date_depart, pdj_inclus = false, remise_pourcentage = 0, guests, statut, type_reservation = 'BOOKING', laundry_included = false, laundry_price = 0, manual_price = 0, exchange_rate = 39.76, services_extras } = req.body;
  if (!client_id || !room_id || !date_arrivee || !date_depart) {
    throw ApiError.badRequest('client_id, room_id, date_arrivee, date_depart sont requis');
  }
  const disponible = await heb.isRoomAvailable(room_id, date_arrivee, date_depart);
  if (!disponible) throw ApiError.conflict('Chambre non disponible sur cette période');

  const discount = Number(remise_pourcentage);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    throw ApiError.badRequest('La remise doit être comprise entre 0 et 100 %');
  }
  const room = await heb.Rooms.findById(room_id);
  const nights = Math.ceil((new Date(date_depart) - new Date(date_arrivee)) / 86400000);
  if (!room || nights <= 0) throw ApiError.badRequest('Dates ou chambre invalides');
  
  let gross = 0;
  
  // For Booking.com, manual_price is per night in EUR, so: per_night_price × nights × exchange_rate
  if (type_reservation === 'BOOKING' && manual_price > 0) {
    const rate = Number(exchange_rate) || 39.76;
    const totalEur = Number(manual_price) * nights;
    gross = totalEur * rate;
  } else {
    // For On-site, use room's normal price
    gross = Number(room.prix_nuit || 0) * nights;
  }
  
  // Add laundry price if included
  if (laundry_included) {
    gross += Number(laundry_price || 0);
  }
  
  const discountAmount = Math.round(gross * discount / 100);
  // Transferts et excursions : ajoutés au total, hors remise.
  const extras = normalizeServicesExtras(services_extras);

  const reservation = await heb.createReservationWithGuests({
    clientId: client_id,
    roomId: room_id,
    dateArrivee: date_arrivee,
    dateDepart: date_depart,
    pdjInclus: Boolean(pdj_inclus),
    montantTotal: gross - discountAmount + extras.total,
    servicesExtras: extras.json,
    servicesExtrasTotal: extras.total,
    montantBrut: gross,
    remisePourcentage: discount,
    montantRemise: discountAmount,
    statut: statut || 'EN_COURS',
    guests: guests || [],
    typeReservation: type_reservation,
    laundryIncluded: laundry_included,
    laundryPrice: laundry_price,
    manualPrice: manual_price,
    createdBy: req.user?.id_admin || req.user?.id,
  });
  const reservationWithDetails = await heb.Reservations.findById(reservation.id);
  return created(res, reservationWithDetails);
}

// GET /api/hebergement/reservations/:id/payments — historique des encaissements
async function reservationPaymentsHandler(req, res) {
  const rows = await heb.listReservationPayments(req.params.id);
  return ok(res, rows);
}

async function createReservationPaymentHandler(req, res) {
  const role = String(req.user?.role || '').toLowerCase();
  const canAuthorizeFree = ['admin', 'manager'].includes(role);
  if (Array.isArray(req.body?.modes_paiement)
      && req.body.modes_paiement.some((mode) => String(mode?.moyen_paiement || '').toUpperCase() === 'GRATUIT')
      && !canAuthorizeFree) {
    throw ApiError.forbidden('Seule la direction peut autoriser une gratuité.');
  }
  try {
    const result = await heb.createReservationPayment(req.params.id, {
      amount: req.body?.montant,
      methods: req.body?.modes_paiement,
      idempotencyKey: req.body?.idempotency_key,
      createdBy: req.user?.id_admin || req.user?.id,
      canAuthorizeFree,
    });
    return result.duplicate ? ok(res, result) : created(res, result);
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') throw ApiError.conflict('Cette opération de paiement a déjà été enregistrée.');
    if (err?.statusCode === 403) throw ApiError.forbidden(err.message);
    if (err?.statusCode === 404) throw ApiError.notFound(err.message);
    if (err?.code && String(err.code).startsWith('ER_')) throw err;
    throw ApiError.badRequest(err.message || 'Paiement invalide.');
  }
}

async function validateReservationDiscountHandler(req, res) {
  const role = String(req.user?.role || '').toLowerCase();
  if (!['admin', 'manager'].includes(role)) {
    throw ApiError.forbidden('Seule la direction peut valider une remise');
  }
  const reservation = await heb.validateReservationDiscount(req.params.id, req.user.id_admin || req.user.id);
  if (!reservation) throw ApiError.notFound('Réservation introuvable');
  return ok(res, reservation);
}

async function checkInHandler(req, res) {
  try {
    const stay = await heb.checkIn(req.params.reservationId);
    return created(res, stay);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
}

async function checkOutHandler(req, res) {
  try {
    const stay = await heb.checkOut(req.params.stayId);
    return ok(res, stay);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
}

async function updateMaintenanceStatusHandler(req, res) {
  const { statut, materials_used } = req.body;
  if (!statut) throw ApiError.badRequest('statut est requis');
  try {
    const maintenance = await heb.updateMaintenanceStatus(req.params.id, statut, materials_used);
    return ok(res, maintenance);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
}

async function maintenanceStatsHandler(req, res) {
  const stats = await heb.getMaintenanceStats();
  return ok(res, stats);
}

async function reservationStatsHandler(req, res) {
  const stats = await heb.getReservationStats();
  return ok(res, stats);
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function reservationCollectionReportHandler(req, res) {
  const { start_date: startDate, end_date: endDate } = req.query;
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    throw ApiError.badRequest('Les dates de début et de fin doivent être au format YYYY-MM-DD.');
  }
  if (startDate > endDate) {
    throw ApiError.badRequest('La date de début doit précéder ou être égale à la date de fin.');
  }
  return ok(res, await heb.getReservationCollectionReport(startDate, endDate));
}

async function saveReservationCollectionReportHandler(req, res) {
  const { startDate, endDate, totalCollected, paymentMethods, reservations } = req.body || {};
  const allowedPaymentMethods = [
    'ESPECES', 'TPE', 'MVOLA', 'GRATUIT', 'VIREMENT', 'CREDIT', 'ORANGE_MONEY', 'CARTE',
  ];

  if (!isIsoDate(startDate) || !isIsoDate(endDate) || startDate > endDate) {
    throw ApiError.badRequest('La période du rapport est invalide.');
  }
  if (!Number.isFinite(Number(totalCollected)) || Number(totalCollected) < 0) {
    throw ApiError.badRequest('Le montant encaissé est invalide.');
  }
  if (!paymentMethods || typeof paymentMethods !== 'object'
      || !allowedPaymentMethods.every((method) =>
        Number.isFinite(Number(paymentMethods[method])) && Number(paymentMethods[method]) >= 0
      )) {
    throw ApiError.badRequest('Les montants par mode de paiement sont invalides.');
  }
  if (!Array.isArray(reservations)) {
    throw ApiError.badRequest('La liste des réservations est invalide.');
  }

  const saved = await hotelReservationReport.saveHotelReservationReport({
    startDate,
    endDate,
    totalCollected: Number(totalCollected),
    paymentMethods: Object.fromEntries(
      allowedPaymentMethods.map((method) => [method, Number(paymentMethods[method])])
    ),
    reservations,
    createdBy: req.user?.id_admin || req.user?.id,
  });
  return created(res, saved);
}

async function updateRoomStatusHandler(req, res) {
  const { statut } = req.body;
  if (!statut) throw ApiError.badRequest('statut est requis');
  try {
    const room = await heb.updateRoomStatus(req.params.id, statut);
    return ok(res, room);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
}

async function equipmentByCodeHandler(req, res) {
  try {
    const equipment = await heb.getEquipmentByCode(req.params.code);
    return ok(res, equipment);
  } catch (err) {
    throw ApiError.notFound(err.message);
  }
}

async function equipmentCategoriesHandler(req, res) {
  const categories = await heb.getEquipmentCategories();
  return ok(res, categories);
}

async function equipmentStatsHandler(req, res) {
  const stats = await heb.getEquipmentStats();
  return ok(res, stats);
}

async function updateRoomEquipmentStatusHandler(req, res) {
  const { statut } = req.body;
  if (!statut) throw ApiError.badRequest('statut est requis');
  try {
    const roomEquipment = await heb.updateRoomEquipmentStatus(req.params.id, statut);
    return ok(res, roomEquipment);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
}

async function roomStatsHandler(req, res) {
  const stats = await heb.getRoomStats();
  return ok(res, stats);
}

async function updateHousekeepingStatusHandler(req, res) {
  const { statut, products_used } = req.body;
  if (!statut) throw ApiError.badRequest('statut est requis');
  try {
    const task = await heb.updateHousekeepingStatus(req.params.id, statut, products_used);
    return ok(res, task);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
}

async function housekeepingStatsHandler(req, res) {
  const stats = await heb.getHousekeepingStats();
  return ok(res, stats);
}

// --- Minibar Stock Management Handlers ---

async function transferStockToMinibarHandler(req, res) {
  const { product_id, source_location_id, quantity, room_id } = req.body;
  if (!product_id || !source_location_id || !quantity || !room_id) {
    throw ApiError.badRequest('product_id, source_location_id, quantity, room_id sont requis');
  }
  const result = await heb.transferStockToMinibar({
    productId: product_id,
    sourceLocationId: source_location_id,
    quantity: quantity,
    roomId: room_id,
    userId: req.user?.id,
  });
  return ok(res, result);
}

async function handleMinibarConsumptionHandler(req, res) {
  const { room_id, product_id, quantity, client_id, price } = req.body;
  if (!room_id || !product_id || !quantity || !client_id || !price) {
    throw ApiError.badRequest('room_id, product_id, quantity, client_id, price sont requis');
  }
  const consumption = await heb.handleMinibarConsumption({
    roomId: room_id,
    productId: product_id,
    quantity: quantity,
    clientId: client_id,
    price: price,
  });
  return created(res, consumption);
}

async function getMinibarWithAlertsHandler(req, res) {
  const items = await heb.getMinibarWithAlerts();
  return ok(res, items);
}

async function restockMinibarHandler(req, res) {
  const { room_id, product_id, quantity } = req.body;
  if (!room_id || !product_id || !quantity) {
    throw ApiError.badRequest('room_id, product_id, quantity sont requis');
  }
  const result = await heb.restockMinibar({
    roomId: room_id,
    productId: product_id,
    quantity: quantity,
    userId: req.user?.id,
  });
  return ok(res, result);
}

async function getLowStockMinibarHandler(req, res) {
  const items = await heb.getLowStockMinibarItems();
  return ok(res, items);
}

// Hotel history with user filtering
async function getHotelHistoryHandler(req, res) {
  const { user_id, start_date, end_date, statut, limit = 50, offset = 0 } = req.query;

  const options = {
    userId: user_id ? Number(user_id) : undefined,
    startDate: start_date || undefined,
    endDate: end_date ? `${end_date} 23:59:59` : undefined,
    statut: statut || undefined,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  };

  const reservations = await heb.findReservationsWithUserDetails(options);
  return ok(res, reservations);
}

// Get users for hotel history filtering
async function getUsersHandler(req, res) {
  const { pool } = require('../config/db');
  try {
    // Check if users table exists
    const [tables] = await pool.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
    );

    if (tables.length === 0) {
      return ok(res, []);
    }

    // Check if required columns exist
    const [columns] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('id_admin', 'nom', 'prenom', 'role', 'statut')"
    );

    if (columns.length < 5) {
      return ok(res, []);
    }

    // Get active users with receptionist role (case-insensitive)
    const [rows] = await pool.query(
      `SELECT id_admin, nom, prenom, email, role, statut
       FROM users
       WHERE statut = 'ACTIF' AND LOWER(role) IN ('reception', 'receptionist', 'receptioniste')
       ORDER BY nom, prenom`
    );
    return ok(res, rows);
  } catch (error) {
    console.error('Error loading users:', error);
    return ok(res, []);
  }
}

// --- Accommodation Stock Management Handlers ---

async function getHebergementStockHandler(req, res) {
  const rows = await stock.getProductsWithStock(5);
  return ok(res, rows.map((row) => ({
    ...row,
    nom: row.product_nom,
    categorie: row.category_name || 'Stock',
    prix: row.prix_vente,
    unite: row.product_unite,
  })));
}

async function addHebergementStockHandler(req, res) {
  const { nom, categorie, quantite, prix, unite, seuil_minimum } = req.body;
  req.body = {
    ...req.body,
    categorie,
    prix_vente: prix ?? req.body.prix_vente,
    unite: unite || 'unités',
    quantite: quantite ?? 0,
    seuil_minimum: seuil_minimum ?? 5,
    location_id: 5,
  };
  return require('./stockController').createProductWithStockHandler(req, res);
}

async function updateHebergementStockHandler(req, res) {
  const { id } = req.params;
  const { nom, categorie, quantite, prix, unite, seuil_minimum } = req.body;
  if (quantite !== undefined && (!Number.isFinite(Number(quantite)) || Number(quantite) < 0)) {
    throw ApiError.badRequest('La quantité doit être positive ou nulle');
  }
  if (quantite !== undefined && !Number.isInteger(Number(quantite))) {
    throw ApiError.badRequest('La quantité du stock hôtel doit être un nombre entier');
  }
  if (prix !== undefined && (!Number.isFinite(Number(prix)) || Number(prix) < 0)) {
    throw ApiError.badRequest('Le prix doit être positif ou nul');
  }
  if (seuil_minimum !== undefined && (!Number.isFinite(Number(seuil_minimum)) || Number(seuil_minimum) < 0)) {
    throw ApiError.badRequest('Le seuil minimum doit être positif ou nul');
  }
  if (seuil_minimum !== undefined && !Number.isInteger(Number(seuil_minimum))) {
    throw ApiError.badRequest('Le seuil minimum doit être un nombre entier');
  }
  const result = await withTransaction(async (conn) => {
    const [rows] = await conn.query(
      `SELECT s.*, p.nom AS product_nom, p.unite AS product_unite, p.prix_vente, p.category_id
       FROM stocks s JOIN products p ON p.id = s.product_id
       WHERE s.id = ? AND s.location_id = 5 FOR UPDATE`,
      [id]
    );
    const existing = rows[0];
    if (!existing) throw ApiError.notFound(`Stock hôtel #${id} introuvable`);

    const productUpdates = [];
    const productValues = [];
    if (nom !== undefined) { productUpdates.push('nom = ?'); productValues.push(String(nom).trim()); }
    if (unite !== undefined) { productUpdates.push('unite = ?'); productValues.push(unite); }
    if (prix !== undefined) { productUpdates.push('prix_vente = ?'); productValues.push(Number(prix)); }
    if (categorie !== undefined) {
      const [categoryRows] = await conn.query(
        'SELECT id FROM categories WHERE nom COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci ORDER BY id LIMIT 1',
        [categorie]
      );
      let categoryId = categoryRows[0]?.id;
      if (!categoryId) {
        const [insertedCategory] = await conn.query('INSERT INTO categories (nom) VALUES (?)', [categorie]);
        categoryId = insertedCategory.insertId;
      }
      productUpdates.push('category_id = ?');
      productValues.push(categoryId);
    }
    if (productUpdates.length) {
      await conn.query(`UPDATE products SET ${productUpdates.join(', ')} WHERE id = ?`, [...productValues, existing.product_id]);
    }
    if (quantite !== undefined) {
      const difference = Number(quantite) - Number(existing.quantite || 0);
      if (difference !== 0) {
        await stock.recordMovement({
          productId: existing.product_id,
          locationId: 5,
          type: difference > 0 ? 'ENTREE' : 'SORTIE',
          quantite: Math.abs(difference),
          sourceModule: 'STOCK_MANUEL',
          motif: 'Modification manuelle du stock hôtel',
          userId: req.user?.id_admin || req.user?.id,
          conn,
        });
      }
    }
    if (seuil_minimum !== undefined) {
      await conn.query('UPDATE stocks SET seuil_minimum = ? WHERE id = ?', [Number(seuil_minimum), id]);
    }
    const [updated] = await conn.query(
      `SELECT s.*, p.nom AS nom, p.unite AS unite, p.prix_vente AS prix, c.nom AS categorie
       FROM stocks s JOIN products p ON p.id = s.product_id
       LEFT JOIN categories c ON c.id = p.category_id WHERE s.id = ?`,
      [id]
    );
    return updated[0];
  });
  return ok(res, result);
}

async function deleteHebergementStockHandler(req, res) {
  return require('./stockController').deleteStockHandler(req, res);
}

// --- Rapport journalier Hotel (situation des chambres durant la nuitee) ---

async function getHotelDailyReportHandler(req, res) {
  return ok(res, await hotelReport.getHotelReport(req.params.date));
}

async function listHotelDailyReportsHandler(req, res) {
  const { start_date, end_date, limit } = req.query || {};
  const reports = await hotelReport.listHotelReports({
    startDate: start_date,
    endDate: end_date,
    limit,
  });
  return ok(res, reports);
}

async function saveHotelDailyReportHandler(req, res) {
  const { reportDate, heureDebut, heureFin, receptionniste, rooms, observations, metrics, autoState } = req.body || {};
  const report = await hotelReport.saveHotelReport({
    reportDate,
    heureDebut,
    heureFin,
    receptionniste,
    rooms,
    observations,
    metrics,
    autoState,
    createdBy: req.user?.id_admin ?? null,
  });
  return ok(res, report);
}

async function deleteHotelDailyReportHandler(req, res) {
  if (!isAdmin(req)) {
    throw ApiError.forbidden('Seul un administrateur peut supprimer un rapport journalier.');
  }
  return ok(res, await hotelReport.deleteHotelReport(req.params.date));
}

async function getHotelProductHistoryHandler(req, res) {
  const { dateFrom, dateTo, productName, locationId } = req.query;
  const history = await getHotelProductHistory({ dateFrom, dateTo, productName, locationId });
  return ok(res, history);
}

// --- Envoi WhatsApp du rapport de nuitee ---

async function hotelReportWhatsappStatusHandler(req, res) {
  const reportDate = req.query?.date || dispatcher.getCurrentNightDate();
  const [destinataires, dernier, decision] = await Promise.all([
    whatsappModel.listRecipients(),
    whatsappModel.getLastSend(reportDate),
    dispatcher.evaluate(reportDate).catch((error) => ({ envoyer: false, raison: error.message })),
  ]);
  return ok(res, {
    reportDate,
    actif: dispatcher.isEnabled(),
    configure: transport.isConfigured(),
    transport: transport.getTransportName(),
    intervalleMinutes: Math.round(dispatcher.getMinIntervalMs() / 60000),
    destinataires,
    dernierEnvoi: dernier,
    prochaineDecision: decision?.raison || null,
    envoiPossible: Boolean(decision?.envoyer),
  });
}

async function hotelReportWhatsappHistoryHandler(req, res) {
  const reportDate = req.query?.date || dispatcher.getCurrentNightDate();
  return ok(res, await whatsappModel.listSends(reportDate, req.query?.limit));
}

async function addHotelReportWhatsappRecipientHandler(req, res) {
  const { numero, nom, type } = req.body || {};
  const recipient = await whatsappModel.addRecipient({ numero, nom, type, createdBy: req.user?.id_admin ?? null });
  return created(res, recipient);
}

// --- Session WhatsApp Web (transport non officiel) ---

async function hotelReportWhatsappSessionHandler(req, res) {
  if (!transport.isWeb()) {
    return ok(res, { transport: transport.getTransportName(), statut: 'INACTIF' });
  }
  return ok(res, { transport: 'web', ...transport.web.getState() });
}

async function connectHotelReportWhatsappSessionHandler(req, res) {
  if (!transport.isWeb()) {
    throw ApiError.badRequest('Le transport WhatsApp Web n’est pas actif (WHATSAPP_TRANSPORT doit valoir « web »).');
  }
  return ok(res, await transport.web.ensureStarted());
}

async function disconnectHotelReportWhatsappSessionHandler(req, res) {
  if (!isAdmin(req)) {
    throw ApiError.forbidden('Seul un administrateur peut délier le compte WhatsApp.');
  }
  return ok(res, await transport.web.stop({ logout: req.query?.logout === 'true' }));
}

async function hotelReportWhatsappGroupsHandler(req, res) {
  if (!transport.isWeb()) return ok(res, []);
  return ok(res, await transport.web.listGroups());
}

async function updateHotelReportWhatsappRecipientHandler(req, res) {
  return ok(res, await whatsappModel.setRecipientActive(req.params.id, req.body?.actif));
}

async function deleteHotelReportWhatsappRecipientHandler(req, res) {
  return ok(res, await whatsappModel.removeRecipient(req.params.id));
}

async function sendHotelReportWhatsappHandler(req, res) {
  const reportDate = req.body?.date || dispatcher.getCurrentNightDate();
  const result = await dispatcher.dispatch(reportDate, { force: true, declencheur: 'MANUEL' });
  if (!result.envoye) throw ApiError.badRequest(result.raison);
  return ok(res, result);
}

module.exports = {
  roomTypesCrud, roomsCrud, equipmentsCrud, roomEquipmentsCrud, roomMaintenanceCrud, maintenanceWorkersCrud,
  roomMinibarCrud, roomStatusHistoryCrud, reservationsCrud, reservationGuestsCrud,
  staysCrud, housekeepingCrud, lostAndFoundCrud, minibarConsumptionsCrud,
  availabilityHandler, availableRoomsHandler, updateRoomHandler, updateRoomTypeHandler, createReservationHandler, validateReservationDiscountHandler, reservationPaymentsHandler, createReservationPaymentHandler, createMaintenanceHandler, checkInHandler, checkOutHandler,
  updateMaintenanceStatusHandler, maintenanceStatsHandler, reservationStatsHandler,
  reservationCollectionReportHandler, saveReservationCollectionReportHandler,
  updateRoomStatusHandler, equipmentByCodeHandler, equipmentCategoriesHandler, createEquipmentHandler, updateEquipmentHandler,
  equipmentStatsHandler, updateRoomEquipmentStatusHandler,
  roomStatsHandler, updateHousekeepingStatusHandler, housekeepingStatsHandler,
  getHotelProductHistoryHandler,
  transferStockToMinibarHandler, handleMinibarConsumptionHandler, getMinibarWithAlertsHandler, restockMinibarHandler, getLowStockMinibarHandler,
  getHebergementStockHandler, addHebergementStockHandler, updateHebergementStockHandler, deleteHebergementStockHandler,
  getHotelHistoryHandler, getUsersHandler,
  getHotelDailyReportHandler, listHotelDailyReportsHandler, saveHotelDailyReportHandler, deleteHotelDailyReportHandler,
  hotelReportWhatsappStatusHandler, hotelReportWhatsappHistoryHandler, addHotelReportWhatsappRecipientHandler,
  updateHotelReportWhatsappRecipientHandler, deleteHotelReportWhatsappRecipientHandler, sendHotelReportWhatsappHandler,
  hotelReportWhatsappSessionHandler, connectHotelReportWhatsappSessionHandler,
  disconnectHotelReportWhatsappSessionHandler, hotelReportWhatsappGroupsHandler,
};
