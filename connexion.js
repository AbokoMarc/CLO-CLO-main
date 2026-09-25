/* ============================================================
   CLO-CLO | connexion.js (partagé : client + livreur + directeur)
   Authentification réelle via le backend (services/authService).
   Plus aucun identifiant codé en dur ici.
   ============================================================ */
import { AuthService } from "./services/authService.js";
import { I18n } from "./i18n.js";
I18n.injectToggle(document.querySelector(".nav-actions"));

const page = window.location.pathname;
const isLivreur   = page.includes("connexion-livreur");
const isDirecteur = page.includes("connexion-directeur");

document.querySelectorAll(".toggle-pwd").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (input) input.type = input.type === "password" ? "text" : "password";
  });
});

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

function showToast(msg, color = "green") {
  document.querySelector(".toast")?.remove();
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

function success(redirect) {
  const btn = document.getElementById("btn-login");
  if (btn) { btn.textContent = "✓ Connexion réussie !"; btn.style.background = "#16a34a"; btn.disabled = true; }
  showToast("✅ Connexion réussie !");
  setTimeout(() => window.location.href = redirect, 1000);
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.origText ||= btn.textContent;
  btn.textContent = loading ? "Connexion en cours…" : btn.dataset.origText;
}

async function loginClient() {
  clearErrors();
  const email = document.getElementById("input-email")?.value.trim();
  const mdp   = document.getElementById("input-mdp")?.value;
  let ok = true;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { markError("input-email", "err-email", "Email invalide."); ok = false; }
  if (!mdp) { markError("input-mdp", "err-mdp", "Mot de passe requis."); ok = false; }
  if (!ok) return;

  const btn = document.getElementById("btn-login");
  setLoading(btn, true);
  try {
    await AuthService.loginClient(email, mdp);
    success("profil.html");
  } catch (err) {
    setLoading(btn, false);
    markError("input-mdp", "err-mdp", err.message || "Email ou mot de passe incorrect.");
  }
}

async function loginLivreur() {
  clearErrors();
  const id  = document.getElementById("input-id")?.value.trim();
  const mdp = document.getElementById("input-mdp")?.value;
  let ok = true;
  if (!id)  { markError("input-id",  "err-id",  "Identifiant requis."); ok = false; }
  if (!mdp) { markError("input-mdp", "err-mdp", "Mot de passe requis."); ok = false; }
  if (!ok) return;

  const btn = document.getElementById("btn-login");
  setLoading(btn, true);
  try {
    await AuthService.loginLivreur(id, mdp);
    success("livreur-dashboard.html");
  } catch (err) {
    setLoading(btn, false);
    markError("input-mdp", "err-mdp", err.message || "Identifiant ou mot de passe incorrect.");
  }
}

async function loginDirecteur() {
  clearErrors();
  const user = document.getElementById("input-user")?.value.trim();
  const mdp  = document.getElementById("input-mdp")?.value;
  let ok = true;
  if (!user) { markError("input-user", "err-user", "Nom d'utilisateur requis."); ok = false; }
  if (!mdp)  { markError("input-mdp",  "err-mdp",  "Mot de passe requis."); ok = false; }
  if (!ok) return;

  const btn = document.getElementById("btn-login");
  setLoading(btn, true);
  try {
    await AuthService.loginAdmin(user, mdp);
    success("admin-dashboard.html");
  } catch (err) {
    setLoading(btn, false);
    markError("input-mdp", "err-mdp", err.message || "Identifiants incorrects.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-login");
  if (!btn) return;

  const handler = isLivreur ? loginLivreur : isDirecteur ? loginDirecteur : loginClient;
  btn.addEventListener("click", handler);
  document.addEventListener("keydown", e => { if (e.key === "Enter") btn.click(); });
});
