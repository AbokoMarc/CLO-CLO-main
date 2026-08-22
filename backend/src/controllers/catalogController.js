import { CatalogService } from "../services/catalogService.js";
import { sendJson, requireAuth, requireRole } from "../http.js";

export const CatalogController = {
  async listProducts({ res, query }) {
    sendJson(res, 200, await CatalogService.listProducts({ category: query.category }));
  },
  async getProduct({ res, params }) {
    const p = await CatalogService.getProduct(params.id);
    if (!p) return sendJson(res, 404, { error: "Produit introuvable." });
    sendJson(res, 200, p);
  },
  async createProduct({ req, res, body }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 201, await CatalogService.createProduct(body));
  },
  async updateProduct({ req, res, params, body }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, await CatalogService.updateProduct(params.id, body));
  },
  async deleteProduct({ req, res, params }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, { deleted: await CatalogService.deleteProduct(params.id) });
  },
  async listRewards({ res }) {
    sendJson(res, 200, await CatalogService.listRewards());
  },
  async listZones({ res }) {
    sendJson(res, 200, await CatalogService.listZones());
  },
};
