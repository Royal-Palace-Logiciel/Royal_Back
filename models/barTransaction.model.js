const { createCrudModel } = require('./crudFactory');
const { pool } = require('../config/db');

// Keep installations created before these order columns compatible.
let schemaReady;

async function ensureBarTransactionsSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bar_transactions (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          session_id BIGINT UNSIGNED DEFAULT NULL,
          client_id BIGINT UNSIGNED DEFAULT NULL,
          table_id BIGINT UNSIGNED DEFAULT NULL,
          order_id BIGINT UNSIGNED DEFAULT NULL,
          product_id BIGINT UNSIGNED DEFAULT NULL,
          quantite DECIMAL(12,2) NOT NULL DEFAULT 1,
          prix_unitaire DECIMAL(14,2) NOT NULL DEFAULT 0,
          statut VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
          type_transaction VARCHAR(40) NOT NULL DEFAULT 'ENTREE',
          montant DECIMAL(14,2) NOT NULL DEFAULT 0,
          moyen_paiement VARCHAR(30) NOT NULL DEFAULT 'ESPECES',
          reference VARCHAR(150) DEFAULT NULL,
          created_by BIGINT UNSIGNED DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_bar_transactions_session_id (session_id),
          KEY idx_bar_transactions_product_id (product_id),
          KEY idx_bar_transactions_order_id (order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      const [columns] = await pool.query('SHOW COLUMNS FROM bar_transactions');
      const existing = new Set(columns.map((column) => column.Field));
      const requiredColumns = {
        session_id: 'BIGINT UNSIGNED DEFAULT NULL',
        client_id: 'BIGINT UNSIGNED DEFAULT NULL',
        table_id: 'BIGINT UNSIGNED DEFAULT NULL',
        order_id: 'BIGINT UNSIGNED DEFAULT NULL',
        product_id: 'BIGINT UNSIGNED DEFAULT NULL',
        quantite: 'DECIMAL(12,2) NOT NULL DEFAULT 1',
        prix_unitaire: 'DECIMAL(14,2) NOT NULL DEFAULT 0',
        statut: "VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE'",
        created_at: 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
      };
      for (const [column, definition] of Object.entries(requiredColumns)) {
        if (!existing.has(column)) {
          await pool.query(`ALTER TABLE bar_transactions ADD COLUMN \`${column}\` ${definition}`);
        }
      }
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

const BarTransactions = createCrudModel({
  table: 'bar_transactions',
  pk: 'id',
  fields: ['session_id', 'product_id', 'quantite', 'prix_unitaire'],
  sortable: ['id', 'created_at'],
});

async function addTransaction({ session_id, product_id, quantite, prix_unitaire }) {
  const quantity = Number(quantite || 1);
  const unitPrice = Number(prix_unitaire);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO bar_transactions (session_id, product_id, quantite, prix_unitaire) VALUES (?, ?, ?, ?)',
      [session_id || null, product_id, quantity, unitPrice]
    );
    const transactionId = result.insertId;
    const [[product]] = await conn.query('SELECT nom FROM bar_products WHERE id = ?', [product_id]);
    await conn.query(
      `INSERT IGNORE INTO financial_transactions
         (module, type_flux, montant, reference_id, ref_flux_global, description, statut_sync, created_at)
       VALUES ('BAR', 'ENTREE', ?, ?, ?, ?, 'SYNCED', NOW())`,
      [quantity * unitPrice, transactionId, `BAR-TRANSACTION-${transactionId}`, `Vente bar${product?.nom ? ` — ${product.nom}` : ''}`]
    );
    await conn.commit();
    return { id: transactionId, session_id, product_id, quantite: quantity, prix_unitaire: unitPrice };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function createOrder({ client_id, table_id, order_id, items, session_id, connection }) {
  await ensureBarTransactionsSchema();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const db = connection || pool;

  const transactionIds = [];
  for (const item of items || []) {
    const productId = item.product_id ?? item.id;
    const quantity = Number(item.quantite || 1);
    const unitPrice = Number(item.prix_unitaire ?? item.prix ?? 0);

    if (!productId) continue;

    const [result] = await db.query(
      'INSERT INTO bar_transactions (session_id, client_id, table_id, order_id, product_id, quantite, prix_unitaire, statut, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, \'EN_ATTENTE\', ?)',
      [session_id || null, client_id || null, table_id || null, order_id || null, productId, quantity, unitPrice, now]
    );
    transactionIds.push(result.insertId);
  }

  return { ids: transactionIds, client_id, table_id, items: (items || []).map((item) => ({
    product_id: item.product_id ?? item.id,
    quantite: Number(item.quantite || 1),
    prix_unitaire: Number(item.prix_unitaire ?? item.prix ?? 0),
  })), statut: 'EN_ATTENTE' };
}

module.exports = { BarTransactions, addTransaction, createOrder, ensureBarTransactionsSchema };
