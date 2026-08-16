# Clo-Clo – Bar à Fruits & Délices

Application de livraison de jus, smoothies, glaces et salades de fruits,
opérant à **Nkolfoulou, Yaoundé, Cameroun**.

## Structure

```
/                 Frontend statique (HTML/CSS/JS, modules ES)
  services/       Clients API (auth, produits, commandes, admin, livreur)
  app-data.js     Store central de l'app client (branché sur l'API)
  app.js          Comportements communs (navbar, panier, toasts)
  admin.js        Logique des pages admin-*.html (dont gestion produits)
  livreur.js      Logique des pages livreur-*.html
/backend          API REST (Node.js natif, zéro dépendance npm)
  src/
    repositories/store.js  Accès aux données — VRAIE base SQLite
    services/       Logique métier
    controllers/    Adaptateurs HTTP
    bootstrap.js    Création du compte admin + zones au 1er démarrage
    routes.js       Table de routage
  data/cloclo.sqlite   Fichier de base de données (créé au 1er lancement)
  server.js       Point d'entrée
  Dockerfile      Image pour déploiement conteneurisé
  render.yaml     Config de déploiement Render (backend)
```

## Base de données
**SQLite réelle** via `node:sqlite` (natif à Node ≥ 22.5, aucune
dépendance npm à installer). Un seul fichier `backend/data/cloclo.sqlite`,
persistant entre les redémarrages. Migration vers PostgreSQL possible
plus tard sans toucher aux services/controllers (seul `store.js` change).

⚠️ **Node.js 22.5 ou supérieur est requis** (`node:sqlite` n'existe pas
avant). Vérifiez avec `node --version`. Sur Render/Railway, précisez la
version via un fichier `.node-version` contenant `22` si nécessaire.

## Lancer le projet en local

**1. Backend**
```bash
cd backend
cp .env.example .env
```
Éditez `.env` et renseignez de VRAIES valeurs :
- `JWT_SECRET` : générez avec `openssl rand -hex 32`
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` : vos identifiants administrateur
  réels (le compte est créé automatiquement au premier démarrage)

```bash
node server.js   # écoute sur http://localhost:4000
```

Le menu est vide au premier démarrage : connectez-vous en admin
(`connexion-directeur.html`) et ajoutez vos vrais produits depuis
**Produits** dans la sidebar.

**2. Frontend**
Modules ES → nécessite un serveur statique (pas de double-clic sur les
fichiers) :
```bash
npx serve .
```
Ouvrez `http://localhost:5500/index.html` (adaptez le port affiché).

## Déploiement en production

**Backend** (Render, Railway, Fly.io, VPS...) :
- Un `Dockerfile` et un `render.yaml` sont fournis dans `backend/`.
- ⚠️ Le fichier SQLite doit être sur un **disque persistant** (pas le
  système de fichiers éphémère par défaut de certaines plateformes) —
  sinon les données disparaissent à chaque redéploiement.
- Configurez `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` et
  `CORS_ORIGIN` (URL exacte du frontend déployé) comme variables
  d'environnement sur la plateforme — jamais dans le code.

**Frontend** (Vercel, Netlify, GitHub Pages...) :
- `vercel.json` fourni pour un déploiement Vercel direct (site 100%
  statique, aucun build).
- **Avant de déployer**, modifiez `config.js` à la racine :
  remplacez `API_BASE_URL` par l'URL réelle de votre backend déployé
  (ex: `https://cloclo-backend.onrender.com/api`).
- Un avertissement s'affiche dans la console si vous oubliez cette étape.

## Comptes
- **Admin** : créé depuis `.env` au premier démarrage (voir ci-dessus).
- **Livreurs** : créés par l'admin depuis `admin-livreurs.html` — un
  mot de passe temporaire est généré et affiché une seule fois, à
  communiquer au livreur.
- **Clients** : inscription libre depuis `inscription.html`.
