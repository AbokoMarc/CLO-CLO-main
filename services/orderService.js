/* ============================================================
   CLO-CLO Frontend | services/orderService.js
   ============================================================ */
import { ApiClient } from "./apiClient.js";

export const OrderService = {
  create({ items, adresse, quartier }) {
    return ApiClient.post("/orders", { items, adresse, quartier }, { auth: true });
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
  listRewards() {
    return ApiClient.get("/rewards");
  },
};
