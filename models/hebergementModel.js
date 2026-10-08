// models/hebergementModel.js
const { pool, withTransaction } = require('../config/db');
const { createCrudModel } = require('./crudFactory');
const stockModel = require('./stockModel');
const crypto = require('crypto');
const { validateHotelPayment, getHotelPaymentStatus, roundMoney, isIdempotentReplay } = require('../utils/hotelPaymentRules');

const RoomTypes = createCrudModel({
  table: 'room_types', pk: 'id', fields: ['nom', 'description', 'prix_base'], sortable: ['id', 'nom', 'prix_base'],
});

const Rooms = createCrudModel({
  table: 'rooms', pk: 'id',
  fields: ['room_type_id', 'numero', 'capacite', 'prix_nuit', 'statut', 'etage'],
  sortable: ['id', 'numero', 'statut', 'prix_nuit', 'etage'],
});

const Equipments = createCrudModel({
  table: 'equipments', pk: 'id',
  fields: ['code', 'nom', 'categorie', 'description', 'zone', 'quantite', 'is_consumable'],
  sortable: ['id', 'nom', 'categorie', 'zone'],
});

const RoomEquipments = createCrudModel({
  table: 'room_equipments', pk: 'id',
  fields: ['room_id', 'equipment_id', 'quantite', 'statut', 'zone'],
  sortable: ['id', 'statut', 'zone'],
});

const RoomMaintenance = createCrudModel({
  table: 'room_maintenance', pk: 'id',
  fields: ['room_id', 'equipment_id', 'type_intervention', 'description', 'statut',
    'date_declaration', 'date_resolution', 'cout', 'created_by', 'location',
    'equipment_label', 'worker_id', 'execution_date', 'finish_date',
    'materials_cost', 'labor_cost', 'total_cost', 'materials_used'],
  sortable: ['id', 'statut', 'date_declaration'],
});

const MaintenanceWorkers = createCrudModel({
  table: 'maintenance_workers', pk: 'id',
  fields: ['nom', 'prenom', 'telephone', 'email', 'specialite', 'date_debut', 'date_fin', 'statut', 'photo_url', 'id_photo_url', 'contract_url', 'quote_url', 'time_slot'],
  sortable: ['id', 'nom', 'specialite', 'date_debut'],
});

const RoomMinibar = createCrudModel({
  table: 'room_minibar', pk: 'id',
  fields: ['room_id', 'product_id', 'quantite', 'seuil_alerte'],
  sortable: ['id', 'quantite'],
});

const RoomStatusHistory = createCrudModel({
  table: 'room_status_history', pk: 'id',
  fields: ['room_id', 'ancien_statut', 'nouveau_statut', 'commentaire', 'changed_by', 'changed_at'],
  sortable: ['id', 'changed_at'],
});

const Reservations = createCrudModel({
  table: 'reservations', pk: 'id',
  fields: ['client_id', 'room_id', 'date_arrivee', 'date_depart', 'pdj_inclus', 'moyen_paiement', 'montant_brut', 'remise_pourcentage', 'montant_remise', 'remise_validee_par', 'remise_validee_at', 'montant_total', 'statut', 'type_reservation', 'laundry_included', 'laundry_price', 'manual_price', 'services_extras', 'services_extras_total', 'created_by', 'modified_by', 'created_at', 'updated_at'],
  sortable: ['id', 'date_arrivee', 'date_depart', 'statut', 'created_at', 'updated_at'],
});

const reservationsFindAll = Reservations.findAll;
const reservationsFindById = Reservations.findById;
const reservationsCreate = Reservations.create;
const reservationsCrudUpdate = Reservations.update;
const reservationsRemove = Reservations.remove;

async function findReservationWithDetails(id) {
  // Check if tracking columns exist
  const [trackingColumns] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME IN ('created_by', 'modified_by')"
  );
  const hasTracking = trackingColumns.length >= 2;

  let query, params;
  if (hasTracking) {
    query = `SELECT r.*, c.nom AS client_nom, c.prenom AS client_prenom, room.numero AS room_numero,
            creator.nom AS created_by_nom, creator.prenom AS created_by_prenom,
            modifier.nom AS modified_by_nom, modifier.prenom AS modified_by_prenom,
            (COALESCE(r.montant_paye, 0) >= COALESCE(r.montant_total, 0)) AS est_payee,
            CASE
              WHEN GREATEST(COALESCE(r.montant_total, 0) - COALESCE(r.montant_paye, 0), 0) <= 0
                THEN CASE WHEN COALESCE(r.montant_gratuit, 0) > 0 THEN 'GRATUIT' ELSE 'PAYE' END
              WHEN COALESCE(r.montant_credit, 0) > 0 THEN 'CREDIT'
              WHEN COALESCE(r.montant_gratuit, 0) > 0 THEN 'GRATUIT'
              WHEN COALESCE(r.montant_paye, 0) > 0 THEN 'PARTIELLEMENT_PAYE'
              ELSE 'IMPAYE'
            END AS statut_paiement,
            GREATEST(COALESCE(r.montant_total, 0) - COALESCE(r.montant_paye, 0), 0) AS montant_restant
     FROM reservations r
     LEFT JOIN clients c ON c.id = r.client_id
     LEFT JOIN rooms room ON room.id = r.room_id
     LEFT JOIN users creator ON creator.id_admin = r.created_by
     LEFT JOIN users modifier ON modifier.id_admin = r.modified_by
     WHERE r.id = ? LIMIT 1`;
    params = [id];
  } else {
    query = `SELECT r.*, c.nom AS client_nom, c.prenom AS client_prenom, room.numero AS room_numero,
            (COALESCE(r.montant_paye, 0) >= COALESCE(r.montant_total, 0)) AS est_payee,
            CASE
              WHEN GREATEST(COALESCE(r.montant_total, 0) - COALESCE(r.montant_paye, 0), 0) <= 0
                THEN CASE WHEN COALESCE(r.montant_gratuit, 0) > 0 THEN 'GRATUIT' ELSE 'PAYE' END
              WHEN COALESCE(r.montant_credit, 0) > 0 THEN 'CREDIT'
              WHEN COALESCE(r.montant_gratuit, 0) > 0 THEN 'GRATUIT'
              WHEN COALESCE(r.montant_paye, 0) > 0 THEN 'PARTIELLEMENT_PAYE'
              ELSE 'IMPAYE'
            END AS statut_paiement,
            GREATEST(COALESCE(r.montant_total, 0) - COALESCE(r.montant_paye, 0), 0) AS montant_restant
     FROM reservations r
     LEFT JOIN clients c ON c.id = r.client_id
     LEFT JOIN rooms room ON room.id = r.room_id
     WHERE r.id = ? LIMIT 1`;
    params = [id];
  }

  const [rows] = await pool.query(query, params);
  return rows[0] || null;
}

Reservations.findAll = async function (options) {
  const rows = await reservationsFindAll.call(this, options);
  return Promise.all(rows.map((row) => findReservationWithDetails(row.id)));
};

// New function to get reservations with user info for history filtering
async function findReservationsWithUserDetails(options = {}) {
  // Check if tracking columns exist
  const [trackingColumns] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME IN ('created_by', 'modified_by', 'created_at')"
  );
  const hasTracking = trackingColumns.length >= 3;

  let query, params;
  
  if (hasTracking) {
    query = `
      SELECT r.*, c.nom AS client_nom, c.prenom AS client_prenom, room.numero AS room_numero,
             creator.nom AS created_by_nom, creator.prenom AS created_by_prenom,
             modifier.nom AS modified_by_nom, modifier.prenom AS modified_by_prenom
      FROM reservations r
      LEFT JOIN clients c ON c.id = r.client_id
      LEFT JOIN rooms room ON room.id = r.room_id
      LEFT JOIN users creator ON creator.id_admin = r.created_by
      LEFT JOIN users modifier ON modifier.id_admin = r.modified_by
    `;
  } else {
    query = `
      SELECT r.*, c.nom AS client_nom, c.prenom AS client_prenom, room.numero AS room_numero
      FROM reservations r
      LEFT JOIN clients c ON c.id = r.client_id
      LEFT JOIN rooms room ON room.id = r.room_id
    `;
  }
  
  const conditions = [];
  params = [];
  
  if (hasTracking && options.userId) {
    conditions.push('(r.created_by = ? OR r.modified_by = ?)');
    params.push(options.userId, options.userId);
  }
  
  if (hasTracking && options.startDate) {
    conditions.push('r.created_at >= ?');
    params.push(options.startDate);
  }
  
  if (hasTracking && options.endDate) {
    conditions.push('r.created_at <= ?');
    params.push(options.endDate);
  }
  
  if (options.statut) {
    conditions.push('r.statut = ?');
    params.push(options.statut);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  if (hasTracking) {
    query += ' ORDER BY r.created_at DESC';
  } else {
    query += ' ORDER BY r.id DESC';
  }
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  if (options.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }
  
  const [rows] = await pool.query(query, params);
  return rows;
}

