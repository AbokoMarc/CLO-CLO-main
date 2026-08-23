/* ============================================================
   CLO-CLO Backend | auth.js
   Hachage de mot de passe + tokens signés — 100% Node natif
   (aucune dépendance npm requise : crypto est un module natif)
   ============================================================ */
import crypto from "node:crypto";
import { config } from "./config.js";

/** Hache un mot de passe en clair -> "sel:hash" (scrypt) */
export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Vérifie un mot de passe en clair contre un hash stocké */
export function verifyPassword(plain, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const check = crypto.scryptSync(plain, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

/** Émet un token signé (équivalent JWT léger, HMAC-SHA256) */
export function signToken(payload, expiresInSeconds = 60 * 60 * 24 * 30) {
  const header = { alg: "HS256", typ: "CLOCLO" };
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  const sig = crypto.createHmac("sha256", config.jwtSecret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/** Vérifie et décode un token ; retourne le payload ou null si invalide/expiré */
export function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", config.jwtSecret).update(`${headerB64}.${bodyB64}`).digest("base64url");
  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }
  try {
    const body = JSON.parse(Buffer.from(bodyB64, "base64url").toString("utf8"));
    if (body.exp && Math.floor(Date.now() / 1000) > body.exp) return null;
    return body;
  } catch {
    return null;
  }
}
