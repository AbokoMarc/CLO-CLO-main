/* ============================================================
   CLO-CLO Backend | services/adminService.js — couche SERVICE
   ============================================================ */
import { Store } from "../repositories/store.js";
import { hashPassword } from "../auth.js";
import crypto from "node:crypto";

const PAIE_TYPES = ["journalier", "mensuel"];

function stripPwd(x) {
  const { passwordHash, ...rest } = x;
  return rest;
}

/** Génère un mot de passe temporaire lisible (ex: "K7M-QP4T") à communiquer au client/livreur */
function generateTempPassword() {
  return crypto.randomBytes(4).toString("hex").toUpperCase().match(/.{1,4}/g).join("-");
}

export const AdminService = {
  async listClients() {
    const users = await Store.all("users");
    return users.map(stripPwd);
  },

  async listLivreurs() {
    const livreurs = await Store.all("livreurs");
    return livreurs.map(stripPwd);
  },

  async createLivreur({ nom, tel, vehicule, matricule }) {
    if (!nom || !tel) {
      const e = new Error("Nom et téléphone sont requis pour créer un livreur.");
      e.status = 400;
      throw e;
    }
    const tempPassword = generateTempPassword();
    const finalMatricule = matricule || `DRV-${String(Date.now()).slice(-5)}`;
    const livreur = await Store.insert("livreurs", {
      nom, tel, vehicule: vehicule || "Moto",
      matricule: finalMatricule,
      statut: "disponible",
      paieType: "journalier",
      paieMontant: 0,
      passwordHash: hashPassword(tempPassword),
    });
    // Le mot de passe temporaire n'est renvoyé qu'une seule fois, à la création,
    // pour que l'administrateur le communique au livreur.
    return { ...stripPwd(livreur), tempPassword };
  },

  async updateLivreurStatut(id, statut) {
    return stripPwd(await Store.update("livreurs", id, { statut }));
  },

  /** L'admin définit la paie d'un livreur (salaire fixe, journalier ou mensuel) —
      indépendante de l'argent que le livreur encaisse en cash chez les clients. */
  async setLivreurPaie(id, { paieType, paieMontant }) {
    if (!PAIE_TYPES.includes(paieType)) {
      const e = new Error(`Type de paie invalide. Valeurs autorisées : ${PAIE_TYPES.join(", ")}.`);
      e.status = 400;
      throw e;
    }
    const montant = Number(paieMontant);
    if (!Number.isFinite(montant) || montant < 0) {
      const e = new Error("Le montant de la paie doit être un nombre positif.");
      e.status = 400;
      throw e;
    }
    const livreur = await Store.update("livreurs", id, { paieType, paieMontant: montant });
    if (!livreur) {
      const e = new Error("Livreur introuvable.");
      e.status = 404;
      throw e;
    }
    return stripPwd(livreur);
  },

  /** Réinitialise le mot de passe d'un client — l'admin ne voit jamais l'ancien mot de passe
      (il n'est jamais stocké en clair), il génère simplement un nouveau mot de passe temporaire
      à communiquer au client après vérification de son identité. */
  async resetClientPassword(id) {
    const user = await Store.findById("users", id);
    if (!user) {
      const e = new Error("Client introuvable.");
      e.status = 404;
      throw e;
    }
    const tempPassword = generateTempPassword();
    await Store.update("users", id, { passwordHash: hashPassword(tempPassword) });
    return { id, tempPassword };
  },

  /** Même principe pour un livreur : le mot de passe original n'est jamais stocké en
      clair nulle part (haché dès sa création, irréversible) — pour "redonner" ses
      identifiants à un livreur, l'admin génère un nouveau mot de passe temporaire.
      Le matricule (identifiant de connexion), lui, reste toujours visible dans la liste. */
  async resetLivreurPassword(id) {
    const livreur = await Store.findById("livreurs", id);
    if (!livreur) {
      const e = new Error("Livreur introuvable.");
      e.status = 404;
      throw e;
    }
    const tempPassword = generateTempPassword();
    await Store.update("livreurs", id, { passwordHash: hashPassword(tempPassword) });
    return { id, matricule: livreur.matricule, tempPassword };
  },

  async deleteLivreur(id) {
    const livreur = await Store.findById("livreurs", id);
    if (!livreur) {
      const e = new Error("Livreur introuvable.");
      e.status = 404;
      throw e;
    }
    await Store.remove("livreurs", id);
    return { deleted: true };
  },

  /** Le livreur indique s'il est "actif" (en service) ou non — typiquement à la
      déconnexion, pour que l'admin sache vraiment qui est disponible aujourd'hui,
      indépendamment du statut ponctuel (disponible/en livraison/hors service). */
  async setLivreurActif(id, actif) {
    const livreur = await Store.update("livreurs", id, { actif: !!actif });
    if (!livreur) {
      const e = new Error("Livreur introuvable.");
      e.status = 404;
      throw e;
    }
    return stripPwd(livreur);
  },

  /* ── CODES PROMO ── */
  listPromoCodes() {
    return Store.all("promoCodes");
  },
  async createPromoCode({ code, type, value }) {
    if (!code || !["percent", "fixed"].includes(type) || !Number.isFinite(Number(value))) {
      const e = new Error("Code promo invalide (code, type 'percent'/'fixed', value requis).");
      e.status = 400;
      throw e;
    }
    return Store.insert("promoCodes", { code: code.trim().toUpperCase(), type, value: Number(value), active: true });
  },
  async togglePromoCode(id, active) {
    return Store.update("promoCodes", id, { active: !!active });
  },
  deletePromoCode(id) {
    return Store.remove("promoCodes", id);
  },

  /** Statistiques calculées à partir des VRAIES commandes en base (aucune donnée inventée) */
  async dashboardStats() {
    const orders = await Store.all("orders");
    const users = await Store.all("users");
    const livreurs = await Store.all("livreurs");

    const totalVentes = orders.reduce((s, o) => s + o.total, 0);
    const commandesAujourdhui = orders.filter((o) => {
      const d = new Date(o.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    });

    // Ventes des 7 derniers jours, regroupées par jour (labels FR courts)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("fr-FR", { weekday: "short" });
      const total = orders
        .filter((o) => new Date(o.createdAt).toDateString() === d.toDateString())
        .reduce((s, o) => s + o.total, 0);
      days.push({ label, total });
    }

    return {
      totalVentes,
      totalCommandes: orders.length,
      commandesAujourdhui: commandesAujourdhui.length,
      totalClients: users.length,
      totalLivreurs: livreurs.length,
      livreursDisponibles: livreurs.filter((l) => l.statut === "disponible").length,
      ventesParJour: days,
    };
  },
};
