import { TraiteurService } from "../services/traiteurService.js";
import { sendJson, requireAuth, requireRole } from "../http.js";

export const TraiteurController = {
  async mine({ req, res }) {
    const auth = requireAuth(req);
    requireRole(auth, "client");
    sendJson(res, 200, await TraiteurService.listMine(auth.sub));
  },
  async listMessages({ req, res, params }) {
    const auth = requireAuth(req);
    requireRole(auth, "client", "admin");
    sendJson(res, 200, await TraiteurService.listMessages(auth, params.id));
  },
  async sendMessage({ req, res, params, body }) {
    const auth = requireAuth(req);
    requireRole(auth, "client", "admin");
    sendJson(res, 201, await TraiteurService.sendMessage(auth, params.id, body?.text));
  },
};
