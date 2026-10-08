/* ============================================================
   CLO-CLO Frontend | traiteur.js
   ============================================================ */
import { APP } from "./app-data.js";
import { ProductService } from "./services/productService.js";
import { TraiteurService } from "./services/traiteurService.js";
import { mountInbox, esc } from "./traiteur-inbox.js";

const STATUT_LABEL = { nouvelle: "Nouvelle", en_negociation: "En négociation", confirmee: "Confirmée", refusee: "Refusée" };

/** Boîte de messagerie du client : conversations à gauche, fil à droite. */
let inboxMounted = false;
async function loadInbox(openId = null) {
  const wrap = document.getElementById("traiteur-inbox");
  const hint = document.getElementById("traiteur-login-hint");
  if (!APP.isLoggedIn()) { hint.style.display = "block"; wrap.style.display = "none"; return; }
  hint.style.display = "none"; wrap.style.display = "block";
  if (inboxMounted && !openId) return;
  inboxMounted = true;
  await mountInbox(wrap, {
    role: "client",
    fetchList: () => TraiteurService.mine(),
    fetchMessages: (id) => TraiteurService.messages(id),
    sendMessage: (id, text) => TraiteurService.send(id, text),
    titleOf: (r) => `${r.typeEvenement || "Événement"} — demande n°${r.id}`,
    openId: openId || Number(new URLSearchParams(location.search).get("id")) || null,
    renderTools: (r) => `
      <span><b>${esc(STATUT_LABEL[r.statut] || r.statut)}</b></span>
      ${r.prixPropose ? `<span>Prix proposé : <b>${Number(r.prixPropose).toLocaleString(window.CLOCLO_LOCALE())} FCFA</b></span>` : ""}
      <div class="tm-brief">${r.nbPersonnes ? esc(r.nbPersonnes) + " pers." : ""} ${r.dateEvenement ? "· " + esc(r.dateEvenement) : ""}${r.message ? " — « " + esc(r.message) + " »" : ""}</div>`,
  });
}

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
      showError("Nom et téléphone sont requis.");
      return;
    }

    const btn = document.getElementById("btn-tr-submit");
    btn.disabled = true;
    btn.textContent = "Envoi en cours...";

    try {
      const created = await ProductService.createTraiteurRequest({ nom, tel, typeEvenement, nbPersonnes, dateEvenement, message });
      document.getElementById("traiteur-form-block").style.display = "none";
      document.getElementById("traiteur-success").style.display = "block";
      // La conversation s'ouvre tout de suite : le client peut écrire sans attendre un rappel.
      await loadInbox(created?.id || null);
      document.getElementById("traiteur-inbox-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  loadInbox();
});
