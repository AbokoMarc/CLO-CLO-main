/* ============================================================
   CLO-CLO Backend | scheduler.js
   Tâches planifiées (« cron jobs ») : toutes les 60 s, le serveur vérifie
   des situations qui demandent une alerte et envoie de VRAIES notifications
   push (Web Push + Android natif), même application fermée.

   Chaque alerte passe par alerts.js → jamais deux fois la même.
   Déclenchement : minuteur interne ET/OU appel externe
   POST /api/cron/run (en-tête x-cron-secret = CRON_SECRET), utile pour
   réveiller un serveur gratuit endormi (cron-job.org, UptimeRobot, GitHub Actions).
   ============================================================ */
import { Store } from "./repositories/store.js";
import { pushToChannel } from "./notify.js";
import { once, purgeOldAlerts } from "./alerts.js";
import { OrderService } from "./services/orderService.js";

const MIN = 60_000;
const TZ = "Africa/Douala";
const UNPAID_CANCEL_MIN = Number(process.env.UNPAID_CANCEL_MIN) || 120;
const ACTIVE = ["en_attente_paiement", "en_preparation", "assignee", "acceptee", "en_livraison"];

const minutesSince = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / MIN : Infinity);
const hhmm = (iso) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const dayKey = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const parts = (d = new Date()) => Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d).map((p) => [p.type, p.value]));

const U = { admin: "/admin-livraisons.html", livreur: "/livreur-livraison.html", client: (id) => `/suivi.html?order=${id}` };

/** Envoie seulement si l'alerte n'a jamais été envoyée. Retourne 1 si envoyée, 0 sinon. */
async function alert(key, channel, msg) {
  if (!(await once(key))) return 0;
  await pushToChannel(channel, { tag: key, ...msg });
  return 1;
}

const liveOf = (o) => { try { return o.liveJson ? JSON.parse(o.liveJson) : {}; } catch { return {}; } };

