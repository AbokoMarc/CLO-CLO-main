/* ============================================================
   CLO-CLO LIVREUR | livreur.js (partagé toutes pages livreur)
   Toutes les données viennent du backend via DeliveryService.
   Protégé : redirige vers connexion-livreur.html si non livreur.
   ============================================================ */
import { AuthService } from "./services/authService.js";
import { DeliveryService } from "./services/deliveryService.js";
import { NotificationService } from "./services/notificationService.js";
import { I18n } from "./i18n.js";
import { PWA } from "./pwa.js";
import { ApiClient } from "./services/apiClient.js";

const page = window.location.pathname;

function showToast(msg, color = "green") {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed", bottom: "30px", right: "30px",
    background: color === "red" ? "#ef4444" : color === "orange" ? "#f97316" : "#22c55e",
    color: "white", padding: "14px 24px", borderRadius: "12px",
    fontFamily: "'Nunito',sans-serif", fontWeight: "700", fontSize: "0.95rem",
    boxShadow: "0 6px 24px rgba(0,0,0,0.2)", zIndex: "9999",
    opacity: "1", transition: "opacity 0.3s",
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 2500);
}

async function requireLivreur() {
  const me = await AuthService.me();
  if (!me || me.role !== "livreur") {
    window.location.href = "connexion-livreur.html";
    return null;
  }
  return me;
}

function fillProfile(livreur) {
  document.querySelectorAll(".profile-name").forEach(el => el.textContent = livreur.nom);
  document.querySelectorAll(".profile-id").forEach(el => el.textContent = "ID: " + livreur.matricule);
  document.querySelectorAll(".statut-badge").forEach(el => {
    el.innerHTML = `<span class="dot-${livreur.statut === "disponible" ? "green" : "orange"}"></span> ${livreur.statut === "disponible" ? "Disponible" : "En livraison"}`;
  });
  const paieLabel = livreur.paieMontant > 0
    ? `${livreur.paieMontant.toLocaleString()} FCFA / ${livreur.paieType === "mensuel" ? "mois" : "jour"}`
    : "Non définie par l'administrateur";
  document.querySelectorAll(".profile-paie").forEach(el => el.textContent = paieLabel);
  I18n.injectToggle(document.querySelector(".sidebar-bottom"));

  // Toggle "Actif" — visible en permanence, pas seulement à la déconnexion.
  const toggleBtn = document.getElementById("btn-toggle-actif");
  if (toggleBtn) {
    let actif = livreur.actif !== false;
    function paintToggle() {
      toggleBtn.textContent = actif ? "✅ Actif" : "⛔ Inactif";
      toggleBtn.style.background = actif ? "#dcfce7" : "#fef3c7";
      toggleBtn.style.color = actif ? "#16a34a" : "#d97706";
      toggleBtn.style.borderColor = actif ? "#16a34a" : "#d97706";
    }
    paintToggle();
    toggleBtn.addEventListener("click", async () => {
      actif = !actif;
      paintToggle();
      try {
        await DeliveryService.setActif(actif);
        showToast(actif ? "✅ Vous êtes actif — visible par l'admin." : "⛔ Vous êtes marqué inactif.");
      } catch (err) {
        actif = !actif; paintToggle();
        showToast(err.message || "Erreur", "red");
      }
    });
  }
}

function initLogout() {
  document.querySelector(".js-livreur-logout")?.addEventListener("click", () => {
    AuthService.logout();
    window.location.href = "connexion-livreur.html";
  });
}

/* ── SIDEBAR MOBILE : aucun bouton pour l'ouvrir sur petit écran, on en ajoute un ── */
function injectSidebarToggle() {
  if (document.querySelector(".sidebar-toggle")) return;
  const btn = document.createElement("button");
  btn.className = "sidebar-toggle";
  btn.setAttribute("aria-label", "Ouvrir le menu");
  btn.innerHTML = "☰";
  document.body.appendChild(btn);
  const sidebar = document.querySelector(".sidebar");
  btn.addEventListener("click", () => sidebar?.classList.toggle("sidebar-open"));
  document.querySelector(".main-content")?.addEventListener("click", () => sidebar?.classList.remove("sidebar-open"));
}

