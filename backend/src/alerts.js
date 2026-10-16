/* ============================================================
   CLO-CLO Backend | alerts.js
   Journal anti-doublons des alertes : une alerte (clé unique) n'est
   envoyée qu'UNE fois, même si le serveur redémarre ou si deux tâches
   planifiées se chevauchent (la clé est stockée en base, contrainte UNIQUE).
   ============================================================ */
import { Store } from "./repositories/store.js";

/** true = première fois (envoyer l'alerte) ; false = déjà envoyée (ne rien faire). */
export async function once(key) {
  try {
    await Store.insert("alertLog", { alertKey: String(key).slice(0, 200), createdAt: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

/** Supprime les entrées de plus de 30 jours (la table ne grossit pas indéfiniment). */
export async function purgeOldAlerts() {
  try {
    const all = await Store.all("alertLog");
    const limit = Date.now() - 30 * 86_400_000;
    for (const a of all) if (new Date(a.createdAt).getTime() < limit) await Store.remove("alertLog", a.id);
  } catch { /* sans gravité */ }
}
