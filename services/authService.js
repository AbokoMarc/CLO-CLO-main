/* ============================================================
   CLO-CLO Frontend | services/authService.js
   ============================================================ */
import { ApiClient } from "./apiClient.js";

export const AuthService = {
  async register({ nom, email, tel, mdp, quartier, adresse, codeParrainage }) {
    let data;
    try {
      data = await ApiClient.post("/auth/register", { nom, email, tel, mdp, quartier, adresse, ...(codeParrainage ? { codeParrainage } : {}) });   // (le code de parrainage n'était jamais transmis au serveur)
    } catch (err) {
      // Réseau coupé APRÈS que le serveur ait créé le compte : la reprise reçoit « existe déjà ».
      // Plutôt qu'une erreur déroutante, on connecte la personne avec les identifiants qu'elle vient de saisir.
      if (err.afterRetry && /existe d[ée]j[àa]/i.test(err.message || "")) {
        data = await ApiClient.post("/auth/login/client", { email, mdp });
      } else throw err;
    }
    ApiClient.setToken(data.token);
    this._cache(data.user);
    document.documentElement.classList.add("is-auth");
    return data.user;
  },
  async loginClient(email, mdp) {
    const data = await ApiClient.post("/auth/login/client", { email, mdp });
    ApiClient.setToken(data.token);
    this._cache(data.user);
    document.documentElement.classList.add("is-auth");
    return data.user;
  },
  async loginLivreur(matricule, mdp) {
    const data = await ApiClient.post("/auth/login/livreur", { matricule, mdp });
    ApiClient.setToken(data.token);
    this._cache(data.user);
    document.documentElement.classList.add("is-auth");
    return data.user;
  },
  async loginAdmin(username, mdp) {
    const data = await ApiClient.post("/auth/login/admin", { username, mdp });
    ApiClient.setToken(data.token);
    this._cache(data.user);
    document.documentElement.classList.add("is-auth");
    return data.user;
  },
  async updateProfile(patch) {
    return ApiClient.patch("/auth/me", patch, { auth: true });
  },
  /** Changement de mot de passe — utilisable par un client, un livreur ou un admin connecté. */
  async changePassword(currentPwd, newPwd) {
    return ApiClient.patch("/auth/me/password", { currentPwd, newPwd }, { auth: true });
  },
  /** L'admin définit son propre numéro (bouton "Appeler l'admin" côté livreur). */
  async setPhone(tel) {
    return ApiClient.patch("/auth/me/phone", { tel }, { auth: true });
  },
  addFavoriteAddress(address) {
    return ApiClient.post("/auth/me/addresses", address, { auth: true });
  },
  removeFavoriteAddress(id) {
    return ApiClient.delete(`/auth/me/addresses/${id}`, { auth: true });
  },
  /** Dernier profil connu (par rôle) : permet d'afficher l'utilisateur connecté tout de suite,
      même si le serveur (Render gratuit) met 30-50 s à se réveiller. */
  cachedUser() {
    try { return JSON.parse(localStorage.getItem(`${ApiClient.key}_user`) || "null"); } catch { return null; }
  },
  _cache(user) { try { localStorage.setItem(`${ApiClient.key}_user`, JSON.stringify(user)); } catch { /* plein */ } },
  _forget() { ApiClient.clearToken(); try { localStorage.removeItem(`${ApiClient.key}_user`); } catch { /* ignoré */ } document.documentElement.classList.remove("is-auth"); },

  /** Renouvelle le jeton s'il a plus de 5 jours (session glissante : on ne se déconnecte que si on le décide). */
  async _renewIfOld() {
    try {
      const token = ApiClient.getToken();
      const iat = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).iat;
      if (Date.now() / 1000 - iat > 5 * 86400) {
        const r = await ApiClient.post("/auth/refresh", {}, { auth: true });
        ApiClient.setToken(r.token);
      }
    } catch { /* pas grave : on réessaiera à la prochaine visite */ }
  },

  /** Règle d'or : SEUL un refus explicite du serveur (401) déconnecte. Réseau lent, serveur endormi
      ou erreur 5xx → on garde la session et on affiche le dernier profil connu. */
  async me() {
    if (!ApiClient.getToken()) return null;
    const cached = this.cachedUser();
    const fetchOnce = () => ApiClient.get("/auth/me", { auth: true });
    const live = (async () => {
      let lastErr;
      for (let attempt = 0; attempt < 4; attempt++) {
        try { const u = await fetchOnce(); this._cache(u); this._renewIfOld(); return u; }
        catch (err) {
          if (err.status === 401) { this._forget(); return null; }
          lastErr = err;
          await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
        }
      }
      return cached || (lastErr && null);
    })();
    if (!cached) return live;                       // première connexion sur cet appareil : on attend la réponse
    // Profil déjà connu : on n'attend que 3,5 s au maximum, la mise à jour se poursuit en arrière-plan.
    return Promise.race([live, new Promise((r) => setTimeout(() => r(cached), 3500))]);
  },
  isAuthenticated() {
    return !!ApiClient.getToken();
  },
  logout() {
    this._forget();
  },
  myReferrals() { return ApiClient.get("/auth/me/referrals", { auth: true }); },
};
