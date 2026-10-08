const { pool, withTransaction } = require('../config/db');
const { createOrder, ensureBarTransactionsSchema } = require('./barTransaction.model');
const ApiError = require('../utils/ApiError');

async function findOrCreateClient(name, connection) {
  const clientName = String(name || '').trim();
  if (!clientName) return null;
  const [existing] = await connection.query('SELECT id FROM bar_clients WHERE nom = ? ORDER BY id ASC LIMIT 1', [clientName]);
  if (existing.length) return existing[0].id;
  const [result] = await connection.query("INSERT INTO bar_clients (nom, statut) VALUES (?, 'ACTIF')", [clientName]);
  return result.insertId;
}

async function ensureBarOrderTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bar_orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      client_name VARCHAR(150) DEFAULT NULL,
      table_id BIGINT UNSIGNED DEFAULT NULL,
      nombre_personnes INT UNSIGNED NOT NULL DEFAULT 1,
      moyen_paiement VARCHAR(30) NOT NULL DEFAULT 'ESPECES',
      observation TEXT DEFAULT NULL,
      statut VARCHAR(30) DEFAULT 'EN_ATTENTE',
      montant_total DECIMAL(10,2) DEFAULT 0.00,
      created_by BIGINT UNSIGNED DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_bar_orders_table_id (table_id),
      KEY idx_bar_orders_created_by (created_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bar_order_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id BIGINT UNSIGNED NOT NULL,
      nom VARCHAR(150) DEFAULT NULL,
      quantite INT DEFAULT 1,
      prix DECIMAL(10,2) DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_bar_order_items_order_id (order_id),
      CONSTRAINT fk_bar_order_items_order FOREIGN KEY (order_id) REFERENCES bar_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [columns] = await pool.query('SHOW COLUMNS FROM bar_orders');
  const existing = new Set(columns.map((column) => column.Field));
  if (!existing.has('nombre_personnes')) {
    await pool.query('ALTER TABLE bar_orders ADD COLUMN nombre_personnes INT UNSIGNED NOT NULL DEFAULT 1 AFTER table_id');
  }
  if (!existing.has('moyen_paiement')) {
    await pool.query("ALTER TABLE bar_orders ADD COLUMN moyen_paiement VARCHAR(30) NOT NULL DEFAULT 'ESPECES' AFTER nombre_personnes");
  }
  if (!existing.has('observation')) {
    await pool.query('ALTER TABLE bar_orders ADD COLUMN observation TEXT DEFAULT NULL AFTER moyen_paiement');
  }
  if (!existing.has('created_by')) {
    await pool.query('ALTER TABLE bar_orders ADD COLUMN created_by BIGINT UNSIGNED DEFAULT NULL AFTER montant_total');
    await pool.query('ALTER TABLE bar_orders ADD KEY idx_bar_orders_created_by (created_by)');
  }
  if (!existing.has('cloture_at')) {
    await pool.query('ALTER TABLE bar_orders ADD COLUMN cloture_at DATETIME DEFAULT NULL AFTER created_at');
    await pool.query('ALTER TABLE bar_orders ADD KEY idx_bar_orders_cloture_at (cloture_at)');
  }
  if (!existing.has('hotel_reservation_id')) {
    await pool.query('ALTER TABLE bar_orders ADD COLUMN hotel_reservation_id BIGINT UNSIGNED NULL AFTER observation');
  }
  if (!existing.has('room_id')) {
    await pool.query('ALTER TABLE bar_orders ADD COLUMN room_id BIGINT UNSIGNED NULL AFTER hotel_reservation_id');
  }
  if (!existing.has('room_guest_name')) {
    await pool.query('ALTER TABLE bar_orders ADD COLUMN room_guest_name VARCHAR(255) NULL AFTER room_id');
  }
  if (!existing.has('room_account_paid')) {
    await pool.query('ALTER TABLE bar_orders ADD COLUMN room_account_paid BOOLEAN NOT NULL DEFAULT FALSE AFTER room_guest_name');
  }
  const [indexes] = await pool.query('SHOW INDEX FROM bar_orders WHERE Key_name = ?', ['idx_bar_orders_hotel_room']);
  if (!indexes.length) {
    await pool.query('ALTER TABLE bar_orders ADD INDEX idx_bar_orders_hotel_room (hotel_reservation_id, room_id, room_account_paid)');
  }
}

