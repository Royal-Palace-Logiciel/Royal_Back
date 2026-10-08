// controllers/restaurantController.js
const resto = require('../models/restaurantModel');
const { createCrudController } = require('./controllerFactory');
const ApiError = require('../utils/ApiError');
const { ok, created, noContent } = require('../utils/apiResponse');
const { pool, withTransaction } = require('../config/db');
const stock = require('../models/stockModel');
const PDFDocument = require('pdfkit');
const { getRestaurantReport, saveRestaurantReport } = require('../models/restaurantReport.model');
const { getProductHistory } = require('../models/restaurantProductHistory.model');

// Simple HTML escaper for values interpolated into the invoice template
function escapeHtml(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const tablesCrud = createCrudController(resto.TablesRestaurant, { filterable: ['statut'] });
const ordersCrud = createCrudController(resto.Orders, { filterable: ['client_id', 'statut', 'source_module'] });

async function getRestaurantReportHandler(req, res) {
  return ok(res, await getRestaurantReport(req.params.date));
}

async function saveRestaurantReportHandler(req, res) {
  const { reportDate, personnel, manual, metrics } = req.body || {};
  return ok(res, await saveRestaurantReport({
    reportDate,
    personnel,
    manual,
    metrics,
    createdBy: req.user?.id_admin ?? null,
  }));
}

async function getProductHistoryHandler(req, res) {
  const { dateFrom, dateTo, productName } = req.query;
  const history = await getProductHistory({ dateFrom, dateTo, productName });
  return ok(res, history);
}

const orderItemsCrud = createCrudController(resto.OrderItems, { filterable: ['order_id', 'product_id'] });
// Recipes removed: feature deprecated
const cashiersCrud = createCrudController(resto.RestaurantCashiers, { filterable: ['statut'] });
const sessionsCrud = createCrudController(resto.RestaurantSessions, { filterable: ['cashier_id', 'user_id'] });

const normalizeRestaurantProductName = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

async function nextRestaurantProductCode() {
  const year = new Date().getFullYear();
  const [[row]] = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(SUBSTRING(code, 5), '/', 1) AS UNSIGNED)), 0) AS last_number
       FROM products
      WHERE source_module = 'RESTAURANT'
        AND code REGEXP ?`,
    [`^PLAT[0-9]+/${year}$`]
  );
  return `PLAT${String(Number(row.last_number) + 1).padStart(2, '0')}/${year}`;
}

// Override productsCrud to only return menu items (PRODUIT_FINI) for restaurant
const productsCrud = {
  ...createCrudController(stock.Products, { filterable: ['category_id', 'subcategory_id', 'actif'] }),
  list: async (req, res) => {
    const { category_id, subcategory_id, actif } = req.query;
    let whereSql = "WHERE p.type_produit = 'PRODUIT_FINI' AND p.source_module = 'RESTAURANT'";
    const params = [];

    if (category_id) {
      whereSql += ' AND p.category_id = ?';
      params.push(category_id);
    }
    if (subcategory_id) {
      whereSql += ' AND p.subcategory_id = ?';
      params.push(subcategory_id);
    }
    if (actif !== undefined) {
      whereSql += ' AND p.actif = ?';
      params.push(actif);
    }

    const [rows] = await pool.query(
      `SELECT p.*, c.nom AS category_nom, sc.nom AS subcategory_nom 
       FROM products p 
       LEFT JOIN categories c ON c.id = p.category_id 
       LEFT JOIN subcategories sc ON sc.id = p.subcategory_id 
       ${whereSql} 
       ORDER BY c.nom, p.nom`,
      params
    );
    return ok(res, rows);
  },
  getOne: async (req, res) => {
    const product = await stock.Products.findById(req.params.id);
    if (!product || product.source_module !== 'RESTAURANT') {
      throw ApiError.notFound(`Produit restaurant #${req.params.id} introuvable`);
    }
    return ok(res, product);
  },
  nextCode: async (req, res) => ok(res, { code: await nextRestaurantProductCode() }),
  create: async (req, res) => {
    const productName = String(req.body?.nom || '').trim();
    const normalizedName = normalizeRestaurantProductName(productName);
    const [restaurantProducts] = await pool.query(
      "SELECT nom FROM products WHERE source_module = 'RESTAURANT'"
    );
    const duplicate = normalizedName && restaurantProducts.some(
      (product) => normalizeRestaurantProductName(product.nom) === normalizedName
    );
    if (duplicate) {
      throw ApiError.conflict(`Le produit « ${productName} » est déjà enregistré et ne peut pas être ajouté une deuxième fois.`);
    }

    const code = await nextRestaurantProductCode();
    const product = await stock.Products.create({ ...req.body, nom: productName, code, source_module: 'RESTAURANT' });
    return created(res, product);
  },
  update: async (req, res) => {
    const product = await stock.Products.findById(req.params.id);
    if (!product || product.source_module !== 'RESTAURANT') {
      throw ApiError.notFound(`Produit restaurant #${req.params.id} introuvable`);
    }
    return ok(res, await stock.Products.update(req.params.id, { ...req.body, source_module: 'RESTAURANT' }));
  },
  remove: async (req, res) => {
    const product = await stock.Products.findById(req.params.id);
    if (!product || product.source_module !== 'RESTAURANT') {
      throw ApiError.notFound(`Produit restaurant #${req.params.id} introuvable`);
    }
    await stock.Products.remove(req.params.id);
    return noContent(res);
  }
};

