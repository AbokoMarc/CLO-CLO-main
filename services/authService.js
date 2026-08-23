/* ============================================================
   CLO-CLO Frontend | services/authService.js
   ============================================================ */
import { ApiClient } from "./apiClient.js";

export const AuthService = {
  async register({ nom, email, tel, mdp, quartier, adresse }) {
    const data = await ApiClient.post("/auth/register", { nom, email, tel, mdp, quartier, adresse });
    ApiClient.setToken(data.token);
    return data.user;
  },
  async loginClient(email, mdp) {
    const data = await ApiClient.post("/auth/login/client", { email, mdp });
    ApiClient.setToken(data.token);
    return data.user;
  },
  async loginLivreur(matricule, mdp) {
    const data = await ApiClient.post("/auth/login/livreur", { matricule, mdp });
    ApiClient.setToken(data.token);
    return data.user;
  },
  async loginAdmin(username, mdp) {
    const data = await ApiClient.post("/auth/login/admin", { username, mdp });
    ApiClient.setToken(data.token);
    return data.user;
  },
  async updateProfile(patch) {
    return ApiClient.patch("/auth/me", patch, { auth: true });
  },
  /** Changement de mot de passe — utilisable par un client, un livreur ou un admin connecté. */
  async changePassword(currentPwd, newPwd) {
    return ApiClient.patch("/auth/me/password", { currentPwd, newPwd }, { auth: true });
  },
  async me() {
    if (!ApiClient.getToken()) return null;
    try {
      return await ApiClient.get("/auth/me", { auth: true });
    } catch (err) {
      if (err.status === 401) { ApiClient.clearToken(); return null; }
      // Le serveur (Render, plan gratuit) peut mettre 30-50s à se "réveiller"
      // après une période d'inactivité. On retente une fois après un court
      // délai avant d'abandonner — le token, lui, n'est jamais effacé ici.
      await new Promise((r) => setTimeout(r, 4000));
      try {
        return await ApiClient.get("/auth/me", { auth: true });
      } catch (err2) {
        if (err2.status === 401) ApiClient.clearToken();
        return null;
      }
    }
  },
  isAuthenticated() {
    return !!ApiClient.getToken();
  },
  logout() {
    ApiClient.clearToken();
  },
};