async function listBarOrders({ createdBy } = {}) {
  await ensureBarOrderTables();
  const hasCreatorFilter = createdBy !== undefined && createdBy !== null;
  const [orders] = await pool.query(
    `SELECT * FROM bar_orders WHERE statut <> 'CLOTUREE'${hasCreatorFilter ? ' AND created_by = ?' : ''} ORDER BY created_at DESC`,
    hasCreatorFilter ? [createdBy] : []
  );
  const orderIds = orders.map((order) => order.id);
  if (!orderIds.length) return [];

  const [items] = await pool.query(
    'SELECT * FROM bar_order_items WHERE order_id IN (?) ORDER BY id ASC',
    [orderIds]
  );

  const grouped = {};
  for (const item of items || []) {
    const orderId = item.order_id;
    if (!grouped[orderId]) grouped[orderId] = [];
    grouped[orderId].push(item);
  }

  return orders.map((order) => ({
    id: order.id,
    client: order.client_name,
    table: Number(order.table_id),
    nombre_personnes: Number(order.nombre_personnes || 1),
    moyen_paiement: order.moyen_paiement || 'ESPECES',
    observation: order.observation || '',
    statut: order.statut,
    total: Number(order.montant_total || 0),
    created_at: order.created_at,
    hotel_reservation_id: order.hotel_reservation_id ?? null,
    room_id: order.room_id ?? null,
    room_guest_name: order.room_guest_name || null,
    room_account_paid: Boolean(order.room_account_paid),
    items: (grouped[order.id] || []).map((item) => ({
      nom: item.nom,
      quantite: Number(item.quantite || 1),
      prix: Number(item.prix || 0),
    })),
  }));
}

async function listBarHistory() {
  await ensureBarOrderTables();
  const [orders] = await pool.query("SELECT * FROM bar_orders WHERE statut = 'CLOTUREE' ORDER BY cloture_at DESC, created_at DESC");
  const orderIds = orders.map((order) => order.id);
  if (!orderIds.length) return [];
  const [items] = await pool.query('SELECT * FROM bar_order_items WHERE order_id IN (?) ORDER BY id ASC', [orderIds]);
  const grouped = {};
  for (const item of items) (grouped[item.order_id] ||= []).push(item);
  return orders.map((order) => ({
    id: order.id,
    client: order.client_name,
    table: Number(order.table_id),
    nombre_personnes: Number(order.nombre_personnes || 1),
    moyen_paiement: order.moyen_paiement || 'ESPECES',
    observation: order.observation || '',
    statut: order.statut,
    total: Number(order.montant_total || 0),
    created_at: order.created_at,
    cloture_at: order.cloture_at,
    hotel_reservation_id: order.hotel_reservation_id ?? null,
    room_id: order.room_id ?? null,
    room_guest_name: order.room_guest_name || null,
    room_account_paid: Boolean(order.room_account_paid),
    items: (grouped[order.id] || []).map((item) => ({ nom: item.nom, quantite: Number(item.quantite || 1), prix: Number(item.prix || 0) })),
  }));
}

