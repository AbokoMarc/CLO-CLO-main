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
  /** Réinitialise le mot de passe d'un client — retourne un mot de passe temporaire à communiquer. */
  resetClientPassword(clientId) {
    return ApiClient.post(`/admin/clients/${clientId}/reset-password`, {}, { auth: true });
  },
  /** Déverrouille l'accès aux données confidentielles des clients pour cette session admin. */
  verifyPassword(mdp) {
    return ApiClient.post("/admin/verify-password", { mdp }, { auth: true });
  },
  /** Fixe la paie (journalière ou mensuelle) d'un livreur. */
  setLivreurPaie(livreurId, paieType, paieMontant) {
    return ApiClient.patch(`/admin/livreurs/${livreurId}/paie`, { paieType, paieMontant }, { auth: true });
  },
};
