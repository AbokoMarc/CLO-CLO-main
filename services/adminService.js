/* ============================================================
   CLO-CLO Frontend | services/adminService.js
   Utilisé par les pages admin-*.html
   ============================================================ */
import { ApiClient } from "./apiClient.js";

export const AdminService = {
  stats() {
    return ApiClient.get("/admin/stats", { auth: true });
  },
  listClients() {
    return ApiClient.get("/admin/clients", { auth: true });
  },
  listLivreurs() {
    return ApiClient.get("/admin/livreurs", { auth: true });
  },
  createLivreur(data) {
    return ApiClient.post("/admin/livreurs", data, { auth: true });
  },
  listOrders(statut) {
    return ApiClient.get(statut ? `/orders?statut=${encodeURIComponent(statut)}` : "/orders", { auth: true });
  },
  assignOrder(orderId, livreurId) {
    return ApiClient.patch(`/orders/${orderId}/assign`, { livreurId }, { auth: true });
  },
  updateOrderStatus(orderId, statut) {
    return ApiClient.patch(`/orders/${orderId}/status`, { statut }, { auth: true });
  },
};