Reservations.findById = findReservationWithDetails;
Reservations.create = async function (data) {
  const row = await reservationsCreate.call(this, data);
  return findReservationWithDetails(row.id);
};
Reservations.update = async function (id, data, modifiedBy = null) {
  const willComplete = String(data?.statut || '').toUpperCase() === 'TERMINEE';
  const changesAmount = Object.prototype.hasOwnProperty.call(data || {}, 'montant_total');
  const [[before]] = await pool.query('SELECT statut FROM reservations WHERE id = ? LIMIT 1', [id]);
  const wasCompleted = String(before?.statut || '').toUpperCase() === 'TERMINEE';
  // Encaissement = passage à TERMINEE, ou nouvel encaissement explicite (avec mode de
  // paiement) d'une réservation déjà terminée qui a reçu des rectifications. Une simple
  // modification depuis le formulaire ne déclenche jamais d'encaissement : la
  // rectification reste « à payer » jusqu'au prochain « Encaisser ».
  const isPaymentRequest = willComplete && (!wasCompleted || Boolean(data?.moyen_paiement));
  if (willComplete || changesAmount) {
    // reservationsCrudUpdate() committe immédiatement (pas de transaction). Si on laissait
    // recordReservationPayment() faire cette même vérification après coup, un montant
    // invalide committerait quand même le passage à TERMINEE avant de faire échouer la
    // requête (statut incohérent : TERMINEE sans paiement enregistré). On valide donc
    // avant d'écrire quoi que ce soit.
    const [[current]] = await pool.query('SELECT statut, montant_total FROM reservations WHERE id = ? LIMIT 1', [id]);
    const nextStatut = data?.statut !== undefined ? String(data.statut).toUpperCase() : String(current?.statut || '').toUpperCase();
    const nextMontant = changesAmount ? Number(data.montant_total) : Number(current?.montant_total);
    if (nextStatut === 'TERMINEE' && !(nextMontant > 0)) throw new Error('Montant de réservation invalide');
  }
  
  // Check if modified_by column exists before using it
  const [columns] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'modified_by'"
  );
  const hasModifiedBy = columns.length > 0;
  
  // Add modified_by to the data only if column exists
  const updateData = { ...data };
  if (modifiedBy && hasModifiedBy) {
    updateData.modified_by = modifiedBy;
  }
  
  await reservationsCrudUpdate.call(this, id, updateData);
  // Depuis la page Hôtel, « encaisser » met directement la réservation à
  // TERMINEE. On encaisse alors ce qui reste dû dans la caisse Hôtel.
  if (isPaymentRequest) {
    const payment = await recordReservationPayment(id, 'HOTEL', { createdBy: modifiedBy });
    if (!payment.est_payee && !wasCompleted) {
      await pool.query('UPDATE reservations SET statut = ? WHERE id = ?', [before.statut, id]);
    }
  }
  return findReservationWithDetails(id);
};
Reservations.remove = async function (id) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT room_id FROM reservations WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) return false;

    await conn.query('DELETE FROM stays WHERE reservation_id = ?', [id]);
    await conn.query(
      `DELETE FROM financial_transactions
       WHERE ref_flux_global IN (?, ?) OR ref_flux_global LIKE ? OR ref_flux_global LIKE ?`,
      [`HEBERGEMENT-RESERVATION-${id}`, `HOTEL-RESERVATION-${id}`, `HEBERGEMENT-RESERVATION-${id}-R%`, `HOTEL-RESERVATION-${id}-R%`]
    );
    await conn.query('DELETE FROM reservation_payments WHERE reservation_id = ?', [id]).catch(() => {});
    const [result] = await conn.query('DELETE FROM reservations WHERE id = ?', [id]);
    await conn.query(
      'UPDATE rooms SET statut = "LIBRE" WHERE id = ? AND statut = "RESERVEE"',
      [rows[0].room_id]
    );

    return result.affectedRows > 0;
  });
};

Rooms.remove = async function (id) {
  return withTransaction(async (conn) => {
    const [rooms] = await conn.query('SELECT id FROM rooms WHERE id = ? LIMIT 1', [id]);
    if (!rooms[0]) return false;

    await conn.query(
      'DELETE FROM reservation_guests WHERE reservation_id IN (SELECT id FROM reservations WHERE room_id = ?)',
      [id]
    );
    await conn.query(
      'DELETE FROM stays WHERE reservation_id IN (SELECT id FROM reservations WHERE room_id = ?)',
      [id]
    );
    await conn.query('DELETE FROM reservations WHERE room_id = ?', [id]);
    await conn.query('DELETE FROM room_equipments WHERE room_id = ?', [id]);
    await conn.query('DELETE FROM room_minibar WHERE room_id = ?', [id]);
    await conn.query('DELETE FROM housekeeping_tasks WHERE room_id = ?', [id]);
    await conn.query('DELETE FROM lost_and_found WHERE room_id = ?', [id]);
    await conn.query('DELETE FROM minibar_consumptions WHERE room_id = ?', [id]);
    await conn.query('DELETE FROM room_maintenance WHERE room_id = ?', [id]);
    await conn.query('DELETE FROM room_status_history WHERE room_id = ?', [id]);

    const [result] = await conn.query('DELETE FROM rooms WHERE id = ?', [id]);
    return result.affectedRows > 0;
  });
};

const ReservationGuests = createCrudModel({
  table: 'reservation_guests', pk: 'id',
  fields: ['reservation_id', 'nom', 'prenom', 'date_naissance', 'type_piece', 'numero_piece'],
  sortable: ['id', 'nom'],
});

const Stays = createCrudModel({
  table: 'stays', pk: 'id',
  fields: ['reservation_id', 'checkin_at', 'checkout_at'],
  sortable: ['id', 'checkin_at', 'checkout_at'],
});

const HousekeepingTasks = createCrudModel({
  table: 'housekeeping_tasks', pk: 'id',
  fields: ['room_id', 'assigned_user_id', 'type_tache', 'statut', 'commentaire', 'planned_at', 'completed_at', 'products_used'],
  sortable: ['id', 'statut', 'planned_at'],
});

const LostAndFound = createCrudModel({
  table: 'lost_and_found', pk: 'id',
  fields: ['room_id', 'client_id', 'objet', 'description', 'date_trouvee', 'statut', 'date_restitution'],
  sortable: ['id', 'date_trouvee', 'statut'],
});

const MinibarConsumptions = createCrudModel({
  table: 'minibar_consumptions', pk: 'id',
  fields: ['room_id', 'client_id', 'product_id', 'quantite', 'prix_unitaire', 'montant', 'facturee'],
  sortable: ['id', 'consumed_at', 'facturee'],
});

// Custom create method for minibar consumptions to auto-set consumed_at
MinibarConsumptions.create = async function (data) {
  const cols = this.fields.filter((f) => data[f] !== undefined);
  if (!cols.length) throw new Error(`Aucun champ valide fourni pour ${this.table}`);

  // Auto-calculate montant if not provided
  if (!data.montant && data.quantite && data.prix_unitaire) {
    data.montant = data.quantite * data.prix_unitaire;
  }

  // Convert boolean facturee to integer for database
  if (data.facturee !== undefined && typeof data.facturee === 'boolean') {
    data.facturee = data.facturee ? 1 : 0;
  }

  const placeholders = cols.map(() => '?').join(', ') + ', NOW()';
  const values = cols.map((c) => data[c]);
  const sqlCols = cols.map((c) => `\`${c}\``).join(', ') + ', `consumed_at`';

  const [result] = await pool.query(
    `INSERT INTO \`${this.table}\` (${sqlCols}) VALUES (${placeholders})`,
    values
  );
  return this.findById(result.insertId);
};

