const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const ApiError = require('../utils/ApiError');
const { ok, created, noContent } = require('../utils/apiResponse');
const { getPagination, getSort } = require('../utils/queryHelpers');
const { EMPLOYMENT_STATUSES, DEPARTURE_STATUSES, CONTRACT_TYPES, DAILY_RATE_CONTRACT, DOCUMENT_TYPES, LEAVE_TYPES, LEAVE_STATUSES, PAYROLL_STATUSES, DEPARTMENTS, statutoryContributions, weeksInMonth, formatAmount, amountInWords } = require('../utils/hr');
const crypto = require('crypto');
const { RH_DOCUMENTS_DIR, RH_ATTENDANCE_PHOTOS_DIR } = require('../middlewares/upload');
const { isDescriptor, findBestMatch, MIN_ENROLL_SAMPLES, MAX_ENROLL_SAMPLES } = require('../utils/face');
const model = require('../models/rhModel');
const { logAction } = require('../models/adminModel');

const numericFields = ['salary', 'prime', 'pourboire', 'irsa', 'dependents'];
const renderEmployee = (row) => ({ ...row, salary: Number(row.salary || 0), prime: Number(row.prime || 0), pourboire: Number(row.pourboire || 0), dependents: Number(row.dependents || 0), cnaps: Number(row.cnaps || 0), ostie: Number(row.ostie || 0), irsa: Number(row.irsa || 0), ...(row.presence_days !== undefined ? { presence_days: Number(row.presence_days || 0) } : {}), ...(row.face_samples !== undefined ? { face_samples: Number(row.face_samples || 0) } : {}), status: String(row.status || '').toUpperCase() });
const audit = (req, action, entite, entiteId, payload) => logAction({ userId: req.user?.id_admin, action, entite, entiteId, payload }).catch((err) => console.error('Audit RH impossible:', err.message));
function normalized(body) {
  const out = { ...(body || {}) };
  for (const field of numericFields) if (out[field] !== undefined) out[field] = out[field] === '' || out[field] === null ? 0 : Number(out[field]);
  // CNAPS et OSTIE sont toujours recalculées côté serveur (withContributions), jamais reprises du client.
  delete out.cnaps; delete out.ostie; delete out.presence_days;
  if (out.status !== undefined) out.status = String(out.status).toUpperCase();
  return out;
}
function assertEmployee(body, partial = false) {
  if (!partial && ['first_name', 'last_name', 'department', 'position', 'joined_at'].some((key) => !body[key])) throw ApiError.badRequest('first_name, last_name, department, position et joined_at sont obligatoires');
  if (body.department && !DEPARTMENTS.includes(body.department)) throw ApiError.badRequest('Département non référencé');
  if (body.contract_type && !CONTRACT_TYPES.includes(body.contract_type)) throw ApiError.badRequest(`Type de contrat invalide (${CONTRACT_TYPES.join(', ')})`);
  if (body.status && !EMPLOYMENT_STATUSES.includes(body.status)) throw ApiError.badRequest('Statut d’emploi invalide');
  for (const [field, label] of [['salary', 'Salaire'], ['prime', 'Prime'], ['pourboire', 'Pourboire'], ['irsa', 'IRSA']]) {
    if (body[field] !== undefined && (!Number.isFinite(Number(body[field])) || Number(body[field]) < 0)) throw ApiError.badRequest(`${label} invalide`);
  }
  if (body.dependents !== undefined && (!Number.isInteger(Number(body.dependents)) || Number(body.dependents) < 0 || Number(body.dependents) > 255)) throw ApiError.badRequest('Nombre de personnes à charge invalide');
  if (body.joined_at && body.contract_end_date && body.contract_end_date < body.joined_at) throw ApiError.badRequest('La date de débauche doit être postérieure à la date d’embauche');
}
// Recalcule CNAPS / OSTIE (1 % du salaire) et l'IRSA saisie, selon le contrat résultant
// de la mise à jour (valeurs existantes complétées par le body).
function withContributions(body, existing = {}) {
  const merged = { ...existing, ...body };
  return { ...body, ...statutoryContributions({ contract_type: merged.contract_type, salary: merged.salary, irsa: merged.irsa }) };
}
async function ensureDuplicates(body, excludeId) {
  const checks = [['matricule', 'matricule'], ['email', 'email'], ['identification_number', 'numéro d’identification']];
  for (const [key, label] of checks) {
    if (!body[key]) continue;
    const [rows] = await require('../config/db').pool.query(`SELECT id FROM rh_employees WHERE ${key}=? ${excludeId ? 'AND id<>?' : ''} LIMIT 1`, excludeId ? [body[key], excludeId] : [body[key]]);
    if (rows[0]) throw ApiError.conflict(`Un employé possède déjà ce ${label}`);
  }
}
function page(req) { return getPagination(req.query); }
function businessError(error) {
  const messages = { OVERLAP: 'Cette demande chevauche un congé déjà approuvé', LEAVE_FINAL: 'Une demande traitée ne peut plus être modifiée', INSUFFICIENT_BALANCE: 'Solde de congé annuel insuffisant', ALREADY_CHECKED_IN: 'Employé déjà pointé à l’arrivée', NO_CHECK_IN: 'Aucun pointage d’arrivée pour aujourd’hui', ALREADY_CHECKED_OUT: 'Employé déjà pointé au départ', PAYROLL_LOCKED: 'Une paie validée ou payée ne peut plus être modifiée', INVALID_PAYROLL_TRANSITION: 'Transition de statut de paie invalide', INVALID_PAYROLL_AMOUNT: 'Les montants de paie doivent être positifs', PAYROLL_PAID_DELETE: 'Une paie déjà payée ne peut pas être supprimée', INVALID_DEDUCTION_FREQUENCY: 'Fréquence de retenue invalide (MENSUEL ou HEBDOMADAIRE)' };
  if (error.message === 'NEGATIVE_NET') throw ApiError.badRequest(`Les avances et retenues dépassent la rémunération de ${formatAmount(error.shortfall)} Ar : le net serait négatif. Réduisez l’avance ou la retenue.`);
  if (messages[error.message]) throw ApiError.badRequest(messages[error.message]);
  if (/date|jour ouvré/i.test(error.message || '')) throw ApiError.badRequest(error.message);
  throw error;
}

