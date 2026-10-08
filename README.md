# API HDA — Documentation technique
 
Backend Node.js / Express en architecture **MVC**, connecté à la base MySQL/MariaDB `hda`
(hébergement, restaurant, stock, finance, casino). Toutes les requêtes passent par un pool
`mysql2/promise`.

Testé de bout en bout sur MariaDB 10.11 avec le schéma `hda.sql` fourni (50 tables importées,
auth + CRUD + logique métier vérifiés avec de vraies requêtes SQL).

---

## 1. Installation

```bash
cd hda-backend
npm install
cp .env.example .env   # renseigner DB_HOST, DB_USER, DB_PASSWORD, JWT_SECRET...
npm run dev             # ou npm start
```

Le serveur écoute sur `http://localhost:4000/api` (port configurable via `PORT`).

## 2. Architecture

```
hda-backend/
├── server.js                 # point d'entrée Express
├── config/db.js               # pool mysql2/promise + helper de transaction
├── models/                    # Model — accès SQL
│   ├── crudFactory.js          # génère findAll/findById/create/update/remove pour une table
│   ├── clientModel.js
│   ├── signatureModel.js       # module transversal : signature électronique (générique, append-only)
│   ├── casinoModel.js          # + logique métier (sessions, crédits, jetons, visites...)
│   ├── hebergementModel.js
│   ├── restaurantModel.js
│   ├── stockModel.js
│   ├── financeModel.js
│   └── adminModel.js
├── controllers/                # Controller — logique HTTP
│   ├── controllerFactory.js     # génère list/getOne/create/update/remove Express à partir d'un modèle
│   └── ...Controller.js par domaine
├── views/                      # Vue — formatage de la réponse JSON
│   ├── userView.js               # masque le mot de passe
│   ├── clientView.js
│   ├── casinoView.js             # ajoute des champs calculés (ecart, taux_utilisation...)
│   └── genericView.js
├── routes/                     # déclaration des routes Express, montées sous /api
├── middlewares/                # auth JWT, gestion d'erreurs centralisée
└── utils/                      # ApiError, réponses standardisées, pagination/tri/filtre
```

**Pattern utilisé** : les ~30 tables sans règle métier passent par `crudFactory` +
`controllerFactory` + `routeFactory` (CRUD générique, sans duplication de code SQL). Les tables
avec une vraie logique (casino, réservations, stock, factures) ont leurs propres fonctions dans
le modèle, appelées par des handlers dédiés dans le controller.

## 3. Format des réponses

Toutes les réponses suivent la même enveloppe :

```json
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 42 } }
```

```json
{ "success": false, "error": { "message": "Client #9999 introuvable" } }
```

Codes HTTP utilisés : `200` (OK), `201` (créé), `204` (supprimé), `400` (validation), `401`
(non authentifié), `403` (rôle insuffisant), `404` (introuvable), `409` (conflit/doublon).

## 4. Authentification

Toutes les routes `/api/casino/*` et `/api/admin/*` exigent un header
`Authorization: Bearer <token>` obtenu via `/api/auth/login`. Les autres modules sont ouverts
par défaut dans ce squelette — à protéger de la même façon selon vos besoins (`requireAuth`,
`requireRole('admin','manager')` disponibles dans `middlewares/auth.js`).

> Le module signature électronique (`routes/signatureRoutes.js`) n'est **pas monté
> automatiquement** — voir `SIGNATURE_README.md` pour la ligne à ajouter dans
> `server.js` (avec `requireAuth`).

---

## 5. Référence des endpoints

Légende : 🔒 = authentification requise.

### 5.1 Auth (`/api/auth`)

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Créer un agent |
| POST | `/api/auth/login` | Connexion, retourne un JWT |
| GET  | `/api/auth/me` 🔒 | Profil de l'agent connecté |
| POST | `/api/auth/change-password` 🔒 | Changer son mot de passe |

