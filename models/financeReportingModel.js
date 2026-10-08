// models/financeReportingModel.js
//
// Ventilation du reporting financier par mois ET par département (CA / charges).
// Module isolé de financeModel.js : il consomme les mêmes tables sources que
// financialSummary() mais ajoute la dimension temporelle (année/mois), sans
// modifier la logique ni les routes existantes du résumé global.
//
// Limite connue : financialSummary() valorise les "sorties" Bar et Hébergement
// à partir d'un instantané du stock actuel (bar_stock / hebergement_stock),
// qui n'a pas de dimension temporelle. Cette ventilation mensuelle utilise
// à la place des sources datées :
//  - Hébergement : les achats de stock déjà enregistrés dans le grand livre
//    (financial_transactions, ref HEBERGEMENT-STOCK-ADD-%), exclus du résumé
//    global pour éviter un double comptage avec l'instantané, mais inclus ici.
//  - Bar : une écriture SORTIE est désormais créée dans financial_transactions
//    au moment où bar_stock est décrémenté (voir models/barOrder.model.js,
//    ref BAR-ORDER-<id>-STOCK). Avant ce correctif, aucune trace datée
//    n'existait pour la consommation de stock du Bar.
//  - Autres localisations (ex. Restaurant, via la table `stocks` générique) :
//    cumul mensuel des sorties enregistrées dans `stock_movements`
//    (type_mouvement = 'SORTIE'), valorisées au prix d'achat produit.
// Dans tous les cas, seul l'historique enregistré APRÈS la mise en place de
// ces écritures datées est exploitable : les mouvements de stock antérieurs
// qui n'ont jamais été journalisés restent invisibles ici, même s'ils sont
// comptés dans le total global de /finance/summary via l'instantané.

const { pool } = require('../config/db');
const { DEPARTMENTS, normaliseModule } = require('./financeModel');

function monthKey(department, year, month) {
  return `${department}|${year}|${month}`;
}

function emptyBucket(department, year, month) {
  return { department, year, month, ca: 0, charges: 0, resultat_final: 0 };
}

// --- Résultat final Casino (fiche « Calcul final ») ------------------------
// Chaque fiche joueur (date + table) stocke son calcul final dans sheet_data.finals.
// Le résultat final est daté par la date de la fiche (sheet_date), pas par la date
// d'enregistrement : une fiche du 05/10 saisie le 06/10 compte pour le 05/10.