// Custom update method to handle boolean to integer conversion
const originalUpdate = MinibarConsumptions.update;
MinibarConsumptions.update = async function (id, data) {
  // Convert boolean facturee to integer for database
  if (data.facturee !== undefined && typeof data.facturee === 'boolean') {
    data.facturee = data.facturee ? 1 : 0;
  }
  return originalUpdate.call(this, id, data);
};

// Custom findById for Reservations to convert integer fields back to boolean
const originalReservationsFindById = Reservations.findById;
Reservations.findById = async function (id) {
  const row = await originalReservationsFindById.call(this, id);
  if (row) {
    if (row.pdj_inclus !== undefined) {
      row.pdj_inclus = row.pdj_inclus === 1 || row.pdj_inclus === true;
    }
    if (row.laundry_included !== undefined) {
      row.laundry_included = row.laundry_included === 1 || row.laundry_included === true;
    }
  }
  return row;
};

// Custom findAll for Reservations to convert integer fields back to boolean
const originalReservationsFindAll = Reservations.findAll;
Reservations.findAll = async function (options) {
  const rows = await originalReservationsFindAll.call(this, options);
  return rows.map(row => {
    if (row) {
      if (row.pdj_inclus !== undefined) {
        row.pdj_inclus = row.pdj_inclus === 1 || row.pdj_inclus === true;
      }
      if (row.laundry_included !== undefined) {
        row.laundry_included = row.laundry_included === 1 || row.laundry_included === true;
      }
    }
    return row;
  });
};

// Custom update method for Equipments to handle boolean to integer conversion
const originalEquipmentsUpdate = Equipments.update;
Equipments.update = async function (id, data) {
  // Convert boolean is_consumable to integer for database
  if (data.is_consumable !== undefined && typeof data.is_consumable === 'boolean') {
    data.is_consumable = data.is_consumable ? 1 : 0;
  }
  return originalEquipmentsUpdate.call(this, id, data);
};

// Custom findById for Equipments to convert integer is_consumable back to boolean
const originalEquipmentsFindById = Equipments.findById;
Equipments.findById = async function (id) {
  const row = await originalEquipmentsFindById.call(this, id);
  if (row && row.is_consumable !== undefined) {
    row.is_consumable = row.is_consumable === 1 || row.is_consumable === true;
  }
  return row;
};

// Custom findAll for Equipments to convert integer is_consumable back to boolean
const originalEquipmentsFindAll = Equipments.findAll;
Equipments.findAll = async function (options) {
  const rows = await originalEquipmentsFindAll.call(this, options);
  return rows.map(row => {
    if (row && row.is_consumable !== undefined) {
      row.is_consumable = row.is_consumable === 1 || row.is_consumable === true;
    }
    return row;
  });
};

// Custom findById to convert integer facturee back to boolean
const originalFindById = MinibarConsumptions.findById;
MinibarConsumptions.findById = async function (id) {
  const row = await originalFindById.call(this, id);
  if (row && row.facturee !== undefined) {
    row.facturee = row.facturee === 1 || row.facturee === true;
  }
  return row;
};

// Custom findAll to convert integer facturee back to boolean
const originalFindAll = MinibarConsumptions.findAll;
MinibarConsumptions.findAll = async function (options) {
  const rows = await originalFindAll.call(this, options);
  return rows.map(row => {
    if (row && row.facturee !== undefined) {
      row.facturee = row.facturee === 1 || row.facturee === true;
    }
    return row;
  });
};

// --- Logique métier -------------------------------------------------------

// Vérifie la disponibilité d'une chambre sur une période donnée
async function isRoomAvailable(roomId, dateArrivee, dateDepart, excludeReservationId = null) {
  // Check if dates are valid
  if (!dateArrivee || !dateDepart) {
    console.log('Invalid dates:', { dateArrivee, dateDepart });
    return true; // Allow if dates are invalid (form validation should catch this)
  }
  
  // For completed reservations, we should check overlap to prevent double booking
  // Only exclude ANNULEE and NO_SHOW from blocking
  let sql = `
    SELECT COUNT(*) AS conflits FROM reservations
    WHERE room_id = ? AND statut NOT IN ('ANNULEE', 'NO_SHOW')
    AND date_arrivee < ? AND date_depart > ?`;
  const params = [roomId, dateDepart, dateArrivee];
  if (excludeReservationId) {
    sql += ' AND id != ?';
    params.push(excludeReservationId);
  }
  console.log('Availability check:', { sql, params });
  const [rows] = await pool.query(sql, params);
  console.log('Availability result:', { roomId, dateArrivee, dateDepart, conflits: rows[0].conflits, available: rows[0].conflits === 0 });
  return rows[0].conflits === 0;
}