const notifLog = []; // historique en mémoire pour cette session (affiché dans le panneau)

function initLivreurNotifications(livreur) {
  NotificationService.connect((event, order) => {
    if (!order) return;
    if (event === "order:new") {
      notifLog.unshift({ text: `🆕 Nouvelle demande de livraison — CMD-${order.id}`, at: new Date() });
      showToast(`🆕 Nouvelle demande de livraison — CMD-${order.id}`, "orange");
      if (page.includes("livreur-dashboard")) initDashboard(livreur);
    } else if (event === "order:cancelled" && Number(order.livreurId) === Number(livreur.id)) {
      notifLog.unshift({ text: `❌ Commande CMD-${order.id} annulée par le client.`, at: new Date() });
      showToast(`❌ Commande CMD-${order.id} annulée par le client.`, "red");
      if (page.includes("livreur-dashboard")) initDashboard(livreur);
      if (page.includes("livreur-livraison")) initLivraison();
    } else if (event === "order:sos") {
      notifLog.unshift({ text: `🆘 Alerte urgence — CMD-${order.id}`, at: new Date() });
      showToast(`🆘 ALERTE URGENCE — CMD-${order.id}`, "red");
    }
  });

  document.getElementById("nav-notifs-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    NotificationService.clearUnread();
    showNotifPanel();
  });
}

function showNotifPanel() {
  document.querySelector(".notif-panel")?.remove();
  const panel = document.createElement("div");
  panel.className = "notif-panel";
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <strong>Notifications</strong>
      <button id="notif-panel-close" style="background:none;border:none;font-size:1.1rem;cursor:pointer;color:#6b7280;">✕</button>
    </div>
    ${notifLog.length
      ? notifLog.slice(0, 15).map(n => `<div style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:0.85rem;color:#374151;">${n.text}<div style="color:#9ca3af;font-size:0.72rem;margin-top:2px;">${n.at.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div></div>`).join("")
      : `<p style="color:#9ca3af;font-size:0.85rem;text-align:center;padding:20px 0;">Aucune notification pour l'instant.</p>`}`;
  Object.assign(panel.style, {
    position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)",
    background: "white", borderRadius: "14px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
    padding: "16px 18px", width: "min(340px, 90vw)", maxHeight: "70vh", overflowY: "auto",
    zIndex: "9999",
  });
  document.body.appendChild(panel);
  panel.querySelector("#notif-panel-close").addEventListener("click", () => panel.remove());
}

/* ── DASHBOARD ── */
async function initDashboard(livreur) {
  const deliveries = await DeliveryService.myDeliveries();
  const enCours = deliveries.filter(o => o.statut === "acceptee" || o.statut === "en_livraison");
  const enAttente = deliveries.filter(o => o.statut === "assignee");

  document.getElementById("stat-livraisons-jour").textContent = deliveries.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length;
  // Montant réellement encaissé en cash chez les clients aujourd'hui (pas une commission
  // inventée) : la paie du livreur est fixée séparément par l'admin, voir sidebar "Ma paie".
  document.getElementById("stat-gains-jour").textContent = deliveries
    .filter(o => o.statut === "livree" && new Date(o.createdAt).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + o.total, 0).toLocaleString() + " FCFA";
  document.getElementById("stat-livraisons-total").textContent = deliveries.length;

  const wrap = document.getElementById("livreur-content");
  let html = "";

  if (enCours.length) {
    html += enCours.map(o => `
      <div class="delivery-current" style="background:white;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 2px 14px rgba(0,0,0,0.06);">
        <div style="font-weight:900;font-size:1.1rem;color:#1a1a2e;margin-bottom:6px;">Livraison en cours — CMD-${o.id}</div>
        <div style="color:#6b7280;font-weight:600;margin-bottom:10px;">${o.items.map(i => `${i.qty}× ${i.name}`).join(", ")}</div>
        <div style="color:#1a1a2e;font-weight:700;margin-bottom:14px;">📍 ${o.adresse}</div>
        <a href="livreur-livraison.html" style="display:inline-block;background:#22c55e;color:white;border:none;border-radius:10px;padding:11px 20px;font-weight:800;text-decoration:none;">Voir le détail →</a>
      </div>`).join("");
  }

  if (enAttente.length) {
    html += enAttente.map(o => `
      <div class="demande-card" style="background:white;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 2px 14px rgba(0,0,0,0.06);">
        <div style="font-weight:900;font-size:1.05rem;color:#1a1a2e;margin-bottom:6px;">Nouvelle demande — CMD-${o.id}</div>
        <div style="color:#6b7280;font-weight:600;margin-bottom:10px;">${o.items.map(i => `${i.qty}× ${i.name}`).join(", ")}</div>
        <div style="color:#1a1a2e;font-weight:700;margin-bottom:14px;">📍 ${o.adresse}</div>
        <div style="display:flex;gap:10px;">
          <button class="btn-accept" data-order="${o.id}" style="flex:1;background:#22c55e;color:white;border:none;border-radius:10px;padding:11px;font-weight:800;cursor:pointer;">Accepter</button>
        </div>
      </div>`).join("");
  }

  wrap.innerHTML = html || `<p style="text-align:center;color:#9ca3af;font-weight:700;padding:40px 0;">Aucune livraison en attente pour l'instant.</p>`;

  wrap.querySelectorAll(".btn-accept").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        // Étape 1/2 seulement : accepter n'active PAS encore le GPS, ça ouvre juste le chat.
        // Le vrai démarrage (avec GPS) se fait depuis la page livreur-livraison.html.
        await DeliveryService.accept(btn.dataset.order);
        showToast("✅ Demande acceptée ! Le chat est ouvert.");
        setTimeout(() => window.location.href = "livreur-livraison.html", 900);
      } catch (err) { showToast(err.message || "Erreur", "red"); }
    });
  });
}

