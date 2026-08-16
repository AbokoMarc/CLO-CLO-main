import { OrderService } from "../services/orderService.js";
import { sendJson, requireAuth, requireRole } from "../http.js";

export const OrderController = {
  async create({ req, res, body }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    sendJson(res, 201, OrderService.createOrder(auth.sub, body));
  },
  async myOrders({ req, res }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    sendJson(res, 200, OrderService.listOrdersForUser(auth.sub));
  },
  async getOne({ req, res, params }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    const order = OrderService.getOrderForUser(auth.sub, params.id);
    if (!order) return sendJson(res, 404, { error: "Commande introuvable." });
    sendJson(res, 200, order);
  },
  async myPointsHistory({ req, res }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    sendJson(res, 200, OrderService.pointsHistory(auth.sub));
  },
  async redeemReward({ req, res, params }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    sendJson(res, 200, OrderService.redeemReward(auth.sub, params.id));
  },
  async listAll({ req, res, query }) {
    requireRole(requireAuth(req), "admin", "livreur");
    sendJson(res, 200, OrderService.listAllOrders({ statut: query.statut }));
  },
  async myDeliveries({ req, res }) {
    const auth = requireAuth(req);
    requireRole(auth, "livreur");
    sendJson(res, 200, OrderService.listOrdersForLivreur(auth.sub));
  },
  async assign({ req, res, params, body }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, OrderService.assignLivreur(params.id, body.livreurId));
  },
  async updateStatus({ req, res, params, body }) {
    requireRole(requireAuth(req), "admin", "livreur");
    sendJson(res, 200, OrderService.updateStatus(params.id, body.statut));
  },
};