// Crée une réservation + ses accompagnants dans une transaction
async function createReservationWithGuests({ clientId, roomId, dateArrivee, dateDepart, pdjInclus = false, montantTotal, montantBrut, remisePourcentage, montantRemise, statut, guests = [], typeReservation = 'BOOKING', laundryIncluded = false, laundryPrice = 0, manualPrice = 0, createdBy = null, servicesExtras = null, servicesExtrasTotal = 0 }) {
  return withTransaction(async (conn) => {
    // Utilise le statut envoyé par le contrôleur ou 'EN_COURS' par défaut
    const statusValue = statut || 'EN_COURS';

    // Check if created_by column exists before using it
    const [columns] = await conn.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'created_by'"
    );
    const hasCreatedBy = columns.length > 0;

    let query, params;
    if (hasCreatedBy) {
      query = `INSERT INTO reservations (client_id, room_id, date_arrivee, date_depart, pdj_inclus, montant_brut, remise_pourcentage, montant_remise, montant_total, statut, type_reservation, laundry_included, laundry_price, manual_price, created_by, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
      params = [clientId, roomId, dateArrivee, dateDepart, Boolean(pdjInclus), montantBrut, remisePourcentage || 0, montantRemise || 0, montantTotal, statusValue, typeReservation, Boolean(laundryIncluded), laundryPrice, manualPrice, createdBy];
    } else {
      query = `INSERT INTO reservations (client_id, room_id, date_arrivee, date_depart, pdj_inclus, montant_brut, remise_pourcentage, montant_remise, montant_total, statut, type_reservation, laundry_included, laundry_price, manual_price)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      params = [clientId, roomId, dateArrivee, dateDepart, Boolean(pdjInclus), montantBrut, remisePourcentage || 0, montantRemise || 0, montantTotal, statusValue, typeReservation, Boolean(laundryIncluded), laundryPrice, manualPrice];
    }

    const [result] = await conn.query(query, params);
    const reservationId = result.insertId;
    if (servicesExtras) {
      await conn.query(
        'UPDATE reservations SET services_extras = ?, services_extras_total = ? WHERE id = ?',
        [servicesExtras, servicesExtrasTotal || 0, reservationId]
      );
    }
    for (const g of guests) {
      await conn.query(
        `INSERT INTO reservation_guests (reservation_id, nom, prenom, date_naissance, type_piece, numero_piece)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [reservationId, g.nom, g.prenom || null, g.date_naissance || null, g.type_piece || null, g.numero_piece || null]
      );
    }
    await conn.query('UPDATE rooms SET statut = "RESERVEE" WHERE id = ?', [roomId]);
    const [row] = await conn.query('SELECT * FROM reservations WHERE id = ?', [reservationId]);
    return row[0];
  });
}

async function validateReservationDiscount(id, validatedBy) {
  await pool.query(
    `UPDATE reservations
        SET remise_validee_par = ?, remise_validee_at = CURRENT_TIMESTAMP
      WHERE id = ? AND remise_pourcentage > 0`,
    [validatedBy, id]
  );
  return findReservationWithDetails(id);
}

async function applyReservationPaymentTransaction(conn, reservationId, {
  amount, methods, idempotencyKey, createdBy = null, canAuthorizeFree = false,
} = {}) {
  const key = String(idempotencyKey || '').trim();
  if (!key || key.length > 80) throw new Error('Une clé d’idempotence valide est requise.');
  const requestHash = crypto.createHash('sha256')
    .update(JSON.stringify({ amount: roundMoney(amount), methods }))
    .digest('hex');

    const [[reservation]] = await conn.query(
      `SELECT id, client_id, montant_total, montant_paye, montant_encaisse, montant_credit,
              montant_gratuit, statut, laundry_included, laundry_price, services_extras,
              services_extras_total
         FROM reservations WHERE id = ? FOR UPDATE`,
      [reservationId]
    );
    if (!reservation) throw new Error(`Réservation #${reservationId} introuvable.`);
    if (String(reservation.statut || '').toUpperCase() === 'ANNULEE') {
      throw new Error('Cette réservation ne peut plus être encaissée.');
    }

    const [[previous]] = await conn.query(
      'SELECT id, montant, details FROM reservation_payments WHERE reservation_id = ? AND idempotency_key = ? LIMIT 1',
      [reservation.id, key]
    );
    if (previous) {
      isIdempotentReplay(previous.details, requestHash);
      return {
        reservation_id: reservation.id,
        payment_id: previous.id,
        montant: Number(previous.montant),
        duplicate: true,
      };
    }

    const due = roundMoney(Number(reservation.montant_total || 0) - Number(reservation.montant_paye || 0));
    if (!(Number(reservation.montant_total) > 0)) throw new Error('Montant de réservation invalide.');
    const payment = validateHotelPayment({
      amount,
      balanceDue: due,
      currentCredit: Number(reservation.montant_credit || 0),
      methods,
      canAuthorizeFree,
    });

    let extras = [];
    try {
      extras = typeof reservation.services_extras === 'string'
        ? JSON.parse(reservation.services_extras || '[]')
        : reservation.services_extras || [];
    } catch { extras = []; }
    if (!Array.isArray(extras)) extras = [];

    const [[{ count }]] = await conn.query(
      'SELECT COUNT(*) AS count FROM reservation_payments WHERE reservation_id = ?',
      [reservation.id]
    );
    const sequence = Number(count) + 1;
    const baseRef = `HOTEL-RESERVATION-${reservation.id}-R${sequence}`;
    const paymentStatus = getHotelPaymentStatus({
      total: reservation.montant_total,
      covered: Number(reservation.montant_paye || 0) + payment.amountCollected + payment.amountFree,
      credit: payment.creditBalance,
      free: Number(reservation.montant_gratuit || 0) + payment.amountFree,
    });
    const methodsForStorage = payment.methods.map(({ moyen_paiement, montant }) => ({ moyen_paiement, montant }));
    const details = {
      montant_total: Number(reservation.montant_total),
      laundry_price: reservation.laundry_included ? Number(reservation.laundry_price || 0) : 0,
      services_extras: extras,
      modes_paiement: methodsForStorage,
      montant_cible: payment.amount,
      request_hash: requestHash,
      statut_paiement_apres_operation: paymentStatus,
    };
    const primaryMethod = payment.methods.length === 1 ? payment.methods[0].moyen_paiement : 'MULTI';
    const [inserted] = await conn.query(
      `INSERT INTO reservation_payments
         (reservation_id, montant, montant_encaisse, montant_credit, montant_gratuit,
          moyen_paiement, statut, details, ref_flux_global, idempotency_key, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'ENREGISTRE', ?, ?, ?, ?)`,
      [reservation.id, payment.amount, payment.amountCollected, payment.amountCredit, payment.amountFree,
        primaryMethod, JSON.stringify(details), baseRef, key, createdBy]
    );
    const paymentId = inserted.insertId;

    for (const method of payment.methods) {
      if (['CREDIT', 'GRATUIT'].includes(method.moyen_paiement)) continue;
      const methodRef = `${baseRef}-${method.moyen_paiement}`;
      await conn.query(
        `INSERT INTO financial_transactions
           (client_id, module, type_flux, montant, moyen_paiement, reference_id, ref_flux_global,
            description, statut_sync, created_at)
         VALUES (?, 'HOTEL', 'ENTREE', ?, ?, ?, ?, ?, 'SYNCED', NOW())`,
        [reservation.client_id, method.montant, method.moyen_paiement, reservation.id, methodRef,
          `Encaissement réservation HOTEL #${reservation.id} (opération ${paymentId})`]
      );
    }

    const covered = roundMoney(payment.amountCollected + payment.amountFree);
    const nextCredit = roundMoney(payment.creditBalance);
    await conn.query(
      `UPDATE reservations
          SET montant_paye = montant_paye + ?,
              montant_encaisse = montant_encaisse + ?,
              montant_gratuit = montant_gratuit + ?,
              montant_credit = ?,
              statut = CASE WHEN ? <= 0 AND statut IN ('CHECKED_IN', 'EN_COURS') THEN 'TERMINEE' ELSE statut END
        WHERE id = ?`,
      [covered, payment.amountCollected, payment.amountFree, nextCredit, payment.remainingDue, reservation.id]
    );

    return {
      reservation_id: reservation.id,
      payment_id: paymentId,
      montant: payment.amount,
      montant_encaisse: payment.amountCollected,
      montant_credit: payment.amountCredit,
      montant_gratuit: payment.amountFree,
      montant_restant: payment.remainingDue,
      statut_paiement: paymentStatus,
      duplicate: false,
    };
}

async function createReservationPayment(reservationId, options = {}) {
  const result = await withTransaction((conn) => applyReservationPaymentTransaction(conn, reservationId, options));
  return { ...result, reservation: await findReservationWithDetails(reservationId) };
}

// Encaisse ce qui reste dû sur une réservation (montant_total - montant_paye).
// Premier encaissement : réservation complète. Encaissements suivants : uniquement
// les rectifications ajoutées après coup (blanchisserie, transfert, excursion...).
// Chaque encaissement a sa ligne dans reservation_payments ET dans financial_transactions,
// l'historique n'est donc jamais écrasé.
async function recordReservationPayment(reservationId, module = 'HEBERGEMENT', { createdBy = null } = {}) {
  return withTransaction(async (conn) => {
    const [[reservation]] = await conn.query(
      `SELECT id, client_id, montant_total, montant_paye, montant_credit, statut, moyen_paiement,
              laundry_included, laundry_price, services_extras, services_extras_total
         FROM reservations WHERE id = ? FOR UPDATE`,
      [reservationId]
    );
    if (!reservation) throw new Error(`Réservation #${reservationId} introuvable`);
    if (String(reservation.statut || '').toUpperCase() === 'ANNULEE') {
      throw new Error('Cette réservation ne peut plus être encaissée');
    }
    if (Number(reservation.montant_total) <= 0) throw new Error('Montant de réservation invalide');

    const financialModule = String(module || 'HEBERGEMENT').trim().toUpperCase();
    if (!['HEBERGEMENT', 'HOTEL'].includes(financialModule)) {
      throw new Error('Module financier de réservation invalide');
    }

    const due = Math.round((Number(reservation.montant_total) - Number(reservation.montant_paye || 0)) * 100) / 100;
    if (due <= 0) {
      return { reservation_id: reservation.id, montant: 0, est_payee: true };
    }

    // Référence unique : la 1re reprend l'ancien format, les suivantes sont suffixées -R1, -R2...
    const baseRef = `${financialModule}-RESERVATION-${reservation.id}`;
    const [[{ count }]] = await conn.query('SELECT COUNT(*) AS count FROM reservation_payments WHERE reservation_id = ?', [reservation.id]);
    let ref = Number(count) === 0 ? baseRef : `${baseRef}-R${count}`;
    for (let n = Number(count) + 1; ; n += 1) {
      const [[taken]] = await conn.query('SELECT id FROM financial_transactions WHERE ref_flux_global = ? LIMIT 1', [ref]);
      if (!taken) break;
      ref = `${baseRef}-R${n}`;
    }

    const isRectification = Number(reservation.montant_paye || 0) > 0;
    const moyenPaiement = String(reservation.moyen_paiement || 'ESPECES').toUpperCase();
    if (moyenPaiement === 'CREDIT' && Number(reservation.montant_credit || 0) > 0) {
      return { reservation_id: reservation.id, montant: 0, est_payee: false, duplicate: true };
    }
    const amountCredit = moyenPaiement === 'CREDIT' ? due : 0;
    const amountFree = moyenPaiement === 'GRATUIT' ? due : 0;
    const amountCollected = amountCredit || amountFree ? 0 : due;
    if (amountCollected > 0) {
      await conn.query(
        `INSERT INTO financial_transactions
           (client_id, module, type_flux, montant, moyen_paiement, reference_id, ref_flux_global, description, statut_sync, created_at)
         VALUES (?, ?, 'ENTREE', ?, ?, ?, ?, ?, 'SYNCED', NOW())`,
        [reservation.client_id, financialModule, amountCollected, moyenPaiement, reservation.id, ref,
          `${isRectification ? 'Rectification' : 'Encaissement'} réservation ${financialModule.toLowerCase()} #${reservation.id}`]
      );
    }

    let extras = [];
    try { extras = JSON.parse(reservation.services_extras || '[]'); } catch { extras = []; }
    const details = {
      montant_total: Number(reservation.montant_total),
      laundry_price: reservation.laundry_included ? Number(reservation.laundry_price || 0) : 0,
      services_extras: Array.isArray(extras) ? extras : [],
      modes_paiement: [{ moyen_paiement: moyenPaiement, montant: due }],
    };
    await conn.query(
      `INSERT INTO reservation_payments
         (reservation_id, montant, montant_encaisse, montant_credit, montant_gratuit,
          moyen_paiement, statut, details, ref_flux_global, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'ENREGISTRE', ?, ?, ?)`,
      [reservation.id, due, amountCollected, amountCredit, amountFree, moyenPaiement,
        JSON.stringify(details), ref, createdBy]
    );
    const covered = amountCollected + amountFree;
    await conn.query(
      `UPDATE reservations
          SET montant_paye = montant_paye + ?,
              montant_encaisse = montant_encaisse + ?,
              montant_gratuit = montant_gratuit + ?,
              montant_credit = GREATEST(montant_credit - ?, 0) + ?
        WHERE id = ?`,
      [covered, amountCollected, amountFree, covered, amountCredit, reservation.id]
    );

    return {
      reservation_id: reservation.id,
      montant: due,
      montant_encaisse: amountCollected,
      montant_credit: amountCredit,
      montant_gratuit: amountFree,
      est_payee: amountCredit === 0,
    };
  });
}

async function listReservationPayments(reservationId) {
  const [rows] = await pool.query(
    `SELECT p.*, u.nom AS created_by_nom, u.prenom AS created_by_prenom
       FROM reservation_payments p
       LEFT JOIN users u ON u.id_admin = p.created_by
      WHERE p.reservation_id = ?
      ORDER BY p.created_at ASC, p.id ASC`,
    [reservationId]
  );
  return rows.map((row) => {
    let details = null;
    try { details = row.details ? JSON.parse(row.details) : null; } catch { details = null; }
    if (details && typeof details.services_extras === 'string') {
      try { details.services_extras = JSON.parse(details.services_extras); } catch { details.services_extras = []; }
    }
    return {
      ...row,
      montant: Number(row.montant),
      montant_encaisse: Number(row.montant_encaisse || 0),
      montant_credit: Number(row.montant_credit || 0),
      montant_gratuit: Number(row.montant_gratuit || 0),
      details,
    };
  });
}

async function getReservationCollectionReport(startDate, endDate) {
  const [paymentRows] = await pool.query(
    `SELECT p.moyen_paiement, p.montant, p.details
       FROM reservation_payments p
       INNER JOIN reservations r ON r.id = p.reservation_id
      WHERE p.created_at >= ?
        AND p.created_at < DATE_ADD(?, INTERVAL 1 DAY)`,
    [startDate, endDate]
  );
  let totalCollected = 0;
  const paymentMethods = {
    ESPECES: 0,
    TPE: 0,
    MVOLA: 0,
    GRATUIT: 0,
    VIREMENT: 0,
    CREDIT: 0,
    ORANGE_MONEY: 0,
    CARTE: 0,
  };

  for (const payment of paymentRows) {
    let details = payment.details;
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details);
      } catch (error) {
        throw new Error(`Détails invalides pour l'encaissement hôtel : ${error.message}`);
      }
    }

    const methods = Array.isArray(details?.modes_paiement) && details.modes_paiement.length > 0
      ? details.modes_paiement
      : [{ moyen_paiement: payment.moyen_paiement, montant: payment.montant }];

    for (const method of methods) {
      const name = String(method?.moyen_paiement || '').trim().toUpperCase();
      if (!Object.prototype.hasOwnProperty.call(paymentMethods, name)) continue;
      const amount = Number(method.montant);
      if (Number.isFinite(amount) && amount > 0) {
        paymentMethods[name] += amount;
        if (!['CREDIT', 'GRATUIT'].includes(name)) totalCollected += amount;
      }
    }
  }

  return {
    startDate,
    endDate,
    totalCollected,
    paymentMethods,
  };
}