async function employeesList(req, res) {
  const p = page(req); const orderBy = getSort(req.query, model.employees.sortableCols, 'last_name');
  const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;
  if (status && !EMPLOYMENT_STATUSES.includes(status)) throw ApiError.badRequest('Statut d’emploi invalide');
  if (req.query.contract_type && !CONTRACT_TYPES.includes(req.query.contract_type)) throw ApiError.badRequest('Type de contrat invalide');
  const result = await model.listEmployees({ search: req.query.search, department: req.query.department, status, contractType: req.query.contract_type, ...p, orderBy });
  return ok(res, result.rows.map(renderEmployee), result.meta);
}
async function getEmployee(req, res) { const row = await model.findEmployeeWithPresence(req.params.id); if (!row) throw ApiError.notFound('Employé introuvable'); return ok(res, renderEmployee(row)); }
async function createEmployee(req, res) {
  const body = normalized(req.body); assertEmployee(body); await ensureDuplicates(body);
  if (body.status === 'EN_CONGE') throw ApiError.badRequest('Le statut en congé est défini par une demande approuvée');
  if (DEPARTURE_STATUSES.includes(body.status)) throw ApiError.badRequest('Un nouvel employé ne peut pas être créé avec un statut de sortie');
  const matricule = body.matricule || `HDA-${Date.now().toString().slice(-8)}`;
  const row = await model.employees.create(withContributions({ ...body, matricule, contract_type: body.contract_type || 'CDI', status: body.status || 'ACTIF', departure_reason: undefined, departure_date: undefined }));
  await require('../config/db').pool.query('INSERT INTO rh_leave_balances (employee_id, annual_accrued, annual_used) VALUES (?, 24, 0)', [row.id]);
  await audit(req, 'CREATE_HR_EMPLOYEE', 'rh_employees', row.id, { matricule: row.matricule });
  return created(res, renderEmployee(row));
}
async function updateEmployee(req, res) {
  const existing = await model.employees.findById(req.params.id); if (!existing) throw ApiError.notFound('Employé introuvable');
  const body = normalized(req.body); assertEmployee({ ...body, joined_at: body.joined_at || existing.joined_at, contract_end_date: body.contract_end_date === undefined ? existing.contract_end_date : body.contract_end_date }, true); await ensureDuplicates(body, req.params.id);
  if (body.status === 'SORTI' && existing.status !== 'SORTI') throw ApiError.badRequest('Choisissez le statut Retraité, Renvoyé ou Démissionné avec une raison');
  if (body.status === 'EN_CONGE' && existing.status !== 'EN_CONGE') throw ApiError.badRequest('Le statut en congé est défini automatiquement par une demande approuvée');
  if (body.status && DEPARTURE_STATUSES.includes(body.status)) {
    // Retraité / Renvoyé / Démissionné : raison obligatoire, date de sortie par défaut aujourd'hui.
    const reason = String(body.departure_reason ?? '').trim();
    if (!reason) throw ApiError.badRequest('La raison est obligatoire pour un employé retraité, renvoyé ou démissionnaire');
    body.departure_reason = reason;
    body.departure_date = body.departure_date || existing.departure_date || new Date().toISOString().slice(0, 10);
  } else if (body.status && DEPARTURE_STATUSES.includes(existing.status)) {
    // Réintégration : on efface la sortie précédente.
    body.departure_reason = null; body.departure_date = null;
  } else {
    delete body.departure_reason; delete body.departure_date;
  }
  const row = await model.employees.update(req.params.id, withContributions(body, existing));
  await model.syncEmployeePayrollSnapshot(row, existing);
  const action = body.status && body.status !== existing.status && DEPARTURE_STATUSES.includes(body.status) ? 'OFFBOARD_HR_EMPLOYEE' : Number(row.salary) !== Number(existing.salary) ? 'UPDATE_HR_SALARY' : 'UPDATE_HR_EMPLOYEE';
  await audit(req, action, 'rh_employees', row.id, { fields: Object.keys(body), ...(action === 'OFFBOARD_HR_EMPLOYEE' ? { status: row.status, reason: row.departure_reason } : {}) });
  return ok(res, renderEmployee(await model.findEmployeeWithPresence(row.id)));
}
async function offboardEmployee(req, res) {
  const { reason, departure_date } = req.body || {};
  if (!reason?.trim()) throw ApiError.badRequest('Un motif de sortie est obligatoire');
  const existing = await model.employees.findById(req.params.id); if (!existing) throw ApiError.notFound('Employé introuvable');
  const row = await model.employees.update(req.params.id, { status: 'SORTI', departure_reason: reason.trim(), departure_date: departure_date || new Date().toISOString().slice(0, 10) });
  await audit(req, 'OFFBOARD_HR_EMPLOYEE', 'rh_employees', row.id, { reason: row.departure_reason, departure_date: row.departure_date });
  return ok(res, renderEmployee(row));
}
async function dashboard(req, res) { return ok(res, await model.dashboard()); }
async function leaveList(req, res) { const p = page(req); const result = await model.listLeaveRequests({ ...p, employeeId: req.query.employee_id, status: req.query.status }); return ok(res, result.rows, result.meta); }
async function leaveCreate(req, res) {
  const body = req.body || {}; if (!body.employee_id || !body.start_date || !body.end_date || !LEAVE_TYPES.includes(String(body.leave_type || '').toUpperCase())) throw ApiError.badRequest(`employee_id, dates et leave_type (${LEAVE_TYPES.join(', ')}) sont obligatoires`);
  try { const row = await model.createLeaveRequest({ ...body, leave_type: String(body.leave_type).toUpperCase() }); if (!row) throw ApiError.notFound('Employé actif introuvable'); await audit(req, 'CREATE_HR_LEAVE', 'rh_leave_requests', row.id, { employee_id: row.employee_id, leave_type: row.leave_type }); return created(res, row); } catch (err) { businessError(err); }
}
async function leaveStatus(req, res) {
  const status = String(req.body?.status || '').toUpperCase(); if (!LEAVE_STATUSES.includes(status) || !['APPROUVE', 'REFUSE', 'ANNULE'].includes(status)) throw ApiError.badRequest('Statut de congé invalide');
  try { const row = await model.updateLeaveStatus(req.params.id, status, req.user?.id_admin); if (!row) throw ApiError.notFound('Demande de congé introuvable'); await audit(req, `HR_LEAVE_${status}`, 'rh_leave_requests', row.id, { employee_id: row.employee_id }); return ok(res, row); } catch (err) { businessError(err); }
}
async function attendanceList(req, res) { const p = page(req); const result = await model.listAttendance({ date: req.query.date, ...p }); return ok(res, result.rows, result.meta); }
async function checkIn(req, res) { if (!req.body?.employee_id) throw ApiError.badRequest('employee_id est obligatoire'); try { const row = await model.checkIn(req.body.employee_id, req.body.notes); if (!row) throw ApiError.notFound('Employé actif introuvable'); await audit(req, 'HR_CHECK_IN', 'rh_attendance', row.id, { employee_id: row.employee_id }); return created(res, row); } catch (err) { businessError(err); } }
async function checkOut(req, res) { if (!req.body?.employee_id) throw ApiError.badRequest('employee_id est obligatoire'); try { const row = await model.checkOut(req.body.employee_id, req.body.notes); await audit(req, 'HR_CHECK_OUT', 'rh_attendance', row.id, { employee_id: row.employee_id }); return ok(res, row); } catch (err) { businessError(err); } }
async function payrollList(req, res) { try { const p = page(req); const result = await model.listPayroll({ period: req.query.period, ...p }); return ok(res, result.rows, { ...result.meta, period: result.period }); } catch (err) { businessError(err); } }
async function payrollGenerate(req, res) { try { const result = await model.generatePayroll(req.params.period); await audit(req, 'GENERATE_HR_PAYROLL', 'rh_payroll', null, { period: req.params.period }); return ok(res, result.rows, { ...result.meta, period: result.period }); } catch (err) { businessError(err); } }
async function payrollUpdate(req, res) { try { const row = await model.updatePayroll(req.params.id, req.body || {}); if (!row) throw ApiError.notFound('Ligne de paie introuvable'); await audit(req, 'UPDATE_HR_PAYROLL', 'rh_payroll', row.id, { fields: Object.keys(req.body || {}) }); return ok(res, row); } catch (err) { businessError(err); } }
async function payrollStatus(req, res) { const status = String(req.body?.status || '').toUpperCase(); if (!PAYROLL_STATUSES.includes(status) || status === 'BROUILLON') throw ApiError.badRequest('Statut de paie invalide'); try { const row = await model.transitionPayroll(req.params.id, status); if (!row) throw ApiError.notFound('Ligne de paie introuvable'); await audit(req, `HR_PAYROLL_${status}`, 'rh_payroll', row.id, { employee_id: row.employee_id }); return ok(res, row); } catch (err) { businessError(err); } }
async function payrollDelete(req, res) { try { const row = await model.deletePayroll(req.params.id); if (!row) throw ApiError.notFound('Ligne de paie introuvable'); await audit(req, 'DELETE_HR_PAYROLL', 'rh_payroll', row.id, { employee_id: row.employee_id, period: row.period_month }); return noContent(res); } catch (err) { businessError(err); } }
// En-tête du bulletin (modèle Diamond Club).
const PAYSLIP_COMPANY = { name: 'DIAMOND CLUB', addressLines: ["26, Avenue de l'Indépendance", '101 - ANTANANARIVO'], city: 'Antananarivo' };
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// Correspondance avec le modèle :
// - Rémunération mensuelle globale = base + HS + primes + pourboire
// - Retenue impôt = IRSA · Paiement partiel effectué = avances
// - Retenue divers = retenue saisie + absences · Allocation familiale = allocations
// → Net = globale − CNaPS − OSTIE − impôt − paiement partiel − retenue divers + allocation (= net_amount).
async function payrollPayslip(req, res) {
  let line;
  try { line = await model.findPayslip(req.params.period, req.params.employeeId); } catch (err) { businessError(err); }
  if (!line) throw ApiError.notFound('Bulletin de paie introuvable');
  const [year, month] = line.bounds.start.split('-').map(Number);
  const daysInMonth = Number(line.bounds.end.slice(8, 10));
  const isDailyRate = line.contract_type === DAILY_RATE_CONTRACT;
  const workedDays = isDailyRate ? Number(line.presence_days || 0) : Math.max(0, daysInMonth - line.absence_days);
  const globalPay = Number(line.base_salary) + Number(line.overtime_amount) + Number(line.bonuses) + Number(line.pourboire || 0);
  const weekly = line.deduction_frequency === 'HEBDOMADAIRE' && Number(line.deduction_amount) > 0;
  const deductionNote = [line.deduction_reason, weekly ? `${formatAmount(line.deduction_amount)} × ${weeksInMonth(line.period_month)} sem.` : ''].filter(Boolean).join(', ');
  const today = new Date();

  const safeMatricule = String(line.matricule).replace(/[^\w-]+/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="bulletin-${safeMatricule}-${line.bounds.start.slice(0, 7)}.pdf"`);
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const x = 40; const w = 515; const pad = 5; const top = 40;
  let y = top;
  const rule = (weight = 0.8) => doc.moveTo(x, y).lineTo(x + w, y).lineWidth(weight).stroke();
  // Ligne « libellé ........ valeur » alignée comme le modèle Excel.
  const row = (label, value, { labelFont = 'Helvetica', valueFont = 'Helvetica', size = 9, valueSize = size, height = 15 } = {}) => {
    doc.font(labelFont).fontSize(size).text(label, x + pad, y + (height - size) / 2, { width: w * 0.62, lineBreak: false, ellipsis: true });
    doc.font(valueFont).fontSize(valueSize).text(String(value ?? ''), x + w * 0.35, y + (height - valueSize) / 2, { width: w * 0.65 - pad, align: 'right', lineBreak: false });
    y += height;
  };

  doc.font('Times-Roman').fontSize(20).text(PAYSLIP_COMPANY.name, x + pad, y + 4); y += 28;
  for (const addressLine of PAYSLIP_COMPANY.addressLines) { doc.font('Helvetica-Bold').fontSize(8).text(addressLine, x + pad, y + 2); y += 13; }
  rule();
  doc.font('Helvetica-Bold').fontSize(12).text('BULLETIN DE PAIE', x, y + 4, { width: w, align: 'center' }); y += 20;
  rule();

  doc.font('Helvetica').fontSize(9).text('MOIS DE :', x + pad, y + 3);
  doc.font('Helvetica-Bold').text(MONTHS_FR[month - 1].toUpperCase(), x + 150, y + 3);
  doc.font('Helvetica').text('ANNEE :', x + 300, y + 3);
  doc.font('Helvetica-Bold').text(String(year), x, y + 3, { width: w - pad, align: 'right' });
  y += 15;
  row('Nom et Prénom :', `${line.last_name} ${line.first_name}`.toUpperCase());
  row('Numéro Matricule :', line.matricule);
  row('Fonction :', String(line.position || '').toUpperCase());
  row('Qualification :', line.qualification || '');
  row('N° CNaPS :', line.cnaps_number || '');
  row('Personne en Charge :', Number(line.dependents || 0));
  row('Adresse :', line.address || '');
  row(isDailyRate ? 'Nb de jours de présence dans le mois :' : 'Nb de jours de travail dans le mois :', workedDays);
  row("Nb de jours d'Absence :", line.absence_days);
  rule();

  doc.font('Helvetica-Bold').fontSize(13).text(isDailyRate ? 'Rémunération :' : 'Salaire de base :', x + pad, y + 4);
  doc.font('Helvetica-Bold').fontSize(13).text(formatAmount(line.base_salary), x + 170, y + 4, { width: 130, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(10).text('Ariary', x + 310, y + 6);
  y += 22;
  row('REMUNERATION MENSUELLE GLOBALE FORFAITAIRE :', formatAmount(globalPay), { labelFont: 'Helvetica-Bold', size: 8, valueSize: 10 });
  row('Cotisation CNaPS :', formatAmount(line.cnaps), { valueSize: 10 });
  row('Cotisation OSTIE :', formatAmount(line.ostie), { valueSize: 10 });
  row('Retenue impôt :', formatAmount(line.irsa), { valueSize: 10 });
  row('Paiement Partiel effectué :', formatAmount(line.advances), { valueSize: 10 });
  row(`Retenue divers${deductionNote ? ` (${deductionNote})` : ''} :`, formatAmount(line.deductions), { valueSize: 10 });
  row('Allocation Familiale :', formatAmount(line.allowances), { valueSize: 10 });
  row('Salaire Net à Payer :', formatAmount(line.net_amount), { labelFont: 'Helvetica-Bold', valueFont: 'Helvetica-Bold', size: 13, height: 22 });
  rule();

  y += 18;
  doc.font('Helvetica-BoldOblique').fontSize(10).text('Arrêté à la somme de :', x + pad, y); y += 20;
  doc.font('Helvetica-Bold').fontSize(10).text(amountInWords(line.net_amount), x + pad, y, { width: w - 2 * pad }); y = doc.y + 30;
  doc.font('Helvetica-Bold').fontSize(9).text("L'EMPLOYEUR", x + pad, y, { underline: true });
  doc.font('Helvetica-Bold').fontSize(9).text("L'EMPLOYE", x, y, { width: w - 25, align: 'right', underline: true });
  y += 130; // espace des signatures
  doc.font('Helvetica').fontSize(10).text(`${PAYSLIP_COMPANY.city}, le ${String(today.getDate()).padStart(2, '0')} ${MONTHS_FR[today.getMonth()].replace(/^./, (c) => c.toUpperCase())} ${today.getFullYear()}`, x, y, { width: w, align: 'center' });
  y += 20;
  doc.rect(x, top, w, y - top).lineWidth(1).stroke();
  doc.end();
}
const evaluationsCrud = require('./controllerFactory').createCrudController(model.evaluations, { filterable: ['employee_id', 'status'] });
const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
async function evaluationList(req, res) {
  const { from, to } = req.query;
  if ((from && !isIsoDate(from)) || (to && !isIsoDate(to))) throw ApiError.badRequest('Dates invalides (format YYYY-MM-DD)');
  const result = await model.listEvaluations({ from, to, employeeId: req.query.employee_id, status: req.query.status, ...page(req) });
  return ok(res, result.rows, result.meta);
}
async function budgetList(req, res) {
  const today = new Date().toISOString().slice(0, 10);
  const from = req.query.from || `${today.slice(0, 7)}-01`; const to = req.query.to || today;
  if (!isIsoDate(from) || !isIsoDate(to)) throw ApiError.badRequest('Dates invalides (format YYYY-MM-DD)');
  try { const result = await model.listDepartmentBudgets({ from, to, departments: DEPARTMENTS }); return ok(res, result.rows, { months: result.months, from: result.from, to: result.to }); } catch (err) { businessError(err); }
}
async function budgetUpdate(req, res) {
  const { department } = req.params; const amount = Number(req.body?.monthly_budget);
  if (!DEPARTMENTS.includes(department)) throw ApiError.badRequest('Département non référencé');
  if (!Number.isFinite(amount) || amount < 0) throw ApiError.badRequest('Budget invalide');
  const row = await model.setDepartmentBudget(department, amount, req.user?.id_admin);
  await audit(req, 'UPDATE_HR_DEPARTMENT_BUDGET', 'rh_department_budgets', null, row);
  return ok(res, row);
}

// --- Pièces jointes (CIN, justificatif de résidence, CV, contrat) ----------------
const documentPath = (storedName) => path.join(RH_DOCUMENTS_DIR, path.basename(storedName));
const removeFile = (filePath) => fs.promises.unlink(filePath).catch((err) => { if (err.code !== 'ENOENT') console.error('Suppression de pièce RH impossible:', err.message); });
async function documentList(req, res) {
  if (!await model.employees.findById(req.params.id)) throw ApiError.notFound('Employé introuvable');
  return ok(res, await model.listDocuments(req.params.id));
}
async function documentUpload(req, res) {
  const file = req.file;
  if (!file) throw ApiError.badRequest('Aucun fichier reçu (champ "file" requis)');
  const docType = String(req.body?.doc_type || '').toUpperCase();
  const employee = await model.employees.findById(req.params.id);
  if (!employee || !DOCUMENT_TYPES.includes(docType)) {
    await removeFile(file.path);
    if (!employee) throw ApiError.notFound('Employé introuvable');
    throw ApiError.badRequest(`Type de pièce invalide (${DOCUMENT_TYPES.join(', ')})`);
  }
  const row = await model.createDocument({ employeeId: employee.id, docType, storedName: file.filename, originalName: file.originalname, mimeType: file.mimetype, fileSize: file.size, uploadedBy: req.user?.id_admin });
  await audit(req, 'UPLOAD_HR_DOCUMENT', 'rh_employee_documents', row.id, { employee_id: employee.id, doc_type: docType });
  return created(res, row);
}
async function documentDownload(req, res) {
  const row = await model.findDocument(req.params.id, req.params.documentId);
  if (!row) throw ApiError.notFound('Pièce jointe introuvable');
  const filePath = documentPath(row.stored_name);
  if (!fs.existsSync(filePath)) throw ApiError.notFound('Fichier introuvable sur le serveur');
  res.setHeader('Content-Type', row.mime_type);
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(row.original_name)}`);
  res.setHeader('Cache-Control', 'no-store');
  return res.sendFile(filePath);
}
async function documentDelete(req, res) {
  const row = await model.findDocument(req.params.id, req.params.documentId);
  if (!row) throw ApiError.notFound('Pièce jointe introuvable');
  await model.deleteDocument(row.id);
  await removeFile(documentPath(row.stored_name));
  await audit(req, 'DELETE_HR_DOCUMENT', 'rh_employee_documents', row.id, { employee_id: row.employee_id, doc_type: row.doc_type });
  return noContent(res);
}
// DELETE /api/rh/employees/:id — suppression définitive (fiche, présences, congés, paie, évaluations, pièces jointes)
async function deleteEmployee(req, res) {
  const result = await model.deleteEmployee(req.params.id);
  if (!result) throw ApiError.notFound('Employé introuvable');
  await Promise.all(result.storedNames.map((name) => removeFile(documentPath(name))));
  await Promise.all((result.attendancePhotos || []).map((name) => removeFile(attendancePhotoPath(name))));
  const { employee } = result;
  await audit(req, 'DELETE_HR_EMPLOYEE', 'rh_employees', employee.id, { matricule: employee.matricule, name: `${employee.first_name} ${employee.last_name}` });
  return noContent(res);
}
// --- Pointage par reconnaissance faciale (admin) ---------------------------------
// Le navigateur calcule la signature du visage (128 nombres) ; la comparaison avec les
// employés enrôlés se fait ici. Premier passage du jour = entrée, suivant = sortie.

