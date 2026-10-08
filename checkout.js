/* ============================================================
   CLO-CLO | checkout.js
   Récapitulatif du panier + validation de commande réelle
   (POST /api/orders via APP.passCommande). Quartiers chargés
   depuis l'API (/api/zones) — zone de référence : Nkolfoulou,
   Yaoundé.
   ============================================================ */
import { APP } from "./app-data.js";
import { ProductService } from "./services/productService.js";
import { OrderService } from "./services/orderService.js";
import { startPayment } from "./payment-ui.js";

/* Clé d'idempotence : identique tant que le panier + l'adresse ne changent pas, même si la page est
   rechargée ou si l'on réessaie après une coupure réseau → le serveur ne crée jamais 2 commandes. */
function idemKey(signature) {
  const k = sessionStorage.getItem("cloclo_idem");
  const s = sessionStorage.getItem("cloclo_idem_sig");
  if (k && s === signature) return k;
  const nk = (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2));
  sessionStorage.setItem("cloclo_idem", nk); sessionStorage.setItem("cloclo_idem_sig", signature);
  return nk;
}

const PAY_BRAND = {
  cash: { cls: "cash", name: "Payer à la livraison", sub: "Espèces au livreur" },
  orange_money: { cls: "orange", name: "Payer avec Orange Money", sub: "Orange Money" },
  momo: { cls: "mtn", name: "Payer avec MTN MoMo", sub: "MTN Mobile Money" },
  mobile_money: { cls: "mm", name: "Payer avec Mobile Money", sub: "MTN MoMo ou Orange Money" },
};

async function loadPaymentMethods() {
  const wrap = document.getElementById("pay-methods");
  const hint = document.getElementById("pay-hint");
  try {
    const { methods } = await OrderService.paymentMethods();
    wrap.innerHTML = methods.map((m, i) => {
      const b = PAY_BRAND[m.id] || { cls: "mm", name: m.label, sub: "" };
      return `<label class="pay-opt pay-${b.cls}"><input type="radio" name="pay" value="${m.id}" ${i === 0 ? "checked" : ""}/>
        <span class="pay-opt-ico" aria-hidden="true">${b.cls === "cash" ? "💵" : b.cls === "orange" ? "OM" : b.cls === "mtn" ? "M" : "📱"}</span>
        <span class="pay-opt-txt"><b>${b.name}</b><small>${b.sub}</small></span></label>`;
    }).join("") + `
      <div id="pay-phone-row" class="pay-phone" hidden>
        <label for="pay-phone">Numéro Mobile Money</label>
        <div class="pay-phone-field"><span>🇨🇲 +237</span><input id="pay-phone" type="tel" inputmode="tel" maxlength="12" placeholder="6XX XXX XXX" autocomplete="tel-national"/></div>
      </div>
      <p class="pay-secure">🔒 Paiement sécurisé · Votre commande part en cuisine dès la confirmation</p>`;
    const phoneInput = () => document.getElementById("pay-phone");
    if (APP.user?.tel && phoneInput()) phoneInput().value = String(APP.user.tel).replace(/^\+?237/, "").replace(/\s/g, "");
    const refresh = () => {
      const v = wrap.querySelector("input[name=pay]:checked")?.value;
      const online = v && v !== "cash";
      document.getElementById("pay-phone-row").hidden = v !== "mobile_money";   // le numéro n'est demandé que pour le paiement automatique
      hint.textContent = online ? "Vous recevrez les instructions de paiement juste après la validation de la commande." : "Vous réglez en espèces au livreur.";
      document.getElementById("btn-confirm").textContent = online ? "Confirmer et payer" : "Confirmer la commande";
    };
    wrap.addEventListener("change", refresh); refresh();
  } catch { hint.textContent = "Vous réglez en espèces au livreur."; }
}