async function createOrderHandler(req, res) {
  console.debug('[restaurant] createOrderHandler body:', JSON.stringify(req.body));
  const { client_id, table_id, items, notes, location_type, special_person_name } = req.body;
  if (!items || !items.length) throw ApiError.badRequest('items requis (au moins une ligne)');

  try {
    if (client_id) {
      const [[client]] = await pool.query('SELECT id FROM clients WHERE id = ? LIMIT 1', [client_id]);
      if (!client) throw ApiError.badRequest(`client_id ${client_id} introuvable`);
    }

    if (table_id) {
      const [[tableRow]] = await pool.query('SELECT id FROM tables_restaurant WHERE id = ? LIMIT 1', [table_id]);
      if (!tableRow) throw ApiError.badRequest(`table_id ${table_id} introuvable`);
    }

    const productIds = items.map((it) => Number(it.product_id)).filter(Boolean);
    if (!productIds.length) throw ApiError.badRequest('Chaque ligne doit contenir product_id valide');
    const placeholders = productIds.map(() => '?').join(',');
    const [foundProducts] = await pool.query(`SELECT id FROM products WHERE id IN (${placeholders})`, productIds);
    const foundIds = new Set(foundProducts.map((p) => Number(p.id)));
    const missing = productIds.filter((id) => !foundIds.has(id));
    if (missing.length) throw ApiError.badRequest(`product_id introuvable: ${missing.join(',')}`);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error('[restaurant] validation error', err);
    throw ApiError.badRequest('Données de référence invalides');
  }

  const order = await resto.createOrderWithItems({ clientId: client_id, tableId: table_id, items, notes, locationType: location_type, specialPersonName: special_person_name });
  return created(res, order);
}

async function updateOrderHandler(req, res) {
  const { client_id, table_id, items, notes, location_type, special_person_name } = req.body;
  if (!Array.isArray(items) || !items.length) throw ApiError.badRequest('items requis (au moins une ligne)');

  const productIds = items.map((item) => Number(item.product_id)).filter(Boolean);
  const placeholders = productIds.map(() => '?').join(',');
  const [foundProducts] = await pool.query(`SELECT id FROM products WHERE id IN (${placeholders})`, productIds);
  const foundIds = new Set(foundProducts.map((product) => Number(product.id)));
  const missing = productIds.filter((id) => !foundIds.has(id));
  if (missing.length) throw ApiError.badRequest(`product_id introuvable: ${missing.join(',')}`);

  const order = await resto.updateOrderWithItems({
    orderId: req.params.id,
    clientId: client_id,
    tableId: table_id,
    items,
    notes,
    locationType: location_type,
    specialPersonName: special_person_name,
  });
  if (!order) throw ApiError.notFound(`Commande #${req.params.id} introuvable`);
  return ok(res, order);
}

async function orderDetailHandler(req, res) {
  const order = await resto.orderWithItems(req.params.id);
  if (!order) throw ApiError.notFound(`Commande #${req.params.id} introuvable`);
  return ok(res, order);
}

