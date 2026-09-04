import { AuthService } from "../services/authService.js";
import { sendJson, requireAuth } from "../http.js";

export const AuthController = {
  async register({ res, body }) {
    sendJson(res, 201, await AuthService.registerClient(body));
  },
  async loginClient({ res, body }) {
    sendJson(res, 200, await AuthService.loginClient(body));
  },
  async loginLivreur({ res, body }) {
    sendJson(res, 200, await AuthService.loginLivreur(body));
  },
  async loginAdmin({ res, body }) {
    sendJson(res, 200, await AuthService.loginAdmin(body));
  },
  async me({ req, res }) {
    const payload = requireAuth(req);
    const user = await AuthService.me(payload);
    if (!user) return sendJson(res, 404, { error: "Utilisateur introuvable." });
    sendJson(res, 200, user);
  },
  async updateMe({ req, res, body }) {
    const payload = requireAuth(req);
    if (payload.role !== "client") return sendJson(res, 403, { error: "Réservé aux comptes client." });
    const user = await AuthService.updateClientProfile(payload.sub, body);
    if (!user) return sendJson(res, 404, { error: "Utilisateur introuvable." });
    sendJson(res, 200, user);
  },
  /** Changement de mot de passe — disponible pour les TROIS rôles (client, livreur, admin). */
  async changeMyPassword({ req, res, body }) {
    const payload = requireAuth(req);
    const result = await AuthService.changeOwnPassword(payload.role, payload.sub, body.currentPwd, body.newPwd);
    sendJson(res, 200, result);
  },
  /** L'admin définit son propre numéro (bouton "Appeler l'admin" côté livreur). */
  async setMyPhone({ req, res, body }) {
    const payload = requireAuth(req);
    if (payload.role !== "admin") return sendJson(res, 403, { error: "Réservé à l'administrateur." });
    sendJson(res, 200, await AuthService.setAdminPhone(payload.sub, body.tel));
  },
};
