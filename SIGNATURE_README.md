# Module Signature électronique — `signatureRoutes.js`

Module **générique, transversal et append-only** : n'importe quelle entité
« signable » (fiche KYC aujourd'hui, opération de caisse casino demain) peut
être signée électroniquement, identifiée par un couple `(signable_type,
signable_id)`. Chaque signature est un **nouvel enregistrement** — on n'écrase
jamais une signature précédente, l'historique complet est conservé.

Ce module n'est **pas** propre au casino : il est pensé pour être réutilisé
par n'importe quel module de l'application (casino, restaurant, boutique...)
qui a besoin de faire signer un client.

---

## Montage dans l'app

Le router n'est pas monté automatiquement. À ajouter dans le fichier principal
(`app.js` / `server.js`), avec la même protection `requireAuth` que les autres
modules :

```js
app.use('/api/signatures', requireAuth, require('./routes/signatureRoutes'));
```

Le module KYC (routes `/api/clients/:id/kyc/...`) est déjà monté avec
`clientRoutes.js` et n'a rien de plus à faire de ce côté.

---

## Principes

- **Append-only** : `POST` crée toujours une nouvelle ligne. Il n'existe
  aucune route de mise à jour (`PUT`) sur une signature. Une re-signature (le
  client signe une seconde fois sa fiche KYC, par exemple) ajoute une ligne,
  ne remplace pas la précédente.
- **Générique / polymorphe** : `signable_type` (string) + `signable_id`
  (l'id de la ligne signée, peu importe sa table d'origine) désignent
  l'entité signée. Le module n'a aucune dépendance vers les tables métier.
- **Types connus** : la liste `SIGNABLE_TYPES` dans
  `controllers/signatureController.js` fait office de whitelist — tout type
  non listé est rejeté en **400**. Voir « Intégration caisse » pour l'étendre.
- **Suppression ciblée uniquement** : `DELETE /api/signatures/id/:signatureId`
  supprime **une** signature précise (ex. erreur de saisie), jamais tout
  l'historique d'une entité.

---

## Modèle de données — table `signatures`

| Colonne | Type | Description |
|---|---|---|
| `id` | bigint UNSIGNED, PK | |
| `signable_type` | varchar(50) | Ex: `client_kyc`, `chip_transaction`, `cash_operation`, `casino_credit`... |
| `signable_id` | bigint UNSIGNED | Id de la ligne signée dans sa table d'origine |
| `client_id` | bigint UNSIGNED, nullable | FK `clients.id` |
| `signature_data` | longtext | Image de la signature encodée en base64 (data URI PNG) |
| `signed_at` | datetime | Horodatage de la signature |
| `created_at` | datetime | |

Migration : `migration_signatures.sql`.

---

## Endpoints génériques — `/api/signatures`

### `GET /:type/:id`
Dernière signature connue pour cette entité.
**Sortie 200** : la signature, ou `null` si aucune.
```json
{
  "id": 41, "signable_type": "chip_transaction", "signable_id": 918,
  "client_id": 55, "signature_data": "data:image/png;base64,iVBORw0K...",
  "signed_at": "2026-07-07 14:32:10", "created_at": "2026-07-07 14:32:10"
}
```

### `GET /:type/:id/history`
Historique complet, du plus récent au plus ancien.
**Sortie 200** : tableau de signatures (même forme que ci-dessus).

### `POST /:type/:id`
Enregistre une **nouvelle** signature (jamais un remplacement).
**Entrée**
```json
{ "signature_data": "data:image/png;base64,iVBORw0K...", "client_id": 55 }
```
`signature_data` **requis**. **Sortie 201** : la signature créée. **400** si
`signature_data` manquant ou `type` inconnu (hors `SIGNABLE_TYPES`).

### `DELETE /id/:signatureId`
Supprime une signature précise (correction admin). **Sortie 204**.

---

## Endpoints KYC (déjà branchés) — `/api/clients/:id/kyc/signature`

Wrapper de confort au-dessus du module générique
(`signable_type = 'client_kyc'`, `signable_id = client.id`).

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/clients/:id/kyc/signature` | Dernière signature liée à la déclaration KYC |
| GET | `/api/clients/:id/kyc/signature/history` | Historique complet des signatures KYC de ce client |
| POST | `/api/clients/:id/kyc/signature` | Enregistre une nouvelle signature (`{ signature_data }`) |

La fiche KYC (et donc sa signature) est disponible pour **tous les clients**,
pas seulement les joueurs de casino.

---

## Codes d'erreur communs

| Code | Cas |
|---|---|
| 400 | `signature_data` manquant, `signable_type` inconnu |
| 401 | Token manquant/invalide (`requireAuth`) |
| 404 | Client introuvable (routes KYC) ou signature introuvable (`DELETE /id/:signatureId`) |

---

## Intégration caisse (à venir) — comment brancher un nouveau type

Le module est prêt à être réutilisé pour signer une **recave** (`/chips/buy`),
une **reprise de jetons** (`/chips/sell`), une **opération de caisse**
(`/operations/buy-in|cash-out|deposit`) ou un **crédit** (`/credits/grant|
draw|repay`). Voir `CASINO_README.md` pour le détail de ces routes.

### 1. Déclarer le nouveau type
Dans `controllers/signatureController.js` :
```js
const SIGNABLE_TYPES = [
  'client_kyc',
  'chip_transaction',   // recave (/chips/buy) et reprise (/chips/sell)
  'cash_operation',     // buy-in, cash-out, deposit
  'casino_credit',      // grant, draw, repay
];
```
(les noms correspondent aux tables réellement écrites par `casinoController.js` — `chip_transactions`, `cash_operations`, `casino_credits`).

### 2. Signer depuis le frontend, juste après l'opération

Aucun contrôleur casino à modifier pour un premier jet : le frontend appelle
la route générique juste après avoir reçu le `201` de l'opération, avec l'id
qui vient d'être créé.

```ts
// Après un POST /api/casino/chips/buy réussi (recave)
const movement = await chipsService.buy({ session_id, chip_type_id, quantite, client_id });

// Le client signe sur la tablette
<SignaturePad onChange={(dataUrl) => {
  if (dataUrl) {
    signatureService.createSignature('chip_transaction', movement.id, dataUrl, client_id);
  }
}} />
```

### 3. (Optionnel, plus tard) Wrapper dédié côté backend
Si tu veux forcer la signature à être **obligatoire** pour valider certaines
opérations (ex: recave au-dessus d'un certain montant), le plus sûr est de
suivre le même pattern que `clientController.saveKycSignature` : un endpoint
dédié dans `casinoController.js` (ex: `POST /api/casino/chips/:id/signature`)
qui vérifie que le mouvement existe avant d'appeler `createSignature()`
directement (import JS du modèle, pas de second aller-retour HTTP), plutôt
que de laisser le frontend appeler la route générique brute pour une
opération financière.

### 4. Configuration future — rendre la signature obligatoire ou non

Rien n'est câblé pour l'instant : ni obligation, ni seuil. Quand le besoin
sera confirmé, le plus cohérent avec l'existant est de réutiliser le même
mécanisme clé/valeur que `scoring_config` (voir `GET/PUT /api/casino/scoring/config`
dans `CASINO_README.md`) plutôt que d'inventer un nouveau système :

| Clé suggérée | Exemple de valeur | Usage |
|---|---|---|
| `signature_obligatoire_recave` | `1` | Bloque la validation d'une recave tant qu'aucune signature n'est enregistrée |
| `signature_obligatoire_reprise` | `1` | Idem pour une reprise de jetons |
| `signature_seuil_montant` | `500000` | Signature obligatoire uniquement au-delà de ce montant (Ariary) |
| `signature_obligatoire_credit` | `1` | Signature obligatoire à l'octroi d'un crédit (`/credits/grant`) |

Ces clés ne sont **pas encore lues** par le code : à implémenter dans les
contrôleurs concernés (`chipsController`, `operationsController`,
`creditsController`) le jour où la caisse sera effectivement branchée dessus
— vérifier la clé pertinente avant de renvoyer `201`, ou renvoyer un `409`
si la signature est absente alors qu'elle est requise.

### 5. Frontend — composant réutilisable

`components/SignaturePad.tsx` est indépendant de tout domaine métier :
canvas tactile/souris, callback `onChange(dataUrl | null)`. Il suffit de le
poser dans n'importe quel écran caisse et de brancher
`signatureService.createSignature(type, id, dataUrl, clientId)` au bon
moment (voir exemple § 2).