function renderSummary() {
  const wrap = document.getElementById("checkout-summary");
  if (!wrap) return;
  if (APP.cart.length === 0) {
    wrap.innerHTML = `<p style="text-align:center;color:#9ca3af;font-weight:700;">Votre panier est vide. <a href="menu.html" style="color:#0F5B2C;">Voir le menu →</a></p>`;
    document.getElementById("btn-confirm").disabled = true;
    return;
  }
  wrap.innerHTML = APP.cart.map(i => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;font-size:0.92rem;color:#1a1a2e;">
      <span>${i.qty} × ${i.name}</span><span>${(i.price * i.qty).toLocaleString(window.CLOCLO_LOCALE())} FCFA</span>
    </div>`).join("") + `
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;"/>
    <div style="display:flex;justify-content:space-between;font-weight:900;font-size:1.05rem;color:#0F5B2C;">
      <span>Total</span><span>${APP.getCartTotal().toLocaleString(window.CLOCLO_LOCALE())} FCFA</span>
    </div>`;
}

async function fillZones() {
  const select = document.getElementById("input-quartier");
  if (!select) return;
  try {
    const zones = await ProductService.listZones();
    if (!zones.length) {
      // Aucune zone enregistrée par l'admin : la liste serait vide et bloquerait toute commande.
      // On la remplace par un champ libre (même id, même logique de lecture).
      const input = document.createElement("input");
      input.className = "form-input"; input.id = "input-quartier"; input.type = "text";
      input.placeholder = "Quartier (ex : Nkolfoulou)"; input.value = APP.user?.quartier || "";
      select.replaceWith(input);
      return;
    }
    select.innerHTML = zones.map(z => `<option value="${z.quartier}">${z.quartier} — ${z.ville}</option>`).join("");
    if (APP.user?.quartier) select.value = APP.user.quartier;
  } catch {
    select.innerHTML = `<option value="Nkolfoulou">Nkolfoulou — Yaoundé</option>`;
  }
}

function fillSavedAddresses() {
  const savedSelect = document.getElementById("input-saved-address");
  const group = document.getElementById("saved-addresses-group");
  if (!savedSelect) return;
  const addresses = APP.user?.favoriteAddresses || [];
  if (addresses.length === 0) { if (group) group.style.display = "none"; return; }
  savedSelect.innerHTML = `<option value="">— Saisir une nouvelle adresse —</option>` +
    addresses.map(a => `<option value="${a.id}">${a.label} — ${a.adresse}, ${a.quartier}</option>`).join("");
  savedSelect.addEventListener("change", () => {
    const chosen = addresses.find(a => String(a.id) === savedSelect.value);
    if (!chosen) return;
    document.getElementById("input-quartier").value = chosen.quartier;
    document.getElementById("input-adresse").value = chosen.adresse;
  });
}

document.addEventListener("cloclo:ready", async () => {
  if (!APP.isLoggedIn()) {
    window.location.href = "connexion.html";
    return;
  }
  const removed = APP.syncCart();
  if (removed.length) showToast(`Retiré du panier (plus disponible) : ${removed.join(", ")}`, "red");
  renderSummary();
  loadPaymentMethods();
  await fillZones();
  fillSavedAddresses();
  document.getElementById("input-adresse").value = APP.user.adresse || "";

  let clientCoords = null;
  requestClientLocation();

  document.getElementById("input-scheduled")?.addEventListener("change", (e) => {
    document.getElementById("input-scheduled-time").style.display = e.target.value === "later" ? "" : "none";
  });

  function requestClientLocation() {
    const feeBlock = document.getElementById("delivery-fee-block");
    const feeAmount = document.getElementById("delivery-fee-amount");
    const timeAmount = document.getElementById("delivery-time-amount");
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clientCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // Estimation affichée à titre indicatif — le montant définitif exact
        // (toujours entre 1000 et 2000 FCFA) est calculé et fixé côté serveur.
        feeBlock.style.display = "";
        feeAmount.textContent = "entre 1 000 et 2 000 FCFA selon la distance";
        if (timeAmount) timeAmount.textContent = "environ 25 à 45 min selon la distance et le trafic";
      },
      () => {
        feeBlock.style.display = "";
        feeAmount.textContent = "1 000 FCFA (position non partagée — tarif minimum appliqué)";
        if (timeAmount) timeAmount.textContent = "environ 30 à 50 min (estimation par défaut)";
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

    if (!quartier) { errorEl.textContent = "Quartier et adresse précise sont requis."; return; }
    const btn = document.getElementById("btn-confirm");
    if (btn.dataset.busy === "1") return;               // anti double-clic
    btn.dataset.busy = "1"; btn.disabled = true;
    const idleLabel = btn.textContent;
    btn.textContent = "Envoi en cours…";
    const paymentMethod = document.querySelector("#pay-methods input[name=pay]:checked")?.value || "cash";
    const signature = JSON.stringify([APP.cart.map(i => [i.id, i.qty]), adresse, promoCode, scheduledFor, paymentMethod]);
    try {
      const order = await APP.passCommande(adresse, {
        quartier, clientLat: clientCoords?.lat, clientLng: clientCoords?.lng,
        promoCode, scheduledFor, paymentMethod, idempotencyKey: idemKey(signature),
      });
      sessionStorage.removeItem("cloclo_idem"); sessionStorage.removeItem("cloclo_idem_sig");
      showToast("Commande confirmée !");
      const goTrack = () => { window.location.href = `suivi.html?order=${order.id}`; };
      if (paymentMethod !== "cash") {
        try { await startPayment(order, { onDone: goTrack, phone: document.getElementById("pay-phone")?.value ? "+237" + document.getElementById("pay-phone").value.replace(/\D/g, "") : undefined }); return; }
        catch (err) { showToast(err.message || "Paiement indisponible : réglez à la livraison ou réessayez depuis le suivi.", "red"); }
      }
      setTimeout(goTrack, 900);
    } catch (err) {
      btn.dataset.busy = "0"; btn.disabled = false; btn.textContent = idleLabel;
      errorEl.textContent = err.message || "Impossible de confirmer la commande.";
      if (err.isNetworkError) errorEl.textContent += " Vous pouvez réessayer : aucune commande en double ne sera créée.";
    }
  });
});
