/* ============================================================
   CLO-CLO – Bar à Fruits & Délices | script.js
   ============================================================ */

/* ── Données des produits ── */
const products = [
  {
    id: 1,
    name: "Jus Tropical",
    price: 3500,
    image: "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=600&q=80"
  },
  {
    id: 2,
    name: "Smoothie Bowl",
    price: 4500,
    image: "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=80"
  },
  {
    id: 3,
    name: "Glace Artisanale",
    price: 2500,
    image: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600&q=80"
  },
  {
    id: 4,
    name: "Salade de Fruits",
    price: 3000,
    image: "https://images.unsplash.com/photo-1568158879083-c42860933ed7?w=600&q=80"
  }
];

/* ── État du panier ── */
let cart = [];
let points = 150;

/* ── Mise à jour du badge panier ── */
function updateCartBadge() {
  const badge = document.querySelector(".cart-badge");
  if (badge) {
    badge.textContent = cart.length;
    badge.style.display = cart.length === 0 ? "none" : "flex";
  }
}

/* ── Mise à jour des points ── */
function updatePoints() {
  const pointsBtn = document.querySelector(".btn-points");
  if (pointsBtn) {
    pointsBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      ${points} pts
    `;
  }
}

/* ── Ajouter au panier ── */
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  cart.push({ ...product, cartId: Date.now() });
  points += 10; // gagner 10 points par commande

  updateCartBadge();
  updatePoints();
  showToast(`✅ ${product.name} ajouté au panier !`);
}

/* ── Toast notification ── */
function showToast(message) {
  // Supprimer ancien toast s'il existe
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  Object.assign(toast.style, {
    position:     "fixed",
    bottom:       "30px",
    right:        "30px",
    background:   "#22c55e",
    color:        "white",
    padding:      "14px 24px",
    borderRadius: "12px",
    fontFamily:   "'Nunito', sans-serif",
    fontWeight:   "700",
    fontSize:     "0.95rem",
    boxShadow:    "0 6px 24px rgba(0,0,0,0.2)",
    zIndex:       "9999",
    animation:    "fadeUp 0.3s ease both"
  });

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/* ── Scroll reveal (Intersection Observer) ── */
function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity   = "1";
          entry.target.style.transform = "translateY(0)";
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  const targets = document.querySelectorAll(
    ".feature-card, .product-card, .step"
  );

  targets.forEach((el, i) => {
    Object.assign(el.style, {
      opacity:    "0",
      transform:  "translateY(30px)",
      transition: `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s`
    });
    observer.observe(el);
  });
}

/* ── Lier les boutons "Commander" ── */
function bindOrderButtons() {
  const orderBtns = document.querySelectorAll(".product-order");
  orderBtns.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      addToCart(products[index].id);
    });
  });
}

/* ── Boutons de navigation (placeholders) ── */
function bindNavButtons() {
  const menuBtn = document.querySelector(".btn-white-solid");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      document.querySelector(".products")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  const signupBtn = document.querySelector(".btn-outline-white");
  if (signupBtn) {
    signupBtn.addEventListener("click", () => {
      document.querySelector(".cta-section")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  const ctaBtn = document.querySelector(".btn-cta");
  if (ctaBtn) {
    ctaBtn.addEventListener("click", () => {
      showToast("🎉 Redirection vers l'inscription...");
       window.location.href = "inscription.html";
    });
  }

  const menuFullBtn = document.querySelector(".btn-green-solid");
  if (menuFullBtn) {
    menuFullBtn.addEventListener("click", () => {
      showToast("📋 Chargement du menu complet...");
      window.location.href = "menu.html";
    });
  }
}
const profileBtn = document.querySelector(".btn-profile");
if (profileBtn){
    profileBtn.addEventListener("click", () => {
        window.location.href = "profil.html";
    });
}

/* ── Initialisation ── */
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  updatePoints();
  initScrollReveal();
  bindOrderButtons();
  bindNavButtons();
});
/* ============================================================
   CLO-CLO | script.js — Page Accueil
   ============================================================ */
document.addEventListener("DOMContentLoaded",()=>{
  document.querySelector(".btn-white-solid")?.addEventListener("click",()=>window.location.href="menu.html");
  document.querySelector(".btn-outline-white")?.addEventListener("click",()=>window.location.href="inscription.html");
  document.querySelector(".btn-cta")?.addEventListener("click",()=>window.location.href="inscription.html");
  document.querySelector(".btn-green-solid")?.addEventListener("click",()=>window.location.href="menu.html");
  // data-id sur boutons commander
  document.querySelectorAll(".product-order").forEach((btn,i)=>{ if(!btn.dataset.id) btn.dataset.id=i+1; });
  // Loader
  const loader=document.getElementById("page-loader");
  if(loader){ window.addEventListener("load",()=>{ setTimeout(()=>{loader.style.opacity="0";loader.style.transition="opacity .35s";setTimeout(()=>loader.remove(),380);},250); }); }
});