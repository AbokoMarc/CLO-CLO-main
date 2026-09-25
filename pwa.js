/* ============================================================
   CLO-CLO Frontend | pwa.js
   Enregistre le Service Worker, gère le bouton "Installer"
   (Android/Chrome/Edge/PC) et l'abonnement aux notifications
   push. Importé par toutes les pages (client, admin, livreur).

   iOS/Safari : il n'existe pas d'évènement "proposer
   l'installation" comme sur Chrome — l'utilisateur doit utiliser
   manuellement Partager → "Sur l'écran d'accueil". On affiche
   alors une petite bannière d'instructions au lieu d'un bouton.
   ============================================================ */
const API_BASE_URL = window.CLOCLO_CONFIG?.API_BASE_URL || "http://localhost:4000/api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export const PWA = {
  deferredInstallPrompt: null,

  /** Enregistre le Service Worker (installabilité + cache hors-ligne + push). */
  async registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return null;
    try {
      return await navigator.serviceWorker.register("/sw.js");
    } catch (err) {
      console.warn("Service Worker non enregistré :", err.message);
      return null;
    }
  },

  /** Capture l'évènement Chrome/Edge/Android qui permet de déclencher
      l'installation par programme (bouton personnalisé dans l'UI). */
  listenForInstallPrompt(onAvailable) {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      onAvailable?.();
    });
    window.addEventListener("appinstalled", () => {
      this.deferredInstallPrompt = null;
    });
  },

  isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  },

  isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  },

  async promptInstall() {
    if (!this.deferredInstallPrompt) return false;
    this.deferredInstallPrompt.prompt();
    const { outcome } = await this.deferredInstallPrompt.userChoice;
    this.deferredInstallPrompt = null;
    return outcome === "accepted";
  },

  /** Injecte un bouton "📲 Installer l'app" quand c'est possible (Chrome/Edge/
      Android/PC), ou une bannière d'instructions manuelles sur iOS Safari. */
  injectInstallButton(container) {
    if (!container || this.isStandalone()) return;

    if (this.isIos()) {
      if (container.querySelector(".pwa-ios-hint") || localStorage.getItem("cloclo_ios_hint_dismissed")) return;
      const hint = document.createElement("div");
      hint.className = "pwa-ios-hint";
      hint.innerHTML = `📲 Installez Clo-Clo : appuyez sur <b>Partager</b> puis <b>"Sur l'écran d'accueil"</b> <button aria-label="Fermer" style="background:none;border:none;color:inherit;font-weight:900;cursor:pointer;margin-left:8px;">✕</button>`;
      Object.assign(hint.style, {
        position: "fixed", bottom: "0", left: "0", right: "0", zIndex: "9997",
        background: "#1a1a2e", color: "white", textAlign: "center",
        padding: "10px 14px", fontFamily: "'Nunito', sans-serif", fontWeight: "700",
        fontSize: "0.8rem",
      });
      hint.querySelector("button").addEventListener("click", () => {
        hint.remove();
        localStorage.setItem("cloclo_ios_hint_dismissed", "1");
      });
      document.body.appendChild(hint);
      return;
    }

    const btn = document.createElement("button");
    btn.className = "pwa-install-btn";
    btn.textContent = "📲 Installer l'app";
    btn.style.display = "none";
    Object.assign(btn.style, {
      background: "white", border: "1.5px solid #e5e7eb", borderRadius: "8px",
      padding: "7px 14px", fontFamily: "'Nunito', sans-serif", fontWeight: "800",
      fontSize: "0.8rem", cursor: "pointer",
    });
    container.appendChild(btn);
    btn.addEventListener("click", async () => {
      const installed = await this.promptInstall();
      if (installed) btn.remove();
    });
    this.listenForInstallPrompt(() => { btn.style.display = ""; });
  },

  /** Abonne l'utilisateur connecté aux notifications push (arrivent même app
      fermée). Demande la permission navigateur si nécessaire. */
  async subscribeToPush(getToken) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    const token = getToken();
    if (!token) return false;

    if (Notification.permission === "denied") return false;
    if (Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return false;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const res = await fetch(`${API_BASE_URL}/push/vapid-public-key`);
        const { publicKey } = await res.json();
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await fetch(`${API_BASE_URL}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      return true;
    } catch (err) {
      console.warn("Abonnement push impossible :", err.message);
      return false;
    }
  },
};

PWA.registerServiceWorker();
