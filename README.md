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
/backend          API REST (Node.js natif + @libsql/client)
  src/
    repositories/store.js  Accès aux données — VRAIE base Turso (libSQL)
    services/       Logique métier
    controllers/    Adaptateurs HTTP
    notify.js       Notifications temps réel (SSE)
    bootstrap.js    Création du compte admin + zones au 1er démarrage
    routes.js       Table de routage
  server.js       Point d'entrée
  Dockerfile      Image pour déploiement conteneurisé
  render.yaml     Config de déploiement Render (backend)
```

## Base de données
**Turso (libSQL)** — une vraie base de données distante, persistante,
au tier gratuit généreux. Contrairement à un fichier SQLite posé sur le
disque de Render (effacé à chaque redéploiement/redémarrage sur le plan
gratuit), Turso conserve les données indéfiniment.

En local, si `TURSO_DATABASE_URL` n'est pas défini dans `.env`, le
serveur retombe automatiquement sur un fichier SQLite local
(`backend/data/cloclo.sqlite`) — aucun compte Turso requis pour
développer.

**Configurer Turso pour la production (5 min, gratuit) :**
```bash
# 1) Créer un compte sur https://turso.tech puis installer le CLI
curl -sSfL https://get.tur.so/install.sh | bash

# 2) Créer la base
turso db create cloclo

# 3) Récupérer l'URL et le token
turso db show cloclo --url
turso db tokens create cloclo
```
Renseignez ensuite `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN` dans les
variables d'environnement de Render (ou votre `.env` local).

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
npm install      # installe @libsql/client
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
- ⚠️ Définissez `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN` (voir section
  "Base de données" ci-dessus) — sinon les données seront perdues à
  chaque redéploiement/redémarrage sur le plan gratuit de Render.
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

## Fonctionnalités ajoutées récemment
- **Notifications temps réel** (SSE) : admin, livreurs et clients sont
  notifiés instantanément (nouvelle commande, assignation, annulation).
- **Annulation de commande** : le client peut annuler tant que sa
  commande est encore "en préparation" (bouton sur `suivie.html`).
- **Paie des livreurs** : l'admin fixe un salaire journalier ou mensuel
  par livreur (`admin-livreurs.html`) — distinct de l'argent que le
  livreur encaisse en cash chez les clients (affiché séparément).
- **Sécurité admin** : réinitialisation du mot de passe d'un client,
  changement de son propre mot de passe (les 3 rôles), verrou de
  confidentialité sur `admin-clients.html` (re-saisie du mot de passe
  admin avant d'afficher tel/email/adresse), bouton "Voir le site".
- **Accès admin discret** : `connexion-directeur.html` n'est plus lié
  visiblement depuis `connexion.html`, mais reste accessible par URL
  directe.
- **FR/EN** : bouton de langue dans la navbar/sidebar (`i18n.js`),
  traduit les éléments d'interface (navigation, boutons, statuts). Le
  contenu propre aux produits (noms, descriptions saisis par l'admin)
  n'est pas traduit automatiquement.
