/* ============================================================
   CLO-CLO Backend | pricing.js
   Frais de livraison calculés sur la VRAIE distance à vol
   d'oiseau entre le bar et l'adresse du client (formule de
   Haversine — aucune dépendance externe, aucune clé API).

   ⚠️ Coordonnées du bar à ajuster à l'adresse réelle si besoin
   (actuellement centrées sur Nkolfoulou, Yaoundé).
   ============================================================ */

export const BAR_LOCATION = { lat: 3.9010, lng: 11.5850 }; // Nkolfoulou, Yaoundé (à ajuster précisément)

const TARIF_PAR_KM = 250; // FCFA/km
const FRAIS_MIN = 1000;
const FRAIS_MAX = 2000;

function toRad(deg) { return (deg * Math.PI) / 180; }

/** Distance à vol d'oiseau en kilomètres entre deux points GPS. */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Frais de livraison réels selon la distance, toujours entre 1000 et 2000 FCFA. */
export function computeDeliveryFee(clientLat, clientLng) {
  if (typeof clientLat !== "number" || typeof clientLng !== "number") {
    return { fee: FRAIS_MIN, km: null }; // pas de position fournie → tarif minimum par défaut
  }
  const km = distanceKm(BAR_LOCATION.lat, BAR_LOCATION.lng, clientLat, clientLng);
  const raw = Math.round(km * TARIF_PAR_KM);
  const fee = Math.min(FRAIS_MAX, Math.max(FRAIS_MIN, raw));
  return { fee, km: Math.round(km * 10) / 10 };
}
