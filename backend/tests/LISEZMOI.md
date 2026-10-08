# Test de bout en bout du backend
Démarrez le backend (`npm start`, port 4000, avec `ADMIN_USERNAME=admin ADMIN_PASSWORD=adminpass1 MOMO_NUMBER=670000000`),
puis lancez `node tests/e2e.mjs`. 26 scénarios : commande (quantité négative, produit indisponible, double envoi),
annulation et points, paiement Mobile Money manuel, messagerie traiteur et droits d'accès, parrainage.
À lancer sur une base de TEST (le script crée des comptes et des produits).
