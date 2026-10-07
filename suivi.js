/* ============================================================
   CLO-CLO | suivi.js — Page Suivi de commande
   Toutes les données viennent de l'API (commande en cours,
   historique). L'ID de commande vient du paramètre ?order=
   (posé par checkout.js) sinon on prend la plus récente.
   ============================================================ */
import { APP } from "./app-data.js";
import { OrderService } from "./services/orderService.js";
import { NotificationService } from "./services/notificationService.js";

/* ── ICÔNES (remplacent les emojis utilisés précédemment) ── */
const ICON_SVG = (path) => `<svg class="ic" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0;" aria-hidden="true">${path}</svg>`;
const IC = {
  check: ICON_SVG(`<circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/>`),
  errorX: ICON_SVG(`<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`),
  close: ICON_SVG(`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`),
  alertTriangle: ICON_SVG(`<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`),
  phone: ICON_SVG(`<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 3a2 2 0 0 1-.4 2.1L8 10.1a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2-.5c1 .3 2 .5 3 .7a2 2 0 0 1 1.7 2.1Z"/>`),
  message: ICON_SVG(`<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-4-1L3 20l1-5.5a8.5 8.5 0 1 1 17-3z"/>`),
  pin: ICON_SVG(`<path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/>`),
  truck: ICON_SVG(`<rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8Z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>`),
  radar: ICON_SVG(`<path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6l16 16"/><circle cx="12" cy="12" r="2"/><path d="M4.93 19.07A10 10 0 0 0 17.01 20.66"/>`),
};

const STEP_LABELS = ["Préparation", "Acceptée", "En Route", "Livré"];
const STATUS_PROGRESS = { en_preparation: 1, assignee: 1, acceptee: 2, en_livraison: 3, livree: 4, annulee: 0 };
const STATUT_LABEL = {
  en_preparation: "en préparation", assignee: "livreur en cours d'affectation",
  acceptee: "livreur en route vers le bar", en_livraison: "en livraison",
  livree: "livrée", annulee: "annulée",
};

