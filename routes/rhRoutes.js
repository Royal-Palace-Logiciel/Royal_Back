const express = require('express');
const ctrl = require('../controllers/rhController');
const { requireAuth } = require('../middlewares/auth');
const { rhDocumentUpload } = require('../middlewares/upload');
const ApiError = require('../utils/ApiError');
const router = express.Router();

// Multipart : champ "file" + champ "doc_type" (CIN, RESIDENCE, CV, CONTRAT).
function uploadDocument(req, res, next) {
  rhDocumentUpload.single('file')(req, res, (err) => {
    if (!err) return next();
    return next(ApiError.badRequest(err.message || 'Erreur lors du téléversement du fichier'));
  });
}

// Espace personnel : tout utilisateur connecté (n'importe quel rôle), limité à sa
// propre fiche. Défini avant requireHR ci-dessous, donc non soumis à ce filtre.
router.get('/me', requireAuth, ctrl.myProfile);
router.get('/me/leave-requests', requireAuth, ctrl.myLeaveList);
router.post('/me/leave-requests', requireAuth, ctrl.myLeaveCreate);
// Consultation seulement : le pointage est réservé à l'admin (voir requireAdmin).
router.get('/me/attendance', requireAuth, ctrl.myAttendanceList);

// Présences : seul l'admin pointe (reconnaissance faciale ou boutons manuels) et gère
// les visages enregistrés. Les autres profils RH peuvent seulement consulter.
function requireAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();
  return next(ApiError.forbidden('Seul un administrateur peut enregistrer les présences'));
}

function requireHR(req, res, next) {
  let modules = req.user?.module;
  if (typeof modules === 'string') { try { modules = JSON.parse(modules); } catch { modules = modules.split(','); } }
  modules = (Array.isArray(modules) ? modules : []).map((item) => String(item).trim().toLowerCase());
  if (req.user?.role === 'admin' || req.user?.role === 'manager' || req.user?.role === 'rh_manager' || req.user?.role === 'rh' || modules.includes('rh')) return next();
  return next(require('../utils/ApiError').forbidden('Accès RH réservé aux personnes autorisées'));
}
router.use(requireAuth, requireHR);
router.get('/dashboard', ctrl.dashboard);
router.get('/employees', ctrl.employeesList); router.post('/employees', ctrl.createEmployee); router.get('/employees/:id', ctrl.getEmployee); router.put('/employees/:id', ctrl.updateEmployee); router.delete('/employees/:id', ctrl.deleteEmployee);router.post('/employees/:id/offboard', ctrl.offboardEmployee);
router.get('/leave-requests', ctrl.leaveList); router.post('/leave-requests', ctrl.leaveCreate); router.patch('/leave-requests/:id/status', ctrl.leaveStatus);
router.get('/attendance', ctrl.attendanceList); router.post('/attendance/check-in', requireAdmin, ctrl.checkIn); router.post('/attendance/check-out', requireAdmin, ctrl.checkOut);
router.post('/attendance/face-punch', requireAdmin, ctrl.facePunch); router.get('/attendance/:id/photo/:kind(in|out)', ctrl.attendancePhoto);
router.put('/employees/:id/face', requireAdmin, ctrl.faceEnroll); router.delete('/employees/:id/face', requireAdmin, ctrl.faceDelete);
router.get('/payroll', ctrl.payrollList); router.post('/payroll/:period/generate', ctrl.payrollGenerate); router.patch('/payroll/:id', ctrl.payrollUpdate); router.patch('/payroll/:id/status', ctrl.payrollStatus); router.delete('/payroll/:id', ctrl.payrollDelete); router.get('/payroll/:period/payslip/:employeeId', ctrl.payrollPayslip);
router.get('/employees/:id/documents', ctrl.documentList); router.post('/employees/:id/documents', uploadDocument, ctrl.documentUpload); router.get('/employees/:id/documents/:documentId', ctrl.documentDownload); router.delete('/employees/:id/documents/:documentId', ctrl.documentDelete);
router.get('/budgets', ctrl.budgetList); router.put('/budgets/:department', ctrl.budgetUpdate);
router.get('/evaluations', ctrl.evaluationList); router.post('/evaluations', ctrl.evaluationCreate); router.get('/evaluations/:id', ctrl.evaluationsCrud.getOne); router.put('/evaluations/:id', ctrl.evaluationsCrud.update);
module.exports = router;
