/* ============================================================
   CLO-CLO Frontend | payment-ui.js
   Interface de paiement en ligne (Mobile Money), partagée par la page
   de commande et la page de suivi.
   • Mode « cinetpay » : redirection vers la page de paiement sécurisée.
   • Mode « manual »   : instructions (numéro + montant) puis saisie de la
     référence de transaction ; l'admin valide.
   La confirmation du paiement ne dépend JAMAIS de ce navigateur.
   ============================================================ */
import { OrderService } from "./services/orderService.js";
import { esc } from "./traiteur-inbox.js";

const fmt = (n) => Number(n).toLocaleString(window.CLOCLO_LOCALE?.() || "fr-FR");

export async function startPayment(order, { onDone, phone } = {}) {
  const info = await OrderService.pay(order.id, phone);
  if (info.mode === "cinetpay" && info.paymentUrl) { window.location.href = info.paymentUrl; return; }
  openManualDialog(info, onDone);
}

function openManualDialog(info, onDone) {
  document.getElementById("pay-dialog")?.remove();
  const wrap = document.createElement("div");
  wrap.id = "pay-dialog";
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-modal", "true");
  wrap.setAttribute("aria-labelledby", "pay-title");
  wrap.innerHTML = `
    <div class="pay-card">
      <h2 id="pay-title">Payer ma commande</h2>
      <ol class="pay-steps">
        <li>Ouvrez votre application <b>Mobile Money</b> (MTN MoMo ou Orange Money).</li>
        <li>Envoyez <b>${fmt(info.amount)} FCFA</b> au numéro
          <span class="pay-number"><b id="pay-num">${esc(info.number)}</b> <button type="button" id="pay-copy" class="pay-link">Copier</button></span></li>
        <li>Saisissez ci-dessous la <b>référence de la transaction</b> reçue par SMS.</li>
      </ol>
      <label for="pay-ref" class="pay-label">Référence de la transaction</label>
      <input id="pay-ref" type="text" maxlength="60" autocomplete="off" placeholder="Ex : MP260107.1234.A56789"/>
      <p id="pay-err" role="alert" class="pay-err"></p>
      <div class="pay-actions">
        <button type="button" id="pay-later" class="pay-secondary">Plus tard</button>
        <button type="button" id="pay-ok" class="pay-primary">J'ai payé</button>
      </div>
      <p class="pay-note">Votre commande est transmise à la cuisine dès que l'équipe a vérifié le paiement.</p>
    </div>`;
  document.body.appendChild(wrap);
  const $ = (s) => wrap.querySelector(s);
  const close = () => { wrap.remove(); document.removeEventListener("keydown", onKey); onDone?.(false); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  $("#pay-ref").focus();
  $("#pay-copy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(info.number); $("#pay-copy").textContent = "Copié ✓"; } catch { /* ignoré */ } });
  $("#pay-later").addEventListener("click", close);
  $("#pay-ok").addEventListener("click", async () => {
    const btn = $("#pay-ok"); btn.disabled = true; $("#pay-err").textContent = "";
    try {
      await OrderService.declarePayment(info.orderId, $("#pay-ref").value);
      wrap.remove(); document.removeEventListener("keydown", onKey); onDone?.(true);
    } catch (err) { $("#pay-err").textContent = err.message || "Impossible d'enregistrer la référence."; btn.disabled = false; }
  });
}
