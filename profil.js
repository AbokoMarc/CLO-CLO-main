/* ============================================================
   CLO-CLO | profil.js
   Toutes les données viennent de APP (branché sur l'API).
   Aucune donnée utilisateur en dur.
   ============================================================ */
import { APP } from "./app-data.js";
import { AuthService } from "./services/authService.js";
import { ProductService } from "./services/productService.js";
import { esc } from "./traiteur-inbox.js";

const IC_TRUCK = `<svg class="ic" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0;" aria-hidden="true"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8Z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;

function sel(s, v) { const el = document.querySelector(s); if (el) el.textContent = v; }
function val(id, v) { const el = document.getElementById(id); if (el) el.value = v; }

function renderProfile() {
  const u = APP.user;
  sel(".banner-name", u.nom);
  sel(".banner-email", u.email);
  sel(".banner-cmds", u.commandes + " commandes");

  const bv = document.querySelector(".bp-value");
  if (bv) bv.innerHTML = `<svg viewBox="0 0 24 24" style="width:26px;height:26px;fill:#facc15;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>${u.points}`;

  sel(".stat-value.yellow", u.points);
  sel(".stat-value.blue", u.commandes);

  val("input-nom", u.nom);
  val("input-email", u.email);
  val("input-tel", u.tel);
  val("input-adresse", u.adresse);

  window.updateNavbar?.();

  const fill = document.querySelector(".niveau-bar-fill");
  if (fill) {
    fill.style.width = "0%";
    setTimeout(() => { fill.style.width = Math.min((u.points / 1000) * 100, 100) + "%"; }, 400);
  }

  renderNiveau(u.points);

  initReferral(u);
}

/* ── PARRAINAGE : lien personnel, copie, partage natif / WhatsApp, et vraies statistiques ── */
function initReferral(u) {
  const code = `CL${u.id}`;
  const link = `${window.location.origin}/inscription.html?ref=${code}`;
  const msg = `Rejoins Clo-Clo (jus, smoothies, glaces livrés à Yaoundé) avec mon lien de parrainage, on gagne chacun 100 points : ${link}`;
  val("parrain-link-input", link);
  sel("#parrain-code", code);
  const shareEl = document.getElementById("parrain-share");
  if (shareEl) shareEl.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); showToast("Lien copié."); }
    catch { const f = document.getElementById("parrain-link-input"); f?.select(); document.execCommand?.("copy"); showToast("Lien copié."); }
  };
  document.getElementById("parrain-copy")?.addEventListener("click", copy);
  document.getElementById("parrain-link-input")?.addEventListener("focus", (e) => e.target.select());
  const nativeBtn = document.getElementById("parrain-native");
  if (nativeBtn) {
    if (navigator.share) nativeBtn.addEventListener("click", () => navigator.share({ title: "Clo-Clo", text: msg, url: link }).catch(() => {}));
    else nativeBtn.style.display = "none";   // pas de partage natif (ordinateur) : Copier + WhatsApp suffisent
  }
  AuthService.myReferrals?.().then((r) => {
    sel("#ref-count", r.count);
    sel("#ref-points", r.pointsEarned);
  }).catch(() => { /* statistiques indisponibles : le lien reste utilisable */ });
}

// Paliers réels de fidélité — doivent rester alignés avec ceux affichés
// dans la carte .niveau-tiers de profil.html (Bronze/Argent/Or/Platine)
const TIERS = [
  { name: "Bronze", min: 0 },
  { name: "Argent", min: 200 },
  { name: "Or", min: 500 },
  { name: "Platine", min: 1000 },
];

