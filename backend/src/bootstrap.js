/* ============================================================
   CLO-CLO Backend | bootstrap.js
   S'exécute une seule fois au démarrage :
   1) Seed des quartiers de la zone de livraison (donnée
      géographique réelle, pas une donnée de démo).
   2) Crée le compte administrateur à partir des variables
      d'environnement ADMIN_USERNAME / ADMIN_PASSWORD — plus
      aucun identifiant codé en dur ni mot de passe imprimé.
   ============================================================ */
import { Store } from "./repositories/store.js";
import { hashPassword } from "./auth.js";
import { config } from "./config.js";

const ZONES_LIVRAISON = [
  { ville: "Yaoundé", quartier: "Nkolfoulou" },
  { ville: "Yaoundé", quartier: "Nkolbisson" },
  { ville: "Yaoundé", quartier: "Odza" },
  { ville: "Yaoundé", quartier: "Simbock" },
  { ville: "Yaoundé", quartier: "Mendong" },
];

async function seedZones() {
  if ((await Store.all("zones")).length > 0) return;
  for (const z of ZONES_LIVRAISON) await Store.insert("zones", z);
  console.log(`🗺️  Zones de livraison initialisées (${ZONES_LIVRAISON.length} quartiers autour de Nkolfoulou, Yaoundé).`);
}

async function bootstrapAdmin() {
  if ((await Store.all("admins")).length > 0) return;

  if (!config.adminUsername || !config.adminPassword) {
    console.warn("⚠️  Aucun compte administrateur n'existe et ADMIN_USERNAME / ADMIN_PASSWORD ne sont pas définis dans .env.");
    console.warn("    Définissez-les puis redémarrez le serveur pour créer le compte administrateur.");
    return;
  }
  if (config.adminPassword.length < 8) {
    console.warn("⚠️  ADMIN_PASSWORD doit contenir au moins 8 caractères. Compte administrateur non créé.");
    return;
  }

  await Store.insert("admins", {
    username: config.adminUsername,
    passwordHash: hashPassword(config.adminPassword),
  });
  console.log(`✅ Compte administrateur "${config.adminUsername}" créé à partir de .env.`);
}

export async function runBootstrap() {
  await seedZones();
  await bootstrapAdmin();
}
