import { AuthService } from "../services/authService.js";
import { sendJson, requireAuth } from "../http.js";

export const AuthController = {
  async register({ res, body }) {
    sendJson(res, 201, AuthService.registerClient(body));
  },
  async loginClient({ res, body }) {
    sendJson(res, 200, AuthService.loginClient(body));
  },
  async loginLivreur({ res, body }) {
    sendJson(res, 200, AuthService.loginLivreur(body));
  },
  async loginAdmin({ res, body }) {
    sendJson(res, 200, AuthService.loginAdmin(body));
  },
  async me({ req, res }) {
    const payload = requireAuth(req);
    const user = AuthService.me(payload);
    if (!user) return sendJson(res, 404, { error: "Utilisateur introuvable." });
    sendJson(res, 200, user);
  },
  async updateMe({ req, res, body }) {
    const payload = requireAuth(req);
    if (payload.role !== "client") return sendJson(res, 403, { error: "Réservé aux comptes client." });
    const user = AuthService.updateClientProfile(payload.sub, body);
    if (!user) return sendJson(res, 404, { error: "Utilisateur introuvable." });
    sendJson(res, 200, user);
  },
};
