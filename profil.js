/* ============================================================
   CLO-CLO – Bar à Fruits & Délices | profil.js
   ============================================================ */

/* ── État utilisateur ── */
const user = {
  nom:      "Marie Kambale",
  email:    "marie.kambale@email.com",
  tel:      "+243 987 654 321",
  adresse:  "456 Avenue Kasa-Vubu, Kinshasa",
  points:   350,
  commandes: 24,
  niveau:   "Or",
};

let cartCount = 3;

/* ── Sélecteurs DOM ── */
const cartBadge   = document.getElementById("cart-badge");
const pointsLabel = document.getElementById("points-label");

/* ─────────────────────────────────────
   MISE À JOUR UI NAVBAR
───────────────────────────────────── */
function updateNavbar() {
  if (cartBadge)   cartBadge.textContent = cartCount;
  if (pointsLabel) pointsLabel.textContent = `${user.points} pts`;
}

/* ─────────────────────────────────────
   NAVIGATION PAR ONGLETS
───────────────────────────────────── */
function initTabs() {
  const tabBtns     = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;

      // Désactiver tous les onglets
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));

      // Activer l'onglet cliqué
      btn.classList.add("active");
      const targetEl = document.getElementById(`tab-${target}`);
      if (targetEl) targetEl.classList.add("active");
    });
  });
}

/* ─────────────────────────────────────
   ANIMATION BARRE DE NIVEAU
───────────────────────────────────── */
function animateLevelBar() {
  const fill = document.querySelector(".niveau-bar-fill");
  if (!fill) return;

  // Partir de 0 puis animer jusqu'à la vraie valeur
  fill.style.width = "0%";
  setTimeout(() => {
    fill.style.width = "35%"; // 350/1000
  }, 300);
}

/* ─────────────────────────────────────
   RÉCOMPENSES – BOUTON UTILISER
───────────────────────────────────── */
function initRewardButtons() {
  const btns = document.querySelectorAll(".btn-utiliser");

  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      const reward = btn.dataset.reward;
      const cost   = parseInt(btn.dataset.cost);

      if (user.points < cost) {
        showToast(`❌ Points insuffisants ! (${user.points} / ${cost} requis)`, "red");
        return;
      }

      // Déduire les points
      user.points -= cost;
      updateNavbar();
      updatePointsDisplay();

      // Feedback visuel sur le bouton
      const original = btn.textContent;
      btn.textContent = "✓ Utilisé !";
      btn.style.background = "#16a34a";
      btn.disabled = true;

      showToast(`🎉 "${reward}" appliqué avec succès !`);

      setTimeout(() => {
        btn.textContent  = original;
        btn.style.background = "";
        btn.disabled = false;
      }, 2000);
    });
  });
}

/* Mettre à jour l'affichage des points dans la bannière */
function updatePointsDisplay() {
  const bp = document.querySelector(".bp-value");
  if (bp) {
    bp.innerHTML = `
      <svg viewBox="0 0 24 24" style="width:28px;height:28px;fill:#facc15;">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      ${user.points}
    `;
  }
  // Mettre à jour aussi la stat
  const statVal = document.querySelector(".stat-value.yellow");
  if (statVal) statVal.textContent = user.points;
}

/* ─────────────────────────────────────
   PARAMÈTRES – ENREGISTRER
───────────────────────────────────── */
function initParamsForm() {
  const btnSave = document.getElementById("btn-save");
  if (!btnSave) return;

  btnSave.addEventListener("click", () => {
    const nom     = document.getElementById("input-nom")?.value.trim();
    const email   = document.getElementById("input-email")?.value.trim();
    const tel     = document.getElementById("input-tel")?.value.trim();
    const adresse = document.getElementById("input-adresse")?.value.trim();

    if (!nom || !email) {
      showToast("⚠️ Nom et email sont requis.", "red");
      return;
    }

    // Mettre à jour l'état
    user.nom     = nom;
    user.email   = email;
    user.tel     = tel;
    user.adresse = adresse;

    // Mettre à jour la bannière
    const bannerName  = document.querySelector(".banner-name");
    const bannerEmail = document.querySelector(".banner-email");
    if (bannerName)  bannerName.textContent  = nom;
    if (bannerEmail) bannerEmail.textContent = email;

    showToast("✅ Modifications enregistrées !");
  });
}

