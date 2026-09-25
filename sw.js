/* ============================================================
   CLO-CLO | sw.js — Service Worker
   Trois rôles :
   1) Rend le site "installable" comme application (Chrome/Edge/
      Android : bouton "Installer" ; iOS Safari : "Ajouter à
      l'écran d'accueil" en plein écran).
   2) Met en cache la coquille de l'app (HTML/CSS/JS/icônes) pour
      un accès hors-ligne réel : les pages déjà visitées
      s'ouvrent instantanément, même sans connexion.
   3) Reçoit les notifications push envoyées par le serveur et
      les affiche même quand l'app est fermée.

   IMPORTANT : les appels /api/... ne sont JAMAIS mis en cache —
   les données (commandes, stock, prix...) doivent toujours être
   fraîches. Seule la coquille statique est mise en cache.
   ============================================================ */

const CACHE_NAME = "cloclo-shell-v3";
const OFFLINE_URL = "/offline.html";

const SHELL_FILES = [
  "/", "/index.html", "/manifest.json", OFFLINE_URL,
  "/admin-clients.html", "/admin-dashboard.html", "/admin-historique.html",
  "/admin-livraisons.html", "/admin-livreurs.html", "/admin-produits.html",
  "/admin.css", "/admin.js", "/app-data.js", "/app.js",
  "/checkout.html", "/checkout.js", "/config.js",
  "/connexion-directeur.html", "/connexion-livreur.html",
  "/connexion.css", "/connexion.html", "/connexion.js",
  "/i18n.js", "/pwa.js",
  "/icons/apple-touch-icon.png", "/icons/icon-128.png", "/icons/icon-144.png",
  "/icons/icon-152.png", "/icons/icon-180.png", "/icons/icon-192.png",
  "/icons/icon-384.png", "/icons/icon-512.png", "/icons/icon-72.png",
  "/icons/icon-96.png", "/icons/icon-maskable-512.png",
  "/inscription.css", "/inscription.html", "/inscription.js",
  "/livreur-dashboard.html", "/livreur-historique.html", "/livreur-livraison.html",
  "/livreur.css", "/livreur.js",
  "/menu.css", "/menu.html", "/menu.js",
  "/profil.css", "/profil.html", "/profil.js",
  "/script.js",
  "/services/adminService.js", "/services/apiClient.js", "/services/authService.js",
  "/services/deliveryService.js", "/services/notificationService.js",
  "/services/orderService.js", "/services/productService.js",
  "/style.css", "/suivi.css", "/suivi.js", "/suivie.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch((err) => console.warn("SW: mise en cache partielle —", err))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Les appels API : toujours réseau, jamais de cache (données vivantes).
  if (url.pathname.startsWith("/api/")) return;

  // Navigation vers une page (l'utilisateur ouvre/recharge une page) :
  // réseau d'abord (contenu à jour), cache en secours, page hors-ligne
  // en dernier recours — jamais de spinner infini.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cloner IMMÉDIATEMENT, avant toute autre opération sur la réponse —
          // un clone tardif ou concurrent provoque "Response body is already used".
          const toCache = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, toCache)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Fichiers statiques (CSS/JS/icônes) : cache d'abord pour un affichage
  // instantané, mise à jour du cache en arrière-plan si le réseau répond.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const toCache = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, toCache)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

/* ── NOTIFICATIONS PUSH (arrivent même app fermée) ── */
self.addEventListener("push", (event) => {
  let data = { title: "Clo-Clo", body: "Nouvelle notification", url: "/" };
  try { data = { ...data, ...event.data.json() }; } catch { /* payload texte simple, on garde les valeurs par défaut */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data: { url: data.url || "/" },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
