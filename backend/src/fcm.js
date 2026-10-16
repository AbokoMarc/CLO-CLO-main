/* ============================================================
   CLO-CLO Backend | fcm.js
   Notifications PUSH NATIVES pour l'application Android (Capacitor) via
   Firebase Cloud Messaging (API HTTP v1) — sans aucune dépendance npm :
   le jeton d'accès Google est obtenu en signant un JWT avec le compte de service.

   Configuration (variable d'environnement Render) :
     FCM_SERVICE_ACCOUNT = contenu JSON du compte de service Firebase
                           (ou ce JSON encodé en base64).
   Sans cette variable : l'envoi natif est simplement ignoré (le Web Push continue).
   ============================================================ */
import crypto from "node:crypto";

let account = null, cached = { token: null, exp: 0 };

function loadAccount() {
  if (account !== null) return account || null;
  const raw = process.env.FCM_SERVICE_ACCOUNT?.trim();
  if (!raw) { account = false; return null; }
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    if (!parsed.private_key || !parsed.client_email || !parsed.project_id) throw new Error("champs manquants");
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    account = parsed;
  } catch (e) {
    console.error("FCM_SERVICE_ACCOUNT illisible :", e.message);
    account = false;
  }
  return account || null;
}

export const fcmEnabled = () => !!loadAccount();

const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");

/** Construit le JWT « service account » demandé par Google (RS256). Exporté pour les tests. */
export function buildAssertion(acc, nowSec = Math.floor(Date.now() / 1000)) {
  const head = b64({ alg: "RS256", typ: "JWT" });
  const body = b64({ iss: acc.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: nowSec, exp: nowSec + 3600 });
  const sig = crypto.createSign("RSA-SHA256").update(`${head}.${body}`).sign(acc.private_key, "base64url");
  return `${head}.${body}.${sig}`;
}

async function accessToken(fetchFn = fetch) {
  const acc = loadAccount();
  if (!acc) return null;
  if (cached.token && Date.now() < cached.exp - 60_000) return cached.token;
  const res = await fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: buildAssertion(acc) }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`jeton Google refusé (${j.error || res.status})`);
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return cached.token;
}

/** Message FCM : priorité HAUTE + canal Android « cloclo-alerts » (son et bannière même téléphone verrouillé). */
export function buildMessage(deviceToken, { title, body, url = "/", tag, urgent = false }) {
  return {
    message: {
      token: deviceToken,
      notification: { title, body },
      data: { url: String(url), tag: String(tag || "") },
      android: {
        priority: "HIGH",
        ttl: urgent ? "600s" : "3600s",
        notification: { channel_id: urgent ? "cloclo-urgent" : "cloclo-alerts", sound: "default", ...(tag ? { tag } : {}), click_action: "FCM_PLUGIN_ACTIVITY" },
      },
    },
  };
}

/** Envoie à UN appareil. { ok } | { expired:true } (jeton à supprimer) | { ok:false }. */
export async function sendFcm(deviceToken, payload, fetchFn = fetch) {
  const acc = loadAccount();
  if (!acc) return { ok: false, skipped: true };
  try {
    const token = await accessToken(fetchFn);
    const res = await fetchFn(`https://fcm.googleapis.com/v1/projects/${acc.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildMessage(deviceToken, payload)),
    });
    if (res.ok) return { ok: true };
    const err = await res.json().catch(() => ({}));
    const code = err?.error?.details?.find?.((d) => d.errorCode)?.errorCode || err?.error?.status;
    if (res.status === 404 || code === "UNREGISTERED" || code === "INVALID_ARGUMENT") return { expired: true };
    console.error("FCM refus :", res.status, code);
    return { ok: false };
  } catch (e) {
    console.error("FCM erreur :", e.message);
    return { ok: false };
  }
}

/** Pour les tests : injecte un compte de service sans passer par l'environnement. */
export function _setAccountForTests(acc) { account = acc || false; cached = { token: null, exp: 0 }; }
