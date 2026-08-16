import { AdminService } from "../services/adminService.js";
import { sendJson, requireAuth, requireRole } from "../http.js";

export const AdminController = {
  async stats({ req, res }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, AdminService.dashboardStats());
  },
  async listClients({ req, res }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, AdminService.listClients());
  },
  async listLivreurs({ req, res }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, AdminService.listLivreurs());
  },
  async createLivreur({ req, res, body }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 201, AdminService.createLivreur(body));
  },
  async updateLivreurStatut({ req, res, params, body }) {
    const auth = requireAuth(req);
    requireRole(auth, "admin", "livreur");
    sendJson(res, 200, AdminService.updateLivreurStatut(params.id, body.statut));
  },
};