function parseAmount(value) {
  const text = String(value ?? '').trim().replace(/\s/g, '');
  if (!text) return 0;
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const amount = Number(normalized.replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

// Retourne le résultat final enregistré d'une fiche, ou null si le calcul final
// n'a jamais été enregistré. `_global` contient la dernière valeur enregistrée ;
// les fiches plus anciennes ne l'ont que sur la fiche joueur sélectionnée.
// Une fiche au JSON illisible (null, texte cassé, double encodage) est ignorée
// au lieu de faire échouer toute la requête.
function parseSheetData(sheetData) {
  let data = sheetData;
  for (let depth = 0; typeof data === 'string' && depth < 2; depth += 1) {
    try { data = JSON.parse(data || '{}'); } catch { return {}; }
  }
  if (Buffer.isBuffer(data)) return parseSheetData(data.toString('utf8'));
  return data && typeof data === 'object' ? data : {};
}

function extractCasinoFinalResult(sheetData) {
  const data = parseSheetData(sheetData);
  const finals = data.finals && typeof data.finals === 'object' ? data.finals : {};
  const global = finals._global && typeof finals._global === 'object' ? finals._global : {};
  if (global.resultatFinalValue !== undefined && global.resultatFinalValue !== '') {
    const value = Number(global.resultatFinalValue);
    if (Number.isFinite(value)) return value;
  }
  if (global.resultatFinal) return parseAmount(global.resultatFinal);
  const legacy = Object.entries(finals)
    .filter(([key, values]) => key !== '_global' && values && String(values.resultatFinal || '').trim());
  return legacy.length ? parseAmount(legacy[legacy.length - 1][1].resultatFinal) : null;
}

// Le résultat final est la seule source du rapport Casino : un résultat positif
// est un gain (CA), un résultat négatif une perte (charges). Le solde du Casino
// est donc égal à la somme des résultats finaux de la période.
function addCasinoFinalResult(bucket, montant) {
  if (montant >= 0) bucket.ca += montant;
  else bucket.charges += -montant;
  bucket.resultat_final += montant;
}

// Fiches casino d'une plage, avec les colonnes de période calculées en SQL.
async function casinoFinalResults(selectSql, whereSql, params) {
  const [rows] = await pool.query(
    `SELECT ${selectSql}, sheet_data FROM casino_player_sheets WHERE ${whereSql}`,
    params
  );
  return rows
    .map((row) => ({ ...row, montant: extractCasinoFinalResult(row.sheet_data) }))
    .filter((row) => row.montant !== null);
}

// Agrège toutes les sources de données datées en un Map<"dept|annee|mois", {ca, charges}>
async function buildMonthlyBuckets({ year } = {}) {
  const buckets = new Map();
  const getBucket = (department, y, m) => {
    const key = monthKey(department, y, m);
    if (!buckets.has(key)) buckets.set(key, emptyBucket(department, y, m));
    return buckets.get(key);
  };

  const yearFilter = Number.isInteger(year) ? 'AND YEAR(created_at) = ?' : '';
  const yearParams = Number.isInteger(year) ? [year] : [];

  // 1) CA des modules pilotés par la table `orders` (Restaurant, Casino, ...).
  //    Le Bar est exclu ici : son CA transite par financial_transactions (cf. financialSummary()).
  const [orders] = await pool.query(
    `SELECT source_module AS module, YEAR(created_at) AS annee, MONTH(created_at) AS mois,
            COALESCE(SUM(montant_total), 0) AS montant
     FROM orders
     WHERE UPPER(COALESCE(statut, '')) IN ('PAYEE', 'PAYE')
       AND UPPER(COALESCE(source_module, '')) <> 'BAR'
       AND created_at IS NOT NULL
       ${yearFilter}
     GROUP BY source_module, YEAR(created_at), MONTH(created_at)`,
    yearParams
  );
  orders.forEach((row) => {
    const department = normaliseModule(row.module);
    if (!department) return;
    getBucket(department, row.annee, row.mois).ca += Number(row.montant) || 0;
  });

  // 2) CA (ENTREE) et charges (SORTIE) portés directement par le grand livre
  //    financier : Hébergement, Hôtel, Casino, Bar.
  //    Note : contrairement à financialSummary(), on NE filtre PAS les lignes
  //    HEBERGEMENT-STOCK-ADD-% ici. Ce filtre existe côté résumé global pour
  //    éviter un double comptage avec la valorisation instantanée du stock
  //    restant (hebergement_stock) ; cette ventilation mensuelle ne calcule
  //    aucune valorisation de ce type, donc ces achats de stock datés sont au
  //    contraire la seule source fiable de charges mensuelles pour Hébergement.
  const [ledger] = await pool.query(
    `SELECT UPPER(module) AS module, type_flux, YEAR(created_at) AS annee, MONTH(created_at) AS mois,
            COALESCE(SUM(montant), 0) AS montant
     FROM financial_transactions
     WHERE UPPER(module) IN ('HEBERGEMENT', 'HOTEL', 'CASINO', 'BAR')
       AND (UPPER(module) NOT IN ('HEBERGEMENT', 'HOTEL') OR UPPER(COALESCE(moyen_paiement, '')) NOT IN ('CREDIT', 'GRATUIT'))
       AND created_at IS NOT NULL
       ${yearFilter}
     GROUP BY UPPER(module), type_flux, YEAR(created_at), MONTH(created_at)`,
    yearParams
  );
  ledger.forEach((row) => {
    const department = normaliseModule(row.module);
    // Casino : le rapport reprend uniquement le résultat final des fiches (voir 4).
    if (!department || department === 'casino') return;
    const flux = String(row.type_flux || '').toUpperCase();
    const bucket = getBucket(department, row.annee, row.mois);
    if (flux.startsWith('ENTREE')) {
      bucket.ca += Number(row.montant) || 0;
    } else if (department !== 'hotel' && flux.startsWith('SORTIE')) {
      // Les sorties Hôtel ne sont pas tenues dans le grand livre (voir financialSummary()).
      bucket.charges += Number(row.montant) || 0;
    }
  });

  // 3) Charges issues de la consommation de stock (toutes localisations),
  //    seule source datée disponible pour valoriser des sorties mensuelles.
  const [stockMovements] = await pool.query(
    `SELECT sl.nom AS module, YEAR(sm.created_at) AS annee, MONTH(sm.created_at) AS mois,
            COALESCE(SUM(sm.quantite * COALESCE(p.prix_achat, 0)), 0) AS montant
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     JOIN stock_locations sl ON sl.id = sm.location_id
     WHERE UPPER(sm.type_mouvement) = 'SORTIE'
       AND sm.created_at IS NOT NULL
       ${yearFilter.replace('created_at', 'sm.created_at')}
     GROUP BY sl.id, sl.nom, YEAR(sm.created_at), MONTH(sm.created_at)`,
    yearParams
  );
  stockMovements.forEach((row) => {
    const department = normaliseModule(row.module);
    if (!department) return;
    getBucket(department, row.annee, row.mois).charges += Number(row.montant) || 0;
  });

  // 4) Résultat final des fiches Casino, additionné par mois de la fiche.
  const casinoFinals = await casinoFinalResults(
    'YEAR(sheet_date) AS annee, MONTH(sheet_date) AS mois',
    Number.isInteger(year) ? 'YEAR(sheet_date) = ?' : '1 = 1',
    yearParams
  );
  casinoFinals.forEach((row) => addCasinoFinalResult(getBucket('casino', row.annee, row.mois), row.montant));

  return buckets;
}

// Ventilation mensuelle du CA et des charges, filtrable par département et/ou année.
// Retourne un tableau trié [{ department, year, month, ca, charges, solde }, ...].
async function monthlyDepartmentBreakdown({ department, year } = {}) {
  const normalisedDepartment = department ? normaliseModule(department) : undefined;
  if (department && !normalisedDepartment) {
    throw new Error(`Département inconnu: "${department}" (attendus: ${DEPARTMENTS.join(', ')})`);
  }
  const parsedYear = year !== undefined ? Number(year) : undefined;
  if (year !== undefined && !Number.isInteger(parsedYear)) {
    throw new Error('year doit être un entier (ex: 2026)');
  }

  const buckets = await buildMonthlyBuckets({ year: parsedYear });

  return [...buckets.values()]
    .filter((row) => !normalisedDepartment || row.department === normalisedDepartment)
    .map((row) => ({ ...row, solde: row.ca - row.charges }))
    .sort((a, b) => a.department.localeCompare(b.department) || a.year - b.year || a.month - b.month);
}

// Cas d'usage concret : consulter le CA/les charges d'UN département pour UN mois précis
// (ex. "Hôtel" pour novembre 2026), sans recalcul manuel côté client.
async function departmentMonthSummary({ department, year, month }) {
  const normalisedDepartment = normaliseModule(department);
  if (!normalisedDepartment) {
    throw new Error(`Département inconnu: "${department}" (attendus: ${DEPARTMENTS.join(', ')})`);
  }
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  if (!Number.isInteger(parsedYear)) throw new Error('year doit être un entier (ex: 2026)');
  if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    throw new Error('month doit être un entier entre 1 et 12');
  }

  const buckets = await buildMonthlyBuckets({ year: parsedYear });
  const bucket = buckets.get(monthKey(normalisedDepartment, parsedYear, parsedMonth))
    || emptyBucket(normalisedDepartment, parsedYear, parsedMonth);

  return { ...bucket, solde: bucket.ca - bucket.charges };
}

async function periodDepartmentBreakdown({ period, department, startDate, endDate }) {
  const normalisedDepartment = department ? normaliseModule(department) : undefined;
  if (department && !normalisedDepartment) {
    throw new Error(`Département inconnu: "${department}" (attendus: ${DEPARTMENTS.join(', ')})`);
  }
  if (!['daily', 'weekly'].includes(period)) throw new Error('period doit être daily ou weekly');

  const periodStart = period === 'daily'
    ? (column) => `DATE(${column})`
    : (column) => `DATE_SUB(DATE(${column}), INTERVAL WEEKDAY(${column}) DAY)`;
  const periodEnd = period === 'daily'
    ? (column) => `DATE(${column})`
    : (column) => `DATE_ADD(${periodStart(column)}, INTERVAL 6 DAY)`;
  const dateFilter = (column) => `${column} >= ? AND ${column} < DATE_ADD(?, INTERVAL 1 DAY)`;
  const keyFor = (module, start) => `${module}|${start}`;
  const buckets = new Map();
  const getBucket = (module, start, end) => {
    const key = keyFor(module, start);
    if (!buckets.has(key)) buckets.set(key, { department: module, start_date: start, end_date: end, ca: 0, charges: 0, resultat_final: 0 });
    return buckets.get(key);
  };

  const [orders] = await pool.query(
    `SELECT source_module AS module, DATE_FORMAT(${periodStart('created_at')}, '%Y-%m-%d') AS period_start,
            DATE_FORMAT(${periodEnd('created_at')}, '%Y-%m-%d') AS period_end, COALESCE(SUM(montant_total), 0) AS montant
     FROM orders
     WHERE UPPER(COALESCE(statut, '')) IN ('PAYEE', 'PAYE')
       AND UPPER(COALESCE(source_module, '')) <> 'BAR'
       AND created_at IS NOT NULL AND ${dateFilter('created_at')}
     GROUP BY source_module, ${periodStart('created_at')}, ${periodEnd('created_at')}`,
    [startDate, endDate]
  );
  orders.forEach((row) => {
    const module = normaliseModule(row.module);
    if (module) getBucket(module, row.period_start, row.period_end).ca += Number(row.montant) || 0;
  });

  const [ledger] = await pool.query(
    `SELECT UPPER(module) AS module, type_flux, DATE_FORMAT(${periodStart('created_at')}, '%Y-%m-%d') AS period_start,
            DATE_FORMAT(${periodEnd('created_at')}, '%Y-%m-%d') AS period_end, COALESCE(SUM(montant), 0) AS montant
     FROM financial_transactions
     WHERE UPPER(module) IN ('HEBERGEMENT', 'HOTEL', 'CASINO', 'BAR')
       AND (UPPER(module) NOT IN ('HEBERGEMENT', 'HOTEL') OR UPPER(COALESCE(moyen_paiement, '')) NOT IN ('CREDIT', 'GRATUIT'))
       AND created_at IS NOT NULL AND ${dateFilter('created_at')}
     GROUP BY UPPER(module), type_flux, ${periodStart('created_at')}, ${periodEnd('created_at')}`,
    [startDate, endDate]
  );
  ledger.forEach((row) => {
    const module = normaliseModule(row.module);
    // Casino : le rapport reprend uniquement le résultat final des fiches (voir plus bas).
    if (!module || module === 'casino') return;
    const bucket = getBucket(module, row.period_start, row.period_end);
    const flux = String(row.type_flux || '').toUpperCase();
    if (flux.startsWith('ENTREE')) bucket.ca += Number(row.montant) || 0;
    else if (module !== 'hotel' && flux.startsWith('SORTIE')) bucket.charges += Number(row.montant) || 0;
  });

  const [stockMovements] = await pool.query(
    `SELECT sl.nom AS module, DATE_FORMAT(${periodStart('sm.created_at')}, '%Y-%m-%d') AS period_start,
            DATE_FORMAT(${periodEnd('sm.created_at')}, '%Y-%m-%d') AS period_end,
            COALESCE(SUM(sm.quantite * COALESCE(p.prix_achat, 0)), 0) AS montant
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     JOIN stock_locations sl ON sl.id = sm.location_id
     WHERE UPPER(sm.type_mouvement) = 'SORTIE'
       AND sm.created_at IS NOT NULL AND ${dateFilter('sm.created_at')}
     GROUP BY sl.id, sl.nom, ${periodStart('sm.created_at')}, ${periodEnd('sm.created_at')}`,
    [startDate, endDate]
  );
  stockMovements.forEach((row) => {
    const module = normaliseModule(row.module);
    if (module) getBucket(module, row.period_start, row.period_end).charges += Number(row.montant) || 0;
  });

  // Résultat final des fiches Casino, additionné sur la période (jour ou semaine) de la fiche.
  const casinoFinals = await casinoFinalResults(
    `DATE_FORMAT(${periodStart('sheet_date')}, '%Y-%m-%d') AS period_start,
     DATE_FORMAT(${periodEnd('sheet_date')}, '%Y-%m-%d') AS period_end`,
    dateFilter('sheet_date'),
    [startDate, endDate]
  );
  casinoFinals.forEach((row) => addCasinoFinalResult(getBucket('casino', row.period_start, row.period_end), row.montant));

  return [...buckets.values()]
    .filter((row) => !normalisedDepartment || row.department === normalisedDepartment)
    .map((row) => ({ ...row, solde: row.ca - row.charges }))
    .sort((a, b) => a.department.localeCompare(b.department) || a.start_date.localeCompare(b.start_date));
}

module.exports = {
  extractCasinoFinalResult,
  monthlyDepartmentBreakdown,
  departmentMonthSummary,
  periodDepartmentBreakdown,
};
