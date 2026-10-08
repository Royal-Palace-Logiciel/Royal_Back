// controllers/controllerFactory.js
//
// Génère les 5 handlers Express standards (list, getOne, create, update, remove)
// à partir d'un modèle produit par createCrudModel(). Réduit la duplication
// pour toutes les tables qui n'ont pas de règle métier particulière.

const ApiError = require('../utils/ApiError');
const { ok, created, noContent } = require('../utils/apiResponse');
const { getPagination, getSort, buildWhere } = require('../utils/queryHelpers');

function createCrudController(model, { filterable = [], view } = {}) {
  const render = view || ((row) => row);

  async function list(req, res) {
    const { page, limit, offset } = getPagination(req.query);
    const orderBy = getSort(req.query, model.sortableCols, model.pk);
    const { sql: whereSql, values: whereValues } = buildWhere(req.query, filterable);

    const [rows, total] = await Promise.all([
      model.findAll({ whereSql, whereValues, orderBy, limit, offset }),
      model.count({ whereSql, whereValues }),
    ]);

    return ok(res, rows.map(render), { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  function getId(req) {
    return req.params[model.pk] || req.params.id || Object.values(req.params)[0];
  }

  async function getOne(req, res) {
    const id = getId(req);
    const row = await model.findById(id);
    if (!row) throw ApiError.notFound(`${model.table} #${id} introuvable`);
    return ok(res, render(row));
  }

  async function create(req, res) {
    const row = await model.create(req.body);
    return created(res, render(row));
  }

  async function update(req, res) {
    const id = getId(req);
    const existing = await model.findById(id);
    if (!existing) throw ApiError.notFound(`${model.table} #${id} introuvable`);
    try {
      const row = await model.update(id, req.body);
      return ok(res, render(row));
    } catch (error) {
      console.error(`Update error for ${model.table} #${id}:`, error);
      throw error;
    }
  }

  async function remove(req, res) {
    const id = getId(req);
    const existing = await model.findById(id);
    if (!existing) throw ApiError.notFound(`${model.table} #${id} introuvable`);
    await model.remove(id);
    return noContent(res);
  }

  return { list, getOne, create, update, remove };
}

module.exports = { createCrudController };
