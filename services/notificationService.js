/* ============================================================
   CLO-CLO Frontend | services/notificationService.js
   Connexion temps réel (Server-Sent Events) au backend.
   Utilisé par app.js (client), admin.js (admin) et livreur.js
   (livreur) pour afficher un toast + un badge (avec le VRAI
   nombre de notifications non lues) dès qu'un évènement de
   commande survient, sans recharger la page.
   ============================================================ */
import { ApiClient } from "./apiClient.js";

const API_BASE_URL = window.CLOCLO_CONFIG?.API_BASE_URL || "http://localhost:4000/api";
const ALL_EVENTS = [
  "order:new", "order:assigned", "order:accepted", "order:started",
  "order:updated", "order:confirmation", "order:cancelled",
  "order:message", "order:sos", "livreur:message",
  "traiteur:new", "traiteur:message", "reset:new",
];

export const NotificationService = {
  _source: null,
  _unread: 0,

  /** Ouvre le flux temps réel. `onEvent(eventName, data)` est appelé à chaque évènement reçu. */
  _handlers: new Set(),

  /** Ouvre (une seule fois) le flux temps réel ; chaque appel ajoute simplement un écouteur.
      Avant, chaque connect() fermait la connexion précédente : le suivi de position et le chat
      d'une même page se volaient mutuellement les évènements. */
  connect(onEvent) {
    const token = ApiClient.getToken();
    if (!token) return null;
    if (typeof onEvent === "function") this._handlers.add(onEvent);
    if (this._source && this._source.readyState !== 2) return this._source;

    const url = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    const dispatch = (evt, e, counts) => {
      let data = null;
      try { data = JSON.parse(e.data); } catch { /* ignore */ }
      if (counts) { this._unread++; this._updateBadge(); }     // seuls les évènements métier comptent comme notifications
      // Relais DOM : n'importe quel module (carte, messagerie, centre de notifications…) peut écouter « cloclo:notif ».
      document.dispatchEvent(new CustomEvent("cloclo:notif", { detail: { event: evt, data } }));
      this._handlers.forEach((h) => { try { h(evt, data); } catch (err) { console.error(err); } });
    };
    ALL_EVENTS.forEach((evt) => source.addEventListener(evt, (e) => dispatch(evt, e, true)));
    // Position GPS en direct : transmise aux écouteurs (c'était LE chaînon manquant : jamais écoutée),
    // mais sans compteur ni notification — c'est du flux, pas une alerte.
    source.addEventListener("order:location", (e) => dispatch("order:location", e, false));
    source.onerror = () => { /* EventSource se reconnecte seul */ };
    this._source = source;
    return source;
  },

  clearUnread() {
    this._unread = 0;
    this._updateBadge();
  },

  _updateBadge() {
    // Badge visuel dans l'app (cloche avec un chiffre).
    document.querySelectorAll(".notif-badge").forEach((el) => {
      el.textContent = this._unread > 9 ? "9+" : String(this._unread);
      el.style.display = this._unread > 0 ? "flex" : "none";
    });
    // Badge sur l'ICÔNE de l'app elle-même (comme WhatsApp/Uber) — Badging API,
    // ne marche que sur l'app installée (PWA), Chrome/Edge/Android. Pas de risque
    // à l'appeler ailleurs : ignoré silencieusement si non supporté (ex. iOS Safari).
    if ("setAppBadge" in navigator) {
      if (this._unread > 0) navigator.setAppBadge(this._unread).catch(() => {});
      else navigator.clearAppBadge().catch(() => {});
    }
  },

  disconnect() {
    this._source?.close();
    this._source = null;
    this._handlers.clear();
  },
};
