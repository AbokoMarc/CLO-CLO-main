/* ============================================================
   CLO-CLO Frontend | services/traiteurService.js
   Messagerie du service traiteur (client ↔ admin).
   ============================================================ */
import { ApiClient } from "./apiClient.js";

export const TraiteurService = {
  mine() { return ApiClient.get("/traiteur/me", { auth: true }); },
  adminList() { return ApiClient.get("/admin/traiteur", { auth: true }); },
  messages(id) { return ApiClient.get(`/traiteur/${id}/messages`, { auth: true }); },
  send(id, text) { return ApiClient.post(`/traiteur/${id}/messages`, { text }, { auth: true }); },
  update(id, patch) { return ApiClient.patch(`/admin/traiteur/${id}`, patch, { auth: true }); },
};
