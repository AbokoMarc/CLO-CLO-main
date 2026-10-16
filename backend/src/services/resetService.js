/* ============================================================
   CLO-CLO Backend | services/resetService.js
   « Mot de passe oublié » SANS fournisseur SMS payant, et sans jamais
   exposer le code :
     1. le client demande la réinitialisation (e-mail ou téléphone) ;
        la réponse est TOUJOURS la même (on ne révèle pas si le compte existe) ;
     2. l'admin est alerté ; c'est LUI qui déclenche l'envoi : le serveur génère
        alors un code à 6 chiffres (valable 30 min, 5 essais, stocké haché) ;
     3. le code part par WhatsApp vers le numéro ENREGISTRÉ du compte
        (jamais un autre numéro) → seul le vrai propriétaire le reçoit ;
     4. le client saisit code + nouveau mot de passe.
   ============================================================ */
import crypto from "node:crypto";
import { Store } from "../repositories/store.js";
import { hashPassword, verifyPassword } from "../auth.js";
import { publish, pushToChannel } from "../notify.js";

const CODE_TTL_MS = 30 * 60_000;
const MAX_ATTEMPTS = 5;
const fail = (status, msg) => { const e = new Error(msg); e.status = status; return e; };
const digits = (s) => String(s || "").replace(/\D/g, "");

async function findClient(identifier) {
  const id = String(identifier || "").trim().toLowerCase();
  if (!id) return null;
  if (id.includes("@")) return Store.findOne("users", "lower(email) = ?", id);
  const d = digits(id);
  if (d.length < 8) return null;
  const users = await Store.all("users");
  return users.find((u) => digits(u.tel).slice(-9) === d.slice(-9)) || null;
}

export const ResetService = {
  /** Étape 1 — réponse identique que le compte existe ou non. */
  async request(identifier) {
    const user = await findClient(identifier);
    if (user) {
      const all = await Store.all("passwordResets");
      const open = all.find((r) => r.userId === user.id && ["en_attente", "code_envoye"].includes(r.status) && Date.now() - new Date(r.createdAt).getTime() < 3_600_000);
      if (!open) {
        const created = await Store.insert("passwordResets", { userId: user.id, status: "en_attente", codeHash: null, expiresAt: null, attempts: 0, createdAt: new Date().toISOString(), sentAt: null });
        publish("admin", "reset:new", { id: created.id, nom: user.nom });
        pushToChannel("admin", { title: "🔑 Mot de passe oublié", body: `${user.nom} demande un nouveau mot de passe.`, url: "/admin-clients.html", tag: `reset-${created.id}` });
      }
    }
    return { ok: true, message: "Si ce compte existe, l'équipe Clo-Clo va vous envoyer un code par WhatsApp sur le numéro enregistré." };
  },

  /** Liste pour l'admin (demandes ouvertes, avec nom et numéro du compte). */
  async adminList() {
    const [all, users] = await Promise.all([Store.all("passwordResets"), Store.all("users")]);
    const byId = new Map(users.map((u) => [u.id, u]));
    return all
      .filter((r) => ["en_attente", "code_envoye"].includes(r.status))
      .sort((a, b) => b.id - a.id)
      .map((r) => {
        const u = byId.get(r.userId);
        const expired = r.expiresAt && new Date(r.expiresAt).getTime() < Date.now();
        return { id: r.id, status: expired ? "expire" : r.status, createdAt: r.createdAt, sentAt: r.sentAt, expiresAt: r.expiresAt, nom: u?.nom || "—", tel: u?.tel || "", email: u?.email || "" };
      });
  },

  /** Étape 2 — l'admin déclenche : code généré, renvoyé UNE fois à l'admin pour l'envoyer par WhatsApp. */
  async adminIssue(id) {
    const r = await Store.findById("passwordResets", Number(id));
    if (!r || !["en_attente", "code_envoye"].includes(r.status)) throw fail(404, "Demande introuvable.");
    const user = await Store.findById("users", r.userId);
    if (!user) throw fail(404, "Client introuvable.");
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    await Store.update("passwordResets", r.id, { status: "code_envoye", codeHash: hashPassword(code), expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(), attempts: 0, sentAt: new Date().toISOString() });
    const phone = digits(user.tel);
    const intl = phone.startsWith("237") ? phone : `237${phone.slice(-9)}`;
    const text = `Clo-Clo : votre code de réinitialisation est ${code} (valable 30 minutes). Ne le partagez avec personne.`;
    return { code, nom: user.nom, tel: user.tel, whatsappUrl: `https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(text)}` };
  },

  async adminDismiss(id) {
    const r = await Store.findById("passwordResets", Number(id));
    if (!r) throw fail(404, "Demande introuvable.");
    await Store.update("passwordResets", r.id, { status: "annule", codeHash: null });
    return { ok: true };
  },

  /** Étape 3 — le client saisit le code et son nouveau mot de passe. */
  async confirm(identifier, code, newPwd) {
    const generic = () => fail(400, "Code invalide ou expiré. Demandez-en un nouveau.");
    if (String(newPwd || "").length < 8) throw fail(400, "Le nouveau mot de passe doit contenir au moins 8 caractères.");
    const user = await findClient(identifier);
    if (!user) throw generic();
    const all = await Store.all("passwordResets");
    const r = all.filter((x) => x.userId === user.id && x.status === "code_envoye").sort((a, b) => b.id - a.id)[0];
    if (!r || !r.expiresAt || new Date(r.expiresAt).getTime() < Date.now()) throw generic();
    if (r.attempts >= MAX_ATTEMPTS) { await Store.update("passwordResets", r.id, { status: "expire", codeHash: null }); throw generic(); }
    if (!verifyPassword(String(code || "").trim(), r.codeHash)) {
      await Store.update("passwordResets", r.id, { attempts: r.attempts + 1 });
      throw generic();
    }
    await Store.update("users", user.id, { passwordHash: hashPassword(String(newPwd)) });
    await Store.update("passwordResets", r.id, { status: "termine", codeHash: null });
    return { ok: true };
  },
};