// Check-in : crée le séjour, passe la réservation en cours et prépare la
// facture d'hébergement. Le règlement reste une étape distincte après
// l'arrivée du client.
async function checkIn(reservationId) {
  return withTransaction(async (conn) => {
    const [resRows] = await conn.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [reservationId]);
    const reservation = resRows[0];
    if (!reservation) throw new Error(`Réservation #${reservationId} introuvable`);

    if (String(reservation.statut || '').toUpperCase() !== 'CONFIRMEE') {
      throw new Error('Seule une réservation confirmée peut être enregistrée en check-in');
    }

    const [activeStays] = await conn.query(
      'SELECT id FROM stays WHERE reservation_id = ? AND checkout_at IS NULL FOR UPDATE',
      [reservationId]
    );
    if (activeStays.length) throw new Error('Cette réservation possède déjà un séjour en cours');

    const [result] = await conn.query(
      'INSERT INTO stays (reservation_id, checkin_at) VALUES (?, NOW())',
      [reservationId]
    );
    await conn.query('UPDATE reservations SET statut = "EN_COURS" WHERE id = ?', [reservationId]);
    await conn.query('UPDATE rooms SET statut = "OCCUPEE" WHERE id = ?', [reservation.room_id]);
    await conn.query(
      `INSERT INTO room_status_history (room_id, ancien_statut, nouveau_statut, changed_at)
       VALUES (?, 'RESERVEE', 'OCCUPEE', NOW())`,
      [reservation.room_id]
    );

    let invoice = null;
    const total = Number(reservation.montant_total || 0);
    if (total > 0) {
      const description = `Hébergement - Réservation #${reservationId}`;
      const [existingInvoices] = await conn.query(
        `SELECT i.* FROM invoices i
         JOIN invoice_items ii ON ii.invoice_id = i.id
         WHERE ii.description = ? LIMIT 1 FOR UPDATE`,
        [description]
      );
      if (existingInvoices[0]) {
        invoice = existingInvoices[0];
      } else {
        const [invoiceResult] = await conn.query(
          `INSERT INTO invoices (client_id, montant_total, statut) VALUES (?, ?, 'EN_ATTENTE')`,
          [reservation.client_id, total]
        );
        await conn.query(
          `INSERT INTO invoice_items (invoice_id, description, montant) VALUES (?, ?, ?)`,
          [invoiceResult.insertId, description, total]
        );
        const [invoiceRows] = await conn.query('SELECT * FROM invoices WHERE id = ?', [invoiceResult.insertId]);
        invoice = invoiceRows[0];
      }
    }

    const [stay] = await conn.query('SELECT * FROM stays WHERE id = ?', [result.insertId]);
    return { ...stay[0], invoice };
  });
}