/* ─────────────────────────────────────
   PARAMÈTRES – DÉCONNEXION
───────────────────────────────────── */
function initLogout() {
  const btnLogout = document.getElementById("btn-logout");
  if (!btnLogout) return;

  btnLogout.addEventListener("click", () => {
    if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
      showToast("👋 Déconnexion en cours...");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    }
  });
}

/* ─────────────────────────────────────
   TOAST NOTIFICATION
───────────────────────────────────── */
function showToast(message, color = "green") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  const bg = color === "red" ? "#ef4444" : "#22c55e";

  Object.assign(toast.style, {
    position:     "fixed",
    bottom:       "30px",
    right:        "30px",
    background:   bg,
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
   SCROLL REVEAL
───────────────────────────────────── */
function initScrollReveal() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity   = "1";
          e.target.style.transform = "translateY(0)";
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08 }
  );

  document.querySelectorAll(".stat-card, .reward-card, .histo-item").forEach((el, i) => {
    Object.assign(el.style, {
      opacity:    "0",
      transform:  "translateY(20px)",
      transition: `opacity 0.4s ease ${i * 0.06}s, transform 0.4s ease ${i * 0.06}s`,
    });
    observer.observe(el);
  });
}

/* ─────────────────────────────────────
   INITIALISATION
───────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  updateNavbar();
  initTabs();
  animateLevelBar();
  initRewardButtons();
  initParamsForm();
  initLogout();
  initScrollReveal();
});
/* ============================================================
   CLO-CLO | profil.js
   ============================================================ */
