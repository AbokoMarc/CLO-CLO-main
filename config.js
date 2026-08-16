/* ============================================================
   CLO-CLO Frontend | config.js
   Point unique de configuration d'environnement pour le
   frontend statique. Charger CE fichier en premier, avant tout
   autre script.

   ⚠️ AVANT DE DÉPLOYER EN PRODUCTION : remplacez API_BASE_URL
   par l'URL réelle de votre backend déployé (ex: Render, Railway).
   ============================================================ */
window.CLOCLO_CONFIG = {
  API_BASE_URL: "http://localhost:4000/api",
};

if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    && window.CLOCLO_CONFIG.API_BASE_URL.includes("localhost")) {
  console.error(
    "⚠️ CLO-CLO : ce site est déployé en ligne mais config.js pointe encore vers " +
    "http://localhost:4000/api. Le site ne fonctionnera pas tant que vous n'aurez " +
    "pas remplacé API_BASE_URL par l'URL réelle de votre backend déployé."
  );
}
