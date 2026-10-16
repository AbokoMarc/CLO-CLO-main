import { Store } from "../repositories/store.js";
import { VAPID_PUBLIC_KEY } from "../push.js";
import { sendJson, requireAuth } from "../http.js";

function channelFor(auth) {
  if (auth.role === "admin") return "admin";
  if (auth.role === "livreur") return `livreur:${auth.sub}`;
  return `client:${auth.sub}`;
}

export const PushController = {
  async vapidPublicKey({ res }) {
    sendJson(res, 200, { publicKey: VAPID_PUBLIC_KEY });
  },

  /** Enregistre (ou met à jour) l'abonnement push de l'utilisateur connecté. */
  async subscribe({ req, res, body }) {
    const auth = requireAuth(req);
    const { endpoint, keys } = body?.subscription || body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return sendJson(res, 400, { error: "Abonnement push invalide." });
    }
    const channel = channelFor(auth);
    const existing = await Store.findOne("pushSubs", "endpoint = ?", endpoint);
    if (existing) await Store.update("pushSubs", existing.id, { channel, p256dh: keys.p256dh, authKey: keys.auth });
    else await Store.insert("pushSubs", { channel, endpoint, p256dh: keys.p256dh, authKey: keys.auth });
    sendJson(res, 200, { ok: true });
  },

  /** Enregistre le jeton FCM de l'application Android (Capacitor) pour l'utilisateur connecté. */
  async registerNative({ req, res, body }) {
    const auth = requireAuth(req);
    const token = String(body?.token || "").trim();
    if (token.length < 20 || token.length > 4096) return sendJson(res, 400, { error: "Jeton de notification invalide." });
    const endpoint = `fcm:${token}`, channel = channelFor(auth);
    const existing = await Store.findOne("pushSubs", "endpoint = ?", endpoint);
    if (existing) await Store.update("pushSubs", existing.id, { channel });      // l'appareil change de compte : on le rattache au bon
    else await Store.insert("pushSubs", { channel, endpoint, p256dh: "native", authKey: "native" });
    sendJson(res, 200, { ok: true });
  },

  async unsubscribe({ req, res, body }) {
    requireAuth(req);
    const endpoint = body?.endpoint;
    if (!endpoint) return sendJson(res, 400, { error: "endpoint requis." });
    const existing = await Store.findOne("pushSubs", "endpoint = ?", endpoint);
    if (existing) await Store.remove("pushSubs", existing.id);
    sendJson(res, 200, { ok: true });
  },
};
