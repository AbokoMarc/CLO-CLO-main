/* ============================================================
   CLO-CLO ADMIN | admin.js (partagé toutes pages admin)
   Toutes les données (stats, clients, livreurs, commandes)
   viennent du backend via AdminService/OrderService.
   Protégé : redirige vers connexion-directeur.html si non admin.
   ============================================================ */
import { AuthService } from "./services/authService.js";
import { AdminService } from "./services/adminService.js";
import { ProductService } from "./services/productService.js";
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
    background: color === "red" ? "#ef4444" : "#22c55e",
    color: "white", padding: "14px 24px", borderRadius: "12px",
    fontFamily: "'Nunito', sans-serif", fontWeight: "700", fontSize: "0.95rem",
    boxShadow: "0 6px 24px rgba(0,0,0,0.2)", zIndex: "9999",
    opacity: "1", transition: "opacity 0.3s",
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 2500);
}
window.showToast = window.showToast || showToast;

async function requireAdmin() {
  const me = await AuthService.me();
  if (!me || me.role !== "admin") {
    window.location.href = "connexion-directeur.html";
    return null;
  }
  return me;
}

function fillProfile(admin) {
  document.querySelectorAll(".profile-name, .admin-name").forEach(el => el.textContent = admin.username);
  injectAdminToolbar();
}

/* ── BARRE D'OUTILS ADMIN : voir le site, changer mon mot de passe, notifications ── */
function injectAdminToolbar() {
  const host = document.querySelector(".page-header") || document.querySelector(".sidebar-brand");
  if (!host || document.querySelector(".admin-toolbar")) return;

  const bar = document.createElement("div");
  bar.className = "admin-toolbar";
  bar.innerHTML = `
    <button class="notif-bell" title="Notifications">
      🔔<span class="notif-badge" style="display:none;"></span>
    </button>
    <button class="btn-view-site" title="Voir le site (mode client)">🌐 Voir le site</button>
    <button class="btn-change-pwd" title="Changer mon mot de passe">🔑 Mon mot de passe</button>`;
  host.appendChild(bar);
  I18n.injectToggle(bar);
  PWA.injectInstallButton(bar);

  bar.querySelector(".notif-bell").addEventListener("click", () => NotificationService.clearUnread());
  bar.querySelector(".btn-view-site").addEventListener("click", () => window.location.href = "index.html");
  bar.querySelector(".btn-change-pwd").addEventListener("click", handleChangeOwnPassword);
}

/* ── SIDEBAR MOBILE : la sidebar n'a aucun bouton pour l'ouvrir sur petit écran, on en ajoute un ── */
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

async function handleChangeOwnPassword() {
  const currentPwd = prompt("Mot de passe actuel :");
  if (!currentPwd) return;
  const newPwd = prompt("Nouveau mot de passe (8 caractères minimum) :");
  if (!newPwd) return;
  const confirmPwd = prompt("Confirmez le nouveau mot de passe :");
  if (newPwd !== confirmPwd) { showToast("❌ Les deux mots de passe ne correspondent pas.", "red"); return; }
  try {
    await AuthService.changePassword(currentPwd, newPwd);
    showToast("✅ Mot de passe modifié !");
  } catch (err) {
    showToast(err.message || "Impossible de changer le mot de passe.", "red");
  }
}

/* ── NOTIFICATIONS TEMPS RÉEL ── */
function initAdminNotifications() {
  NotificationService.connect((event, order) => {
    if (!order) return;
    if (event === "order:new") {
      showToast(`🆕 Nouvelle commande CMD-${order.id} (${order.total.toLocaleString()} FCFA)`);
      if (page.includes("admin-dashboard")) initDashboard();
      if (page.includes("admin-livraisons")) initLivraisons();
    } else if (event === "order:cancelled") {
      showToast(`❌ Commande CMD-${order.id} annulée par le client.`, "red");
      if (page.includes("admin-livraisons")) initLivraisons();
      if (page.includes("admin-historique")) initHistorique();
    } else if (["order:accepted", "order:started", "order:confirmation"].includes(event)) {
      if (page.includes("admin-livraisons")) initLivraisons();
      if (page.includes("admin-historique")) initHistorique();
    } else if (event === "order:sos") {
      showSosAlert(order);
    }
  });
}

/** Alerte SOS — s'affiche par-dessus tout, très visible, ne disparaît pas toute seule. */
function showSosAlert(order) {
  const banner = document.createElement("div");
  banner.className = "sos-alert";
  banner.innerHTML = `
    <div>🆘 <strong>ALERTE URGENCE</strong> — ${order.sosBy === "client" ? "Client" : "Livreur"} sur CMD-${order.id}
    ${order.location?.lat ? `<a href="https://www.google.com/maps?q=${order.location.lat},${order.location.lng}" target="_blank" style="color:white;text-decoration:underline;margin-left:8px;">Voir la position →</a>` : ""}
    </div>
    <button aria-label="Fermer" style="background:none;border:none;color:white;font-size:1.2rem;font-weight:900;cursor:pointer;">✕</button>`;
  Object.assign(banner.style, {
    position: "fixed", top: "0", left: "0", right: "0", zIndex: "99999",
    background: "#dc2626", color: "white", display: "flex", alignItems: "center",
    justifyContent: "space-between", padding: "14px 18px", fontFamily: "'Nunito', sans-serif",
    fontWeight: "800", fontSize: "0.9rem", boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  });
  banner.querySelector("button").addEventListener("click", () => banner.remove());
  document.body.prepend(banner);
}

