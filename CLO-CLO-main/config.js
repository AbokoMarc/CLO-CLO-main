/* ============================================================
   CLO-CLO Frontend | config.js
   Point unique de configuration d'environnement pour le
   frontend statique. Charger CE fichier en premier, avant tout
   autre script.

   ⚠️ AVANT DE DÉPLOYER EN PRODUCTION : remplacez API_BASE_URL
   par l'URL réelle de votre backend déployé (ex: Render, Railway).
   ============================================================ */
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

window.CLOCLO_CONFIG = {
  API_BASE_URL: isLocal ? "http://localhost:4000/api" : "https://clo-clo-main.onrender.com/api",
};
