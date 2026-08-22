/* ============================================================
   CLO-CLO | app.js — Fonctions communes à toutes les pages client
   Module ES : importe le store APP (branché sur l'API) et
   initialise l'UI commune (navbar, mini-panier, toasts, etc.)
   ============================================================ */
import { APP } from "./app-data.js";
import { NotificationService } from "./services/notificationService.js";
import { I18n } from "./i18n.js";

/* ─── TOAST ─── */
window.showToast = function (msg, type = "success") {
  document.querySelector(".toast-g")?.remove();
  const colors = { success: "#22c55e", error: "#ef4444", warning: "#f97316", info: "#3b82f6" };
  const t = document.createElement("div");
  t.className = "toast-g";
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed", bottom: "28px", right: "28px",
    background: colors[type] || "#22c55e",
    color: "white", padding: "13px 22px", borderRadius: "14px",
    fontFamily: "'Nunito',sans-serif", fontWeight: "700", fontSize: "0.93rem",
    boxShadow: "0 8px 28px rgba(0,0,0,0.18)", zIndex: "99999",
    opacity: "0", transform: "translateY(10px)",
    transition: "opacity 0.28s, transform 0.28s",
    maxWidth: "340px", lineHeight: "1.4",
  });
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = "1"; t.style.transform = "translateY(0)"; });
  setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateY(10px)"; setTimeout(() => t.remove(), 300); }, 2800);
};

/* ─── MISE À JOUR NAVBAR ─── */
window.updateNavbar = function () {
  const badge = document.querySelector(".cart-badge");
  if (badge) {
    const n = APP.getCartCount();
    badge.textContent = n;
    badge.style.display = n === 0 ? "none" : "flex";
  }
  const ptSpan = document.querySelector("#points-label");
  const pts = APP.user ? APP.user.points : 0;
  if (ptSpan) ptSpan.textContent = `${pts} pts`;
  else {
    const ptBtn = document.querySelector(".btn-points");
    if (ptBtn) {
      const s = ptBtn.querySelector("span");
      if (s) s.textContent = `${pts} pts`;
    }
  }
  // Bouton profil : redirige vers connexion si pas connecté
  const profileBtn = document.querySelector(".btn-profile");
  if (profileBtn) profileBtn.dataset.authRequired = APP.isLoggedIn() ? "0" : "1";
};

/* ─── MINI-PANIER ─── */
function buildCartItems() {
  if (APP.cart.length === 0)
    return `<div style="text-align:center;padding:48px 0;color:#9ca3af;font-size:0.92rem;font-weight:600;">🛒 Votre panier est vide</div>`;

  return APP.cart.map(i => `
    <div class="ci" style="display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid #f3f4f6;">
      <img src="${i.img || ''}" onerror="this.src='https://via.placeholder.com/48/22c55e/fff?text=🍹'"
        style="width:48px;height:48px;border-radius:10px;object-fit:cover;flex-shrink:0;"/>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:0.9rem;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${i.name}</div>
        <div style="font-size:0.8rem;color:#6b7280;margin-top:3px;">${i.price.toLocaleString()} FCFA / unité</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
          <button onclick="qtyCart(${i.id},-1)" style="width:24px;height:24px;border-radius:6px;border:1.5px solid #e5e7eb;background:white;font-weight:800;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center;">−</button>
          <span style="font-weight:800;font-size:0.9rem;min-width:20px;text-align:center;">${i.qty}</span>
          <button onclick="qtyCart(${i.id},+1)" style="width:24px;height:24px;border-radius:6px;border:1.5px solid #e5e7eb;background:white;font-weight:800;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center;">+</button>
          <span style="margin-left:6px;font-weight:700;font-size:0.88rem;color:#22c55e;">${(i.price * i.qty).toLocaleString()} FCFA</span>
        </div>
      </div>
      <button onclick="delCart(${i.id})" style="background:none;border:none;color:#ef4444;font-size:1rem;cursor:pointer;padding:4px;flex-shrink:0;">✕</button>
    </div>`).join("") + `
    <div style="margin-top:16px;padding:16px;background:#f9fafb;border-radius:14px;">
      <div style="display:flex;justify-content:space-between;font-weight:800;font-size:1rem;color:#1a1a2e;margin-bottom:6px;">
        <span>Total</span><span style="color:#22c55e;">${APP.getCartTotal().toLocaleString()} FCFA</span>
      </div>
      <div style="font-size:0.78rem;color:#9ca3af;font-weight:600;margin-bottom:14px;">
        ⭐ Vous gagnerez ~${Math.floor(APP.getCartTotal() / 500) * 5} points
      </div>
      <button onclick="goCheckout()" style="width:100%;background:#22c55e;color:white;border:none;border-radius:12px;padding:13px;font-family:'Nunito',sans-serif;font-size:0.95rem;font-weight:800;cursor:pointer;margin-bottom:8px;" onmouseover="this.style.background='#16a34a'" onmouseout="this.style.background='#22c55e'">
        Commander maintenant →
      </button>
      <button onclick="window.location.href='menu.html'" style="width:100%;background:white;color:#22c55e;border:2px solid #22c55e;border-radius:12px;padding:11px;font-family:'Nunito',sans-serif;font-size:0.88rem;font-weight:700;cursor:pointer;">
        + Ajouter des articles
      </button>
    </div>`;
}