/* ── LIVRAISON EN COURS (détail) ── */
async function initLivraison() {
  const deliveries = await DeliveryService.myDeliveries();
  const order = deliveries.find(o => ["assignee", "acceptee", "en_livraison"].includes(o.statut));
  const wrap = document.getElementById("livraison-content");

  if (!order) {
    wrap.innerHTML = `<p style="text-align:center;color:#9ca3af;font-weight:700;padding:40px 0;">Aucune livraison active. <a href="livreur-dashboard.html" style="color:#22c55e;">Retour au tableau de bord →</a></p>`;
    return;
  }

  const alreadyConfirmed = !!order.confirmedLivreurAt;
  const actionButton =
    order.statut === "assignee"
      ? `<button id="btn-accept" style="flex:1;background:#22c55e;color:white;border:none;border-radius:10px;padding:12px;font-weight:800;cursor:pointer;">✅ Accepter la livraison</button>`
      : order.statut === "acceptee"
      ? `<button id="btn-start" style="flex:1;background:#3b82f6;color:white;border:none;border-radius:10px;padding:12px;font-weight:800;cursor:pointer;">🛵 Démarrer la livraison</button>`
      : alreadyConfirmed
      ? `<div style="flex:1;text-align:center;color:#22c55e;font-weight:800;padding:12px;">✅ Livraison confirmée — en attente du client et de l'admin</div>`
      : `<button id="btn-livre" style="flex:1;background:#22c55e;color:white;border:none;border-radius:10px;padding:12px;font-weight:800;cursor:pointer;">✓ J'ai livré la commande</button>`;

  const chatBlock = ["acceptee", "en_livraison"].includes(order.statut)
    ? `<div style="margin-top:20px;border-top:1px solid #f3f4f6;padding-top:16px;">
         <div style="font-size:0.8rem;color:#9ca3af;font-weight:800;margin-bottom:8px;">💬 CHAT AVEC LE CLIENT</div>
         <div id="chat-messages" style="max-height:180px;overflow-y:auto;background:#f9fafb;border-radius:10px;padding:10px;margin-bottom:8px;font-size:0.85rem;"></div>
         <div style="display:flex;gap:8px;">
           <input id="chat-input" type="text" placeholder="Écrire un message…" style="flex:1;padding:10px;border-radius:8px;border:1.5px solid #e5e7eb;font-family:'Nunito',sans-serif;"/>
           <button id="chat-send" style="background:#22c55e;color:white;border:none;border-radius:8px;padding:10px 16px;font-weight:800;cursor:pointer;">Envoyer</button>
         </div>
       </div>`
    : "";

  wrap.innerHTML = `
    <div style="background:white;border-radius:16px;padding:24px;box-shadow:0 2px 14px rgba(0,0,0,0.06);">
      <div style="font-weight:900;font-size:1.2rem;color:#1a1a2e;margin-bottom:4px;">Commande CMD-${order.id}</div>
      <div style="color:#6b7280;font-weight:600;margin-bottom:18px;">Total : ${order.total.toLocaleString()} FCFA</div>
      <div style="margin-bottom:16px;">
        <div style="font-size:0.8rem;color:#9ca3af;font-weight:800;margin-bottom:4px;">ADRESSE DE LIVRAISON</div>
        <div style="font-weight:700;color:#1a1a2e;">📍 ${order.adresse}</div>
      </div>
      <div style="margin-bottom:22px;">
        <div style="font-size:0.8rem;color:#9ca3af;font-weight:800;margin-bottom:6px;">ARTICLES</div>
        <ul style="margin:0;padding-left:18px;color:#1a1a2e;font-weight:600;">
          ${order.items.map(i => `<li>${i.qty}× ${i.name}</li>`).join("")}
        </ul>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn-gmaps" style="flex:1;background:white;color:#22c55e;border:2px solid #22c55e;border-radius:10px;padding:12px;font-weight:800;cursor:pointer;">🗺️ Itinéraire</button>
        ${actionButton}
      </div>
      ${order.statut === "en_livraison" ? `<button id="btn-sos" style="width:100%;margin-top:10px;background:white;color:#ef4444;border:1.5px solid #fecaca;border-radius:10px;padding:10px;font-weight:800;cursor:pointer;">🆘 SOS urgence</button>` : ""}
      <div id="location-share-status" style="margin-top:14px;font-size:0.8rem;color:#9ca3af;font-weight:700;text-align:center;"></div>
      ${chatBlock}
    </div>`;

  document.querySelector(".btn-gmaps")?.addEventListener("click", () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.adresse)}`, "_blank");
  });

  // La géolocalisation ne démarre QUE si la livraison est vraiment en cours
  // (statut "en_livraison") — pas dès l'acceptation.
  if (order.statut === "en_livraison") startLocationSharing(order.id);

  document.getElementById("btn-accept")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    e.target.textContent = "Envoi…";
    try {
      await DeliveryService.accept(order.id);
      showToast("✅ Livraison acceptée — le chat est maintenant ouvert.");
      initLivraison();
    } catch (err) {
      e.target.disabled = false;
      showToast(err.message || "Erreur", "red");
    }
  });

  document.getElementById("btn-start")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    e.target.textContent = "Envoi…";
    try {
      await DeliveryService.start(order.id);
      showToast("🛵 Livraison démarrée — position partagée.");
      initLivraison();
    } catch (err) {
      e.target.disabled = false;
      showToast(err.message || "Erreur", "red");
    }
  });

  document.getElementById("btn-livre")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    e.target.textContent = "Envoi…";
    try {
      await DeliveryService.confirmDelivered(order.id);
      stopLocationSharing();
      showToast("✅ Confirmé ! En attente de la confirmation du client et de l'admin.");
      initLivraison();
    } catch (err) {
      e.target.disabled = false;
      showToast(err.message || "Erreur", "red");
    }
  });

  document.getElementById("btn-sos")?.addEventListener("click", async () => {
    if (!confirm("Déclencher une alerte SOS ? L'administrateur et le client seront immédiatement prévenus.")) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await DeliveryService.sos(order.id, pos.coords.latitude, pos.coords.longitude).catch(() => {});
        showToast("🆘 Alerte envoyée.", "red");
      },
      async () => {
        await DeliveryService.sos(order.id).catch(() => {});
        showToast("🆘 Alerte envoyée (sans position).", "red");
      }
    );
  });

  if (chatBlock) initChat(order.id);
}

/* ── CHAT (client ↔ livreur) ── */
async function initChat(orderId) {
  const box = document.getElementById("chat-messages");
  async function renderMessages() {
    const messages = await DeliveryService.listMessages(orderId).catch(() => []);
    box.innerHTML = messages.length
      ? messages.map(m => `<div style="margin-bottom:6px;text-align:${m.sender === "livreur" ? "right" : "left"};">
          <span style="display:inline-block;background:${m.sender === "livreur" ? "#22c55e" : "#e5e7eb"};color:${m.sender === "livreur" ? "white" : "#1a1a2e"};padding:6px 10px;border-radius:10px;max-width:80%;">${m.text}</span>
        </div>`).join("")
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
      await DeliveryService.sendMessage(orderId, text);
      renderMessages();
    } catch (err) { showToast(err.message || "Message non envoyé.", "red"); }
  };
  document.getElementById("chat-send")?.addEventListener("click", send);
  document.getElementById("chat-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });

  NotificationService.connect((event, data) => {
    if (event === "order:message" && data?.id === orderId) renderMessages();
  });
}

/* ── PARTAGE DE POSITION EN TEMPS RÉEL (pendant une livraison active) ──
   Le livreur envoie sa position toutes les 15s ; le client et l'admin
   peuvent la suivre en direct (voir suivi.js et admin-livraisons). */
let locationWatchId = null;
let locationIntervalId = null;

function startLocationSharing(orderId) {
  const statusEl = document.getElementById("location-share-status");
  if (!navigator.geolocation) {
    if (statusEl) statusEl.textContent = "⚠️ Géolocalisation non disponible sur cet appareil.";
    return;
  }
  const sendPosition = () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await DeliveryService.updateLocation(orderId, pos.coords.latitude, pos.coords.longitude);
          if (statusEl) statusEl.textContent = "📍 Position partagée avec le client et l'admin";
        } catch { /* silencieux — pas grave si un envoi échoue, le suivant réessaiera */ }
      },
      () => { if (statusEl) statusEl.textContent = "⚠️ Partage de position refusé — activez la localisation pour que le client vous suive."; },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };
  sendPosition();
  locationIntervalId = setInterval(sendPosition, 15000);
}

function stopLocationSharing() {
  if (locationIntervalId) clearInterval(locationIntervalId);
  locationIntervalId = null;
}

/* ── HISTORIQUE ── */
async function initHistorique() {
  const deliveries = await DeliveryService.myDeliveries();
  const done = deliveries.filter(o => o.statut === "livree" || o.statut === "annulee").sort((a, b) => b.id - a.id);
  const wrap = document.getElementById("histo-list");

  wrap.innerHTML = done.length
    ? done.map(o => `
      <div class="histo-item" data-status="${o.statut === "livree" ? "complete" : "annule"}" style="background:white;border-radius:14px;padding:16px 18px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:800;color:#1a1a2e;">CMD-${o.id}</div>
            <div style="color:#6b7280;font-size:0.85rem;">${o.adresse}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800;color:${o.statut === "livree" ? "#22c55e" : "#ef4444"};">${o.statut === "livree" ? "✅ Livrée" : "❌ Annulée"}</div>
            <div style="color:#9ca3af;font-size:0.8rem;">${new Date(o.createdAt).toLocaleDateString("fr-FR")}</div>
          </div>
        </div>
      </div>`).join("")
    : `<p style="text-align:center;color:#9ca3af;font-weight:700;padding:40px 0;">Aucune livraison complétée pour l'instant.</p>`;

  const chips = document.querySelectorAll(".filter-chip");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.filter;
      wrap.querySelectorAll(".histo-item").forEach(item => {
        item.style.display = (filter === "toutes" || item.dataset.status === filter) ? "" : "none";
      });
    });
  });

  document.getElementById("btn-export-pdf-livreur")?.addEventListener("click", () => {
    exportHistoriqueLivreurToPdf(done);
  });
}