async function orderInvoiceHandler(req, res) {
  const order = await resto.orderWithItems(req.params.id);
  if (!order) throw ApiError.notFound(`Commande #${req.params.id} introuvable`);

  let client = null;
  if (order.client_id) {
    const [[c]] = await pool.query('SELECT * FROM clients WHERE id = ? LIMIT 1', [order.client_id]);
    client = c || null;
  }

  const rows = order.items || [];
  const total = Number(order.montant_total || rows.reduce((s, r) => s + Number(r.quantite) * Number(r.prix_unitaire || 0), 0));

  const date = order.created_at ? new Date(order.created_at).toLocaleString() : '';
  const tableNum = order.table_numero || '';

  const rowsHtml = rows
    .map((r, idx) => {
      const qty = Number(r.quantite || 0);
      const pu = Number(r.prix_unitaire || 0);
      const lineTotal = (qty * pu).toFixed(2);
      const cuisson = r.cuisson ? ` (${escapeHtml(r.cuisson)})` : '';
      return `
        <tr>
          <td class="cell-center">${idx + 1}</td>
          <td>${escapeHtml(r.product_nom || `#${r.product_id || ''}`)}${cuisson}</td>
          <td class="cell-center">${qty}</td>
          <td class="cell-right">${pu.toFixed(2)}</td>
          <td class="cell-right">${lineTotal}</td>
        </tr>`;
    })
    .join('');

  const clientBlock = client
    ? `<div class="client"><strong>Client</strong><div>${escapeHtml((client.nom || client.name || '') + (client.prenom ? ' ' + client.prenom : ''))}</div><div>${escapeHtml(client.telephone || client.phone || '')}</div><div>${escapeHtml(client.email || '')}</div></div>`
    : '';

  const notesBlock = order.notes
    ? `<div class="notes" style="margin-top:6px;padding:4px;background:#f9f9f9;border:1px solid #ddd;font-size:11px;"><strong>Notes:</strong> ${escapeHtml(order.notes)}</div>`
    : '';

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Facture #${order.id}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#000;margin:0;padding:12px}
        .invoice{max-width:380px;margin:0 auto;background:#fff;padding:8px}
        h2{margin:6px 0;font-size:16px;text-align:center}
        .meta{font-size:12px;margin-bottom:6px}
        .client{font-size:12px;margin-bottom:6px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        thead th, tbody td{border:1px solid #000;padding:6px}
        thead th{background:#f0f0f0}
        .cell-right{text-align:right}
        .cell-center{text-align:center}
        .footer{margin-top:8px;font-size:11px;text-align:center;color:#444}
        @media print{body{padding:0} .invoice{box-shadow:none}}
      </style>
    </head>
    <body>
      <div class="invoice">
        <h2>Facture #${order.id}</h2>
        <div class="meta">Date: ${escapeHtml(date)}${tableNum ? ' • Table: ' + escapeHtml(String(tableNum)) : ''}</div>
        ${clientBlock}
        ${notesBlock}
        <table>
          <thead>
            <tr>
              <th style="width:30px">#</th>
              <th>Produit</th>
              <th style="width:50px">Qté</th>
              <th style="width:70px">PU</th>
              <th style="width:80px">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3"></td>
              <td class="cell-right">Total</td>
              <td class="cell-right">${Number(total).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <div class="footer">Imprimé depuis Royal Palace — Antsirabe</div>
      </div>
    </body>
  </html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
}

async function orderInvoicePdfHandler(req, res) {
  const order = await resto.orderWithItems(req.params.id);
  if (!order) throw ApiError.notFound(`Commande #${req.params.id} introuvable`);

  let client = null;
  if (order.client_id) {
    const [[c]] = await pool.query('SELECT * FROM clients WHERE id = ? LIMIT 1', [order.client_id]);
    client = c || null;
  }

  const rows = order.items || [];
  const total = Number(order.montant_total || rows.reduce((s, r) => s + Number(r.quantite) * Number(r.prix_unitaire || 0), 0));
  const date = order.created_at ? new Date(order.created_at).toLocaleString() : '';
  const tableNum = order.table_numero || '';

  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="facture_commande_${order.id}.pdf"`);
  doc.pipe(res);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  let y = 40;

  doc.font('Helvetica-Bold').fontSize(14).text("Royal Palace", left, y);
  doc.fontSize(10).fillColor('#000').text(`Facture #${order.id}`, right - 150, y, { width: 150, align: 'right' });
  doc.fontSize(9).fillColor('#444').text(`${date}`, right - 150, y + 16, { width: 150, align: 'right' });
  y += 36;

  doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor('#cccccc').stroke();
  y += 8;

  if (client) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000').text('Client:', left, y);
    doc.font('Helvetica').fontSize(9).fillColor('#000').text(`${client.nom || client.name || ''} ${client.prenom || ''}`, left + 50, y);
    if (client.telephone) doc.text(`${client.telephone}`, left + 50, y + 12);
    if (client.email) doc.text(`${client.email}`, left + 50, y + 24);
  } else {
    doc.font('Helvetica').fontSize(9).fillColor('#000').text('Client: (non renseigné)', left, y);
  }
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text('Statut:', right - 150, y);
  doc.font('Helvetica').fontSize(9).fillColor('#000').text(`${order.statut || ''}`, right - 90, y);
  y += 40;

  if (order.notes) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text('Notes:', left, y);
    doc.font('Helvetica').fontSize(9).fillColor('#000').text(order.notes, left + 50, y, { width: right - left - 50 });
    y += 24;
  }

  const col = {
    no: left + 2,
    desc: left + 40,
    qty: left + 260,
    pu: left + 320,
    amount: right - 80,
  };
  const rowHeight = 20;

  doc.rect(left, y - 4, right - left, rowHeight).fill('#f3f4f6').fillColor('#000');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
  doc.text('#', col.no, y, { width: 30, align: 'left' });
  doc.text('Produit', col.desc, y, { width: 200, align: 'left' });
  doc.text('Qté', col.qty, y, { width: 40, align: 'right' });
  doc.text('PU', col.pu, y, { width: 60, align: 'right' });
  doc.text('Montant', col.amount, y, { width: 80, align: 'right' });
  y += rowHeight + 2;

  doc.font('Helvetica').fontSize(9).fillColor('#000');
  rows.forEach((r, idx) => {
    const qty = Number(r.quantite || 0);
    const pu = Number(r.prix_unitaire || 0);
    const lineTotal = (qty * pu).toFixed(2);
    const cuisson = r.cuisson ? ` (${r.cuisson})` : '';

    if (y > doc.page.height - 80) {
      doc.addPage();
      y = 40;
    }

    doc.text(String(idx + 1), col.no, y, { width: 30, align: 'left' });
    doc.text(String(r.product_nom || `#${r.product_id || ''}`) + cuisson, col.desc, y, { width: 220, align: 'left' });
    doc.text(String(qty), col.qty, y, { width: 40, align: 'right' });
    doc.text(pu.toFixed(2), col.pu, y, { width: 60, align: 'right' });
    doc.text(lineTotal, col.amount, y, { width: 80, align: 'right' });

    y += rowHeight - 4;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.4).strokeColor('#e2e8f0').stroke();
    y += 6;
  });

  if (y > doc.page.height - 120) {
    doc.addPage();
    y = 40;
  }
  y += 6;
  const totalsBoxWidth = 200;
  const totalsX = right - totalsBoxWidth;
  doc.rect(totalsX, y, totalsBoxWidth, 56).lineWidth(0.6).strokeColor('#cbd5e1').stroke();
  doc.font('Helvetica').fontSize(10).text('Total', totalsX + 8, y + 8, { width: 120, align: 'left' });
  doc.font('Helvetica-Bold').fontSize(12).text(Number(total).toFixed(2), totalsX + 8, y + 26, { width: 120, align: 'left' });

  y += 76;
  doc.fontSize(9).fillColor('#666').text('Imprimé depuis le système Royal Palace — Antsirabe', left, y);

  doc.end();
}

