const { pool, withTransaction } = require('../config/db');
const { createCrudModel } = require('./crudFactory');
const { workingDays, monthBounds, calculateNet, calculateRawNet, statutoryContributions, deductionTotal, DEDUCTION_FREQUENCIES, DAILY_RATE_CONTRACT, IN_WORKFORCE_SQL, DEPARTURE_STATUSES } = require('../utils/hr');

const employeeFields = ['user_id', 'matricule', 'first_name', 'last_name', 'photo_url', 'birth_date', 'phone', 'address', 'email', 'identification_number', 'department', 'position', 'joined_at', 'contract_type', 'contract_end_date', 'qualification', 'cnaps_number', 'dependents', 'salary', 'prime', 'pourboire', 'cnaps', 'ostie', 'irsa', 'status', 'departure_date', 'departure_reason'];
const employees = createCrudModel({ table: 'rh_employees', fields: employeeFields, sortable: ['id', 'matricule', 'first_name', 'last_name', 'department', 'position', 'joined_at', 'contract_type', 'salary', 'status', 'created_at'] });
const evaluations = createCrudModel({ table: 'rh_evaluations', fields: ['employee_id', 'period', 'reviewer_id', 'score', 'comment', 'evaluation_date', 'status'], sortable: ['id', 'employee_id', 'period', 'score', 'evaluation_date', 'status', 'created_at'] });

// --- Lien avec les comptes utilisateurs (gestion d'accès) ---------------------

async function findEmployeeByUserId(userId) {
  await syncCurrentLeaveStatus();
  const [rows] = await pool.query('SELECT * FROM rh_employees WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0] || null;
}

// Appelée à la création d'un compte utilisateur : relie une fiche RH existante
// (même email, pas encore liée) ou crée une nouvelle fiche RH minimale.
// Ne jette jamais d'erreur bloquante : la création du compte utilisateur ne doit
// jamais échouer à cause du module RH.
async function createOrLinkEmployeeFromUser(user) {
  if (user.email) {
    const [rows] = await pool.query('SELECT id FROM rh_employees WHERE email = ? AND user_id IS NULL LIMIT 1', [user.email]);
    if (rows[0]) {
      await pool.query('UPDATE rh_employees SET user_id = ? WHERE id = ?', [user.id_admin, rows[0].id]);
      return employees.findById(rows[0].id);
    }
  }
  const matricule = `HDA-${Date.now().toString().slice(-8)}`;
  const row = await employees.create({
    user_id: user.id_admin,
    matricule,
    first_name: user.prenom,
    last_name: user.nom,
    email: user.email || null,
    department: 'Administration',
    position: user.role || 'Employé',
    joined_at: new Date().toISOString().slice(0, 10),
    contract_type: 'CDI',
    salary: 0,
    status: 'ACTIF',
  });
  await pool.query('INSERT IGNORE INTO rh_leave_balances (employee_id, annual_accrued, annual_used) VALUES (?, 24, 0)', [row.id]);
  return row;
}

async function syncCurrentLeaveStatus(connection = pool) {
  // Employment status is not used to record daily absence. A current approved leave
  // alone sets EN_CONGE; expired leave is reset on every HR read/action.
  await connection.query(`UPDATE rh_employees e SET status = 'ACTIF'
    WHERE e.status = 'EN_CONGE' AND NOT EXISTS (
      SELECT 1 FROM rh_leave_requests l WHERE l.employee_id = e.id AND l.status = 'APPROUVE'
      AND CURDATE() BETWEEN l.start_date AND l.end_date
    )`);
  await connection.query(`UPDATE rh_employees e SET status = 'EN_CONGE'
    WHERE e.status = 'ACTIF' AND EXISTS (
      SELECT 1 FROM rh_leave_requests l WHERE l.employee_id = e.id AND l.status = 'APPROUVE'
      AND CURDATE() BETWEEN l.start_date AND l.end_date
    )`);
}

function paginationMeta(page, limit, total) { return { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) }; }

// Jours de présence (PRESENT ou RETARD) d'un employé sur le mois courant. Le compteur
// est recalculé à partir des pointages du mois : il repart donc de 0 chaque 1er du mois
// sans tâche planifiée ni remise à zéro manuelle.
const PRESENCE_DAYS_THIS_MONTH_SQL = (alias) => `(SELECT COUNT(*) FROM rh_attendance a WHERE a.employee_id = ${alias}.id AND a.status IN ('PRESENT', 'RETARD') AND a.attendance_date BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01') AND LAST_DAY(CURDATE()))`;

// Nombre de signatures faciales enregistrées (0 = visage non enrôlé).
const FACE_SAMPLES_SQL = (alias) => `(SELECT COUNT(*) FROM rh_face_descriptors f WHERE f.employee_id = ${alias}.id)`;

