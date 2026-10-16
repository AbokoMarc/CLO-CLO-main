import { signToken } from "../auth.js";
import { AuthService } from "../services/authService.js";
import { sendJson, requireAuth, requireRole } from "../http.js";
import { ResetService } from "../services/resetService.js";
import { guardLogin, hit, clientIp, RULES } from "../ratelimit.js";

export const AuthController = {
  async register({ req, res, body }) {
    hit(`register:ip:${clientIp(req)}`, RULES.registerIp);
    sendJson(res, 201, await AuthService.registerClient(body));
  },
  // Chaque connexion est protégée : 6 essais / 15 min par compte et 30 par adresse IP (puis verrouillage temporaire).
  async loginClient({ req, res, body }) {
    const ok = guardLogin(req, "client", body?.email);
    const result = await AuthService.loginClient(body);
    ok();
    sendJson(res, 200, result);
  },
  async loginLivreur({ req, res, body }) {
    const ok = guardLogin(req, "livreur", body?.matricule);
    const result = await AuthService.loginLivreur(body);
    ok();
    sendJson(res, 200, result);
  },
  async loginAdmin({ req, res, body }) {
    const ok = guardLogin(req, "admin", body?.username);
    const result = await AuthService.loginAdmin(body);
    ok();
    sendJson(res, 200, result);
  },

  /** « Mot de passe oublié » : réponse identique que le compte existe ou non. */
  async forgot({ req, res, body }) {
    hit(`forgot:ip:${clientIp(req)}`, RULES.forgotIp);
    hit(`forgot:id:${String(body?.identifier || "").trim().toLowerCase().slice(0, 120)}`, RULES.forgotId);
    sendJson(res, 200, await ResetService.request(body?.identifier));
  },
  async resetConfirm({ req, res, body }) {
    hit(`reset:ip:${clientIp(req)}`, RULES.loginIp);
    hit(`reset:id:${String(body?.identifier || "").trim().toLowerCase().slice(0, 120)}`, RULES.resetId);
    sendJson(res, 200, await ResetService.confirm(body?.identifier, body?.code, body?.mdp));
  },
  async adminResetList({ req, res }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, await ResetService.adminList());
  },
  async adminResetIssue({ req, res, params }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, await ResetService.adminIssue(params.id));
  },
  async adminResetDismiss({ req, res, params }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, await ResetService.adminDismiss(params.id));
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
  /** Renouvelle le jeton (30 jours de plus) : un utilisateur actif ne se fait plus jamais déconnecter. */
  async refresh({ req, res }) {
    const payload = requireAuth(req);
    const { iat, exp, ...claims } = payload;
    sendJson(res, 200, { token: signToken(claims) });
  },
  async deleteAccount({ req, res, body }) {
    const payload = requireAuth(req);
    if (payload.role !== "client") return sendJson(res, 403, { error: "Réservé aux comptes client." });
    hit(`delete:id:${payload.sub}`, RULES.loginId);
    sendJson(res, 200, await AuthService.deleteAccount(payload.sub, body?.mdp));
  },
  async myReferrals({ req, res }) {
    const payload = requireAuth(req);
    if (payload.role !== "client") return sendJson(res, 403, { error: "Réservé aux comptes client." });
    sendJson(res, 200, await AuthService.myReferrals(payload.sub));
  },
  async addFavoriteAddress({ req, res, body }) {
    const payload = requireAuth(req);
    if (payload.role !== "client") return sendJson(res, 403, { error: "Réservé aux comptes client." });
    sendJson(res, 201, await AuthService.addFavoriteAddress(payload.sub, body));
  },
  async removeFavoriteAddress({ req, res, params }) {
    const payload = requireAuth(req);
    if (payload.role !== "client") return sendJson(res, 403, { error: "Réservé aux comptes client." });
    sendJson(res, 200, await AuthService.removeFavoriteAddress(payload.sub, params.id));
  },
};
