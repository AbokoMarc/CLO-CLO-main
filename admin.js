/* ============================================================
   CLO-CLO ADMIN | admin.js (partagé toutes pages admin)
   Toutes les données (stats, clients, livreurs, commandes)
   viennent du backend via AdminService/OrderService.
   Protégé : redirige vers connexion-directeur.html si non admin.
   ============================================================ */
import { AuthService } from "./services/authService.js";
import { AdminService } from "./services/adminService.js";
import { ProductService } from "./services/productService.js";

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
}

/* ── CLIENTS ── */
function clientCardHtml(c) {
  const initials = c.nom.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
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
      <div class="client-body">
        <div class="client-info"><svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${c.email}</div>
        <div class="client-info"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/></svg>${c.tel}</div>
        <div class="client-info"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${c.adresse}</div>
      </div>
    </div>`;
}

async function initClients() {
  const clients = await AdminService.listClients();
  const grid = document.getElementById("clients-grid");
  grid.innerHTML = clients.length
    ? clients.map(clientCardHtml).join("")
    : `<p style="grid-column:1/-1;text-align:center;color:#9ca3af;font-weight:700;">Aucun client pour l'instant.</p>`;

  document.getElementById("client-search")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    grid.querySelectorAll(".client-card").forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
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

  render();
}

/* ── LIVREURS ── */
function livreurCardHtml(l) {
  const statutClass = l.statut === "disponible" ? "badge-disponible" : l.statut === "en_livraison" ? "badge-en-livraison" : "badge-hors-ligne";
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
        </div>
      </div>
    </div>`;
}

async function initLivreurs() {
  const livreurs = await AdminService.listLivreurs();
  const grid = document.getElementById("livreurs-grid");
  grid.innerHTML = livreurs.length
    ? livreurs.map(livreurCardHtml).join("")
    : `<p style="grid-column:1/-1;text-align:center;color:#9ca3af;font-weight:700;">Aucun livreur pour l'instant.</p>`;

  document.querySelector(".btn-green")?.addEventListener("click", async () => {
    const nom = prompt("Nom du livreur :");
    if (!nom) return;
    const tel = prompt("Téléphone :", "+237 6");
    if (!tel) return;
    const vehicule = prompt("Véhicule (Moto / Voiture) :", "Moto");
    try {
      const created = await AdminService.createLivreur({ nom, tel, vehicule });
      alert(`✅ Livreur créé !\n\nMatricule : ${created.matricule}\nMot de passe temporaire : ${created.tempPassword}\n\nCommuniquez ces identifiants au livreur — ce mot de passe ne sera plus jamais affiché.`);
      initLivreurs();
    } catch (err) {
      showToast(err.message || "Impossible d'ajouter le livreur.", "red");
    }
  });
}

/* ── LIVRAISONS EN COURS ── */
function livraisonBlockHtml(o, livreurs) {
  const livreur = livreurs.find(l => l.id === o.livreurId);
  const items = o.items.map(i => `${i.qty}× ${i.name}`).join(", ");
  return `
    <div class="livraison-block anim" style="background:white;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 2px 14px rgba(0,0,0,0.06);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div style="font-size:0.78rem;color:#9ca3af;font-weight:700;">Commande</div>
          <div style="font-weight:900;font-size:1.05rem;color:#1a1a2e;">CMD-${o.id}</div>
        </div>
        <span class="badge badge-en-livraison">${o.statut.replace("_", " ")}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px;">
        <div>
          <div style="font-size:0.78rem;color:#3b82f6;font-weight:800;margin-bottom:4px;">CLIENT</div>
          <div style="font-weight:700;color:#1a1a2e;">${o.adresse || "—"}</div>
          <div style="color:#6b7280;font-size:0.85rem;">${items}</div>
        </div>
        <div>
          <div style="font-size:0.78rem;color:#22c55e;font-weight:800;margin-bottom:4px;">LIVREUR</div>
          <div style="font-weight:700;color:#1a1a2e;">${livreur ? livreur.nom : "Non assigné"}</div>
          <div style="color:#6b7280;font-size:0.85rem;">Total : ${o.total.toLocaleString()} FCFA</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;">
        ${!o.livreurId ? `<select class="assign-select" data-order="${o.id}" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid #e5e7eb;font-family:'Nunito',sans-serif;font-weight:700;">
          <option value="">Assigner un livreur…</option>
          ${livreurs.map(l => `<option value="${l.id}">${l.nom}</option>`).join("")}
        </select>` : `<button class="btn-status" data-order="${o.id}" data-statut="livree" style="flex:1;background:#22c55e;color:white;border:none;border-radius:10px;padding:10px;font-weight:800;cursor:pointer;">Marquer livrée</button>`}
      </div>
    </div>`;
}

async function initLivraisons() {
  const [orders, livreurs] = await Promise.all([
    AdminService.listOrders(),
    AdminService.listLivreurs(),
  ]);
  const active = orders.filter(o => o.statut === "en_preparation" || o.statut === "en_livraison");
  const wrap = document.getElementById("livraisons-list");
  wrap.innerHTML = active.length
    ? active.map(o => livraisonBlockHtml(o, livreurs)).join("")
    : `<p style="text-align:center;color:#9ca3af;font-weight:700;padding:40px 0;">Aucune livraison en cours.</p>`;

  wrap.querySelectorAll(".assign-select").forEach(sel => {
    sel.addEventListener("change", async () => {
      if (!sel.value) return;
      try {
        await AdminService.assignOrder(sel.dataset.order, parseInt(sel.value));
        showToast("🚚 Livreur assigné !");
        initLivraisons();
      } catch (err) { showToast(err.message || "Erreur", "red"); }
    });
  });
  wrap.querySelectorAll(".btn-status").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await AdminService.updateOrderStatus(btn.dataset.order, btn.dataset.statut);
        showToast("✅ Statut mis à jour !");
        initLivraisons();
      } catch (err) { showToast(err.message || "Erreur", "red"); }
    });
  });
}

/* ── HISTORIQUE ── */
async function initHistorique() {
  const orders = await AdminService.listOrders();
  const done = orders.filter(o => o.statut === "livree" || o.statut === "annulee")
    .sort((a, b) => b.id - a.id);
  const body = document.getElementById("hist-body");

  body.innerHTML = done.length
    ? done.map(o => `
      <tr data-status="${o.statut === "livree" ? "livre" : "annule"}">
        <td>CMD-${o.id}</td><td>—</td><td>${o.adresse || "—"}</td><td>${o.livreurId || "—"}</td>
        <td>${new Date(o.createdAt).toLocaleDateString("fr-FR")}<br><small style="color:#9ca3af;">${new Date(o.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</small></td>
        <td>${o.items.reduce((s, i) => s + i.qty, 0)}</td>
        <td>${o.total.toLocaleString()} FCFA</td>
        <td>${o.etaMinutes || "-"} min</td>
        <td><span class="badge ${o.statut === "livree" ? "badge-livre" : "badge-annule"}">${o.statut === "livree" ? "✅ Livré" : "❌ Annulé"}</span></td>
      </tr>`).join("")
    : `<tr><td colspan="9" style="text-align:center;color:#9ca3af;font-weight:700;">Aucun historique pour l'instant.</td></tr>`;

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

  if (page.includes("admin-dashboard")) await initDashboard();
  else if (page.includes("admin-produits")) await initProduits();
  else if (page.includes("admin-clients")) await initClients();
  else if (page.includes("admin-livreurs")) await initLivreurs();
  else if (page.includes("admin-livraisons")) await initLivraisons();
  else if (page.includes("admin-historique")) await initHistorique();
});
