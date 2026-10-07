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

window.CLOCLO_CONFIG = {
  API_BASE_URL: isLocal ? "http://localhost:4000/api" : "https://clo-clo-main.onrender.com/api",
  // Numéro WhatsApp affiché par le bouton flottant, au format international
  // SANS le "+" (ex: Cameroun → "237699000000"). Laisser vide pour masquer le bouton.
  WHATSAPP_NUMBER: "237699876628",
  // Coordonnées affichées dans les pieds de page et le bouton WhatsApp flottant.
  CONTACT_PHONE_DISPLAY: "+237 699876628",
  CONTACT_EMAIL: "alpha.b.35@icloud.com",
};