async function createBarOrder({ clientName, tableId, nombrePersonnes = 1, moyenPaiement = 'ESPECES', observation = '', items, createdBy = null, hotelReservationId = null, roomId = null, roomGuestName = null, roomAccountPaid = false }) {
  await ensureBarOrderTables();
  await ensureBarTransactionsSchema();

  return withTransaction(async (conn) => {
    // Lock and validate each requested stock row before creating the order.
    // The stock decrement and order creation therefore succeed or fail together.
    const requestedQuantities = new Map();
    for (const item of items || []) {
      const productId = Number(item.product_id ?? item.id);
      const quantity = Number(item.quantite);
      if (!Number.isInteger(productId) || productId <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
        throw ApiError.badRequest('Chaque article doit avoir un produit et une quantité positive.');
      }
      requestedQuantities.set(productId, (requestedQuantities.get(productId) || 0) + quantity);
    }

    for (const [productId, quantity] of requestedQuantities) {
      const [stocks] = await conn.query(
        `SELECT bs.quantite, bp.nom
         FROM bar_stock bs
         JOIN bar_products bp ON bp.id = bs.product_id
         WHERE bs.product_id = ? FOR UPDATE`,
        [productId]
      );
      if (!stocks.length) throw ApiError.badRequest(`Stock introuvable pour le produit #${productId}.`);
      if (Number(stocks[0].quantite) < quantity) {
        throw ApiError.badRequest(`Stock insuffisant pour ${stocks[0].nom}. Disponible : ${stocks[0].quantite}.`);
      }
    }

    const clientId = await findOrCreateClient(clientName, conn);
    const total = (items || []).reduce((sum, item) => sum + Number(item.quantite || 1) * Number(item.prix || 0), 0);

    const [result] = await conn.query(
      'INSERT INTO bar_orders (client_name, table_id, nombre_personnes, moyen_paiement, observation, hotel_reservation_id, room_id, room_guest_name, room_account_paid, statut, montant_total, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [clientName || null, tableId || null, Number(nombrePersonnes) || 1, moyenPaiement || 'ESPECES', observation || null, hotelReservationId ?? null, roomId ?? null, roomGuestName || null, roomAccountPaid ? 1 : 0, 'EN_ATTENTE', total, createdBy]
    );

    const orderId = result.insertId;

    for (const [productId, quantity] of requestedQuantities) {
      await conn.query(
        'UPDATE bar_stock SET quantite = quantite - ? WHERE product_id = ?',
        [quantity, productId]
      );
    }

    // Sortie de stock datée : sans cette écriture, la consommation de stock du
    // Bar n'a aucune trace temporelle (bar_stock n'a pas d'historique), ce qui
    // la rend invisible du reporting mensuel par département.
    if (total > 0) {
      await conn.query(
        `INSERT INTO financial_transactions
           (module, type_flux, montant, reference_id, ref_flux_global, description, statut_sync, created_at)
         VALUES ('BAR', 'SORTIE', ?, ?, ?, ?, 'SYNCED', NOW())`,
        [total, orderId, `BAR-ORDER-${orderId}-STOCK`, `Sortie de stock — commande bar #${orderId}`]
      );
    }

    const transactionItems = (items || []).map((item) => ({
      product_id: item.product_id ?? item.id,
      quantite: Number(item.quantite || 1),
      prix_unitaire: Number(item.prix_unitaire ?? item.prix ?? 0),
    })).filter((item) => item.product_id);

    const transactionResult = await createOrder({
      client_id: clientId,
      table_id: tableId || null,
      order_id: orderId,
      items: transactionItems,
      session_id: null,
      connection: conn,
    });

    for (const item of items || []) {
      await conn.query(
        'INSERT INTO bar_order_items (order_id, nom, quantite, prix, created_at) VALUES (?, ?, ?, ?, NOW())',
        [orderId, item.nom || null, Number(item.quantite || 1), Number(item.prix || 0)]
      );
    }

    return {
      id: orderId,
      client: clientName,
      table: Number(tableId),
      nombre_personnes: Number(nombrePersonnes) || 1,
      moyen_paiement: moyenPaiement || 'ESPECES',
      observation: observation || '',
      statut: 'EN_ATTENTE',
      total,
      items: (items || []).map((item) => ({
        nom: item.nom,
        quantite: Number(item.quantite || 1),
        prix: Number(item.prix || 0),
      })),
      transaction_ids: transactionResult.ids,
      client_id: clientId,
    };
  });
}