async function countPresenceDays(conn, employeeId, start, end) {
  const [[row]] = await conn.query(`SELECT COUNT(*) total FROM rh_attendance WHERE employee_id=? AND status IN ('PRESENT', 'RETARD') AND attendance_date BETWEEN ? AND ?`, [employeeId, start, end]);
  return Number(row.total || 0);
}

async function listEmployees({ search, department, status, contractType, page = 1, limit = 20, offset = 0, orderBy = '`last_name` ASC, `first_name` ASC' } = {}) {
  await syncCurrentLeaveStatus();
  const c = []; const values = [];
  if (search) { c.push('(first_name LIKE ? OR last_name LIKE ? OR position LIKE ? OR matricule LIKE ?)'); const term = `%${search}%`; values.push(term, term, term, term); }
  if (department) { c.push('department = ?'); values.push(department); }
  if (status) { c.push('status = ?'); values.push(status); }
  if (contractType) { c.push('contract_type = ?'); values.push(contractType); }
  const where = c.length ? `WHERE ${c.join(' AND ')}` : '';
  const [[count]] = await pool.query(`SELECT COUNT(*) total FROM rh_employees e ${where}`, values);
  const [rows] = await pool.query(`SELECT e.*, ${PRESENCE_DAYS_THIS_MONTH_SQL('e')} presence_days, ${FACE_SAMPLES_SQL('e')} face_samples FROM rh_employees e ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...values, limit, offset]);
  // Compteurs d'effectif sur tout le registre, indépendamment des filtres affichés.
  const [statusRows] = await pool.query('SELECT status, COUNT(*) total FROM rh_employees GROUP BY status');
  const statusCounts = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.total)]));
  const grandTotal = statusRows.reduce((sum, r) => sum + Number(r.total), 0);
  return { rows, meta: { ...paginationMeta(page, limit, count.total), statusCounts, grandTotal } };
}

async function findEmployeeWithPresence(id) {
  const [[row]] = await pool.query(`SELECT e.*, ${PRESENCE_DAYS_THIS_MONTH_SQL('e')} presence_days, ${FACE_SAMPLES_SQL('e')} face_samples FROM rh_employees e WHERE e.id = ?`, [id]);
  return row || null;
}

async function dashboard() {
  await syncCurrentLeaveStatus();
  const departed = DEPARTURE_STATUSES.map((s) => `'${s}'`).join(', ');
  // Masse salariale estimée : un prestataire compte pour taux journalier × jours de présence du mois.
  const [[summary]] = await pool.query(`SELECT COUNT(*) total, SUM(status = 'ACTIF') active, SUM(status = 'EN_CONGE') on_leave, SUM(status = 'SUSPENDU') suspended, SUM(status IN (${departed})) departed,
    COALESCE(SUM(CASE WHEN ${IN_WORKFORCE_SQL('e')} THEN (CASE WHEN contract_type = ? THEN salary * ${PRESENCE_DAYS_THIS_MONTH_SQL('e')} ELSE salary END) + prime + pourboire ELSE 0 END), 0) payroll_total FROM rh_employees e`, [DAILY_RATE_CONTRACT]);
  const [[pendingLeave]] = await pool.query(`SELECT COUNT(*) total FROM rh_leave_requests WHERE status = 'EN_ATTENTE'`);
  const [[absent]] = await pool.query(`SELECT COUNT(*) total FROM rh_attendance WHERE attendance_date = CURDATE() AND status = 'ABSENT'`);
  const [departments] = await pool.query(`SELECT department, COUNT(*) total FROM rh_employees WHERE ${IN_WORKFORCE_SQL()} GROUP BY department ORDER BY total DESC, department ASC`);
  const [expiringContracts] = await pool.query(`SELECT id, matricule, first_name, last_name, contract_end_date FROM rh_employees WHERE ${IN_WORKFORCE_SQL()} AND contract_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY) ORDER BY contract_end_date ASC`);
  return { total: Number(summary.total || 0), active: Number(summary.active || 0), absent: Number(absent.total || 0), onLeave: Number(summary.on_leave || 0), suspended: Number(summary.suspended || 0), departed: Number(summary.departed || 0), payrollTotal: Number(summary.payroll_total || 0), pendingLeave: Number(pendingLeave.total || 0), departments, expiringContracts };
}

async function listLeaveRequests({ page = 1, limit = 20, offset = 0, employeeId, status } = {}) {
  const c = []; const values = [];
  if (employeeId) { c.push('l.employee_id = ?'); values.push(employeeId); }
  if (status) { c.push('l.status = ?'); values.push(status); }
  const where = c.length ? `WHERE ${c.join(' AND ')}` : '';
  const [[count]] = await pool.query(`SELECT COUNT(*) total FROM rh_leave_requests l ${where}`, values);
  const [rows] = await pool.query(`SELECT l.*, e.first_name, e.last_name, e.department, b.annual_accrued, b.annual_used, (b.annual_accrued - b.annual_used) annual_remaining FROM rh_leave_requests l JOIN rh_employees e ON e.id=l.employee_id LEFT JOIN rh_leave_balances b ON b.employee_id=e.id ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);
  return { rows, meta: paginationMeta(page, limit, count.total) };
}

