/* ============================================================
   CLO-CLO Backend | services/orderService.js — couche SERVICE
   ============================================================ */
import { Store } from "../repositories/store.js";
import { CatalogService } from "./catalogService.js";
import { notifyOrderEvent } from "../notify.js";

const POINTS_PER_500_FCFA = 5;
const STATUTS = ["en_preparation", "en_livraison", "livree", "annulee"];

async function addPointsHistory(userId, label, pts, type) {
  await Store.insert("pointsHistory", {
    userId,
    label,
    date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    pts,
    type,
  });
}

export const OrderService = {
  async createOrder(userId, { items, adresse, quartier }) {
    if (!Array.isArray(items) || items.length === 0) {
      const e = new Error("Le panier est vide.");
      e.status = 400;
      throw e;
    }
    const resolvedItems = [];
    for (const { productId, qty } of items) {
      const p = await CatalogService.getProduct(productId);
      if (!p) {
        const e = new Error(`Produit introuvable (id ${productId}).`);
        e.status = 404;
        throw e;
      }
      resolvedItems.push({ productId: p.id, name: p.name, price: p.price, qty });
    }
    const total = resolvedItems.reduce((s, i) => s + i.price * i.qty, 0);
    const user = await Store.findById("users", userId);

    const order = await Store.insert("orders", {
      userId,
      items: resolvedItems,
      total,
      adresse: adresse || user?.adresse,
      quartier: quartier || user?.quartier,
      statut: "en_preparation",
      livreurId: null,
      etaMinutes: 25,
      createdAt: new Date().toISOString(),
    });

    if (user) {
      const gained = Math.floor(total / 500) * POINTS_PER_500_FCFA;
      await Store.update("users", userId, { points: user.points + gained, commandes: user.commandes + 1 });
      await addPointsHistory(userId, `Commande #CMD-${order.id}`, gained, "gain");
    }
    notifyOrderEvent("order:new", order);
    return order;
  },

  async listOrdersForUser(userId) {
    const orders = await Store.all("orders");
    return orders.filter((o) => o.userId === userId).sort((a, b) => b.id - a.id);
  },

  async getOrderForUser(userId, orderId) {
    const o = await Store.findById("orders", orderId);
    return o && o.userId === userId ? o : null;
  },

  async listAllOrders({ statut } = {}) {
    const items = await Store.all("orders");
    return statut ? items.filter((o) => o.statut === statut) : items;
  },

  async listOrdersForLivreur(livreurId) {
    const orders = await Store.all("orders");
    return orders.filter((o) => o.livreurId === livreurId);
  },

  async assignLivreur(orderId, livreurId) {
    const order = await Store.update("orders", orderId, { livreurId, statut: "en_livraison" });
    notifyOrderEvent("order:assigned", order);
    return order;
  },

  async updateStatus(orderId, statut) {
    if (!STATUTS.includes(statut)) {
      const e = new Error(`Statut invalide. Valeurs autorisées : ${STATUTS.join(", ")}.`);
      e.status = 400;
      throw e;
    }
    const order = await Store.update("orders", orderId, { statut });
    notifyOrderEvent("order:updated", order);
    return order;
  },

  /** Le CLIENT peut annuler sa propre commande, uniquement tant qu'elle est encore en préparation
      (pas encore prise en charge par un livreur). */
  async cancelOrder(userId, orderId) {
    const order = await Store.findById("orders", orderId);
    if (!order || order.userId !== userId) {
      const e = new Error("Commande introuvable.");
      e.status = 404;
      throw e;
    }
    if (order.statut !== "en_preparation") {
      const e = new Error("Cette commande ne peut plus être annulée : elle est déjà prise en charge par un livreur.");
      e.status = 400;
      throw e;
    }
    const updated = await Store.update("orders", orderId, { statut: "annulee" });
    notifyOrderEvent("order:cancelled", updated);
    return updated;
  },

  async pointsHistory(userId) {
    const history = await Store.all("pointsHistory");
    return history.filter((h) => h.userId === userId).sort((a, b) => b.id - a.id);
  },

  async redeemReward(userId, rewardId) {
    const rewards = await Store.all("rewards");
    const reward = rewards.find((r) => r.id === Number(rewardId));
    const user = await Store.findById("users", userId);
    if (!reward || !reward.available) {
      const e = new Error("Récompense indisponible.");
      e.status = 404;
      throw e;
    }
    if (!user || user.points < reward.cost) {
      const e = new Error("Points insuffisants.");
      e.status = 400;
      throw e;
    }
    await Store.update("users", userId, { points: user.points - reward.cost });
    await addPointsHistory(userId, `Récompense : ${reward.name}`, -reward.cost, "loss");
    return { reward, remainingPoints: user.points - reward.cost };
  },
};