function activeOrderHtml(o) {
  const step = STATUS_PROGRESS[o.statut] ?? 1;
  const pct = Math.round((step / 4) * 100);
  const cancelBtn = o.statut === "en_preparation"
    ? `<button id="btn-cancel-order" data-id="${o.id}" style="margin-top:16px;width:100%;background:white;color:#ef4444;border:1.5px solid #fecaca;border-radius:10px;padding:11px;font-family:'DM Sans',sans-serif;font-weight:800;cursor:pointer;">${IC.close} Annuler ma commande</button>`
    : "";

  const locationBlock = o.statut === "en_livraison"
    ? `<div class="detail-block" id="location-block" style="grid-column:1/-1;">
         <div class="detail-title">Localisation en direct</div>
         <div id="tracking-map" style="height:220px;border-radius:12px;overflow:hidden;margin-top:6px;background:#f4f4f5;"></div>
         <div id="location-livreur-status" style="color:#6b7280;font-weight:600;font-size:0.85rem;margin-top:8px;">${IC.radar} En attente de la position du livreur…</div>
         <div id="eta-live" style="color:#0F5B2C;font-weight:800;font-size:0.95rem;margin-top:6px;"></div>
       </div>`
    : "";

  const chatBlock = (o.statut === "acceptee" || o.statut === "en_livraison")
    ? `<div class="detail-block" style="grid-column:1/-1;">
         ${o.livreurContact ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
           <div style="width:44px;height:44px;border-radius:50%;background:${o.livreurContact.photoUrl ? `url(${o.livreurContact.photoUrl})` : "#e5e7eb"};background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;font-weight:800;color:#6b7280;">${!o.livreurContact.photoUrl ? IC.truck : ""}</div>
           <div>
             <div style="font-weight:800;color:#1a1a2e;">${o.livreurContact.nom}</div>
             ${o.livreurContact.tel ? `<a href="tel:${o.livreurContact.tel}" style="color:#0A4220;font-weight:700;font-size:0.82rem;text-decoration:none;">${IC.phone} Appeler</a>` : ""}
           </div>
         </div>` : ""}
         <div class="detail-title">${IC.message} Chat avec le livreur</div>
         <div id="chat-messages" style="max-height:180px;overflow-y:auto;background:#f9fafb;border-radius:10px;padding:10px;margin:8px 0;font-size:0.85rem;"></div>
         <div style="display:flex;gap:8px;">
           <input id="chat-input" type="text" placeholder="Écrire un message…" style="flex:1;padding:10px;border-radius:8px;border:1.5px solid #e5e7eb;font-family:'DM Sans',sans-serif;"/>
           <button id="chat-send" style="background:#0F5B2C;color:white;border:none;border-radius:8px;padding:10px 16px;font-weight:800;cursor:pointer;">Envoyer</button>
         </div>
       </div>`
    : "";

  const confirmBlock = (o.statut === "en_livraison" && o.confirmedLivreurAt && !o.confirmedClientAt)
    ? `<div style="grid-column:1/-1;background:#fef9c3;border-radius:12px;padding:16px;text-align:center;">
         <div style="font-weight:800;color:#92400e;margin-bottom:10px;">Le livreur indique avoir livré votre commande.</div>
         <button id="btn-confirm-received" data-id="${o.id}" style="background:#0F5B2C;color:white;border:none;border-radius:10px;padding:11px 24px;font-weight:800;cursor:pointer;">${IC.check} J'ai bien reçu ma commande</button>
       </div>`
    : "";

  const sosBlock = o.statut === "en_livraison"
    ? `<button id="btn-sos" data-id="${o.id}" style="grid-column:1/-1;background:white;color:#ef4444;border:1.5px solid #fecaca;border-radius:10px;padding:11px;font-weight:800;cursor:pointer;">${IC.alertTriangle} SOS urgence</button>`
    : "";

  const items = o.items.map(i => `${i.qty}× ${i.name}`).join(", ");
  return `
    <div class="order-card active-order">
      <div class="order-card-header">
        <div>
          <div class="order-label">Commande</div>
          <div class="order-id">CMD-${o.id}</div>
        </div>
        <div class="status-badge">${STATUT_LABEL[o.statut] || o.statut}</div>
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
          <div class="order-total">
            Sous-total : ${(o.total - (o.fraisLivraison || 0) + (o.discount || 0)).toLocaleString(window.CLOCLO_LOCALE())} FCFA<br/>
            ${o.discount ? `Remise${o.promoCode ? ` (${o.promoCode})` : ""} : -${o.discount.toLocaleString(window.CLOCLO_LOCALE())} FCFA<br/>` : ""}
            Frais de livraison${o.distanceKm ? ` (${o.distanceKm} km)` : ""} : ${(o.fraisLivraison || 0).toLocaleString(window.CLOCLO_LOCALE())} FCFA<br/>
            <strong>Total : ${o.total.toLocaleString(window.CLOCLO_LOCALE())} FCFA</strong>
          </div>
        </div>
        <div class="detail-block">
          <div class="detail-title">Adresse de Livraison</div>
          <div class="address-row">${IC.pin} ${o.adresse || "—"}</div>
        </div>
        ${locationBlock}
        ${confirmBlock}
        ${chatBlock}
        ${sosBlock}
      </div>
      ${cancelBtn}
    </div>`;
}

function recentOrderHtml(o) {
  const needsRating = o.statut === "livree" && !o.rating;
  return `
    <div class="recent-card">
      <div class="recent-left">
        <div class="recent-id">CMD-${o.id}</div>
        <div class="recent-address">${o.adresse || "—"}</div>
        <div class="recent-items">${o.items.map(i => i.name).join(", ")}</div>
        ${o.rating ? `<div style="color:#f59e0b;font-size:0.8rem;">${"★".repeat(o.rating)}${"☆".repeat(5 - o.rating)}</div>` : ""}
      </div>
      <div class="recent-right">
        <div class="badge-livre">${o.statut === "livree" ? IC.check + " Livré" : o.statut === "annulee" ? IC.errorX + " Annulé" : IC.truck + " " + (STATUT_LABEL[o.statut] || o.statut)}</div>
        <div class="recent-price">${o.total.toLocaleString(window.CLOCLO_LOCALE())} FCFA</div>
        ${needsRating ? `<button class="btn-rate" data-id="${o.id}" style="margin-top:6px;background:#f59e0b;color:white;border:none;border-radius:8px;padding:6px 12px;font-weight:800;font-size:0.78rem;cursor:pointer;">⭐ Noter</button>` : ""}
        ${o.statut === "livree" ? `<button class="btn-reorder" data-id="${o.id}" style="margin-top:6px;background:white;color:#0F5B2C;border:1.5px solid #0F5B2C;border-radius:8px;padding:6px 12px;font-weight:800;font-size:0.78rem;cursor:pointer;">${IC.truck} Recommander</button>` : ""}
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

  const active = orderId
    ? orders.find(o => String(o.id) === orderId)
    : orders.find(o => ["en_preparation", "assignee", "acceptee", "en_livraison"].includes(o.statut));
  const recents = orders.filter(o => o.id !== active?.id).slice(0, 5);

  let html = `<section class="section-block"><h2 class="section-title">Commande en Cours</h2>`;
  html += active ? activeOrderHtml(active) : `<p style="text-align:center;color:#9ca3af;font-weight:700;padding:24px 0;">Aucune commande en cours. <a href="menu.html" style="color:#0F5B2C;">Commander →</a></p>`;
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
      btn.innerHTML = `${IC.close} Annuler ma commande`;
    }
  });

  document.getElementById("btn-confirm-received")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Confirmation…";
    try {
      await OrderService.confirmReceived(btn.dataset.id);
      showToast("Merci ! En attente de la confirmation finale de l'administrateur.");
      await loadSuivi();
    } catch (err) {
      alert(err.message || "Erreur.");
      btn.disabled = false;
    }
  });

  document.getElementById("btn-sos")?.addEventListener("click", (e) => {
    const orderIdSos = e.currentTarget.dataset.id;
    if (!confirm("Déclencher une alerte SOS ? L'administrateur et le livreur seront immédiatement prévenus.")) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await OrderService.sos(orderIdSos, pos.coords.latitude, pos.coords.longitude).catch(() => {});
        showToast("Alerte envoyée.", "red");
      },
      async () => {
        await OrderService.sos(orderIdSos).catch(() => {});
        showToast("Alerte envoyée (sans position).", "red");
      }
    );
  });

  wrap.querySelectorAll(".btn-rate").forEach(btn => {
    btn.addEventListener("click", () => openRatingModal(btn.dataset.id));
  });
  wrap.querySelectorAll(".btn-reorder").forEach(btn => {
    btn.addEventListener("click", async () => {
      const order = orders.find(o => String(o.id) === btn.dataset.id);
      if (!order) return;
      let added = 0;
      for (const item of order.items) {
        for (let i = 0; i < item.qty; i++) {
          if (APP.addToCart(item.productId)) added++;
        }
      }
      if (added === 0) {
        showToast("Ces produits ne sont plus disponibles au menu.", "red");
        return;
      }
      showToast("Articles ajoutés au panier !");
      setTimeout(() => window.location.href = "checkout.html", 800);
    });
  });

  if (active) {
    if (["acceptee", "en_livraison"].includes(active.statut)) initChat(active.id);
    if (active.statut === "en_livraison") setupLocationSharing(active.id);
  }
}

