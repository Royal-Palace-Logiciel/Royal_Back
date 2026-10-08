// Database/cleanupSeedAndLinkUsers.js
//
// Script à lancer UNE SEULE FOIS après la migration 20260914_rh_link_users.sql :
//  1. Supprime les 5 employés RH de démonstration insérés par la migration
//     20260909_hr_module.sql (Mamy Rakoto, Lova Razanakoto, Sarah Andrianina,
//     Tiana Raveloson, Hery Ratsimba) — ce sont des données de test statiques,
//     pas de vrais employés.
//  2. Crée/lie une fiche RH pour chaque utilisateur déjà présent dans "users"
//     (gestion d'accès), en réutilisant exactement la même logique que celle
//     appliquée automatiquement à toute NOUVELLE création de compte.
//
// Usage : node Database/cleanupSeedAndLinkUsers.js

const { pool } = require('../config/db');
const { Users } = require('../models/adminModel');
const { findEmployeeByUserId, createOrLinkEmployeeFromUser } = require('../models/rhModel');

const SEED_MATRICULES = ['HDA-0001', 'HDA-0002', 'HDA-0003', 'HDA-0004', 'HDA-0005'];

async function removeSeedEmployees() {
  const [rows] = await pool.query(
    `SELECT id, matricule, first_name, last_name FROM rh_employees WHERE matricule IN (?)`,
    [SEED_MATRICULES]
  );
  if (!rows.length) {
    console.log('ℹ️  Aucun employé de test (seed) trouvé — déjà nettoyé.');
    return;
  }
  const ids = rows.map((r) => r.id);
  console.log(`🧹 Suppression de ${ids.length} employé(s) de test :`, rows.map((r) => `${r.matricule} ${r.first_name} ${r.last_name}`).join(', '));

  // Les FK sont en ON DELETE RESTRICT (historique RH protégé) : on supprime
  // donc explicitement les dépendances, dans l'ordre, avant les employés.
  await pool.query('DELETE FROM rh_evaluations WHERE employee_id IN (?)', [ids]);
  await pool.query('DELETE FROM rh_payroll WHERE employee_id IN (?)', [ids]);
  await pool.query('DELETE FROM rh_attendance WHERE employee_id IN (?)', [ids]);
  await pool.query('DELETE FROM rh_leave_requests WHERE employee_id IN (?)', [ids]);
  await pool.query('DELETE FROM rh_leave_balances WHERE employee_id IN (?)', [ids]);
  await pool.query('DELETE FROM rh_employees WHERE id IN (?)', [ids]);
  console.log('✅ Employés de test supprimés.');
}

async function linkExistingUsers() {
  const users = await Users.findAll({});
  console.log(`👥 ${users.length} utilisateur(s) trouvé(s) dans "users".`);
  let linked = 0, created = 0, skipped = 0;
  for (const user of users) {
    const existing = await findEmployeeByUserId(user.id_admin);
    if (existing) { skipped++; continue; }
    const before = await pool.query('SELECT id FROM rh_employees WHERE email = ? AND user_id IS NULL LIMIT 1', [user.email]);
    const willLink = before[0].length > 0;
    await createOrLinkEmployeeFromUser(user);
    if (willLink) linked++; else created++;
  }
  console.log(`✅ ${created} fiche(s) RH créée(s), ${linked} fiche(s) existante(s) liée(s), ${skipped} déjà en place.`);
}

(async () => {
  try {
    await removeSeedEmployees();
    await linkExistingUsers();
    console.log('🎉 Terminé.');
  } catch (err) {
    console.error('❌ Échec du script :', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
