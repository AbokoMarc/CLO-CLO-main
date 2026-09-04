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
  adminPhone: process.env.ADMIN_PHONE || "",
  nodeEnv: process.env.NODE_ENV || "development",
  // Base de données Turso (libSQL) — persiste réellement les données,
  // contrairement au disque de Render qui peut être réinitialisé.
  // En local, si TURSO_DATABASE_URL est absent, on retombe sur un
  // fichier SQLite local (backend/data/cloclo.sqlite) pour développer
  // sans compte Turso.
  tursoUrl: process.env.TURSO_DATABASE_URL || "file:./data/cloclo.sqlite",
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN || undefined,
  // Notifications push (arrivent même app/onglet fermé). Si absentes, le
  // serveur génère une paire de clés temporaire au démarrage (voir push.js)
  // — mais elle change à chaque redémarrage, invalidant les abonnements
  // existants. Définissez-les une fois pour de bon en production.
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY?.trim() || undefined,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY?.trim() || undefined,
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
if (config.nodeEnv === "production" && config.tursoUrl.startsWith("file:")) {
  console.warn(
    "⚠️  TURSO_DATABASE_URL n'est pas défini en production : les données seront stockées sur le disque " +
    "éphémère de Render et SERONT PERDUES au prochain déploiement/redémarrage. " +
    "Créez une base sur turso.tech (gratuit) et définissez TURSO_DATABASE_URL / TURSO_AUTH_TOKEN."
  );
}