async function createLeaveRequest(data) {
  const days = workingDays(data.start_date, data.end_date);
  if (!days) throw new Error('Un congé doit contenir au moins un jour ouvré');
  return withTransaction(async (conn) => {
    const [[employee]] = await conn.query('SELECT id, status FROM rh_employees WHERE id = ? FOR UPDATE', [data.employee_id]);
    if (!employee || DEPARTURE_STATUSES.includes(employee.status)) return null;
    const [[overlap]] = await conn.query(`SELECT id FROM rh_leave_requests WHERE employee_id=? AND status='APPROUVE' AND start_date <= ? AND end_date >= ? LIMIT 1`, [data.employee_id, data.end_date, data.start_date]);
    if (overlap) { const err = new Error('OVERLAP'); throw err; }
    const [result] = await conn.query(`INSERT INTO rh_leave_requests (employee_id, leave_type, start_date, end_date, days, reason, status) VALUES (?, ?, ?, ?, ?, ?, 'EN_ATTENTE')`, [data.employee_id, data.leave_type, data.start_date, data.end_date, days, data.reason || null]);
    return (await conn.query('SELECT * FROM rh_leave_requests WHERE id=?', [result.insertId]))[0][0];
  });
}

async function updateLeaveStatus(id, status, reviewedBy) {
  return withTransaction(async (conn) => {
    const [[leave]] = await conn.query('SELECT * FROM rh_leave_requests WHERE id=? FOR UPDATE', [id]);
    if (!leave) return null;
    if (leave.status !== 'EN_ATTENTE' && status !== leave.status) { const err = new Error('LEAVE_FINAL'); throw err; }
    if (status === 'APPROUVE') {
      const [[overlap]] = await conn.query(`SELECT id FROM rh_leave_requests WHERE employee_id=? AND id<>? AND status='APPROUVE' AND start_date <= ? AND end_date >= ? LIMIT 1`, [leave.employee_id, id, leave.end_date, leave.start_date]);
      if (overlap) { const err = new Error('OVERLAP'); throw err; }
      if (leave.leave_type === 'ANNUEL') {
        await conn.query('INSERT IGNORE INTO rh_leave_balances (employee_id) VALUES (?)', [leave.employee_id]);
        const [[balance]] = await conn.query('SELECT annual_accrued, annual_used FROM rh_leave_balances WHERE employee_id=? FOR UPDATE', [leave.employee_id]);
        if (Number(balance.annual_accrued) - Number(balance.annual_used) < Number(leave.days)) { const err = new Error('INSUFFICIENT_BALANCE'); throw err; }
        await conn.query('UPDATE rh_leave_balances SET annual_used=annual_used+? WHERE employee_id=?', [leave.days, leave.employee_id]);
      }
    }
    await conn.query('UPDATE rh_leave_requests SET status=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?', [status, reviewedBy || null, id]);
    await syncCurrentLeaveStatus(conn);
    return (await conn.query('SELECT * FROM rh_leave_requests WHERE id=?', [id]))[0][0];
  });
}

// Un congé approuvé retire l'employé du suivi des présences sur toute sa durée :
// il n'est ni attendu ni pointable ces jours-là, donc ne doit pas compter comme absent.
const NOT_ON_APPROVED_LEAVE = `NOT EXISTS (SELECT 1 FROM rh_leave_requests l WHERE l.employee_id = e.id AND l.status = 'APPROUVE' AND ? BETWEEN l.start_date AND l.end_date)`;

async function listAttendance({ date, page = 1, limit = 20, offset = 0 } = {}) {
  await syncCurrentLeaveStatus();
  const attendanceDate = date || new Date().toISOString().slice(0, 10);
  const [[count]] = await pool.query(`SELECT COUNT(*) total FROM rh_employees e WHERE ${IN_WORKFORCE_SQL('e')} AND ${NOT_ON_APPROVED_LEAVE}`, [attendanceDate]);
  const [rows] = await pool.query(`SELECT e.id employee_id, e.matricule, e.first_name, e.last_name, e.department, a.id attendance_id, a.attendance_date, a.check_in, a.check_out,
    a.check_in_method, a.check_out_method, (a.check_in_photo IS NOT NULL) has_check_in_photo, (a.check_out_photo IS NOT NULL) has_check_out_photo,
    CASE WHEN a.id IS NOT NULL THEN a.status WHEN ? < CURDATE() THEN 'ABSENT' ELSE 'NON_POINTE' END attendance_status, a.notes
    FROM rh_employees e LEFT JOIN rh_attendance a ON a.employee_id=e.id AND a.attendance_date=? WHERE ${IN_WORKFORCE_SQL('e')} AND ${NOT_ON_APPROVED_LEAVE} ORDER BY e.last_name, e.first_name LIMIT ? OFFSET ?`, [attendanceDate, attendanceDate, attendanceDate, limit, offset]);
  return { rows, meta: paginationMeta(page, limit, count.total) };
}

