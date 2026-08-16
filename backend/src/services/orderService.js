/* ============================================================
   CLO-CLO Backend | services/orderService.js — couche SERVICE
   ============================================================ */
import { Store } from "../repositories/store.js";
import { CatalogService } from "./catalogService.js";

const POINTS_PER_500_FCFA = 5;
const STATUTS = ["en_preparation", "en_livraison", "livree", "annulee"];

function addPointsHistory(userId, label, pts, type) {
  Store.insert("pointsHistory", {
    userId,
    label,
    date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    pts,
    type,
  });
}

export const OrderService = {
  createOrder(userId, { items, adresse, quartier }) {
    if (!Array.isArray(items) || items.length === 0) {
      const e = new Error("Le panier est vide.");
      e.status = 400;
      throw e;
    }
    const resolvedItems = items.map(({ productId, qty }) => {
      const p = CatalogService.getProduct(productId);
      if (!p) {
        const e = new Error(`Produit introuvable (id ${productId}).`);
        e.status = 404;
        throw e;
      }
      return { productId: p.id, name: p.name, price: p.price, qty };
    });
    const total = resolvedItems.reduce((s, i) => s + i.price * i.qty, 0);
    const user = Store.findById("users", userId);

    const order = Store.insert("orders", {
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
      Store.update("users", userId, { points: user.points + gained, commandes: user.commandes + 1 });
      addPointsHistory(userId, `Commande #CMD-${order.id}`, gained, "gain");
    }
    return order;
  },

  listOrdersForUser(userId) {
    return Store.all("orders").filter((o) => o.userId === userId).sort((a, b) => b.id - a.id);
  },

  getOrderForUser(userId, orderId) {
    const o = Store.findById("orders", orderId);
    return o && o.userId === userId ? o : null;
  },

  listAllOrders({ statut } = {}) {
    const items = Store.all("orders");
    return statut ? items.filter((o) => o.statut === statut) : items;
  },

  listOrdersForLivreur(livreurId) {
    return Store.all("orders").filter((o) => o.livreurId === livreurId);
  },

  assignLivreur(orderId, livreurId) {
    return Store.update("orders", orderId, { livreurId, statut: "en_livraison" });
  },

  updateStatus(orderId, statut) {
    if (!STATUTS.includes(statut)) {
      const e = new Error(`Statut invalide. Valeurs autorisées : ${STATUTS.join(", ")}.`);
      e.status = 400;
      throw e;
    }
    return Store.update("orders", orderId, { statut });
  },

  pointsHistory(userId) {
    return Store.all("pointsHistory").filter((h) => h.userId === userId).sort((a, b) => b.id - a.id);
  },

  redeemReward(userId, rewardId) {
    const reward = Store.all("rewards").find((r) => r.id === Number(rewardId));
    const user = Store.findById("users", userId);
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
    Store.update("users", userId, { points: user.points - reward.cost });
    addPointsHistory(userId, `Récompense : ${reward.name}`, -reward.cost, "loss");
    return { reward, remainingPoints: user.points - reward.cost };
  },
};
