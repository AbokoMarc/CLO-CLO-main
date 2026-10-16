/* ============================================================
   CLO-CLO Backend | ratelimit.js
   Protection contre les essais de mots de passe en série (et le spam
   de demandes de récupération). Aucune dépendance, en mémoire :
   • fenêtre glissante par clé (IP, identifiant…) ;
   • verrouillage temporaire quand le plafond est atteint ;
   • réponse 429 avec le délai restant, lisible par l'utilisateur.
   NB : sur Render gratuit (une seule instance) la mémoire suffit ;
   avec plusieurs instances il faudrait un stockage partagé.
   ============================================================ */
const buckets = new Map(); // clé -> { hits: number[], lockedUntil: number }

const fail = (retryAfterSec) => {
  const min = Math.ceil(retryAfterSec / 60);
  const e = new Error(`Trop de tentatives. Réessayez dans ${min <= 1 ? "1 minute" : min + " minutes"}.`);
  e.status = 429;
  e.retryAfter = retryAfterSec;
  return e;
};

/** Adresse IP réelle du visiteur derrière Vercel / Render (premier élément de X-Forwarded-For). */
export function clientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || req.socket?.remoteAddress || "inconnue";
}

/**
 * Vérifie ET compte une tentative. À appeler AVANT l'opération sensible.
 * @param {string} key      ex. "login:ip:1.2.3.4" ou "login:id:marie@x.cm"
 * @param {{max:number, windowMs:number, lockMs?:number}} rule
 */
export function hit(key, { max, windowMs, lockMs = windowMs }) {
  const now = Date.now();
  const b = buckets.get(key) || { hits: [], lockedUntil: 0 };
  if (b.lockedUntil > now) throw fail(Math.ceil((b.lockedUntil - now) / 1000));
  b.hits = b.hits.filter((t) => now - t < windowMs);
  b.hits.push(now);
  if (b.hits.length > max) {
    b.lockedUntil = now + lockMs;
    b.hits = [];
    buckets.set(key, b);
    throw fail(Math.ceil(lockMs / 1000));
  }
  buckets.set(key, b);
}

/** Connexion réussie : on repart de zéro pour cet identifiant. */
export function reset(key) { buckets.delete(key); }

/** Règles utilisées par les routes d'authentification. */
export const RULES = {
  loginId:  { max: 6,  windowMs: 15 * 60_000, lockMs: 15 * 60_000 }, // 6 essais / 15 min par compte
  loginIp:  { max: 30, windowMs: 15 * 60_000, lockMs: 15 * 60_000 }, // 30 essais / 15 min par adresse IP
  registerIp: { max: 10, windowMs: 60 * 60_000, lockMs: 60 * 60_000 },
  forgotId: { max: 3,  windowMs: 60 * 60_000, lockMs: 60 * 60_000 }, // 3 demandes / heure par compte
  forgotIp: { max: 10, windowMs: 60 * 60_000, lockMs: 60 * 60_000 },
  resetId:  { max: 12, windowMs: 30 * 60_000, lockMs: 30 * 60_000 }, // chaque code reste de toute façon limité à 5 essais
};

/** Applique la double protection (par compte + par IP) à une tentative de connexion. */
export function guardLogin(req, scope, identifier) {
  const id = String(identifier || "").trim().toLowerCase().slice(0, 120);
  hit(`${scope}:ip:${clientIp(req)}`, RULES.loginIp);
  if (id) hit(`${scope}:id:${id}`, RULES.loginId);
  return () => { if (id) reset(`${scope}:id:${id}`); };       // à appeler en cas de succès
}

// Ménage périodique : ne jamais laisser grossir la mémoire.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.lockedUntil < now && b.hits.every((t) => now - t > 3_600_000)) buckets.delete(k);
}, 10 * 60_000).unref();
