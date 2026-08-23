/* ============================================================
   CLO-CLO LIVREUR | livreur.js (partagé toutes pages livreur)
   Toutes les données viennent du backend via DeliveryService.
   Protégé : redirige vers connexion-livreur.html si non livreur.
   ============================================================ */
import { AuthService } from "./services/authService.js";
import { DeliveryService } from "./services/deliveryService.js";
import { NotificationService } from "./services/notificationService.js";
import { I18n } from "./i18n.js";

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

function initLivreurNotifications(livreur) {
  NotificationService.connect((event, order) => {
    if (!order) return;
    if (event === "order:new") {
      showToast(`🆕 Nouvelle demande de livraison — CMD-${order.id}`, "orange");
      if (page.includes("livreur-dashboard")) initDashboard(livreur);
    } else if (event === "order:cancelled" && order.livreurId === livreur.id) {
      showToast(`❌ Commande CMD-${order.id} annulée par le client.`, "red");
      if (page.includes("livreur-dashboard")) initDashboard(livreur);
      if (page.includes("livreur-livraison")) initLivraison();
    }
  });
}

/* ── DASHBOARD ── */
async function initDashboard(livreur) {
  const deliveries = await DeliveryService.myDeliveries();
  const enCours = deliveries.filter(o => o.statut === "en_livraison");
  const enAttente = deliveries.filter(o => o.statut === "en_preparation");

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
        await DeliveryService.updateStatus(btn.dataset.order, "en_livraison");
        showToast("✅ Demande acceptée !");
        setTimeout(() => window.location.href = "livreur-livraison.html", 900);
      } catch (err) { showToast(err.message || "Erreur", "red"); }
    });
  });
}

/* ── LIVRAISON EN COURS (détail) ── */
async function initLivraison() {
  const deliveries = await DeliveryService.myDeliveries();
  const order = deliveries.find(o => o.statut === "en_livraison");
  const wrap = document.getElementById("livraison-content");

  if (!order) {
    wrap.innerHTML = `<p style="text-align:center;color:#9ca3af;font-weight:700;padding:40px 0;">Aucune livraison active. <a href="livreur-dashboard.html" style="color:#22c55e;">Retour au tableau de bord →</a></p>`;
    return;
  }

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
        <button id="btn-livre" style="flex:1;background:#22c55e;color:white;border:none;border-radius:10px;padding:12px;font-weight:800;cursor:pointer;">✓ Marquer comme livrée</button>
      </div>
    </div>`;

  document.querySelector(".btn-gmaps")?.addEventListener("click", () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.adresse)}`, "_blank");
  });

  document.getElementById("btn-livre")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    e.target.textContent = "Envoi…";
    try {
      await DeliveryService.updateStatus(order.id, "livree");
      showToast("🎉 Livraison complétée !");
      setTimeout(() => window.location.href = "livreur-historique.html", 1200);
    } catch (err) {
      e.target.disabled = false;
      showToast(err.message || "Erreur", "red");
    }
  });
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
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", async () => {
  const livreur = await requireLivreur();
  if (!livreur) return;
  fillProfile(livreur);
  initLogout();
  initLivreurNotifications(livreur);
  injectSidebarToggle();

  if (page.includes("livreur-dashboard")) await initDashboard(livreur);
  else if (page.includes("livreur-livraison")) await initLivraison();
  else if (page.includes("livreur-historique")) await initHistorique();
});
