/* ============================================================
   CLO-CLO Frontend | services/productService.js
   ============================================================ */
import { ApiClient } from "./apiClient.js";

export const ProductService = {
  list(category) {
    return ApiClient.get(category && category !== "tous" ? `/products?category=${encodeURIComponent(category)}` : "/products");
  },
  get(id) {
    return ApiClient.get(`/products/${id}`);
  },
  create(product) {
    return ApiClient.post("/products", product, { auth: true });
  },
  update(id, patch) {
    return ApiClient.put(`/products/${id}`, patch, { auth: true });
  },
  remove(id) {
    return ApiClient.delete(`/products/${id}`, { auth: true });
  },
  listZones() {
    return ApiClient.get("/zones");
  },
  createZone(zone) {
    return ApiClient.post("/admin/zones", zone, { auth: true });
  },
  removeZone(id) {
    return ApiClient.delete(`/admin/zones/${id}`, { auth: true });
  },
  createTraiteurRequest(data) {
    return ApiClient.post("/traiteur", data, { auth: false });
  },
  listTraiteurRequests() {
    return ApiClient.get("/admin/traiteur", { auth: true });
  },
  updateTraiteurRequest(id, patch) {
    return ApiClient.patch(`/admin/traiteur/${id}`, patch, { auth: true });
  },
};