async function ordersInProgressHandler(req, res) {
  const rows = await resto.ordersByTable(req.query.statut || 'EN_COURS');
  return ok(res, rows);
}

async function restaurantStockHandler(req, res) {
  const [rows] = await pool.query(
    `SELECT s.id, p.id AS product_id, sl.id AS location_id, COALESCE(s.quantite, 0) AS quantite,
            p.nom AS product_nom, p.unite, p.code, p.type_produit,
            p.prix_achat, p.prix_vente, p.category_id, p.subcategory_id,
            c.nom AS category_nom, sc.nom AS subcategory_nom,
            p.portion_size, p.portion_unite,
            sl.nom AS location_nom
     FROM stocks s
     JOIN products p ON p.id = s.product_id
     JOIN stock_locations sl ON sl.id = s.location_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN subcategories sc ON sc.id = p.subcategory_id
     WHERE p.actif = 1${req.query.location_id ? ' AND s.location_id = ?' : ''}${req.query.type_produit ? ' AND p.type_produit = ?' : ''}
     ORDER BY p.nom ASC`,
    [...(req.query.location_id ? [req.query.location_id] : []), ...(req.query.type_produit ? [req.query.type_produit] : [])]
  );
  return ok(res, rows);
}

async function restaurantStockMovementsHandler(req, res) {
  const conditions = [];
  const values = [];
  if (req.query.location_id) {
    conditions.push('m.location_id = ?');
    values.push(req.query.location_id);
  }
  const [rows] = await pool.query(
    `SELECT m.*, p.nom AS product_nom, p.unite, sl.nom AS location_nom
     FROM stock_movements m
     JOIN products p ON p.id = m.product_id
     JOIN stock_locations sl ON sl.id = m.location_id
     ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY m.created_at DESC, m.id DESC LIMIT 100`,
    values
  );
  return ok(res, rows);
}

