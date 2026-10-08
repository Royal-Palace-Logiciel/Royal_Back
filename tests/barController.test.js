const test = require('node:test');
const assert = require('node:assert/strict');

const barController = require('../controllers/barController');

test('bar controller exposes order handlers for the bar routes', () => {
  assert.equal(typeof barController.listBarOrdersHandler, 'function');
  assert.equal(typeof barController.createBarOrderHandler, 'function');
});
