/* ============================================================
   CLO-CLO Frontend | i18n.js
   Bascule de langue FR/EN pour l'ensemble du site.

   Fonctionnement : plutôt que de dupliquer chaque page HTML en
   FR et en EN, ce module traduit le texte visible directement
   dans le navigateur, à partir d'un dictionnaire FR→EN. Il
   observe aussi le DOM (MutationObserver) pour traduire
   automatiquement le contenu ajouté dynamiquement par les autres
   scripts (menu, panier, suivi de commande, tableau de bord…),
   sans avoir à modifier chaque script un par un.

   Le texte original est toujours conservé (data-i18n-fr) pour
   pouvoir revenir au français sans perte ni approximation.
   ============================================================ */

const DICT = {
  // Navigation
  "Accueil": "Home", "Menu": "Menu", "Suivi": "Tracking",
  "Bar à Fruits & Délices": "Fruit & Treats Bar",
  "Clo-Clo Bar à Fruits": "Clo-Clo Fruit Bar",
  "Espace Directeur": "Manager Area", "Espace Livraison": "Delivery Area",
  "Se Connecter": "Log In", "Se connecter": "Log in",
  "Créer un Compte": "Create Account", "Créer un compte": "Create an account",
  "Nouveau client ?": "New customer?",
  "Accès Livreur": "Driver Access", "Accès Directeur": "Manager Access",
  "Déconnexion": "Log out", "Mon Profil": "My Profile", "Mon profil": "My profile",
  "Panier": "Cart", "Commander": "Order now", "Voir le Menu": "View Menu",

  // Actions génériques
  "Ajouter au panier": "Add to cart", "Valider la commande": "Place order",
  "Continuer": "Continue", "Annuler": "Cancel", "Confirmer": "Confirm",
  "Modifier": "Edit", "Enregistrer": "Save", "Retour": "Back",
  "Rechercher": "Search", "Filtrer": "Filter", "Total": "Total",
  "Quantité": "Quantity", "Adresse de Livraison": "Delivery Address",
  "Adresse de livraison": "Delivery address", "Mode de Paiement": "Payment Method",

  // Statuts de commande
  "en preparation": "being prepared", "en livraison": "out for delivery",
  "livree": "delivered", "livrée": "delivered", "annulee": "cancelled", "annulée": "cancelled",
  "Préparation": "Preparing", "Prêt": "Ready", "En Route": "On the way", "Livré": "Delivered",
  "Commande en Cours": "Current Order", "Commandes Récentes": "Recent Orders",
  "Articles Commandés": "Items Ordered",
  "✕ Annuler ma commande": "✕ Cancel my order", "Annulation…": "Cancelling…",

  // Comptes / auth
  "Email": "Email", "Mot de passe": "Password", "Téléphone": "Phone",
  "Nom complet": "Full name", "Confirmer le mot de passe": "Confirm password",
  "🔑 Mon mot de passe": "🔑 My password", "🌐 Voir le site": "🌐 View site",

  // Fidélité
  "Programme de Fidélité": "Loyalty Program", "Points": "Points",
  "Niveau": "Tier", "Récompenses": "Rewards", "Historique des Points": "Points History",

  // Tableau de bord admin/livreur
  "Tableau de Bord": "Dashboard", "Livraisons Aujourd'hui": "Deliveries Today",
  "Encaissé Aujourd'hui": "Collected Today", "Livraisons Totales": "Total Deliveries",
  "Gérez vos livraisons en temps réel": "Manage your deliveries in real time",
  "Disponible": "Available", "En livraison": "On delivery", "Hors ligne": "Offline",
  "Livraison Active": "Active Delivery", "Historique": "History",
  "Ma paie": "My pay", "Non définie par l'administrateur": "Not set by the administrator",
  "jour": "day", "mois": "month",
};

const STORAGE_KEY = "cloclo_lang";
let currentLang = localStorage.getItem(STORAGE_KEY) || "fr";

// Mémorise le texte FR d'origine de chaque nœud traduit, pour pouvoir
// revenir au français à l'identique après un passage en anglais (le
// dictionnaire ne connaît que le sens FR → EN, jamais l'inverse).
const originalText = new WeakMap();

function translateNode(node) {
  if (!originalText.has(node)) {
    const trimmed = node.nodeValue.trim();
    if (!trimmed || !DICT[trimmed]) return; // rien à traduire, on ignore ce nœud
    originalText.set(node, node.nodeValue);
  }
  const original = originalText.get(node);
  const trimmed = original.trim();
  const leading = original.slice(0, original.indexOf(trimmed));
  const trailing = original.slice(original.indexOf(trimmed) + trimmed.length);
  node.nodeValue = leading + (currentLang === "en" ? DICT[trimmed] : trimmed) + trailing;
}

function walk(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const tag = n.parentElement?.tagName;
      if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(translateNode);
}

function applyLang() {
  document.documentElement.lang = currentLang;
  walk(document.body);
  document.querySelectorAll(".lang-toggle").forEach((btn) => {
    btn.textContent = currentLang === "fr" ? "🇬🇧 EN" : "🇫🇷 FR";
  });
}

export const I18n = {
  current: () => currentLang,
  toggle() {
    currentLang = currentLang === "fr" ? "en" : "fr";
    localStorage.setItem(STORAGE_KEY, currentLang);
    applyLang();
  },
  /** À appeler une fois par page pour activer la traduction + le suivi du contenu dynamique. */
  init() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", () => this.init());
      return;
    }
    applyLang();
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) walk(node);
          else if (node.nodeType === Node.TEXT_NODE) translateNode(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },
  /** Injecte un petit bouton de bascule FR/EN dans le conteneur donné (ex: la navbar). */
  injectToggle(container) {
    if (!container || container.querySelector(".lang-toggle")) return;
    const btn = document.createElement("button");
    btn.className = "lang-toggle";
    btn.type = "button";
    btn.title = "Français / English";
    Object.assign(btn.style, {
      background: "white", border: "1.5px solid #e5e7eb", borderRadius: "8px",
      padding: "6px 10px", fontFamily: "'Nunito', sans-serif", fontWeight: "800",
      fontSize: "0.8rem", cursor: "pointer",
    });
    btn.textContent = currentLang === "fr" ? "🇬🇧 EN" : "🇫🇷 FR";
    btn.addEventListener("click", () => this.toggle());
    container.insertBefore(btn, container.firstChild);
  },
};

I18n.init();
