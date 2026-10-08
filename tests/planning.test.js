const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../config/db');

test('Planning migration defines the date/category persistence table', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../Database/migrations/add_daily_staff_planning.sql'), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS daily_staff_planning/);
  assert.match(sql, /assignments JSON NOT NULL/);
  assert.match(sql, /UNIQUE KEY uq_daily_staff_planning_date_category \(planning_date, category\)/);
});

const originalQuery = pool.query;

test('daily planning is saved and loaded by date and category', async () => {
  const queries = [];
  const rowsByKey = new Map();
  pool.query = async (sql, params = []) => {
    queries.push({ sql, params });
    if (sql.includes('CREATE TABLE IF NOT EXISTS daily_staff_planning')) return [[]];
    if (sql.includes('INSERT INTO daily_staff_planning')) {
      const [date, category, assignments] = params;
      rowsByKey.set(`${date}:${category}`, JSON.parse(assignments));
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('FROM daily_staff_planning')) {
      const [date, category] = params;
      const assignments = rowsByKey.get(`${date}:${category}`);
      return [[assignments ? { assignments } : undefined].filter(Boolean)];
    }
    throw new Error(`Unexpected query: ${sql}`);
  };

  const modelPath = require.resolve('../models/planningModel');
  delete require.cache[modelPath];
  const planning = require(modelPath);

  try {
    const saved = await planning.saveDailyPlanning({
      date: '2026-09-25',
      category: 'Videur',
      assignments: [
        { slot: 1, employeeId: 4, employeeName: 'Alex Martin', schedule: '19:00 – 00:00' },
        { slot: 2, employeeId: null, employeeName: 'Sam Dupont', schedule: 'OFF' },
      ],
      userId: 7,
    });
    assert.deepEqual(saved, {
      date: '2026-09-25',
      category: 'Videur',
      assignments: [
        { slot: 1, employeeId: 4, employeeName: 'Alex Martin', schedule: '19:00 – 00:00' },
        { slot: 2, employeeId: null, employeeName: 'Sam Dupont', schedule: 'OFF' },
      ],
    });
    const defaultSchedule = await planning.saveDailyPlanning({
      date: '2026-09-26',
      category: 'Videur',
      assignments: [
        { slot: 1, employeeName: 'Sam Dupont' },
        { slot: 2, employeeName: 'Lina Martin', schedule: '' },
      ],
    });
    assert.equal(defaultSchedule.assignments[0].schedule, '00:00 – 00:00');
    assert.equal(defaultSchedule.assignments[1].schedule, '');
    rowsByKey.set('2026-09-28:Videur', [{ slot: 1, employeeId: null, employeeName: 'Sam Dupont', schedule: '19:05 – 02:30' }]);
    assert.deepEqual(await planning.getDailyPlanning('2026-09-28', 'Videur'), {
      date: '2026-09-28', category: 'Videur',
      assignments: [{ slot: 1, employeeId: null, employeeName: 'Sam Dupont', schedule: '19:05 – 02:30' }],
    });
    await assert.rejects(planning.saveDailyPlanning({
      date: '2026-09-27',
      category: 'Videur',
      assignments: [{ slot: 1, employeeName: 'Sam Dupont', schedule: '25:00 – 00:00' }],
    }), { status: 400 });
    assert.deepEqual(await planning.getDailyPlanning('2026-09-25', 'Bar'), {
      date: '2026-09-25', category: 'Bar', assignments: [],
    });
    await assert.rejects(planning.saveDailyPlanning({ date: '2026-02-31', category: 'Videur', assignments: [] }), { status: 400 });
    await assert.rejects(planning.getDailyPlanning('2026-09-25', 'Inconnu'), { status: 400 });
    assert.ok(queries.some(({ sql }) => sql.includes('CREATE TABLE IF NOT EXISTS daily_staff_planning')));
    assert.equal(queries.filter(({ sql }) => sql.includes('INSERT INTO daily_staff_planning')).length, 2);
  } finally {
    pool.query = originalQuery;
    delete require.cache[modelPath];
  }
});
