// Database/deleteEmployee.js
//
// Supprime définitivement UN employé RH et toutes ses données liées
// (congés, présences, paie, évaluations, solde de congé). Réservé au
// nettoyage de fiches de test — pour un vrai départ, utilise "Enregistrer
// une sortie" dans l'interface (conserve l'historique).
//
// Usage : node Database/deleteEmployee.js HDA-24398374
//         node Database/deleteEmployee.js 12          (par id numérique)

const { pool, withTransaction } = require('../config/db');

async function main() {
  const key = process.argv[2];
  if (!key) {
    console.error('Usage : node Database/deleteEmployee.js <matricule-ou-id>');
    process.exitCode = 1;
    return;
  }

  const byId = /^\d+$/.test(key);
  const [rows] = await pool.query(
    `SELECT * FROM rh_employees WHERE ${byId ? 'id' : 'matricule'} = ? LIMIT 1`,
    [key]
  );
  const employee = rows[0];
  if (!employee) {
    console.error(`❌ Aucun employé trouvé pour "${key}".`);
    process.exitCode = 1;
    return;
  }

  console.log(`🔎 Employé trouvé : ${employee.matricule} — ${employee.first_name} ${employee.last_name} (${employee.department} · ${employee.position} · ${employee.status})`);

  await withTransaction(async (conn) => {
    await conn.query('DELETE FROM rh_evaluations WHERE employee_id=?', [employee.id]);
    await conn.query('DELETE FROM rh_payroll WHERE employee_id=?', [employee.id]);
    await conn.query('DELETE FROM rh_attendance WHERE employee_id=?', [employee.id]);
    await conn.query('DELETE FROM rh_leave_requests WHERE employee_id=?', [employee.id]);
    await conn.query('DELETE FROM rh_leave_balances WHERE employee_id=?', [employee.id]);
    await conn.query('DELETE FROM rh_employees WHERE id=?', [employee.id]);
  });

  console.log('✅ Employé et données liées supprimés définitivement.');
}

main()
  .catch((err) => { console.error('❌ Échec :', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
