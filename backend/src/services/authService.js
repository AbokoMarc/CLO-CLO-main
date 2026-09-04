/* ============================================================
   CLO-CLO Backend | services/authService.js — couche SERVICE
   ============================================================ */
import { Store } from "../repositories/store.js";
import { hashPassword, verifyPassword, signToken } from "../auth.js";

const WELCOME_POINTS = 50;

function publicUser(u) {
  const { passwordHash, ...rest } = u;
  return { ...rest, role: "client" };
}
function publicLivreur(l) {
  const { passwordHash, ...rest } = l;
  return { ...rest, role: "livreur" };
}
function publicAdmin(a) {
  const { passwordHash, ...rest } = a;
  return { ...rest, role: "admin" };
}

const COLLECTION_BY_ROLE = { client: "users", livreur: "livreurs", admin: "admins" };

export const AuthService = {
  async registerClient({ nom, email, tel, mdp, quartier, adresse }) {
    if (!nom || !email || !tel || !mdp) {
      const e = new Error("Champs obligatoires manquants (nom, email, tel, mdp).");
      e.status = 400;
      throw e;
    }
    const existing = await Store.all("users");
    if (existing.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      const e = new Error("Un compte existe déjà avec cet email.");
      e.status = 409;
      throw e;
    }
    const user = await Store.insert("users", {
      nom, email, tel,
      quartier: quartier || "Nkolfoulou",
      adresse: adresse || "Nkolfoulou, Yaoundé",
      points: WELCOME_POINTS, commandes: 0, niveau: "Bronze",
      passwordHash: hashPassword(mdp),
    });
    await Store.insert("pointsHistory", {
      userId: user.id,
      label: "Bonus de bienvenue",
      date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      pts: WELCOME_POINTS,
      type: "gain",
    });
    const token = signToken({ sub: user.id, role: "client" });
    return { token, user: publicUser(user) };
  },

  async loginClient({ email, mdp }) {
    const users = await Store.all("users");
    const user = users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());
    if (!user || !verifyPassword(mdp, user.passwordHash)) {
      const e = new Error("Email ou mot de passe incorrect.");
      e.status = 401;
      throw e;
    }
    return { token: signToken({ sub: user.id, role: "client" }), user: publicUser(user) };
  },

  async loginLivreur({ matricule, mdp }) {
    const livreurs = await Store.all("livreurs");
    const l = livreurs.find((x) => x.matricule === matricule);
    if (!l || !verifyPassword(mdp, l.passwordHash)) {
      const e = new Error("Matricule ou mot de passe incorrect.");
      e.status = 401;
      throw e;
    }
    return { token: signToken({ sub: l.id, role: "livreur" }), user: publicLivreur(l) };
  },

  async loginAdmin({ username, mdp }) {
    const admins = await Store.all("admins");
    const a = admins.find((x) => x.username === username);
    if (!a || !verifyPassword(mdp, a.passwordHash)) {
      const e = new Error("Identifiants administrateur incorrects.");
      e.status = 401;
      throw e;
    }
    return { token: signToken({ sub: a.id, role: "admin" }), user: publicAdmin(a) };
  },

  async updateClientProfile(userId, { nom, email, tel, adresse, quartier }) {
    const patch = {};
    if (nom) patch.nom = nom;
    if (email) patch.email = email;
    if (tel) patch.tel = tel;
    if (adresse) patch.adresse = adresse;
    if (quartier) patch.quartier = quartier;
    const updated = await Store.update("users", userId, patch);
    return updated ? publicUser(updated) : null;
  },

  /** Changement de mot de passe par l'utilisateur lui-même (client, livreur OU admin). */
  /** Permet à l'admin de définir/modifier son propre numéro (pour le bouton
      "Appeler l'admin" côté livreur) — au-delà de la valeur ADMIN_PHONE initiale. */
  async setAdminPhone(adminId, tel) {
    const updated = await Store.update("admins", adminId, { tel });
    return updated ? publicAdmin(updated) : null;
  },

  async changeOwnPassword(role, id, currentPwd, newPwd) {
    const collection = COLLECTION_BY_ROLE[role];
    if (!collection) {
      const e = new Error("Rôle inconnu.");
      e.status = 400;
      throw e;
    }
    if (!newPwd || newPwd.length < 8) {
      const e = new Error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      e.status = 400;
      throw e;
    }
    const record = await Store.findById(collection, id);
    if (!record || !verifyPassword(currentPwd, record.passwordHash)) {
      const e = new Error("Mot de passe actuel incorrect.");
      e.status = 401;
      throw e;
    }
    await Store.update(collection, id, { passwordHash: hashPassword(newPwd) });
    return { ok: true };
  },

  /** Vérifie le mot de passe d'un compte (utilisé pour déverrouiller les données sensibles côté admin). */
  async verifyPassword(role, id, mdp) {
    const collection = COLLECTION_BY_ROLE[role];
    const record = await Store.findById(collection, id);
    return !!record && verifyPassword(mdp, record.passwordHash);
  },

  async me({ sub, role }) {
    if (role === "client") {
      const u = await Store.findById("users", sub);
      return u ? publicUser(u) : null;
    }
    if (role === "livreur") {
      const l = await Store.findById("livreurs", sub);
      return l ? publicLivreur(l) : null;
    }
    if (role === "admin") {
      const a = await Store.findById("admins", sub);
      return a ? publicAdmin(a) : null;
    }
    return null;
  },
};