// method : MANUEL (bouton dans la liste) ou VISAGE (reconnaissance faciale, avec photo).
async function checkIn(employeeId, notes, { method = 'MANUEL', photo = null } = {}) {
  // Remet d'abord à ACTIF les employés dont le congé est terminé : le pointage
  // redevient possible dès le lendemain de la fin du congé, sans réactivation manuelle.
  await syncCurrentLeaveStatus();
  return withTransaction(async (conn) => {
    const [[employee]] = await conn.query(`SELECT id FROM rh_employees WHERE id=? AND status = 'ACTIF' FOR UPDATE`, [employeeId]);
    if (!employee) return null;
    const [[existing]] = await conn.query('SELECT * FROM rh_attendance WHERE employee_id=? AND attendance_date=CURDATE() FOR UPDATE', [employeeId]);
    if (existing?.check_in) { const err = new Error('ALREADY_CHECKED_IN'); throw err; }
    const [[time]] = await conn.query('SELECT TIME(NOW()) value');
    const status = time.value > '08:15:00' ? 'RETARD' : 'PRESENT';
    if (existing) await conn.query('UPDATE rh_attendance SET check_in=?, check_out=NULL, check_in_method=?, check_out_method=NULL, check_in_photo=?, check_out_photo=NULL, status=?, notes=? WHERE id=?', [time.value, method, photo, status, notes || null, existing.id]);
    else await conn.query('INSERT INTO rh_attendance (employee_id, attendance_date, check_in, check_in_method, check_in_photo, status, notes) VALUES (?, CURDATE(), ?, ?, ?, ?, ?)', [employeeId, time.value, method, photo, status, notes || null]);
    return (await conn.query('SELECT * FROM rh_attendance WHERE employee_id=? AND attendance_date=CURDATE()', [employeeId]))[0][0];
  });
}

async function checkOut(employeeId, notes, { method = 'MANUEL', photo = null } = {}) {
  const [[entry]] = await pool.query('SELECT * FROM rh_attendance WHERE employee_id=? AND attendance_date=CURDATE()', [employeeId]);
  if (!entry?.check_in) { const err = new Error('NO_CHECK_IN'); throw err; }
  if (entry.check_out) { const err = new Error('ALREADY_CHECKED_OUT'); throw err; }
  await pool.query('UPDATE rh_attendance SET check_out=TIME(NOW()), check_out_method=?, check_out_photo=?, notes=COALESCE(?, notes) WHERE id=?', [method, photo, notes || null, entry.id]);
  return (await pool.query('SELECT * FROM rh_attendance WHERE id=?', [entry.id]))[0][0];
}

// Pointage du jour d'un employé + secondes écoulées depuis l'entrée (anti double-passage).
async function todayAttendance(employeeId) {
  const [[row]] = await pool.query('SELECT *, TIMESTAMPDIFF(SECOND, TIMESTAMP(attendance_date, check_in), NOW()) seconds_since_check_in FROM rh_attendance WHERE employee_id=? AND attendance_date=CURDATE()', [employeeId]);
  return row || null;
}

async function findAttendancePhoto(attendanceId, kind) {
  const column = kind === 'out' ? 'check_out_photo' : 'check_in_photo';
  const [[row]] = await pool.query(`SELECT ${column} photo FROM rh_attendance WHERE id=?`, [attendanceId]);
  return row?.photo || null;
}

// --- Signatures faciales ---------------------------------------------------------

// Signatures des employés pointables (actifs), pour la comparaison côté serveur.
async function listFaceSamples() {
  const [rows] = await pool.query(`SELECT f.employee_id, f.descriptor FROM rh_face_descriptors f JOIN rh_employees e ON e.id = f.employee_id WHERE e.status = 'ACTIF'`);
  return rows.map((r) => ({ employee_id: r.employee_id, descriptor: typeof r.descriptor === 'string' ? JSON.parse(r.descriptor) : r.descriptor }));
}

// Remplace l'enrôlement d'un employé et enregistre la date de son accord.
async function replaceFaceDescriptors(employeeId, descriptors, userId) {
  return withTransaction(async (conn) => {
    await conn.query('DELETE FROM rh_face_descriptors WHERE employee_id=?', [employeeId]);
    for (const descriptor of descriptors) await conn.query('INSERT INTO rh_face_descriptors (employee_id, descriptor, created_by) VALUES (?, ?, ?)', [employeeId, JSON.stringify(descriptor), userId || null]);
    await conn.query('UPDATE rh_employees SET face_consent_at = NOW() WHERE id=?', [employeeId]);
    return descriptors.length;
  });
}

