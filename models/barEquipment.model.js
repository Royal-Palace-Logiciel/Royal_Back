const { createCrudModel } = require('./crudFactory');

module.exports = createCrudModel({
  table: 'bar_equipments',
  pk: 'id',
  fields: ['nom', 'categorie', 'description', 'quantite', 'etat'],
  sortable: ['id', 'nom', 'categorie', 'quantite', 'etat'],
});