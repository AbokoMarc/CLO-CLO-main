/* ============================================================
   CLO-CLO ADMIN | admin-traiteur.js
   ============================================================ */
import { AuthService } from "./services/authService.js";
import { ProductService } from "./services/productService.js";

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

const STATUTS = [
  { value: "nouvelle", label: "🆕 Nouvelle" },
  { value: "en_negociation", label: "💬 En négociation" },
  { value: "confirmee", label: "✅ Confirmée" },
  { value: "refusee", label: "❌ Refusée" },
];

function requestCardHtml(r) {
  const statutLabel = STATUTS.find(s => s.value === r.statut)?.label || r.statut;
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
        <a href="https://wa.me/${(r.tel || "").replace(/[^0-9]/g, "")}" target="_blank" rel="noopener" style="color:#25D366;font-weight:800;text-decoration:none;">📞 WhatsApp</a>
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
