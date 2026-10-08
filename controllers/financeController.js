// controllers/financeController.js
const finance = require('../models/financeModel');
const { createCrudController } = require('./controllerFactory');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/apiResponse');

const { getPagination, getSort, buildWhere } = require('../utils/queryHelpers');

const invoicesCrud = createCrudController(finance.Invoices, { filterable: ['client_id', 'statut'] });
const invoiceItemsCrud = createCrudController(finance.InvoiceItems, { filterable: ['invoice_id'] });
const paymentsCrud = createCrudController(finance.Payments, { filterable: ['client_id', 'invoice_id'] });
const financialTransactionsCrud = createCrudController(finance.FinancialTransactions, { filterable: ['client_id', 'module', 'type_flux'] });

async function listFinancialTransactionsHandler(req, res) {
  const { page, limit, offset } = getPagination(req.query);
  const orderBy = getSort(req.query, finance.FinancialTransactions.sortableCols, finance.FinancialTransactions.pk);
  const { sql: whereSql, values: whereValues } = buildWhere(req.query, ['client_id', 'module', 'type_flux']);

  const includeClosed = req.query.include_closed === 'true' || req.query.include_closed === '1';
  let finalWhereSql = whereSql;
  if (!includeClosed) {
    if (finalWhereSql) {
      finalWhereSql += ' AND (cloturee = 0 OR cloturee IS NULL)';
    } else {
      finalWhereSql = 'WHERE (cloturee = 0 OR cloturee IS NULL)';
    }
  }

  const findTransactions = ['HOTEL', 'HEBERGEMENT'].includes(String(req.query.module || '').toUpperCase())
    ? finance.findFinancialTransactionsWithDetails
    : finance.FinancialTransactions.findAll;
  const [rows, total] = await Promise.all([
    findTransactions({ whereSql: finalWhereSql, whereValues, orderBy, limit, offset }),
    finance.FinancialTransactions.count({ whereSql: finalWhereSql, whereValues }),
  ]);

  return ok(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
}

async function createInvoiceHandler(req, res) {
  const { client_id, items } = req.body;
  if (!items || !items.length) throw ApiError.badRequest('items requis (au moins une ligne)');
  const invoice = await finance.createInvoiceWithItems({ clientId: client_id, items });
  return created(res, invoice);
}

async function invoiceDetailHandler(req, res) {
  const invoice = await finance.invoiceWithItemsAndPayments(req.params.id);
  if (!invoice) throw ApiError.notFound(`Facture #${req.params.id} introuvable`);
  return ok(res, invoice);
}

async function recordPaymentHandler(req, res) {
  const { client_id, invoice_id, montant, moyen_paiement } = req.body;
  if (!invoice_id || !montant) throw ApiError.badRequest('invoice_id et montant sont requis');
  try {
    const result = await finance.recordPayment({ clientId: client_id, invoiceId: invoice_id, montant, moyenPaiement: moyen_paiement });
    return created(res, result);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
}

async function clientStatementHandler(req, res) {
  const rows = await finance.clientFinancialStatement(req.params.clientId);
  return ok(res, rows);
}

async function financialSummaryHandler(req, res) {
  return ok(res, await finance.financialSummary());
}

async function createFinancialTransactionHandler(req, res) {
  const { client_id, module, type_flux, montant, reference_id, description } = req.body;
  const normalizedModule = String(module || '').trim().toUpperCase();
  const normalizedType = String(type_flux || '').trim().toUpperCase();
  const amount = Number(montant);

  if (!normalizedModule || !['ENTREE', 'SORTIE'].includes(normalizedType) || !Number.isFinite(amount) || amount <= 0) {
    throw ApiError.badRequest('module, type_flux (ENTREE ou SORTIE) et un montant positif sont requis');
  }

  const row = await finance.FinancialTransactions.create({
    client_id: client_id || null,
    module: normalizedModule,
    type_flux: normalizedType,
    montant: amount,
    reference_id: reference_id || null,
    description: String(description || '').trim() || 'Opération financière manuelle',
  });
  return created(res, row);
}

async function closeFinancialTransactionsHandler(req, res) {
  const { module, transaction_ids } = req.body;
  const normalizedModule = String(module || '').trim().toUpperCase();
  if (!normalizedModule || !Array.isArray(transaction_ids) || transaction_ids.length === 0) {
    throw ApiError.badRequest('module et transaction_ids (au moins une transaction) sont requis');
  }
  const result = await finance.closeFinancialTransactions({ module: normalizedModule, ids: transaction_ids });
  return ok(res, result);
}

module.exports = {
  invoicesCrud, invoiceItemsCrud, paymentsCrud, financialTransactionsCrud,
  createInvoiceHandler, invoiceDetailHandler, recordPaymentHandler, clientStatementHandler,
  financialSummaryHandler, createFinancialTransactionHandler, listFinancialTransactionsHandler,
  closeFinancialTransactionsHandler,
};
