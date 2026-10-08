// utils/hotelReportText.js
//
// Rend le rapport de nuitee sous sa forme texte, celle du modele manuscrit.
// Ce rendu doit rester identique a celui du composant HotelDailyReport.tsx :
// c'est le meme document, que la reception le copie depuis l'ecran ou qu'il
// parte sur WhatsApp. Toute retouche de mise en forme se fait des deux cotes.

const crypto = require('crypto');

// Bas de page du rapport manuscrit, reproduit tel quel.
const LEGENDE = [
  'E: EMPRUNTE',
  'TE: TOTAL EMPRUNTE',
  'TP: TOTAL PAYÉ',
  'AC: AUTRE CRÉDIT',
  "DA: DATE D'ARRIVÉE",
  'DD: DATE DE DÉPART',
  'ND: NON DEFINI',
  'P: PAYMENT',
  'MT: MONTANT',
  'BK: BOOKING',
  'NP: NON PAYÉ',
  'CH: CHAMBRE',
  'CP: CRÉDIT PAYÉ',
  'CN: Crédit non payé',
];

/** « 2026-09-27 » devient « 27/09/26 », comme sur le rapport. */
function toShortDate(value) {
  if (!value) return '';
  const iso = String(value).slice(0, 10);
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year.slice(2)}`;
}

/**
 * @param {object} report tel que le renvoie hotelReport.model (getHotelReport)
 * @returns {string} le rapport complet
 */
function buildHotelReportText(report) {
  if (!report) return '';
  const lines = Array.isArray(report.rooms) ? report.rooms : [];
  const observations = String(report.observations || '');

  const header = `Situation du chambre durant la Nuité ${toShortDate(report.reportDate)} à ${report.heureDebut || '—'} a ${report.heureFin || '—'}`;

  const blocks = lines.map((line) => {
    const title = `#${line.numero}: ${[line.occupant, line.note].filter(Boolean).join(' ')}`.trimEnd();
    const rows = [
      line.da && `DA: ${line.da}`,
      line.dd && `DD: ${line.dd}`,
      line.mt && `MT: ${line.mt}`,
      line.p && `P: ${line.p}`,
      line.cn && `CN: ${line.cn}`,
      line.e && `E: ${line.e}`,
      line.ac && `AC: ${line.ac}`,
    ].filter(Boolean);
    return [title, ...rows].join('\n');
  });

  return [
    header,
    '',
    '',
    blocks.join('\n\n\n'),
    '',
    '',
    `RÉCEPTIONNISTE : ${report.receptionniste || '—'}`,
    ...(observations.trim() ? ['', 'OBSERVATIONS', observations.trim()] : []),
    '',
    ...LEGENDE,
  ].join('\n');
}

/** Empreinte du texte : c'est elle qui dit si le rapport a change depuis le dernier envoi. */
function hashReportText(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

module.exports = { LEGENDE, buildHotelReportText, hashReportText, toShortDate };
