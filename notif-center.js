/* ============================================================
   CLO-CLO Frontend | notif-center.js
   Centre de notifications ACCESSIBLE (client + admin) :
   • cloche avec compteur, ouverte au clic / Entrée / Espace ;
   • panneau « dialog » : historique des 30 dernières notifications
     (conservé entre les pages), lien direct vers l'élément concerné,
     « Tout marquer comme lu », bouton « Activer les alertes » (push) ;
   • annonce vocale (aria-live) à chaque nouvelle notification pour les
     lecteurs d'écran ; Échap ferme, le focus revient sur la cloche ;
   • écoute l'évènement DOM « cloclo:notif » (aucune 2ᵉ connexion SSE).
   ============================================================ */
import { NotificationService } from "./services/notificationService.js";
import { ApiClient } from "./services/apiClient.js";
import { esc } from "./traiteur-inbox.js";

const MAX = 30;
const key = (role) => `cloclo_notifs_${role}`;
const BELL = `<svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;

/** Transforme un évènement serveur en { text, href } selon le rôle. */
function describe(role, evt, d) {
  const id = d?.id ?? d?.requestId;
  const admin = role === "admin";
  switch (evt) {
    case "order:new": return admin ? { text: `Nouvelle commande CMD-${id}`, href: "admin-livraisons.html" } : null;
    case "order:cancelled": return { text: `Commande CMD-${id} annulée`, href: admin ? "admin-livraisons.html" : `suivi.html?order=${id}` };
    case "order:accepted": return { text: admin ? `Livraison CMD-${id} acceptée par le livreur` : `Le livreur a accepté votre commande CMD-${id}`, href: admin ? "admin-livraisons.html" : `suivi.html?order=${id}` };
    case "order:started": return { text: admin ? `Livraison CMD-${id} en route` : `Votre commande CMD-${id} est en route`, href: admin ? "admin-livraisons.html" : `suivi.html?order=${id}` };
    case "order:updated": return { text: admin ? `Commande CMD-${id} mise à jour` : `Commande CMD-${id} : ${({ en_preparation: "en préparation", en_livraison: "en route", livree: "livrée", annulee: "annulée", en_attente_paiement: "en attente de paiement" })[d?.statut] || d?.statut}`, href: admin ? "admin-livraisons.html" : `suivi.html?order=${id}` };
    case "order:confirmation": return admin ? { text: `Confirmation de livraison — CMD-${id}`, href: "admin-livraisons.html" } : null;
    case "order:message": return { text: `Nouveau message sur la commande CMD-${id}`, href: admin ? "admin-livraisons.html" : `suivi.html?order=${id}` };
    case "order:sos": return { text: `ALERTE URGENCE — CMD-${id}`, href: admin ? "admin-livraisons.html" : `suivi.html?order=${id}`, urgent: true };
    case "livreur:message": return admin ? { text: "Nouveau message d'un livreur", href: "admin-livreurs.html" } : null;
    case "traiteur:new": return admin ? { text: `Nouvelle demande traiteur — ${d?.nom || ""}`, href: `admin-traiteur.html?id=${id}` } : null;
    case "traiteur:message": {
      const fromClient = d?.message?.sender === "client";
      if (admin !== fromClient) return null;      // chacun ne reçoit que les messages de l'autre partie
      return { text: admin ? "Nouveau message — service traiteur" : "Réponse du service traiteur", href: admin ? `admin-traiteur.html?id=${d.requestId}` : `traiteur.html?id=${d.requestId}` };
    }
    default: return null;
  }
}

export const NotifCenter = {
  role: "client", items: [], bell: null, panel: null, live: null,

  init({ role, bell }) {
    if (!bell || bell.dataset.ncBound) return;
    this.role = role; this.bell = bell; bell.dataset.ncBound = "1";
    try { this.items = JSON.parse(localStorage.getItem(key(role)) || "[]"); } catch { this.items = []; }
    bell.setAttribute("type", "button");
    bell.setAttribute("aria-haspopup", "dialog");
    bell.setAttribute("aria-expanded", "false");
    bell.setAttribute("aria-label", "Notifications");
    bell.title = "Notifications";

    this.live = document.createElement("div");
    this.live.setAttribute("aria-live", "polite"); this.live.setAttribute("role", "status"); this.live.className = "sr-only";
    document.body.appendChild(this.live);

    bell.addEventListener("click", (e) => { e.stopPropagation(); this.toggle(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && this.panel) this.close(true); });
    document.addEventListener("click", (e) => { if (this.panel && !this.panel.contains(e.target) && e.target !== bell) this.close(); });
    document.addEventListener("cloclo:notif", (e) => this.push(e.detail.event, e.detail.data));
    this.refreshBadge();
  },

  unread() { return this.items.filter((i) => !i.read).length; },
  save() { try { localStorage.setItem(key(this.role), JSON.stringify(this.items.slice(0, MAX))); } catch { /* plein */ } },
  refreshBadge() {
    const n = this.unread();
    this.bell?.querySelectorAll(".notif-badge").forEach((b) => { b.textContent = n > 9 ? "9+" : String(n); b.style.display = n ? "flex" : "none"; });
    this.bell?.setAttribute("aria-label", n ? `Notifications, ${n} non lue${n > 1 ? "s" : ""}` : "Notifications");
  },
  push(evt, data) {
    const d = describe(this.role, evt, data);
    if (!d) return;
    this.items.unshift({ ...d, at: Date.now(), read: false });
    this.items = this.items.slice(0, MAX); this.save(); this.refreshBadge();
    if (this.live) this.live.textContent = d.text;          // annonce pour lecteurs d'écran
    if (this.panel) this.render();
  },
  toggle() { this.panel ? this.close(true) : this.open(); },
  open() {
    this.panel = document.createElement("div");
    this.panel.className = "nc-panel"; this.panel.setAttribute("role", "dialog"); this.panel.setAttribute("aria-label", "Notifications");
    document.body.appendChild(this.panel);
    this.panel.addEventListener("click", async (e) => {
      const a = e.target.closest("[data-a]")?.dataset.a;
      if (a === "close") this.close(true);
      if (a === "read") { this.markAllRead(); this.render(); }
      if (a === "push") {
        try { const { PWA } = await import("./pwa.js"); await PWA.subscribeToPush(() => ApiClient.getToken()); } catch { /* refusé */ }
        this.render();
      }
      const item = e.target.closest(".nc-item");
      if (item) { const it = this.items[Number(item.dataset.n)]; if (it) { it.read = true; this.save(); } }
    });
    this.bell.setAttribute("aria-expanded", "true");
    this.render();
    this.panel.querySelector("button, a")?.focus();
  },
  close(refocus) {
    this.panel?.remove(); this.panel = null;
    this.bell?.setAttribute("aria-expanded", "false");
    if (refocus) this.bell?.focus();
  },
  markAllRead() { this.items.forEach((i) => (i.read = true)); this.save(); this.refreshBadge(); NotificationService.clearUnread(); },
  render() {
    const fmt = (t) => new Date(t).toLocaleTimeString(window.CLOCLO_LOCALE?.() || "fr-FR", { hour: "2-digit", minute: "2-digit" });
    const canPush = "Notification" in window && Notification.permission === "default";
    this.panel.innerHTML = `
      <div class="nc-head"><h2>Notifications</h2>
        <button type="button" class="nc-link" data-a="read">Tout marquer comme lu</button>
        <button type="button" class="nc-x" data-a="close" aria-label="Fermer">✕</button></div>
      ${canPush ? `<button type="button" class="nc-push" data-a="push">🔔 Activer les alertes (même application fermée)</button>` : ""}
      <ul class="nc-list">${this.items.length ? this.items.map((i, n) => `
        <li><a href="${esc(i.href)}" class="nc-item ${i.read ? "" : "unread"} ${i.urgent ? "urgent" : ""}" data-n="${n}">
          <span>${esc(i.text)}</span><time>${esc(fmt(i.at))}</time></a></li>`).join("") : `<li class="nc-none">Aucune notification pour l'instant.</li>`}</ul>`;

  },
};
