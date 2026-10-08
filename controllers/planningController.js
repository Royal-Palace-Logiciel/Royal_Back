const planning = require('../models/planningModel');
const { ok } = require('../utils/apiResponse');

async function getDailyPlanning(req, res) {
  return ok(res, await planning.getDailyPlanning(req.query.date, req.query.category));
}

async function saveDailyPlanning(req, res) {
  const { date, category, assignments } = req.body || {};
  return ok(res, await planning.saveDailyPlanning({ date, category, assignments, userId: req.user?.id_admin }));
}

module.exports = { getDailyPlanning, saveDailyPlanning };