const PUNCH_COOLDOWN_SECONDS = 120; // un 2e passage juste après l'entrée n'est pas une sortie
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
const attendancePhotoPath = (storedName) => path.join(RH_ATTENDANCE_PHOTOS_DIR, path.basename(storedName));

async function savePunchPhoto(dataUrl) {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) throw ApiError.badRequest('Photo de pointage manquante ou invalide (JPEG attendu)');
  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length > MAX_PHOTO_BYTES || buffer[0] !== 0xff || buffer[1] !== 0xd8) throw ApiError.badRequest('Photo de pointage invalide');
  const name = `${Date.now()}-${crypto.randomBytes(10).toString('hex')}.jpg`;
  await fs.promises.writeFile(attendancePhotoPath(name), buffer);
  return name;
}

async function faceEnroll(req, res) {
  const employee = await model.employees.findById(req.params.id);
  if (!employee) throw ApiError.notFound('Employé introuvable');
  const { descriptors, consent } = req.body || {};
  if (consent !== true) throw ApiError.badRequest('L’accord de l’employé est obligatoire pour enregistrer son visage');
  if (!Array.isArray(descriptors) || descriptors.length < MIN_ENROLL_SAMPLES || descriptors.length > MAX_ENROLL_SAMPLES || !descriptors.every(isDescriptor)) throw ApiError.badRequest(`Entre ${MIN_ENROLL_SAMPLES} et ${MAX_ENROLL_SAMPLES} captures du visage sont nécessaires`);
  // Refuse un visage déjà reconnu comme un autre employé (erreur de personne devant la caméra).
  const others = (await model.listFaceSamples()).filter((s) => String(s.employee_id) !== String(employee.id));
  for (const descriptor of descriptors) {
    const clash = findBestMatch(descriptor, others);
    if (clash.employeeId) {
      const other = await model.employees.findById(clash.employeeId);
      throw ApiError.conflict(`Ce visage ressemble à celui de ${other.first_name} ${other.last_name}, déjà enregistré. Vérifiez que c’est bien ${employee.first_name} ${employee.last_name} devant la caméra.`);
    }
  }
  const count = await model.replaceFaceDescriptors(employee.id, descriptors, req.user?.id_admin);
  await audit(req, 'ENROLL_HR_FACE', 'rh_employees', employee.id, { samples: count });
  return ok(res, { employee_id: employee.id, face_samples: count });
}

