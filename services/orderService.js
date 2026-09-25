/* ============================================================
   CLO-CLO Frontend | services/orderService.js
   ============================================================ */
import { ApiClient } from "./apiClient.js";

export const OrderService = {
  create({ items, adresse, quartier, clientLat, clientLng, promoCode, scheduledFor }) {
    return ApiClient.post("/orders", { items, adresse, quartier, clientLat, clientLng, promoCode, scheduledFor }, { auth: true });
  },
  myOrders() {
    return ApiClient.get("/orders/me", { auth: true });
  },
  getOrder(id) {
    return ApiClient.get(`/orders/${id}`, { auth: true });
  },
  pointsHistory() {
    return ApiClient.get("/orders/points-history", { auth: true });
  },
  redeemReward(rewardId) {
    return ApiClient.post(`/rewards/${rewardId}/redeem`, {}, { auth: true });
  },
  /** Le client peut annuler sa commande tant qu'elle est encore en préparation. */
  cancelOrder(id) {
    return ApiClient.patch(`/orders/${id}/cancel`, {}, { auth: true });
  },
  /** Partage de localisation en temps réel (client ou livreur). */
  updateLocation(orderId, lat, lng) {
    return ApiClient.post(`/orders/${orderId}/location`, { lat, lng }, { auth: true });
  },
  getLocation(orderId) {
    return ApiClient.get(`/orders/${orderId}/location`, { auth: true });
  },
  listRewards() {
    return ApiClient.get("/rewards");
  },
  /** Le client confirme avoir reçu sa commande (3ᵉ confirmation du flux de livraison). */
  confirmReceived(orderId) {
    return ApiClient.post(`/orders/${orderId}/confirm`, {}, { auth: true });
  },
  rate(orderId, rating, comment) {
    return ApiClient.post(`/orders/${orderId}/rate`, { rating, comment }, { auth: true });
  },
  tip(orderId, tip) {
    return ApiClient.post(`/orders/${orderId}/tip`, { tip }, { auth: true });
  },
  sos(orderId, lat, lng) {
    return ApiClient.post(`/orders/${orderId}/sos`, { lat, lng }, { auth: true });
  },
  /** Chat client ↔ livreur (disponible dès que le livreur a accepté la course). */
  sendMessage(orderId, text) {
    return ApiClient.post(`/orders/${orderId}/messages`, { text }, { auth: true });
  },
  listMessages(orderId) {
    return ApiClient.get(`/orders/${orderId}/messages`, { auth: true });
  },
};
