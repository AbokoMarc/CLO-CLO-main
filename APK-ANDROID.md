# APK Android (Capacitor) — notifications natives + GPS arrière-plan

L'APK est une « coque » Capacitor qui ouvre votre site (`server.url` dans `capacitor.config.json`).
Vous n'avez donc **pas** à reconstruire l'APK à chaque changement du site : seul un changement des plugins ou des permissions l'exige.

## Ce que l'APK apporte (et que le navigateur ne peut pas faire)
- **Notifications push natives** (Firebase Cloud Messaging) : elles arrivent application fermée, téléphone verrouillé, avec son et bannière.
- **GPS du livreur en arrière-plan** : la position continue d'être envoyée écran verrouillé (une notification permanente « Livraison en cours » est affichée par Android, c'est obligatoire).
- Le toucher d'une notification ouvre directement la bonne page.

## 1. Créer le projet Firebase (gratuit, ~10 min)
1. https://console.firebase.google.com → **Ajouter un projet** (ex. « clo-clo »).
2. **Paramètres du projet → Vos applications → Android**, identifiant du package : `com.cloclo.app` → télécharger **google-services.json** → le placer dans `android-config/`.
3. **Paramètres du projet → Comptes de service → Générer une nouvelle clé privée** → vous obtenez un fichier JSON.
4. Sur **Render** (backend) : variable `FCM_SERVICE_ACCOUNT` = **tout le contenu** de ce JSON (ou ce JSON encodé en base64).

## 2. Construire l'APK (sur votre ordinateur)
Prérequis : Node 18+, Java 17, Android Studio (SDK installé).
```bash
npm install
npm run android:setup     # crée le dossier android/, copie google-services.json, ajoute les permissions
npm run android:apk       # construit android/app/build/outputs/apk/debug/app-debug.apk
```
Installez l'APK sur le téléphone (envoi par WhatsApp / USB). Pour publier sur le Play Store il faudra un APK/AAB signé (Android Studio → Build → Generate Signed Bundle).

## 3. Autoriser sur le téléphone (important)
- **Notifications** : accepter la demande au premier lancement après connexion.
- **Livreurs — localisation « Toujours »** : Réglages Android → Applications → Clo-Clo → Autorisations → Localisation → **Toujours autoriser** (+ « position précise »).
- **Livreurs — batterie** : Réglages → Batterie → Clo-Clo → **Sans restriction** (certaines marques — Tecno, Infinix, Xiaomi, Huawei — coupent sinon l'application en arrière-plan).

## 4. Tâches planifiées (alertes automatiques)
Le serveur vérifie toutes les minutes (voir `backend/src/scheduler.js`) : commande sans livreur, livraison non acceptée, GPS muet, paiement en attente/à vérifier, commande programmée, demande d'avis, message traiteur sans réponse, résumé du jour à 20 h, + « livreur arrive » / « livreur arrivé » en temps réel.
Sur Render **gratuit** le serveur s'endort : ces tâches ne tournent pas pendant son sommeil. Deux solutions :
- **Ping toutes les 5 minutes** (cron-job.org ou UptimeRobot, gratuits) vers `https://VOTRE-API/api/cron/run?key=VOTRE_CLE` — il réveille le serveur ET lance les tâches. Définissez `CRON_SECRET` sur Render (une longue chaîne aléatoire) et utilisez la même valeur dans l'URL (ou l'en-tête `x-cron-secret`).
- Ou passer l'instance Render en offre payante (toujours allumée).
