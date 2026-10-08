// views/userView.js
// Formate un enregistrement `users` avant de le renvoyer au client :
// ne jamais exposer le hash du mot de passe.

function renderUser(user) {
  if (!user) return null;
  const { mot_de_passe, ...safe } = user;
  return safe;
}

function renderUserList(users) {
  return users.map(renderUser);
}

module.exports = { renderUser, renderUserList };