/** Export PDF via l'impression native du navigateur (aucune dépendance externe). */
function exportHistoriqueLivreurToPdf(deliveries) {
  const rows = deliveries.map(o => `
    <tr>
      <td>CMD-${o.id}</td>
      <td>${o.adresse || "—"}</td>
      <td>${new Date(o.createdAt).toLocaleDateString("fr-FR")}</td>
      <td>${o.total.toLocaleString()} FCFA</td>
      <td>${o.statut === "livree" ? "Livrée" : "Annulée"}</td>
    </tr>`).join("");
  const printWin = window.open("", "_blank");
  printWin.document.write(`
    <html><head><title>Mon historique de livraisons — Clo-Clo</title>
    <style>
      body { font-family: 'Nunito', Arial, sans-serif; padding: 24px; color: #1a1a2e; }
      h1 { font-size: 1.2rem; margin-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 16px; }
      th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
      th { background: #f4f4f5; }
    </style></head>
    <body>
      <h1>Mon historique de livraisons</h1>
      <p style="color:#6b7280;font-size:0.8rem;">Généré le ${new Date().toLocaleDateString("fr-FR")}</p>
      <table>
        <thead><tr><th>Commande</th><th>Adresse</th><th>Date</th><th>Total</th><th>Statut</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">Aucune livraison.</td></tr>'}</tbody>
      </table>
    </body></html>
  `);
  printWin.document.close();
  printWin.onload = () => { printWin.print(); };
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Délai dépassé (${label || "chargement"}) — vérifiez votre connexion.`)), ms)),
  ]);
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", async () => {
  let livreur;
  try {
    livreur = await withTimeout(requireLivreur(), 12000, "authentification");
  } catch (err) {
    console.error("Erreur d'authentification livreur :", err);
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;font-family:'Nunito',sans-serif;">
      <div>
        <p style="font-weight:800;color:#ef4444;margin-bottom:14px;">⚠️ Impossible de contacter le serveur.</p>
        <button onclick="window.location.reload()" style="background:#22c55e;color:white;border:none;border-radius:10px;padding:12px 24px;font-weight:800;cursor:pointer;">Réessayer</button>
      </div>
    </div>`;
    return;
  }
  if (!livreur) return;
  fillProfile(livreur);
  initLogout();
  initLivreurNotifications(livreur);
  injectSidebarToggle();
  PWA.subscribeToPush(() => ApiClient.getToken());

  try {
    if (page.includes("livreur-dashboard")) await withTimeout(initDashboard(livreur), 10000, "tableau de bord");
    else if (page.includes("livreur-livraison")) await withTimeout(initLivraison(), 10000, "livraison");
    else if (page.includes("livreur-historique")) await withTimeout(initHistorique(), 10000, "historique");
  } catch (err) {
    console.error("Erreur de chargement de la page livreur :", err);
    const target = document.getElementById("livreur-content") || document.getElementById("livraison-content") || document.getElementById("histo-list");
    if (target) {
      target.innerHTML = `<p style="text-align:center;color:#ef4444;font-weight:700;padding:24px;">⚠️ Erreur de chargement : ${err.message || "problème de connexion au serveur"}. <button onclick="window.location.reload()" style="margin-left:8px;background:#22c55e;color:white;border:none;border-radius:8px;padding:6px 14px;font-weight:800;cursor:pointer;">Réessayer</button></p>`;
    }
  }
});
