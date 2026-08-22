/* ============================================================
   CLO-CLO – Bar à Fruits & Délices | menu.js
   Produits chargés depuis l'API (APP.products) — plus aucune
   donnée en dur ici. Rendu + filtrage par catégorie.
   ============================================================ */
import { APP } from "./app-data.js";

let activeFilter = "tous";

function cardHtml(p) {
  return `
    <div class="product-card" data-category="${p.category}">
      <div class="product-img-wrap">
        <img src="${p.img}" alt="${p.name}"/>
        ${p.popular ? '<span class="badge-popular">⭐ Populaire</span>' : ""}
        <span class="product-price">${p.price.toLocaleString()} FCFA</span>
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <p class="product-desc">${p.desc || ""}</p>
        <button class="btn-add" data-id="${p.id}">
          <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Ajouter
        </button>
      </div>
    </div>`;
}

function renderGrid() {
  const grid = document.getElementById("products-grid");
  const noResults = document.getElementById("no-results");
  if (!grid) return;

  const items = activeFilter === "tous"
    ? APP.products
    : APP.products.filter(p => p.category === activeFilter);

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

document.addEventListener("cloclo:ready", () => {
  renderGrid();
  bindFilters();
});
