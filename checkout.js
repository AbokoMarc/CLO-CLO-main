/* ============================================================
   CLO-CLO | checkout.js
   Récapitulatif du panier + validation de commande réelle
   (POST /api/orders via APP.passCommande). Quartiers chargés
   depuis l'API (/api/zones) — zone de référence : Nkolfoulou,
   Yaoundé.
   ============================================================ */
import { APP } from "./app-data.js";
import { ProductService } from "./services/productService.js";

function renderSummary() {
  const wrap = document.getElementById("checkout-summary");
  if (!wrap) return;
  if (APP.cart.length === 0) {
    wrap.innerHTML = `<p style="text-align:center;color:#9ca3af;font-weight:700;">Votre panier est vide. <a href="menu.html" style="color:#22c55e;">Voir le menu →</a></p>`;
    document.getElementById("btn-confirm").disabled = true;
    return;
  }
  wrap.innerHTML = APP.cart.map(i => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;font-size:0.92rem;color:#1a1a2e;">
      <span>${i.qty} × ${i.name}</span><span>${(i.price * i.qty).toLocaleString()} FCFA</span>
    </div>`).join("") + `
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;"/>
    <div style="display:flex;justify-content:space-between;font-weight:900;font-size:1.05rem;color:#22c55e;">
      <span>Total</span><span>${APP.getCartTotal().toLocaleString()} FCFA</span>
    </div>`;
}

async function fillZones() {
  const select = document.getElementById("input-quartier");
  if (!select) return;
  try {
    const zones = await ProductService.listZones();
    select.innerHTML = zones.map(z => `<option value="${z.quartier}">${z.quartier} — ${z.ville}</option>`).join("");
    if (APP.user?.quartier) select.value = APP.user.quartier;
  } catch {
    select.innerHTML = `<option value="Nkolfoulou">Nkolfoulou — Yaoundé</option>`;
  }
}

document.addEventListener("cloclo:ready", async () => {
  if (!APP.isLoggedIn()) {
    window.location.href = "connexion.html";
    return;
  }
  renderSummary();
  await fillZones();
  document.getElementById("input-adresse").value = APP.user.adresse || "";

  document.getElementById("btn-confirm")?.addEventListener("click", async () => {
    const errorEl = document.getElementById("checkout-error");
    errorEl.textContent = "";
    const quartier = document.getElementById("input-quartier").value;
    const adresseDetail = document.getElementById("input-adresse").value.trim();
    const adresse = adresseDetail ? `${adresseDetail}, ${quartier}` : quartier;

    const btn = document.getElementById("btn-confirm");
    btn.disabled = true;
    btn.textContent = "Envoi en cours…";
    try {
      const order = await APP.passCommande(adresse);
      showToast("🎉 Commande confirmée !");
      setTimeout(() => window.location.href = `suivie.html?order=${order.id}`, 1000);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Confirmer et payer à la livraison";
      errorEl.textContent = err.message || "Impossible de confirmer la commande.";
    }
  });
});
