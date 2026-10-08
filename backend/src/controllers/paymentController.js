import { PaymentService } from "../services/paymentService.js";
import { sendJson, requireAuth, requireRole } from "../http.js";

export const PaymentController = {
  async methods({ res }) { sendJson(res, 200, PaymentService.methods()); },
  async initiate({ req, res, params, body }) {
    const auth = requireAuth(req); requireRole(auth, "client");
    sendJson(res, 200, await PaymentService.initiate(auth.sub, params.id, body?.phone));
  },
  async declare({ req, res, params, body }) {
    const auth = requireAuth(req); requireRole(auth, "client");
    sendJson(res, 200, await PaymentService.declare(auth.sub, params.id, body?.reference));
  },
  /** Webhook public : la vérité vient de la revérification chez CinetPay, pas du corps reçu. */
  async cinetpayNotify({ res, body }) {
    try { await PaymentService.cinetpayNotify(body); } catch (e) { console.error("cinetpay notify", e.message); }
    sendJson(res, 200, { ok: true });
  },
  async adminValidate({ req, res, params }) {
    requireRole(requireAuth(req), "admin");
    sendJson(res, 200, await PaymentService.markPaid(params.id));
  },
};
