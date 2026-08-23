/* ============================================================
   CLO-CLO Backend | controllers/notificationController.js
   Flux temps réel (SSE). Le token est passé en query string
   (?token=...) car EventSource ne permet pas d'envoyer un
   header Authorization.
   ============================================================ */
import { verifyToken } from "../auth.js";
import { startSSE } from "../http.js";
import { subscribe } from "../notify.js";

export const NotificationController = {
  async stream({ req, res, query }) {
    const payload = verifyToken(query.token);
    if (!payload) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Authentification requise." }));
      return;
    }

    const channel =
      payload.role === "admin" ? "admin" :
      payload.role === "livreur" ? `livreur:${payload.sub}` :
      `client:${payload.sub}`;

    startSSE(res);
    subscribe(channel, res);
  },
};
