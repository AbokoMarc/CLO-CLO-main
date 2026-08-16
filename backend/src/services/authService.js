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

export const AuthService = {
  registerClient({ nom, email, tel, mdp, quartier, adresse }) {
    if (!nom || !email || !tel || !mdp) {
      const e = new Error("Champs obligatoires manquants (nom, email, tel, mdp).");
      e.status = 400;
      throw e;
    }
    if (Store.all("users").some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      const e = new Error("Un compte existe déjà avec cet email.");
      e.status = 409;
      throw e;
    }
    const user = Store.insert("users", {
      nom, email, tel,
      quartier: quartier || "Nkolfoulou",
      adresse: adresse || "Nkolfoulou, Yaoundé",
      points: WELCOME_POINTS, commandes: 0, niveau: "Bronze",
      passwordHash: hashPassword(mdp),
    });
    Store.insert("pointsHistory", {
      userId: user.id,
      label: "Bonus de bienvenue",
      date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      pts: WELCOME_POINTS,
      type: "gain",
    });
    const token = signToken({ sub: user.id, role: "client" });
    return { token, user: publicUser(user) };
  },

  loginClient({ email, mdp }) {
    const user = Store.all("users").find((u) => u.email.toLowerCase() === (email || "").toLowerCase());
    if (!user || !verifyPassword(mdp, user.passwordHash)) {
      const e = new Error("Email ou mot de passe incorrect.");
      e.status = 401;
      throw e;
    }
    return { token: signToken({ sub: user.id, role: "client" }), user: publicUser(user) };
  },

  loginLivreur({ matricule, mdp }) {
    const l = Store.all("livreurs").find((x) => x.matricule === matricule);
    if (!l || !verifyPassword(mdp, l.passwordHash)) {
      const e = new Error("Matricule ou mot de passe incorrect.");
      e.status = 401;
      throw e;
    }
    return { token: signToken({ sub: l.id, role: "livreur" }), user: publicLivreur(l) };
  },

  loginAdmin({ username, mdp }) {
    const a = Store.all("admins").find((x) => x.username === username);
    if (!a || !verifyPassword(mdp, a.passwordHash)) {
      const e = new Error("Identifiants administrateur incorrects.");
      e.status = 401;
      throw e;
    }
    return { token: signToken({ sub: a.id, role: "admin" }), user: publicAdmin(a) };
  },

  updateClientProfile(userId, { nom, email, tel, adresse, quartier }) {
    const patch = {};
    if (nom) patch.nom = nom;
    if (email) patch.email = email;
    if (tel) patch.tel = tel;
    if (adresse) patch.adresse = adresse;
    if (quartier) patch.quartier = quartier;
    const updated = Store.update("users", userId, patch);
    return updated ? publicUser(updated) : null;
  },

  me({ sub, role }) {
    if (role === "client") {
      const u = Store.findById("users", sub);
      return u ? publicUser(u) : null;
    }
    if (role === "livreur") {
      const l = Store.findById("livreurs", sub);
      return l ? publicLivreur(l) : null;
    }
    if (role === "admin") {
      const a = Store.findById("admins", sub);
      return a ? publicAdmin(a) : null;
    }
    return null;
  },
};
