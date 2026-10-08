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
  /* Langue courante (même clé que i18n.js) — widgets.js est un script classique,
     il lit donc la préférence directement et se met à jour sur « cloclo:langchange ». */
  const WTXT = {
    fr: { waAria: "Nous contacter sur WhatsApp", waMsg: "Bonjour Clo-Clo, j'ai une question", themeAria: "Changer de thème (clair/sombre)", themeTitle: "Mode clair / sombre" },
    en: { waAria: "Contact us on WhatsApp", waMsg: "Hello Clo-Clo, I have a question", themeAria: "Switch theme (light/dark)", themeTitle: "Light / dark mode" },
  };
  const wl = () => (localStorage.getItem("cloclo_lang") === "en" ? "en" : "fr");

  /* ---------- Image de secours locale (aucune dépendance réseau) ----------
     Remplace via.placeholder.com, qui peut être injoignable selon le réseau
     et fait planter le service worker (fetch échoué → pas de Response). */
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160">
    <rect width="100%" height="100%" fill="#0F5B2C"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="22" font-weight="bold"
          fill="#ffffff" text-anchor="middle" dominant-baseline="middle">Clo-Clo</text>
  </svg>`;
  window.CLOCLO_IMG_FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent(fallbackSvg);

  /* ---------- Styles injectés (widgets + mode sombre) ---------- */
  const style = document.createElement("style");
  style.textContent = `

    #cc-whatsapp-float {
      position: fixed; bottom: 22px; right: 20px; z-index: 9999;
      width: 56px; height: 56px; border-radius: 50%;
      background: #25D366; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25); cursor: pointer; text-decoration: none;
      transition: transform 0.15s ease;
    }
    #cc-whatsapp-float:hover { transform: scale(1.07); }
    #cc-whatsapp-float svg { width: 28px; height: 28px; fill: #fff; flex-shrink: 0; }
    #cc-whatsapp-float .cc-wa-ico { display: flex; }

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

    @media (max-width: 480px) {
      #cc-whatsapp-float { bottom: 16px; right: 14px; width: 50px; height: 50px; }
      #cc-theme-toggle { bottom: 16px; right: 74px; width: 50px; height: 50px; }
    }

    .cc-bottom-nav {
      display: none;
    }
    @media (max-width: 768px) {
      .cc-bottom-nav {
        display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 9998;
        background: #ffffff; border-top: 1px solid #e5e7eb;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
      }
      html[data-theme="dark"] .cc-bottom-nav { background: #111827; border-top-color: #1f2937; }
      .cc-bottom-nav-item {
        flex: 1; display: flex; flex-direction: column; align-items: center;
        gap: 2px; padding: 8px 4px 6px; text-decoration: none; color: #9ca3af;
        font-size: 0.68rem; font-weight: 700;
      }
      .cc-bottom-nav-item svg {
        width: 22px; height: 22px; fill: none; stroke: currentColor;
        stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
      }
      .cc-bottom-nav-item.cc-active { color: #0F5B2C; }
      /* Laisse de la place en bas de page pour que la barre fixe ne
         recouvre jamais le dernier bloc de contenu (footer, boutons…). */
      body.cc-has-bottom-nav {
        padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
      }
      /* Les boutons flottants (WhatsApp / thème) remontent au-dessus de
         la nouvelle barre plutôt que de passer dessous. */
      body.cc-has-bottom-nav #cc-whatsapp-float,
      body.cc-has-bottom-nav #cc-theme-toggle {
        bottom: calc(70px + env(safe-area-inset-bottom, 0px));
      }
    }
  `;
  document.head.appendChild(style);

  /* ---------- Barre de navigation mobile (bas d'écran, façon app) ----------
     Le CSS du site masque .nav-links sous 768px sans jamais proposer
     d'alternative : sur mobile, Accueil/Menu/Suivi/Traiteur étaient
     tout simplement inaccessibles. On reprend ces mêmes liens (icône +
     libellé) pour construire une barre fixe en bas de l'écran, sans
     toucher aux fichiers HTML qui dupliquent la navbar. */
  /* Certaines pages (traiteur…) n'ont pas d'icône dans la barre du haut : on en fournit une par défaut. */
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const FALLBACK_ICONS = {
    "index.html": svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
    "menu.html": svg('<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>'),
    "suivi.html": svg('<path d="M12 21s7-5.6 7-11a7 7 0 0 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    "traiteur.html": svg('<path d="M6 13a4 4 0 0 1 2-7 4 4 0 0 1 8 0 4 4 0 0 1 2 7v6H6z"/><line x1="6" y1="17" x2="18" y2="17"/>'),
    "profil.html": svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  };

  function initMobileNav() {
    const nav = document.querySelector("nav");
    const links = nav?.querySelectorAll(".nav-links > li > a");
    if (!nav || !links || !links.length || document.querySelector(".cc-bottom-nav")) return;

    const path = window.location.pathname.split("/").pop() || "index.html";
    const bar = document.createElement("div");
    bar.className = "cc-bottom-nav";
    links.forEach((a) => {
      const href = a.getAttribute("href") || "#";
      const hrefFile = href.split("/").pop();
      const isActive = hrefFile === path || (hrefFile === "index.html" && (path === "" || path === "index.html"));
      const icon = a.querySelector("svg")?.outerHTML || FALLBACK_ICONS[hrefFile] || "";
      const label = a.textContent.trim();
      const item = document.createElement("a");
      item.href = href;
      item.className = "cc-bottom-nav-item" + (isActive ? " cc-active" : "");
      item.innerHTML = `${icon}<span>${label}</span>`;
      bar.appendChild(item);
    });
    document.body.appendChild(bar);
    document.body.classList.add("cc-has-bottom-nav");
  }

  /* ---------- Mode sombre : appliqué dès que possible (évite le flash blanc) ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);

  function initThemeToggle() {
    const btn = document.createElement("button");
    btn.id = "cc-theme-toggle";
    btn.setAttribute("aria-label", WTXT[wl()].themeAria);
    btn.setAttribute("title", WTXT[wl()].themeTitle);

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

    // Pages client : le bouton thème vit dans la barre du haut (plus rien de flottant qui recouvre les formulaires).
    // Espaces admin / livreur : il reste flottant (CSS le range dans la barre supérieure sur mobile).
    const slot = document.querySelector("nav .nav-actions");
    if (slot) { btn.classList.add("cc-theme-inline"); slot.insertBefore(btn, slot.querySelector(".lang-toggle")?.nextSibling || slot.firstChild); }
    else document.body.appendChild(btn);
  }

  /* ---------- Bouton WhatsApp flottant ---------- */
  function initWhatsapp() {
    const number = window.CLOCLO_CONFIG?.WHATSAPP_NUMBER;
    if (!number) return; // pas de numéro configuré → pas de bouton
    // Le bouton WhatsApp s'adresse aux CLIENTS : inutile (et gênant) dans les espaces admin / livreur.
    if (/admin-|livreur|directeur/.test(location.pathname)) return;

    const link = document.createElement("a");
    link.id = "cc-whatsapp-float";
    const display = window.CLOCLO_CONFIG?.CONTACT_PHONE_DISPLAY || "+" + number;
    const refresh = () => {
      // api.whatsapp.com : fonctionne avec WhatsApp, WhatsApp Business et dans les navigateurs intégrés
      // (Facebook, Instagram, WebView de l'application) où wa.me échoue parfois.
      link.href = `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(WTXT[wl()].waMsg)}`;
      link.setAttribute("aria-label", `${WTXT[wl()].waAria} (${display})`);
      link.title = `WhatsApp ${display}`;
    };
    document.addEventListener("cloclo:langchange", () => {
      refresh();
      const tb = document.getElementById("cc-theme-toggle");
      if (tb) { tb.setAttribute("aria-label", WTXT[wl()].themeAria); tb.setAttribute("title", WTXT[wl()].themeTitle); }
    });
    // Sur téléphone : si WhatsApp ne s'est pas ouvert au bout de 2,5 s, on propose le numéro (copier / appeler).
    link.addEventListener("click", () => {
      if (!/Android|iPhone|iPad/i.test(navigator.userAgent)) return;
      setTimeout(() => {
        if (document.hidden || document.getElementById("cc-wa-help")) return;
        const box = document.createElement("div");
        box.id = "cc-wa-help"; box.setAttribute("role", "status");
        box.innerHTML = `<span>${wl() === "en" ? "WhatsApp did not open?" : "WhatsApp ne s'ouvre pas ?"} <b>${display}</b></span>
          <a href="tel:+${number}">${wl() === "en" ? "Call" : "Appeler"}</a><button type="button">${wl() === "en" ? "Copy" : "Copier"}</button>`;
        box.querySelector("button").onclick = () => { navigator.clipboard?.writeText(display); box.remove(); };
        document.body.appendChild(box);
        setTimeout(() => box.remove(), 9000);
      }, 2500);
    });
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    refresh();
    link.innerHTML = `<span class="cc-wa-ico"><svg viewBox="0 0 24 24"><path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 0 0 5.73 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.44-8.42zM12.06 21.6h-.01a9.7 9.7 0 0 1-4.95-1.36l-.35-.21-3.75.98 1-3.66-.23-.38a9.7 9.7 0 0 1-1.49-5.17c0-5.37 4.37-9.74 9.79-9.74a9.73 9.73 0 0 1 6.9 2.86 9.65 9.65 0 0 1 2.86 6.88c0 5.37-4.37 9.74-9.77 9.74zm5.36-7.3c-.29-.15-1.74-.86-2.01-.96-.27-.1-.47-.15-.66.15-.2.29-.76.96-.93 1.16-.17.2-.34.22-.63.07-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.6-.91-2.19-.24-.58-.48-.5-.66-.51h-.56c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.44 0 1.44 1.05 2.83 1.2 3.02.15.2 2.06 3.14 4.99 4.4.7.3 1.24.48 1.67.61.7.22 1.34.19 1.84.12.56-.08 1.74-.71 1.98-1.4.24-.68.24-1.27.17-1.4-.07-.12-.26-.2-.55-.34z"/></svg></span><span class="cc-wa-num">${display}</span>`;
    document.body.appendChild(link);
  }

  /* Les boutons flottants se retirent quand on descend dans la page (ils ne cachent plus le contenu)
     et reviennent dès qu'on remonte ou qu'on s'arrête. */
  function initFloatAutoHide() {
    let last = window.scrollY, ticking = false;
    const set = (hide) => document.querySelectorAll("#cc-whatsapp-float, #cc-theme-toggle").forEach((el) => el.classList.toggle("cc-float-hidden", hide));
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - last) > 8) set(y > last && y > 120);
        last = y; ticking = false;
      });
    }, { passive: true });
    window.addEventListener("touchend", () => setTimeout(() => set(false), 900), { passive: true });
  }

  function init() {
    initFloatAutoHide();
    initMobileNav();
    initThemeToggle();
    initWhatsapp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