function renderNiveau(points) {
  let current = TIERS[0];
  let next = TIERS[1];
  for (let i = 0; i < TIERS.length; i++) {
    if (points >= TIERS[i].min) {
      current = TIERS[i];
      next = TIERS[i + 1] || null;
    }
  }

  sel(".niveau-actuel", "Niveau Actuel : ");
  const strong = document.querySelector(".niveau-actuel strong") || document.createElement("strong");
  strong.textContent = current.name;
  const actuelEl = document.querySelector(".niveau-actuel");
  if (actuelEl && !actuelEl.contains(strong)) actuelEl.appendChild(strong);

  sel(".niveau-objectif", next
    ? `${points} / ${next.min} points pour ${next.name}`
    : `${points} points — niveau maximum atteint`);

  document.querySelectorAll(".niveau-tiers .tier").forEach((tierEl) => {
    const name = tierEl.querySelector(".tier-name")?.textContent.trim();
    tierEl.classList.remove("tier-done", "tier-active");
    const tierDef = TIERS.find((t) => t.name === name);
    if (!tierDef) return;
    if (tierDef.name === current.name) tierEl.classList.add("tier-active");
    else if (points >= tierDef.min) tierEl.classList.add("tier-done");
  });
}

function rewardCardHtml(r) {
  const locked = !r.available;
  return `
    <div class="reward-card ${locked ? "locked" : "available"}">
      <div class="reward-top">
        <div class="reward-info">
          <div class="reward-name">${r.name}</div>
          <div class="reward-desc">${r.desc}</div>
        </div>
        <svg class="reward-icon ${locked ? "locked-icon" : ""}" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg>
      </div>
      <div class="reward-bottom">
        <span class="reward-pts ${locked ? "locked-pts" : ""}">
          <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          ${r.cost} points
        </span>
        ${locked
          ? `<span class="bientot">Bientôt disponible</span>`
          : `<button class="btn-utiliser" data-id="${r.id}" data-cost="${r.cost}" data-reward="${r.name}">Utiliser</button>`}
      </div>
    </div>`;
}

function renderRewards() {
  const grid = document.getElementById("rewards-grid");
  if (!grid) return;
  grid.innerHTML = APP.rewards.map(rewardCardHtml).join("");

  grid.querySelectorAll(".btn-utiliser").forEach(btn => {
    btn.dataset.origText = btn.textContent;
    btn.addEventListener("click", async function () {
      const rewardId = parseInt(this.dataset.id);
      const cost = parseInt(this.dataset.cost);
      const name = this.dataset.reward;
      if (APP.user.points < cost) { showToast(`Points insuffisants (${APP.user.points} / ${cost})`, "red"); return; }
      this.disabled = true;
      try {
        await APP.useReward(rewardId);
        renderProfile();
        await loadHistory();
        this.textContent = "✓ Utilisé !";
        this.style.background = "#0A4220";
        showToast(`"${name}" appliqué !`, "green");
        setTimeout(() => { this.textContent = this.dataset.origText; this.style.background = ""; this.disabled = false; }, 2000);
      } catch (err) {
        this.disabled = false;
        showToast(err.message || "Impossible d'utiliser cette récompense.", "red");
      }
    });
  });
}

async function loadHistory() {
  const history = await APP.loadPointsHistory();
  const histoList = document.querySelector(".historique-list");
  if (histoList) {
    histoList.innerHTML = history.length
      ? history.slice(0, 8).map(h => `
        <div class="histo-item">
          <div class="histo-left"><div class="histo-name">${h.label}</div><div class="histo-date">${h.date}</div></div>
          <div class="histo-pts ${h.type === "gain" ? "gain" : "loss"}">${h.pts > 0 ? "+" : ""}${h.pts} pts</div>
        </div>`).join("")
      : `<div style="text-align:center;padding:24px;color:#9ca3af;font-weight:600;">Aucun mouvement de points pour l'instant</div>`;
  }
}

const STATUT_TXT = { en_attente_paiement: "En attente de paiement", en_preparation: "En préparation", assignee: "Livreur assigné", acceptee: "Acceptée", en_livraison: "En livraison", livree: "Livrée", annulee: "Annulée" };

/** Agrège toutes les commandes : un produit = une carte (quantité totale, dernière commande). */
function aggregateProducts(orders) {
  const map = new Map();
  for (const o of orders) {
    if (o.statut === "annulee") continue;
    for (const it of o.items) {
      const e = map.get(it.productId) || { productId: it.productId, name: it.name, price: it.price, qty: 0, orders: 0, last: o.createdAt };
      e.qty += it.qty; e.orders += 1;
      if (o.createdAt > e.last) { e.last = o.createdAt; e.price = it.price; }
      map.set(it.productId, e);
    }
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty);
}

