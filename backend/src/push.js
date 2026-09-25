/* ============================================================
   CLO-CLO Backend | push.js
   Notifications PUSH réelles (arrivent même si l'app/onglet est
   fermé) via le standard Web Push, séparées des notifications
   SSE (notify.js) qui ne marchent que app ouverte.
   ============================================================ */
import webpush from "web-push";
import { config } from "./config.js";

let vapidKeys;
if (config.vapidPublicKey && config.vapidPrivateKey) {
  vapidKeys = { publicKey: config.vapidPublicKey, privateKey: config.vapidPrivateKey };
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  console.warn(
    "⚠️  VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY absents : une paire de clés temporaire a été " +
    "générée pour cette session uniquement. Ajoutez ces deux valeurs à vos variables " +
    "d'environnement (Render) pour que les abonnements aux notifications push survivent " +
    "aux redémarrages du serveur :\n" +
    `   VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\n` +
    `   VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`
  );
}

webpush.setVapidDetails("mailto:contact@cloclo.app", vapidKeys.publicKey, vapidKeys.privateKey);

export const VAPID_PUBLIC_KEY = vapidKeys.publicKey;

/** Envoie une notification push à un abonnement précis. Retourne { expired: true }
    si l'abonnement n'est plus valide (l'appelant doit alors le supprimer). */
export async function sendPush(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) return { expired: true };
    console.error("Erreur envoi push :", err.message);
    return { ok: false };
  }
}
