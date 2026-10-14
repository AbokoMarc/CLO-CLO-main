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
  key: TOKEN_KEY,
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  /* Appel API résistant aux mauvais réseaux :
     • plusieurs adresses (même domaine « /api » puis Render direct) — on mémorise celle qui répond ;
     • délai d'attente par essai (plus de bouton qui tourne indéfiniment) ;
     • jusqu'à 3 essais, sur erreur réseau, délai dépassé, ou passerelle (502/503/504) ;
     • les erreurs « normales » du serveur (mot de passe faux, produit indisponible…) ne sont JAMAIS rejouées ;
     • évènement « cloclo:api-status » pour afficher « connexion lente, nouvelle tentative… ». */
  async request(path, { method = "GET", body, auth = false } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = this.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    const init = { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined };
    const cfg = window.CLOCLO_CONFIG || {};
    const bases = cfg.API_BASE_URLS?.length ? cfg.API_BASE_URLS : [API_BASE_URL];
    const T = cfg.API_TIMEOUTS || { proxy: 20000, direct: 50000 };
    const pref = localStorage.getItem("cloclo_api_base");
    const ordered = bases.includes(pref) ? [pref, ...bases.filter((b) => b !== pref)] : bases;
    const plan = ordered.length > 1 ? [...ordered, ordered[0]] : [ordered[0], ordered[0], ordered[0]];   // 3 essais
    const emit = (phase, extra = {}) => document.dispatchEvent(new CustomEvent("cloclo:api-status", { detail: { phase, ...extra } }));
    const slow = setTimeout(() => emit("slow"), 8000);

    let last;
    try {
      for (let i = 0; i < plan.length; i++) {
        const base = plan[i];
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), base.startsWith("/") ? T.proxy : T.direct);
        try {
          const res = await fetch(`${base}${path}`, { ...init, signal: ctl.signal });
          clearTimeout(timer);
          const isJson = (res.headers.get("content-type") || "").includes("json");
          // Redirection absente (404 HTML) ou passerelle en panne : l'autre adresse a peut-être plus de chance.
          if ((!isJson && (res.status === 404 || res.status >= 500)) || [502, 503, 504].includes(res.status)) {
            last = new Error(`Passerelle ${res.status}`);
            emit("retry", { attempt: i + 1, total: plan.length });
            await new Promise((r) => setTimeout(r, 900));
            continue;
          }
          let data = null;
          try { data = await res.json(); } catch { /* réponse vide */ }
          try { localStorage.setItem("cloclo_api_base", base); } catch { /* ignoré */ }
          if (!res.ok) {
            const e = new Error(data?.error || `Erreur ${res.status}`);
            e.status = res.status;
            e.afterRetry = i > 0;                       // la requête a déjà été rejouée au moins une fois
            throw e;
          }
          emit("ok");
          return data;
        } catch (err) {
          clearTimeout(timer);
          if (err.status) throw err;                    // vraie réponse du serveur : on ne rejoue pas
          last = err;
          emit("retry", { attempt: i + 1, total: plan.length });
          await new Promise((r) => setTimeout(r, 900));
        }
      }
    } finally { clearTimeout(slow); }
    emit("failed");
    const e = new Error("Connexion au serveur impossible. Vérifiez votre réseau (essayez le Wi-Fi ou un autre opérateur), puis réessayez.");
    e.isNetworkError = true;
    e.afterRetry = true;
    e.cause = last;
    throw e;
  },

  get(path, opts) { return this.request(path, { ...opts, method: "GET" }); },
  post(path, body, opts) { return this.request(path, { ...opts, method: "POST", body }); },
  put(path, body, opts) { return this.request(path, { ...opts, method: "PUT", body }); },
  patch(path, body, opts) { return this.request(path, { ...opts, method: "PATCH", body }); },
  delete(path, opts) { return this.request(path, { ...opts, method: "DELETE" }); },
};