async function adjustRestaurantStockHandler(req, res) {
  const { product_id, location_id, type_mouvement, quantite, source_module, reference_id } = req.body || {};
  const quantity = Number(quantite);
  if (!product_id || !location_id || !['ENTREE', 'SORTIE'].includes(type_mouvement) || !Number.isFinite(quantity) || quantity <= 0) {
    throw ApiError.badRequest('product_id, location_id, type_mouvement et quantite positive sont requis');
  }

  await stock.recordMovement({
    productId: product_id,
    locationId: location_id,
    type: type_mouvement,
    quantite: quantity,
    sourceModule: source_module || 'MANUEL',
    referenceId: reference_id,
  });
  const [rows] = await pool.query(
    'SELECT quantite FROM stocks WHERE product_id = ? AND location_id = ?',
    [product_id, location_id]
  );
  return ok(res, { newQty: Number(rows[0].quantite) });
}

async function removeRestaurantStockHandler(req, res) {
  const { id } = req.query || {};
  const productId = req.query && req.query.product_id ? Number(req.query.product_id) : null;
  const locationId = req.query && req.query.location_id ? Number(req.query.location_id) : null;

  if (!id && (!productId || !locationId)) {
    throw ApiError.badRequest('id ou product_id+location_id requis');
  }

  const where = id ? 'id = ?' : 'product_id = ? AND location_id = ?';
  const params = id ? [id] : [productId, locationId];

  const [result] = await pool.query(`DELETE FROM stocks WHERE ${where}`, params);
  if (result.affectedRows === 0) {
    throw ApiError.notFound('Ligne de stock introuvable');
  }

  return noContent(res);
}

async function getRestaurantPurchasesHandler(req, res) {
  const [rows] = await pool.query(
    `SELECT pu.id, pu.supplier_id, pu.montant_total, pu.statut, s.nom AS supplier_nom
     FROM purchases pu
     LEFT JOIN suppliers s ON s.id = pu.supplier_id
     ORDER BY pu.id DESC`
  );
  return ok(res, rows);
}

async function getRestaurantPurchaseByIdHandler(req, res) {
  const { id } = req.params;
  const [[purchase]] = await pool.query(
    `SELECT pu.id, pu.supplier_id, pu.montant_total, pu.statut, s.nom AS supplier_nom
     FROM purchases pu
     LEFT JOIN suppliers s ON s.id = pu.supplier_id
     WHERE pu.id = ?`,
    [id]
  );

  if (!purchase) {
    throw ApiError.notFound(`Achat #${id} introuvable`);
  }

  const [items] = await pool.query(
    `SELECT pi.id, pi.purchase_id, pi.product_id, pi.quantite, pi.prix_unitaire,
            p.nom AS product_nom, p.unite
     FROM purchase_items pi
     JOIN products p ON p.id = pi.product_id
     WHERE pi.purchase_id = ?`,
    [id]
  );

  return ok(res, { ...purchase, items });
}

