/* ============================================================
   CLO-CLO Backend | services/traiteurService.js
   Messagerie du service traiteur : un fil de discussion par demande,
   entre le client (propriétaire de la demande) et l'administrateur.
   ============================================================ */
import { Store } from "../repositories/store.js";
import { publish, pushToChannel } from "../notify.js";

const MAX_LEN = 2000;
const fail = (status, msg) => { const e = new Error(msg); e.status = status; return e; };

async function enrich(requests) {
  const all = await Store.all("traiteurMessages");
  const byReq = new Map();
  for (const m of all) { if (!byReq.has(m.requestId)) byReq.set(m.requestId, []); byReq.get(m.requestId).push(m); }
  return requests.map((r) => {
    const msgs = (byReq.get(r.id) || []).sort((a, b) => a.id - b.id);
    const last = msgs[msgs.length - 1] || null;
    const unreadForAdmin = msgs.filter((m) => m.sender === "client" && (!r.adminSeenAt || m.createdAt > r.adminSeenAt)).length;
    const unreadForClient = msgs.filter((m) => m.sender === "admin" && (!r.clientSeenAt || m.createdAt > r.clientSeenAt)).length;
    return { ...r, lastMessage: last ? { text: last.text, sender: last.sender, createdAt: last.createdAt } : null, messageCount: msgs.length, unreadForAdmin, unreadForClient };
  });
}

async function loadFor(auth, id) {
  const r = await Store.findById("traiteurRequests", id);
  if (!r) throw fail(404, "Demande introuvable.");
  if (auth.role === "client" && Number(r.userId) !== Number(auth.sub)) throw fail(403, "Non autorisé pour cette demande.");
  if (auth.role !== "client" && auth.role !== "admin") throw fail(403, "Accès refusé pour ce rôle.");
  return r;
}

export const TraiteurService = {
  async listMine(userId) {
    const all = await Store.all("traiteurRequests");
    const mine = all.filter((r) => Number(r.userId) === Number(userId)).sort((a, b) => b.id - a.id);
    return enrich(mine);
  },
  async listForAdmin() {
    const all = await Store.all("traiteurRequests");
    const list = await enrich(all);
    // les fils avec activité récente d'abord (comme une boîte de messagerie)
    return list.sort((a, b) => String(b.lastMessage?.createdAt || b.createdAt).localeCompare(String(a.lastMessage?.createdAt || a.createdAt)));
  },
  async listMessages(auth, id) {
    const r = await loadFor(auth, id);
    const all = await Store.all("traiteurMessages");
    const msgs = all.filter((m) => m.requestId === r.id).sort((a, b) => a.id - b.id);
    // lecture = on marque le fil comme vu par celui qui l'ouvre
    await Store.update("traiteurRequests", r.id, auth.role === "admin" ? { adminSeenAt: new Date().toISOString() } : { clientSeenAt: new Date().toISOString() });
    return msgs;
  },
  async sendMessage(auth, id, text, { system = false } = {}) {
    const r = await loadFor(auth, id);
    const clean = String(text || "").trim();
    if (!clean) throw fail(400, "Message vide.");
    if (clean.length > MAX_LEN) throw fail(400, `Message trop long (${MAX_LEN} caractères maximum).`);
    const now = new Date().toISOString();
    const message = await Store.insert("traiteurMessages", { requestId: r.id, sender: auth.role === "admin" ? "admin" : "client", text: clean, createdAt: now });
    await Store.update("traiteurRequests", r.id, { lastMessageAt: now, ...(auth.role === "admin" ? { adminSeenAt: now } : { clientSeenAt: now }) });
    const payload = { requestId: r.id, message };
    publish("admin", "traiteur:message", payload);
    if (r.userId) publish(`client:${r.userId}`, "traiteur:message", payload);
    const toAdmin = auth.role !== "admin";
    pushToChannel(toAdmin ? "admin" : `client:${r.userId}`, {
      title: "💬 Service traiteur",
      body: toAdmin ? `${r.nom} vous a écrit (demande n°${r.id}).` : "Le Clo-Clo vous a répondu au sujet de votre demande traiteur.",
    });
    return message;
  },
  /** Message automatique de l'admin (ex. prix proposé) sans passer par une requête HTTP. */
  async adminNote(id, text) {
    return this.sendMessage({ role: "admin", sub: 0 }, id, text);
  },
  announceNew(request) {
    publish("admin", "traiteur:new", request);
    pushToChannel("admin", { title: "🍽️ Nouvelle demande traiteur", body: `${request.nom} — ${request.typeEvenement || "événement"}.` });
  },
};
