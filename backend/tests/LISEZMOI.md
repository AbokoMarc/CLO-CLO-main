# Tests du backend (à lancer sur une base de TEST — ils créent des comptes et des produits)

Démarrez le backend (`npm start`, port 4000) avec : `ADMIN_USERNAME=admin ADMIN_PASSWORD=adminpass1 MOMO_NUMBER=670000000 JWT_SECRET=<32+ caractères>`.

| Fichier | Ce qu'il vérifie |
|---|---|
| `e2e.mjs` | commande (quantité négative, produit indisponible, double envoi), annulation et points, paiement Mobile Money manuel, messagerie traiteur et droits, parrainage |
| `location.mjs` | position du livreur (validation, cap, trajet, anti-saturation, SSE temps réel) |
| `auth-limitation-reset.mjs` | verrouillage après 6 essais, « mot de passe oublié » (code envoyé seulement par l'admin, 5 essais, usage unique) |
| `planificateur-fcm.mjs` | tâches planifiées + notifications natives FCM (signature JWT, canaux Android, jetons morts supprimés, aucune alerte en double). Se lance seul : `node tests/planificateur-fcm.mjs` (nécessite une base de test locale, pas un serveur démarré) |