async function loadOrders() {
  const orders = await APP.loadMyOrders();
  const fmt = (n) => Number(n).toLocaleString(window.CLOCLO_LOCALE());
  const when = (iso) => new Date(iso).toLocaleDateString(window.CLOCLO_LOCALE(), { day: "numeric", month: "short", year: "numeric" });

  const prodWrap = document.getElementById("ordered-products-wrap");
  if (prodWrap) {
    const prods = aggregateProducts(orders);
    prodWrap.innerHTML = prods.length ? prods.map((p) => `
      <div class="ordered-card">
        <div class="ordered-name">${esc(p.name)}</div>
        <div class="ordered-meta">Commandé ${p.qty} fois · dernière fois le ${when(p.last)}</div>
        <div class="ordered-bottom"><b>${fmt(p.price)} FCFA</b>
          <button type="button" class="btn-add btn-round js-readd" data-id="${p.productId}" aria-label="Ajouter au panier">+</button></div>
      </div>`).join("")
      : `<p class="tm-none">Vous n'avez pas encore commandé. <a href="menu.html" style="color:var(--green);font-weight:800;">Découvrir le menu</a></p>`;
    prodWrap.querySelectorAll(".js-readd").forEach((btn) => btn.addEventListener("click", () => {
      const p = prods.find((x) => String(x.productId) === btn.dataset.id);
      if (!p) return;
      const added = APP.reorderItems([{ productId: p.productId, name: p.name, price: p.price, qty: 1 }]);
      showToast(added === 0 ? "Ces produits ne sont plus disponibles au menu." : "Ajouté au panier !", added === 0 ? "red" : undefined);
    }));
  }

  const wrap = document.getElementById("recent-orders-wrap");
  if (!wrap) return;
  const GROUPS = {
    all: () => true,
    open: (o) => ["en_attente_paiement", "en_preparation", "assignee", "acceptee", "en_livraison"].includes(o.statut),
    done: (o) => o.statut === "livree",
    cancelled: (o) => o.statut === "annulee",
  };
  const bar = document.getElementById("orders-filter");
  if (bar && !bar.dataset.bound) {
    bar.dataset.bound = "1";
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("[data-g]"); if (!b) return;
      bar.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      wrap.dataset.group = b.dataset.g; loadOrders();
    });
  }
  const group = wrap.dataset.group || "all";
  const shown = orders.filter(GROUPS[group]);
  wrap.innerHTML = shown.length
    ? shown.map((o) => {
        const names = o.items.map((i) => `${i.qty}× ${esc(i.name)}`);
        return `<div class="order-row">
          <div><div class="order-row-id">CMD-${o.id} <span class="order-row-st st-${esc(o.statut)}">${esc(STATUT_TXT[o.statut] || o.statut)}</span></div>
            <div class="order-row-items">${names.join(", ")}</div>
            <div class="order-row-date">${when(o.createdAt)}</div></div>
          <div class="order-row-right"><b>${fmt(o.total)} FCFA</b>
            ${o.statut !== "annulee" ? `<button type="button" class="ref-btn btn-reorder" data-id="${o.id}">Recommander</button>` : ""}
            ${["en_attente_paiement", "en_preparation", "assignee", "acceptee", "en_livraison"].includes(o.statut) ? `<a class="ref-btn" href="suivi.html?order=${o.id}">Suivre</a>` : ""}</div>
        </div>`;
      }).join("")
    : `<p class="tm-none">Aucune commande pour l'instant. <a href="menu.html" style="color:var(--green);font-weight:800;">Voir le menu</a></p>`;

  wrap.querySelectorAll(".btn-reorder").forEach((btn) => {
    btn.addEventListener("click", () => {
      const order = orders.find((o) => String(o.id) === btn.dataset.id);
      if (!order) return;
      const added = APP.reorderItems(order.items);
      if (added === 0) { showToast("Ces produits ne sont plus disponibles au menu.", "red"); return; }
      showToast("Articles ajoutés au panier !");
      setTimeout(() => { window.location.href = "checkout.html"; }, 700);
    });
  });
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add("active");
    });
  });
}