async function updateBarOrder(id, { clientName, tableId, nombrePersonnes = 1, moyenPaiement = 'ESPECES', observation = '', items, createdBy, hotelReservationId = null, roomId = null, roomGuestName = null, roomAccountPaid = false }) {
  await ensureBarOrderTables();
  await ensureBarTransactionsSchema();

  return withTransaction(async (conn) => {
    const [orders] = await conn.query('SELECT * FROM bar_orders WHERE id = ? FOR UPDATE', [id]);
    if (!orders.length) return null;
    if (createdBy !== undefined && Number(orders[0].created_by) !== Number(createdBy)) {
      throw ApiError.forbidden('Vous pouvez uniquement modifier vos propres commandes.');
    }

    const [existingOrderItems] = await conn.query(
      'SELECT nom, quantite, prix FROM bar_order_items WHERE order_id = ?',
      [id]
    );

    const normalizedItems = (items || [])
      .map((item) => ({
        product_id: Number(item.product_id ?? item.id),
        nom: item.nom,
        quantite: Number(item.quantite || 1),
        prix: Number(item.prix_unitaire ?? item.prix ?? 0),
      }))
      .filter((item) => item.nom && item.quantite > 0);

    if (!normalizedItems.length) {
      throw ApiError.badRequest('Au moins un article est requis pour modifier la commande.');
    }

    const existingByName = new Map();
    for (const row of existingOrderItems || []) {
      const key = String(row.nom || '').trim().toLowerCase();
      existingByName.set(key, Number(row.quantite || 0));
    }

    const additions = normalizedItems
      .map((item) => {
        const key = String(item.nom || '').trim().toLowerCase();
        const alreadyAdded = existingByName.get(key) || 0;
        const increment = Math.max(0, item.quantite - alreadyAdded);
        return increment > 0 ? { ...item, quantite: increment } : null;
      })
      .filter(Boolean);

    if (!additions.length) {
      const currentOrder = orders[0];
      const clientValue = clientName !== undefined ? (clientName || null) : currentOrder.client_name;
      const tableValue = tableId !== undefined ? (tableId || null) : currentOrder.table_id;
      const guestValue = Number(nombrePersonnes || currentOrder.nombre_personnes || 1);
      const paymentValue = moyenPaiement || currentOrder.moyen_paiement || 'ESPECES';
      const observationValue = observation !== undefined ? (observation || null) : currentOrder.observation || null;
      const hotelReservationValue = hotelReservationId !== null ? (hotelReservationId ?? null) : currentOrder.hotel_reservation_id ?? null;
      const roomIdValue = roomId !== null ? (roomId ?? null) : currentOrder.room_id ?? null;
      const roomGuestNameValue = roomGuestName !== null ? (roomGuestName || null) : currentOrder.room_guest_name ?? null;
      const roomAccountPaidValue = roomAccountPaid !== false ? (roomAccountPaid ? 1 : 0) : (currentOrder.room_account_paid ? 1 : 0);
      await conn.query(
        'UPDATE bar_orders SET client_name = ?, table_id = ?, nombre_personnes = ?, moyen_paiement = ?, observation = ?, hotel_reservation_id = ?, room_id = ?, room_guest_name = ?, room_account_paid = ? WHERE id = ?',
        [clientValue, tableValue, guestValue, paymentValue, observationValue, hotelReservationValue, roomIdValue, roomGuestNameValue, roomAccountPaidValue, id]
      );
      return {
        id: Number(id),
        client: clientValue,
        table: Number(tableValue || 0),
        nombre_personnes: guestValue,
        moyen_paiement: paymentValue,
        observation: observationValue || '',
        statut: currentOrder.statut,
        total: Number(currentOrder.montant_total || 0),
        created_at: currentOrder.created_at,
        items: normalizedItems.map((item) => ({ nom: item.nom, quantite: item.quantite, prix: item.prix })),
      };
    }

    const requestedQuantities = new Map();
    for (const item of additions) {
      if (item.product_id > 0) {
        requestedQuantities.set(item.product_id, (requestedQuantities.get(item.product_id) || 0) + item.quantite);
      }
    }

    for (const [productId, quantity] of requestedQuantities) {
      const [stocks] = await conn.query(
        `SELECT bs.quantite, bp.nom
         FROM bar_stock bs
         JOIN bar_products bp ON bp.id = bs.product_id
         WHERE bs.product_id = ? FOR UPDATE`,
        [productId]
      );
      if (!stocks.length) throw ApiError.badRequest(`Stock introuvable pour le produit #${productId}.`);
      if (Number(stocks[0].quantite) < quantity) {
        throw ApiError.badRequest(`Stock insuffisant pour ${stocks[0].nom}. Disponible : ${stocks[0].quantite}.`);
      }
    }

    const totalNewItems = additions.reduce((sum, item) => sum + item.quantite * item.prix, 0);
    const currentOrder = orders[0];
    const nextTotal = Number(currentOrder.montant_total || 0) + totalNewItems;

    const clientValue = clientName !== undefined ? (clientName || null) : currentOrder.client_name;
    const tableValue = tableId !== undefined ? (tableId || null) : currentOrder.table_id;
    const guestValue = Number(nombrePersonnes || currentOrder.nombre_personnes || 1);
    const paymentValue = moyenPaiement || currentOrder.moyen_paiement || 'ESPECES';
    const observationValue = observation !== undefined ? (observation || null) : currentOrder.observation || null;

    await conn.query(
      'UPDATE bar_orders SET client_name = ?, table_id = ?, nombre_personnes = ?, moyen_paiement = ?, observation = ?, montant_total = ? WHERE id = ?',
      [clientValue, tableValue, guestValue, paymentValue, observationValue, nextTotal, id]
    );

    for (const item of additions) {
      await conn.query(
        'INSERT INTO bar_order_items (order_id, nom, quantite, prix, created_at) VALUES (?, ?, ?, ?, NOW())',
        [id, item.nom || null, item.quantite, item.prix]
      );
    }

    for (const [productId, quantity] of requestedQuantities) {
      await conn.query(
        'UPDATE bar_stock SET quantite = quantite - ? WHERE product_id = ?',
        [quantity, productId]
      );
    }

    // Sortie de stock datée pour les articles ajoutés à une commande existante
    // (voir la même écriture dans createBarOrder pour le contexte).
    if (totalNewItems > 0) {
      await conn.query(
        `INSERT INTO financial_transactions
           (module, type_flux, montant, reference_id, ref_flux_global, description, statut_sync, created_at)
         VALUES ('BAR', 'SORTIE', ?, ?, ?, ?, 'SYNCED', NOW())`,
        [totalNewItems, id, `BAR-ORDER-${id}-STOCK`, `Sortie de stock — ajout commande bar #${id}`]
      );
    }

    const clientId = await findOrCreateClient(clientValue, conn);
    const transactionItems = additions.map((item) => ({
      product_id: item.product_id,
      quantite: item.quantite,
      prix_unitaire: item.prix,
    })).filter((item) => item.product_id > 0);

    await createOrder({
      client_id: clientId,
      table_id: tableValue || null,
      order_id: id,
      items: transactionItems,
      session_id: null,
      connection: conn,
    });

    return {
      id: Number(id),
      client: clientValue,
      table: Number(tableValue || 0),
      nombre_personnes: Number(guestValue),
      moyen_paiement: paymentValue,
      observation: observationValue || '',
      statut: currentOrder.statut,
      total: Number(nextTotal),
      created_at: currentOrder.created_at,
      items: normalizedItems.map((item) => ({
        nom: item.nom,
        quantite: item.quantite,
        prix: item.prix,
      })),
    };
  });
}

