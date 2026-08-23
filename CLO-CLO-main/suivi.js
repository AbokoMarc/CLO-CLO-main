/* ============================================================
   CLO-CLO | suivi.js — Page Suivi de commande
   Toutes les données viennent de l'API (commande en cours,
   historique). L'ID de commande vient du paramètre ?order=
   (posé par checkout.js) sinon on prend la plus récente.
   ============================================================ */
import { APP } from "./app-data.js";
import { OrderService } from "./services/orderService.js";

const STEP_LABELS = ["Préparation", "Prêt", "En Route", "Livré"];
const STATUS_PROGRESS = { en_preparation: 1, en_livraison: 3, livree: 4, annulee: 0 };

function activeOrderHtml(o) {
  const step = STATUS_PROGRESS[o.statut] ?? 1;
  const pct = Math.round((step / 4) * 100);
  const items = o.items.map(i => `${i.qty}× ${i.name}`).join(", ");
  const cancelBtn = o.statut === "en_preparation"
    ? `<button id="btn-cancel-order" data-id="${o.id}" style="margin-top:16px;width:100%;background:white;color:#ef4444;border:1.5px solid #fecaca;border-radius:10px;padding:11px;font-family:'Nunito',sans-serif;font-weight:800;cursor:pointer;">✕ Annuler ma commande</button>`
    : "";
  return `
    <div class="order-card active-order">
      <div class="order-card-header">
        <div>
          <div class="order-label">Commande</div>
          <div class="order-id">CMD-${o.id}</div>
        </div>
        <div class="status-badge">${o.statut.replace("_", " ")}</div>
      </div>
      <div class="progress-wrap">
        <div class="progress-line"><div class="progress-line-fill" style="width:${pct}%;"></div></div>
        <div class="steps-row">
          ${STEP_LABELS.map((label, i) => `
            <div class="step-item ${i < step ? "done" : i === step ? "current" : ""}">
              <div class="step-circle">${i < step ? "✓" : i + 1}</div>
              <div class="step-label">${label}</div>
            </div>`).join("")}
        </div>
      </div>
      <div class="order-details-grid">
        <div class="detail-block">
          <div class="detail-title">Articles Commandés</div>
          <ul class="articles-list">${o.items.map(i => `<li>${i.qty}× ${i.name}</li>`).join("")}</ul>
          <div class="order-total">Total : <strong>${o.total.toLocaleString()} FCFA</strong></div>
        </div>
        <div class="detail-block">
          <div class="detail-title">Adresse de Livraison</div>
          <div class="address-row">📍 ${o.adresse || "—"}</div>
        </div>
      </div>
      ${cancelBtn}
    </div>`;
}

function recentOrderHtml(o) {
  return `
    <div class="recent-card">
      <div class="recent-left">
        <div class="recent-id">CMD-${o.id}</div>
        <div class="recent-address">${o.adresse || "—"}</div>
        <div class="recent-items">${o.items.map(i => i.name).join(", ")}</div>
      </div>
      <div class="recent-right">
        <div class="badge-livre">${o.statut === "livree" ? "✅ Livré" : o.statut === "annulee" ? "❌ Annulé" : "🚚 " + o.statut.replace("_", " ")}</div>
        <div class="recent-price">${o.total.toLocaleString()} FCFA</div>
      </div>
    </div>`;
}

document.addEventListener("cloclo:ready", async () => {
  if (!APP.isLoggedIn()) {
    window.location.href = "connexion.html";
    return;
  }
  await loadSuivi();
});

async function loadSuivi() {
  const wrap = document.getElementById("suivi-content");
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order");
  const orders = await OrderService.myOrders();

  const active = orderId ? orders.find(o => String(o.id) === orderId) : orders.find(o => o.statut === "en_preparation" || o.statut === "en_livraison");
  const recents = orders.filter(o => o.id !== active?.id).slice(0, 5);

  let html = `<section class="section-block"><h2 class="section-title">Commande en Cours</h2>`;
  html += active ? activeOrderHtml(active) : `<p style="text-align:center;color:#9ca3af;font-weight:700;padding:24px 0;">Aucune commande en cours. <a href="menu.html" style="color:#22c55e;">Commander →</a></p>`;
  html += `</section><section class="section-block"><h2 class="section-title">Commandes Récentes</h2>`;
  html += recents.length ? recents.map(recentOrderHtml).join("") : `<p style="text-align:center;color:#9ca3af;font-weight:700;padding:16px 0;">Aucune commande récente.</p>`;
  html += `</section>`;

  wrap.innerHTML = html;

  document.getElementById("btn-cancel-order")?.addEventListener("click", async (e) => {
    if (!confirm("Annuler cette commande ? Cette action est définitive.")) return;
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Annulation…";
    try {
      await OrderService.cancelOrder(btn.dataset.id);
      await loadSuivi();
    } catch (err) {
      alert(err.message || "Impossible d'annuler cette commande.");
      btn.disabled = false;
      btn.textContent = "✕ Annuler ma commande";
    }
  });
}
