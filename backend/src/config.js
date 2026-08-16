/* ============================================================
   CLO-CLO Backend | config.js
   Centralise la lecture des variables d'environnement.
   Ne jamais mettre de vrais secrets ici — voir .env.example
   ============================================================ */
export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  jwtSecret: process.env.JWT_SECRET || "",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  adminUsername: process.env.ADMIN_USERNAME || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  nodeEnv: process.env.NODE_ENV || "development",
};

if (!config.jwtSecret) {
  console.error("❌ JWT_SECRET n'est pas défini. Copiez backend/.env.example vers backend/.env et configurez-le (ex: openssl rand -hex 32).");
  process.exit(1);
}
if (config.jwtSecret.length < 16) {
  console.error("❌ JWT_SECRET est trop court (16 caractères minimum). Utilisez une vraie valeur aléatoire.");
  process.exit(1);
}
if (config.nodeEnv === "production" && config.corsOrigin === "*") {
  console.warn("⚠️  CORS_ORIGIN=\"*\" en production : n'importe quel site peut appeler votre API. Restreignez à l'URL exacte du frontend.");
}
