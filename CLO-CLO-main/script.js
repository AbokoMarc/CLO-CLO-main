/* ============================================================
   CLO-CLO | script.js — Page Accueil
   Rend les produits populaires depuis l'API (via APP, chargé
   par app.js) et câble les boutons de navigation.
   ============================================================ */
import { APP } from "./app-data.js";

function renderPopularProducts() {
  const grid = document.getElementById("products-grid");
  if (!grid) return;
  const popular = APP.products.filter(p => p.popular).slice(0, 4);
  const items = popular.length ? popular : APP.products.slice(0, 4);

  if (items.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#9ca3af;font-weight:700;">Aucun produit disponible pour le moment.</p>`;
    return;
  }

  grid.innerHTML = items.map(p => `
    <div class="product-card">
      <div class="product-img-wrap">
        <img src="${p.img}" alt="${p.name}"/>
        <span class="product-price">${p.price.toLocaleString()} FCFA</span>
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <button class="product-order btn-add" data-id="${p.id}">Commander →</button>
      </div>
    </div>`).join("");
}

function bindNavButtons() {
  document.querySelector(".btn-white-solid")?.addEventListener("click", () => window.location.href = "menu.html");
  document.querySelector(".btn-outline-white")?.addEventListener("click", () => window.location.href = "inscription.html");
  document.querySelector(".btn-cta")?.addEventListener("click", () => window.location.href = "inscription.html");
  document.querySelector(".btn-green-solid")?.addEventListener("click", () => window.location.href = "menu.html");
}

document.addEventListener("cloclo:ready", () => {
  renderPopularProducts();
  bindNavButtons();
});