function refreshMiniCart() {
  const wrap = document.getElementById("mc-items");
  const title = document.getElementById("mc-title");
  if (wrap) wrap.innerHTML = buildCartItems();
  if (title) title.textContent = `🛒 Panier (${APP.getCartCount()})`;
  window.updateNavbar();
}

window.qtyCart = function (id, delta) { APP.updateQty(id, delta); refreshMiniCart(); };
window.delCart = function (id) { APP.removeFromCart(id); refreshMiniCart(); showToast("Article retiré", "warning"); };

window.goCheckout = function () {
  if (APP.cart.length === 0) { showToast("Votre panier est vide !", "warning"); return; }
  if (!APP.isLoggedIn()) { showToast("Connectez-vous pour commander.", "warning"); setTimeout(() => window.location.href = "connexion.html", 900); return; }
  closeMiniCart();
  window.location.href = "checkout.html";
};

function closeMiniCart() {
  document.getElementById("mc-panel")?.remove();
  document.getElementById("mc-overlay")?.remove();
}

window.openMiniCart = function () {
  if (document.getElementById("mc-panel")) { closeMiniCart(); return; }

  if (!document.getElementById("mc-anim-style")) {
    const s = document.createElement("style"); s.id = "mc-anim-style";
    s.textContent = `@keyframes slideInR{from{transform:translateX(100%)}to{transform:translateX(0)}}`;
    document.head.appendChild(s);
  }

  const overlay = document.createElement("div");
  overlay.id = "mc-overlay";
  Object.assign(overlay.style, { position: "fixed", inset: "0", background: "rgba(0,0,0,0.38)", zIndex: "9990", cursor: "pointer" });
  overlay.onclick = closeMiniCart;

  const panel = document.createElement("div");
  panel.id = "mc-panel";
  Object.assign(panel.style, {
    position: "fixed", top: "0", right: "0", width: "380px", height: "100vh",
    background: "white", zIndex: "9991", overflowY: "auto",
    boxShadow: "-6px 0 28px rgba(0,0,0,0.14)", fontFamily: "'Nunito',sans-serif",
    animation: "slideInR 0.28s ease",
  });
  panel.innerHTML = `
    <div style="padding:22px 22px 100px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <h2 id="mc-title" style="font-size:1.1rem;font-weight:900;color:#1a1a2e;">🛒 Panier (${APP.getCartCount()})</h2>
        <button onclick="closeMiniCart()" style="background:#f3f4f6;border:none;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:1rem;">✕</button>
      </div>
      <div id="mc-items">${buildCartItems()}</div>
    </div>`;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);
};
window.closeMiniCart = closeMiniCart;

/* ─── BOUTONS AJOUTER (délégation, fonctionne aussi sur des cartes générées dynamiquement) ─── */
function bindAddButtons() {
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-id].btn-add, [data-id].product-order");
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    if (!id) return;
    APP.addToCart(id);
    window.updateNavbar();
    const orig = btn.innerHTML;
    btn.innerHTML = "✓ Ajouté !";
    btn.disabled = true;
    showToast("✅ Ajouté au panier !", "success");
    setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1200);
  });
}

/* ─── LIENS NAVBAR ─── */
function bindNavLinks() {
  document.querySelector(".btn-profile")?.addEventListener("click", () => {
    window.location.href = APP.isLoggedIn() ? "profil.html" : "connexion.html";
  });
  document.querySelector(".cart-btn")?.addEventListener("click", () => openMiniCart());
}

/* ─── TRANSITIONS ─── */
function initTransitions() {
  if (!document.getElementById("pf-style")) {
    const s = document.createElement("style"); s.id = "pf-style";
    s.textContent = `body{animation:pgFade .3s ease both}@keyframes pgFade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}`;
    document.head.appendChild(s);
  }
  document.querySelectorAll("a[href]").forEach(a => {
    const h = a.getAttribute("href");
    if (!h || h.startsWith("#") || h.startsWith("http") || h.startsWith("mailto") || h.startsWith("tel")) return;
    a.addEventListener("click", function (e) {
      e.preventDefault();
      document.body.style.opacity = "0"; document.body.style.transition = "opacity .22s";
      setTimeout(() => window.location.href = h, 230);
    });
  });
}