// Check-out : clôture le séjour, passe la réservation en "TERMINEE" et la chambre en "NETTOYAGE"
async function checkOut(stayId) {
  return withTransaction(async (conn) => {
    const [stayRows] = await conn.query('SELECT s.*, r.room_id, r.id as reservation_id, r.client_id, r.montant_total FROM stays s JOIN reservations r ON r.id = s.reservation_id WHERE s.id = ?', [stayId]);
    const stay = stayRows[0];
    if (!stay) throw new Error(`Séjour #${stayId} introuvable`);

    await conn.query('UPDATE stays SET checkout_at = NOW() WHERE id = ?', [stayId]);
    await conn.query('UPDATE reservations SET statut = "TERMINEE" WHERE id = ?', [stay.reservation_id]);
    await conn.query('UPDATE rooms SET statut = "NETTOYAGE" WHERE id = ?', [stay.room_id]);
    await conn.query(
      `INSERT INTO room_status_history (room_id, ancien_statut, nouveau_statut, changed_at)
       VALUES (?, 'OCCUPEE', 'NETTOYAGE', NOW())`,
      [stay.room_id]
    );

    // Create financial transaction for accommodation checkout revenue
    const montant = Number(stay.montant_total) || 0;
    if (montant > 0) {
      await conn.query(
        `INSERT INTO financial_transactions
           (client_id, module, type_flux, montant, reference_id, ref_flux_global, description, statut_sync, created_at)
         VALUES (?, 'HEBERGEMENT', 'ENTREE', ?, ?, ?, ?, 'SYNCED', NOW())`,
        [stay.client_id, montant, stay.reservation_id,
          `HEBERGEMENT-CHECKOUT-${stay.reservation_id}`,
          `Encaissement séjour hébergement #${stay.reservation_id}`]
      );
    }

    const [updated] = await conn.query('SELECT * FROM stays WHERE id = ?', [stayId]);
    return updated[0];
  });
}

