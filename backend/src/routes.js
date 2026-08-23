/* ============================================================
   CLO-CLO Backend | routes.js — table de routage
   ============================================================ */
import { Router } from "./http.js";
import { AuthController } from "./controllers/authController.js";
import { CatalogController } from "./controllers/catalogController.js";
import { OrderController } from "./controllers/orderController.js";
import { AdminController } from "./controllers/adminController.js";
import { NotificationController } from "./controllers/notificationController.js";

export const router = new Router();

// Auth
router.post("/api/auth/register", AuthController.register);
router.post("/api/auth/login/client", AuthController.loginClient);
router.post("/api/auth/login/livreur", AuthController.loginLivreur);
router.post("/api/auth/login/admin", AuthController.loginAdmin);
router.get("/api/auth/me", AuthController.me);
router.patch("/api/auth/me", AuthController.updateMe);
router.patch("/api/auth/me/password", AuthController.changeMyPassword);

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

// Notifications temps réel (SSE)
router.get("/api/notifications/stream", NotificationController.stream);
