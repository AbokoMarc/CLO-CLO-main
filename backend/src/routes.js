/* ============================================================
   CLO-CLO Backend | routes.js — table de routage
   ============================================================ */
import { Router } from "./http.js";
import { AuthController } from "./controllers/authController.js";
import { CatalogController } from "./controllers/catalogController.js";
import { OrderController } from "./controllers/orderController.js";
import { AdminController } from "./controllers/adminController.js";
import { NotificationController } from "./controllers/notificationController.js";
import { PushController } from "./controllers/pushController.js";

export const router = new Router();

// Auth
router.post("/api/auth/register", AuthController.register);
router.post("/api/auth/login/client", AuthController.loginClient);
router.post("/api/auth/login/livreur", AuthController.loginLivreur);
router.post("/api/auth/login/admin", AuthController.loginAdmin);
router.get("/api/auth/me", AuthController.me);
router.patch("/api/auth/me", AuthController.updateMe);
router.patch("/api/auth/me/password", AuthController.changeMyPassword);
router.patch("/api/auth/me/phone", AuthController.setMyPhone);

// Catalogue
router.get("/api/products", CatalogController.listProducts);
router.get("/api/products/:id", CatalogController.getProduct);
router.post("/api/products", CatalogController.createProduct);
router.put("/api/products/:id", CatalogController.updateProduct);
router.delete("/api/products/:id", CatalogController.deleteProduct);
router.get("/api/rewards", CatalogController.listRewards);
router.get("/api/zones", CatalogController.listZones);

// Commandes
router.post("/api/orders", OrderController.create);
router.get("/api/orders/me", OrderController.myOrders);
router.get("/api/orders/points-history", OrderController.myPointsHistory);
router.get("/api/orders/livreur/me", OrderController.myDeliveries);
router.post("/api/rewards/:id/redeem", OrderController.redeemReward);
router.get("/api/orders", OrderController.listAll);
router.patch("/api/orders/:id/assign", OrderController.assign);
router.patch("/api/orders/:id/status", OrderController.updateStatus);
router.patch("/api/orders/:id/cancel", OrderController.cancel);
router.post("/api/orders/:id/location", OrderController.updateLocation);
router.get("/api/orders/:id/location", OrderController.getLocation);
router.post("/api/orders/:id/accept", OrderController.accept);
router.post("/api/orders/:id/start", OrderController.start);
router.post("/api/orders/:id/confirm", OrderController.confirm);
router.post("/api/orders/:id/rate", OrderController.rate);
router.post("/api/orders/:id/tip", OrderController.tip);
router.post("/api/orders/:id/sos", OrderController.sos);
router.post("/api/orders/:id/messages", OrderController.sendMessage);
router.get("/api/orders/:id/messages", OrderController.listMessages);
router.get("/api/orders/:id", OrderController.getOne);

// Admin
router.get("/api/admin/stats", AdminController.stats);
router.get("/api/admin/clients", AdminController.listClients);
router.post("/api/admin/clients/:id/reset-password", AdminController.resetClientPassword);
router.post("/api/admin/verify-password", AdminController.verifyPassword);
router.get("/api/admin/livreurs", AdminController.listLivreurs);
router.post("/api/admin/livreurs", AdminController.createLivreur);
router.patch("/api/admin/livreurs/:id/statut", AdminController.updateLivreurStatut);
router.patch("/api/admin/livreurs/:id/paie", AdminController.setLivreurPaie);
router.post("/api/admin/livreurs/:id/reset-password", AdminController.resetLivreurPassword);
router.delete("/api/admin/livreurs/:id", AdminController.deleteLivreur);
router.patch("/api/livreurs/me/actif", AdminController.setMyActif);
router.get("/api/admin-contact", AdminController.adminContact);
router.patch("/api/livreurs/me/photo", AdminController.setMyPhoto);
router.post("/api/livreurs/:id/messages", AdminController.sendLivreurMessage);
router.get("/api/livreurs/:id/messages", AdminController.listLivreurMessages);

// Codes promo
router.get("/api/admin/promo-codes", AdminController.listPromoCodes);
router.post("/api/admin/promo-codes", AdminController.createPromoCode);
router.patch("/api/admin/promo-codes/:id", AdminController.togglePromoCode);
router.delete("/api/admin/promo-codes/:id", AdminController.deletePromoCode);

// Notifications temps réel (SSE)
router.get("/api/notifications/stream", NotificationController.stream);

// Notifications push (arrivent même app fermée)
router.get("/api/push/vapid-public-key", PushController.vapidPublicKey);
router.post("/api/push/subscribe", PushController.subscribe);
router.post("/api/push/unsubscribe", PushController.unsubscribe);