async function createRestaurantPurchaseHandler(req, res) {
  const { supplier_id, items } = req.body || {};
  if (!supplier_id || !Array.isArray(items) || !items.length) {
    throw ApiError.badRequest('supplier_id et au moins une ligne d’achat sont requis');
  }
  for (const item of items) {
    if (!item.product_id || !item.location_id || Number(item.quantite) <= 0 || Number(item.prix_unitaire) < 0) {
      throw ApiError.badRequest('Chaque ligne exige product_id, location_id, quantite et prix_unitaire valides');
    }
  }

  const purchase = await withTransaction(async (conn) => {
    const total = items.reduce((sum, item) => sum + Number(item.quantite) * Number(item.prix_unitaire), 0);
    const [result] = await conn.query(
      "INSERT INTO purchases (supplier_id, montant_total, statut) VALUES (?, ?, 'RECU')",
      [supplier_id, total]
    );
    const purchaseId = result.insertId;

    for (const item of items) {
      const quantity = Number(item.quantite);
      await conn.query(
        'INSERT INTO purchase_items (purchase_id, product_id, quantite, prix_unitaire) VALUES (?, ?, ?, ?)',
        [purchaseId, item.product_id, quantity, Number(item.prix_unitaire)]
      );
      const [stocks] = await conn.query(
        'SELECT id FROM stocks WHERE product_id = ? AND location_id = ? FOR UPDATE',
        [item.product_id, item.location_id]
      );
      if (stocks.length) {
        await conn.query('UPDATE stocks SET quantite = quantite + ? WHERE id = ?', [quantity, stocks[0].id]);
      } else {
        await conn.query('INSERT INTO stocks (product_id, location_id, quantite) VALUES (?, ?, ?)', [item.product_id, item.location_id, quantity]);
      }
      await conn.query(
        `INSERT INTO stock_movements (product_id, location_id, type_mouvement, quantite, source_module, reference_id, created_at)
         VALUES (?, ?, 'ENTREE', ?, 'ACHAT', ?, NOW())`,
        [item.product_id, item.location_id, quantity, purchaseId]
      );
    }

    if (total > 0) {
      await conn.query(
        `INSERT INTO financial_transactions (module, type_flux, montant, reference_id, description, created_at)
         VALUES ('RESTAURANT', 'SORTIE', ?, ?, ?, NOW())`,
        [total, purchaseId, `Achat stock restaurant #${purchaseId}`]
      );
    }

    const [[createdPurchase]] = await conn.query(
      `SELECT pu.*, s.nom AS supplier_nom FROM purchases pu LEFT JOIN suppliers s ON s.id = pu.supplier_id WHERE pu.id = ?`,
      [purchaseId]
    );
    return createdPurchase;
  });

  return created(res, purchase);
}

async function menuHandler(req, res) {
  const [rows] = await pool.query(
    `SELECT p.*, c.nom AS category_nom 
     FROM products p 
     LEFT JOIN categories c ON c.id = p.category_id 
    WHERE p.actif = 1 AND p.type_produit = 'PRODUIT_FINI' AND p.source_module = 'RESTAURANT'
     ORDER BY c.nom, p.nom`
  );
  return ok(res, rows);
}

async function updateOrderStatusHandler(req, res) {
  console.debug('[restaurant] updateOrderStatusHandler params:', req.params, 'body:', JSON.stringify(req.body));
  const { statut } = req.body;
  if (!statut) throw ApiError.badRequest('statut est requis');

  const [result] = await pool.query(
    'UPDATE orders SET statut = ? WHERE id = ?',
    [statut, req.params.id]
  );
  if (result.affectedRows === 0) throw ApiError.notFound(`Commande #${req.params.id} introuvable`);

  const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  return ok(res, order);
}

async function openCashierHandler(req, res) {
  const { nom, user_id, fond_initial } = req.body;
  if (!nom || !user_id || fond_initial === undefined) {
    throw ApiError.badRequest('nom, user_id et fond_initial sont requis');
  }

  const [cashierResult] = await pool.query(
    'INSERT INTO restaurant_cashiers (nom, statut) VALUES (?, "OUVERT")',
    [nom]
  );
  const cashierId = cashierResult.insertId;

  const [sessionResult] = await pool.query(
    'INSERT INTO restaurant_sessions (cashier_id, user_id, fond_initial, ouverture_at) VALUES (?, ?, ?, NOW())',
    [cashierId, user_id, fond_initial]
  );

  return created(res, { cashier_id: cashierId, session_id: sessionResult.insertId });
}

async function closeCashierHandler(req, res) {
  const { session_id, fond_final } = req.body;
  if (!session_id || fond_final === undefined) {
    throw ApiError.badRequest('session_id et fond_final sont requis');
  }

  const [result] = await pool.query(
    'UPDATE restaurant_sessions SET fond_final = ?, fermeture_at = NOW() WHERE id = ? AND fermeture_at IS NULL',
    [fond_final, session_id]
  );
  if (result.affectedRows === 0) throw ApiError.notFound('Session non trouvée ou déjà fermée');

  await pool.query(
    'UPDATE restaurant_cashiers SET statut = "FERME" WHERE id = (SELECT cashier_id FROM restaurant_sessions WHERE id = ?)',
    [session_id]
  );

  return ok(res, { message: 'Session fermée' });
}

async function cashierStatusHandler(req, res) {
  const [cashiers] = await pool.query(
    `SELECT c.*, 
            (SELECT s.id FROM restaurant_sessions s WHERE s.cashier_id = c.id AND s.fermeture_at IS NULL LIMIT 1) as current_session_id,
            (SELECT s.user_id FROM restaurant_sessions s WHERE s.cashier_id = c.id AND s.fermeture_at IS NULL LIMIT 1) as current_user_id
     FROM restaurant_cashiers c`
  );
  return ok(res, cashiers);
}