/* ── DASHBOARD : stats + graphiques réels ── */
async function initDashboard() {
  const stats = await AdminService.stats();

  document.getElementById("stat-revenus").textContent = stats.totalVentes.toLocaleString() + " FCFA";
  document.getElementById("stat-commandes").textContent = stats.totalCommandes;
  document.getElementById("stat-clients").textContent = stats.totalClients;
  document.getElementById("stat-livreurs").textContent = stats.livreursDisponibles + " / " + stats.totalLivreurs;
  document.getElementById("stat-cmd-badge").textContent = `${stats.commandesAujourdhui} aujourd'hui`;

  const ctxVentes = document.getElementById("chartVentes");
  if (ctxVentes && window.Chart) {
    new Chart(ctxVentes, {
      type: "bar",
      data: {
        labels: stats.ventesParJour.map(d => d.label),
        datasets: [{ label: "Ventes (FCFA)", data: stats.ventesParJour.map(d => d.total), backgroundColor: "#22c55e", borderRadius: 8, borderSkipped: false }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: "Nunito", weight: "700" } } },
          y: { grid: { color: "#f3f4f6", borderDash: [4, 4] }, ticks: { font: { family: "Nunito" } } },
        },
      },
    });
  }

  const ctxCmd = document.getElementById("chartCommandes");
  if (ctxCmd && window.Chart) {
    const orders = await AdminService.listOrders();
    const byHour = Array(10).fill(0); // 8h → 17h
    orders.forEach(o => {
      const h = new Date(o.createdAt).getHours();
      if (h >= 8 && h <= 17) byHour[h - 8]++;
    });
    new Chart(ctxCmd, {
      type: "line",
      data: {
        labels: ["8h","9h","10h","11h","12h","13h","14h","15h","16h","17h"],
        datasets: [{ label: "Commandes", data: byHour, borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.08)", borderWidth: 2.5, pointBackgroundColor: "#3b82f6", pointRadius: 4, tension: 0.4, fill: true }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: "Nunito", weight: "700" } } },
          y: { grid: { color: "#f3f4f6", borderDash: [4, 4] }, ticks: { font: { family: "Nunito" } } },
        },
      },
    });
  }

  await renderTopProducts();
  await renderRecentOrders();
}

const STATUT_BADGE = {
  en_preparation: { cls: "badge-preparation", label: "Préparation" },
  assignee:       { cls: "badge-preparation", label: "Assignée" },
  acceptee:       { cls: "badge-en-route",    label: "Acceptée" },
  en_livraison:   { cls: "badge-en-route",    label: "En Route" },
  livree:         { cls: "badge-livre",       label: "Livré" },
  annulee:        { cls: "badge-annule",      label: "Annulé" },
};

