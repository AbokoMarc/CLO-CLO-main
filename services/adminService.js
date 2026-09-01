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
  updateLivreurStatut(livreurId, statut) {
    return ApiClient.patch(`/admin/livreurs/${livreurId}/statut`, { statut }, { auth: true });
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
  /** Réinitialise le mot de passe d'un livreur — retourne un mot de passe temporaire à communiquer. */
  resetLivreurPassword(livreurId) {
    return ApiClient.post(`/admin/livreurs/${livreurId}/reset-password`, {}, { auth: true });
  },
  deleteLivreur(livreurId) {
    return ApiClient.delete(`/admin/livreurs/${livreurId}`, { auth: true });
  },
  /** Position en direct du client et du livreur pendant une livraison active. */
  getLocation(orderId) {
    return ApiClient.get(`/orders/${orderId}/location`, { auth: true });
  },
  /** Chat (visible par client, livreur et admin) pendant une livraison. */
  sendMessage(orderId, text) {
    return ApiClient.post(`/orders/${orderId}/messages`, { text }, { auth: true });
  },
  listMessages(orderId) {
    return ApiClient.get(`/orders/${orderId}/messages`, { auth: true });
  },
  /** L'admin confirme la livraison (3ᵉ et dernière des 3 confirmations). */
  confirmDelivery(orderId) {
    return ApiClient.post(`/orders/${orderId}/confirm`, {}, { auth: true });
  },

  /* ── CODES PROMO ── */
  listPromoCodes() {
    return ApiClient.get("/admin/promo-codes", { auth: true });
  },
  createPromoCode(code, type, value) {
    return ApiClient.post("/admin/promo-codes", { code, type, value }, { auth: true });
  },
  togglePromoCode(id, active) {
    return ApiClient.patch(`/admin/promo-codes/${id}`, { active }, { auth: true });
  },
  deletePromoCode(id) {
    return ApiClient.delete(`/admin/promo-codes/${id}`, { auth: true });
  },
};
