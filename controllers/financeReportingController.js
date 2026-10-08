// controllers/financeReportingController.js
const reporting = require('../models/financeReportingModel');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/apiResponse');

// GET /api/finance/reports/monthly?department=hotel&year=2026
async function monthlyBreakdownHandler(req, res) {
  const { department, year } = req.query;
  try {
    const rows = await reporting.monthlyDepartmentBreakdown({
      department: department || undefined,
      year: year !== undefined ? Number(year) : undefined,
    });
    return ok(res, rows);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
}

// GET /api/finance/reports/monthly/:department/:year/:month
async function departmentMonthHandler(req, res) {
  const { department, year, month } = req.params;
  try {
    const row = await reporting.departmentMonthSummary({ department, year, month });
    return ok(res, row);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
}

async function periodBreakdownHandler(req, res) {
  const { period, department, startDate, endDate } = req.query;
  const isValidDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!['daily', 'weekly'].includes(period)) throw ApiError.badRequest('period doit être daily ou weekly');
  if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
    throw ApiError.badRequest('startDate et endDate doivent être des dates valides au format AAAA-MM-JJ');
  }
  try {
    const rows = await reporting.periodDepartmentBreakdown({
      period,
      department: department || undefined,
      startDate,
      endDate,
    });
    return ok(res, rows);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
}

module.exports = { monthlyBreakdownHandler, departmentMonthHandler, periodBreakdownHandler };
