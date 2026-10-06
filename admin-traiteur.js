/* ============================================================
   CLO-CLO ADMIN | admin-traiteur.js
   ============================================================ */
import { AuthService } from "./services/authService.js";
import { ProductService } from "./services/productService.js";

const ICON_SVG = (path) => `<svg class="ic" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0;" aria-hidden="true">${path}</svg>`;
const IC = {
  check: ICON_SVG(`<circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/>`),
  errorX: ICON_SVG(`<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`),
  box: ICON_SVG(`<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>`),
  message: ICON_SVG(`<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-4-1L3 20l1-5.5a8.5 8.5 0 1 1 17-3z"/>`),
  phone: ICON_SVG(`<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 3a2 2 0 0 1-.4 2.1L8 10.1a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2-.5c1 .3 2 .5 3 .7a2 2 0 0 1 1.7 2.1Z"/>`),
};

function showToast(msg, color = "green") {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.style.display = "flex";
  t.style.alignItems = "center";
  t.style.gap = "8px";
  t.innerHTML = `${color === "red" ? IC.errorX : IC.check}<span>${msg}</span>`;
  Object.assign(t.style, {
    position: "fixed", bottom: "30px", right: "30px",
    background: color === "red" ? "#ef4444" : "#22c55e",
    color: "white", padding: "14px 24px", borderRadius: "12px",
    fontFamily: "'Nunito', sans-serif", fontWeight: "700", fontSize: "0.95rem",
    boxShadow: "0 6px 24px rgba(0,0,0,0.2)", zIndex: "9999",
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 2500);
}

async function requireAdmin() {
  const me = await AuthService.me();
  if (!me || me.role !== "admin") {
    window.location.href = "connexion-directeur.html";
    return null;
  }
  return me;
}

// label : texte brut utilisé dans les <option> (le HTML n'y est jamais
// interprété par le navigateur, même avec innerHTML) ; icon : utilisée
// uniquement pour l'affichage riche (span) ailleurs dans la carte.
const STATUTS = [
  { value: "nouvelle", label: "Nouvelle", icon: IC.box },
  { value: "en_negociation", label: "En négociation", icon: IC.message },
  { value: "confirmee", label: "Confirmée", icon: IC.check },
  { value: "refusee", label: "Refusée", icon: IC.errorX },
];

function requestCardHtml(r) {
  const statutDef = STATUTS.find(s => s.value === r.statut);
  const statutLabel = statutDef ? `${statutDef.icon} ${statutDef.label}` : r.statut;
  return `
    <div class="pcard" data-id="${r.id}" style="padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;flex-wrap:wrap;">
        <div>
          <div class="pcard-name" style="font-size:1.05rem;">${r.nom} — ${r.tel}</div>
          <div class="pcard-cat">${r.typeEvenement || "Type non précisé"} · ${r.nbPersonnes ? r.nbPersonnes + " pers." : "?"} · ${r.dateEvenement || "date non précisée"}</div>
        </div>
        <span style="font-weight:800;">${statutLabel}</span>
      </div>
      ${r.message ? `<p style="margin:10px 0;color:#4b5563;">${r.message}</p>` : ""}
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px;">
        <select class="form-input tr-statut" data-id="${r.id}" style="max-width:200px;">
          ${STATUTS.map(s => `<option value="${s.value}" ${s.value === r.statut ? "selected" : ""}>${s.label}</option>`).join("")}
        </select>
        <input type="number" min="0" class="form-input tr-prix" data-id="${r.id}" placeholder="Prix proposé (FCFA)" value="${r.prixPropose || ""}" style="max-width:200px;"/>
        <button class="btn-submit tr-save" data-id="${r.id}" style="border:none;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer;">Enregistrer</button>
        <a href="https://wa.me/${(r.tel || "").replace(/[^0-9]/g, "")}" target="_blank" rel="noopener" style="color:#25D366;font-weight:800;text-decoration:none;">${IC.phone} WhatsApp</a>
      </div>
    </div>`;
}

async function render() {
  const list = document.getElementById("traiteur-admin-list");
  try {
    const requests = await ProductService.listTraiteurRequests();
    list.innerHTML = requests.length
      ? requests.map(requestCardHtml).join("")
      : `<p style="text-align:center;color:#9ca3af;font-weight:700;">Aucune demande traiteur pour l'instant.</p>`;

    list.querySelectorAll(".tr-save").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const statut = list.querySelector(`.tr-statut[data-id="${id}"]`).value;
        const prixPropose = list.querySelector(`.tr-prix[data-id="${id}"]`).value;
        try {
          await ProductService.updateTraiteurRequest(id, { statut, prixPropose: prixPropose || null });
          showToast("✅ Demande mise à jour.");
          render();
        } catch (err) {
          showToast(err.message || "Impossible de mettre à jour.", "red");
        }
      });
    });
  } catch (err) {
    list.innerHTML = `<p style="text-align:center;color:#ef4444;font-weight:700;">Erreur de chargement : ${err.message || "réessayez."}</p>`;
  }
}

(async function init() {
  const me = await requireAdmin();
  if (!me) return;
  document.querySelector(".js-admin-logout")?.addEventListener("click", () => {
    AuthService.logout();
    window.location.href = "connexion-directeur.html";
  });
  await render();
})();