async function deleteFaceDescriptors(employeeId) {
  return withTransaction(async (conn) => {
    const [result] = await conn.query('DELETE FROM rh_face_descriptors WHERE employee_id=?', [employeeId]);
    await conn.query('UPDATE rh_employees SET face_consent_at = NULL WHERE id=?', [employeeId]);
    return result.affectedRows;
  });
}

async function listMyAttendance(employeeId, { page = 1, limit = 31, offset = 0 } = {}) {
  const [[count]] = await pool.query(`SELECT COUNT(*) total FROM rh_attendance WHERE employee_id=?`, [employeeId]);
  const [rows] = await pool.query(`SELECT * FROM rh_attendance WHERE employee_id=? ORDER BY attendance_date DESC LIMIT ? OFFSET ?`, [employeeId, limit, offset]);
  return { rows, meta: paginationMeta(page, limit, count.total) };
}

// Jours d'absence d'un mois : pointages ABSENT + jours ouvrés de congé sans solde approuvé.
async function countAbsenceDays(conn, employeeId, start, end) {
  const [[days]] = await conn.query(`SELECT COUNT(*) total FROM (SELECT attendance_date d FROM rh_attendance WHERE employee_id=? AND attendance_date BETWEEN ? AND ? AND status='ABSENT' UNION SELECT d FROM (SELECT DATE_ADD(start_date, INTERVAL seq.n DAY) d FROM rh_leave_requests JOIN (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30) seq WHERE leave_type='SANS_SOLDE' AND status='APPROUVE' AND DATE_ADD(start_date, INTERVAL seq.n DAY) <= end_date AND DATE_ADD(start_date, INTERVAL seq.n DAY) BETWEEN ? AND ? AND DAYOFWEEK(DATE_ADD(start_date, INTERVAL seq.n DAY)) NOT IN (1,7)) unpaid) missing`, [employeeId, start, end, start, end]);
  return Number(days.total || 0);
}

async function payrollAdjustments(conn, employeeId, start, end, baseSalary) {
  const absenceDays = await countAbsenceDays(conn, employeeId, start, end);
  const businessDays = workingDays(start, end) || 1;
  return Math.round((Number(baseSalary) / businessDays) * absenceDays * 100) / 100;
}

// Données du bulletin de paie : ligne de paie + fiche employé + jours d'absence du mois.
async function findPayslip(period, employeeId) {
  const bounds = monthBounds(period);
  const [[line]] = await pool.query(`SELECT p.*, e.matricule, e.first_name, e.last_name, e.position, e.qualification, e.cnaps_number, e.dependents, e.address, e.contract_type
    FROM rh_payroll p JOIN rh_employees e ON e.id = p.employee_id WHERE p.period_month = ? AND p.employee_id = ?`, [bounds.period, employeeId]);
  if (!line) return null;
  const absenceDays = line.contract_type === DAILY_RATE_CONTRACT ? 0 : await countAbsenceDays(pool, employeeId, bounds.start, bounds.end);
  return { ...line, absence_days: absenceDays, bounds };
}

// Calcule (ou recalcule) la ligne de paie brouillon d'un employé pour un mois.
// - Prestataire : base = taux journalier × jours de présence du mois, pas de retenue d'absence.
// - Autres contrats : base = salaire mensuel, moins absences et congés sans solde.
// - La prime et le pourboire de la fiche alimentent la ligne à sa création. Sur une ligne
//   existante, les montants ajustés à la main sont conservés, sauf si syncPrime /
//   syncPourboire est demandé (la valeur de la fiche vient de changer).
// - La retenue saisie (mensuelle ou hebdomadaire × semaines du mois) s'ajoute aux absences.
// - CNAPS / OSTIE / IRSA sont figées sur la ligne à partir de la fiche.
async function upsertDraftPayrollLine(conn, employee, bounds, { onlyExisting = false, syncPrime = false, syncPourboire = false } = {}) {
  const [[existing]] = await conn.query('SELECT * FROM rh_payroll WHERE employee_id=? AND period_month=? FOR UPDATE', [employee.id, bounds.period]);
  if (existing && existing.status !== 'BROUILLON') return null;
  if (!existing && onlyExisting) return null;
  const isDailyRate = employee.contract_type === DAILY_RATE_CONTRACT;
  const presenceDays = isDailyRate ? await countPresenceDays(conn, employee.id, bounds.start, bounds.end) : null;
  const baseSalary = isDailyRate ? Math.round(Number(employee.salary) * presenceDays * 100) / 100 : Number(employee.salary);
  const absenceDeduction = isDailyRate ? 0 : await payrollAdjustments(conn, employee.id, bounds.start, bounds.end, employee.salary);
  const contributions = statutoryContributions(employee);
  // Keep HR-entered deductions separate from computed unpaid-leave/absence
  // deductions so running “generate” twice is idempotent.
  const manualDeductions = existing ? deductionTotal(existing.deduction_amount, existing.deduction_frequency, bounds.period) : 0;
  const bonuses = existing && !syncPrime ? Number(existing.bonuses || 0) : Number(employee.prime || 0);
  const pourboire = existing && !syncPourboire ? Number(existing.pourboire || 0) : Number(employee.pourboire || 0);
  const values = { ...(existing || { overtime_amount: 0, allowances: 0, advances: 0 }), base_salary: baseSalary, bonuses, pourboire, absence_deductions: absenceDeduction, deductions: manualDeductions + absenceDeduction, ...contributions, presence_days: presenceDays };
  values.net_amount = calculateNet(values);
  if (existing) {
    await conn.query('UPDATE rh_payroll SET base_salary=?, bonuses=?, pourboire=?, deductions=?, absence_deductions=?, cnaps=?, ostie=?, irsa=?, presence_days=?, net_amount=? WHERE id=?', [values.base_salary, values.bonuses, values.pourboire, values.deductions, values.absence_deductions, values.cnaps, values.ostie, values.irsa, values.presence_days, values.net_amount, existing.id]);
  } else {
    await conn.query('INSERT INTO rh_payroll (employee_id, period_month, base_salary, bonuses, pourboire, deductions, absence_deductions, cnaps, ostie, irsa, presence_days, net_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "BROUILLON")', [employee.id, bounds.period, values.base_salary, values.bonuses, values.pourboire, values.deductions, values.absence_deductions, values.cnaps, values.ostie, values.irsa, values.presence_days, values.net_amount]);
  }
  return values;
}