/** Classement des produits les plus vendus, calculé à partir des VRAIES commandes en base. */
async function renderTopProducts() {
  const el = document.getElementById("top-products-list");
  if (!el) return;
  const orders = await AdminService.listOrders();
  const tally = new Map(); // productId -> { name, qty, revenue }
  for (const o of orders) {
    if (o.statut === "annulee") continue;
    for (const item of o.items) {
      const cur = tally.get(item.productId) || { name: item.name, qty: 0, revenue: 0 };
      cur.qty += item.qty;
      cur.revenue += item.qty * item.price;
      tally.set(item.productId, cur);
    }
  }
  const top5 = [...tally.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  el.innerHTML = top5.length
    ? top5.map((p, i) => `
      <div class="product-rank">
        <div class="rank-num">${i + 1}</div>
        <div class="rank-info"><div class="rank-name">${p.name}</div><div class="rank-cmds">${p.qty} commande${p.qty > 1 ? "s" : ""}</div></div>
        <div class="rank-rev">${p.revenue.toLocaleString()} FC</div>
      </div>`).join("")
    : `<p style="text-align:center;color:#9ca3af;font-weight:700;padding:20px 0;">Aucune commande pour l'instant.</p>`;
}

/** Les 5 dernières commandes, avec le vrai nom du client, calculées à partir de l'API. */
async function renderRecentOrders() {
  const el = document.getElementById("recent-orders-list");
  if (!el) return;
  const [orders, clients] = await Promise.all([AdminService.listOrders(), AdminService.listClients()]);
  const clientById = new Map(clients.map(c => [c.id, c.nom]));
  const recent = [...orders].sort((a, b) => b.id - a.id).slice(0, 5);
  el.innerHTML = recent.length
    ? recent.map(o => {
        const badge = STATUT_BADGE[o.statut] || { cls: "badge-preparation", label: o.statut };
        const nbArticles = o.items.reduce((s, i) => s + i.qty, 0);
        return `
      <div class="cmd-item">
        <div><div class="cmd-id">CMD-${o.id}</div><div class="cmd-meta">${clientById.get(o.userId) || "Client"} • ${nbArticles} article${nbArticles > 1 ? "s" : ""}</div></div>
        <div class="cmd-right"><div class="cmd-price">${o.total.toLocaleString()} FC</div><span class="badge ${badge.cls}">${badge.label}</span></div>
      </div>`;
      }).join("")
    : `<p style="text-align:center;color:#9ca3af;font-weight:700;padding:20px 0;">Aucune commande pour l'instant.</p>`;
}

/* ── CLIENTS ── */
const CLIENT_UNLOCK_KEY = "cloclo_admin_clients_unlocked";

function clientCardHtml(c, unlocked) {
  const contactBlock = unlocked
    ? `<div class="client-info"><svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${c.email}</div>
       <div class="client-info"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/></svg>${c.tel}</div>
       <div class="client-info"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${c.adresse}</div>`
    : `<div class="client-info" style="color:#9ca3af;">🔒 Coordonnées masquées — déverrouillez pour les voir</div>`;
  return `
    <div class="client-card anim">
      <div class="client-header">
        <div>
          <div class="client-name">${c.nom}</div>
          <div class="client-id">CLT-${String(c.id).padStart(3, "0")}</div>
          <div class="client-stats">
            <div class="cstat"><div class="cstat-label">Points</div><div class="cstat-val"><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>${c.points}</div></div>
            <div class="cstat"><div class="cstat-label">Commandes</div><div class="cstat-val">${c.commandes}</div></div>
          </div>
        </div>
        <div class="niveau-badge niveau-${(c.niveau || "bronze").toLowerCase()}"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${c.niveau}</div>
      </div>
      <div class="client-body">${contactBlock}</div>
      ${unlocked ? `<div class="client-body" style="padding-top:0;">
        <button class="btn-reset-pwd" data-id="${c.id}" data-nom="${c.nom}" style="width:100%;background:white;color:#ef4444;border:1.5px solid #fecaca;border-radius:10px;padding:9px;font-family:'Nunito',sans-serif;font-weight:700;font-size:0.82rem;cursor:pointer;">🔑 Réinitialiser le mot de passe</button>
      </div>` : ""}
    </div>`;
}

/** Confidentialité : la liste des clients (nom, points, commandes) est visible
    directement — seules les coordonnées (email/tel/adresse) et la réinitialisation
    de mot de passe nécessitent une re-saisie du mot de passe admin, valable pour
    la session en cours (jusqu'à déconnexion). */
function isClientsUnlocked() {
  return sessionStorage.getItem(CLIENT_UNLOCK_KEY) === "1";
}

function unlockBarHtml(unlocked) {
  if (unlocked) {
    return `<div style="grid-column:1/-1;background:#dcfce7;color:#166534;border-radius:10px;padding:10px 16px;margin-bottom:16px;font-weight:700;font-size:0.85rem;">🔓 Coordonnées déverrouillées pour cette session</div>`;
  }
  return `<div style="grid-column:1/-1;background:white;border:1.5px solid #e5e7eb;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
    <span style="font-weight:700;font-size:0.85rem;color:#6b7280;">🔒 Coordonnées clients masquées par confidentialité</span>
    <button id="btn-unlock-clients" style="background:#22c55e;color:white;border:none;border-radius:8px;padding:9px 18px;font-family:'Nunito',sans-serif;font-weight:800;font-size:0.82rem;cursor:pointer;">Déverrouiller</button>
  </div>`;
}

async function initClients() {
  const grid = document.getElementById("clients-grid");

  async function renderClients() {
    const clients = await AdminService.listClients();
    const unlocked = isClientsUnlocked();

    grid.innerHTML = unlockBarHtml(unlocked) + `<div class="clients-list-grid" style="display:contents;">` +
      (clients.length
        ? clients.map(c => clientCardHtml(c, unlocked)).join("")
        : `<p style="grid-column:1/-1;text-align:center;color:#9ca3af;font-weight:700;">Aucun client pour l'instant.</p>`) + `</div>`;

    document.getElementById("btn-unlock-clients")?.addEventListener("click", async () => {
      const mdp = prompt("Confirmez votre mot de passe administrateur :");
      if (!mdp) return;
      try {
        await AdminService.verifyPassword(mdp);
        sessionStorage.setItem(CLIENT_UNLOCK_KEY, "1");
        showToast("✅ Coordonnées déverrouillées.");
        renderClients();
      } catch (err) {
        showToast(err.status === 401 ? "Mot de passe incorrect." : (err.message || "Erreur, réessayez."), "red");
      }
    });

    grid.querySelectorAll(".btn-reset-pwd").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm(`Réinitialiser le mot de passe de "${btn.dataset.nom}" ?\n\nVérifiez d'abord l'identité du client avant de continuer.`)) return;
        try {
          const { tempPassword } = await AdminService.resetClientPassword(btn.dataset.id);
          alert(`✅ Mot de passe réinitialisé !\n\nNouveau mot de passe temporaire : ${tempPassword}\n\nCommuniquez-le au client — il ne sera plus jamais affiché.`);
        } catch (err) {
          showToast(err.message || "Impossible de réinitialiser ce mot de passe.", "red");
        }
      });
    });

    document.getElementById("client-search")?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      grid.querySelectorAll(".client-card").forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });
  }

  await renderClients();
}

