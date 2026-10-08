// routes/routeFactory.js
// Monte les 5 routes REST standards sur un router Express à partir d'un controller.

const express = require('express');

function createCrudRouter(controller, { idParam = 'id' } = {}) {
  const router = express.Router();
  router.get('/', controller.list);
  router.get(`/:${idParam}`, controller.getOne);
  router.post('/', controller.create);
  router.put(`/:${idParam}`, controller.update);
  router.delete(`/:${idParam}`, controller.remove);
  return router;
}

module.exports = { createCrudRouter };
