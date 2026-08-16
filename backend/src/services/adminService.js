/* ============================================================
   CLO-CLO Backend | services/adminService.js — couche SERVICE
   ============================================================ */
import { Store } from "../repositories/store.js";
import { hashPassword } from "../auth.js";
import crypto from "node:crypto";

function stripPwd(x) {
  const { passwordHash, ...rest } = x;
  return rest;
}

/** Génère un mot de passe temporaire lisible (ex: "K7M-QP4T") à communiquer au livreur */
function generateTempPassword() {
  return crypto.randomBytes(4).toString("hex").toUpperCase().match(/.{1,4}/g).join("-");
}

export const AdminService = {
  listClients() {
    return Store.all("users").map(stripPwd);
  },

  listLivreurs() {
    return Store.all("livreurs").map(stripPwd);
  },

  createLivreur({ nom, tel, vehicule, matricule }) {
    if (!nom || !tel) {
      const e = new Error("Nom et téléphone sont requis pour créer un livreur.");
      e.status = 400;
      throw e;
    }
    const tempPassword = generateTempPassword();
    const finalMatricule = matricule || `DRV-${String(Date.now()).slice(-5)}`;
    const livreur = Store.insert("livreurs", {
      nom, tel, vehicule: vehicule || "Moto",
      matricule: finalMatricule,
      statut: "disponible",
      passwordHash: hashPassword(tempPassword),
    });
    // Le mot de passe temporaire n'est renvoyé qu'une seule fois, à la création,
    // pour que l'administrateur le communique au livreur.
    return { ...stripPwd(livreur), tempPassword };
  },

  updateLivreurStatut(id, statut) {
    return stripPwd(Store.update("livreurs", id, { statut }));
  },

  /** Statistiques calculées à partir des VRAIES commandes en base (aucune donnée inventée) */
  dashboardStats() {
    const orders = Store.all("orders");
    const users = Store.all("users");
    const livreurs = Store.all("livreurs");

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