async function deleteBarOrder(id) {
  await ensureBarOrderTables();
  await ensureBarTransactionsSchema();

  return withTransaction(async (conn) => {
    const [orders] = await conn.query('SELECT id FROM bar_orders WHERE id = ? FOR UPDATE', [id]);
    if (!orders.length) return false;

    const [transactions] = await conn.query(
      'SELECT product_id, quantite FROM bar_transactions WHERE order_id = ?',
      [id]
    );
    for (const transaction of transactions) {
      await conn.query(
        'UPDATE bar_stock SET quantite = quantite + ? WHERE product_id = ?',
        [transaction.quantite, transaction.product_id]
      );
    }
    await conn.query('DELETE FROM bar_transactions WHERE order_id = ?', [id]);
    await conn.query(
      `DELETE FROM financial_transactions
       WHERE module = 'BAR' AND ref_flux_global IN (?, ?)`,
      [`BAR-ORDER-${id}`, `BAR-ORDER-${id}-STOCK`]
    );
    await conn.query('DELETE FROM bar_orders WHERE id = ?', [id]);
    return true;
  });
}

async function updateBarOrderStatus(id, statut, moyenPaiement) {
  await ensureBarOrderTables();
  const allowedTransitions = {
    EN_ATTENTE: 'EN_PREPARATION',
    EN_PREPARATION: 'PRETE',
    PRETE: 'SERVIE',
    SERVIE: 'ENCAISSEE',
  };

  return withTransaction(async (conn) => {
    const [orders] = await conn.query(
      'SELECT id, statut, moyen_paiement FROM bar_orders WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!orders.length) return null;

    const currentStatus = orders[0].statut;
    if (allowedTransitions[currentStatus] !== statut) {
      throw ApiError.badRequest('Transition de statut de commande invalide.');
    }

    if (statut === 'ENCAISSEE') {
      const paymentValue = moyenPaiement || orders[0].moyen_paiement || 'ESPECES';
      await conn.query('UPDATE bar_orders SET statut = ?, moyen_paiement = ? WHERE id = ?', [statut, paymentValue, id]);
    } else {
      await conn.query('UPDATE bar_orders SET statut = ? WHERE id = ?', [statut, id]);
    }
    if (statut === 'ENCAISSEE') {
      await conn.query(
        "UPDATE bar_transactions SET statut = 'PAYEE' WHERE order_id = ?",
        [id]
      );

      const [[order]] = await conn.query(
        'SELECT montant_total, client_name FROM bar_orders WHERE id = ?',
        [id]
      );
      const [[existingTransaction]] = await conn.query(
        `SELECT id FROM financial_transactions
         WHERE module = 'BAR' AND ref_flux_global = ? LIMIT 1`,
        [`BAR-ORDER-${id}`]
      );
      if (!existingTransaction) {
        await conn.query(
          `INSERT INTO financial_transactions
             (module, type_flux, montant, reference_id, ref_flux_global, description, statut_sync, created_at)
           VALUES ('BAR', 'ENTREE', ?, ?, ?, ?, 'SYNCED', NOW())`,
          [order.montant_total, id, `BAR-ORDER-${id}`, `Encaissement commande bar #${id}`]
        );
      }
    }
    return { id: Number(id), statut };
  });
}

async function closeAllBarOrders(orderIds = []) {
  await ensureBarOrderTables();
  await ensureBarTransactionsSchema();

  return withTransaction(async (conn) => {
    const ids = [...new Set(orderIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    const targetIds = ids.length > 0
      ? ids
      : (await conn.query("SELECT id FROM bar_orders WHERE statut <> 'CLOTUREE'"))[0].map((row) => row.id);
    if (targetIds.length > 0) {
      await conn.query("UPDATE bar_orders SET statut = 'CLOTUREE', cloture_at = NOW() WHERE id IN (?) AND statut <> 'CLOTUREE'", [targetIds]);
    }
    return { closed_orders: targetIds.length, archived: true };
  });
}
module.exports = {
  listBarOrders,
  listBarHistory,
  createBarOrder,
  updateBarOrder,
  deleteBarOrder,
  updateBarOrderStatus,
  closeAllBarOrders,
};