/* ── PRODUITS (ajouter / modifier / retirer) ── */
function productCardHtml(p) {
  return `
    <div class="pcard" data-id="${p.id}">
      <img src="${p.img}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x160/22c55e/ffffff?text=Clo-Clo'"/>
      <div class="pcard-body">
        <div class="pcard-name">${p.name}${p.popular ? " ⭐" : ""}</div>
        <div class="pcard-cat">${p.category}</div>
        <div class="pcard-price">${p.price.toLocaleString()} FCFA</div>
        <div class="pcard-actions">
          <button class="btn-edit" data-id="${p.id}">✏️ Modifier</button>
          <button class="btn-delete" data-id="${p.id}">🗑️ Retirer</button>
        </div>
      </div>
    </div>`;
}

async function initProduits() {
  let products = await ProductService.list();
  const grid = document.getElementById("products-grid-admin");
  const modal = document.getElementById("product-modal");
  const errorEl = document.getElementById("pf-error");

  function render() {
    grid.innerHTML = products.length
      ? products.map(productCardHtml).join("")
      : `<p style="grid-column:1/-1;text-align:center;color:#9ca3af;font-weight:700;">Aucun produit. Ajoutez-en un pour commencer.</p>`;
    grid.querySelectorAll(".btn-edit").forEach(b => b.addEventListener("click", () => openModal(products.find(p => p.id === parseInt(b.dataset.id)))));
    grid.querySelectorAll(".btn-delete").forEach(b => b.addEventListener("click", () => handleDelete(parseInt(b.dataset.id))));
  }

  function openModal(product) {
    errorEl.textContent = "";
    document.getElementById("modal-title").textContent = product ? "Modifier le produit" : "Ajouter un produit";
    document.getElementById("pf-id").value = product?.id || "";
    document.getElementById("pf-name").value = product?.name || "";
    document.getElementById("pf-category").value = product?.category || "jus";
    document.getElementById("pf-price").value = product?.price || "";
    document.getElementById("pf-desc").value = product?.desc || "";
    document.getElementById("pf-img").value = product?.img || "";
    document.getElementById("pf-popular").checked = !!product?.popular;
    modal.classList.add("open");
  }
  function closeModal() { modal.classList.remove("open"); }

  document.getElementById("btn-new-product")?.addEventListener("click", () => openModal(null));
  document.getElementById("btn-cancel-product")?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  document.getElementById("btn-save-product")?.addEventListener("click", async () => {
    const id = document.getElementById("pf-id").value;
    const name = document.getElementById("pf-name").value.trim();
    const category = document.getElementById("pf-category").value;
    const price = parseInt(document.getElementById("pf-price").value);
    const desc = document.getElementById("pf-desc").value.trim();
    const img = document.getElementById("pf-img").value.trim() || "https://via.placeholder.com/300x160/22c55e/ffffff?text=Clo-Clo";
    const popular = document.getElementById("pf-popular").checked;

    if (!name || !price || price <= 0) { errorEl.textContent = "Nom et prix (> 0) sont requis."; return; }

    const payload = { name, category, price, desc, img, popular };
    const btn = document.getElementById("btn-save-product");
    btn.disabled = true;
    try {
      if (id) {
        const updated = await ProductService.update(id, payload);
        products = products.map(p => p.id === updated.id ? updated : p);
        showToast("✅ Produit modifié !");
      } else {
        const created = await ProductService.create(payload);
        products.push(created);
        showToast("✅ Produit ajouté !");
      }
      render();
      closeModal();
    } catch (err) {
      errorEl.textContent = err.message || "Une erreur est survenue.";
    } finally {
      btn.disabled = false;
    }
  });

  async function handleDelete(id) {
    const product = products.find(p => p.id === id);
    if (!confirm(`Retirer "${product?.name}" du menu ?`)) return;
    try {
      await ProductService.remove(id);
      products = products.filter(p => p.id !== id);
      render();
      showToast("🗑️ Produit retiré.");
    } catch (err) {
      showToast(err.message || "Impossible de retirer ce produit.", "red");
    }
  }

  await initPromoCodes();
}

