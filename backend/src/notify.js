/* ============================================================
   CLO-CLO Backend | notify.js
   Notifications temps réel via Server-Sent Events (SSE) —
   natif HTTP, zéro dépendance npm. Un client (admin, livreur,
   client) ouvre une connexion persistante sur
   /api/notifications/stream et reçoit un flux d'évènements
   dès qu'une commande est créée, assignée, mise à jour ou
   annulée.

   Canaux : "admin" | "livreur:<id>" | "client:<id>"
   ============================================================ */

const channels = new Map(); // canal -> Set<res>

import { Store } from "./repositories/store.js";
import { sendPush } from "./push.js";

export function subscribe(channel, res) {
  if (!channels.has(channel)) channels.set(channel, new Set());
  channels.get(channel).add(res);
  res.on("close", () => {
    channels.get(channel)?.delete(res);
    if (channels.get(channel)?.size === 0) channels.delete(channel);
  });
}

export function publish(channel, event, data) {
  const set = channels.get(channel);
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try { res.write(payload); } catch { /* connexion fermée entretemps */ }
  }
}

/** Diffuse un évènement lié à une commande vers tous les canaux concernés. */
export function notifyOrderEvent(event, order) {
  publish("admin", event, order);
  if (order.livreurId) publish(`livreur:${order.livreurId}`, event, order);
  if (order.userId) publish(`client:${order.userId}`, event, order);

  const PUSH_MESSAGES = {
    "order:new": { title: "🆕 Nouvelle commande", body: `Commande CMD-${order.id} reçue.` },
    "order:assigned": { title: "🚚 Livraison assignée", body: `Une nouvelle livraison vous a été confiée (CMD-${order.id}).` },
    "order:accepted": { title: "✅ Livraison acceptée", body: `Le livreur a accepté la commande CMD-${order.id}. Le chat est ouvert.` },
    "order:started": { title: "🛵 Livraison en route", body: `Le livreur a démarré la livraison CMD-${order.id}.` },
    "order:updated": { title: "📦 Commande mise à jour", body: `Votre commande CMD-${order.id} a changé de statut.` },
    "order:confirmation": { title: "🔔 Confirmation de livraison", body: `Une confirmation a été enregistrée pour CMD-${order.id}.` },
    "order:cancelled": { title: "❌ Commande annulée", body: `La commande CMD-${order.id} a été annulée.` },
    "order:message": { title: "💬 Nouveau message", body: `Nouveau message sur la commande CMD-${order.id}.` },
  };
  const msg = PUSH_MESSAGES[event];
  if (!msg) return;

  const targetChannels = ["admin"];
  if (order.livreurId) targetChannels.push(`livreur:${order.livreurId}`);
  if (order.userId) targetChannels.push(`client:${order.userId}`);
  for (const channel of targetChannels) pushToChannel(channel, msg);
}

/** Alerte SOS déclenchée pendant une livraison active — priorité maximale,
    toujours envoyée à l'admin (et à l'autre partie : livreur si le client
    a déclenché, client si c'est le livreur). */
export function notifySos(order, role, location) {
  const payload = { ...order, sosBy: role, location };
  publish("admin", "order:sos", payload);
  const otherChannel = role === "client" ? `livreur:${order.livreurId}` : `client:${order.userId}`;
  if (order.livreurId || order.userId) publish(otherChannel, "order:sos", payload);

  const who = role === "client" ? "Le client" : "Le livreur";
  const msg = { title: "🆘 ALERTE URGENCE", body: `${who} a déclenché une alerte SOS sur la commande CMD-${order.id}.` };
  pushToChannel("admin", msg);
  pushToChannel(otherChannel, msg);
}

/** Envoie une notification PUSH (arrive même app fermée) à tous les abonnements
    d'un canal donné. Best-effort : une erreur d'envoi n'interrompt jamais le flux
    principal (créer/mettre à jour une commande ne doit jamais échouer pour ça). */
export async function pushToChannel(channel, { title, body }) {
  try {
    const subs = await Store.all("pushSubs");
    const matching = subs.filter((s) => s.channel === channel);
    for (const sub of matching) {
      const result = await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.authKey } },
        { title, body, url: "/" }
      );
      if (result.expired) await Store.remove("pushSubs", sub.id).catch(() => {});
    }
  } catch { /* jamais bloquant */ }
}
