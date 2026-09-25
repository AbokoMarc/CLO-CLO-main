/* ============================================================
   CLO-CLO Frontend | services/deliveryService.js
   Utilisé par les pages livreur-*.html
   ============================================================ */
import { ApiClient } from "./apiClient.js";

export const DeliveryService = {
  myDeliveries() {
    return ApiClient.get("/orders/livreur/me", { auth: true });
  },
  updateStatus(orderId, statut) {
    return ApiClient.patch(`/orders/${orderId}/status`, { statut }, { auth: true });
  },
  updateMyStatut(livreurId, statut) {
    return ApiClient.patch(`/admin/livreurs/${livreurId}/statut`, { statut }, { auth: true });
  },
  updateLocation(orderId, lat, lng) {
    return ApiClient.post(`/orders/${orderId}/location`, { lat, lng }, { auth: true });
  },
  /** Étape 1/2 : accepte la course (ouvre le chat, PAS encore le GPS). */
  accept(orderId) {
    return ApiClient.post(`/orders/${orderId}/accept`, {}, { auth: true });
  },
  /** Étape 2/2 : démarre vraiment la livraison (active le GPS). */
  start(orderId) {
    return ApiClient.post(`/orders/${orderId}/start`, {}, { auth: true });
  },
  /** Le livreur confirme avoir livré (1ʳᵉ des 3 confirmations). */
  confirmDelivered(orderId) {
    return ApiClient.post(`/orders/${orderId}/confirm`, {}, { auth: true });
  },
  sendMessage(orderId, text) {
    return ApiClient.post(`/orders/${orderId}/messages`, { text }, { auth: true });
  },
  listMessages(orderId) {
    return ApiClient.get(`/orders/${orderId}/messages`, { auth: true });
  },
  sos(orderId, lat, lng) {
    return ApiClient.post(`/orders/${orderId}/sos`, { lat, lng }, { auth: true });
  },
  /** Le livreur indique s'il reste actif (en service) — typiquement à la déconnexion. */
  setActif(actif) {
    return ApiClient.patch("/livreurs/me/actif", { actif }, { auth: true });
  },
  /** Chat privé avec l'admin, indépendant des livraisons. */
  sendAdminMessage(livreurId, text) {
    return ApiClient.post(`/livreurs/${livreurId}/messages`, { text }, { auth: true });
  },
  listAdminMessages(livreurId) {
    return ApiClient.get(`/livreurs/${livreurId}/messages`, { auth: true });
  },
  /** Numéro de l'admin, pour le bouton "Appeler l'admin". */
  getAdminContact() {
    return ApiClient.get("/admin-contact", { auth: true });
  },
  /** Photo de profil (base64), vue par le client et l'admin. */
  setPhoto(photoUrl) {
    return ApiClient.patch("/livreurs/me/photo", { photoUrl }, { auth: true });
  },
};
