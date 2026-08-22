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
}
