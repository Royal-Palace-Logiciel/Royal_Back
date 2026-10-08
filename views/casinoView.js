// views/casinoView.js

function renderSession(session) {
  if (!session) return null;
  return {
    ...session,
    est_ouverte: !session.fermeture_at,
    ecart: session.ecart !== null ? Number(session.ecart) : null,
  };
}

function renderCredit(credit) {
  if (!credit) return null;
  const encours = Number(credit.encours || 0);
  const accorde = Number(credit.montant_accorde || 0);
  return {
    ...credit,
    taux_utilisation: accorde > 0 ? Number(((encours / accorde) * 100).toFixed(1)) : 0,
  };
}

function renderVisit(visit) {
  if (!visit) return null;
  return { ...visit, en_cours: !visit.sortie_at };
}

function renderChipTransaction(tx) {
  if (!tx) return null;
  return { ...tx, montant_total: Number(tx.quantite) * Number(tx.valeur_unitaire) };
}

function renderDashboard(summary) {
  return {
    ...summary,
    encours_credits_actifs: Number(summary.encours_credits_actifs),
    volume_jetons_aujourdhui: Number(summary.volume_jetons_aujourdhui),
  };
}

module.exports = { renderSession, renderCredit, renderVisit, renderChipTransaction, renderDashboard };