async function generatePayroll(period) {
  const bounds = monthBounds(period);
  await withTransaction(async (conn) => {
    const [staff] = await conn.query(`SELECT id, salary, prime, pourboire, irsa, contract_type FROM rh_employees WHERE ${IN_WORKFORCE_SQL()}`);
    for (const employee of staff) await upsertDraftPayrollLine(conn, employee, bounds);
  });
  // Relu hors transaction (connexion séparée du pool) : le commit ci-dessus doit
  // être visible, sinon cette lecture retombe sur l'état d'avant génération.
  return listPayroll({ period: bounds.period, page: 1, limit: 100 });
}

async function listPayroll({ period, page = 1, limit = 20, offset = 0 } = {}) {
  const bounds = monthBounds(period || new Date().toISOString().slice(0, 7));
  const [[count]] = await pool.query(`SELECT COUNT(*) total FROM rh_payroll WHERE period_month=?`, [bounds.period]);
  const [rows] = await pool.query(`SELECT p.*, e.matricule, e.first_name, e.last_name, e.department, e.contract_type FROM rh_payroll p JOIN rh_employees e ON e.id=p.employee_id WHERE p.period_month=? ORDER BY e.last_name,e.first_name LIMIT ? OFFSET ?`, [bounds.period, limit, offset]);
  return { rows, meta: paginationMeta(page, limit, count.total), period: bounds.period };
}

async function updatePayroll(id, data) {
  const [[row]] = await pool.query('SELECT * FROM rh_payroll WHERE id=?', [id]);
  if (!row) return null;
  if (row.status !== 'BROUILLON') { const err = new Error('PAYROLL_LOCKED'); throw err; }
  const allowed = ['overtime_amount', 'bonuses', 'pourboire', 'allowances', 'advances', 'deduction_amount'];
  const values = { ...row };
  for (const key of allowed) {
    if (data[key] === undefined) continue;
    if (!Number.isFinite(Number(data[key])) || Number(data[key]) < 0) { const err = new Error('INVALID_PAYROLL_AMOUNT'); throw err; }
    values[key] = Number(data[key]);
  }
  if (data.deduction_frequency !== undefined) {
    if (!DEDUCTION_FREQUENCIES.includes(data.deduction_frequency)) { const err = new Error('INVALID_DEDUCTION_FREQUENCY'); throw err; }
    values.deduction_frequency = data.deduction_frequency;
  }
  if (data.deduction_reason !== undefined) values.deduction_reason = String(data.deduction_reason || '').trim().slice(0, 255) || null;
  // Total déduit = retenue saisie (× semaines si hebdomadaire) + absences calculées.
  values.deductions = deductionTotal(values.deduction_amount, values.deduction_frequency, row.period_month) + Number(row.absence_deductions || 0);
  // Refus plutôt que plancher à 0 : sinon le bulletin ne s'additionne plus et le
  // dépassement (avance non récupérée) disparaît sans que personne ne le voie.
  const rawNet = calculateRawNet(values);
  if (rawNet < 0) { const err = new Error('NEGATIVE_NET'); err.shortfall = -rawNet; throw err; }
  values.net_amount = rawNet;
  await pool.query(`UPDATE rh_payroll SET overtime_amount=?, bonuses=?, pourboire=?, allowances=?, advances=?, deduction_amount=?, deduction_frequency=?, deduction_reason=?, deductions=?, net_amount=? WHERE id=?`, [values.overtime_amount, values.bonuses, values.pourboire, values.allowances, values.advances, values.deduction_amount, values.deduction_frequency, values.deduction_reason, values.deductions, values.net_amount, id]);
  return (await pool.query('SELECT * FROM rh_payroll WHERE id=?', [id]))[0][0];
}

