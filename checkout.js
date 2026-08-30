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

  let clientCoords = null;
  requestClientLocation();

  document.getElementById("input-scheduled")?.addEventListener("change", (e) => {
    document.getElementById("input-scheduled-time").style.display = e.target.value === "later" ? "" : "none";
  });

  function requestClientLocation() {
    const feeBlock = document.getElementById("delivery-fee-block");
    const feeAmount = document.getElementById("delivery-fee-amount");
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clientCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // Estimation affichée à titre indicatif — le montant définitif exact
        // (toujours entre 1000 et 2000 FCFA) est calculé et fixé côté serveur.
        feeBlock.style.display = "";
        feeAmount.textContent = "calcul en cours…";
        feeAmount.textContent = "entre 1 000 et 2 000 FCFA selon la distance";
      },
      () => {
        feeBlock.style.display = "";
        feeAmount.textContent = "1 000 FCFA (position non partagée — tarif minimum appliqué)";
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  document.getElementById("btn-confirm")?.addEventListener("click", async () => {
    const errorEl = document.getElementById("checkout-error");
    errorEl.textContent = "";
    const quartier = document.getElementById("input-quartier").value;
    const adresseDetail = document.getElementById("input-adresse").value.trim();
    const adresse = adresseDetail ? `${adresseDetail}, ${quartier}` : quartier;
    const promoCode = document.getElementById("input-promo").value.trim() || undefined;

    let scheduledFor = null;
    if (document.getElementById("input-scheduled").value === "later") {
      const time = document.getElementById("input-scheduled-time").value;
      if (!time) { errorEl.textContent = "Choisissez une heure de livraison."; return; }
      const [h, m] = time.split(":");
      const d = new Date();
      d.setHours(Number(h), Number(m), 0, 0);
      scheduledFor = d.toISOString();
    }

    const btn = document.getElementById("btn-confirm");
    btn.disabled = true;
    btn.textContent = "Envoi en cours…";
    try {
      const order = await APP.passCommande(adresse, {
        clientLat: clientCoords?.lat, clientLng: clientCoords?.lng,
        promoCode, scheduledFor,
      });
      showToast("🎉 Commande confirmée !");
      setTimeout(() => window.location.href = `suivie.html?order=${order.id}`, 1000);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Confirmer et payer à la livraison";
      errorEl.textContent = err.message || "Impossible de confirmer la commande.";
    }
  });
});