/* ── NOTATION + POURBOIRE (après livraison) ── */
function openRatingModal(orderId) {
  document.querySelector(".rating-modal")?.remove();
  const modal = document.createElement("div");
  modal.className = "rating-modal";
  modal.innerHTML = `
    <div class="rating-modal-inner">
      <h3 style="margin-bottom:14px;">Noter votre livraison</h3>
      <div id="stars" style="font-size:2rem;letter-spacing:6px;cursor:pointer;margin-bottom:14px;">★★★★★</div>
      <textarea id="rating-comment" placeholder="Un commentaire ? (facultatif)" style="width:100%;min-height:70px;padding:10px;border-radius:8px;border:1.5px solid #e5e7eb;font-family:'DM Sans',sans-serif;margin-bottom:14px;"></textarea>
      <label style="display:block;font-weight:700;font-size:0.85rem;margin-bottom:6px;">Pourboire pour le livreur (FCFA)</label>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        ${[0, 200, 500, 1000].map(v => `<button class="tip-choice" data-v="${v}" style="flex:1;background:white;border:1.5px solid #e5e7eb;border-radius:8px;padding:8px;font-weight:700;cursor:pointer;">${v === 0 ? "Aucun" : v}</button>`).join("")}
      </div>
      <div style="display:flex;gap:10px;">
        <button id="rating-cancel" style="flex:1;background:white;border:1.5px solid #e5e7eb;border-radius:10px;padding:11px;font-weight:800;cursor:pointer;">Annuler</button>
        <button id="rating-submit" style="flex:1;background:#0F5B2C;color:white;border:none;border-radius:10px;padding:11px;font-weight:800;cursor:pointer;">Envoyer</button>
      </div>
    </div>`;
  Object.assign(modal.style, {
    position: "fixed", inset: "0", background: "rgba(0,0,0,0.5)", zIndex: "9999",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
  });
  modal.querySelector(".rating-modal-inner").style.cssText =
    "background:white;border-radius:16px;padding:24px;max-width:360px;width:100%;";
  document.body.appendChild(modal);

  let rating = 5, tip = 0;
  const starsEl = modal.querySelector("#stars");
  starsEl.addEventListener("click", (e) => {
    const rect = starsEl.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    rating = Math.max(1, Math.min(5, Math.ceil(pct * 5)));
    starsEl.textContent = "★".repeat(rating) + "☆".repeat(5 - rating);
  });
  modal.querySelectorAll(".tip-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      tip = Number(btn.dataset.v);
      modal.querySelectorAll(".tip-choice").forEach(b => b.style.borderColor = "#e5e7eb");
      btn.style.borderColor = "#0F5B2C";
    });
  });
  modal.querySelector("#rating-cancel").addEventListener("click", () => modal.remove());
  modal.querySelector("#rating-submit").addEventListener("click", async () => {
    const comment = modal.querySelector("#rating-comment").value.trim();
    try {
      await OrderService.rate(orderId, rating, comment);
      if (tip > 0) await OrderService.tip(orderId, tip);
      showToast("Merci pour votre retour !");
      modal.remove();
      loadSuivi();
    } catch (err) {
      alert(err.message || "Erreur lors de l'envoi.");
    }
  });
}

