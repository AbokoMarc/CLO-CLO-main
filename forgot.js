/* ============================================================
   CLO-CLO Frontend | forgot.js — « Mot de passe oublié »
   1) la personne indique son e-mail / téléphone ;
   2) l'équipe (admin) déclenche l'envoi d'un code par WhatsApp vers le numéro ENREGISTRÉ ;
   3) elle saisit le code + son nouveau mot de passe.
   ============================================================ */
import { AuthService } from "./services/authService.js";
import { I18n } from "./i18n.js";
import { watchNetwork } from "./net-status.js";

const $ = (id) => document.getElementById(id);
I18n.injectToggle(document.querySelector(".nav-actions"));
if (AuthService.isAuthenticated()) location.replace("index.html");

let identifier = "";
const setErr = (id, msg) => { $(id).textContent = msg || ""; };

function whatsappLink(id) {
  const n = window.CLOCLO_CONFIG?.WHATSAPP_NUMBER || "237699876628";
  const text = I18n.current() === "en"
    ? `Hello Clo-Clo, I forgot my password. My account: ${id}`
    : `Bonjour Clo-Clo, j'ai oublié mon mot de passe. Mon compte : ${id}`;
  return `https://api.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(text)}`;
}

$("btn-ask").addEventListener("click", async () => {
  setErr("err-id");
  identifier = $("fp-id").value.trim();
  if (identifier.length < 5) return setErr("err-id", "Indiquez votre e-mail ou votre numéro de téléphone.");
  const btn = $("btn-ask"), label = btn.textContent;
  btn.disabled = true; btn.textContent = "Envoi en cours…";
  const stop = watchNetwork(btn, "Envoi en cours…");
  try {
    const r = await AuthService.forgot(identifier);
    $("fp-info").textContent = r.message;
    $("fp-wa").href = whatsappLink(identifier);
    $("step-1").hidden = true; $("step-2").hidden = false;
    $("fp-sub").textContent = "Saisissez le code reçu par WhatsApp et choisissez un nouveau mot de passe.";
    $("fp-code").focus();
  } catch (err) { setErr("err-id", err.message); }
  stop(); btn.disabled = false; btn.textContent = label;
});

$("btn-reset").addEventListener("click", async () => {
  ["err-code", "err-pwd", "err-pwd2"].forEach((e) => setErr(e));
  const code = $("fp-code").value.trim(), pwd = $("fp-pwd").value, pwd2 = $("fp-pwd2").value;
  if (!/^\d{6}$/.test(code)) return setErr("err-code", "Le code contient 6 chiffres.");
  if (pwd.length < 8) return setErr("err-pwd", "Le mot de passe doit contenir au moins 8 caractères.");
  if (pwd !== pwd2) return setErr("err-pwd2", "Les deux mots de passe ne correspondent pas.");
  const btn = $("btn-reset"), label = btn.textContent;
  btn.disabled = true; btn.textContent = "Envoi en cours…";
  try {
    await AuthService.resetPassword({ identifier, code, mdp: pwd });
    btn.textContent = "Mot de passe modifié !";
    setTimeout(() => { location.href = "connexion.html"; }, 1200);
  } catch (err) {
    setErr("err-code", err.message);
    btn.disabled = false; btn.textContent = label;
  }
});
