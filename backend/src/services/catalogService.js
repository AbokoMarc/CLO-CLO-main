/* ============================================================
   CLO-CLO Backend | services/catalogService.js — couche SERVICE
   Produits, récompenses, zones géographiques (Nkolfoulou/Yaoundé)
   ============================================================ */
import { Store } from "../repositories/store.js";

export const CatalogService = {
  async listProducts({ category } = {}) {
    const items = await Store.all("products");
    return category && category !== "tous" ? items.filter((p) => p.category === category) : items;
  },
  getProduct(id) {
    return Store.findById("products", id);
  },
  createProduct(data) {
    return Store.insert("products", data);
  },
  updateProduct(id, patch) {
    return Store.update("products", id, patch);
  },
  deleteProduct(id) {
    return Store.remove("products", id);
  },

  listRewards() {
    return Store.all("rewards");
  },

  listZones() {
    return Store.all("zones");
  },
};
