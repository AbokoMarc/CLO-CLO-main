/* ============================================================
   CLO-CLO ADMIN | admin.js  (partagé toutes pages admin)
   ============================================================ */

/* ─────────────────────────────────────
   GRAPHIQUES TABLEAU DE BORD
───────────────────────────────────── */
function initCharts() {
  // Graphique barres : Ventes de la semaine
  const ctxVentes = document.getElementById("chartVentes");
  if (ctxVentes) {
    new Chart(ctxVentes, {
      type: "bar",
      data: {
        labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
        datasets: [{
          label: "Ventes (FC)",
          data: [62000, 78000, 80000, 95000, 120000, 140000, 115000],
          backgroundColor: "#22c55e",
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: "Nunito", weight: "700" } } },
          y: { grid: { color: "#f3f4f6", borderDash: [4, 4] }, ticks: { font: { family: "Nunito" } } }
        }
      }
    });
  }

  // Graphique ligne : Commandes aujourd'hui
  const ctxCmd = document.getElementById("chartCommandes");
  if (ctxCmd) {
    new Chart(ctxCmd, {
      type: "line",
      data: {
        labels: ["8h","9h","10h","11h","12h","13h","14h","15h","16h","17h"],
        datasets: [{
          label: "Commandes",
          data: [4, 8, 14, 24, 18, 20, 28, 22, 31, 16],
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.08)",
          borderWidth: 2.5,
          pointBackgroundColor: "#3b82f6",
          pointRadius: 4,
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: "Nunito", weight: "700" } } },
          y: { grid: { color: "#f3f4f6", borderDash: [4, 4] }, ticks: { font: { family: "Nunito" } } }
        }
      }
    });
  }
}

/* ─────────────────────────────────────
   FILTRE HISTORIQUE
───────────────────────────────────── */
function initHistoriqueFilter() {
  const chips = document.querySelectorAll(".filter-chip");
  const rows  = document.querySelectorAll("#hist-body tr");
  if (!chips.length) return;

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.filter;

      rows.forEach(row => {
        const status = row.dataset.status;
        row.style.display = (filter === "tous" || status === filter) ? "" : "none";
      });
    });
  });
}

/* ─────────────────────────────────────
   RECHERCHE HISTORIQUE
───────────────────────────────────── */
function initHistoriqueSearch() {
  const input = document.getElementById("search-input");
  const rows  = document.querySelectorAll("#hist-body tr");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
}

/* ─────────────────────────────────────
   RECHERCHE CLIENTS
───────────────────────────────────── */
function initClientSearch() {
  const input = document.getElementById("client-search");
  const cards = document.querySelectorAll(".client-card");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    cards.forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
}

/* ─────────────────────────────────────
   BOUTONS LIVRAISONS
───────────────────────────────────── */
function initLivraisonButtons() {
  document.querySelectorAll(".btn-action-green").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.textContent = "✓ En cours...";
      btn.style.background = "#16a34a";
      showToast("🚚 Livraison démarrée !");
      setTimeout(() => {
        btn.textContent = "Démarrer la Livraison";
        btn.style.background = "";
      }, 2000);
    });
  });

  document.querySelectorAll(".btn-action-blue").forEach(btn => {
    btn.addEventListener("click", () => {
      showToast("✅ Commande marquée comme Prête !");
    });
  });
}

/* ─────────────────────────────────────
   TOAST
───────────────────────────────────── */
function showToast(msg, color = "green") {
  const ex = document.querySelector(".toast");
  if (ex) ex.remove();
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

/* ─────────────────────────────────────
   INIT
───────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initCharts();
  initHistoriqueFilter();
  initHistoriqueSearch();
  initClientSearch();
  initLivraisonButtons();
});