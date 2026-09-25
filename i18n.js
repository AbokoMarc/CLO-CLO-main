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

  // Espace Directeur (Manager Area)
  "Manager Area": "Manager Area", "Connexion Administrateur": "Administrator Login",
  "Accès Restreint": "Restricted Access", "Réservé au personnel autorisé uniquement": "Reserved for authorized staff only",
  "Nom d'utilisateur": "Username", "Retour au site": "Back to site", "Espace Livreur": "Delivery Area",
  "Demo : admin / admin123": "Demo: admin / admin123",

  // Gestion des produits
  "Gestion des Produits": "Product Management",
  "Ajoutez, modifiez ou retirez des produits du menu": "Add, edit or remove menu items",
  "Ajouter un produit": "Add a product", "Chargement…": "Loading…", "Chargement...": "Loading...",
  "Codes Promo": "Promo Codes", "Réductions applicables au moment du paiement": "Discounts applied at checkout",
  "Créer un code": "Create a code", "Aucun code promo pour l'instant.": "No promo codes yet.",
  "Zones de Livraison": "Delivery Zones",
  "Quartiers proposés au client au moment de la commande": "Neighborhoods offered to the customer when ordering",
  "Ajouter": "Add",
  "Nom": "Name", "Catégorie": "Category", "Prix (FCFA)": "Price (FCFA)",
  "Courte description": "Short description", "URL de l'image": "Image URL",
  "Ou téléverser depuis votre appareil": "Or upload from your device",
  "Produit populaire (mis en avant sur l'accueil)": "Popular product (featured on the homepage)",
  "Jus": "Juice", "Smoothies": "Smoothies", "Glaces": "Ice cream", "Salades": "Salads", "Plats": "Dishes",
  "Marquer indisponible": "Mark unavailable", "Marquer disponible": "Mark available",
  "Supprimer définitivement": "Delete permanently",
  "Disponible": "Available", "Indisponible": "Unavailable",

  // Historique des livraisons (admin)
  "Historique des Livraisons": "Delivery History", "Toutes les livraisons passées": "All past deliveries",
  "Total Livraisons": "Total Deliveries", "Livrées": "Delivered", "Annulées": "Cancelled",
  "Revenus Total": "Total Revenue", "Tous": "All",
  "Filtrer par Date": "Filter by Date", "Exporter en PDF": "Export as PDF",
  "ID": "ID", "COMMANDE": "ORDER", "CLIENT": "CUSTOMER", "LIVREUR": "DRIVER", "DATE": "DATE",

  // Pied de page
  "Horaires": "Hours", "Contact": "Contact",
  "Lundi - Samedi": "Monday - Saturday", "Dimanche": "Sunday",
  "Clo-Clo Fruit Bar": "Clo-Clo Fruit Bar",
  "Des fruits frais, des jus naturels et des délices glacés pour tous les goûts.":
    "Fresh fruit, natural juices and icy treats for every taste.",
  "Tous droits réservés.": "All rights reserved.",
};

// Traductions des placeholders de champs — le DOM walker ci-dessous ne
// couvre que le texte visible, pas les attributs, d'où ce dictionnaire à part.
const PLACEHOLDER_DICT = {
  "Rechercher par commande, client ou livreur...": "Search by order, customer or driver...",
  "Ex : Jus d'Ananas": "Ex: Pineapple Juice",
  "Courte description": "Short description",
  "https://...": "https://...",
  "1500": "1500",
  "Ville (ex: Yaoundé)": "City (e.g. Yaoundé)",
  "Quartier (ex: Biyem-Assi)": "Neighborhood (e.g. Biyem-Assi)",
  "Ex : 6XX XXX XXX": "Ex: 6XX XXX XXX",
  "Ex : 30": "Ex: 30",
  "Précisez vos envies : jus, salades de fruits, glaces, plats…":
    "Tell us what you'd like: juices, fruit salads, ice cream, dishes…",
  "Jean Dupont": "John Doe",
  "jean@email.com": "john@email.com",
  "+237 6 XX XXX XXX": "+237 6 XX XXX XXX",
  "123 Avenue...": "123 Avenue...",
  "Ex : CL12 (donné par un ami)": "Ex: CL12 (given by a friend)",
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

const originalPlaceholder = new WeakMap();

function translatePlaceholder(el) {
  if (!originalPlaceholder.has(el)) {
    const current = el.getAttribute("placeholder");
    if (!current || !PLACEHOLDER_DICT[current]) return;
    originalPlaceholder.set(el, current);
  }
  const original = originalPlaceholder.get(el);
  el.setAttribute("placeholder", currentLang === "en" ? PLACEHOLDER_DICT[original] : original);
}

function walkPlaceholders(root) {
  const els = root.querySelectorAll ? root.querySelectorAll("[placeholder]") : [];
  els.forEach(translatePlaceholder);
  if (root.nodeType === Node.ELEMENT_NODE && root.hasAttribute?.("placeholder")) {
    translatePlaceholder(root);
  }
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
  walkPlaceholders(root);
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
