/* ============================================================
   CLO-CLO Frontend | services/apiClient.js
   Client HTTP de base pour parler au backend. Toutes les autres
   couches "*Service" passent par ici — aucun fetch() ailleurs.
   ============================================================ */

/* URL du backend : modifiable sans toucher au code via une
   variable globale injectée par la page (voir config.js),
   avec repli sur localhost pour le développement. */
const API_BASE_URL = window.CLOCLO_CONFIG?.API_BASE_URL || "http://localhost:4000/api";

/* Chaque section du site (client / livreur / admin) garde SA PROPRE session,
   dans une clé localStorage distincte. Avant, une seule clé partagée faisait
   que se connecter en admin déconnectait silencieusement la session client
   (et vice versa) — très gênant pour un gérant qui bascule entre les deux.
   Le rôle est déduit du chemin de la page, chaque page HTML n'appartenant
   qu'à un seul rôle (admin-*.html, livreur-*.html, ou le reste = client). */
function detectRole() {
  const p = window.location.pathname;
  if (p.includes("admin-") || p.includes("directeur")) return "admin";
  if (p.includes("livreur")) return "livreur";
  return "client";
}
const TOKEN_KEY = `cloclo_token_${detectRole()}`;

export const ApiClient = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  async request(path, { method = "GET", body, auth = false } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = this.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    let res;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      const e = new Error("Impossible de contacter le serveur. Vérifiez votre connexion.");
      e.isNetworkError = true;
      throw e;
    }
    let data = null;
    try { data = await res.json(); } catch { /* réponse vide */ }
    if (!res.ok) {
      const e = new Error(data?.error || `Erreur ${res.status}`);
      e.status = res.status;
      throw e;
    }
    return data;
  },

  get(path, opts) { return this.request(path, { ...opts, method: "GET" }); },
  post(path, body, opts) { return this.request(path, { ...opts, method: "POST", body }); },
  put(path, body, opts) { return this.request(path, { ...opts, method: "PUT", body }); },
  patch(path, body, opts) { return this.request(path, { ...opts, method: "PATCH", body }); },
  delete(path, opts) { return this.request(path, { ...opts, method: "DELETE" }); },
};
