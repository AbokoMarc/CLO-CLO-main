/* ============================================================
   CLO-CLO – Bar à Fruits & Délices | menu.js
   Produits chargés depuis l'API (APP.products) — plus aucune
   donnée en dur ici. Rendu + filtrage par catégorie.
   ============================================================ */
import { APP } from "./app-data.js";

/* Produit sans photo : visuel de remplacement (évite une requête vers « /null » et une icône cassée). */
const NO_IMG = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#EAF3EA"/><text x="60" y="76" font-size="52" text-anchor="middle">🍹</text></svg>');

let activeFilter = "tous";
let searchQuery = "";

function cardHtml(p) {
  return `
    <div class="product-card" data-category="${p.category}">
      <div class="product-img-wrap">
        <img src="${p.img || NO_IMG}" alt="${p.name}" loading="lazy"/>
        ${p.popular ? '<span class="badge-popular">Populaire</span>' : ""}
        <span class="product-price">${p.price.toLocaleString(window.CLOCLO_LOCALE())} FCFA</span>
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <p class="product-desc">${p.desc || ""}</p>
        <div class="product-bottom">
          <span class="product-price-inline">${p.price.toLocaleString(window.CLOCLO_LOCALE())} FCFA</span>
          <button class="btn-add btn-round" data-id="${p.id}" aria-label="Ajouter au panier">+</button>
        </div>
      </div>
    </div>`;
}

function renderGrid() {
  const grid = document.getElementById("products-grid");
  const noResults = document.getElementById("no-results");
  if (!grid) return;

  const visible = APP.products.filter(p => p.disponible !== false);
  const byCategory = activeFilter === "tous"
    ? visible
    : visible.filter(p => p.category === activeFilter);

  const q = searchQuery.trim().toLowerCase();
  const items = q ? byCategory.filter(p => `${p.name} ${p.desc || ""}`.toLowerCase().includes(q)) : byCategory;
  grid.innerHTML = items.map(cardHtml).join("");
  if (noResults) noResults.style.display = items.length === 0 ? "block" : "none";
}

function bindFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderGrid();
    });
  });
}

function bindSearch() {
  document.getElementById("menu-search")?.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderGrid();
  });
}

document.addEventListener("cloclo:ready", () => {
  renderGrid();
  bindFilters();
  bindSearch();
});
