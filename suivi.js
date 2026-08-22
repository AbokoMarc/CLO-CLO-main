/* ============================================================
   CLO-CLO – Bar à Fruits & Délices | suivi.js
   ============================================================ */

/* ── État ── */
let points = 150;
let cartCount = 3;

/* ── Sélecteurs DOM ── */
const cartBadge   = document.getElementById("cart-badge");
const pointsLabel = document.getElementById("points-label");

/* ─────────────────────────────────────
   MISE À JOUR UI
───────────────────────────────────── */
function updateCartBadge() {
  if (!cartBadge) return;
  cartBadge.textContent = cartCount;
  cartBadge.style.display = cartCount === 0 ? "none" : "flex";
}

function updatePoints() {
  if (pointsLabel) {
    pointsLabel.textContent = `${points} pts`;
  }
}

/* ─────────────────────────────────────
   MINUTEUR EN TEMPS RÉEL
   Décompte du temps estimé de livraison
───────────────────────────────────── */
let minutesLeft = 15;

function startDeliveryTimer() {
  const timeEl = document.querySelector(".order-time strong");
  if (!timeEl) return;

  const interval = setInterval(() => {
    if (minutesLeft <= 0) {
      clearInterval(interval);
      timeEl.textContent = "Livraison imminente !";
      return;
    }
    minutesLeft--;
    timeEl.textContent = `${minutesLeft} min`;
  }, 60000); // toutes les 60 secondes
}

/* ─────────────────────────────────────
   SIMULATION DE PROGRESSION
   (démo visuelle : avance la barre après 3s)
───────────────────────────────────── */
function simulateProgress() {
  const fillBar = document.querySelector(".progress-line-fill");
  if (!fillBar) return;

  // Déjà à 66% (En Route), on simule une légère avance
  setTimeout(() => {
    fillBar.style.width = "72%";
  }, 3000);
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
    { threshold: 0.08 }
  );

  const targets = document.querySelectorAll(".order-card, .recent-card");
  targets.forEach((el, i) => {
    Object.assign(el.style, {
      opacity:    "0",
      transform:  "translateY(24px)",
      transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`,
    });
    observer.observe(el);
  });
}

/* ─────────────────────────────────────
   INITIALISATION
───────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  updatePoints();
  initScrollReveal();
  startDeliveryTimer();
  simulateProgress();
});
const profileBtn = document.querySelector(".btn-profile");
if (profileBtn){
    profileBtn.addEventListener("click", () => {
        window.location.href = "profil.html";
    });
}
/* ============================================================
   CLO-CLO | suivi.js — Page Suivi
   ============================================================ */
document.addEventListener("DOMContentLoaded",()=>{
  // Mettre à jour avec la vraie commande
  const order=typeof APP!=="undefined"?APP.getLastOrder():null;
  if(order){
    const idEl=document.querySelector(".order-id");
    if(idEl)idEl.textContent=order.id;
    const cmdEl=document.querySelector(".order-cmd");
    if(cmdEl)cmdEl.textContent="Commande : "+order.id;
  }

  // Timer
  let mins=15;
  const timeEl=document.querySelector(".order-time strong");
  if(timeEl){
    const iv=setInterval(()=>{
      mins--;
      if(mins<=0){clearInterval(iv);timeEl.textContent="Livraison imminente !";timeEl.style.color="#facc15";return;}
      timeEl.textContent=mins+" min";
    },60000);
  }

  // Barre progression animée
  const fill=document.querySelector(".progress-line-fill");
  if(fill){fill.style.width="0%";setTimeout(()=>fill.style.width="66%",600);}

  // Statut badge pulse
  const badge=document.querySelector(".status-badge");
  if(badge){setInterval(()=>{badge.style.opacity="0.6";setTimeout(()=>badge.style.opacity="1",600);},3000);}

  // Scroll reveal
  const obs=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting){x.target.style.opacity="1";x.target.style.transform="translateY(0)";obs.unobserve(x.target);}});},{threshold:.08});
  document.querySelectorAll(".order-card,.recent-card").forEach((el,i)=>{
    Object.assign(el.style,{opacity:"0",transform:"translateY(22px)",transition:`opacity .5s ease ${i*.1}s,transform .5s ease ${i*.1}s`});
    obs.observe(el);
  });
});