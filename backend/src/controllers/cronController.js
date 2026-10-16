import crypto from "node:crypto";
import { runAll } from "../scheduler.js";
import { sendJson } from "../http.js";

/** Déclenchement externe des tâches planifiées (cron-job.org, UptimeRobot, GitHub Actions…).
    Protégé par CRON_SECRET (en-tête x-cron-secret ou paramètre ?key=). Réveille aussi un serveur gratuit endormi. */
export const CronController = {
  async run({ req, res, query }) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return sendJson(res, 503, { error: "Tâches planifiées externes désactivées (CRON_SECRET non défini)." });
    const given = String(req.headers["x-cron-secret"] || query?.key || "");
    const a = Buffer.from(given), b = Buffer.from(secret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return sendJson(res, 401, { error: "Clé invalide." });
    sendJson(res, 200, { ok: true, ran: await runAll() });
  },
};
