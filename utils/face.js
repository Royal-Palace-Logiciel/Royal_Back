// Reconnaissance faciale : comparaison des signatures (descripteurs de 128 nombres
// produits par face-api dans le navigateur). La décision se prend ici, côté serveur :
// le navigateur n'a jamais la liste des signatures des employés.

const DESCRIPTOR_LENGTH = 128;
// Distance euclidienne en dessous de laquelle deux signatures sont la même personne.
// 0,6 est la valeur usuelle de face-api, on prend plus strict pour limiter les confusions.
const MATCH_THRESHOLD = 0.5;
// Écart minimal entre le meilleur candidat et le second : sinon on refuse (sosies, mauvaise image).
const AMBIGUITY_MARGIN = 0.06;
const MIN_ENROLL_SAMPLES = 3;
const MAX_ENROLL_SAMPLES = 10;

function isDescriptor(value) {
  return Array.isArray(value) && value.length === DESCRIPTOR_LENGTH && value.every((n) => typeof n === 'number' && Number.isFinite(n));
}

function distance(a, b) {
  let sum = 0;
  for (let i = 0; i < DESCRIPTOR_LENGTH; i += 1) { const d = a[i] - b[i]; sum += d * d; }
  return Math.sqrt(sum);
}

// samples : [{ employee_id, descriptor }]. Retourne { employeeId, distance } ou
// { reason: 'UNKNOWN' | 'AMBIGUOUS' }.
function findBestMatch(descriptor, samples) {
  const best = new Map(); // meilleure distance par employé
  for (const sample of samples) {
    const d = distance(descriptor, sample.descriptor);
    if (!best.has(sample.employee_id) || d < best.get(sample.employee_id)) best.set(sample.employee_id, d);
  }
  const ranked = [...best.entries()].sort((a, b) => a[1] - b[1]);
  if (!ranked.length || ranked[0][1] > MATCH_THRESHOLD) return { reason: 'UNKNOWN' };
  if (ranked[1] && ranked[1][1] - ranked[0][1] < AMBIGUITY_MARGIN) return { reason: 'AMBIGUOUS' };
  return { employeeId: ranked[0][0], distance: Math.round(ranked[0][1] * 1000) / 1000 };
}

module.exports = { DESCRIPTOR_LENGTH, MATCH_THRESHOLD, MIN_ENROLL_SAMPLES, MAX_ENROLL_SAMPLES, isDescriptor, distance, findBestMatch };