function initParamsForm() {
  document.getElementById("btn-save")?.addEventListener("click", async () => {
    const nom = document.getElementById("input-nom")?.value.trim();
    const email = document.getElementById("input-email")?.value.trim();
    const tel = document.getElementById("input-tel")?.value.trim();
    const adresse = document.getElementById("input-adresse")?.value.trim();
    if (!nom || !email) { showToast("Nom et email sont requis.", "red"); return; }
    try {
      APP.user = await AuthService.updateProfile({ nom, email, tel, adresse });
      renderProfile();
      showToast("Modifications enregistrées !");
    } catch (err) {
      showToast(err.message || "Impossible d'enregistrer.", "red");
    }
  });
}

function initLogout() {
  document.getElementById("btn-logout")?.addEventListener("click", () => {
    if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
      showToast("À bientôt !");
      setTimeout(() => APP.logout(), 900);
    }
  });
}

function addressCardHtml(a) {
  return `
    <div class="address-card" data-id="${a.id}" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;">
      <div>
        <div style="font-weight:800;">${a.label}</div>
        <div style="color:#6b7280;font-size:0.88rem;">${a.adresse}, ${a.quartier}</div>
      </div>
      <button class="btn-remove-address" data-id="${a.id}" style="background:none;border:none;color:#ef4444;font-weight:700;cursor:pointer;">Retirer</button>
    </div>`;
}

async function initAddresses() {
  const listEl = document.getElementById("addresses-list");
  const quartierSelect = document.getElementById("addr-quartier");
  if (!listEl || !quartierSelect) return;

  try {
    const zones = await ProductService.listZones();
    quartierSelect.innerHTML = zones.map(z => `<option value="${z.quartier}">${z.quartier} — ${z.ville}</option>`).join("");
  } catch { /* zones facultatives ici, le champ adresse suffit en secours */ }

  function render() {
    const addresses = APP.user?.favoriteAddresses || [];
    listEl.innerHTML = addresses.length
      ? addresses.map(addressCardHtml).join("")
      : `<p style="color:#9ca3af;font-weight:600;">Aucune adresse enregistrée pour l'instant.</p>`;
    listEl.querySelectorAll(".btn-remove-address").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          APP.user = await AuthService.removeFavoriteAddress(btn.dataset.id);
          render();
          showToast("Adresse retirée.");
        } catch (err) {
          showToast(err.message || "Impossible de retirer cette adresse.", "red");
        }
      });
    });
  }
  render();

  document.getElementById("btn-add-address")?.addEventListener("click", async () => {
    const label = document.getElementById("addr-label").value.trim();
    const quartier = quartierSelect.value;
    const adresse = document.getElementById("addr-adresse").value.trim();
    if (!adresse || !quartier) { showToast("Quartier et adresse précise sont requis.", "red"); return; }
    try {
      APP.user = await AuthService.addFavoriteAddress({ label, quartier, adresse });
      document.getElementById("addr-label").value = "";
      document.getElementById("addr-adresse").value = "";
      render();
      showToast("Adresse ajoutée !");
    } catch (err) {
      showToast(err.message || "Impossible d'ajouter cette adresse.", "red");
    }
  });
}

document.addEventListener("cloclo:ready", async () => {
  if (!APP.isLoggedIn()) {
    window.location.href = "connexion.html";
    return;
  }
  renderProfile();
  initTabs();
  renderRewards();
  initParamsForm();
  initLogout();
  await initAddresses();
  await Promise.all([loadHistory(), loadOrders()]);

  if (!sessionStorage.getItem("cloclo_welcomed")) {
    sessionStorage.setItem("cloclo_welcomed", "1");
    setTimeout(() => showToast(`Bienvenue, ${APP.user.nom.split(" ")[0]} ! Vous avez ${APP.user.points} pts`), 600);
  }
});
