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
  "order:message", "order:sos",
];

export const NotificationService = {
  _source: null,
  _unread: 0,

  /** Ouvre le flux temps réel. `onEvent(eventName, data)` est appelé à chaque évènement reçu. */
  connect(onEvent) {
    const token = ApiClient.getToken();
    if (!token) return null;
    if (this._source) this._source.close();

    const url = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    ALL_EVENTS.forEach((evt) => {
      source.addEventListener(evt, (e) => {
        let data = null;
        try { data = JSON.parse(e.data); } catch { /* ignore */ }
        // order:location n'est pas dans ALL_EVENTS (bruit GPS, pas une vraie notif) —
        // seuls les évènements métier incrémentent le compteur.
        this._unread++;
        this._updateBadge();
        onEvent?.(evt, data);
      });
    });
    source.onerror = () => {
      // La connexion SSE se rétablit automatiquement (comportement natif d'EventSource) ;
      // on ne fait rien de spécial ici pour éviter le bruit dans la console.
    };
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
  },
};
