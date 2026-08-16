/* ============================================================
   CLO-CLO Backend | http.js
   Petit framework HTTP maison (routeur + middlewares) basé
   uniquement sur node:http — zéro dépendance npm.
   ============================================================ */
import { verifyToken } from "./auth.js";
import { config } from "./config.js";

export function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": config.corsOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(body);
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) req.destroy(); // garde-fou taille payload
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Corps de requête JSON invalide."));
      }
    });
    req.on("error", reject);
  });
}

/** Extrait et vérifie le token Bearer ; lève une erreur 401 si absent/invalide */
export function requireAuth(req) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) {
    const e = new Error("Authentification requise.");
    e.status = 401;
    throw e;
  }
  return payload; // { sub, role, iat, exp }
}

/** Vérifie que l'utilisateur authentifié a l'un des rôles autorisés */
export function requireRole(payload, ...roles) {
  if (!roles.includes(payload.role)) {
    const e = new Error("Accès refusé pour ce rôle.");
    e.status = 403;
    throw e;
  }
}

export class Router {
  constructor() {
    this.routes = [];
  }
  add(method, pattern, handler) {
    const keys = [];
    const regex = new RegExp(
      "^" + pattern.replace(/:[^/]+/g, (m) => { keys.push(m.slice(1)); return "([^/]+)"; }) + "$"
    );
    this.routes.push({ method, regex, keys, handler });
    return this;
  }
  get(p, h) { return this.add("GET", p, h); }
  post(p, h) { return this.add("POST", p, h); }
  put(p, h) { return this.add("PUT", p, h); }
  patch(p, h) { return this.add("PATCH", p, h); }
  delete(p, h) { return this.add("DELETE", p, h); }

  async handle(req, res) {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "OPTIONS") return sendJson(res, 204, {});

    for (const r of this.routes) {
      if (r.method !== req.method) continue;
      const match = url.pathname.match(r.regex);
      if (!match) continue;
      const params = {};
      r.keys.forEach((k, i) => (params[k] = match[i + 1]));
      const query = Object.fromEntries(url.searchParams.entries());
      try {
        const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readJsonBody(req) : {};
        await r.handler({ req, res, params, query, body });
      } catch (err) {
        sendJson(res, err.status || 500, { error: err.message || "Erreur serveur." });
      }
      return;
    }
    sendJson(res, 404, { error: "Route introuvable." });
  }
}
