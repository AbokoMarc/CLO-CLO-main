/* ============================================================
   CLO-CLO Frontend | native.js — passerelle avec l'application Android (Capacitor)
   Sur le web (navigateur / PWA) ce module ne fait presque rien. Dans l'APK Capacitor il apporte :
   • de VRAIES notifications push (Firebase Cloud Messaging) : elles arrivent application fermée
     ou téléphone verrouillé, avec son et bannière (canaux Android « cloclo-alerts » / « cloclo-urgent ») ;
   • le GPS du livreur EN ARRIÈRE-PLAN (service de premier plan Android) : la position continue d'être
     envoyée écran verrouillé — impossible avec une simple page web ;
   • l'ouverture de la bonne page au toucher d'une notification.
   Les plugins sont appelés via window.Capacitor (injecté par l'application) : aucun bundler requis.
   ============================================================ */
import { ApiClient } from "./services/apiClient.js";

const cap = window.Capacitor;
export const isNative = !!(cap?.isNativePlatform?.());
const plugin = (name) => (cap?.registerPlugin ? cap.registerPlugin(name) : cap?.Plugins?.[name]);
const TOKEN_KEY = "cloclo_fcm_token";
const say = (msg, color) => { try { window.showToast?.(msg, color); } catch { /* page sans toasts */ } };

let pushStarted = false;

/** Active les notifications natives pour l'utilisateur connecté (à appeler quand une session existe). */
export async function initPush() {
  if (!isNative || pushStarted || !ApiClient.getToken()) return { started: false };
  const Push = plugin("PushNotifications");
  if (!Push) return { started: false };
  pushStarted = true;
  try {
    // Canaux Android 8+ : sans canal « importance haute », la bannière et le son n'apparaissent pas.
    await Push.createChannel?.({ id: "cloclo-alerts", name: "Alertes Clo-Clo", description: "Commandes, livraison, paiements", importance: 4, visibility: 1, sound: "default", vibration: true, lights: true });
    await Push.createChannel?.({ id: "cloclo-urgent", name: "Alertes urgentes", description: "Nouvelle commande, livraison à accepter, livreur arrivé", importance: 5, visibility: 1, sound: "default", vibration: true, lights: true });

    let perm = await Push.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") perm = await Push.requestPermissions();
    if (perm.receive !== "granted") return { started: true, granted: false };

    await Push.addListener("registration", async ({ value }) => {
      try {
        await ApiClient.post("/push/native", { token: value, platform: "android" }, { auth: true });
        localStorage.setItem(TOKEN_KEY, value);
      } catch { /* sera renvoyé au prochain lancement */ }
    });
    await Push.addListener("registrationError", (e) => console.warn("Notifications natives indisponibles :", e?.error || e));
    // Application ouverte : Android n'affiche pas la bannière → on montre un toast dans l'appli.
    await Push.addListener("pushNotificationReceived", (n) => say(`${n.title || ""} ${n.body || ""}`.trim()));
    // Toucher une notification ouvre directement la bonne page (suivi, commande, messagerie…).
    await Push.addListener("pushNotificationActionPerformed", (a) => {
      const url = a?.notification?.data?.url;
      if (url && url.startsWith("/")) location.href = url;
    });
    await Push.register();
    return { started: true, granted: true };
  } catch (e) {
    console.warn("initPush :", e?.message || e);
    return { started: true, granted: false };
  }
}

/** Déconnexion : l'appareil ne doit plus recevoir les alertes de ce compte. */
document.addEventListener("cloclo:logout", () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) ApiClient.post("/push/unsubscribe", { endpoint: `fcm:${token}` }, { auth: true }).catch(() => {});
  localStorage.removeItem(TOKEN_KEY);
});

/**
 * Suivi de position : natif en arrière-plan dans l'APK, navigateur sinon.
 * Même format de retour que navigator.geolocation (coords.latitude, longitude, accuracy, heading, speed).
 * @returns {() => void} fonction d'arrêt
 */
export function watchPosition(onPosition, onError, webOptions = {}) {
  const BG = isNative ? plugin("BackgroundGeolocation") : null;
  if (BG) {
    let watcherId = null, stopped = false;
    BG.addWatcher(
      {
        backgroundTitle: "Livraison en cours",
        backgroundMessage: "Clo-Clo partage votre position avec le client pendant la livraison.",
        requestPermissions: true,
        stale: false,
        distanceFilter: 8,                       // mètres : un point dès 8 m parcourus
      },
      (loc, err) => {
        if (err) {
          if (err.code === "NOT_AUTHORIZED") {
            onError?.({ code: 1 });
            if (confirm("Pour suivre votre livraison écran verrouillé, autorisez la localisation « Toujours » pour Clo-Clo dans les réglages.\\n\\nOuvrir les réglages ?")) BG.openSettings?.();
          } else onError?.({ code: 2 });
          return;
        }
        onPosition({ coords: { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy, heading: loc.bearing ?? null, speed: loc.speed ?? null } });
      }
    ).then((id) => { watcherId = id; if (stopped) BG.removeWatcher({ id }); });
    return () => { stopped = true; if (watcherId !== null) BG.removeWatcher({ id: watcherId }); };
  }
  if (!navigator.geolocation) { onError?.({ code: 2 }); return () => {}; }
  const id = navigator.geolocation.watchPosition(onPosition, onError, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000, ...webOptions });
  return () => navigator.geolocation.clearWatch(id);
}

export const hasGeolocation = () => isNative || !!navigator.geolocation;

export const NativeBridge = { isNative, initPush, watchPosition, hasGeolocation };
window.NativeBridge = NativeBridge;
