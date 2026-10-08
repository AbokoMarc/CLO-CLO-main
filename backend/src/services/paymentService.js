/* ============================================================
   CLO-CLO Backend | services/paymentService.js
   Paiement en ligne Mobile Money (MTN MoMo / Orange Money).
   Deux modes, choisis par variables d'environnement :
   • "cinetpay" : paiement automatique — le client est redirigé vers la page
     sécurisée CinetPay, et un webhook confirme le paiement. NÉCESSITE vos
     identifiants CinetPay (CINETPAY_API_KEY, CINETPAY_SITE_ID, PUBLIC_API_URL).
   • "manual"   : le client envoie le montant au numéro MoMo / Orange Money du
     commerçant, saisit la référence de transaction, et l'admin valide.
   Sans configuration, seul « Paiement à la livraison » est proposé.
   La confirmation d'un paiement ne vient JAMAIS du navigateur du client :
   uniquement du webhook vérifié auprès de CinetPay, ou de l'admin.
   ============================================================ */
import { config } from "../config.js";
import { Store } from "../repositories/store.js";
import { notifyOrderEvent } from "../notify.js";

const fail = (status, msg) => { const e = new Error(msg); e.status = status; return e; };
const CINETPAY = "https://api-checkout.cinetpay.com/v2";

function mode() {
  if (config.paymentProvider === "cinetpay" && config.cinetpayApiKey && config.cinetpaySiteId && config.publicApiUrl) return "cinetpay";
  if (config.paymentProvider === "manual" || config.momoNumber || config.omNumber) return "manual";
  return "none";
}

export const PaymentService = {
  /** Méthodes proposées au client (le front affiche uniquement celles-ci). */
  methods() {
    const m = mode();
    const list = [{ id: "cash", label: "Paiement à la livraison", online: false }];
    if (m === "cinetpay") list.push({ id: "mobile_money", label: "Mobile Money (MTN / Orange)", online: true });
    if (m === "manual") {
      if (config.momoNumber) list.push({ id: "momo", label: "MTN Mobile Money", online: true, number: config.momoNumber });
      if (config.omNumber) list.push({ id: "orange_money", label: "Orange Money", online: true, number: config.omNumber });
    }
    return { mode: m, methods: list };
  },
  isValidMethod(id) { return this.methods().methods.some((x) => x.id === id); },
  isOnline(id) { return id && id !== "cash"; },

  /** Démarre le paiement d'une commande appartenant au client. */
  async initiate(userId, orderId, phone) {
    const order = await Store.findById("orders", orderId);
    if (!order || order.userId !== userId) throw fail(404, "Commande introuvable.");
    if (order.paymentStatus === "paye") throw fail(400, "Cette commande est déjà payée.");
    if (!this.isOnline(order.paymentMethod)) throw fail(400, "Cette commande se règle à la livraison.");
    const m = mode();
    if (m === "manual") {
      const number = order.paymentMethod === "orange_money" ? config.omNumber : config.momoNumber;
      return { mode: "manual", amount: order.total, number, orderId: order.id, reference: `CMD-${order.id}` };
    }
    if (m !== "cinetpay") throw fail(503, "Le paiement en ligne n'est pas disponible pour le moment.");
    const user = await Store.findById("users", userId);
    const transactionId = `CLO${order.id}T${Date.now()}`;
    const res = await fetch(`${CINETPAY}/payment`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: config.cinetpayApiKey, site_id: config.cinetpaySiteId, transaction_id: transactionId,
        amount: order.total, currency: "XAF", description: `Commande CMD-${order.id} - Clo-Clo`,
        notify_url: `${config.publicApiUrl.replace(/\/$/, "")}/api/payments/cinetpay/notify`,
        return_url: `${(config.frontUrl || "").replace(/\/$/, "")}/suivi.html?order=${order.id}`,
        channels: "MOBILE_MONEY", lang: "fr",
        customer_name: user?.nom || "Client", customer_surname: "Clo-Clo", customer_email: user?.email || "client@clo-clo.cm",
        customer_phone_number: String(phone || user?.tel || "").replace(/[^0-9+]/g, "").slice(0, 16), customer_address: order.adresse || "Yaoundé", customer_city: "Yaoundé", customer_country: "CM", customer_state: "CM", customer_zip_code: "00000",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data?.data?.payment_url) throw fail(502, "Le service de paiement est indisponible. Réessayez ou choisissez le paiement à la livraison.");
    await Store.update("orders", order.id, { paymentRef: transactionId, paymentStatus: "en_attente" });
    return { mode: "cinetpay", paymentUrl: data.data.payment_url, orderId: order.id };
  },

  /** Mode manuel : le client déclare sa référence de transaction → l'admin vérifie. */
  async declare(userId, orderId, reference) {
    const order = await Store.findById("orders", orderId);
    if (!order || order.userId !== userId) throw fail(404, "Commande introuvable.");
    const ref = String(reference || "").trim().slice(0, 60);
    if (ref.length < 4) throw fail(400, "Saisissez la référence de la transaction (reçue par SMS).");
    const updated = await Store.update("orders", order.id, { paymentRef: ref, paymentStatus: "a_verifier" });
    notifyOrderEvent("order:updated", updated);
    return updated;
  },

  /** Webhook CinetPay : on ne fait PAS confiance au corps reçu, on revérifie auprès de CinetPay. */
  async cinetpayNotify(body) {
    const transactionId = body?.cpm_trans_id;
    if (!transactionId) return { ok: false };
    const order = (await Store.all("orders")).find((o) => o.paymentRef === transactionId);
    if (!order) return { ok: false };
    const res = await fetch(`${CINETPAY}/payment/check`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: config.cinetpayApiKey, site_id: config.cinetpaySiteId, transaction_id: transactionId }),
    });
    const data = await res.json().catch(() => ({}));
    const paidAmount = Number(data?.data?.amount);
    if (data?.data?.status === "ACCEPTED" && paidAmount >= order.total) return this.markPaid(order.id);
    if (data?.data?.status === "REFUSED") await Store.update("orders", order.id, { paymentStatus: "echoue" });
    return { ok: false };
  },

  /** Valide un paiement (webhook vérifié ou admin) puis libère la commande vers la cuisine. */
  async markPaid(orderId) {
    const order = await Store.findById("orders", orderId);
    if (!order) throw fail(404, "Commande introuvable.");
    if (order.paymentStatus === "paye") return { ok: true, order };
    const patch = { paymentStatus: "paye" };
    const released = order.statut === "en_attente_paiement";
    if (released) patch.statut = "en_preparation";
    const updated = await Store.update("orders", order.id, patch);
    notifyOrderEvent(released ? "order:new" : "order:updated", updated);
    return { ok: true, order: updated };
  },
};
