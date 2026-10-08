const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateHotelPayment,
  getHotelPaymentStatus,
  isIdempotentReplay,
} = require('../utils/hotelPaymentRules');
const hebergementModel = require('../models/hebergementModel');
const { pool } = require('../config/db');

const mode = (moyen_paiement, montant) => ({ moyen_paiement, montant });

// 1. Paiement total en espèces.
test('paiement total en espèces encaisse exactement le solde', () => {
  const payment = validateHotelPayment({ amount: 200000, balanceDue: 200000, methods: [mode('ESPECES', 200000)] });
  assert.equal(payment.amountCollected, 200000);
  assert.equal(payment.remainingDue, 0);
  assert.equal(getHotelPaymentStatus({ total: 200000, covered: 200000 }), 'PAYE');
});

// 2. Paiement total avec deux modes.
test('paiement total réparti entre deux modes', () => {
  const payment = validateHotelPayment({
    amount: 200000,
    balanceDue: 200000,
    methods: [mode('ORANGE_MONEY', 50000), mode('ESPECES', 150000)],
  });
  assert.equal(payment.amountCollected, 200000);
  assert.equal(payment.methods.length, 2);
});

// 3. Paiement partiel avec un seul mode.
test('paiement partiel avec un mode conserve le reste à payer', () => {
  const payment = validateHotelPayment({ amount: 60000, balanceDue: 200000, methods: [mode('MVOLA', 60000)] });
  assert.equal(payment.amountCollected, 60000);
  assert.equal(payment.remainingDue, 140000);
  assert.equal(getHotelPaymentStatus({ total: 200000, covered: 60000 }), 'PARTIELLEMENT_PAYE');
});

// 4. Paiement partiel multi-modes.
test('paiement partiel réparti entre plusieurs modes', () => {
  const payment = validateHotelPayment({
    amount: 125000,
    balanceDue: 200000,
    methods: [mode('TPE', 75000), mode('ESPECES', 50000)],
  });
  assert.equal(payment.amountCollected, 125000);
  assert.equal(payment.remainingDue, 75000);
});

// 5. Encaissement du solde lors d’une opération ultérieure.
test('un encaissement ultérieur solde le reliquat sans perdre le statut précédent', () => {
  const first = validateHotelPayment({ amount: 150000, balanceDue: 200000, methods: [mode('ESPECES', 100000), mode('MVOLA', 50000)] });
  assert.equal(getHotelPaymentStatus({ total: 200000, covered: first.amountCollected }), 'PARTIELLEMENT_PAYE');
  const second = validateHotelPayment({ amount: 50000, balanceDue: first.remainingDue, methods: [mode('TPE', 50000)] });
  assert.equal(second.remainingDue, 0);
  assert.equal(getHotelPaymentStatus({ total: 200000, covered: first.amountCollected + second.amountCollected }), 'PAYE');
});

// 6. Montant supérieur au solde.
test('refuse un montant supérieur au solde autorisé', () => {
  assert.throws(() => validateHotelPayment({ amount: 200.01, balanceDue: 200, methods: [mode('ESPECES', 200.01)] }), /dépasse le solde/i);
});

// 7. Répartition inférieure au montant cible.
test('refuse une répartition inférieure au montant à encaisser', () => {
  assert.throws(() => validateHotelPayment({ amount: 200, balanceDue: 200, methods: [mode('ESPECES', 199)] }), /exactement égale/i);
});

// 8. Crédit comptabilisé comme dette, pas comme argent reçu.
test('le crédit ne constitue pas un encaissement et reste dû', () => {
  const payment = validateHotelPayment({ amount: 200, balanceDue: 200, methods: [mode('CREDIT', 200)] });
  assert.equal(payment.amountCollected, 0);
  assert.equal(payment.amountCredit, 200);
  assert.equal(payment.remainingDue, 200);
  assert.equal(getHotelPaymentStatus({ total: 200, covered: 0, credit: payment.creditBalance }), 'CREDIT');
});

// 9. Gratuité nécessitant une autorisation et exclue des recettes.
test('la gratuité est autorisée par la direction et ne génère aucune recette', () => {
  assert.throws(() => validateHotelPayment({ amount: 200, balanceDue: 200, methods: [mode('GRATUIT', 200)] }), /direction/i);
  const payment = validateHotelPayment({ amount: 200, balanceDue: 200, canAuthorizeFree: true, methods: [mode('GRATUIT', 200)] });
  assert.equal(payment.amountCollected, 0);
  assert.equal(payment.amountFree, 200);
  assert.equal(payment.remainingDue, 0);
  assert.equal(getHotelPaymentStatus({ total: 200, covered: 200, free: 200 }), 'GRATUIT');
});