/* ─── SCROLL REVEAL ─── */
function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; obs.unobserve(e.target); } });
  }, { threshold: 0.07 });
  document.querySelectorAll(".product-card,.feature-card,.step,.reward-card,.recent-card,.stat-card,.histo-item,.livreur-card,.client-card,.livraison-block").forEach((el, i) => {
    Object.assign(el.style, { opacity: "0", transform: "translateY(20px)", transition: `opacity .44s ease ${i * .065}s,transform .44s ease ${i * .065}s` });
    obs.observe(el);
  });
}

/* ─── LOADER ─── */
function initLoader() {
  const loader = document.getElementById("page-loader");
  if (!loader) return;
  window.addEventListener("load", () => {
    setTimeout(() => { loader.style.opacity = "0"; loader.style.transition = "opacity .35s"; setTimeout(() => loader.remove(), 380); }, 250);
  });
}

/* ─── NOTIFICATIONS TEMPS RÉEL ─── */
const STATUT_LABEL_CLIENT = {
  en_preparation: "en préparation",
  en_livraison: "en route",
  livree: "livrée 🎉",
  annulee: "annulée",
};

function initNotifBell() {
  const nav = document.querySelector(".nav-actions");
  if (!nav || document.querySelector(".notif-bell")) return;
  const bell = document.createElement("button");
  bell.className = "notif-bell";
  bell.title = "Notifications";
  bell.innerHTML = `🔔<span class="notif-badge" style="display:none;position:absolute;top:-4px;right:-4px;background:#ef4444;color:white;border-radius:10px;min-width:16px;height:16px;font-size:0.65rem;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 3px;"></span>`;
  Object.assign(bell.style, {
    position: "relative", background: "none", border: "none",
    fontSize: "1.15rem", cursor: "pointer", padding: "4px 8px",
  });
  bell.addEventListener("click", () => NotificationService.clearUnread());
  nav.insertBefore(bell, nav.firstChild);
}

function initClientNotifications() {
  if (!APP.isLoggedIn()) return;
  initNotifBell();
  NotificationService.connect((event, order) => {
    if (!order || order.userId !== APP.user?.id) return;
    if (event === "order:cancelled") {
      showToast(`❌ Commande CMD-${order.id} annulée.`, "warning");
    } else {
      const label = STATUT_LABEL_CLIENT[order.statut] || order.statut;
      showToast(`📦 Commande CMD-${order.id} : ${label}`, "info");
    }
  });
}

/* ─── HAMBURGER MOBILE ─── */
function initHamburger() {
  const nav = document.querySelector("nav"); if (!nav) return;
  if (document.querySelector(".hamburger")) return;
  const btn = document.createElement("button"); btn.className = "hamburger";
  btn.innerHTML = "☰";
  Object.assign(btn.style, { display: "none", background: "none", border: "none", color: "white", fontSize: "1.5rem", cursor: "pointer", padding: "4px 8px" });
  if (!document.getElementById("hbg-style")) {
    const s = document.createElement("style"); s.id = "hbg-style";
    s.textContent = `@media(max-width:768px){.hamburger{display:block!important;}.nav-links{display:none!important;}.nav-links.open{display:flex!important;flex-direction:column;position:fixed;top:70px;left:0;right:0;background:#22c55e;padding:14px;gap:2px;z-index:200;box-shadow:0 4px 16px rgba(0,0,0,.15)}.nav-links.open li a{padding:12px 16px;border-radius:10px;font-size:1rem;}}`;
    document.head.appendChild(s);
  }
  nav.insertBefore(btn, nav.querySelector(".nav-actions"));
  btn.addEventListener("click", () => nav.querySelector(".nav-links")?.classList.toggle("open"));
}

/* ─── IMAGE FALLBACK ─── */
function initImgFallback() {
  document.querySelectorAll("img:not([onerror])").forEach(img => {
    img.onerror = function () { this.src = "https://via.placeholder.com/300x200/22c55e/ffffff?text=Clo-Clo"; };
  });
}

/* ─── INIT GLOBAL ───
   Charge les vraies données (produits, user, rewards) depuis
   l'API AVANT d'initialiser l'UI, puis notifie la page via un
   évènement "cloclo:ready" pour que les scripts spécifiques à
   chaque page (menu.js, profil.js, ...) puissent réagir. */
document.addEventListener("DOMContentLoaded", async () => {
  initLoader();
  await APP.init();
  window.updateNavbar();
  bindNavLinks();
  bindAddButtons();
  initTransitions();
  initHamburger();
  initImgFallback();
  initClientNotifications();
  I18n.injectToggle(document.querySelector(".nav-actions"));
  document.dispatchEvent(new CustomEvent("cloclo:ready", { detail: { APP } }));
  initScrollReveal(); // après le rendu dynamique des pages spécifiques
});
