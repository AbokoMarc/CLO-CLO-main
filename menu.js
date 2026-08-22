/* ============================================================
   CLO-CLO – Bar à Fruits & Délices | menu.js
   ============================================================ */

/* ── Données des produits ── */
const products = [
  { id: 1, name: "Jus d'Orange Pressé",       price: 3000, category: "jus"      },
  { id: 2, name: "Smoothie Tropical",          price: 4500, category: "smoothies"},
  { id: 3, name: "Glace Vanille",              price: 2500, category: "glaces"   },
  { id: 4, name: "Salade de Fruits Exotiques", price: 3500, category: "salades"  },
  { id: 5, name: "Jus de Pastèque",            price: 2800, category: "jus"      },
  { id: 6, name: "Smoothie Berry",             price: 4200, category: "smoothies"},
  { id: 7, name: "Glace Chocolat",             price: 2800, category: "glaces"   },
  { id: 8, name: "Salade Tropicale",           price: 3200, category: "salades"  },
];

/* ── État ── */
let cart   = [];
let points = 150;
let activeFilter = "tous";

/* ── Sélecteurs DOM ── */
const cartBadge    = document.getElementById("cart-badge");
const pointsLabel  = document.getElementById("points-label");
const filterBtns   = document.querySelectorAll(".filter-btn");
const productCards = document.querySelectorAll(".product-card");
const noResults    = document.getElementById("no-results");
const addBtns      = document.querySelectorAll(".btn-add");

/* ─────────────────────────────────────
   PANIER
───────────────────────────────────── */
function updateCartBadge() {
  if (!cartBadge) return;
  cartBadge.textContent = cart.length;
  cartBadge.style.display = cart.length === 0 ? "none" : "flex";
}

/* ─────────────────────────────────────
   POINTS
───────────────────────────────────── */
function updatePoints() {
  if (pointsLabel) {
    pointsLabel.textContent = `${points} pts`;
  }
}

/* ─────────────────────────────────────
   AJOUTER AU PANIER
───────────────────────────────────── */
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  cart.push({ ...product, cartId: Date.now() });
  points += 10;

  updateCartBadge();
  updatePoints();
  showToast(`✅ ${product.name} ajouté au panier !`);
}

/* ─────────────────────────────────────
   TOAST NOTIFICATION
───────────────────────────────────── */
function showToast(message) {
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
    opacity:      "1",
    transition:   "opacity 0.3s",
  });

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/* ─────────────────────────────────────
   FILTRAGE PAR CATÉGORIE
───────────────────────────────────── */
function applyFilter(filter) {
  activeFilter = filter;
  let visibleCount = 0;

  productCards.forEach(card => {
    const category = card.dataset.category;
    const isVisible = filter === "tous" || category === filter;

    if (isVisible) {
      card.classList.remove("hidden");
      visibleCount++;
    } else {
      card.classList.add("hidden");
    }
  });

  // Afficher message si aucun résultat
  if (noResults) {
    noResults.style.display = visibleCount === 0 ? "block" : "none";
  }
}

/* ─────────────────────────────────────
   SCROLL REVEAL
───────────────────────────────────── */
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
    { threshold: 0.1 }
  );

  productCards.forEach((card, i) => {
    Object.assign(card.style, {
      opacity:    "0",
      transform:  "translateY(28px)",
      transition: `opacity 0.45s ease ${i * 0.07}s, transform 0.45s ease ${i * 0.07}s`,
    });
    observer.observe(card);
  });
}

/* ─────────────────────────────────────
   ANIMATION BOUTON AJOUTER
───────────────────────────────────── */
function animateAddBtn(btn) {
  const original = btn.innerHTML;
  btn.innerHTML = `✓ Ajouté !`;
  btn.style.background = "#16a34a";
  btn.disabled = true;

  setTimeout(() => {
    btn.innerHTML = original;
    btn.style.background = "";
    btn.disabled = false;
  }, 1200);
}

/* ─────────────────────────────────────
   INITIALISATION
───────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {

  // Panier & points
  updateCartBadge();
  updatePoints();

  // Scroll reveal
  initScrollReveal();

  // Filtres
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Mettre à jour l'état actif visuellement
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Appliquer le filtre
      applyFilter(btn.dataset.filter);
    });
  });

  // Boutons Ajouter
  addBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      addToCart(id);
      animateAddBtn(btn);
    });
  });

});
const profileBtn = document.querySelector(".btn-profile");
if (profileBtn){
    profileBtn.addEventListener("click", () => {
        window.location.href = "profil.html";
    });
}
/* ============================================================
   CLO-CLO | menu.js — Page Menu
   ============================================================ */
document.addEventListener("DOMContentLoaded",()=>{
  const filterBtns=document.querySelectorAll(".filter-btn");
  const cards=document.querySelectorAll(".product-card");
  const noRes=document.getElementById("no-results");

  function applyFilter(f){
    let n=0;
    cards.forEach(c=>{ const show=f==="tous"||c.dataset.category===f; c.classList.toggle("hidden",!show); if(show)n++; });
    if(noRes)noRes.style.display=n===0?"block":"none";
  }

  filterBtns.forEach(btn=>{
    btn.addEventListener("click",()=>{
      filterBtns.forEach(b=>b.classList.remove("active")); btn.classList.add("active");
      applyFilter(btn.dataset.filter);
    });
  });

  document.getElementById("menu-search")?.addEventListener("input",function(){
    const q=this.value.toLowerCase();
    let n=0;
    cards.forEach(c=>{ const show=c.textContent.toLowerCase().includes(q); c.classList.toggle("hidden",!show); if(show)n++; });
    if(noRes)noRes.style.display=n===0?"block":"none";
  });

  const loader=document.getElementById("page-loader");
  if(loader){window.addEventListener("load",()=>{setTimeout(()=>{loader.style.opacity="0";loader.style.transition="opacity .35s";setTimeout(()=>loader.remove(),380);},250);});}
});