/* ── CODES PROMO ── */
async function initPromoCodes() {
  const list = document.getElementById("promo-list");
  if (!list) return;

  async function render() {
    const codes = await AdminService.listPromoCodes();
    list.innerHTML = codes.length
      ? codes.map(c => `
        <div style="background:white;border-radius:14px;padding:16px;box-shadow:0 2px 14px rgba(0,0,0,0.06);${c.active ? "" : "opacity:0.5;"}">
          <div style="font-weight:900;font-size:1rem;color:#1a1a2e;">${c.code}</div>
          <div style="color:#6b7280;font-weight:600;font-size:0.85rem;margin-bottom:10px;">${c.type === "percent" ? `-${c.value}%` : `-${c.value.toLocaleString()} FCFA`}</div>
          <div style="display:flex;gap:8px;">
            <button class="btn-toggle-promo" data-id="${c.id}" data-active="${c.active}" style="flex:1;background:white;border:1.5px solid #e5e7eb;border-radius:8px;padding:7px;font-weight:700;font-size:0.78rem;cursor:pointer;">${c.active ? "Désactiver" : "Activer"}</button>
            <button class="btn-delete-promo" data-id="${c.id}" style="flex:1;background:white;color:#ef4444;border:1.5px solid #fecaca;border-radius:8px;padding:7px;font-weight:700;font-size:0.78rem;cursor:pointer;">Supprimer</button>
          </div>
        </div>`).join("")
      : `<p style="grid-column:1/-1;text-align:center;color:#9ca3af;font-weight:700;">Aucun code promo pour l'instant.</p>`;

    list.querySelectorAll(".btn-toggle-promo").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          await AdminService.togglePromoCode(btn.dataset.id, btn.dataset.active !== "true");
          render();
        } catch (err) { showToast(err.message || "Erreur", "red"); }
      });
    });
    list.querySelectorAll(".btn-delete-promo").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Supprimer ce code promo ?")) return;
        try { await AdminService.deletePromoCode(btn.dataset.id); render(); }
        catch (err) { showToast(err.message || "Erreur", "red"); }
      });
    });
  }
  await render();

  document.getElementById("btn-new-promo")?.addEventListener("click", async () => {
    const code = prompt("Code promo (ex: BIENVENUE10) :");
    if (!code) return;
    const type = prompt('Type — tapez "percent" (%) ou "fixed" (montant fixe) :', "percent");
    if (!["percent", "fixed"].includes(type)) { showToast('Tapez "percent" ou "fixed".', "red"); return; }
    const value = parseInt(prompt(type === "percent" ? "Pourcentage de réduction (ex: 10) :" : "Montant de réduction en FCFA (ex: 500) :"));
    if (!Number.isFinite(value) || value <= 0) { showToast("Valeur invalide.", "red"); return; }
    try {
      await AdminService.createPromoCode(code, type, value);
      showToast("✅ Code promo créé !");
      render();
    } catch (err) { showToast(err.message || "Erreur", "red"); }
  });
}
  render();
}

/* ── LIVREURS ── */
function livreurCardHtml(l) {
  const statutClass = l.statut === "disponible" ? "badge-disponible" : l.statut === "en_livraison" ? "badge-en-livraison" : "badge-hors-ligne";
  const paieLabel = l.paieMontant > 0
    ? `${l.paieMontant.toLocaleString()} FCFA / ${l.paieType === "mensuel" ? "mois" : "jour"}`
    : "Non définie";
  return `
    <div class="livreur-card anim">
      <div class="livreur-header">
        <div class="livreur-avatar"><svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>
        <div style="flex:1;">
          <div class="livreur-name">${l.nom}</div>
          <div class="livreur-id">${l.matricule}</div>
        </div>
        <span class="badge ${statutClass}">● ${l.statut.replace("_", " ")}</span>
      </div>
      <div class="livreur-body">
        <div class="livreur-info"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2"/></svg>${l.tel}</div>
        <div class="livreur-meta">
          <div><div class="lm-label">Véhicule</div><div class="lm-val">${l.vehicule}</div></div>
          <div><div class="lm-label">Paie</div><div class="lm-val">${paieLabel}</div></div>
        </div>
        <button class="btn-set-paie" data-id="${l.id}" data-nom="${l.nom}" style="width:100%;margin-top:12px;background:white;color:#22c55e;border:1.5px solid #22c55e;border-radius:10px;padding:9px;font-family:'Nunito',sans-serif;font-weight:700;font-size:0.82rem;cursor:pointer;">💰 Définir la paie</button>
        <button class="btn-toggle-service" data-id="${l.id}" data-statut="${l.statut}" style="width:100%;margin-top:8px;background:white;color:${l.statut === "hors_service" ? "#22c55e" : "#f97316"};border:1.5px solid ${l.statut === "hors_service" ? "#22c55e" : "#fed7aa"};border-radius:10px;padding:9px;font-family:'Nunito',sans-serif;font-weight:700;font-size:0.82rem;cursor:pointer;">${l.statut === "hors_service" ? "✅ Remettre en service" : "⛔ Mettre hors service"}</button>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn-reset-livreur-pwd" data-id="${l.id}" data-nom="${l.nom}" style="flex:1;background:white;color:#3b82f6;border:1.5px solid #bfdbfe;border-radius:10px;padding:9px;font-family:'Nunito',sans-serif;font-weight:700;font-size:0.78rem;cursor:pointer;">🔑 Mot de passe</button>
          <button class="btn-delete-livreur" data-id="${l.id}" data-nom="${l.nom}" style="flex:1;background:white;color:#ef4444;border:1.5px solid #fecaca;border-radius:10px;padding:9px;font-family:'Nunito',sans-serif;font-weight:700;font-size:0.78rem;cursor:pointer;">🗑️ Supprimer</button>
        </div>
      </div>
    </div>`;
}

