const test = require('node:test');
const assert = require('node:assert/strict');
const { workingDays, calculateNet, calculateRawNet, monthBounds, statutoryContributions, weeksInMonth, deductionTotal, formatAmount, numberToFrenchWords, amountInWords } = require('../utils/hr');

test('payslip amounts are written like the Diamond Club model', () => {
  assert.equal(formatAmount(350000), '350 000,00');
  assert.equal(formatAmount(3500), '3 500,00');
  assert.equal(amountInWords(220000), 'Deux cent vingt mille Ariary');
});

test('French number words follow the traditional spelling rules', () => {
  const cases = { 0: 'zéro', 21: 'vingt et un', 71: 'soixante et onze', 80: 'quatre-vingts', 81: 'quatre-vingt-un', 99: 'quatre-vingt-dix-neuf', 200: 'deux cents', 201: 'deux cent un', 1000: 'mille', 80000: 'quatre-vingt mille', 200000: 'deux cent mille', 1200000: 'un million deux cent mille', 2000000: 'deux millions', 1350750: 'un million trois cent cinquante mille sept cent cinquante' };
  for (const [n, words] of Object.entries(cases)) assert.equal(numberToFrenchWords(Number(n)), words, n);
});

test('weekly deduction is multiplied by the number of Mondays in the month', () => {
  assert.equal(weeksInMonth('2026-09'), 4); // lundis 7, 14, 21, 28
  assert.equal(weeksInMonth('2026-08'), 5); // lundis 3, 10, 17, 24, 31
  assert.equal(deductionTotal(10000, 'HEBDOMADAIRE', '2026-08-01'), 50000);
  assert.equal(deductionTotal(10000, 'MENSUEL', '2026-08-01'), 10000);
});

test('face matching accepts a close face, rejects strangers and look-alikes', () => {
  const { findBestMatch, isDescriptor } = require('../utils/face');
  const face = (v) => Array.from({ length: 128 }, (_, i) => (i === 0 ? v : 0));
  const samples = [{ employee_id: 1, descriptor: face(0) }, { employee_id: 1, descriptor: face(0.1) }, { employee_id: 2, descriptor: face(1) }];
  assert.deepEqual(findBestMatch(face(0.05), samples), { employeeId: 1, distance: 0.05 });
  assert.deepEqual(findBestMatch(face(3), samples), { reason: 'UNKNOWN' });
  assert.deepEqual(findBestMatch(face(0.5), [{ employee_id: 1, descriptor: face(0.1) }, { employee_id: 2, descriptor: face(0.88) }]), { reason: 'AMBIGUOUS' });
  assert.equal(isDescriptor(face(0)), true);
  assert.equal(isDescriptor([1, 2, 3]), false);
});

test('raw net exposes the shortfall that the floored net hides (Dubois, sept. 2026)', () => {
  const line = { base_salary: 0, overtime_amount: 36777, allowances: 44554, advances: 565665, deductions: 54546 };
  assert.equal(calculateRawNet(line), -538880);
  assert.equal(calculateNet(line), 0);
});

test('tips (pourboire) are added to the net amount', () => {
  assert.equal(calculateNet({ base_salary: 500000, pourboire: 20000, deductions: 10000 }), 510000);
});
const rhController = require('../controllers/rhController');

test('leave workflow counts only working days and rejects weekends', () => {
  assert.equal(workingDays('2026-09-11', '2026-09-14'), 2);
  assert.equal(workingDays('2026-09-12', '2026-09-13'), 0);
});

test('payroll net amount is calculated server-side from allowed components', () => {
  assert.equal(calculateNet({ base_salary: 1000000, overtime_amount: 50000, bonuses: 10000, allowances: 5000, advances: 20000, deductions: 15000 }), 1030000);
  assert.equal(calculateNet({ base_salary: 100, deductions: 200 }), 0);
  assert.deepEqual(monthBounds('2026-09'), { period: '2026-09-01', start: '2026-09-01', end: '2026-09-30' });
});

test('CNAPS and OSTIE are 1 % of salary for CDI/CDD only, IRSA is kept as entered', () => {
  assert.deepEqual(statutoryContributions({ contract_type: 'CDI', salary: 1250000, irsa: 30000 }), { cnaps: 12500, ostie: 12500, irsa: 30000 });
  assert.deepEqual(statutoryContributions({ contract_type: 'CDD', salary: 999, irsa: 0 }), { cnaps: 9.99, ostie: 9.99, irsa: 0 });
  assert.deepEqual(statutoryContributions({ contract_type: 'Prestataire', salary: 50000, irsa: 1000 }), { cnaps: 0, ostie: 0, irsa: 0 });
  assert.deepEqual(statutoryContributions({ contract_type: 'Stagiaire', salary: 300000 }), { cnaps: 0, ostie: 0, irsa: 0 });
});

test('payroll net amount subtracts CNAPS, OSTIE and IRSA', () => {
  assert.equal(calculateNet({ base_salary: 1000000, bonuses: 50000, advances: 100000, cnaps: 10000, ostie: 10000, irsa: 25000 }), 905000);
});

test('employee creation rejects an unknown contract type before database access', async () => {
  await assert.rejects(
    () => rhController.createEmployee({ body: { first_name: 'A', last_name: 'B', department: 'Casino', position: 'Croupier', joined_at: '2026-09-01', contract_type: 'Stage' } }, {}),
    /Type de contrat invalide/
  );
});

test('HR controller exposes employee, leave and payroll route handlers', () => {
  for (const handler of ['createEmployee', 'updateEmployee', 'offboardEmployee', 'leaveCreate', 'leaveStatus', 'payrollGenerate', 'payrollUpdate', 'payrollStatus', 'documentUpload', 'documentDownload', 'documentDelete', 'budgetList', 'budgetUpdate', 'evaluationList']) assert.equal(typeof rhController[handler], 'function');
});

test('employee creation route rejects an incomplete personnel file before database access', async () => {
  await assert.rejects(
    () => rhController.createEmployee({ body: {} }, {}),
    /first_name, last_name, department, position et joined_at sont obligatoires/
  );
});