document.addEventListener("DOMContentLoaded",()=>{

  function loadData(){
    if(typeof APP==="undefined")return;
    const sel=(s,v)=>{const el=document.querySelector(s);if(el)el.textContent=v;};
    const val=(s,v)=>{const el=document.getElementById(s);if(el)el.value=v;};
    sel(".banner-name",APP.user.nom);
    sel(".banner-email",APP.user.email);
    sel(".banner-cmds",APP.user.commandes+" commandes");
    // Points dans bannière
    const bv=document.querySelector(".bp-value");
    if(bv)bv.innerHTML=`<svg viewBox="0 0 24 24" style="width:26px;height:26px;fill:#facc15;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>${APP.user.points}`;
    // Stats
    sel(".stat-value.yellow",APP.user.points);
    sel(".stat-value.blue",APP.user.commandes);
    // Formulaire paramètres
    val("input-nom",APP.user.nom);
    val("input-email",APP.user.email);
    val("input-tel",APP.user.tel);
    val("input-adresse",APP.user.adresse);
    // Points navbar
    if(typeof updateNavbar!=="undefined")updateNavbar();
  }
  loadData();

  // Onglets
  document.querySelectorAll(".tab-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c=>c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add("active");
    });
  });

  // Barre de niveau
  const fill=document.querySelector(".niveau-bar-fill");
  if(fill){fill.style.width="0%";setTimeout(()=>{
    const pct=Math.min((APP.user.points/1000)*100,100);
    fill.style.width=pct+"%";
  },400);}

  // Historique des points dynamique
  const histoList=document.querySelector(".historique-list");
  if(histoList && APP.pointsHistory && APP.pointsHistory.length>0){
    histoList.innerHTML=APP.pointsHistory.slice(0,8).map(h=>`
      <div class="histo-item">
        <div class="histo-left"><div class="histo-name">${h.label}</div><div class="histo-date">${h.date}</div></div>
        <div class="histo-pts ${h.type==="gain"?"gain":"loss"}">${h.pts>0?"+":""}${h.pts} pts</div>
      </div>`).join("");
  }

  // Commandes récentes dans vue d'ensemble
  const ordersWrap=document.getElementById("recent-orders-wrap");
  if(ordersWrap){
    if(APP.orders && APP.orders.length>0){
      ordersWrap.innerHTML=APP.orders.slice(0,5).map(o=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #f3f4f6;">
          <div><div style="font-weight:800;font-size:0.9rem;color:#1a1a2e;">${o.id}</div><div style="font-size:0.8rem;color:#6b7280;">${o.articles.slice(0,2).join(", ")}${o.articles.length>2?" ...":""}</div></div>
          <div style="text-align:right;"><div style="font-weight:800;color:#22c55e;font-size:0.9rem;">${o.total.toLocaleString()} FC</div><div style="font-size:0.75rem;color:#9ca3af;">${o.date}</div></div>
        </div>`).join("");
    } else {
      ordersWrap.innerHTML=`<div style="text-align:center;padding:30px;color:#9ca3af;font-weight:600;">Aucune commande pour l'instant<br><a href="menu.html" style="color:#22c55e;font-weight:700;text-decoration:none;display:inline-block;margin-top:10px;">Commander maintenant →</a></div>`;
    }
  }

  // Récompenses — boutons Utiliser
  document.querySelectorAll(".btn-utiliser").forEach(btn=>{
    btn.addEventListener("click",function(){
      const rewardId=parseInt(this.dataset.cost);
      const cost=parseInt(this.dataset.cost);
      const name=this.dataset.reward;
      if(APP.user.points<cost){showToast(`❌ Points insuffisants (${APP.user.points} / ${cost})`, "error");return;}
      APP.user.points-=cost;
      APP.pointsHistory.unshift({label:`Récompense : ${name}`,date:new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}),pts:-cost,type:"loss"});
      APP.save();
      loadData();
      const orig=this.textContent;
      this.textContent="✓ Utilisé !";
      this.style.background="#16a34a";
      this.disabled=true;
      showToast(`🎉 "${name}" appliqué !`,"success");
      setTimeout(()=>{this.textContent=orig;this.style.background="";this.disabled=false;},2000);
    });
  });

  // Enregistrer paramètres
  document.getElementById("btn-save")?.addEventListener("click",()=>{
    const nom=document.getElementById("input-nom")?.value.trim();
    const email=document.getElementById("input-email")?.value.trim();
    const tel=document.getElementById("input-tel")?.value.trim();
    const adresse=document.getElementById("input-adresse")?.value.trim();
    if(!nom||!email){showToast("⚠️ Nom et email requis","warning");return;}
    APP.user.nom=nom;APP.user.email=email;APP.user.tel=tel;APP.user.adresse=adresse;
    APP.save();
    loadData();
    showToast("✅ Profil mis à jour !","success");
  });

  // Déconnexion
  document.getElementById("btn-logout")?.addEventListener("click",()=>{
    if(confirm("Voulez-vous vous déconnecter ?")){
      showToast("👋 À bientôt !","info");
      setTimeout(()=>APP.logout(),1200);
    }
  });

  // Message de bienvenue si première visite
  if(!localStorage.getItem("cloclo_welcomed")){
    localStorage.setItem("cloclo_welcomed","1");
    setTimeout(()=>showToast(`👋 Bienvenue, ${APP.user.nom.split(" ")[0]} ! Vous avez ${APP.user.points} pts`,"success"),600);
  }

  // Scroll reveal
  const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.style.opacity="1";e.target.style.transform="translateY(0)";obs.unobserve(e.target);}});},{threshold:.08});
  document.querySelectorAll(".stat-card,.reward-card,.histo-item").forEach((el,i)=>{
    Object.assign(el.style,{opacity:"0",transform:"translateY(18px)",transition:`opacity .4s ease ${i*.06}s,transform .4s ease ${i*.06}s`});
    obs.observe(el);
  });
});