async function initLivreurs() {
  const grid = document.getElementById("livreurs-grid");

  async function renderLivreurs() {
    const livreurs = await AdminService.listLivreurs();
    grid.innerHTML = livreurs.length
      ? livreurs.map(livreurCardHtml).join("")
      : `<p style="grid-column:1/-1;text-align:center;color:#9ca3af;font-weight:700;">Aucun livreur pour l'instant.</p>`;

    grid.querySelectorAll(".btn-set-paie").forEach(btn => {
      btn.addEventListener("click", async () => {
        const type = prompt(`Type de paie pour ${btn.dataset.nom} — tapez "journalier" ou "mensuel" :`, "journalier");
        if (!type || !["journalier", "mensuel"].includes(type.trim())) { showToast("⚠️ Saisissez \"journalier\" ou \"mensuel\".", "red"); return; }
        const montantStr = prompt(`Montant de la paie ${type} (FCFA) :`);
        const montant = parseInt(montantStr);
        if (!montantStr || isNaN(montant) || montant < 0) { showToast("⚠️ Montant invalide.", "red"); return; }
        try {
          await AdminService.setLivreurPaie(btn.dataset.id, type.trim(), montant);
          showToast("✅ Paie mise à jour !");
          renderLivreurs();
        } catch (err) {
          showToast(err.message || "Impossible de mettre à jour la paie.", "red");
        }
      });
    });

    grid.querySelectorAll(".btn-toggle-service").forEach(btn => {
      btn.addEventListener("click", async () => {
        const nouveauStatut = btn.dataset.statut === "hors_service" ? "disponible" : "hors_service";
        try {
          await AdminService.updateLivreurStatut(btn.dataset.id, nouveauStatut);
          showToast(nouveauStatut === "hors_service" ? "⛔ Livreur mis hors service." : "✅ Livreur remis en service.");
          renderLivreurs();
          renderLivreurStats();
        } catch (err) {
          showToast(err.message || "Impossible de changer le statut.", "red");
        }
      });
    });

    grid.querySelectorAll(".btn-reset-livreur-pwd").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm(`Réinitialiser le mot de passe de "${btn.dataset.nom}" ?`)) return;
        try {
          const { matricule, tempPassword } = await AdminService.resetLivreurPassword(btn.dataset.id);
          alert(`✅ Mot de passe réinitialisé !\n\nMatricule : ${matricule}\nNouveau mot de passe temporaire : ${tempPassword}\n\nCommuniquez ces identifiants au livreur — ce mot de passe ne sera plus jamais affiché.`);
        } catch (err) {
          showToast(err.message || "Impossible de réinitialiser ce mot de passe.", "red");
        }
      });
    });

    grid.querySelectorAll(".btn-delete-livreur").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm(`Supprimer définitivement le livreur "${btn.dataset.nom}" ?\n\nCette action est irréversible.`)) return;
        try {
          await AdminService.deleteLivreur(btn.dataset.id);
          showToast("🗑️ Livreur supprimé.");
          renderLivreurs();
          renderLivreurStats();
        } catch (err) {
          showToast(err.message || "Impossible de supprimer ce livreur.", "red");
        }
      });
    });
  }

  await renderLivreurs();
  await renderLivreurStats();

  document.querySelector(".btn-green")?.addEventListener("click", async () => {
    const nom = prompt("Nom du livreur :");
    if (!nom) return;
    const tel = prompt("Téléphone :", "+237 6");
    if (!tel) return;
    const vehicule = prompt("Véhicule (Moto / Voiture) :", "Moto");
    try {
      const created = await AdminService.createLivreur({ nom, tel, vehicule });
      alert(`✅ Livreur créé !\n\nMatricule : ${created.matricule}\nMot de passe temporaire : ${created.tempPassword}\n\nCommuniquez ces identifiants au livreur — ce mot de passe ne sera plus jamais affiché.`);
      renderLivreurs();
      renderLivreurStats();
    } catch (err) {
      showToast(err.message || "Impossible d'ajouter le livreur.", "red");
    }
  });
}

/** Statistiques calculées à partir des VRAIES données (livreurs + commandes du jour). */
async function renderLivreurStats() {
  const [livreurs, orders] = await Promise.all([AdminService.listLivreurs(), AdminService.listOrders()]);
  const today = new Date().toDateString();
  document.getElementById("stat-liv-total").textContent = livreurs.length;
  document.getElementById("stat-liv-dispo").textContent = livreurs.filter(l => l.statut === "disponible").length;
  document.getElementById("stat-liv-encours").textContent = livreurs.filter(l => l.statut === "en_livraison").length;
  document.getElementById("stat-liv-horsservice").textContent = livreurs.filter(l => l.statut === "hors_service").length;
  document.getElementById("stat-liv-aujourdhui").textContent = orders.filter(o => o.livreurId && new Date(o.createdAt).toDateString() === today).length;
}

/* ── LIVRAISONS EN COURS ── */
const STATUT_LABEL_ADMIN = {
  en_preparation: "en préparation", assignee: "en attente d'acceptation",
  acceptee: "acceptée (chat ouvert)", en_livraison: "en livraison", livree: "livrée",
};

