/* ============================================================
   CLO-CLO Backend | services/orderService.js — couche SERVICE
   ============================================================ */
import { PaymentService } from "./paymentService.js";
import { Store } from "../repositories/store.js";
import { CatalogService } from "./catalogService.js";
import { notifyOrderEvent, notifySos } from "../notify.js";
import { computeDeliveryFee } from "../pricing.js";

const POINTS_PER_500_FCFA = 5;
// Flux de livraison en plusieurs étapes :
// en_preparation -> assignee (admin a désigné un livreur, en attente de son acceptation)
//                -> acceptee (livreur a accepté : le chat s'ouvre, la géolocalisation N'EST PAS encore active)
//                -> en_livraison (livreur a démarré la course : la géolocalisation démarre)
//                -> livree (une fois les 3 confirmations réunies : livreur + client + admin)
//                -> annulee
const STATUTS = ["en_preparation", "assignee", "acceptee", "en_livraison", "livree", "annulee"];

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
  async createOrder(userId, { items, adresse, quartier, clientLat, clientLng, promoCode, scheduledFor, paymentMethod, idempotencyKey }) {
    const bad = (status, msg) => { const e = new Error(msg); e.status = status; return e; };
    if (!Array.isArray(items) || items.length === 0) throw bad(400, "Le panier est vide.");
    if (items.length > 40) throw bad(400, "Panier trop volumineux.");

    // Idempotence : un double-clic / un réseau lent qui renvoie la requête ne crée JAMAIS deux commandes.
    const idem = idempotencyKey ? String(idempotencyKey).slice(0, 80) : null;
    if (idem) {
      const existing = await Store.findOne("orders", "userId = ? AND idempotencyKey = ?", userId, idem);
      if (existing) return existing;
    }

    // Quantités : entiers 1..50, regroupement des doublons, produits existants ET disponibles.
    const merged = new Map();
    for (const it of items) {
      const qty = Number(it?.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 50) throw bad(400, "Quantité invalide (1 à 50 par produit).");
      merged.set(Number(it.productId), (merged.get(Number(it.productId)) || 0) + qty);
    }
    const resolvedItems = [];
    for (const [productId, qty] of merged) {
      const p = await CatalogService.getProduct(productId);
      if (!p) throw bad(404, `Produit introuvable (id ${productId}).`);
      if (p.disponible === false) throw bad(409, `« ${p.name} » n'est plus disponible. Retirez-le du panier.`);
      resolvedItems.push({ productId: p.id, name: p.name, price: p.price, qty: Math.min(qty, 50) });
    }
    const produitsTotal = resolvedItems.reduce((s, i) => s + i.price * i.qty, 0);
    const user = await Store.findById("users", userId);
    if (!user) throw bad(404, "Client introuvable.");

    const finalAdresse = String(adresse || user.adresse || "").trim();
    const finalQuartier = String(quartier || user.quartier || "").trim();
    if (!finalAdresse && !finalQuartier) throw bad(400, "Quartier et adresse requis.");

    let when = null;
    if (scheduledFor) {
      const d = new Date(scheduledFor);
      if (Number.isNaN(d.getTime())) throw bad(400, "Heure de livraison invalide.");
      if (d.getTime() < Date.now() - 5 * 60 * 1000) throw bad(400, "L'heure de livraison choisie est déjà passée.");
      when = d.toISOString();
    }

    const method = paymentMethod || "cash";
    if (!PaymentService.isValidMethod(method)) throw bad(400, "Mode de paiement indisponible.");
    const online = PaymentService.isOnline(method);

    // Frais de livraison réels, calculés sur la distance (toujours entre 1000 et 2000 FCFA).
    const { fee: fraisLivraison, km: distanceKm } = computeDeliveryFee(clientLat, clientLng);

    // Code promo (facultatif) : réduction en % ou montant fixe, appliquée sur le total produits.
    let discount = 0, appliedCode = null;
    if (promoCode) {
      const promo = await Store.findOne("promoCodes", "code = ? AND active = 1", String(promoCode).trim().toUpperCase());
      if (promo) {
        discount = promo.type === "percent" ? Math.round((produitsTotal * promo.value) / 100) : promo.value;
        discount = Math.max(0, Math.min(discount, produitsTotal)); // jamais de remise négative ni supérieure aux produits
        appliedCode = promo.code;
      }
    }
    const total = produitsTotal - discount + fraisLivraison;

    let order;
    try {
      order = await Store.insert("orders", {
        userId, items: resolvedItems, total,
        adresse: finalAdresse, quartier: finalQuartier,
        // Paiement en ligne : la commande n'est transmise à la cuisine qu'une fois le paiement confirmé.
        statut: online ? "en_attente_paiement" : "en_preparation",
        livreurId: null, etaMinutes: 25, createdAt: new Date().toISOString(),
        fraisLivraison, distanceKm, promoCode: appliedCode, discount, tip: 0, scheduledFor: when,
        paymentMethod: method, paymentStatus: online ? "en_attente" : "a_la_livraison", idempotencyKey: idem,
      });
    } catch (err) {
      // Course entre deux requêtes identiques : l'index unique a refusé la 2ᵉ → on renvoie la 1ʳᵉ.
      if (idem && /UNIQUE|constraint/i.test(String(err.message))) {
        const existing = await Store.findOne("orders", "userId = ? AND idempotencyKey = ?", userId, idem);
        if (existing) return existing;
      }
      throw err;
    }

    // Points + compteur : ne doivent JAMAIS faire échouer une commande déjà enregistrée.
    try {
      const gained = Math.floor(total / 500) * POINTS_PER_500_FCFA;
      await Store.update("users", userId, { points: user.points + gained, commandes: user.commandes + 1 });
      await addPointsHistory(userId, `Commande #CMD-${order.id}`, gained, "gain");
    } catch (err) { console.error("points commande", order.id, err.message); }

    if (!online) notifyOrderEvent("order:new", order);
    return order;
  },

  /** Ajoute le nom + téléphone du livreur assigné, pour le bouton "Appeler le
      livreur" côté client — sans exposer d'autres infos sensibles du livreur. */
  async _withLivreurContact(order) {
    if (!order?.livreurId) return order;
    const livreur = await Store.findById("livreurs", order.livreurId);
    return livreur ? { ...order, livreurContact: { nom: livreur.nom, tel: livreur.tel, photoUrl: livreur.photoUrl || null } } : order;
  },

  /** Ajoute le nom + téléphone du client, pour le bouton "Appeler le client"
      côté livreur. */
  async _withClientContact(order) {
    if (!order?.userId) return order;
    const client = await Store.findById("users", order.userId);
    return client ? { ...order, clientContact: { nom: client.nom, tel: client.tel } } : order;
  },

  async listOrdersForUser(userId) {
    const orders = await Store.all("orders");
    const mine = orders.filter((o) => o.userId === userId).sort((a, b) => b.id - a.id);
    return Promise.all(mine.map((o) => this._withLivreurContact(o)));
  },

  async getOrderForUser(userId, orderId) {
    const o = await Store.findById("orders", orderId);
    if (!o || o.userId !== userId) return null;
    return this._withLivreurContact(o);
  },

  async listAllOrders({ statut } = {}) {
    const items = await Store.all("orders");
    return statut ? items.filter((o) => o.statut === statut) : items;
  },

  async listOrdersForLivreur(livreurId) {
    const orders = await Store.all("orders");
    const mine = orders.filter((o) => Number(o.livreurId) === Number(livreurId));
    return Promise.all(mine.map((o) => this._withClientContact(o)));
  },

  /** L'admin désigne un livreur — celui-ci doit encore ACCEPTER (voir acceptDelivery)
      avant que quoi que ce soit ne démarre réellement. */
  async assignLivreur(orderId, livreurId) {
    const order = await Store.update("orders", orderId, { livreurId: Number(livreurId), statut: "assignee" });
    notifyOrderEvent("order:assigned", order);
    return order;
  },

  /** Étape 1/2 côté livreur : il accepte la course. Le chat s'ouvre immédiatement,
      mais la géolocalisation ne démarre PAS encore (ça, c'est startDelivery). */
  async acceptDelivery(livreurId, orderId) {
    const order = await Store.findById("orders", orderId);
    if (!order || Number(order.livreurId) !== Number(livreurId)) {
      const e = new Error("Cette livraison ne vous est pas assignée.");
      e.status = 403;
      throw e;
    }
    const updated = await Store.update("orders", orderId, { statut: "acceptee" });
    await Store.update("livreurs", Number(livreurId), { statut: "en_livraison" });
    notifyOrderEvent("order:accepted", updated);
    return updated;
  },

  /** Étape 2/2 côté livreur : démarre VRAIMENT la livraison — c'est ce second
      geste qui active le partage de position GPS (pas l'acceptation seule). */
  async startDelivery(livreurId, orderId) {
    const order = await Store.findById("orders", orderId);
    if (!order || Number(order.livreurId) !== Number(livreurId)) {
      const e = new Error("Cette livraison ne vous est pas assignée.");
      e.status = 403;
      throw e;
    }
    if (order.statut !== "acceptee") {
      const e = new Error("Vous devez d'abord accepter cette livraison.");
      e.status = 400;
      throw e;
    }
    const updated = await Store.update("orders", orderId, { statut: "en_livraison" });
    notifyOrderEvent("order:started", updated);
    return updated;
  },

  async updateStatus(orderId, statut) {
    if (!STATUTS.includes(statut)) {
      const e = new Error(`Statut invalide. Valeurs autorisées : ${STATUTS.join(", ")}.`);
      e.status = 400;
      throw e;
    }
    const order = await Store.update("orders", orderId, { statut });
    if (order.livreurId && statut === "annulee") {
      await Store.update("livreurs", Number(order.livreurId), { statut: "disponible" });
    }
    notifyOrderEvent("order:updated", order);
    return order;
  },

  /* ── TRIPLE CONFIRMATION DE LIVRAISON ──
     La commande ne passe "livree" que lorsque les TROIS parties ont confirmé :
     le livreur (il a livré), le client (il a reçu), l'admin (vérification finale).
     C'est à ce moment précis que les statistiques/paie sont considérées définitives. */
  async confirmDelivery(role, orderId) {
    const order = await Store.findById("orders", orderId);
    if (!order) {
      const e = new Error("Commande introuvable.");
      e.status = 404;
      throw e;
    }
    const field = { livreur: "confirmedLivreurAt", client: "confirmedClientAt", admin: "confirmedAdminAt" }[role];
    if (!field) {
      const e = new Error("Rôle invalide pour la confirmation.");
      e.status = 400;
      throw e;
    }
    const patch = { [field]: new Date().toISOString() };
    let updated = await Store.update("orders", orderId, patch);

    if (updated.confirmedLivreurAt && updated.confirmedClientAt && updated.confirmedAdminAt && updated.statut !== "livree") {
      updated = await Store.update("orders", orderId, { statut: "livree" });
      if (updated.livreurId) await Store.update("livreurs", Number(updated.livreurId), { statut: "disponible" });
    }
    notifyOrderEvent("order:confirmation", updated);
    return updated;
  },

  /** Le CLIENT peut annuler sa propre commande, uniquement tant qu'elle est encore en préparation
      (pas encore assignée à un livreur). */
  async cancelOrder(userId, orderId) {
    const order = await Store.findById("orders", orderId);
    if (!order || order.userId !== userId) {
      const e = new Error("Commande introuvable.");
      e.status = 404;
      throw e;
    }
    if (order.statut !== "en_preparation" && order.statut !== "en_attente_paiement") {
      const e = new Error("Cette commande ne peut plus être annulée : elle est déjà prise en charge par un livreur.");
      e.status = 400;
      throw e;
    }
    const updated = await Store.update("orders", orderId, { statut: "annulee" });
    // Les points gagnés à la création sont repris : annuler ne doit pas rapporter de points.
    try {
      const user = await Store.findById("users", userId);
      const gained = Math.floor(order.total / 500) * POINTS_PER_500_FCFA;
      if (user && gained > 0) {
        await Store.update("users", userId, { points: Math.max(0, user.points - gained), commandes: Math.max(0, user.commandes - 1) });
        await addPointsHistory(userId, `Commande #CMD-${order.id} annulée`, -gained, "annulation");
      }
    } catch (err) { console.error("reprise points", order.id, err.message); }
    if (order.paymentStatus === "paye") await Store.update("orders", orderId, { paymentStatus: "a_rembourser" });
    notifyOrderEvent("order:cancelled", updated);
    return updated;
  },

  /** Note + commentaire laissés par le client après une livraison complétée. */
  async rateDelivery(userId, orderId, rating, comment) {
    const order = await Store.findById("orders", orderId);
    if (!order || order.userId !== userId) {
      const e = new Error("Commande introuvable.");
      e.status = 404;
      throw e;
    }
    if (order.statut !== "livree") {
      const e = new Error("Vous ne pouvez noter qu'une commande déjà livrée.");
      e.status = 400;
      throw e;
    }
    const n = Number(rating);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      const e = new Error("La note doit être un nombre entier entre 1 et 5.");
      e.status = 400;
      throw e;
    }
    return Store.update("orders", orderId, { rating: n, ratingComment: comment || null });
  },

  /** Pourboire laissé par le client au livreur, après livraison. */
  async tipDelivery(userId, orderId, tip) {
    const order = await Store.findById("orders", orderId);
    if (!order || order.userId !== userId) {
      const e = new Error("Commande introuvable.");
      e.status = 404;
      throw e;
    }
    const n = Number(tip);
    if (!Number.isFinite(n) || n < 0) {
      const e = new Error("Montant de pourboire invalide.");
      e.status = 400;
      throw e;
    }
    return Store.update("orders", orderId, { tip: n });
  },

  /** Bouton SOS pendant une livraison active — alerte immédiate l'admin (et le livreur si
      c'est le client qui déclenche), avec la position de celui qui a déclenché l'alerte. */
  async triggerSos(role, userId, orderId, lat, lng) {
    const order = await Store.findById("orders", orderId);
    if (!order) {
      const e = new Error("Commande introuvable.");
      e.status = 404;
      throw e;
    }
    notifySos(order, role, { lat, lng });
    return { ok: true };
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

  /* ── LOCALISATION EN TEMPS RÉEL (client + livreur, pendant une livraison) ──
     Stockée en mémoire seulement (pas en base) : c'est une donnée "live",
     pas un historique à conserver. Redémarrer le serveur la réinitialise,
     ce qui est normal pour ce type de donnée. */
  _liveLocations: new Map(), // orderId -> { client: {lat,lng,at}, livreur: {lat,lng,at} }

  async updateLocation(orderId, role, userId, lat, lng) {
    const order = await Store.findById("orders", Number(orderId));
    if (!order) {
      const e = new Error("Commande introuvable.");
      e.status = 404;
      throw e;
    }
    const authorized =
      (role === "client" && order.userId === Number(userId)) ||
      (role === "livreur" && Number(order.livreurId) === Number(userId));
    if (!authorized) {
      const e = new Error("Non autorisé pour cette commande.");
      e.status = 403;
      throw e;
    }
    // La géolocalisation du livreur ne doit être prise en compte que si la
    // livraison est VRAIMENT démarrée (statut "en_livraison"), pas dès
    // l'acceptation — cohérent avec le flux en 2 étapes demandé.
    if (role === "livreur" && order.statut !== "en_livraison") return {};

    const current = this._liveLocations.get(order.id) || {};
    current[role] = { lat, lng, at: new Date().toISOString() };
    this._liveLocations.set(order.id, current);
    notifyOrderEvent("order:location", { ...order, location: current });
    return current;
  },

  async getLocation(orderId) {
    return this._liveLocations.get(Number(orderId)) || {};
  },

  /* ── CHAT (client ↔ livreur) — disponible dès l'acceptation, pas besoin d'attendre le GPS ── */
  async sendMessage(orderId, role, userId, text) {
    const order = await Store.findById("orders", Number(orderId));
    if (!order) {
      const e = new Error("Commande introuvable.");
      e.status = 404;
      throw e;
    }
    const authorized =
      role === "admin" ||
      (role === "client" && order.userId === Number(userId)) ||
      (role === "livreur" && Number(order.livreurId) === Number(userId));
    if (!authorized) {
      const e = new Error("Non autorisé pour cette commande.");
      e.status = 403;
      throw e;
    }
    if (role !== "admin" && !["acceptee", "en_livraison"].includes(order.statut)) {
      const e = new Error("Le chat n'est disponible qu'une fois la livraison acceptée par le livreur.");
      e.status = 400;
      throw e;
    }
    if (!text || !text.trim()) {
      const e = new Error("Message vide.");
      e.status = 400;
      throw e;
    }
    const message = await Store.insert("messages", {
      orderId: order.id, sender: role, text: text.trim(), createdAt: new Date().toISOString(),
    });
    notifyOrderEvent("order:message", { ...order, message });
    return message;
  },

  async listMessages(orderId) {
    const all = await Store.all("messages");
    return all.filter((m) => m.orderId === Number(orderId)).sort((a, b) => a.id - b.id);
  },
};
