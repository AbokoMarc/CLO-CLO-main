/* ============================================================
   CLO-CLO Frontend | config.js
   Point unique de configuration d'environnement pour le
   frontend statique. Charger CE fichier en premier, avant tout
   autre script.

   ⚠️ AVANT DE DÉPLOYER EN PRODUCTION : remplacez API_BASE_URL
   par l'URL réelle de votre backend déployé (ex: Render, Railway).
   ============================================================ */
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

/* Locale des nombres et dates = langue choisie sur le site (clé partagée avec i18n.js). */
window.CLOCLO_LOCALE = () => (localStorage.getItem("cloclo_lang") === "en" ? "en-US" : "fr-FR");

/* Adresse DIRECTE du backend (Render). */
const API_DIRECT = isLocal ? "http://localhost:4000/api" : "https://clo-clo-main.onrender.com/api";

window.CLOCLO_CONFIG = {
  API_BASE_URL: API_DIRECT,   // utilisée par le flux temps réel (SSE) qui doit rester une connexion directe
  /* Adresses essayées dans l'ordre pour les appels API. « /api » = le MÊME domaine que le site (Vercel le
     redirige vers Render, voir vercel.json) : sur certains réseaux mobiles (Orange…) le domaine du site
     passe alors que « onrender.com » est lent ou bloqué. Si la première échoue, la seconde prend le relais. */
  API_BASE_URLS: isLocal ? [API_DIRECT] : ["/api", API_DIRECT],
  // Délais d'attente (ms) avant de passer à l'adresse suivante. Le backend gratuit peut mettre ~45 s à se réveiller.
  API_TIMEOUTS: { proxy: 20000, direct: 50000 },
  // Numéro WhatsApp affiché par le bouton flottant, au format international
  // SANS le "+" (ex: Cameroun → "237699000000"). Laisser vide pour masquer le bouton.
  WHATSAPP_NUMBER: "237699876628",
  // Coordonnées affichées dans les pieds de page et le bouton WhatsApp flottant.
  CONTACT_PHONE_DISPLAY: "+237 699876628",
  CONTACT_EMAIL: "alpha.b.35@icloud.com",
};