function livraisonBlockHtml(o, livreurs, clients) {
  const livreur = livreurs.find(l => l.id === o.livreurId);
  const client = clients?.find(c => c.id === o.userId);
  const items = o.items.map(i => `${i.qty}× ${i.name}`).join(", ");
  const locationBlock = o.statut === "en_livraison"
    ? `<div class="location-block" data-order="${o.id}" style="margin-bottom:14px;font-size:0.82rem;color:#6b7280;font-weight:700;">📡 Chargement des positions…</div>`
    : "";

  let actionHtml;
  if (!o.livreurId) {
    actionHtml = `<select class="assign-select" data-order="${o.id}" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid #e5e7eb;font-family:'Nunito',sans-serif;font-weight:700;">
      <option value="">Assigner un livreur…</option>
      ${livreurs.filter(l => l.actif !== false).map(l => `<option value="${l.id}">${l.nom}</option>`).join("")}
    </select>`;
  } else if (o.statut === "en_livraison" && o.confirmedLivreurAt && o.confirmedClientAt && !o.confirmedAdminAt) {
    actionHtml = `<button class="btn-confirm-admin" data-order="${o.id}" style="flex:1;background:#22c55e;color:white;border:none;border-radius:10px;padding:10px;font-weight:800;cursor:pointer;">✅ Confirmer la livraison</button>`;
  } else if (o.statut === "en_livraison") {
    const wait = [];
    if (!o.confirmedLivreurAt) wait.push("livreur");
    if (!o.confirmedClientAt) wait.push("client");
    actionHtml = `<div style="flex:1;text-align:center;color:#9ca3af;font-weight:700;font-size:0.85rem;">En attente de confirmation : ${wait.join(" et ")}</div>`;
  } else {
    actionHtml = `<div style="flex:1;text-align:center;color:#9ca3af;font-weight:700;font-size:0.85rem;">En attente côté livreur…</div>`;
  }

  return `
    <div class="livraison-block anim" style="background:white;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 2px 14px rgba(0,0,0,0.06);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div style="font-size:0.78rem;color:#9ca3af;font-weight:700;">Commande</div>
          <div style="font-weight:900;font-size:1.05rem;color:#1a1a2e;">CMD-${o.id}</div>
        </div>
        <span class="badge badge-en-livraison">${STATUT_LABEL_ADMIN[o.statut] || o.statut}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px;">
        <div>
          <div style="font-size:0.78rem;color:#3b82f6;font-weight:800;margin-bottom:4px;">CLIENT</div>
          <div style="font-weight:700;color:#1a1a2e;">${client ? client.nom : "—"}</div>
          <div style="color:#6b7280;font-size:0.85rem;">${o.adresse || "—"}</div>
          <div style="color:#6b7280;font-size:0.85rem;">${items}</div>
        </div>
        <div>
          <div style="font-size:0.78rem;color:#22c55e;font-weight:800;margin-bottom:4px;">LIVREUR</div>
          <div style="font-weight:700;color:#1a1a2e;">${livreur ? livreur.nom : "Non assigné"}</div>
          <div style="color:#6b7280;font-size:0.85rem;">Total : ${o.total.toLocaleString()} FCFA${o.fraisLivraison ? ` (dont ${o.fraisLivraison.toLocaleString()} FCFA livraison)` : ""}</div>
        </div>
      </div>
      ${locationBlock}
      <div style="display:flex;gap:10px;">${actionHtml}</div>
    </div>`;
}

async function initLivraisons() {
  const [orders, livreurs, clients] = await Promise.all([
    AdminService.listOrders(),
    AdminService.listLivreurs(),
    AdminService.listClients(),
  ]);
  const active = orders.filter(o => ["en_preparation", "assignee", "acceptee", "en_livraison"].includes(o.statut));
  const wrap = document.getElementById("livraisons-list");
  wrap.innerHTML = active.length
    ? active.map(o => livraisonBlockHtml(o, livreurs, clients)).join("")
    : `<p style="text-align:center;color:#9ca3af;font-weight:700;padding:40px 0;">Aucune livraison en cours.</p>`;

  wrap.querySelectorAll(".assign-select").forEach(sel => {
    sel.addEventListener("change", async () => {
      if (!sel.value) return;
      try {
        await AdminService.assignOrder(sel.dataset.order, parseInt(sel.value));
        showToast("🚚 Livreur assigné ! En attente de son acceptation.");
        initLivraisons();
      } catch (err) { showToast(err.message || "Erreur", "red"); }
    });
  });
  wrap.querySelectorAll(".btn-confirm-admin").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await AdminService.confirmDelivery(btn.dataset.order);
        showToast("✅ Livraison confirmée et clôturée !");
        initLivraisons();
      } catch (err) { showToast(err.message || "Erreur", "red"); }
    });
  });

  // Positions en direct (client + livreur) pour chaque livraison active en cours.
  wrap.querySelectorAll(".location-block").forEach(async (el) => {
    try {
      const loc = await AdminService.getLocation(el.dataset.order);
      const parts = [];
      if (loc.livreur) parts.push(`🛵 Livreur : <a href="https://www.google.com/maps?q=${loc.livreur.lat},${loc.livreur.lng}" target="_blank" style="color:#22c55e;font-weight:800;">voir →</a>`);
      if (loc.client) parts.push(`📍 Client : <a href="https://www.google.com/maps?q=${loc.client.lat},${loc.client.lng}" target="_blank" style="color:#3b82f6;font-weight:800;">voir →</a>`);
      el.innerHTML = parts.length ? parts.join(" &nbsp;·&nbsp; ") : "📡 Aucune position partagée pour l'instant.";
    } catch { el.innerHTML = ""; }
  });
}

