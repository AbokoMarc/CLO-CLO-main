/* ============================================================
   CLO-CLO – Bar à Fruits & Délices | menu.js
   Produits chargés depuis l'API (APP.products) — plus aucune
   donnée en dur ici. Rendu + filtrage par catégorie.
   ============================================================ */
import { APP } from "./app-data.js";

let activeFilter = "tous";
let searchQuery = "";

function cardHtml(p) {
  return `
    <div class="product-card" data-category="${p.category}">
      <div class="product-img-wrap">
        <img src="${p.img}" alt="${p.name}"/>
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
  const items = activeFilter === "tous"
    ? visible
    : visible.filter(p => p.category === activeFilter);

  const q = searchQuery.trim().toLowerCase();
  const found = q ? items.filter(p => `${p.name} ${p.desc || ""}`.toLowerCase().includes(q)) : items;
  items.length = 0; items.push(...found);
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