// 10. Consultation de plusieurs opérations indépendantes.
test('l’historique renvoie chaque encaissement avec son détail multi-modes', async (t) => {
  const originalQuery = pool.query;
  const rows = [
    { id: 1, reservation_id: 10, montant: '150.00', moyen_paiement: 'MULTI', details: JSON.stringify({ modes_paiement: [mode('ORANGE_MONEY', 50), mode('ESPECES', 100)] }), created_at: '2026-10-02 10:00:00' },
    { id: 2, reservation_id: 10, montant: '50.00', moyen_paiement: 'TPE', details: JSON.stringify({ modes_paiement: [mode('TPE', 50)] }), created_at: '2026-10-03 10:00:00' },
  ];
  pool.query = async () => [rows, []];
  t.after(() => { pool.query = originalQuery; });
  const history = await hebergementModel.listReservationPayments(10);
  assert.equal(history.length, 2);
  assert.deepEqual(history.map((payment) => payment.id), [1, 2]);
  assert.equal(history[0].details.modes_paiement.length, 2);
  assert.equal(history[1].montant, 50);
});

// 11. Statuts calculés à chaque étape.
test('les statuts couvrent impayé, partiel, crédit, gratuit et payé', () => {
  assert.equal(getHotelPaymentStatus({ total: 200 }), 'IMPAYE');
  assert.equal(getHotelPaymentStatus({ total: 200, covered: 50 }), 'PARTIELLEMENT_PAYE');
  assert.equal(getHotelPaymentStatus({ total: 200, covered: 50, credit: 150 }), 'CREDIT');
  assert.equal(getHotelPaymentStatus({ total: 200, covered: 50, free: 50 }), 'GRATUIT');
  assert.equal(getHotelPaymentStatus({ total: 200, covered: 200, free: 200 }), 'GRATUIT');
  assert.equal(getHotelPaymentStatus({ total: 200, covered: 200 }), 'PAYE');
});

// 12. Rejeu d’une confirmation idempotente.
test('un double envoi rejoué ne crée pas de seconde opération avec la même clé', () => {
  const existingDetails = JSON.stringify({ request_hash: 'same-request' });
  assert.equal(isIdempotentReplay(existingDetails, 'same-request'), true);
  assert.throws(() => isIdempotentReplay(existingDetails, 'different-request'), /autre paiement/i);
});

test('deux confirmations concurrentes de la même opération ne créent qu’un encaissement', async () => {
  const state = {
    reservation: {
      id: 10, client_id: 4, montant_total: 200, montant_paye: 0,
      montant_encaisse: 0, montant_credit: 0, montant_gratuit: 0,
      statut: 'EN_COURS', laundry_included: 0, laundry_price: 0,
      services_extras: null, services_extras_total: 0,
    },
    payments: [],
    transactions: [],
  };
  const fakeConnection = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      if (normalized.startsWith('SELECT id, client_id, montant_total')) {
        return [[{ ...state.reservation }], []];
      }
      if (normalized.startsWith('SELECT id, montant, details FROM reservation_payments')) {
        const row = state.payments.find((payment) => payment.reservation_id === params[0] && payment.idempotency_key === params[1]);
        return [row ? [{ id: row.id, montant: row.montant, details: row.details }] : [], []];
      }
      if (normalized.startsWith('SELECT COUNT(*) AS count FROM reservation_payments')) {
        return [[{ count: state.payments.length }], []];
      }
      if (normalized.startsWith('INSERT INTO reservation_payments')) {
        const [reservation_id, montant, montant_encaisse, montant_credit, montant_gratuit,
          moyen_paiement, details, ref_flux_global, idempotency_key, created_by] = params;
        const id = state.payments.length + 1;
        state.payments.push({ id, reservation_id, montant, montant_encaisse, montant_credit,
          montant_gratuit, moyen_paiement, details, ref_flux_global, idempotency_key, created_by });
        return [{ insertId: id }, []];
      }
      if (normalized.startsWith('INSERT INTO financial_transactions')) {
        state.transactions.push({ params });
        return [{ insertId: state.transactions.length }, []];
      }
      if (normalized.startsWith('UPDATE reservations')) {
        const [covered, collected, free, credit, remaining, id] = params;
        state.reservation.montant_paye += covered;
        state.reservation.montant_encaisse += collected;
        state.reservation.montant_gratuit += free;
        state.reservation.montant_credit = credit;
        if (remaining <= 0 && ['CHECKED_IN', 'EN_COURS'].includes(state.reservation.statut)) state.reservation.statut = 'TERMINEE';
        assert.equal(id, state.reservation.id);
        return [{ affectedRows: 1 }, []];
      }
      throw new Error(`Unexpected SQL in payment test: ${normalized}`);
    },
  };

  let transactionQueue = Promise.resolve();
  const withFakeTransaction = async (callback) => {
    const previousTransaction = transactionQueue;
    let release;
    transactionQueue = new Promise((resolve) => { release = resolve; });
    await previousTransaction;
    try { return await callback(fakeConnection); } finally { release(); }
  };
  const request = {
    amount: 200,
    methods: [mode('ESPECES', 200)],
    idempotencyKey: 'double-click-key',
    createdBy: 7,
  };
  const [first, second] = await Promise.all([
    withFakeTransaction((conn) => hebergementModel.applyReservationPaymentTransaction(conn, 10, request)),
    withFakeTransaction((conn) => hebergementModel.applyReservationPaymentTransaction(conn, 10, request)),
  ]);

  assert.equal(state.payments.length, 1);
  assert.equal(state.transactions.length, 1);
  assert.equal([first, second].filter((result) => result.duplicate).length, 1);
  assert.equal(state.reservation.montant_paye, 200);
});
