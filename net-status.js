/* ============================================================
   CLO-CLO Frontend | net-status.js
   Affiche sur un bouton ce qui se passe quand le réseau est lent :
   « Le serveur se réveille… », « nouvelle tentative 2/3… ».
   Usage : const stop = watchNetwork(btn, "Connexion en cours…"); … stop();
   ============================================================ */
export function watchNetwork(btn, baseLabel) {
  if (!btn) return () => {};
  const on = (e) => {
    const { phase, attempt, total } = e.detail || {};
    if (phase === "slow") btn.textContent = "Le serveur se réveille… patientez (jusqu'à 45 s)";
    else if (phase === "retry") btn.textContent = `Réseau lent — nouvelle tentative ${Math.min(attempt + 1, total)}/${total}…`;
    else if (phase === "ok") btn.textContent = baseLabel;
  };
  document.addEventListener("cloclo:api-status", on);
  return () => document.removeEventListener("cloclo:api-status", on);
}
