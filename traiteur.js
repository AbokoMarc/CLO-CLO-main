/* ============================================================
   CLO-CLO Frontend | traiteur.js
   ============================================================ */
import { APP } from "./app-data.js";
import { ProductService } from "./services/productService.js";

function showError(msg) {
  const el = document.getElementById("traiteur-error");
  if (el) el.textContent = msg;
}

function prefillFromUser() {
  if (!APP.user) return;
  const nomEl = document.getElementById("tr-nom");
  const telEl = document.getElementById("tr-tel");
  if (nomEl && !nomEl.value) nomEl.value = APP.user.nom || "";
  if (telEl && !telEl.value) telEl.value = APP.user.tel || "";
}

function initSubmit() {
  document.getElementById("btn-tr-submit")?.addEventListener("click", async () => {
    showError("");
    const nom = document.getElementById("tr-nom").value.trim();
    const tel = document.getElementById("tr-tel").value.trim();
    const typeEvenement = document.getElementById("tr-type").value;
    const nbPersonnes = document.getElementById("tr-nb").value;
    const dateEvenement = document.getElementById("tr-date").value;
    const message = document.getElementById("tr-message").value.trim();

    if (!nom || !tel) {
      showError("⚠️ Nom et téléphone sont requis.");
      return;
    }

    const btn = document.getElementById("btn-tr-submit");
    btn.disabled = true;
    btn.textContent = "Envoi en cours...";

    try {
      await ProductService.createTraiteurRequest({ nom, tel, typeEvenement, nbPersonnes, dateEvenement, message });
      document.getElementById("traiteur-form-block").style.display = "none";
      document.getElementById("traiteur-success").style.display = "block";
    } catch (err) {
      showError(err.message || "Impossible d'envoyer la demande pour le moment. Réessayez plus tard.");
      btn.disabled = false;
      btn.textContent = "Envoyer ma demande";
    }
  });
}

document.addEventListener("cloclo:ready", () => {
  prefillFromUser();
  initSubmit();
});
