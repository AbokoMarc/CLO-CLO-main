/* ============================================================
   CLO-CLO LIVREUR | livreur.js  (partagé toutes pages livreur)
   ============================================================ */

/* ─────────────────────────────────────
   DÉTECTION PAGE
───────────────────────────────────── */
const page = window.location.pathname;
const isDashboard  = page.includes("livreur-dashboard");
const isLivraison  = page.includes("livreur-livraison");
const isHistorique = page.includes("livreur-historique");

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
    background: color === "red" ? "#ef4444" : color === "orange" ? "#f97316" : "#22c55e",
    color: "white", padding: "14px 24px", borderRadius: "12px",
    fontFamily: "'Nunito',sans-serif", fontWeight: "700", fontSize: "0.95rem",
    boxShadow: "0 6px 24px rgba(0,0,0,0.2)", zIndex: "9999",
    opacity: "1", transition: "opacity 0.3s",
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 2500);
}

/* ─────────────────────────────────────
   DASHBOARD – ACCEPTER / REFUSER
───────────────────────────────────── */
function initDashboard() {
  document.querySelector(".btn-accept")?.addEventListener("click", () => {
    showToast("✅ Demande acceptée ! Bonne livraison.");
    setTimeout(() => window.location.href = "livreur-livraison.html", 1400);
  });

  document.querySelector(".btn-refuse")?.addEventListener("click", () => {
    showToast("❌ Demande refusée.", "red");
    const card = document.querySelector(".demande-card");
    if (card) { card.style.opacity = "0.4"; card.style.pointerEvents = "none"; }
  });
}

/* ─────────────────────────────────────
   LIVRAISON – TIMER DÉCOMPTE
───────────────────────────────────── */
function initTimer() {
  const timerEl = document.getElementById("timer-val");
  if (!timerEl) return;
  let minutes = 8;
  const interval = setInterval(() => {
    if (minutes <= 0) { clearInterval(interval); timerEl.textContent = "Arrivée !"; return; }
    minutes--;
    timerEl.textContent = `${minutes} min`;
  }, 60000);
}

/* ─────────────────────────────────────
   LIVRAISON – PROGRESSION
───────────────────────────────────── */
function initProgression() {
  const btns = document.querySelectorAll(".prog-btn");
  const fill = document.querySelector(".prog-line-fill");
  const circles = document.querySelectorAll(".prog-circle");
  const labels  = document.querySelectorAll(".prog-label");
  if (!btns.length) return;

  const steps = [
    { fill: "0%",   text: "0%" },
    { fill: "50%",  text: "50%" },
    { fill: "100%", text: "100%" },
  ];

  btns.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (fill) fill.style.width = steps[i].fill;

      circles.forEach((c, j) => {
        c.classList.remove("done", "current");
        labels[j]?.classList.remove("done", "current");
        if (j < i) { c.classList.add("done"); c.textContent = "✓"; labels[j]?.classList.add("done"); }
        else if (j === i) { c.classList.add("current"); c.textContent = j === 0 ? "✓" : j === 1 ? "✓" : "3"; labels[j]?.classList.add("current"); }
        else { c.textContent = j + 1; }
      });

      if (i === 2) {
        showToast("🎉 Livraison marquée comme arrivée !");
      }
    });
  });
}

/* ─────────────────────────────────────
   LIVRAISON – BOUTON LIVRÉ
───────────────────────────────────── */
function initLivreButton() {
  const btn = document.getElementById("btn-livre");
  if (!btn) return;
  btn.addEventListener("click", () => {
    btn.textContent = "✓ Livré !";
    btn.style.background = "#16a34a";
    btn.disabled = true;
    showToast("🎉 Livraison complétée ! +1 875 FC");
    setTimeout(() => window.location.href = "livreur-historique.html", 1800);
  });
}

/* ─────────────────────────────────────
   LIVRAISON – BOUTON SIGNALER
───────────────────────────────────── */
function initSignalerButton() {
  document.querySelector(".btn-signaler")?.addEventListener("click", () => {
    showToast("⚠️ Problème signalé au centre.", "orange");
  });
}

/* ─────────────────────────────────────
   HISTORIQUE – FILTRE
───────────────────────────────────── */
function initHistoriqueFilter() {
  const chips = document.querySelectorAll(".filter-chip");
  const items = document.querySelectorAll("#histo-list .histo-item");
  if (!chips.length) return;

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.filter;

      items.forEach(item => {
        const status = item.dataset.status;
        item.style.display = (filter === "toutes" || status === filter) ? "" : "none";
      });
    });
  });
}

/* ─────────────────────────────────────
   GOOGLE MAPS
───────────────────────────────────── */
function initGoogleMaps() {
  document.querySelector(".btn-gmaps")?.addEventListener("click", () => {
    const addr = encodeURIComponent("456 Avenue Kasa-Vubu, Kinshasa");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${addr}`, "_blank");
  });
}

/* ─────────────────────────────────────
   INIT
───────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  if (isDashboard) {
    initDashboard();
  }
  if (isLivraison) {
    initTimer();
    initProgression();
    initLivreButton();
    initSignalerButton();
    initGoogleMaps();
  }
  if (isHistorique) {
    initHistoriqueFilter();
  }
});