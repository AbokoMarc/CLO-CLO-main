/* ============================================================
   CLO-CLO | widgets.js
   Widgets globaux injectés sur TOUTES les pages, indépendamment
   du fichier CSS spécifique chargé par chacune :
     1) Bouton WhatsApp flottant (numéro configurable dans config.js)
     2) Bouton mode sombre / clair (préférence sauvegardée par appareil)

   Chargement : <script src="widgets.js"></script> en script classique
   (pas de type="module"), APRÈS config.js, sur chaque page HTML.

   Note technique sur le mode sombre : le site n'a pas une feuille de
   style unique partagée par toutes les pages (chacune charge son
   propre .css). Plutôt que de réécrire des milliers de lignes CSS
   dans 8 fichiers différents, on applique un filtre d'inversion des
   couleurs sur toute la page (technique standard pour ajouter un
   mode sombre a posteriori sans toucher au design existant), et on
   ré-inverse les images/vidéos pour qu'elles gardent leurs couleurs
   normales. C'est fonctionnel partout immédiatement ; si tu veux un
   thème sombre "dessiné à la main" plus tard, on pourra remplacer
   cette approche par de vraies variables CSS par page.
   ============================================================ */
(function () {
  const THEME_KEY = "cloclo_theme";

  /* ---------- Styles injectés (widgets + mode sombre) ---------- */
  const style = document.createElement("style");
  style.textContent = `
    html[data-theme="dark"] {
      filter: invert(1) hue-rotate(180deg);
      background: #fff;
    }
    html[data-theme="dark"] img,
    html[data-theme="dark"] video,
    html[data-theme="dark"] iframe,
    html[data-theme="dark"] .no-invert {
      filter: invert(1) hue-rotate(180deg);
    }

    #cc-whatsapp-float {
      position: fixed; bottom: 22px; right: 20px; z-index: 9999;
      width: 56px; height: 56px; border-radius: 50%;
      background: #25D366; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25); cursor: pointer; text-decoration: none;
      transition: transform 0.15s ease;
    }
    #cc-whatsapp-float:hover { transform: scale(1.07); }
    #cc-whatsapp-float svg { width: 30px; height: 30px; fill: #fff; }

    #cc-theme-toggle {
      position: fixed; bottom: 22px; right: 86px; z-index: 9999;
      width: 56px; height: 56px; border-radius: 50%;
      background: #1C231D; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25); transition: transform 0.15s ease;
    }
    #cc-theme-toggle:hover { transform: scale(1.07); }
    #cc-theme-toggle svg { width: 26px; height: 26px; stroke: #fff; fill: none; stroke-width: 2; }
    /* Le bouton lui-même ne doit jamais être ré-inversé par le filtre du mode sombre */
    html[data-theme="dark"] #cc-theme-toggle,
    html[data-theme="dark"] #cc-whatsapp-float {
      filter: invert(1) hue-rotate(180deg);
    }

    @media (max-width: 480px) {
      #cc-whatsapp-float { bottom: 16px; right: 14px; width: 50px; height: 50px; }
      #cc-theme-toggle { bottom: 16px; right: 74px; width: 50px; height: 50px; }
    }
  `;
  document.head.appendChild(style);

  /* ---------- Mode sombre : appliqué dès que possible (évite le flash blanc) ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);

  function initThemeToggle() {
    const btn = document.createElement("button");
    btn.id = "cc-theme-toggle";
    btn.setAttribute("aria-label", "Changer de thème (clair/sombre)");
    btn.setAttribute("title", "Mode clair / sombre");

    const sunIcon = `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonIcon = `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

    function refreshIcon() {
      const current = document.documentElement.getAttribute("data-theme");
      btn.innerHTML = current === "dark" ? sunIcon : moonIcon;
    }
    refreshIcon();

    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
      refreshIcon();
    });

    document.body.appendChild(btn);
  }

  /* ---------- Bouton WhatsApp flottant ---------- */
  function initWhatsapp() {
    const number = window.CLOCLO_CONFIG?.WHATSAPP_NUMBER;
    if (!number) return; // pas de numéro configuré → pas de bouton

    const link = document.createElement("a");
    link.id = "cc-whatsapp-float";
    link.href = `https://wa.me/${number}?text=${encodeURIComponent("Bonjour Clo-Clo, j'ai une question 🍹")}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Nous contacter sur WhatsApp");
    link.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 0 0 5.73 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.44-8.42zM12.06 21.6h-.01a9.7 9.7 0 0 1-4.95-1.36l-.35-.21-3.75.98 1-3.66-.23-.38a9.7 9.7 0 0 1-1.49-5.17c0-5.37 4.37-9.74 9.79-9.74a9.73 9.73 0 0 1 6.9 2.86 9.65 9.65 0 0 1 2.86 6.88c0 5.37-4.37 9.74-9.77 9.74zm5.36-7.3c-.29-.15-1.74-.86-2.01-.96-.27-.1-.47-.15-.66.15-.2.29-.76.96-.93 1.16-.17.2-.34.22-.63.07-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.6-.91-2.19-.24-.58-.48-.5-.66-.51h-.56c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.44 0 1.44 1.05 2.83 1.2 3.02.15.2 2.06 3.14 4.99 4.4.7.3 1.24.48 1.67.61.7.22 1.34.19 1.84.12.56-.08 1.74-.71 1.98-1.4.24-.68.24-1.27.17-1.4-.07-.12-.26-.2-.55-.34z"/></svg>`;
    document.body.appendChild(link);
  }

  function init() {
    initThemeToggle();
    initWhatsapp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
