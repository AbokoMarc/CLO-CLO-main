/* ============================================================
   CLO-CLO Frontend | services/notificationService.js
   Connexion temps réel (Server-Sent Events) au backend.
   Utilisé par app.js (client), admin.js (admin) et livreur.js
   (livreur) pour afficher un toast + un badge dès qu'un
   évènement de commande survient, sans recharger la page.
   ============================================================ */
import { ApiClient } from "./apiClient.js";

const API_BASE_URL = window.CLOCLO_CONFIG?.API_BASE_URL || "http://localhost:4000/api";

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
    ["order:new", "order:assigned", "order:updated", "order:cancelled"].forEach((evt) => {
      source.addEventListener(evt, (e) => {
        let data = null;
        try { data = JSON.parse(e.data); } catch { /* ignore */ }
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
    document.querySelectorAll(".notif-badge").forEach((el) => {
      el.textContent = this._unread > 9 ? "9+" : String(this._unread);
      el.style.display = this._unread > 0 ? "flex" : "none";
    });
  },

  disconnect() {
    this._source?.close();
    this._source = null;
  },
};
