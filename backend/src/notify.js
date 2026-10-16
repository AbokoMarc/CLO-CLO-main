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
import { sendFcm } from "./fcm.js";

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

  // Chaque destinataire reçoit un message ADAPTÉ à son rôle (avant : le même texte partait à tout le monde,
  // p. ex. « Une nouvelle livraison vous a été confiée » arrivait aussi chez le client et l'admin).
  for (const [channel, msg] of pushPlan(event, order)) pushToChannel(channel, msg);
}

const STATUT_FR = { en_attente_paiement: "en attente de paiement", en_preparation: "en préparation", assignee: "livreur assigné", acceptee: "acceptée par le livreur", en_livraison: "en route", livree: "livrée", annulee: "annulée" };

/** Qui est prévenu de quoi (exporté pour les tests). */
export function pushPlan(event, order) {
  const id = order.id, admin = "admin", liv = order.livreurId ? `livreur:${order.livreurId}` : null, cli = order.userId ? `client:${order.userId}` : null;
  const U = { admin: "/admin-livraisons.html", livreur: "/livreur-livraison.html", client: `/suivi.html?order=${id}` };
  const tag = `order-${id}`;
  const plan = [];
  const add = (ch, title, body, url, urgent = false) => { if (ch) plan.push([ch, { title, body, url, tag: `${tag}-${event}`, urgent }]); };
  switch (event) {
    case "order:new":
      add(admin, "🆕 Nouvelle commande", `Commande CMD-${id} — ${Number(order.total || 0).toLocaleString("fr-FR")} FCFA.`, U.admin, true);
      break;
    case "order:assigned":
      add(liv, "🚚 Nouvelle livraison", `Une livraison vous est confiée (CMD-${id}). Acceptez-la dans l'application.`, U.livreur, true);
      break;
    case "order:accepted":
      add(cli, "✅ Livreur confirmé", `Un livreur a accepté votre commande CMD-${id}.`, U.client);
      add(admin, "✅ Livraison acceptée", `CMD-${id} acceptée par le livreur.`, U.admin);
      break;
    case "order:started":
      add(cli, "🛵 Votre commande est en route", `Suivez votre livreur en direct (CMD-${id}).`, U.client, true);
      break;
    case "order:updated":
      if (order.statut && order.statut !== "en_preparation") add(cli, "📦 Commande mise à jour", `CMD-${id} : ${STATUT_FR[order.statut] || order.statut}.`, U.client);
      break;
    case "order:confirmation":
      add(admin, "🔔 Confirmation de livraison", `Une confirmation a été enregistrée pour CMD-${id}.`, U.admin);
      break;
    case "order:cancelled":
      add(admin, "❌ Commande annulée", `CMD-${id} a été annulée.`, U.admin);
      add(liv, "❌ Livraison annulée", `La commande CMD-${id} a été annulée.`, U.livreur, true);
      add(cli, "❌ Commande annulée", `Votre commande CMD-${id} a été annulée.`, U.client);
      break;
    case "order:message": {
      const from = order.message?.sender;                                 // on ne prévient jamais l'expéditeur
      const text = String(order.message?.text || "").slice(0, 90);
      if (from !== "client") add(cli, "💬 Nouveau message", text || `Message sur CMD-${id}.`, U.client);
      if (from !== "livreur") add(liv, "💬 Nouveau message", text || `Message sur CMD-${id}.`, U.livreur);
      if (from !== "admin") add(admin, "💬 Nouveau message", `CMD-${id} : ${text}`, U.admin);
      break;
    }
    default: break;
  }
  return plan;
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
export async function pushToChannel(channel, { title, body, url = "/", tag, urgent = false }) {
  try {
    const subs = await Store.all("pushSubs");
    const matching = subs.filter((s) => s.channel === channel);
    for (const sub of matching) {
      // Application Android (Capacitor) : jeton FCM ; navigateur / PWA : abonnement Web Push.
      const result = sub.endpoint.startsWith("fcm:")
        ? await sendFcm(sub.endpoint.slice(4), { title, body, url, tag, urgent })
        : await sendPush({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.authKey } }, { title, body, url, tag });
      if (result.expired) await Store.remove("pushSubs", sub.id).catch(() => {});
    }
  } catch { /* jamais bloquant */ }
}