async function faceDelete(req, res) {
  if (!await model.employees.findById(req.params.id)) throw ApiError.notFound('Employé introuvable');
  await model.deleteFaceDescriptors(req.params.id);
  await audit(req, 'DELETE_HR_FACE', 'rh_employees', Number(req.params.id), {});
  return noContent(res);
}

async function facePunch(req, res) {
  const { descriptor, photo } = req.body || {};
  if (!isDescriptor(descriptor)) throw ApiError.badRequest('Signature du visage invalide');
  const match = findBestMatch(descriptor, await model.listFaceSamples());
  // Visage non reconnu : réponse normale (pas une erreur) pour que la borne continue.
  if (!match.employeeId) return ok(res, { action: match.reason });
  const employee = await model.employees.findById(match.employeeId);
  const who = { id: employee.id, first_name: employee.first_name, last_name: employee.last_name, matricule: employee.matricule };
  const today = await model.todayAttendance(employee.id);
  if (today?.check_out) return ok(res, { action: 'ALREADY_DONE', employee: who, attendance: today });
  if (today?.check_in && Number(today.seconds_since_check_in) < PUNCH_COOLDOWN_SECONDS) return ok(res, { action: 'TOO_SOON', employee: who, attendance: today });
  const photoName = await savePunchPhoto(photo);
  try {
    const isCheckOut = !!today?.check_in;
    const row = isCheckOut
      ? await model.checkOut(employee.id, null, { method: 'VISAGE', photo: photoName })
      : await model.checkIn(employee.id, null, { method: 'VISAGE', photo: photoName });
    if (!row) throw ApiError.conflict(`${employee.first_name} ${employee.last_name} n’est pas actif aujourd’hui (congé, suspension ou sortie)`);
    await audit(req, isCheckOut ? 'HR_CHECK_OUT_FACE' : 'HR_CHECK_IN_FACE', 'rh_attendance', row.id, { employee_id: employee.id, distance: match.distance });
    return ok(res, { action: isCheckOut ? 'CHECK_OUT' : 'CHECK_IN', employee: who, attendance: row });
  } catch (err) {
    await removeFile(attendancePhotoPath(photoName));
    businessError(err);
  }
}

