const EMPLOYMENT_STATUSES = ['ACTIF', 'EN_CONGE', 'SUSPENDU', 'SORTI', 'RETRAITE', 'RENVOYE', 'DEMISSIONNE'];
// Statuts de fin de contrat : l'employé quitte l'effectif (présences, paie) et une raison est obligatoire.
const DEPARTURE_STATUSES = ['SORTI', 'RETRAITE', 'RENVOYE', 'DEMISSIONNE'];
const CONTRACT_TYPES = ['CDI', 'CDD', 'Prestataire', 'Stagiaire'];
// Contrats soumis aux cotisations CNAPS / OSTIE / IRSA.
const SALARIED_CONTRACTS = ['CDI', 'CDD'];
// Le prestataire est payé au jour de présence : son champ salary est un taux journalier.
const DAILY_RATE_CONTRACT = 'Prestataire';
const CNAPS_RATE = 0.01;
const OSTIE_RATE = 0.01;
const DOCUMENT_TYPES = ['CIN', 'RESIDENCE', 'CV', 'CONTRAT'];
const LEAVE_TYPES = ['ANNUEL', 'MALADIE', 'MATERNITE_PATERNITE', 'SANS_SOLDE'];
const LEAVE_STATUSES = ['EN_ATTENTE', 'APPROUVE', 'REFUSE', 'ANNULE'];
const PAYROLL_STATUSES = ['BROUILLON', 'VALIDE', 'PAYE'];
const DEPARTMENTS = ['Administration', 'Réception', 'Restauration', 'Casino', 'Maintenance', 'Hébergement', 'Sécurité'];

// Fragment SQL réutilisable : employés encore dans l'effectif.
const IN_WORKFORCE_SQL = (alias = '') => `${alias ? `${alias}.` : ''}status NOT IN (${DEPARTURE_STATUSES.map((s) => `'${s}'`).join(', ')})`;

function asDate(value, label = 'Date') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) throw new Error(`${label} invalide`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} invalide`);
  return date;
}

function workingDays(start, end) {
  const from = asDate(start, 'Date de début');
  const to = asDate(end, 'Date de fin');
  if (to < from) throw new Error('La date de fin doit être postérieure à la date de début');
  let days = 0;
  for (const day = new Date(from); day <= to; day.setUTCDate(day.getUTCDate() + 1)) {
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) days += 1;
  }
  return days;
}

function monthBounds(period) {
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(String(period || ''))) throw new Error('Période invalide (format YYYY-MM)');
  const month = String(period).slice(0, 7);
  return { period: `${month}-01`, start: `${month}-01`, end: new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).toISOString().slice(0, 10) };
}

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

// Cotisations calculées côté serveur à partir du salaire : le client ne fait qu'afficher.
// L'IRSA reste une saisie manuelle. Hors CDI/CDD, aucune cotisation.
function statutoryContributions({ contract_type, salary = 0, irsa = 0 }) {
  if (!SALARIED_CONTRACTS.includes(contract_type)) return { cnaps: 0, ostie: 0, irsa: 0 };
  return { cnaps: round2(Number(salary) * CNAPS_RATE), ostie: round2(Number(salary) * OSTIE_RATE), irsa: round2(irsa) };
}

// Net avant plancher : négatif quand avances + retenues dépassent la rémunération.
function calculateRawNet({ base_salary = 0, overtime_amount = 0, bonuses = 0, pourboire = 0, allowances = 0, advances = 0, deductions = 0, cnaps = 0, ostie = 0, irsa = 0 }) {
  return Math.round((Number(base_salary) + Number(overtime_amount) + Number(bonuses) + Number(pourboire) + Number(allowances) - Number(advances) - Number(deductions) - Number(cnaps) - Number(ostie) - Number(irsa)) * 100) / 100;
}

function calculateNet(values) {
  return Math.max(0, calculateRawNet(values));
}

const DEDUCTION_FREQUENCIES = ['MENSUEL', 'HEBDOMADAIRE'];

// Nombre de semaines d'un mois = nombre de lundis du mois (4 ou 5).
function weeksInMonth(period) {
  const { start, end } = monthBounds(period);
  let weeks = 0;
  for (const day = new Date(`${start}T00:00:00Z`); day.toISOString().slice(0, 10) <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    if (day.getUTCDay() === 1) weeks += 1;
  }
  return weeks;
}

// Retenue réellement déduite sur le mois à partir du montant saisi.
function deductionTotal(amount, frequency, period) {
  return round2(Number(amount || 0) * (frequency === 'HEBDOMADAIRE' ? weeksInMonth(period) : 1));
}

// --- Bulletin de paie : montants ------------------------------------------------

// « 350 000,00 ». Espaces normaux : l'espace fine insécable de toLocaleString('fr-FR')
// n'existe pas dans les polices standard du PDF.
function formatAmount(value) {
  const n = Number(value || 0);
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${dec}`;
}

const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };

// plural : « quatre-vingts » / « deux cents » ne prennent le s qu'en fin de nombre ou
// devant million / milliard, jamais devant mille (orthographe traditionnelle).
function below100(n, plural) {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10); const u = n % 10;
  if (t <= 6) return TENS[t] + (u === 0 ? '' : u === 1 ? ' et un' : `-${UNITS[u]}`);
  if (t === 7) return `soixante${u === 1 ? ' et onze' : `-${UNITS[10 + u]}`}`;
  if (t === 8) return u === 0 ? `quatre-vingt${plural ? 's' : ''}` : `quatre-vingt-${UNITS[u]}`;
  return `quatre-vingt-${UNITS[10 + u]}`;
}

function below1000(n, plural) {
  const h = Math.floor(n / 100); const r = n % 100;
  const hundreds = h === 0 ? '' : h === 1 ? 'cent' : `${UNITS[h]} cent${r === 0 && plural ? 's' : ''}`;
  return [hundreds, r ? below100(r, plural) : ''].filter(Boolean).join(' ');
}

function numberToFrenchWords(value) {
  const n = Math.floor(Math.abs(Number(value || 0)));
  if (n === 0) return 'zéro';
  const parts = [];
  const scale = (count, word) => { if (count) parts.push(`${below1000(count, true)} ${word}${count > 1 ? 's' : ''}`); };
  scale(Math.floor(n / 1e9) % 1000, 'milliard');
  scale(Math.floor(n / 1e6) % 1000, 'million');
  const thousands = Math.floor(n / 1000) % 1000;
  if (thousands) parts.push(thousands === 1 ? 'mille' : `${below1000(thousands, false)} mille`);
  if (n % 1000) parts.push(below1000(n % 1000, true));
  return parts.join(' ');
}

// « Deux cent vingt mille Ariary » (arrondi à l'ariary).
function amountInWords(value) {
  const words = numberToFrenchWords(Math.round(Number(value || 0)));
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} Ariary`;
}

module.exports = { formatAmount, numberToFrenchWords, amountInWords, EMPLOYMENT_STATUSES, DEPARTURE_STATUSES, CONTRACT_TYPES, SALARIED_CONTRACTS, DAILY_RATE_CONTRACT, DOCUMENT_TYPES, DEDUCTION_FREQUENCIES, LEAVE_TYPES, LEAVE_STATUSES, PAYROLL_STATUSES, DEPARTMENTS, IN_WORKFORCE_SQL, workingDays, monthBounds, statutoryContributions, calculateNet, calculateRawNet, weeksInMonth, deductionTotal };