// Après modification d'une fiche, recalcule ses lignes de paie encore en brouillon
// (salaire, taux journalier, contrat, cotisations, prime, pourboire).
async function syncEmployeePayrollSnapshot(employee, previous) {
  const syncPrime = Number(previous?.prime || 0) !== Number(employee.prime || 0);
  const syncPourboire = Number(previous?.pourboire || 0) !== Number(employee.pourboire || 0);
  return withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT period_month FROM rh_payroll WHERE employee_id=? AND status = "BROUILLON"', [employee.id]);
    const payloads = [];
    for (const row of rows) {
      const line = await upsertDraftPayrollLine(conn, employee, monthBounds(row.period_month), { onlyExisting: true, syncPrime, syncPourboire });
      if (line) payloads.push(line);
    }
    return payloads;
  });
}

async function transitionPayroll(id, status) {
  const [[row]] = await pool.query('SELECT * FROM rh_payroll WHERE id=?', [id]);
  if (!row) return null;
  const valid = (row.status === 'BROUILLON' && status === 'VALIDE') || (row.status === 'VALIDE' && status === 'PAYE');
  if (!valid) { const err = new Error('INVALID_PAYROLL_TRANSITION'); throw err; }
  // Lignes ajustées avant ce contrôle : on ne valide pas une paie dont le net serait négatif.
  const rawNet = calculateRawNet(row);
  if (status === 'VALIDE' && rawNet < 0) { const err = new Error('NEGATIVE_NET'); err.shortfall = -rawNet; throw err; }
  await pool.query('UPDATE rh_payroll SET status=?, paid_at=CASE WHEN ?="PAYE" THEN NOW() ELSE paid_at END WHERE id=?', [status, status, id]);
  return (await pool.query('SELECT * FROM rh_payroll WHERE id=?', [id]))[0][0];
}

async function deletePayroll(id) {
  const [[row]] = await pool.query('SELECT * FROM rh_payroll WHERE id=?', [id]);
  if (!row) return null;
  if (row.status === 'PAYE') { const err = new Error('PAYROLL_PAID_DELETE'); throw err; }
  await pool.query('DELETE FROM rh_payroll WHERE id=?', [id]);
  return row;
}

// Suppression définitive d'un employé et de tout son historique RH, dans une seule
// transaction (les clés étrangères sont en RESTRICT pour protéger l'historique).
// Retourne l'employé supprimé et les fichiers de pièces jointes à effacer du disque.
async function deleteEmployee(id) {
  return withTransaction(async (conn) => {
    const [[employee]] = await conn.query('SELECT * FROM rh_employees WHERE id=? FOR UPDATE', [id]);
    if (!employee) return null;
    const [documents] = await conn.query('SELECT stored_name FROM rh_employee_documents WHERE employee_id=?', [id]);
    const [photos] = await conn.query('SELECT check_in_photo, check_out_photo FROM rh_attendance WHERE employee_id=?', [id]);
    for (const table of ['rh_employee_documents', 'rh_evaluations', 'rh_leave_balances', 'rh_leave_requests', 'rh_attendance', 'rh_payroll']) {
      await conn.query(`DELETE FROM ${table} WHERE employee_id=?`, [id]);
    }
    await conn.query('DELETE FROM rh_employees WHERE id=?', [id]);
    // Les signatures faciales partent avec la fiche (ON DELETE CASCADE).
    return { employee, storedNames: documents.map((doc) => doc.stored_name), attendancePhotos: photos.flatMap((p) => [p.check_in_photo, p.check_out_photo]).filter(Boolean) };
  });
}

// --- Pièces jointes du dossier employé ------------------------------------------

async function listDocuments(employeeId) {
  const [rows] = await pool.query('SELECT id, employee_id, doc_type, original_name, mime_type, file_size, created_at FROM rh_employee_documents WHERE employee_id=? ORDER BY created_at DESC', [employeeId]);
  return rows;
}

