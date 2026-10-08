const { pool } = require('../config/db');
const { createCrudModel } = require('./crudFactory');

const CasinoPlayers = createCrudModel({
  table: 'casino_players',
  pk: 'id',
  fields: ['nom', 'prenom', 'telephone', 'email', 'date_inscription', 'depot', 'credit', 'mode_jeu', 'statut_jeu', 'statut'],
  sortable: ['id', 'nom', 'prenom', 'telephone', 'statut', 'created_at', 'updated_at'],
});

module.exports = { CasinoPlayers };