**POST /api/auth/register**
```json
// requête
{ "nom": "Rakoto", "prenom": "Fe", "email": "fe@hda.mg", "mot_de_passe": "secret123", "role": "admin" }
```
```json
// réponse 201 (réelle, capturée en test)
{
  "success": true,
  "data": {
    "id_admin": 1, "nom": "Rakoto", "prenom": "Fe", "email": "fe@hda.mg",
    "role": "admin", "statut": "actif", "date_creation": "2026-07-03 11:15:26"
  }
}
```

**POST /api/auth/login**
```json
// réponse 200 (réelle)
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id_admin": 1, "nom": "Rakoto", "prenom": "Fe", "email": "fe@hda.mg", "role": "admin", "statut": "actif" }
  }
}
```

### 5.2 Admin (`/api/admin`) — 🔒 admin/manager

| Méthode | Route | Description |
|---|---|---|
| GET/POST | `/api/admin/users` | Liste / création d'agents |
| GET/PUT/DELETE | `/api/admin/users/:id_admin` | Détail / modification / suppression |
| GET | `/api/admin/audit-logs` | Journal d'audit (lecture seule, admin) |
| GET/POST/PUT/DELETE | `/api/admin/notifications` | Notifications système |

### 5.3 Clients (`/api/clients`)

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/clients` | Liste paginée (`?page=&limit=&sort=&order=&statut=`) |
| GET | `/api/clients/search?q=` | Recherche nom/prénom/code/tel/email |
| GET | `/api/clients/:id` | Détail |
| GET | `/api/clients/:id/full` | Détail + solde du compte + fiche KYC |
| POST | `/api/clients` | Création |
| PUT | `/api/clients/:id` | Modification |
| DELETE | `/api/clients/:id` | Suppression |
| GET | `/api/clients/:id/account` | Solde du compte |
| POST | `/api/clients/:id/account/credit` | Créditer le compte |
| POST | `/api/clients/:id/account/debit` | Débiter le compte |
| GET | `/api/clients/:id/loyalty` | Historique de points de fidélité |
| GET | `/api/clients/:id/kyc` | Fiche KYC (conformité LBC/FT) — disponible pour tous les clients |
| PUT | `/api/clients/:id/kyc` | Créer / mettre à jour la fiche KYC (upsert) |
| GET | `/api/clients/:id/kyc/signature` | Dernière signature électronique liée à la déclaration KYC |
| GET | `/api/clients/:id/kyc/signature/history` | Historique complet des signatures KYC (append-only) |
| POST | `/api/clients/:id/kyc/signature` | Enregistrer une nouvelle signature (jamais un remplacement) |

**GET /api/clients/:id/full**
```json
// réponse réelle
{
  "success": true,
  "data": {
    "id": 1, "code_client": "CL-0001", "nom": "Andria", "prenom": "Voahangy",
    "telephone": "0341234567", "email": "voahangy@mail.mg",
    "is_casino_player": true, "statut": "actif", "solde": 50000,
    "kyc": null
  }
}
```
*(`kyc` = `null` tant qu'aucune fiche n'a été renseignée pour ce client — voir `PUT /api/clients/:id/kyc`.)*

**PUT /api/clients/:id/kyc**
```json
// requête (tous les champs optionnels, upsert)
{ "nationalite": "Malgache", "profession": "Entrepreneur", "niveau_risque": "FAIBLE" }
```
```json
// réponse
{
  "success": true,
  "data": {
    "id": 1, "client_id": 1, "nationalite": "Malgache", "profession": "Entrepreneur",
    "niveau_risque": "FAIBLE", "declaration_client": false, "date_verification": "2026-07-15"
  }
}
```

**POST /api/clients/:id/kyc/signature**
```json
// requête
{ "signature_data": "data:image/png;base64,iVBORw0K..." }
```
```json
// réponse 201 (une nouvelle ligne à chaque appel — append-only)
{
  "success": true,
  "data": {
    "id": 7, "signable_type": "client_kyc", "signable_id": 1, "client_id": 1,
    "signature_data": "data:image/png;base64,iVBORw0K...", "signed_at": "2026-07-15 09:42:10"
  }
}
```
Détails complets (modèle de données, historique, module générique réutilisable
pour d'autres domaines) : voir `SIGNATURE_README.md`.

**POST /api/clients/:id/account/credit**
```json
// requête
{ "montant": 50000, "motif": "Depot initial" }
```
```json
// réponse réelle
{ "success": true, "data": { "id": 1, "client_id": 1, "solde": 50000 } }
```

### 5.4 Casino (`/api/casino`) — 🔒 toutes les routes

> ⚠️ **Cette section est obsolète.** Elle documente la forme de réponse de
> `models/casinoModel.js` et `views/casinoView.js`, qui ne sont plus
> importés nulle part (`casinoRoutes.js` n'utilise que `casinoController.js`,
> lequel requête `pool` directement). Le dashboard réel renvoie par exemple
> `{ salles_total, salles_ouvertes, sessions_ouvertes, produit_net_jour,
> encours_credit_total, incidents_ouverts }`, pas la forme ci-dessous. La
> doc à jour du module casino est `CASINO_README.md` (routes, sessions,
> crédits, jetons, scoring, visites, tables de jeu). Cette sous-section 5.4
> est conservée telle quelle en attendant une repasse dédiée ; ne pas s'y
> fier pour le comportement actuel de l'API.

#### Dashboard
| GET | `/api/casino/dashboard` | Indicateurs agrégés temps réel |

```json
// réponse réelle
{
  "success": true,
  "data": {
    "visiteurs_actifs": 1,
    "sessions_ouvertes": 0,
    "encours_credits_actifs": 200000,
    "volume_jetons_aujourdhui": 100000
  }
}
```

#### Salles & caisses
| GET/POST | `/api/casino/rooms` | Liste / création de salle |
| GET/PUT/DELETE | `/api/casino/rooms/:id` | Détail / modif / suppression |
| GET/POST/PUT/DELETE | `/api/casino/cashiers[/​:id]` | CRUD caissiers |

#### Sessions de caisse
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/casino/sessions/active` | Sessions actuellement ouvertes |
| POST | `/api/casino/sessions/open` | Ouvrir une session |
| POST | `/api/casino/sessions/:id/close` | Clôturer (calcule l'écart automatiquement) |
| GET | `/api/casino/sessions/:id/transactions` | Transactions rattachées à la session |
| GET/POST/PUT/DELETE | `/api/casino/sessions[/​:id]` | CRUD générique |

**POST /api/casino/sessions/open**
```json
// requête
{ "cashier_id": 1, "fond_initial": 100000 }
```
```json
// réponse réelle
{
  "success": true,
  "data": {
    "id": 1, "cashier_id": 1, "user_id": 1,
    "ouverture_at": "2026-07-03 11:16:00", "fermeture_at": null,
    "fond_initial": 100000, "fond_final": null, "ecart": null, "est_ouverte": true
  }
}
```

**POST /api/casino/sessions/:id/close**
```json
// requête
{ "fond_final": 115000 }
```
```json
// réponse réelle — écart calculé = fond_final - (fond_initial + somme des transactions)
{
  "success": true,
  "data": {
    "id": 1, "cashier_id": 1, "user_id": 1,
    "ouverture_at": "2026-07-03 11:16:00", "fermeture_at": "2026-07-03 11:16:01",
    "fond_initial": 100000, "fond_final": 115000, "ecart": 0, "est_ouverte": false
  }
}
```
*(ici : fond_initial 100 000 + transaction de 15 000 = 115 000 attendu = fond_final déclaré → écart nul)*

#### Cartes de fidélité
| GET | `/api/casino/cards/by-client/:clientId` | Carte d'un client |
| POST | `/api/casino/cards/:id/points` | Créditer des points `{ "points": 50 }` |
| GET/POST/PUT/DELETE | `/api/casino/cards[/​:id]` | CRUD générique |

#### Crédits joueurs
| POST | `/api/casino/credits/grant` | Octroyer un crédit |
| POST | `/api/casino/credits/:id/repay` | Rembourser (réduit l'encours) |
| POST | `/api/casino/credits/:id/draw` | Tirage supplémentaire (augmente l'encours) |
| GET | `/api/casino/credits/by-client/:clientId/active` | Crédits actifs d'un client |
| GET/POST/PUT/DELETE | `/api/casino/credits[/​:id]` | CRUD générique |

**POST /api/casino/credits/grant**
```json
// requête
{ "client_id": 1, "montant": 200000 }
```
```json
// réponse réelle (taux_utilisation calculé par la vue)
{
  "success": true,
  "data": {
    "id": 1, "client_id": 1, "montant_accorde": 200000, "encours": 200000,
    "echeance": null, "statut": "ACTIF", "taux_utilisation": 100
  }
}
```

#### Scores
| GET | `/api/casino/scores/leaderboard?categorie=&limit=` | Classement agrégé par client |
| GET/POST/PUT/DELETE | `/api/casino/scores[/​:id]` | CRUD générique |

```json
// réponse type
{
  "success": true,
  "data": [
    { "client_id": 1, "nom": "Andria", "prenom": "Voahangy", "total_score": 1450 },
    { "client_id": 4, "nom": "Rasoa", "prenom": "Mamy", "total_score": 1120 }
  ]
}
```

#### Jetons
| POST | `/api/casino/chips/buy` | Achat de jetons |
| POST | `/api/casino/chips/sell` | Reprise de jetons |
| GET | `/api/casino/chips/by-client/:clientId` | Historique d'un client |
| GET/POST/PUT/DELETE | `/api/casino/chips[/​:id]` | CRUD générique |

**POST /api/casino/chips/buy**
```json
// requête
{ "client_id": 1, "quantite": 20, "valeur_unitaire": 5000 }
```
```json
// réponse réelle (montant_total calculé par la vue)
{
  "success": true,
  "data": {
    "id": 1, "client_id": 1, "transaction_type": "ACHAT",
    "quantite": 20, "valeur_unitaire": 5000,
    "created_at": "2026-07-03 11:16:00", "montant_total": 100000
  }
}
```

#### Visites de salle
| POST | `/api/casino/visits/check-in` | Entrée `{ "client_id", "room_id" }` |
| POST | `/api/casino/visits/:id/check-out` | Sortie |
| GET | `/api/casino/visits/in-room/:roomId` | Présents actuellement dans une salle |
| GET/POST/PUT/DELETE | `/api/casino/visits[/​:id]` | CRUD générique |

```json
// réponse réelle POST /api/casino/visits/check-in
{
  "success": true,
  "data": { "id": 1, "client_id": 1, "room_id": 1, "entree_at": "2026-07-03 11:16:00", "sortie_at": null, "en_cours": true }
}
```

#### Transactions financières
| POST | `/api/casino/transactions/record` | Enregistrer un mouvement rattaché à une session |
| GET/POST/PUT/DELETE | `/api/casino/transactions[/​:id]` | CRUD générique |

### 5.5 Hébergement (`/api/hebergement`)

| Méthode | Route | Description |
|---|---|---|
| GET | `/rooms/available?room_type_id=` | Chambres libres |
| GET | `/rooms/availability?room_id=&date_arrivee=&date_depart=` | Disponibilité sur période |
| GET | `/rooms/stats` | Statistiques agrégées (total, taux d'occupation, répartition par statut et par type) |
| PUT | `/rooms/:id/status` | Changer uniquement le statut (journalisé dans `room_status_history`) |
| CRUD | `/rooms[/​:id]`, `/room-types`, `/room-minibar`, `/room-status-history` | Référentiels |
| GET | `/equipments/categories` | Liste des catégories distinctes |
| GET | `/equipments/stats` | Statistiques agrégées (total, répartition par catégorie et par statut d'installation) |
| GET | `/equipments/code/:code` | Récupérer un équipement par son code |
| CRUD | `/equipments[/​:id]` | Référentiel |
| PUT | `/room-equipments/:id/status` | Changer uniquement le statut d'un équipement installé en chambre |
| CRUD | `/room-equipments[/​:id]` | Référentiel |
| GET | `/room-maintenance/stats` | Statistiques agrégées (total, coût cumulé, répartition par statut / type d'intervention) |
| PUT | `/room-maintenance/:id/status` | Changer uniquement le statut (`date_resolution` posée auto si TERMINE/ANNULE) |
| CRUD | `/room-maintenance[/​:id]` | Référentiel |
| POST | `/reservations` | Créer réservation + accompagnants (transaction, vérifie la disponibilité) |
| GET | `/reservations/stats` | Statistiques agrégées (total, CA, montant moyen, répartition par statut) |
| CRUD | `/reservations[/​:id]`, `/reservation-guests` | — |
| POST | `/stays/check-in/:reservationId` | Check-in (chambre → OCCUPEE) |
| POST | `/stays/check-out/:stayId` | Check-out (chambre → NETTOYAGE) |
| CRUD | `/stays` | — |
| GET | `/housekeeping/stats` | Statistiques agrégées (total, répartition par statut et par type de tâche) |
| PUT | `/housekeeping/:id/status` | Changer uniquement le statut (`completed_at` posée auto si TERMINE) |
| CRUD | `/housekeeping`, `/lost-and-found`, `/minibar-consumptions` | — |

```json
// réponse type GET /api/hebergement/rooms/availability?room_id=3&date_arrivee=2026-08-01&date_depart=2026-08-05
{ "success": true, "data": { "room_id": 3, "disponible": true } }
```

```json
// réponse type GET /api/hebergement/rooms/stats
{
  "success": true,
  "data": {
    "total": 20,
    "taux_occupation": 0.35,
    "par_statut": [
      { "statut": "LIBRE", "total": 9 },
      { "statut": "RESERVEE", "total": 3 },
      { "statut": "OCCUPEE", "total": 7 },
      { "statut": "NETTOYAGE", "total": 1 }
    ],
    "par_type": [
      { "room_type": "Standard", "total": 12 },
      { "room_type": "Suite", "total": 5 },
      { "room_type": "Familiale", "total": 3 }
    ]
  }
}
```

```json
// réponse type PUT /api/hebergement/rooms/3/status  { "statut": "NETTOYAGE" }
{
  "success": true,
  "data": { "id": 3, "room_type_id": 1, "numero": "101", "capacite": 2, "prix_nuit": 120000, "statut": "NETTOYAGE" }
}
```

```json
// réponse type GET /api/hebergement/equipments/categories
{ "success": true, "data": ["CLIMATISATION", "ELECTROMENAGER", "MOBILIER", "SANITAIRE"] }
```

```json
// réponse type GET /api/hebergement/equipments/stats
{
  "success": true,
  "data": {
    "total_equipments": 18,
    "par_categorie": [
      { "categorie": "CLIMATISATION", "total": 4 },
      { "categorie": "ELECTROMENAGER", "total": 6 },
      { "categorie": "MOBILIER", "total": 8 }
    ],
    "installations_par_statut": [
      { "statut": "BON", "total": 40 },
      { "statut": "EN_PANNE", "total": 3 },
      { "statut": "REMPLACE", "total": 2 },
      { "statut": "HORS_SERVICE", "total": 1 }
    ]
  }
}
```

```json
// réponse type GET /api/hebergement/equipments/code/CLIM-001
{ "success": true, "data": { "id": 2, "code": "CLIM-001", "nom": "Climatiseur split", "categorie": "CLIMATISATION" } }
```

```json
// réponse type PUT /api/hebergement/room-equipments/7/status  { "statut": "EN_PANNE" }
{
  "success": true,
  "data": { "id": 7, "room_id": 3, "equipment_id": 2, "quantite": 1, "statut": "EN_PANNE" }
}
```

```json
// réponse type POST /api/hebergement/reservations
{
  "success": true,
  "data": {
    "id": 12, "client_id": 1, "room_id": 3,
    "date_arrivee": "2026-08-01", "date_depart": "2026-08-05",
    "montant_total": 480000, "statut": "CONFIRMEE"
  }
}
```

```json
// réponse type PUT /api/hebergement/room-maintenance/4/status  { "statut": "TERMINE" }
{
  "success": true,
  "data": {
    "id": 4, "room_id": 2, "type_intervention": "CORRECTIVE", "statut": "TERMINE",
    "date_declaration": "2026-07-01", "date_resolution": "2026-07-06 10:42:00", "cout": 15000
  }
}
```

```json
// réponse type GET /api/hebergement/room-maintenance/stats
{
  "success": true,
  "data": {
    "total": 12,
    "cout_total": 185000,
    "par_statut": [
      { "statut": "OUVERT", "total": 3, "cout_total": 0 },
      { "statut": "EN_COURS", "total": 2, "cout_total": 20000 },
      { "statut": "TERMINE", "total": 7, "cout_total": 165000 }
    ],
    "par_type_intervention": [
      { "type_intervention": "PREVENTIVE", "total": 5, "cout_total": 50000 },
      { "type_intervention": "CORRECTIVE", "total": 6, "cout_total": 120000 },
      { "type_intervention": "URGENCE", "total": 1, "cout_total": 15000 }
    ]
  }
}
```

```json
// réponse type GET /api/hebergement/reservations/stats
{
  "success": true,
  "data": {
    "total": 34,
    "montant_total": 8560000,
    "montant_moyen": 251764.7,
    "par_statut": [
      { "statut": "CONFIRMEE", "total": 10, "montant_total": 2400000 },
      { "statut": "EN_COURS", "total": 6, "montant_total": 1560000 },
      { "statut": "TERMINEE", "total": 15, "montant_total": 4100000 },
      { "statut": "ANNULEE", "total": 3, "montant_total": 500000 }
    ]
  }
}
```

```json
// réponse type PUT /api/hebergement/housekeeping/9/status  { "statut": "TERMINE" }
{
  "success": true,
  "data": {
    "id": 9, "room_id": 5, "type_tache": "NETTOYAGE", "statut": "TERMINE",
    "planned_at": "2026-07-06 08:00:00", "completed_at": "2026-07-06 08:24:00"
  }
}
```

```json
// réponse type GET /api/hebergement/housekeeping/stats
{
  "success": true,
  "data": {
    "total": 25,
    "par_statut": [
      { "statut": "A_FAIRE", "total": 6 },
      { "statut": "EN_COURS", "total": 3 },
      { "statut": "TERMINE", "total": 16 }
    ],
    "par_type_tache": [
      { "type_tache": "NETTOYAGE", "total": 14 },
      { "type_tache": "CHANGEMENT_DRAPS", "total": 6 },
      { "type_tache": "DESINFECTION", "total": 3 },
      { "type_tache": "CONTROLE", "total": 2 }
    ]
  }
}
```

### 5.6 Restaurant (`/api/restaurant`)

| Méthode | Route | Description |
|---|---|---|
| CRUD | `/tables[/​:id]` | Tables du restaurant |
| POST | `/orders` | Créer commande + lignes (montant_total calculé) |
| GET | `/orders/in-progress?statut=` | Commandes en cours |
| GET | `/orders/:id/detail` | Commande + lignes + nom produit |
| CRUD | `/orders[/​:id]`, `/order-items` | — |
| GET | `/recipes/:id/requirements?portions=` | Besoins en ingrédients pour N portions |
| CRUD | `/recipes`, `/recipe-items`, `/cashiers`, `/sessions` | — |

```json
// requête POST /api/restaurant/orders
{ "client_id": 1, "items": [{ "product_id": 2, "quantite": 2, "prix_unitaire": 12000 }] }
```
```json
// réponse type
{ "success": true, "data": { "id": 5, "client_id": 1, "source_module": "RESTAURANT", "montant_total": 24000, "statut": "EN_COURS", "created_at": "2026-07-03 11:20:00" } }
```

### 5.7 Stock (`/api/stock`)

| Méthode | Route | Description |
|---|---|---|
| CRUD | `/categories`, `/product-types`, `/units`, `/products`, `/locations` | Référentiels |
| GET | `/alerts/low-stock?threshold=` | Produits sous le seuil |
| GET | `/products/:id/stock` | Stock d'un produit par emplacement |
| CRUD | `/stocks[/​:id]` | — |
| POST | `/movements` | Mouvement de stock (met à jour `stocks` automatiquement) |
| CRUD | `/movements`, `/suppliers` | — |
| POST | `/purchases` | Achat fournisseur + lignes + réception auto en stock |
| CRUD | `/purchases`, `/purchase-items` | — |

**POST /api/stock/movements**
```json
// requête
{ "product_id": 1, "location_id": 1, "type": "ENTREE", "quantite": 50, "source_module": "MANUEL" }
```
```json
// réponse réelle
{
  "success": true,
  "data": { "id": 1, "product_id": 1, "location_id": 1, "type_mouvement": "ENTREE", "quantite": "50.00", "source_module": "MANUEL", "reference_id": null, "created_at": "2026-07-03 11:16:20" }
}
```

**GET /api/stock/alerts/low-stock?threshold=60**
```json
// réponse réelle
{ "success": true, "data": [{ "id": 1, "nom": "Rhum arrangé", "code": "BOI-001", "location_id": 1, "quantite": "50.00" }] }
```

### 5.8 Finance (`/api/finance`)

| Méthode | Route | Description |
|---|---|---|
| POST | `/invoices` | Créer facture + lignes |
| GET | `/invoices/:id/detail` | Facture + lignes + paiements |
| CRUD | `/invoices`, `/invoice-items` | — |
| POST | `/payments` | Enregistrer un paiement (bascule statut facture, journalise dans financial_transactions) |
| CRUD | `/payments` | — |
| GET | `/clients/:clientId/statement` | Relevé consolidé tous modules |
| CRUD | `/transactions` | financial_transactions |

```json
// requête POST /api/finance/payments
{ "client_id": 1, "invoice_id": 3, "montant": 25000, "moyen_paiement": "ESPECES" }
```
```json
// réponse type
{
  "success": true,
  "data": {
    "payment": { "id": 9, "client_id": 1, "invoice_id": 3, "montant": 25000, "moyen_paiement": "ESPECES" },
    "invoiceStatus": "PARTIELLE"
  }
}
```

---

## 6. Erreurs courantes

| Cas | Réponse |
|---|---|
| Ressource introuvable | `404` `{ "error": { "message": "Client #9999 introuvable" } }` |
| Champ requis manquant | `400` `{ "error": { "message": "client_id et montant sont requis" } }` |
| Sans token sur route protégée | `401` `{ "error": { "message": "Token manquant" } }` |
| Doublon (contrainte unique) | `409` `{ "error": { "message": "Cette ressource existe déjà..." } }` |
| Clé étrangère invalide | `400` `{ "error": { "message": "Référence invalide : la ressource liée n'existe pas." } }` |

## 7. Point d'attention hérité de l'analyse du schéma

`casino_chip_transactions` n'a toujours pas de `session_id` dans le schéma actuel (voir
documentation précédente) : le modèle `recordChipTransaction` reflète cet état. Si la migration
`ALTER TABLE casino_chip_transactions ADD COLUMN session_id ...` est appliquée un jour, il suffit
d'ajouter `sessionId` aux paramètres de `recordChipTransaction` dans `models/casinoModel.js` et
au corps attendu par `buyChipsHandler` / `sellChipsHandler`.
