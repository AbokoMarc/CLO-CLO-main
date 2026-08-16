/* ============================================================
   CLO-CLO | inscription.js
   Inscription réelle via le backend (services/authService).
   ============================================================ */
import { AuthService } from "./services/authService.js";

document.querySelectorAll(".toggle-pwd").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
  });
});

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearErrors() {
  ["err-nom","err-email","err-tel","err-mdp","err-mdp2","err-cgu"].forEach(id => setError(id, ""));
  document.querySelectorAll(".input-wrap").forEach(w => w.classList.remove("error"));
}

function showInputError(inputId, errId, msg) {
  setError(errId, msg);
  document.getElementById(inputId)?.closest(".input-wrap")?.classList.add("error");
}

function validate() {
  clearErrors();
  let valid = true;

  const nom   = document.getElementById("input-nom")?.value.trim();
  const email = document.getElementById("input-email")?.value.trim();
  const tel   = document.getElementById("input-tel")?.value.trim();
  const mdp   = document.getElementById("input-mdp")?.value;
  const mdp2  = document.getElementById("input-mdp2")?.value;
  const cgu   = document.getElementById("cgu-check")?.checked;

  if (!nom) { showInputError("input-nom", "err-nom", "Le nom est requis."); valid = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showInputError("input-email", "err-email", "Email invalide."); valid = false; }
  if (!tel) { showInputError("input-tel", "err-tel", "Le téléphone est requis."); valid = false; }
  if (!mdp || mdp.length < 6) { showInputError("input-mdp", "err-mdp", "Minimum 6 caractères."); valid = false; }
  if (mdp !== mdp2) { showInputError("input-mdp2", "err-mdp2", "Les mots de passe ne correspondent pas."); valid = false; }
  if (!cgu) { setError("err-cgu", "Vous devez accepter les conditions."); valid = false; }

  return valid;
}

function showToast(message, color = "green") {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed", bottom: "30px", right: "30px",
    background: color === "red" ? "#ef4444" : "#22c55e", color: "white",
    padding: "14px 24px", borderRadius: "12px",
    fontFamily: "'Nunito', sans-serif", fontWeight: "700", fontSize: "0.95rem",
    boxShadow: "0 6px 24px rgba(0,0,0,0.2)", zIndex: "9999",
    opacity: "1", transition: "opacity 0.3s",
  });
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 2500);
}

document.getElementById("btn-creer")?.addEventListener("click", async () => {
  if (!validate()) return;

  const btn = document.getElementById("btn-creer");
  const origText = btn.textContent;
  btn.textContent = "Création en cours...";
  btn.disabled = true;

  try {
    await AuthService.register({
      nom: document.getElementById("input-nom").value.trim(),
      email: document.getElementById("input-email").value.trim(),
      tel: document.getElementById("input-tel").value.trim(),
      mdp: document.getElementById("input-mdp").value,
    });
    showToast("🎉 Compte créé ! 50 points de bienvenue offerts !");
    setTimeout(() => { window.location.href = "profil.html"; }, 1500);
  } catch (err) {
    btn.textContent = origText;
    btn.disabled = false;
    showToast(err.message || "Impossible de créer le compte.", "red");
  }
});