/* ── CHAT (client ↔ livreur) ── */
async function initChat(orderId) {
  const box = document.getElementById("chat-messages");
  if (!box) return;
  async function renderMessages() {
    const messages = await OrderService.listMessages(orderId).catch(() => []);
    box.innerHTML = messages.length
      ? messages.map(m => {
          const mine = m.sender === "client";
          const isAdmin = m.sender === "admin";
          const bg = mine ? "#0F5B2C" : isAdmin ? "#1a1a2e" : "#e5e7eb";
          const color = mine || isAdmin ? "white" : "#1a1a2e";
          return `<div style="margin-bottom:6px;text-align:${mine ? "right" : "left"};">
          ${isAdmin ? `<div style="font-size:0.68rem;color:#9ca3af;font-weight:800;">ADMIN</div>` : ""}
          <span style="display:inline-block;background:${bg};color:${color};padding:6px 10px;border-radius:10px;max-width:80%;">${m.text}</span>
        </div>`;
        }).join("")
      : `<p style="color:#9ca3af;text-align:center;font-size:0.8rem;">Aucun message pour l'instant.</p>`;
    box.scrollTop = box.scrollHeight;
  }
  await renderMessages();

  const send = async () => {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    try {
      await OrderService.sendMessage(orderId, text);
      renderMessages();
    } catch (err) { showToast(err.message || "Message non envoyé.", "red"); }
  };
  document.getElementById("chat-send")?.addEventListener("click", send);
  document.getElementById("chat-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });

  NotificationService.connect((event, data) => {
    if (event === "order:message" && data?.id === orderId) renderMessages();
    if (event === "order:confirmation" && data?.id === orderId) loadSuivi();
    if (event === "order:updated" && data?.id === orderId) loadSuivi();
  });
}

/* ── LOCALISATION EN TEMPS RÉEL (pendant une livraison active) ──
   Le client partage sa position (pour aider le livreur à le localiser)
   et voit en direct celle du livreur, via le flux SSE de notifications. */
let clientLocationIntervalId = null;

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function setupLocationSharing(orderId) {
  if (clientLocationIntervalId) clearInterval(clientLocationIntervalId);
  let myCoords = null;

  if (navigator.geolocation) {
    const sendPosition = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          myCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          OrderService.updateLocation(orderId, pos.coords.latitude, pos.coords.longitude).catch(() => {});
        },
        () => { /* le client peut refuser — pas bloquant, on affiche quand même la position du livreur */ },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    };
    sendPosition();
    clientLocationIntervalId = setInterval(sendPosition, 15000);
  }

  let map = null, markerLivreur = null, markerClient = null;
  const statusEl = document.getElementById("location-livreur-status");
  const etaEl = document.getElementById("eta-live");

  function ensureMap() {
    const mapEl = document.getElementById("tracking-map");
    if (!mapEl || map || !window.L) return;
    map = L.map("tracking-map", { zoomControl: false }).setView([3.848, 11.502], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
  }

  function fitMapToMarkers() {
    const pts = [markerLivreur, markerClient].filter(Boolean).map((m) => m.getLatLng());
    if (pts.length === 1) map.setView(pts[0], 15);
    else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] });
  }

  // ETA en direct : distance réelle livreur↔client / vitesse moyenne moto (~25 km/h en ville).
  function updateEta(livreurLat, livreurLng) {
    if (!etaEl) return;
    const ref = myCoords; // position du client si partagée, sinon pas d'ETA calculable
    if (!ref) { etaEl.textContent = ""; return; }
    const km = haversineKm(livreurLat, livreurLng, ref.lat, ref.lng);
    const minutes = Math.max(1, Math.round((km / 25) * 60));
    etaEl.textContent = `⏱️ Arrive dans environ ${minutes} min (${km.toFixed(1)} km)`;
  }

  const renderLivreurPosition = (loc) => {
    if (!loc) return;
    ensureMap();
    if (!map) return;
    const livreurIcon = L.divIcon({ html: IC.truck, className: "", iconSize: [28, 28] });
    const clientIcon = L.divIcon({ html: IC.pin, className: "", iconSize: [28, 28] });

    if (loc.livreur) {
      const { lat, lng, at } = loc.livreur;
      if (!markerLivreur) markerLivreur = L.marker([lat, lng], { icon: livreurIcon }).addTo(map).bindPopup("Livreur");
      else markerLivreur.setLatLng([lat, lng]);
      if (statusEl) statusEl.innerHTML = `${IC.truck} Position mise à jour à ${new Date(at).toLocaleTimeString(window.CLOCLO_LOCALE(), { hour: "2-digit", minute: "2-digit" })}`;
      updateEta(lat, lng);
    }
    if (loc.client) {
      const { lat, lng } = loc.client;
      if (!markerClient) markerClient = L.marker([lat, lng], { icon: clientIcon }).addTo(map).bindPopup("Vous");
      else markerClient.setLatLng([lat, lng]);
    }
    fitMapToMarkers();
  };

  OrderService.getLocation(orderId).then(renderLivreurPosition).catch(() => {});
  NotificationService.connect((event, data) => {
    if (event === "order:location" && data?.id === orderId) renderLivreurPosition(data.location);
  });
}