async function createDocument({ employeeId, docType, storedName, originalName, mimeType, fileSize, uploadedBy }) {
  const [result] = await pool.query('INSERT INTO rh_employee_documents (employee_id, doc_type, stored_name, original_name, mime_type, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [employeeId, docType, storedName, originalName, mimeType, fileSize, uploadedBy || null]);
  const [[row]] = await pool.query('SELECT id, employee_id, doc_type, original_name, mime_type, file_size, created_at FROM rh_employee_documents WHERE id=?', [result.insertId]);
  return row;
}

async function findDocument(employeeId, documentId) {
  const [[row]] = await pool.query('SELECT * FROM rh_employee_documents WHERE id=? AND employee_id=?', [documentId, employeeId]);
  return row || null;
}

async function deleteDocument(documentId) {
  await pool.query('DELETE FROM rh_employee_documents WHERE id=?', [documentId]);
}

// --- Évaluation : évaluations filtrées par date + budget salarial par département ---

async function listEvaluations({ from, to, employeeId, status, page = 1, limit = 20, offset = 0 } = {}) {
  const c = []; const values = [];
  if (from) { c.push('v.evaluation_date >= ?'); values.push(from); }
  if (to) { c.push('v.evaluation_date <= ?'); values.push(to); }
  if (employeeId) { c.push('v.employee_id = ?'); values.push(employeeId); }
  if (status) { c.push('v.status = ?'); values.push(status); }
  const where = c.length ? `WHERE ${c.join(' AND ')}` : '';
  const [[count]] = await pool.query(`SELECT COUNT(*) total FROM rh_evaluations v ${where}`, values);
  const [rows] = await pool.query(`SELECT v.*, e.first_name, e.last_name, e.matricule, e.department FROM rh_evaluations v JOIN rh_employees e ON e.id = v.employee_id ${where} ORDER BY v.evaluation_date DESC, v.id DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);
  return { rows, meta: paginationMeta(page, limit, count.total) };
}

// Le budget est mensuel : sur une plage de dates, il est multiplié par le nombre de mois
// couverts. Le réalisé est la masse salariale brute (base + HS + primes + pourboires + indemnités)
// des lignes de paie des mois couverts, rattachées au département actuel de l'employé.
async function listDepartmentBudgets({ from, to, departments }) {
  const start = monthBounds(from).start;
  const end = monthBounds(to).end;
  if (end < start) throw new Error('La date de fin doit être postérieure à la date de début');
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + (Number(to.slice(5, 7)) - Number(from.slice(5, 7))) + 1;
  const [budgets] = await pool.query('SELECT department, monthly_budget FROM rh_department_budgets');
  // Le bouton « Payer » n'existe plus : une paie validée est considérée comme payée.
  const [actuals] = await pool.query(`SELECT e.department, SUM(p.base_salary + p.overtime_amount + p.bonuses + p.pourboire + p.allowances) gross, SUM(p.net_amount) net,
    SUM(CASE WHEN p.status = 'BROUILLON' THEN p.net_amount ELSE 0 END) to_pay, SUM(CASE WHEN p.status IN ('VALIDE', 'PAYE') THEN p.net_amount ELSE 0 END) paid
    FROM rh_payroll p JOIN rh_employees e ON e.id = p.employee_id WHERE p.period_month BETWEEN ? AND ? GROUP BY e.department`, [start, end]);
  const [headcounts] = await pool.query(`SELECT department, COUNT(*) total FROM rh_employees WHERE ${IN_WORKFORCE_SQL()} GROUP BY department`);
  const byDept = (rows, key) => Object.fromEntries(rows.map((r) => [r.department, r[key]]));
  const budgetMap = byDept(budgets, 'monthly_budget'); const grossMap = byDept(actuals, 'gross'); const netMap = byDept(actuals, 'net'); const toPayMap = byDept(actuals, 'to_pay'); const paidMap = byDept(actuals, 'paid'); const headMap = byDept(headcounts, 'total');
  const rows = departments.map((department) => {
    const monthlyBudget = Number(budgetMap[department] || 0);
    const budget = monthlyBudget * months;
    const actual = Number(grossMap[department] || 0);
    return { department, headcount: Number(headMap[department] || 0), monthly_budget: monthlyBudget, budget, actual, net: Number(netMap[department] || 0), to_pay: Number(toPayMap[department] || 0), paid: Number(paidMap[department] || 0), remaining: budget - actual, usage: budget > 0 ? Math.round((actual / budget) * 1000) / 10 : null };
  });
  return { rows, months, from: start, to: end };
}

async function setDepartmentBudget(department, monthlyBudget, userId) {
  await pool.query('INSERT INTO rh_department_budgets (department, monthly_budget, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE monthly_budget = VALUES(monthly_budget), updated_by = VALUES(updated_by)', [department, monthlyBudget, userId || null]);
  const [[row]] = await pool.query('SELECT department, monthly_budget FROM rh_department_budgets WHERE department=?', [department]);
  return { department: row.department, monthly_budget: Number(row.monthly_budget) };
}

module.exports = { todayAttendance, findAttendancePhoto, listFaceSamples, replaceFaceDescriptors, deleteFaceDescriptors, findPayslip, listDocuments, createDocument, findDocument, deleteDocument, listEvaluations, listDepartmentBudgets, setDepartmentBudget, findEmployeeWithPresence, employees, evaluations, listEmployees, dashboard, listLeaveRequests, createLeaveRequest, updateLeaveStatus, listAttendance, checkIn, checkOut, listMyAttendance, generatePayroll, listPayroll, updatePayroll, syncEmployeePayrollSnapshot, transitionPayroll, deletePayroll, deleteEmployee, monthBounds, findEmployeeByUserId, createOrLinkEmployeeFromUser };
