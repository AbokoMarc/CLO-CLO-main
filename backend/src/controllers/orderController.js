import { OrderService } from "../services/orderService.js";
import { sendJson, requireAuth, requireRole } from "../http.js";

export const OrderController = {
  async create({ req, res, body }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    sendJson(res, 201, await OrderService.createOrder(auth.sub, body));
  },
  async myOrders({ req, res }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    sendJson(res, 200, await OrderService.listOrdersForUser(auth.sub));
  },
  async getOne({ req, res, params }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    const order = await OrderService.getOrderForUser(auth.sub, params.id);
    if (!order) return sendJson(res, 404, { error: "Commande introuvable." });
    sendJson(res, 200, order);
  },
  async myPointsHistory({ req, res }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    sendJson(res, 200, await OrderService.pointsHistory(auth.sub));
  },
  async redeemReward({ req, res, params }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    sendJson(res, 200, await OrderService.redeemReward(auth.sub, params.id));
  },
  async listAll({ req, res, query }) {
    requireRole(requireAuth(req), "admin", "livreur");
    sendJson(res, 200, await OrderService.listAllOrders({ statut: query.statut }));
  },
  async myDeliveries({ req, res }) {
    const auth = requireAuth(req);
    requireRole(auth, "livreur");
    sendJson(res, 200, await OrderService.listOrdersForLivreur(auth.sub));
  },
  async assign({ req, res, params, body }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, await OrderService.assignLivreur(params.id, body.livreurId));
  },
  async updateStatus({ req, res, params, body }) {
    requireRole(requireAuth(req), "admin", "livreur");
    sendJson(res, 200, await OrderService.updateStatus(params.id, body.statut));
  },
  /** Annulation par le CLIENT lui-même (tant que la commande est encore en préparation). */
  async cancel({ req, res, params }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    sendJson(res, 200, await OrderService.cancelOrder(auth.sub, params.id));
  },
  /** Le client ou le livreur partage sa position pendant une livraison active. */
  async updateLocation({ req, res, params, body }) {
    const auth = requireAuth(req);
    requireRole(auth, "client", "livreur");
    sendJson(res, 200, await OrderService.updateLocation(params.id, auth.role, auth.sub, body.lat, body.lng));
  },
  /** Admin, client ou livreur concerné peuvent consulter la position en direct. */
  async getLocation({ req, res, params }) {
    requireRole(requireAuth(req), "admin", "client", "livreur");
    sendJson(res, 200, await OrderService.getLocation(params.id));
  },

  /** Étape 1/2 livreur : accepte la course (ouvre le chat, PAS encore le GPS). */
  async accept({ req, res, params }) {
    const auth = requireAuth(req);
    requireRole(auth, "livreur");
    sendJson(res, 200, await OrderService.acceptDelivery(auth.sub, params.id));
  },
  /** Étape 2/2 livreur : démarre vraiment la livraison (active le GPS). */
  async start({ req, res, params }) {
    const auth = requireAuth(req);
    requireRole(auth, "livreur");
    sendJson(res, 200, await OrderService.startDelivery(auth.sub, params.id));
  },
  /** Triple confirmation (livreur / client / admin) avant qu'une commande soit "livrée". */
  async confirm({ req, res, params }) {
    const auth = requireAuth(req);
    requireRole(auth, "admin", "client", "livreur");
    sendJson(res, 200, await OrderService.confirmDelivery(auth.role, params.id));
  },
  async rate({ req, res, params, body }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    sendJson(res, 200, await OrderService.rateDelivery(auth.sub, params.id, body.rating, body.comment));
  },
  async tip({ req, res, params, body }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    sendJson(res, 200, await OrderService.tipDelivery(auth.sub, params.id, body.tip));
  },
  async sos({ req, res, params, body }) {
    const auth = requireAuth(req);
    requireRole(auth, "client", "livreur");
    sendJson(res, 200, await OrderService.triggerSos(auth.role, auth.sub, params.id, body.lat, body.lng));
  },
  async sendMessage({ req, res, params, body }) {
    const auth = requireAuth(req);
    requireRole(auth, "client", "livreur");
    sendJson(res, 201, await OrderService.sendMessage(params.id, auth.role, auth.sub, body.text));
  },
  async listMessages({ req, res, params }) {
    const auth = requireAuth(req);
    requireRole(auth, "admin", "client", "livreur");
    sendJson(res, 200, await OrderService.listMessages(params.id));
  },
};
