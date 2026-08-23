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
};
