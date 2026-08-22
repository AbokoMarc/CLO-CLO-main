/* ============================================================
   CLO-CLO | connexion.js  (partagé : client + livreur + directeur)
   ============================================================ */

/* ── Identifiants de démo ── */
const CREDENTIALS = {
  client:    { email: "marie.kambale@email.com", mdp: "marie123",  redirect: "profil.html"               },
  livreur:   { id:    "DRV-001",                 mdp: "driver123", redirect: "livreur-dashboard.html"                },
  directeur: { user:  "admin",                   mdp: "admin123",  redirect: "admin-dashboard.html" /* dashboard */ },
};

/* ── Détection de la page courante ── */
const page = window.location.pathname;
const isLivreur   = page.includes("connexion-livreur");
const isDirecteur = page.includes("connexion-directeur");
const isClient    = !isLivreur && !isDirecteur;

/* ── Afficher / masquer mot de passe ── */
document.querySelectorAll(".toggle-pwd").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (input) input.type = input.type === "password" ? "text" : "password";
  });
});

/* ── Utilitaires erreurs ── */
function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearErrors() {
  document.querySelectorAll(".error-msg").forEach(el => el.textContent = "");
  document.querySelectorAll(".input-wrap").forEach(el => el.classList.remove("error"));
}
function markError(inputId, errId, msg) {
  setError(errId, msg);
  document.getElementById(inputId)?.closest(".input-wrap")?.classList.add("error");
}

/* ── Validation & connexion CLIENT ── */
function loginClient() {
  clearErrors();
  const email = document.getElementById("input-email")?.value.trim();
  const mdp   = document.getElementById("input-mdp")?.value;
  let ok = true;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    markError("input-email", "err-email", "Email invalide."); ok = false;
  }
  if (!mdp) {
    markError("input-mdp", "err-mdp", "Mot de passe requis."); ok = false;
  }
  if (!ok) return;

  // Vérification démo
  if (email !== CREDENTIALS.client.email || mdp !== CREDENTIALS.client.mdp) {
    markError("input-mdp", "err-mdp", "Email ou mot de passe incorrect.");
    return;
  }
  localStorage.setItem("cloclo_role", "admin");
  success(CREDENTIALS.client.redirect);
}

/* ── Validation & connexion LIVREUR ── */
function loginLivreur() {
  clearErrors();
  const id  = document.getElementById("input-id")?.value.trim();
  const mdp = document.getElementById("input-mdp")?.value;
  let ok = true;

  if (!id)  { markError("input-id",  "err-id",  "Identifiant requis."); ok = false; }
  if (!mdp) { markError("input-mdp", "err-mdp", "Mot de passe requis."); ok = false; }
  if (!ok) return;

  if (id !== CREDENTIALS.livreur.id || mdp !== CREDENTIALS.livreur.mdp) {
    markError("input-mdp", "err-mdp", "Identifiant ou mot de passe incorrect.");
    return;
  }
  success(CREDENTIALS.livreur.redirect);
}

/* ── Validation & connexion DIRECTEUR ── */
function loginDirecteur() {
  clearErrors();
  const user = document.getElementById("input-user")?.value.trim();
  const mdp  = document.getElementById("input-mdp")?.value;
  let ok = true;

  if (!user) { markError("input-user", "err-user", "Nom d'utilisateur requis."); ok = false; }
  if (!mdp)  { markError("input-mdp",  "err-mdp",  "Mot de passe requis."); ok = false; }
  if (!ok) return;

  if (user !== CREDENTIALS.directeur.user || mdp !== CREDENTIALS.directeur.mdp) {
    markError("input-mdp", "err-mdp", "Identifiants incorrects.");
    return;
  }
  localStorage.setItem("cloclo_role", "admin");
  success(CREDENTIALS.directeur.redirect);
}

/* ── Succès : animation + redirection ── */
function success(redirect) {
  const btn = document.getElementById("btn-login");
  if (btn) {
    btn.textContent = "✓ Connexion réussie !";
    btn.style.background = "#16a34a";
    btn.disabled = true;
  }
  showToast("✅ Connexion réussie !");
  setTimeout(() => window.location.href = redirect, 1400);
}

/* ── Toast ── */
function showToast(msg, color = "green") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
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

/* ── Branchement du bouton selon la page ── */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-login");
  if (!btn) return;

  if (isLivreur)        btn.addEventListener("click", loginLivreur);
  else if (isDirecteur) btn.addEventListener("click", loginDirecteur);
  else                  btn.addEventListener("click", loginClient);

  // Connexion au Enter
  document.addEventListener("keydown", e => {
    if (e.key === "Enter") btn.click();
  });
});