function normalizeUsedProducts(value) {
  let items = value;
  if (typeof items === 'string') {
    try { items = JSON.parse(items || '[]'); } catch { items = []; }
  }
  if (!Array.isArray(items)) return [];
  const normalized = items.map((item) => ({
    product_id: Number(item?.product_id),
    quantity: Number(item?.quantity),
  }));
  if (normalized.some((item) => !Number.isInteger(item.product_id) || item.product_id <= 0 || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
    throw new Error('Chaque produit utilisé doit avoir un identifiant valide et une quantité positive');
  }
  return normalized;
}

async function refreshRoomOperationalStatus(conn, roomId) {
  if (!roomId) return;
  const [[maintenance]] = await conn.query(
    "SELECT COUNT(*) AS total FROM room_maintenance WHERE room_id = ? AND statut IN ('OUVERT','EN_COURS')",
    [roomId]
  );
  const [[stay]] = await conn.query(
    `SELECT COUNT(*) AS total FROM stays s
     JOIN reservations r ON r.id = s.reservation_id
     WHERE r.room_id = ? AND s.checkout_at IS NULL AND r.statut IN ('CHECKED_IN','EN_COURS')`,
    [roomId]
  );
  const [[housekeeping]] = await conn.query(
    "SELECT COUNT(*) AS total FROM housekeeping_tasks WHERE room_id = ? AND statut = 'EN_COURS'",
    [roomId]
  );
  const [[room]] = await conn.query('SELECT statut FROM rooms WHERE id = ? FOR UPDATE', [roomId]);
  const nextStatus = Number(stay.total) > 0
    ? 'OCCUPEE'
    : room?.statut === 'RESERVEE'
      ? 'RESERVEE'
      : Number(maintenance.total) > 0
        ? 'MAINTENANCE'
        : Number(housekeeping.total) > 0
          ? 'NETTOYAGE'
          : 'LIBRE';
  if (room && room.statut !== nextStatus) {
    await conn.query('UPDATE rooms SET statut = ? WHERE id = ?', [nextStatus, roomId]);
    await conn.query(
      'INSERT INTO room_status_history (room_id, ancien_statut, nouveau_statut, changed_at) VALUES (?, ?, ?, NOW())',
      [roomId, room.statut, nextStatus]
    );
  }
}

async function saveOperationalRecord({ table, fields, id = null, data, stockField, sourceModule, referenceLabel, statusField }) {
  return withTransaction(async (conn) => {
    let existing = null;
    if (id) {
      const [rows] = await conn.query(`SELECT * FROM ${table} WHERE id = ? FOR UPDATE`, [id]);
      existing = rows[0];
      if (!existing) throw new Error(`${table} #${id} introuvable`);
    }

    const payload = { ...data };
    const usedSupplied = Object.prototype.hasOwnProperty.call(payload, stockField);
    const usedProducts = normalizeUsedProducts(usedSupplied ? payload[stockField] : existing?.[stockField]);
    if (usedSupplied) payload[stockField] = usedProducts;
    if (statusField === 'statut' && payload.statut === 'TERMINE' && !existing) {
      payload.completed_at = new Date();
    }
    if (statusField === 'statut' && payload.statut === 'TERMINE' && existing && table === 'room_maintenance') {
      payload.date_resolution = existing.date_resolution || new Date();
    }
    if (statusField === 'statut' && payload.statut === 'TERMINE' && existing && table === 'housekeeping_tasks') {
      payload.completed_at = existing.completed_at || new Date();
    }

    const columns = fields.filter((field) => payload[field] !== undefined);
    const values = columns.map((field) => {
      const value = payload[field];
      if (field === stockField && Array.isArray(value)) return JSON.stringify(value);
      if (value instanceof Date) return value;
      if (value === '') return null;
      return value;
    });
    let recordId = id;
    if (existing) {
      if (columns.length) {
        await conn.query(
          `UPDATE ${table} SET ${columns.map((field) => `\`${field}\` = ?`).join(', ')} WHERE id = ?`,
          [...values, id]
        );
      }
    } else {
      if (!columns.length) throw new Error(`Aucun champ valide fourni pour ${table}`);
      const [inserted] = await conn.query(
        `INSERT INTO ${table} (${columns.map((field) => `\`${field}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        values
      );
      recordId = inserted.insertId;
    }

    const [currentRows] = await conn.query(`SELECT * FROM ${table} WHERE id = ?`, [recordId]);
    const current = currentRows[0];
    const completing = current?.statut === 'TERMINE' && !existing?.stock_deducted_at;
    if (completing && usedProducts.length) {
      for (const item of usedProducts) {
        await stockModel.recordMovement({
          productId: item.product_id,
          locationId: 5,
          type: 'SORTIE',
          quantite: item.quantity,
          sourceModule,
          referenceId: recordId,
          motif: `${referenceLabel} - ${current.type_tache || current.type_intervention || 'tâche'}`,
          allowNegative: false,
          conn,
        });
      }
      await conn.query(`UPDATE ${table} SET stock_deducted_at = NOW() WHERE id = ?`, [recordId]);
    }
    if (existing?.stock_deducted_at && usedSupplied) {
      const prior = normalizeUsedProducts(existing[stockField]);
      if (JSON.stringify(prior) !== JSON.stringify(usedProducts)) {
        throw new Error('Les produits ne peuvent plus être modifiés après leur déduction du stock');
      }
    }

    await refreshRoomOperationalStatus(conn, current.room_id);
    const [savedRows] = await conn.query(`SELECT * FROM ${table} WHERE id = ?`, [recordId]);
    return savedRows[0];
  });
}

async function saveMaintenance(id, data) {
  return saveOperationalRecord({
    table: 'room_maintenance',
    fields: RoomMaintenance.fields,
    id,
    data,
    stockField: 'materials_used',
    sourceModule: 'MAINTENANCE',
    referenceLabel: 'Maintenance',
    statusField: 'statut',
  });
}

async function saveHousekeepingTask(id, data) {
  return saveOperationalRecord({
    table: 'housekeeping_tasks',
    fields: [...HousekeepingTasks.fields, 'exceptional_details'],
    id,
    data,
    stockField: 'products_used',
    sourceModule: 'MENAGE',
    referenceLabel: 'Ménage',
    statusField: 'statut',
  });
}

async function deleteOperationalRecord(table, id) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.query(`SELECT room_id FROM ${table} WHERE id = ? FOR UPDATE`, [id]);
    if (!rows[0]) throw new Error(`${table} #${id} introuvable`);
    await conn.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    await refreshRoomOperationalStatus(conn, rows[0].room_id);
    return true;
  });
}

async function deleteMaintenance(id) {
  return deleteOperationalRecord('room_maintenance', id);
}

async function deleteHousekeepingTask(id) {
  return deleteOperationalRecord('housekeeping_tasks', id);
}

// Les statuts et déductions sont traités comme une seule opération atomique.
async function updateMaintenanceStatus(id, statut, materialsUsed = undefined) {
  return saveMaintenance(id, { statut, ...(materialsUsed === undefined ? {} : { materials_used: materialsUsed }) });
}

// Statistiques agrégées des maintenances
async function getMaintenanceStats() {
  const [totals] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(cout), 0) AS cout_total FROM room_maintenance`
  );
  const [parStatut] = await pool.query(
    `SELECT statut, COUNT(*) AS total, COALESCE(SUM(cout), 0) AS cout_total
     FROM room_maintenance GROUP BY statut`
  );
  const [parType] = await pool.query(
    `SELECT type_intervention, COUNT(*) AS total, COALESCE(SUM(cout), 0) AS cout_total
     FROM room_maintenance GROUP BY type_intervention`
  );
  return {
    total: totals[0].total,
    cout_total: totals[0].cout_total,
    par_statut: parStatut,
    par_type_intervention: parType,
  };
}

// Statistiques agrégées des réservations (avec montant réel encaissé)
async function getReservationStats() {
  const [totals] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(montant_total), 0) AS montant_total,
            COALESCE(AVG(montant_total), 0) AS montant_moyen
     FROM reservations`
  );
  const [financeTotals] = await pool.query(
    `SELECT COALESCE(SUM(ft.montant), 0) AS montant_encaisse
     FROM financial_transactions ft
     INNER JOIN reservations r ON ft.reference_id = r.id
       AND (ft.ref_flux_global IN (
         CONCAT('HEBERGEMENT-RESERVATION-', r.id),
         CONCAT('HOTEL-RESERVATION-', r.id)
       ) OR ft.ref_flux_global LIKE CONCAT('%RESERVATION-', r.id, '-R%'))
     WHERE ft.type_flux = 'ENTREE'
       AND UPPER(COALESCE(ft.moyen_paiement, '')) NOT IN ('CREDIT', 'GRATUIT')`
  );
  const [parStatut] = await pool.query(
    `SELECT statut, COUNT(*) AS total, COALESCE(SUM(montant_total), 0) AS montant_total
     FROM reservations GROUP BY statut`
  );
  return {
    total: totals[0].total,
    montant_total: totals[0].montant_total,
    montant_moyen: totals[0].montant_moyen,
    montant_encaisse: financeTotals[0].montant_encaisse,
    par_statut: parStatut,
  };
}

// Met à jour uniquement le statut d'une chambre
async function updateRoomStatus(id, statut) {
  const [existing] = await pool.query('SELECT * FROM rooms WHERE id = ?', [id]);
  if (!existing[0]) throw new Error(`Chambre #${id} introuvable`);
  const ancienStatut = existing[0].statut;
  if (ancienStatut === statut) return existing[0];

  return withTransaction(async (conn) => {
    await conn.query('UPDATE rooms SET statut = ? WHERE id = ?', [statut, id]);
    await conn.query(
      `INSERT INTO room_status_history (room_id, ancien_statut, nouveau_statut, changed_at)
       VALUES (?, ?, ?, NOW())`,
      [id, ancienStatut, statut]
    );
    const [updated] = await conn.query('SELECT * FROM rooms WHERE id = ?', [id]);
    return updated[0];
  });
}

// Récupère un équipement par son code
async function getEquipmentByCode(code) {
  const [rows] = await pool.query('SELECT * FROM equipments WHERE code = ?', [code]);
  if (!rows[0]) throw new Error(`Équipement de code "${code}" introuvable`);
  return rows[0];
}

// Liste des catégories d'équipements distinctes
async function getEquipmentCategories() {
  const [rows] = await pool.query(
    `SELECT DISTINCT categorie FROM equipments
     WHERE categorie IS NOT NULL AND categorie != '' ORDER BY categorie`
  );
  return rows.map((r) => r.categorie);
}

// Statistiques agrégées des équipements
async function getEquipmentStats() {
  const [totals] = await pool.query('SELECT COUNT(*) AS total FROM equipments');
  const [parCategorie] = await pool.query(
    `SELECT COALESCE(categorie, 'NON_CATEGORISE') AS categorie, COUNT(*) AS total
     FROM equipments GROUP BY categorie`
  );
  const [parStatutInstallation] = await pool.query(
    `SELECT statut, COUNT(*) AS total FROM room_equipments GROUP BY statut`
  );
  return {
    total_equipments: totals[0].total,
    par_categorie: parCategorie,
    installations_par_statut: parStatutInstallation,
  };
}

// Met à jour uniquement le statut d'un équipement installé dans une chambre
async function updateRoomEquipmentStatus(id, statut) {
  const [existing] = await pool.query('SELECT * FROM room_equipments WHERE id = ?', [id]);
  if (!existing[0]) throw new Error(`Équipement de chambre #${id} introuvable`);
  
  await pool.query('UPDATE room_equipments SET statut = ? WHERE id = ?', [statut, id]);
  
  const [updated] = await pool.query('SELECT * FROM room_equipments WHERE id = ?', [id]);
  return updated[0];
}

// Statistiques agrégées sur le parc de chambres
async function getRoomStats() {
  const [totals] = await pool.query('SELECT COUNT(*) AS total FROM rooms');
  const [parStatut] = await pool.query('SELECT statut, COUNT(*) AS total FROM rooms GROUP BY statut');
  const [parType] = await pool.query(
    `SELECT rt.nom AS room_type, COUNT(r.id) AS total
     FROM rooms r JOIN room_types rt ON rt.id = r.room_type_id
     GROUP BY rt.nom`
  );
  const total = totals[0].total;
  const occupees = parStatut.find((r) => r.statut === 'OCCUPEE')?.total || 0;
  const tauxOccupation = total > 0 ? Number((occupees / total).toFixed(4)) : 0;
  return {
    total,
    taux_occupation: tauxOccupation,
    par_statut: parStatut,
    par_type: parType,
  };
}

// Met à jour uniquement le statut d'une tâche de housekeeping
async function updateHousekeepingStatus(id, statut, productsUsed = null) {
  return saveHousekeepingTask(id, {
    statut,
    ...(productsUsed === null ? {} : { products_used: productsUsed }),
  });
}

// Statistiques agrégées des tâches de housekeeping
async function getHousekeepingStats() {
  const [totals] = await pool.query('SELECT COUNT(*) AS total FROM housekeeping_tasks');
  const [parStatut] = await pool.query(
    'SELECT statut, COUNT(*) AS total FROM housekeeping_tasks GROUP BY statut'
  );
  const [parType] = await pool.query(
    'SELECT type_tache, COUNT(*) AS total FROM housekeeping_tasks GROUP BY type_tache'
  );
  return {
    total: totals[0].total,
    par_statut: parStatut,
    par_type_tache: parType,
  };
}

async function availableRooms({ typeId } = {}) {
  let sql = `SELECT * FROM rooms WHERE statut = 'LIBRE'`;
  const params = [];
  if (typeId) {
    sql += ' AND room_type_id = ?';
    params.push(typeId);
  }
  const [rows] = await pool.query(sql, params);
  return rows;
}

// --- Minibar Stock Management ---

// Transfer stock from source location (restaurant/bar) to hotel minibar location
async function transferStockToMinibar({ productId, sourceLocationId, quantity, roomId, userId }) {
  if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
    throw new Error('La quantité transférée doit être un nombre entier positif');
  }
  return withTransaction(async (conn) => {
    // Check if there's enough stock in source location
    const [sourceStock] = await conn.query(
      'SELECT quantite FROM stocks WHERE product_id = ? AND location_id = ? FOR UPDATE',
      [productId, sourceLocationId]
    );

    if (!sourceStock[0] || sourceStock[0].quantite < quantity) {
      throw new Error('Stock insuffisant dans la source');
    }

    // Deduct from source location
    await conn.query(
      'UPDATE stocks SET quantite = quantite - ? WHERE product_id = ? AND location_id = ?',
      [quantity, productId, sourceLocationId]
    );

    // Add to hotel location (location_id = 5 for Hotel)
    const [hotelStock] = await conn.query(
      'SELECT quantite FROM stocks WHERE product_id = ? AND location_id = 5 FOR UPDATE',
      [productId]
    );

    if (hotelStock[0]) {
      await conn.query(
        'UPDATE stocks SET quantite = quantite + ? WHERE product_id = ? AND location_id = 5',
        [quantity, productId]
      );
    } else {
      await conn.query(
        'INSERT INTO stocks (product_id, location_id, quantite) VALUES (?, 5, ?)',
        [productId, quantity]
      );
    }

    // Record stock movement
    await conn.query(
      `INSERT INTO stock_movements (product_id, location_id, type_mouvement, quantite, source_module, reference_id, created_at)
       VALUES (?, 5, 'ENTREE', ?, 'MINIBAR', ?, NOW())`,
      [productId, quantity, roomId]
    );

    // Record stock movement from source
    await conn.query(
      `INSERT INTO stock_movements (product_id, location_id, type_mouvement, quantite, source_module, reference_id, created_at)
       VALUES (?, ?, 'SORTIE', ?, 'MINIBAR', ?, NOW())`,
      [productId, sourceLocationId, quantity, roomId]
    );

    return { success: true, message: 'Stock transféré avec succès' };
  });
}

// Handle minibar consumption with stock movement tracking
async function handleMinibarConsumption({ roomId, productId, quantity, clientId, price }) {
  if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
    throw new Error('La quantité consommée doit être un nombre entier positif');
  }
  return withTransaction(async (conn) => {
    // Check if product exists in room minibar
    const [minibarItem] = await conn.query(
      'SELECT quantite FROM room_minibar WHERE room_id = ? AND product_id = ? FOR UPDATE',
      [roomId, productId]
    );

    if (!minibarItem[0] || minibarItem[0].quantite < quantity) {
      throw new Error('Stock insuffisant dans le minibar');
    }

    // Deduct from room minibar
    await conn.query(
      'UPDATE room_minibar SET quantite = quantite - ? WHERE room_id = ? AND product_id = ?',
      [quantity, roomId, productId]
    );

    // Deduct from hotel stock location
    await conn.query(
      'UPDATE stocks SET quantite = quantite - ? WHERE product_id = ? AND location_id = 5',
      [quantity, productId]
    );

    // Record consumption
    const montant = quantity * price;
    const [consumption] = await conn.query(
      `INSERT INTO minibar_consumptions (room_id, client_id, product_id, quantite, prix_unitaire, montant, facturee, consumed_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [roomId, clientId, productId, quantity, price, montant]
    );

    // Record stock movement
    await conn.query(
      `INSERT INTO stock_movements (product_id, location_id, type_mouvement, quantite, source_module, reference_id, created_at)
       VALUES (?, 5, 'SORTIE', ?, 'MINIBAR_CONSUMPTION', ?, NOW())`,
      [productId, quantity, consumption.insertId]
    );

    // A minibar consumption is charged to the guest and therefore belongs in
    // the Hotel revenue stream without needing a manual Finance operation.
    await conn.query(
      `INSERT IGNORE INTO financial_transactions
         (client_id, module, type_flux, montant, reference_id, ref_flux_global, description, statut_sync, created_at)
       VALUES (?, 'HOTEL', 'ENTREE', ?, ?, ?, ?, 'SYNCED', NOW())`,
      [clientId, montant, consumption.insertId, `HOTEL-MINIBAR-${consumption.insertId}`, `Consommation minibar #${consumption.insertId}`]
    );

    const [rows] = await conn.query(
      'SELECT * FROM minibar_consumptions WHERE id = ?',
      [consumption.insertId]
    );
    return rows[0];
  });
}

// Get minibar items with low stock alerts
async function getMinibarWithAlerts() {
  const [rows] = await pool.query(`
    SELECT rm.*, p.nom as product_nom, p.prix_vente, r.numero as room_numero,
           CASE WHEN rm.quantite <= rm.seuil_alerte THEN 1 ELSE 0 END as alert
    FROM room_minibar rm
    JOIN products p ON rm.product_id = p.id
    JOIN rooms r ON rm.room_id = r.id
    ORDER BY alert DESC, r.numero, p.nom
  `);
  return rows;
}

// Get only low stock minibar items for notifications
async function getLowStockMinibarItems() {
  const [rows] = await pool.query(`
    SELECT rm.*, p.nom as product_nom, p.prix_vente, r.numero as room_numero
    FROM room_minibar rm
    JOIN products p ON rm.product_id = p.id
    JOIN rooms r ON rm.room_id = r.id
    WHERE rm.quantite <= rm.seuil_alerte
    ORDER BY rm.quantite ASC, r.numero, p.nom
  `);
  return rows;
}

// Restock minibar from hotel stock location
async function restockMinibar({ roomId, productId, quantity, userId }) {
  if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
    throw new Error('La quantité réapprovisionnée doit être un nombre entier positif');
  }
  return withTransaction(async (conn) => {
    // Check hotel stock
    const [hotelStock] = await conn.query(
      'SELECT quantite FROM stocks WHERE product_id = ? AND location_id = 5 FOR UPDATE',
      [productId]
    );

    if (!hotelStock[0] || hotelStock[0].quantite < quantity) {
      throw new Error('Stock insuffisant dans le stock hôtel');
    }

    // Deduct from hotel stock
    await conn.query(
      'UPDATE stocks SET quantite = quantite - ? WHERE product_id = ? AND location_id = 5',
      [quantity, productId]
    );

    // Add to room minibar
    const [minibarItem] = await conn.query(
      'SELECT quantite FROM room_minibar WHERE room_id = ? AND product_id = ? FOR UPDATE',
      [roomId, productId]
    );

    if (minibarItem[0]) {
      await conn.query(
        'UPDATE room_minibar SET quantite = quantite + ? WHERE room_id = ? AND product_id = ?',
        [quantity, roomId, productId]
      );
    } else {
      await conn.query(
        'INSERT INTO room_minibar (room_id, product_id, quantite, seuil_alerte) VALUES (?, ?, ?, 1)',
        [roomId, productId, quantity]
      );
    }

    // Record stock movement
    await conn.query(
      `INSERT INTO stock_movements (product_id, location_id, type_mouvement, quantite, source_module, reference_id, created_at)
       VALUES (?, 5, 'SORTIE', ?, 'MINIBAR_RESTOCK', ?, NOW())`,
      [productId, quantity, roomId]
    );

    return { success: true, message: 'Minibar réapprovisionné avec succès' };
  });
}

module.exports = {
  RoomTypes, Rooms, Equipments, RoomEquipments, RoomMaintenance, RoomMinibar,
  RoomStatusHistory, Reservations, ReservationGuests, Stays, HousekeepingTasks, MaintenanceWorkers,
  LostAndFound, MinibarConsumptions,
  isRoomAvailable, createReservationWithGuests, validateReservationDiscount, recordReservationPayment,
  createReservationPayment, applyReservationPaymentTransaction, listReservationPayments, getReservationCollectionReport, checkIn, checkOut, availableRooms,
  updateMaintenanceStatus, getMaintenanceStats, getReservationStats,
  updateRoomStatus, getEquipmentByCode, getEquipmentCategories, getEquipmentStats,
  updateRoomEquipmentStatus, getRoomStats, saveMaintenance, saveHousekeepingTask,
  deleteMaintenance, deleteHousekeepingTask, updateHousekeepingStatus, getHousekeepingStats,
  transferStockToMinibar, handleMinibarConsumption, getMinibarWithAlerts, getLowStockMinibarItems, restockMinibar,
  findReservationsWithUserDetails,
};