/* ── HISTORIQUE ── */
async function initHistorique() {
  const [orders, clients, livreurs] = await Promise.all([
    AdminService.listOrders(), AdminService.listClients(), AdminService.listLivreurs(),
  ]);
  const clientById = new Map(clients.map(c => [c.id, c.nom]));
  const livreurById = new Map(livreurs.map(l => [l.id, l.nom]));
  const done = orders.filter(o => o.statut === "livree" || o.statut === "annulee")
    .sort((a, b) => b.id - a.id);
  const body = document.getElementById("hist-body");

  // Stats réelles, calculées sur les VRAIES commandes en base.
  const livrees = done.filter(o => o.statut === "livree");
  const annulees = done.filter(o => o.statut === "annulee");
  document.getElementById("stat-hist-total").textContent = done.length;
  document.getElementById("stat-hist-livrees").textContent = livrees.length;
  document.getElementById("stat-hist-annulees").textContent = annulees.length;
  document.getElementById("stat-hist-revenus").textContent = livrees.reduce((s, o) => s + o.total, 0).toLocaleString() + " FC";

  function renderRows(list) {
    body.innerHTML = list.length
      ? list.map(o => `
        <tr data-status="${o.statut === "livree" ? "livre" : "annule"}" data-date="${new Date(o.createdAt).toISOString().slice(0, 10)}">
          <td>LIV-${o.id}</td><td>CMD-${o.id}</td>
          <td>${clientById.get(o.userId) || "—"}</td>
          <td>${o.livreurId ? (livreurById.get(o.livreurId) || `#${o.livreurId}`) : "—"}</td>
          <td>${new Date(o.createdAt).toLocaleDateString("fr-FR")}<br><small style="color:#9ca3af;">${new Date(o.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</small></td>
          <td>${o.items.reduce((s, i) => s + i.qty, 0)}</td>
          <td>${o.total.toLocaleString()} FCFA</td>
          <td>${o.etaMinutes || "-"} min</td>
          <td><span class="badge ${o.statut === "livree" ? "badge-livre" : "badge-annule"}">${o.statut === "livree" ? "✅ Livré" : "❌ Annulé"}</span></td>
        </tr>`).join("")
      : `<tr><td colspan="9" style="text-align:center;color:#9ca3af;font-weight:700;">Aucun historique pour l'instant.</td></tr>`;
  }
  renderRows(done);

  const chips = document.querySelectorAll(".filter-chip");
  const rows = () => document.querySelectorAll("#hist-body tr");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.filter;
      rows().forEach(row => { row.style.display = (filter === "tous" || row.dataset.status === filter) ? "" : "none"; });
    });
  });
  document.getElementById("search-input")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    rows().forEach(row => { row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none"; });
  });

  document.getElementById("filter-date-input")?.addEventListener("change", (e) => {
    const label = document.getElementById("filter-date-label");
    if (!e.target.value) { label.textContent = "Filtrer par Date"; renderRows(done); return; }
    label.textContent = new Date(e.target.value).toLocaleDateString("fr-FR");
    renderRows(done.filter(o => new Date(o.createdAt).toISOString().slice(0, 10) === e.target.value));
  });

  document.getElementById("btn-export-pdf")?.addEventListener("click", () => {
    exportTableToPdf("hist-table", "Historique des livraisons — Clo-Clo");
  });
}

/** Export PDF via l'impression native du navigateur (aucune dépendance externe,
    aucun serveur nécessaire) : on masque tout sauf le tableau ciblé, puis on
    déclenche l'impression — l'utilisateur choisit "Enregistrer en PDF" comme
    destination dans la boîte de dialogue d'impression. */
function exportTableToPdf(tableId, title) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const printWin = window.open("", "_blank");
  printWin.document.write(`
    <html><head><title>${title}</title>
    <style>
      body { font-family: 'Nunito', Arial, sans-serif; padding: 24px; color: #1a1a2e; }
      h1 { font-size: 1.2rem; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
      th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
      th { background: #f4f4f5; }
    </style></head>
    <body>
      <h1>${title}</h1>
      <p style="color:#6b7280;font-size:0.8rem;margin-bottom:16px;">Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
      ${table.outerHTML}
    </body></html>
  `);
  printWin.document.close();
  printWin.onload = () => { printWin.print(); };
}

/* ── DÉCONNEXION ── */
function initLogout() {
  document.querySelector(".js-admin-logout")?.addEventListener("click", () => {
    AuthService.logout();
    window.location.href = "connexion-directeur.html";
  });
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", async () => {
  const admin = await requireAdmin();
  if (!admin) return;
  fillProfile(admin);
  initLogout();
  initAdminNotifications();
  injectSidebarToggle();
  PWA.subscribeToPush(() => ApiClient.getToken());

  if (page.includes("admin-dashboard")) await initDashboard();
  else if (page.includes("admin-produits")) await initProduits();
  else if (page.includes("admin-clients")) await initClients();
  else if (page.includes("admin-livreurs")) await initLivreurs();
  else if (page.includes("admin-livraisons")) await initLivraisons();
  else if (page.includes("admin-historique")) await initHistorique();
});