async function attendancePhoto(req, res) {
  const name = await model.findAttendancePhoto(req.params.id, req.params.kind);
  if (!name) throw ApiError.notFound('Aucune photo pour ce pointage');
  const filePath = attendancePhotoPath(name);
  if (!fs.existsSync(filePath)) throw ApiError.notFound('Photo introuvable sur le serveur');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'no-store');
  return res.sendFile(filePath);
}

async function evaluationCreate(req, res) { const body = { ...(req.body || {}), reviewer_id: req.user?.id_admin }; if (!body.employee_id || !body.period || !body.evaluation_date) throw ApiError.badRequest('employee_id, period et evaluation_date sont obligatoires'); const row = await model.evaluations.create(body); await audit(req, 'CREATE_HR_EVALUATION', 'rh_evaluations', row.id, { employee_id: row.employee_id }); return created(res, row); }

// --- Espace personnel : tout utilisateur connecté, limité à SA propre fiche -----
// L'employee_id vient toujours de la fiche liée au compte connecté, jamais du body,
// pour qu'un utilisateur ne puisse jamais lire ou agir au nom d'un collègue.
async function myEmployee(req) {
  const employee = await model.findEmployeeByUserId(req.user.id_admin);
  if (!employee) throw ApiError.notFound('Aucune fiche RH n’est encore liée à votre compte. Contactez un administrateur.');
  return employee;
}
async function myProfile(req, res) { const employee = await myEmployee(req); return ok(res, renderEmployee(employee)); }
async function myLeaveList(req, res) { const employee = await myEmployee(req); const p = page(req); const result = await model.listLeaveRequests({ ...p, employeeId: employee.id }); return ok(res, result.rows, result.meta); }
async function myLeaveCreate(req, res) {
  const employee = await myEmployee(req);
  const body = req.body || {};
  if (!body.start_date || !body.end_date || !LEAVE_TYPES.includes(String(body.leave_type || '').toUpperCase())) throw ApiError.badRequest(`dates et leave_type (${LEAVE_TYPES.join(', ')}) sont obligatoires`);
  try {
    const row = await model.createLeaveRequest({ employee_id: employee.id, leave_type: String(body.leave_type).toUpperCase(), start_date: body.start_date, end_date: body.end_date, reason: body.reason });
    if (!row) throw ApiError.notFound('Votre fiche employé est introuvable ou inactive');
    await audit(req, 'CREATE_HR_LEAVE_SELF', 'rh_leave_requests', row.id, { employee_id: row.employee_id });
    return created(res, row);
  } catch (err) { businessError(err); }
}
async function myAttendanceList(req, res) {
  const employee = await myEmployee(req);
  const p = page(req);
  const result = await model.listMyAttendance(employee.id, p);
  return ok(res, result.rows, result.meta);
}
// Pas de pointage libre-service : seul l'admin enregistre les présences
// (reconnaissance faciale ou boutons Entrée / Sortie). L'employé consulte seulement son historique.

module.exports = { faceEnroll, faceDelete, facePunch, attendancePhoto, evaluationList, budgetList, budgetUpdate, documentList, documentUpload, documentDownload, documentDelete, employeesList, getEmployee, createEmployee, updateEmployee, offboardEmployee, deleteEmployee, dashboard, leaveList, leaveCreate, leaveStatus, attendanceList, checkIn, checkOut, payrollList, payrollGenerate, payrollUpdate, payrollStatus, payrollDelete, payrollPayslip, evaluationsCrud, evaluationCreate, myProfile, myLeaveList, myLeaveCreate, myAttendanceList };
