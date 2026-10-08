// utils/presence.js
// Suivi en mémoire de la présence des utilisateurs connectés : chaque requête
// authentifiée (et le battement de cœur du frontend) rafraîchit `lastSeen`.
// Un utilisateur est "en ligne" s'il a été vu il y a moins de ONLINE_WINDOW_MS.
// Volontairement non persisté : après un redémarrage du serveur, les battements
// de cœur reconstituent la liste en moins d'une minute.
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

const lastSeenByUser = new Map();

function touch(userId) {
  if (userId === undefined || userId === null) return;
  lastSeenByUser.set(String(userId), Date.now());
}

function forget(userId) {
  if (userId === undefined || userId === null) return;
  lastSeenByUser.delete(String(userId));
}

function listPresence() {
  const now = Date.now();
  const result = [];
  for (const [userId, lastSeen] of lastSeenByUser) {
    result.push({
      id_admin: Number(userId),
      last_seen: new Date(lastSeen).toISOString(),
      online: now - lastSeen < ONLINE_WINDOW_MS,
    });
  }
  return result;
}

module.exports = { touch, forget, listPresence, ONLINE_WINDOW_MS };
