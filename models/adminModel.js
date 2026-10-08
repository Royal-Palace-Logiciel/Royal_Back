
// models/adminModel.js
const { pool } = require('../config/db');
const { createCrudModel } = require('./crudFactory');

const Users = createCrudModel({
  table: 'users',
  pk: 'id_admin',
  fields: ['nom', 'prenom', 'email', 'mot_de_passe', 'role', 'module', 'statut'],
  sortable: ['id_admin', 'nom', 'prenom', 'email', 'role', 'module', 'statut', 'date_creation'],
});

async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM `users` WHERE `email` = ? LIMIT 1', [email]);
  return rows[0] || null;
}

const AuditLogs = createCrudModel({
  table: 'audit_logs',
  pk: 'id',
  fields: ['user_id', 'action', 'entite', 'entite_id', 'payload', 'created_at'],
  sortable: ['id', 'user_id', 'entite', 'created_at'],
});

async function logAction({ userId, action, entite, entiteId, payload }) {
  const [result] = await pool.query(
    `INSERT INTO audit_logs (user_id, action, entite, entite_id, payload, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [userId || null, action, entite, entiteId || null, payload ? JSON.stringify(payload) : null]
  );
  return { id: result.insertId };
}

const Notifications = createCrudModel({
  table: 'notifications',
  pk: 'id',
  fields: ['titre', 'message', 'statut', 'created_at'],
  sortable: ['id', 'created_at', 'statut'],
});

module.exports = { Users, findUserByEmail, AuditLogs, logAction, Notifications };