async function processPaymentHandler(req, res) {
  await resto.ensureRestaurantSchema();
  console.debug('[restaurant] processPaymentHandler body:', JSON.stringify(req.body));
  let { order_id, montant, moyen_paiement, client_id } = req.body;
  if (!order_id) {
    throw ApiError.badRequest('order_id est requis');
  }
  const paymentMethod = moyen_paiement || 'ESPECES';

  const result = await withTransaction(async (conn) => {
    const [[orderRow]] = await conn.query(
      'SELECT id, client_id, table_id, montant_total, statut FROM orders WHERE id = ? LIMIT 1 FOR UPDATE',
      [order_id]
    );
    if (!orderRow) throw ApiError.notFound(`Commande #${order_id} introuvable`);

    const [[existingPayment]] = await conn.query(
      'SELECT id, montant FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1',
      [order_id]
    );
    if (existingPayment) {
      return { payment_id: existingPayment.id, montant: Number(existingPayment.montant || 0), alreadyPaid: true };
    }

    const finalMontant = Number(montant || orderRow.montant_total || 0);
    const finalClientId = client_id || orderRow.client_id || null;
    if (finalMontant <= 0) {
      throw ApiError.badRequest(`Le montant de la commande #${order_id} est invalide (${finalMontant})`);
    }

    const [paymentResult] = await conn.query(
      'INSERT INTO payments (order_id, montant, moyen_paiement, client_id, date_paiement) VALUES (?, ?, ?, ?, NOW())',
      [order_id, finalMontant, paymentMethod, finalClientId]
    );
    await conn.query('UPDATE orders SET statut = "PAYEE" WHERE id = ?', [order_id]);

    if (orderRow.table_id) {
      await conn.query('UPDATE tables_restaurant SET statut = "LIBRE" WHERE id = ?', [orderRow.table_id]);
    }

    await conn.query(
      `INSERT INTO financial_transactions
         (client_id, module, type_flux, montant, reference_id, description, statut_sync, created_at)
       VALUES (?, 'RESTAURANT', 'ENTREE', ?, ?, ?, 'SYNCED', NOW())`,
      [finalClientId, finalMontant, order_id, `Paiement commande restaurant #${order_id}`]
    );
    return { payment_id: paymentResult.insertId, montant: finalMontant, alreadyPaid: false };
  });

  return created(res, result);
}

async function billToRoomHandler(req, res) {
  const { order_id, room_id } = req.body;
  if (!order_id || !room_id) {
    throw ApiError.badRequest('order_id et room_id sont requis');
  }

  const [result] = await pool.query(
    `INSERT INTO invoices (client_id, montant_total, statut) VALUES (
      (SELECT r.client_id FROM stays s JOIN reservations r ON r.id = s.reservation_id WHERE r.room_id = ? AND s.checkout_at IS NULL LIMIT 1),
      (SELECT montant_total FROM orders WHERE id = ?),
      "EMISE"
    )`,
    [room_id, order_id]
  );

  await pool.query(
    'UPDATE orders SET statut = "FACTURE" WHERE id = ?',
    [order_id]
  );

  return created(res, { invoice_id: result.insertId });
}

async function statsHandler(req, res) {
  const { date_debut, date_fin } = req.query;
  if (!date_debut || !date_fin) {
    throw ApiError.badRequest('date_debut et date_fin sont requis');
  }

  const [[ordersStats]] = await pool.query(
    `SELECT COUNT(*) as total_orders, SUM(montant_total) as total_revenue
     FROM orders
     WHERE created_at BETWEEN ? AND ?`,
    [date_debut, date_fin]
  );

  const [[paymentsStats]] = await pool.query(
    `SELECT COUNT(*) as total_payments, SUM(montant) as total_collected 
     FROM payments 
     WHERE date_paiement BETWEEN ? AND ?`,
    [date_debut, date_fin]
  );

  return ok(res, {
    orders: ordersStats,
    payments: paymentsStats
  });
}

