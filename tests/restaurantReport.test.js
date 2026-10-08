const assert = require('node:assert/strict');
const test = require('node:test');
const { pool } = require('../config/db');

const originalQuery = pool.query;

test('restaurant reports are created, saved, updated and read from their dedicated table', async () => {
  const queries = [];
  const rowsByDate = new Map();
  pool.query = async (sql, params = []) => {
    queries.push({ sql, params });
    if (sql.includes('CREATE TABLE IF NOT EXISTS restaurant_daily_reports')) return [[]];
    if (sql.startsWith('INSERT INTO restaurant_daily_reports')) {
      const [date, personnel, c1, mvola, tpe, np, credit, depense, bouteille, pourboire, freeItems, freeTotal, tablesOccupied, observations, createdBy] = params;
      rowsByDate.set(date, {
        id: 1,
        report_date: date,
        personnel_present: personnel,
        financial_c1: c1,
        financial_mvola: mvola,
        financial_tpe: tpe,
        financial_np: np,
        financial_credit: credit,
        financial_depense: depense,
        financial_bouteille: bouteille,
        financial_pourboire: pourboire,
        free_items: freeItems,
        free_total: freeTotal,
        tables_occupied: tablesOccupied,
        observations,
        created_by: createdBy,
        created_at: '2026-01-01 10:00:00',
        updated_at: '2026-01-01 10:00:00',
      });
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('FROM restaurant_daily_reports')) return [[rowsByDate.get(params[0])].filter(Boolean)];
    throw new Error(`Unexpected query: ${sql}`);
  };

  const modelPath = require.resolve('../models/restaurantReport.model');
  delete require.cache[modelPath];
  const reportModel = require(modelPath);

  try {
    const first = await reportModel.saveRestaurantReport({
      reportDate: '2026-01-01',
      personnel: { gerante: 'Mme A' },
      manual: { depense: '1000' },
      metrics: { c1: 5000 },
      createdBy: 7,
    });
    assert.equal(first.reportDate, '2026-01-01');
    assert.equal(first.metrics.c1, 5000);

    const updated = await reportModel.saveRestaurantReport({
      reportDate: '2026-01-01',
      personnel: { gerante: 'Mme B' },
      manual: { depense: '2000' },
      metrics: { c1: 9000 },
      createdBy: 8,
    });
    assert.equal(updated.personnel.gerante, 'Mme B');
    assert.equal(updated.metrics.c1, 9000);

    const loaded = await reportModel.getRestaurantReport('2026-01-01');
    assert.equal(loaded.manual.depense, '2000');
    assert.equal(loaded.createdBy, 8);
    assert.ok(queries.some(({ sql }) => sql.includes('CREATE TABLE IF NOT EXISTS restaurant_daily_reports')));
    assert.ok(queries.filter(({ sql }) => sql.startsWith('INSERT INTO restaurant_daily_reports')).length >= 2);
    assert.ok(queries.every(({ sql }) => !sql.includes('bar_daily_reports')));
  } finally {
    pool.query = originalQuery;
    delete require.cache[modelPath];
  }
});
