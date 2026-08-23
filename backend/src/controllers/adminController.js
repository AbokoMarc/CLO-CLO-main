import { AdminService } from "../services/adminService.js";
import { AuthService } from "../services/authService.js";
import { sendJson, requireAuth, requireRole } from "../http.js";

export const AdminController = {
  async stats({ req, res }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, await AdminService.dashboardStats());
  },
  async listClients({ req, res }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, await AdminService.listClients());
  },
  async listLivreurs({ req, res }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, await AdminService.listLivreurs());
  },
  async createLivreur({ req, res, body }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 201, await AdminService.createLivreur(body));
  },
  async updateLivreurStatut({ req, res, params, body }) {
    const auth = requireAuth(req);
    requireRole(auth, "admin", "livreur");
    sendJson(res, 200, await AdminService.updateLivreurStatut(params.id, body.statut));
  },
  /** L'admin fixe la paie (journalière ou mensuelle) d'un livreur — distincte de l'argent
      que le livreur encaisse en cash chez les clients à la livraison. */
  async setLivreurPaie({ req, res, params, body }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, await AdminService.setLivreurPaie(params.id, body));
  },
  /** Réinitialise le mot de passe d'un client (identité déjà vérifiée par l'admin en amont). */
  async resetClientPassword({ req, res, params }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, await AdminService.resetClientPassword(params.id));
  },
  /** Même principe pour un livreur — voir AdminService.resetLivreurPassword. */
  async resetLivreurPassword({ req, res, params }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, await AdminService.resetLivreurPassword(params.id));
  },
  async deleteLivreur({ req, res, params }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, await AdminService.deleteLivreur(params.id));
  },
  /** Déverrouille l'accès aux données confidentielles des clients : l'admin re-saisit
      son propre mot de passe avant de pouvoir consulter tel/email/adresse en clair. */
  async verifyPassword({ req, res, body }) {
    const auth = requireAuth(req);
    requireRole(auth, "admin");
    const ok = await AuthService.verifyPassword("admin", auth.sub, body.mdp);
    if (!ok) return sendJson(res, 401, { error: "Mot de passe incorrect." });
    sendJson(res, 200, { ok: true });
  },
};