async function historyTotalHandler(req, res) {
  await resto.ensureRestaurantSchema();
  const { date_debut, date_fin } = req.query;
  if (!date_debut || !date_fin) {
    throw ApiError.badRequest('date_debut et date_fin sont requis');
  }

  const [[history]] = await pool.query(
    `SELECT COUNT(*) AS total_payments, COALESCE(SUM(p.montant), 0) AS total_collected
     FROM payments p
     INNER JOIN orders o ON o.id = p.order_id
     WHERE o.source_module = 'RESTAURANT'
       AND p.date_paiement >= ?
       AND p.date_paiement < DATE_ADD(?, INTERVAL 1 DAY)`,
    [`${date_debut} 00:00:00`, date_fin]
  );

  const [paymentRows] = await pool.query(
    `SELECT p.id AS payment_id, p.date_paiement, p.montant, p.moyen_paiement,
            o.id AS order_id, t.numero AS table_numero,
            oi.id AS item_id, oi.quantite, oi.prix_unitaire,
            pr.nom AS product_nom, c.nom AS category_nom
     FROM payments p
     INNER JOIN orders o ON o.id = p.order_id
     LEFT JOIN tables_restaurant t ON t.id = o.table_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products pr ON pr.id = oi.product_id
     LEFT JOIN categories c ON c.id = pr.category_id
     WHERE o.source_module = 'RESTAURANT'
       AND p.date_paiement >= ?
       AND p.date_paiement < DATE_ADD(?, INTERVAL 1 DAY)
     ORDER BY p.date_paiement DESC, p.id DESC, oi.id`,
    [`${date_debut} 00:00:00`, date_fin]
  );
  const paymentById = new Map();
  for (const row of paymentRows) {
    let payment = paymentById.get(row.payment_id);
    if (!payment) {
      payment = {
        payment_id: row.payment_id,
        order_id: row.order_id,
        date_paiement: row.date_paiement,
        montant: Number(row.montant || 0),
        moyen_paiement: row.moyen_paiement,
        table_numero: row.table_numero,
        items: [],
      };
      paymentById.set(row.payment_id, payment);
    }
    if (row.item_id !== null) {
      payment.items.push({
        id: row.item_id,
        quantite: Number(row.quantite || 0),
        prix_unitaire: Number(row.prix_unitaire || 0),
        product_nom: row.product_nom || `Article #${row.item_id}`,
        category_nom: row.category_nom,
      });
    }
  }

  return ok(res, {
    total_payments: Number(history.total_payments || 0),
    total_collected: Number(history.total_collected || 0),
    paid_orders: Array.from(paymentById.values()),
  });
}

async function consumeRestaurantPortionHandler(req, res, next) {
  try {
    const { product_id, location_id, portion_size, portion_unit, reference_id } = req.body;

    if (!product_id || !location_id || portion_size === undefined) {
      throw ApiError.badRequest('product_id, location_id et portion_size sont requis');
    }

    if (isNaN(portion_size) || Number(portion_size) <= 0) {
      throw ApiError.badRequest('La portion doit être un nombre positif');
    }

    const result = await stock.consumePortion({
      productId: product_id,
      locationId: location_id,
      portionSize: Number(portion_size),
      portionUnit: portion_unit || 'g',
      referenceId: reference_id || null,
      sourceModule: 'RESTAURANT',
    });

    return created(res, result);
  } catch (err) {
    next(err);
  }
}

async function closeAllRestaurantOrdersHandler(req, res) {
  const { order_ids } = req.body || {};
  if (order_ids !== undefined && !Array.isArray(order_ids)) {
    throw ApiError.badRequest('order_ids doit être un tableau');
  }
  const result = await resto.closeAllRestaurantOrders(order_ids || []);
  return ok(res, result);
}

const listRestaurantPurchasesHandler = getRestaurantPurchasesHandler;
const restaurantPurchaseDetailHandler = getRestaurantPurchaseByIdHandler;

module.exports = {
  getRestaurantReportHandler, saveRestaurantReportHandler,
  getProductHistoryHandler,
  tablesCrud, ordersCrud, orderItemsCrud, cashiersCrud, sessionsCrud, productsCrud,
  createOrderHandler, updateOrderHandler, orderDetailHandler, orderInvoiceHandler, ordersInProgressHandler,
  orderInvoicePdfHandler, closeAllRestaurantOrdersHandler,
  restaurantStockHandler, restaurantStockMovementsHandler,
  adjustRestaurantStockHandler, removeRestaurantStockHandler, consumeRestaurantPortionHandler,
  getRestaurantPurchasesHandler, getRestaurantPurchaseByIdHandler,
  listRestaurantPurchasesHandler, restaurantPurchaseDetailHandler, createRestaurantPurchaseHandler,
  menuHandler, updateOrderStatusHandler, historyTotalHandler, openCashierHandler, closeCashierHandler,
  cashierStatusHandler, processPaymentHandler, billToRoomHandler, statsHandler,
};