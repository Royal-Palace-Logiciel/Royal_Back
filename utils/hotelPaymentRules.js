const PAYMENT_METHODS = new Set([
  'ESPECES', 'TPE', 'MVOLA', 'ORANGE_MONEY', 'CARTE', 'VIREMENT', 'CREDIT', 'GRATUIT',
]);

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const toCents = (value) => Math.round(roundMoney(value) * 100);

function validateHotelPayment({ amount, balanceDue, currentCredit = 0, methods, canAuthorizeFree = false }) {
  const targetCents = toCents(amount);
  const dueCents = toCents(balanceDue);
  if (!Number.isFinite(Number(amount)) || targetCents <= 0) {
    throw new Error('Le montant à régler doit être un nombre positif.');
  }
  if (!Number.isFinite(Number(balanceDue)) || dueCents <= 0) {
    throw new Error('Aucun solde ne peut être encaissé sur cette réservation.');
  }
  if (targetCents > dueCents) {
    throw new Error('Le montant demandé dépasse le solde restant à payer.');
  }
  if (!Array.isArray(methods) || methods.length === 0) {
    throw new Error('Sélectionnez au moins un mode de paiement.');
  }

  const seen = new Set();
  const normalizedMethods = methods.map((item) => {
    const method = String(item?.moyen_paiement || '').trim().toUpperCase();
    const methodCents = toCents(item?.montant);
    if (!PAYMENT_METHODS.has(method)) throw new Error('Un mode de paiement est invalide.');
    if (seen.has(method)) throw new Error('Un mode de paiement ne peut être sélectionné qu’une seule fois.');
    seen.add(method);
    if (!Number.isFinite(Number(item?.montant)) || methodCents <= 0) {
      throw new Error(`Le montant du mode ${method} doit être positif.`);
    }
    if (method === 'GRATUIT' && !canAuthorizeFree) {
      throw new Error('Seule la direction peut autoriser une gratuité.');
    }
    return { moyen_paiement: method, montant: methodCents / 100, cents: methodCents };
  });

  const allocatedCents = normalizedMethods.reduce((sum, item) => sum + item.cents, 0);
  if (allocatedCents !== targetCents) {
    throw new Error('La somme des modes de paiement doit être exactement égale au montant à régler.');
  }

  const currentCreditCents = Math.max(0, toCents(currentCredit));
  const newCreditCents = normalizedMethods
    .filter((item) => item.moyen_paiement === 'CREDIT')
    .reduce((sum, item) => sum + item.cents, 0);
  if (newCreditCents > Math.max(0, dueCents - currentCreditCents)) {
    throw new Error('Le montant de crédit dépasse le solde non encore classé en crédit.');
  }

  const cashCents = normalizedMethods
    .filter((item) => !['CREDIT', 'GRATUIT'].includes(item.moyen_paiement))
    .reduce((sum, item) => sum + item.cents, 0);
  const freeCents = normalizedMethods
    .filter((item) => item.moyen_paiement === 'GRATUIT')
    .reduce((sum, item) => sum + item.cents, 0);
  const coveredCents = cashCents + freeCents;
  const remainingDueCents = Math.max(0, dueCents - coveredCents);
  const creditBalanceCents = Math.max(0, currentCreditCents - coveredCents) + newCreditCents;

  return {
    amount: targetCents / 100,
    methods: normalizedMethods.map(({ moyen_paiement, montant }) => ({ moyen_paiement, montant })),
    amountCollected: cashCents / 100,
    amountFree: freeCents / 100,
    amountCredit: newCreditCents / 100,
    remainingDue: remainingDueCents / 100,
    creditBalance: creditBalanceCents / 100,
  };
}

function getHotelPaymentStatus({ total, covered = 0, credit = 0, free = 0 }) {
  const dueCents = Math.max(0, toCents(total) - toCents(covered));
  if (toCents(credit) > 0) return 'CREDIT';
  if (toCents(free) > 0) return 'GRATUIT';
  if (dueCents === 0) return 'PAYE';
  if (toCents(covered) > 0) return 'PARTIELLEMENT_PAYE';
  return 'IMPAYE';
}

function isIdempotentReplay(details, requestHash) {
  let parsed = details;
  if (typeof details === 'string') {
    try { parsed = JSON.parse(details || '{}'); } catch { parsed = {}; }
  }
  if (parsed?.request_hash !== requestHash) {
    throw new Error('Cette clé d’idempotence a déjà été utilisée avec un autre paiement.');
  }
  return true;
}

module.exports = { PAYMENT_METHODS, roundMoney, validateHotelPayment, getHotelPaymentStatus, isIdempotentReplay };