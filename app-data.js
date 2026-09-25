/* ============================================================
   CLO-CLO | app-data.js — Store central de l'app CLIENT
   Toutes les données (produits, utilisateur, commandes,
   récompenses) viennent désormais du backend via services/.
   Seul le PANIER (en cours de saisie) reste en localStorage :
   c'est une donnée locale à la session, pas une donnée de
   production à dupliquer côté serveur.
   ============================================================ */
import { AuthService } from "./services/authService.js";
import { ProductService } from "./services/productService.js";
import { OrderService } from "./services/orderService.js";

const CART_KEY = "cloclo_cart";

export const APP = {
  user: null,
  products: [],
  rewards: [],
  cart: JSON.parse(localStorage.getItem(CART_KEY) || "[]"),
  orders: [],
  pointsHistory: [],
  ready: false,

  /** À appeler au chargement de chaque page : charge les vraies données depuis l'API */
  async init() {
    const [products, rewards, user] = await Promise.all([
      ProductService.list().catch(() => []),
      OrderService.listRewards().catch(() => []),
      AuthService.me().catch(() => null),
    ]);
    this.products = products;
    this.rewards = rewards;
    this.user = user;
    this.ready = true;
    return this;
  },

  isLoggedIn() {
    return !!this.user;
  },

  // ── Panier (local tant que la commande n'est pas passée) ──
  getCartTotal() { return this.cart.reduce((s, i) => s + i.price * i.qty, 0); },
  getCartCount() { return this.cart.reduce((s, i) => s + i.qty, 0); },

  addToCart(productId) {
    const p = this.products.find((x) => x.id === productId);
    if (!p) return false;
    const ex = this.cart.find((x) => x.id === productId);
    if (ex) ex.qty++;
    else this.cart.push({ id: p.id, name: p.name, price: p.price, qty: 1, img: p.img });
    this._saveCart();
    return true;
  },

  removeFromCart(productId) {
    this.cart = this.cart.filter((x) => x.id !== productId);
    this._saveCart();
  },

  updateQty(productId, delta) {
    const item = this.cart.find((x) => x.id === productId);
    if (!item) return;
    item.qty = Math.max(0, item.qty + delta);
    if (item.qty === 0) this.cart = this.cart.filter((x) => x.id !== productId);
    this._saveCart();
  },

  clearCart() { this.cart = []; this._saveCart(); },

  _saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(this.cart)); } catch { /* stockage indisponible */ }
  },

  // ── Commande : créée côté backend, qui calcule le total et les points ──
  async passCommande(adresse, extra = {}) {
    if (!this.isLoggedIn()) {
      const e = new Error("Connectez-vous pour passer une commande.");
      e.requiresAuth = true;
      throw e;
    }
    const items = this.cart.map((i) => ({ productId: i.id, qty: i.qty }));
    const order = await OrderService.create({ items, adresse: adresse || this.user.adresse, ...extra });
    this.clearCart();
    this.user = await AuthService.me();
    return order;
  },

  async loadMyOrders() {
    this.orders = this.isLoggedIn() ? await OrderService.myOrders() : [];
    return this.orders;
  },

  async loadPointsHistory() {
    this.pointsHistory = this.isLoggedIn() ? await OrderService.pointsHistory() : [];
    return this.pointsHistory;
  },

  async useReward(rewardId) {
    const result = await OrderService.redeemReward(rewardId);
    this.user = await AuthService.me();
    return result;
  },

  logout() {
    AuthService.logout();
    this.clearCart();
    window.location.href = "connexion.html";
  },
};

window.APP = APP; // exposé pour les scripts non-module (onclick inline, etc.)