export const JOBS = {
  /** 1. Commande qui attend un livreur → l'admin est relancé toutes les 5 min (4 fois max). */
  async unassigned(orders) {
    let n = 0;
    for (const o of orders.filter((x) => x.statut === "en_preparation" && !x.livreurId)) {
      const ref = o.scheduledFor && new Date(o.scheduledFor) > new Date() ? new Date(new Date(o.scheduledFor).getTime() - 30 * MIN).toISOString() : o.createdAt;
      const step = Math.floor(minutesSince(ref) / 5);
      if (step >= 1 && step <= 4) n += await alert(`unassigned:${o.id}:${step}`, "admin", { title: "⏰ Commande sans livreur", body: `CMD-${o.id} attend un livreur depuis ${step * 5} min.`, url: U.admin, urgent: true });
    }
    return n;
  },

  /** 2. Livraison assignée mais pas acceptée → rappel au livreur (2, 4, 6 min), puis alerte admin à 5 min. */
  async driverNotAccepting(orders) {
    let n = 0;
    for (const o of orders.filter((x) => x.statut === "assignee" && x.livreurId)) {
      const age = minutesSince(o.assignedAt || o.createdAt), step = Math.floor(age / 2);
      if (step >= 1 && step <= 3) n += await alert(`accept:${o.id}:${step}`, `livreur:${o.livreurId}`, { title: "🚚 Livraison en attente", body: `Acceptez la livraison CMD-${o.id} dans l'application.`, url: U.livreur, urgent: true });
      if (age >= 5) n += await alert(`accept-admin:${o.id}`, "admin", { title: "⚠️ Livreur sans réponse", body: `CMD-${o.id} n'est pas acceptée depuis ${Math.floor(age)} min. Réassignez-la ?`, url: U.admin, urgent: true });
    }
    return n;
  },

  /** 3. GPS silencieux pendant une livraison → rappel au livreur (3, 6, 9 min), alerte admin à 6 min. */
  async silentGps(orders) {
    let n = 0;
    for (const o of orders.filter((x) => x.statut === "en_livraison" && x.livreurId)) {
      const silence = minutesSince(liveOf(o).livreur?.at || o.startedAt || o.assignedAt || o.createdAt), step = Math.floor(silence / 3);
      if (step >= 1 && step <= 3) n += await alert(`gps:${o.id}:${step}`, `livreur:${o.livreurId}`, { title: "📍 Position non reçue", body: "Votre position n'arrive plus au client. Ouvrez l'application et vérifiez le GPS.", url: U.livreur, urgent: true });
      if (silence >= 6) n += await alert(`gps-admin:${o.id}`, "admin", { title: "📍 Livreur sans signal GPS", body: `CMD-${o.id} : plus de position depuis ${Math.floor(silence)} min.`, url: U.admin, urgent: true });
    }
    return n;
  },

  /** 4. Paiement en ligne non finalisé → rappel client à 15 et 45 min ; annulation automatique après UNPAID_CANCEL_MIN. */
  async unpaid(orders) {
    let n = 0;
    for (const o of orders.filter((x) => x.statut === "en_attente_paiement")) {
      const age = minutesSince(o.createdAt);
      if (age >= UNPAID_CANCEL_MIN) {
        try { await OrderService.cancelOrder(o.userId, o.id); n += await alert(`unpaid-cancel:${o.id}`, `client:${o.userId}`, { title: "❌ Commande annulée", body: `CMD-${o.id} a été annulée faute de paiement.`, url: U.client(o.id) }); } catch { /* déjà modifiée entre-temps */ }
      } else if (age >= 45) n += await alert(`pay45:${o.id}`, `client:${o.userId}`, { title: "💳 Dernier rappel", body: `Finalisez le paiement de CMD-${o.id}, sinon elle sera annulée.`, url: U.client(o.id), urgent: true });
      else if (age >= 15) n += await alert(`pay15:${o.id}`, `client:${o.userId}`, { title: "💳 Paiement en attente", body: `Votre commande CMD-${o.id} attend votre paiement.`, url: U.client(o.id) });
    }
    return n;
  },

  /** 5. Paiement Mobile Money déclaré mais pas vérifié → l'admin est relancé (10, 20, 30 min). */
  async paymentsToVerify(orders) {
    let n = 0;
    for (const o of orders.filter((x) => x.paymentStatus === "a_verifier" && x.statut !== "annulee")) {
      const step = Math.floor(minutesSince(o.createdAt) / 10);
      if (step >= 1 && step <= 3) n += await alert(`verify:${o.id}:${step}`, "admin", { title: "💰 Paiement à vérifier", body: `CMD-${o.id} : référence ${o.paymentRef || "?"} à confirmer.`, url: U.admin, urgent: true });
    }
    return n;
  },

  /** 6. Commande programmée : rappel à l'admin ET au client 45 min avant l'heure choisie. */
  async scheduled(orders) {
    let n = 0;
    for (const o of orders.filter((x) => x.scheduledFor && ACTIVE.includes(x.statut))) {
      const until = -minutesSince(o.scheduledFor);
      if (until >= 0 && until <= 45) {
        n += await alert(`sched-admin:${o.id}`, "admin", { title: "🗓️ Commande programmée", body: `CMD-${o.id} à livrer à ${hhmm(o.scheduledFor)}.`, url: U.admin, urgent: true });
        n += await alert(`sched-client:${o.id}`, `client:${o.userId}`, { title: "🗓️ Votre commande approche", body: `Livraison prévue à ${hhmm(o.scheduledFor)} (CMD-${o.id}).`, url: U.client(o.id) });
      }
    }
    return n;
  },

  /** 7. Demande d'avis 30 min après la livraison (une seule fois, dans les 24 h). */
  async ratingReminder(orders) {
    let n = 0;
    for (const o of orders.filter((x) => x.statut === "livree" && x.rating == null && x.confirmedAdminAt)) {
      const age = minutesSince(o.confirmedAdminAt);
      if (age >= 30 && age <= 24 * 60) n += await alert(`rate:${o.id}`, `client:${o.userId}`, { title: "⭐ Comment était votre commande ?", body: "Prenez 10 secondes pour noter votre livraison.", url: U.client(o.id) });
    }
    return n;
  },

  /** 8. Message traiteur d'un client resté sans réponse 30 min → l'admin est relancé. */
  async traiteurUnanswered() {
    let n = 0;
    const [reqs, msgs] = await Promise.all([Store.all("traiteurRequests"), Store.all("traiteurMessages")]);
    const last = new Map();
    for (const m of msgs) if (!last.has(m.requestId) || m.id > last.get(m.requestId).id) last.set(m.requestId, m);
    for (const r of reqs) {
      const m = last.get(r.id);
      if (m && m.sender === "client" && minutesSince(m.createdAt) >= 30 && minutesSince(m.createdAt) <= 24 * 60) {
        n += await alert(`traiteur:${m.id}`, "admin", { title: "💬 Client traiteur sans réponse", body: `${r.nom} attend une réponse depuis 30 min.`, url: `/admin-traiteur.html?id=${r.id}`, urgent: true });
      }
    }
    return n;
  },

  /** 10. Confidentialité : le trajet GPS d'une livraison terminée est effacé après 7 jours. */
  async purgeLocations(orders) {
    let n = 0;
    for (const o of orders.filter((x) => x.liveJson && ["livree", "annulee"].includes(x.statut) && minutesSince(x.createdAt) > 7 * 24 * 60)) {
      await Store.update("orders", o.id, { liveJson: null }); n++;
    }
    return n;
  },

  /** 9. Résumé du jour à 20 h (heure de Douala), une fois par jour. */
  async dailySummary(orders) {
    const p = parts();
    if (Number(p.hour) !== 20 || Number(p.minute) > 15) return 0;
    const today = dayKey();
    const mine = orders.filter((o) => dayKey(new Date(o.createdAt)) === today && o.statut !== "annulee");
    const delivered = mine.filter((o) => o.statut === "livree");
    const revenue = delivered.reduce((s, o) => s + (o.total || 0), 0);
    const pending = orders.filter((o) => ACTIVE.includes(o.statut)).length;
    return alert(`daily:${today}`, "admin", { title: "📊 Résumé du jour", body: `${mine.length} commande(s) · ${delivered.length} livrée(s) · ${revenue.toLocaleString("fr-FR")} FCFA · ${pending} en cours.`, url: "/admin-dashboard.html" });
  },
};

let running = false, timer = null;

/** Exécute toutes les tâches ; une tâche en erreur n'empêche jamais les autres. */
export async function runAll() {
  if (running) return { skipped: true };
  running = true;
  const summary = {};
  try {
    const orders = await Store.all("orders");
    for (const [name, job] of Object.entries(JOBS)) {
      try { summary[name] = await job(orders); } catch (e) { summary[name] = `erreur: ${e.message}`; console.error("tâche", name, e.message); }
    }
    if (Math.random() < 0.02) await purgeOldAlerts();
  } finally { running = false; }
  return summary;
}

export function startScheduler(everyMs = 60_000) {
  if (timer) return;
  setTimeout(() => runAll().catch(() => {}), 20_000);
  timer = setInterval(() => runAll().catch(() => {}), everyMs);
  console.log("⏰ Planificateur d'alertes actif (toutes les 60 s).");
}
