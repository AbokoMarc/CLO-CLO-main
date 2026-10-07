/* ============================================================
   CLO-CLO Frontend | i18n.js  —  Système de langue FR / EN
   ------------------------------------------------------------
   Trois couches, toutes pilotées par UNE seule langue courante
   (sauvegardée dans localStorage « cloclo_lang ») :

   1) KEYS      Clés nommées pour les textes écrits à la main
                (t("wa.aria")), + attributs HTML :
                  data-i18n="clé"            → texte de l'élément
                  data-i18n-attr="placeholder:clé,title:clé"
   2) PHRASES   Dictionnaire FR → EN de tout le texte existant
                (HTML statique ET contenu généré par les scripts).
                Une entrée peut contenir § = valeur variable :
                  "Commande CMD-§ annulée." → "Order CMD-§ cancelled."
   3) DOM       Un MutationObserver traduit tout nœud ajouté plus
                tard (menu, panier, suivi, admin, toasts…). Le texte
                FR d'origine est mémorisé : retour au français exact.

   alert / confirm / prompt sont aussi traduits. Les scripts de
   l'application n'ont PAS besoin d'être modifiés : même logique,
   mêmes API (I18n.init, I18n.toggle, I18n.injectToggle, I18n.current).
   Nouveau : I18n.t(), I18n.tr(), I18n.set(), évènement « cloclo:langchange ».
   ============================================================ */

const STORAGE_KEY = "cloclo_lang";
const SUPPORTED = ["fr", "en"];

/* ───────── 1) CLÉS NOMMÉES ───────── */
const KEYS = {
  fr: {
    "lang.aria": "Changer de langue (français / anglais)",
    "lang.title": "Français / English",
    "wa.aria": "Nous contacter sur WhatsApp",
    "wa.msg": "Bonjour Clo-Clo, j'ai une question",
    "theme.aria": "Changer de thème (clair/sombre)",
    "theme.title": "Mode clair / sombre",
  },
  en: {
    "lang.aria": "Change language (French / English)",
    "lang.title": "Français / English",
    "wa.aria": "Contact us on WhatsApp",
    "wa.msg": "Hello Clo-Clo, I have a question",
    "theme.aria": "Switch theme (light/dark)",
    "theme.title": "Light / dark mode",
  },
};

/* ───────── 2) PHRASES FR → EN ───────── */
const PHRASES = {
  // Navigation & marque
  "Accueil": "Home", "Menu": "Menu", "Suivi": "Tracking", "Traiteur": "Catering",
  "Profil": "Profile", "Panier": "Cart", "Notifications": "Notifications",
  "Bar à Fruits & Délices": "Fruit & Treats Bar", "Clo-Clo Bar à Fruits & Délices": "Clo-Clo Fruit & Treats Bar",
  "Livraisons": "Deliveries", "Adresse": "Address", "Commande": "Order",
  "Clo-Clo Bar à Fruits": "Clo-Clo Fruit Bar",
  "Clo-Clo – Bar à Fruits & Délices": "Clo-Clo – Fruit & Treats Bar",
  "Espace Directeur": "Manager Area", "Espace directeur": "Manager area",
  "Espace Livraison": "Delivery Area", "Espace Livreur": "Driver Area",
  "Clo-Clo Admin": "Clo-Clo Admin", "Clo-Clo Livreur": "Clo-Clo Driver",
  "Se Connecter": "Log In", "Se connecter": "Log in", "Connexion": "Log in",
  "Créer un Compte": "Create Account", "Créer un compte": "Create an account", "Créer mon Compte": "Create my account",
  "S'inscrire": "Sign up", "Nouveau client ?": "New customer?", "Vous avez déjà un compte ?": "Already have an account?",
  "Déconnexion": "Log out", "Mon Profil": "My Profile", "Mon profil": "My profile",
  "Voir le Menu": "View Menu", "Voir le menu": "View menu", "Voir Tout le Menu": "View Full Menu",
  "Commander": "Order now", "Commander maintenant": "Order now", "Commander →": "Order →",
  "Voir le site": "View site", "Voir le site (mode client)": "View site (customer mode)",
  "Retour au site": "Back to site", "← Retour au site": "← Back to site", "← Site client": "← Customer site",
  "Retour au tableau de bord": "Back to dashboard", "Retour au tableau de bord →": "Back to dashboard →",
  "Retour": "Back", "voir →": "see →", "Voir le détail": "View details", "Voir la position": "View location",
  "Accès Livreur": "Driver Access", "Accès Directeur": "Manager Access", "Accès Restreint": "Restricted Access",
  "Réservé au personnel autorisé uniquement": "Reserved for authorized staff only",

  // Accueil
  "Bienvenue chez": "Welcome to", "Bienvenue !": "Welcome!", "À bientôt !": "See you soon!",
  "Découvrez nos délicieux jus de fruits frais, smoothies, glaces et bien plus encore. Commandez en ligne et recevez votre commande rapidement !":
    "Discover our delicious fresh fruit juices, smoothies, ice creams and much more. Order online and get your order delivered fast!",
  "Produits Frais": "Fresh Products", "100% naturel, préparé avec des fruits frais du jour": "100% natural, made with fresh fruit of the day",
  "Livraison Rapide": "Fast Delivery", "Livré chez vous en moins de 30 minutes": "Delivered to your door in under 30 minutes",
  "Programme de Points": "Points Program", "Gagnez des points à chaque commande et profitez de privilèges exclusifs": "Earn points on every order and enjoy exclusive perks",
  "Offres Spéciales": "Special Offers", "Profitez de nos promotions et réductions régulières": "Enjoy our regular promotions and discounts",
  "Nos Produits Populaires": "Our Popular Products", "Produits Populaires": "Popular Products", "Les favoris de nos clients": "Our customers' favorites",
  "Comment ça marche ?": "How it works",
  "Parcourez le Menu": "Browse the Menu", "Explorez notre sélection de jus, smoothies, glaces et salades de fruits": "Explore our selection of juices, smoothies, ice creams and fruit salads",
  "Passez Commande": "Place Your Order", "Ajoutez vos produits favoris au panier et validez votre commande": "Add your favorite items to the cart and confirm your order",
  "Suivez la Livraison": "Track the Delivery", "Recevez votre commande en moins de 30 minutes et suivez-la en temps réel": "Receive your order in under 30 minutes and follow it in real time",
  "Prêt à Commander ?": "Ready to Order?", "Créez votre compte et commencez à gagner des points dès votre première commande !": "Create your account and start earning points from your first order!",
  "Chargement des produits…": "Loading products…", "Aucun produit disponible pour le moment.": "No products available at the moment.",
  "Jus de fruits frais Clo-Clo": "Clo-Clo fresh fruit juice",

  // Pied de page
  "Horaires": "Opening hours", "Contact": "Contact",
  "Lundi - Samedi : 8h – 20h": "Monday - Saturday: 8am – 8pm", "Dimanche : 10h – 18h": "Sunday: 10am – 6pm",
  "Lundi - Samedi": "Monday - Saturday", "Dimanche": "Sunday",
  "Des fruits frais, des jus naturels et des délices glacés pour tous les goûts.": "Fresh fruit, natural juices and icy treats for every taste.",
  "© 2026 Clo-Clo Bar à Fruits & Délices. Tous droits réservés.": "© 2026 Clo-Clo Fruit & Treats Bar. All rights reserved.",
  "Tous droits réservés.": "All rights reserved.",
  "Yaoundé, Cameroun": "Yaoundé, Cameroon", "Nkolfoulou, Yaoundé, Cameroun": "Nkolfoulou, Yaoundé, Cameroon",
  "Nkolfoulou — Yaoundé": "Nkolfoulou — Yaoundé", "Zone de livraison : Nkolfoulou, Yaoundé": "Delivery zone: Nkolfoulou, Yaoundé",

  // Menu / produits
  "Notre Menu": "Our Menu", "Découvrez nos délicieuses créations": "Discover our delicious creations",
  "Tous": "All", "Jus": "Juices", "Smoothies": "Smoothies", "Glaces": "Ice cream", "Salades": "Salads", "Plats": "Dishes",
  "Populaire": "Popular", "Ajouter": "Add", "+ Ajouter": "+ Add", "Ajouter au panier": "Add to cart",
  "Aucun produit dans cette catégorie pour le moment.": "No products in this category yet.",
  "Ajouté !": "Added!", "Article retiré": "Item removed", "Ajouté au panier !": "Added to cart!",
  "Articles ajoutés au panier !": "Items added to cart!", "Recommander": "Reorder",
  "Ces produits ne sont plus disponibles au menu.": "These products are no longer on the menu.",

  // Panier / commande
  "Votre panier est vide": "Your cart is empty", "Votre panier est vide !": "Your cart is empty!", "Votre panier est vide.": "Your cart is empty.",
  "Panier (§)": "Cart (§)", "§ FCFA / unité": "§ FCFA / unit", "Total": "Total", "Total : § FCFA": "Total: § FCFA", "Sous-total : § FCFA": "Subtotal: § FCFA",
  "+ Ajouter des articles": "+ Add more items", "Commander maintenant →": "Order now →",
  "Vous gagnerez ~§ points": "You will earn ~§ points",
  "Connectez-vous pour commander.": "Log in to place an order.",
  "Confirmer la commande": "Confirm order", "Confirmer la commande – Clo-Clo": "Confirm order – Clo-Clo",
  "Confirmer et payer à la livraison": "Confirm and pay on delivery", "Confirmation…": "Confirming…",
  "Commande confirmée !": "Order confirmed!", "Adresse de Livraison": "Delivery Address", "Adresse de livraison": "Delivery address",
  "ADRESSE DE LIVRAISON": "DELIVERY ADDRESS",
  "Quand livrer ?": "When to deliver?", "Maintenant": "Now", "Plus tard aujourd'hui…": "Later today…",
  "Choisissez une heure de livraison.": "Choose a delivery time.",
  "Code promo (facultatif)": "Promo code (optional)", "Code de parrainage (facultatif)": "Referral code (optional)",
  "Frais de livraison estimés :": "Estimated delivery fee:", "Délai estimé :": "Estimated time:",
  "entre 1 000 et 2 000 FCFA selon la distance": "between 1,000 and 2,000 FCFA depending on distance",
  "1 000 FCFA (position non partagée — tarif minimum appliqué)": "1,000 FCFA (location not shared — minimum rate applied)",
  "environ 25 à 45 min selon la distance et le trafic": "about 25 to 45 min depending on distance and traffic",
  "environ 30 à 50 min (estimation par défaut)": "about 30 to 50 min (default estimate)",
  "Mode de Paiement": "Payment Method", "Mes adresses de livraison": "My delivery addresses",
  "— Saisir une nouvelle adresse —": "— Enter a new address —", "Libellé (ex : Maison, Bureau)": "Label (e.g. Home, Office)",
  "Maison": "Home", "Bureau": "Office", "Autre": "Other",
  "+ Ajouter cette adresse": "+ Add this address", "Adresse ajoutée !": "Address added!", "Adresse retirée.": "Address removed.",
  "Aucune adresse enregistrée pour l'instant.": "No saved address yet.", "Quartier": "Neighborhood", "Adresse précise": "Exact address",
  "Adresse précise (repère, rue…)": "Exact address (landmark, street…)", "Quartier et adresse précise sont requis.": "Neighborhood and exact address are required.",
  "Ville et quartier requis.": "City and neighborhood are required.", "Adresse enregistrée (optionnel)": "Saved address (optional)",
  "Géolocalisation non disponible sur cet appareil.": "Geolocation is not available on this device.",
  "Retirer": "Remove", "Retirer cette zone de livraison ?": "Remove this delivery zone?",
  "Points insuffisants (§ / §)": "Not enough points (§ / §)", "Récompense utilisée": "Reward used", "Utiliser": "Use", "✓ Utilisé !": "✓ Used!", "Utilisé !": "Used!",

  // Suivi
  "Suivi de Livraison": "Delivery Tracking", "Suivi de livraison en temps réel": "Real-time delivery tracking",
  "Suivez vos commandes en temps réel": "Follow your orders in real time",
  "Commande en Cours": "Current Order", "Commande en cours": "Current order", "Commandes Récentes": "Recent Orders", "Aucune commande en cours.": "No order in progress.",
  "Aucune commande récente.": "No recent orders.", "Aucune commande pour l'instant": "No orders yet", "Aucune commande pour l'instant.": "No orders yet.",
  "Articles Commandés": "Items Ordered", "ARTICLES": "ITEMS", "Livraison en Cours": "Delivery in Progress",
  "Localisation en direct": "Live location", "En attente de la position du livreur…": "Waiting for the driver's location…",
  "Chargement des positions…": "Loading positions…", "Position partagée avec le client et l'admin": "Location shared with the customer and admin",
  "Livraison démarrée — position partagée.": "Delivery started — location shared.",
  "Partage de position refusé — activez la localisation pour que le client vous suive.": "Location sharing denied — enable location so the customer can follow you.",
  "Arrive dans environ § min (§ km)": "Arriving in about § min (§ km)",
  "Préparation": "Preparing", "Prêt": "Ready", "En Route": "On the way", "Livré": "Delivered", "En Livraison": "Out for delivery",
  "en preparation": "being prepared", "en préparation": "being prepared", "en route": "on the way", "en livraison": "out for delivery",
  "livree": "delivered", "livrée": "delivered", "annulee": "cancelled", "annulée": "cancelled",
  "Annuler ma commande": "Cancel my order", "✕ Annuler ma commande": "✕ Cancel my order", "Annulation…": "Cancelling…",
  "Annuler cette commande ? Cette action est définitive.": "Cancel this order? This action is final.",
  "Commande CMD-§": "Order CMD-§", "Commande CMD-§ : §": "Order CMD-§: §", "Commande CMD-§ annulée.": "Order CMD-§ cancelled.",
  "Commande CMD-§ annulée par le client.": "Order CMD-§ cancelled by the customer.",
  "Le livreur indique avoir livré votre commande.": "The driver says your order has been delivered.",
  "J'ai bien reçu ma commande": "I received my order", "Merci ! En attente de la confirmation finale de l'administrateur.": "Thank you! Awaiting final confirmation from the administrator.",
  "Noter votre livraison": "Rate your delivery", "Un commentaire ? (facultatif)": "A comment? (optional)", "Noter": "Rate", "Merci pour votre retour !": "Thanks for your feedback!",
  "Chat avec le livreur": "Chat with the driver", "Chat avec l'administrateur": "Chat with the administrator", "Chat avec §": "Chat with §",
  "Écrire un message…": "Write a message…", "Écrire à l'admin…": "Write to the admin…", "Écrire…": "Write…", "Envoyer": "Send",
  "Aucun message pour l'instant.": "No messages yet.", "Itinéraire": "Directions",
  "Nouveau message d'un livreur": "New message from a driver", "Nouveau message de l'admin": "New message from the admin",

  // Profil / fidélité
  "Programme de Fidélité": "Loyalty Program", "Programme de fidélité avec récompenses": "Loyalty program with rewards",
  "Points": "Points", "Vos Points": "Your Points", "Points disponibles": "Available points", "Points Gagnés": "Points Earned",
  "Niveau": "Tier", "Niveau Actuel :": "Current Tier:", "Progression du Niveau": "Tier Progress", "Récompenses": "Rewards", "Récompenses Disponibles": "Available Rewards",
  "Historique des Points": "Points History", "Aucun mouvement de points pour l'instant": "No points activity yet", "Bientôt disponible": "Coming soon",
  "Bronze": "Bronze", "Argent": "Silver", "Or": "Gold", "Platine": "Platinum", "Membre Or": "Gold Member",
  "Anniversaire": "Birthday", "Favori": "Favorite", "Votre préféré": "Your favorite", "Offres exclusives et promotions": "Exclusive offers and promotions",
  "Total de commandes": "Total orders", "Note Moyenne": "Average Rating",
  "Parrainez un ami": "Refer a friend", "Chaque ami qui s'inscrit avec votre lien reçoit 100 points bonus — et vous aussi !": "Every friend who signs up with your link gets 100 bonus points — and so do you!",
  "Copier": "Copy", "Partager": "Share", "Partager sur WhatsApp": "Share on WhatsApp", "Lien copié.": "Link copied.", "Impossible de copier le lien.": "Unable to copy the link.",
  "Bonus de parrainage": "Referral bonus", "50 points de bienvenue offerts": "50 welcome points offered",
  "Paramètres": "Settings", "Paramètres du Compte": "Account Settings", "Changer mon mot de passe": "Change my password",
  "Modifications enregistrées !": "Changes saved!", "Mot de passe modifié !": "Password changed!",
  "Bienvenue, § ! Vous avez § pts": "Welcome, §! You have § pts", "§ pts": "§ pts", "§ points": "§ points",
  "Voulez-vous vraiment vous déconnecter ?": "Do you really want to log out?",
  "Sur l'écran d'accueil": "On the home screen",

  // Comptes / formulaires
  "Email": "Email", "Mot de passe": "Password", "Téléphone": "Phone", "Téléphone :": "Phone:", "Nom": "Name", "Nom complet": "Full name", "Nom Complet": "Full Name",
  "Confirmer le mot de passe": "Confirm password", "Mot de passe oublié ?": "Forgot password?", "Se souvenir de moi": "Remember me",
  "Mon mot de passe": "My password", "Nom d'utilisateur": "Username", "Identifiant Livreur": "Driver ID",
  "Accédez à votre compte Clo-Clo": "Access your Clo-Clo account", "Connexion Administrateur": "Administrator Login",
  "Connexion pour les livreurs Clo-Clo": "Login for Clo-Clo drivers", "Connectez-vous pour gérer vos livraisons": "Log in to manage your deliveries",
  "Rejoignez Clo-Clo et gagnez des points": "Join Clo-Clo and earn points", "Avantages de l'inscription :": "Sign-up benefits:",
  "J'accepte les": "I accept the", "conditions d'utilisation": "terms of use", "et la": "and the", "politique de confidentialité": "privacy policy",
  "Création en cours...": "Creating account...", "✓ Connexion réussie !": "✓ Login successful!", "Connexion réussie !": "Login successful!",
  "Le nom est requis.": "Name is required.", "Email invalide.": "Invalid email.", "Le téléphone est requis.": "Phone number is required.",
  "Les deux mots de passe ne correspondent pas.": "The two passwords do not match.",
  "Le serveur se réveille (peut prendre jusqu'à 45s la première fois)…": "The server is waking up (can take up to 45s the first time)…",
  "Impossible de contacter le serveur.": "Unable to reach the server.", "Erreur de chargement : §": "Loading error: §", "Erreur de chargement : §.": "Loading error: §.",
  "Mot de passe actuel :": "Current password:", "Nouveau mot de passe (8 caractères minimum) :": "New password (minimum 8 characters):",
  "Confirmez le nouveau mot de passe :": "Confirm the new password:", "Confirmez votre mot de passe administrateur :": "Confirm your administrator password:",
  "Nom et email sont requis.": "Name and email are required.",

  // Actions génériques
  "Continuer": "Continue", "Annuler": "Cancel", "Confirmer": "Confirm", "Modifier": "Edit", "Enregistrer": "Save", "Supprimer": "Delete",
  "Rechercher": "Search", "Filtrer": "Filter", "Quantité": "Quantity", "Réessayer": "Retry", "Chargement…": "Loading…", "Chargement...": "Loading...",
  "Envoi en cours...": "Sending...", "Envoi en cours…": "Sending…", "Envoi…": "Sending…", "Description": "Description", "Date": "Date", "Statut": "Status", "Statut :": "Status:",
  "Catégorie": "Category", "Prix (FCFA)": "Price (FCFA)", "Courte description": "Short description", "URL de l'image": "Image URL",
  "Ou téléverser depuis votre appareil": "Or upload from your device", "Traitement de l'image…": "Processing image…",
  "Image prête (§ Ko environ).": "Image ready (about § KB).", "Merci de choisir un fichier image.": "Please choose an image file.",
  "Impossible de traiter cette image. Réessayez ou utilisez une URL.": "Unable to process this image. Try again or use a URL.",
  "Produit populaire (mis en avant sur l'accueil)": "Popular product (featured on the homepage)",

  // Traiteur
  "Service Traiteur": "Catering Service", "Service Traiteur – Clo-Clo": "Catering Service – Clo-Clo",
  "Un événement, une réception, un anniversaire ? Décrivez votre besoin, notre équipe vous recontacte pour discuter des quantités et du prix.":
    "An event, a reception, a birthday? Describe your needs and our team will get back to you to discuss quantities and price.",
  "Type d'événement": "Event type", "Mariage": "Wedding", "Deuil": "Funeral", "Réunion / Séminaire": "Meeting / Seminar",
  "Nombre de personnes (estimation)": "Number of people (estimate)", "Date souhaitée": "Preferred date", "Détails (facultatif)": "Details (optional)",
  "Envoyer ma demande": "Send my request", "Votre nom": "Your name",
  "Précisez vos envies : jus, salades de fruits, glaces, plats…": "Tell us what you'd like: juices, fruit salads, ice cream, dishes…",
  "Ex : Nkolfoulou, non loin du carrefour marché": "Ex: Nkolfoulou, near the market junction", "Ex : non loin du carrefour marché": "Ex: near the market junction",
  "✅ Votre demande a bien été envoyée ! Notre équipe vous contactera bientôt pour discuter du prix et des détails.": "✅ Your request has been sent! Our team will contact you soon to discuss price and details.",
  "Demandes envoyées par les clients — répondez et proposez un prix": "Requests sent by customers — reply and propose a price",
  "Aucune demande traiteur pour l'instant.": "No catering requests yet.", "Prix proposé (FCFA)": "Proposed price (FCFA)",
  "En négociation": "In negotiation", "Confirmée": "Confirmed", "Refusée": "Declined", "Nouvelle": "New",
  "Confirmé ! En attente de la confirmation du client et de l'admin.": "Confirmed! Awaiting confirmation from the customer and admin.",
  "✅ Demande mise à jour.": "✅ Request updated.",

  // Livreur
  "Tableau de Bord": "Dashboard", "Gérez vos livraisons en temps réel": "Manage your deliveries in real time",
  "Livraisons Aujourd'hui": "Deliveries Today", "Encaissé Aujourd'hui": "Collected Today", "Livraisons Totales": "Total Deliveries",
  "Pourboires du Jour": "Today's Tips", "Pourboires Gagnés": "Tips Earned", "Pourboire pour le livreur (FCFA)": "Driver tip (FCFA)",
  "Disponible": "Available", "Disponibles": "Available", "Indisponible": "Unavailable", "En livraison": "On delivery", "Hors ligne": "Offline", "Hors Service": "Out of Service",
  "Actif": "Active", "Inactif": "Inactive", "Actif aujourd'hui :": "Active today:", "Ma paie :": "My pay:", "Non définie par l'administrateur": "Not set by the administrator",
  "jour": "day", "mois": "month", "ID:": "ID:", "Changer ma photo": "Change my photo", "Photo de profil mise à jour !": "Profile photo updated!",
  "Livraison Active": "Active Delivery", "Historique": "History", "Mon historique de livraisons": "My delivery history", "Mon historique de livraisons — Clo-Clo": "My delivery history — Clo-Clo",
  "Toutes vos livraisons passées": "All your past deliveries", "Aucune livraison active.": "No active delivery.", "Aucune livraison en attente pour l'instant.": "No pending delivery yet.",
  "Aucune livraison complétée pour l'instant.": "No completed delivery yet.", "Aucune livraison en cours.": "No delivery in progress.", "Aucune livraison.": "No deliveries.",
  "Suivez votre livraison et naviguez vers le client": "Follow your delivery and navigate to the customer",
  "Accepter": "Accept", "Acceptée": "Accepted", "Assignée": "Assigned", "Accepter la livraison": "Accept delivery", "Démarrer la livraison": "Start delivery",
  "Confirmer la livraison": "Confirm delivery", "J'ai livré la commande": "I delivered the order", "Appeler": "Call", "Appeler §": "Call §", "Contacter": "Contact",
  "Livraison acceptée — le chat est maintenant ouvert.": "Delivery accepted — chat is now open.", "Demande acceptée ! Le chat est ouvert.": "Request accepted! Chat is open.",
  "Livraison confirmée et clôturée !": "Delivery confirmed and closed!", "Livraison confirmée — en attente du client et de l'admin": "Delivery confirmed — awaiting customer and admin",
  "En attente côté livreur…": "Waiting on the driver…", "En attente de confirmation : §": "Awaiting confirmation: §",
  "Nouvelle demande de livraison — CMD-§": "New delivery request — CMD-§", "Nouvelle demande — CMD-§": "New request — CMD-§",
  "Livraison en cours — CMD-§": "Delivery in progress — CMD-§", "Nouvelle commande CMD-§ (§ FCFA)": "New order CMD-§ (§ FCFA)",
  "Déclencher une alerte SOS ? L'administrateur et le client seront immédiatement prévenus.": "Trigger an SOS alert? The administrator and the customer will be notified immediately.",
  "Déclencher une alerte SOS ? L'administrateur et le livreur seront immédiatement prévenus.": "Trigger an SOS alert? The administrator and the driver will be notified immediately.",
  "SOS urgence": "SOS emergency", "ALERTE URGENCE": "EMERGENCY ALERT", "ALERTE URGENCE — CMD-§": "EMERGENCY ALERT — CMD-§", "Alerte urgence — CMD-§": "Emergency alert — CMD-§",
  "Alerte envoyée.": "Alert sent.", "Alerte envoyée (sans position).": "Alert sent (without location).",
  "Appeler l'administrateur": "Call the administrator", "Contacter l'administrateur": "Contact the administrator", "Aucune notification pour l'instant.": "No notifications yet.",
  "CHAT AVEC LE CLIENT": "CHAT WITH THE CUSTOMER", "Chat (livreur / client)": "Chat (driver / customer)", "Annulé": "Cancelled", "Annulées": "Cancelled", "Annulées (1)": "Cancelled (1)",
  "Complétées": "Completed", "Complétées (7)": "Completed (7)", "Toutes (8)": "All (8)", "Livré": "Delivered", "Livrées": "Delivered", "Exporter en PDF": "Export as PDF",

  // Admin
  "Clients": "Customers", "Livreurs": "Drivers", "Commandes": "Orders", "Produits": "Products", "Livraisons en Cours": "Ongoing Deliveries",
  "Vue d'ensemble des opérations": "Operations overview", "Vue d'ensemble": "Overview", "Gérez et suivez les livraisons actives": "Manage and follow active deliveries",
  "Commandes Aujourd'hui": "Orders Today", "Clients Actifs": "Active Customers", "Revenus du Jour": "Today's Revenue", "Revenus du Mois": "This Month's Revenue", "Revenus de l'Année": "This Year's Revenue",
  "Revenus Total": "Total Revenue", "Revenus §": "Revenue §", "Revenus de §": "Revenue of §", "Ventes (FCFA)": "Sales (FCFA)", "Ventes de la Semaine": "This Week's Sales",
  "Total Clients": "Total Customers", "Total Livreurs": "Total Drivers", "Total Livraisons": "Total Deliveries", "Gestion des Clients": "Customer Management", "Gestion des Livreurs": "Driver Management",
  "Vue d'ensemble de tous les clients": "Overview of all customers", "Suivi et gestion de l'équipe de livraison": "Track and manage the delivery team",
  "Gestion des Produits": "Product Management", "Ajoutez, modifiez ou retirez des produits du menu": "Add, edit or remove menu items",
  "Ajouter un produit": "Add a product", "+ Ajouter un produit": "+ Add a product", "Ajouter un Livreur": "Add a Driver",
  "Aucun produit. Ajoutez-en un pour commencer.": "No products. Add one to get started.", "Produit ajouté !": "Product added!", "Produit modifié !": "Product updated!", "Produit retiré.": "Product removed.",
  "Marquer indisponible": "Mark unavailable", "Marquer disponible": "Mark available", "Supprimer définitivement": "Delete permanently",
  "Supprimer définitivement \"§\" ? Préférez \"Marquer indisponible\" si vous voulez juste le masquer temporairement — l'historique des commandes passées restera intact.":
    "Permanently delete \"§\"? Prefer \"Mark unavailable\" if you only want to hide it temporarily — past order history will remain intact.",
  "Nom et prix (> 0) sont requis.": "Name and price (> 0) are required.", "Ex : Jus d'Ananas": "Ex: Pineapple Juice",
  "Codes Promo": "Promo Codes", "Réductions applicables au moment du paiement": "Discounts applied at checkout", "Créer un code": "Create a code", "+ Créer un code": "+ Create a code",
  "Aucun code promo pour l'instant.": "No promo codes yet.", "Code promo créé !": "Promo code created!", "Supprimer ce code promo ?": "Delete this promo code?",
  "Code promo (ex: BIENVENUE10) :": "Promo code (e.g. BIENVENUE10):", "Type — tapez \"percent\" (%) ou \"fixed\" (montant fixe) :": "Type — enter \"percent\" (%) or \"fixed\" (fixed amount):",
  "Tapez \"percent\" ou \"fixed\".": "Enter \"percent\" or \"fixed\".", "Pourcentage de réduction (ex: 10) :": "Discount percentage (e.g. 10):", "Montant de réduction en FCFA (ex: 500) :": "Discount amount in FCFA (e.g. 500):",
  "Valeur invalide.": "Invalid value.", "Montant invalide.": "Invalid amount.",
  "Zones de Livraison": "Delivery Zones", "Quartiers proposés au client au moment de la commande": "Neighborhoods offered to the customer when ordering",
  "Aucune zone enregistrée.": "No zone registered.", "Zone ajoutée !": "Zone added!", "Ville (ex: Yaoundé)": "City (e.g. Yaoundé)", "Quartier (ex: Biyem-Assi)": "Neighborhood (e.g. Biyem-Assi)",
  "Aucun client pour l'instant.": "No customers yet.", "Aucun livreur pour l'instant.": "No drivers yet.", "Aucun historique pour l'instant.": "No history yet.",
  "Rechercher par commande, client ou livreur...": "Search by order, customer or driver...", "Rechercher un client par nom, email ou téléphone...": "Search a customer by name, email or phone...",
  "Historique des Livraisons": "Delivery History", "Toutes les livraisons passées": "All past deliveries", "Filtrer par Date": "Filter by Date",
  "ID LIVRAISON": "DELIVERY ID", "COMMANDE": "ORDER", "CLIENT": "CUSTOMER", "LIVREUR": "DRIVER", "DATE & HEURE": "DATE & TIME", "TEMPS": "TIME", "STATUT": "STATUS", "TOTAL": "TOTAL", "ADMIN": "ADMIN",
  "Assigner un livreur…": "Assign a driver…", "Livreur assigné ! En attente de son acceptation.": "Driver assigned! Awaiting their acceptance.", "Livreur créé !": "Driver created!",
  "Matricule : §": "ID: §", "Mot de passe temporaire : §": "Temporary password: §", "Nouveau mot de passe temporaire : §": "New temporary password: §",
  "Communiquez ces identifiants au livreur — ce mot de passe ne sera plus jamais affiché.": "Give these credentials to the driver — this password will never be shown again.",
  "Communiquez-le au client — il ne sera plus jamais affiché.": "Give it to the customer — it will never be shown again.",
  "Mot de passe réinitialisé !": "Password reset!", "Réinitialiser le mot de passe": "Reset password", "Réinitialiser le mot de passe de \"§\" ?": "Reset the password of \"§\"?",
  "Vérifiez d'abord l'identité du client avant de continuer.": "First verify the customer's identity before continuing.",
  "Supprimer définitivement le livreur \"§\" ?": "Permanently delete driver \"§\"?", "Cette action est irréversible.": "This action cannot be undone.", "Livreur supprimé.": "Driver deleted.",
  "Nom du livreur :": "Driver name:", "Véhicule (Moto / Voiture) :": "Vehicle (Motorbike / Car):", "Véhicule": "Vehicle", "Définir la paie": "Set pay", "Paie": "Pay",
  "Montant de la paie § (FCFA) :": "Pay amount § (FCFA):", "Type de paie pour § — tapez \"journalier\" ou \"mensuel\" :": "Pay type for § — enter \"journalier\" (daily) or \"mensuel\" (monthly):", "Paie mise à jour !": "Pay updated!",
  "Coordonnées clients masquées par confidentialité": "Customer details hidden for privacy", "Coordonnées masquées — déverrouillez pour les voir": "Details hidden — unlock to view",
  "Coordonnées déverrouillées pour cette session": "Details unlocked for this session", "Coordonnées déverrouillées.": "Details unlocked.", "Déverrouiller": "Unlock",
  "Généré le §": "Generated on §", "Généré le § à §": "Generated on § at §",

  // Messages renvoyés par le backend (français) — traduits côté client
  "Accès refusé pour ce rôle.": "Access denied for this role.",
  "Authentification requise.": "Authentication required.",
  "Cette commande ne peut plus être annulée : elle est déjà prise en charge par un livreur.": "This order can no longer be cancelled: a driver has already taken it.",
  "Cette livraison ne vous est pas assignée.": "This delivery is not assigned to you.",
  "Champs obligatoires manquants (nom, email, tel, mdp).": "Missing required fields (name, email, phone, password).",
  "Client introuvable.": "Customer not found.",
  "Code de parrainage invalide.": "Invalid referral code.",
  "Code promo invalide (code, type 'percent'/'fixed', value requis).": "Invalid promo code (code, type 'percent'/'fixed' and value required).",
  "Commande introuvable.": "Order not found.",
  "Corps de requête JSON invalide.": "Invalid JSON request body.",
  "Email ou mot de passe incorrect.": "Incorrect email or password.",
  "Identifiants administrateur incorrects.": "Incorrect administrator credentials.",
  "La note doit être un nombre entier entre 1 et 5.": "The rating must be a whole number between 1 and 5.",
  "Le chat n'est disponible qu'une fois la livraison acceptée par le livreur.": "Chat is only available once the driver has accepted the delivery.",
  "Le montant de la paie doit être un nombre positif.": "The pay amount must be a positive number.",
  "Le nouveau mot de passe doit contenir au moins 8 caractères.": "The new password must contain at least 8 characters.",
  "Le panier est vide.": "The cart is empty.",
  "Livreur introuvable.": "Driver not found.",
  "Matricule ou mot de passe incorrect.": "Incorrect ID or password.",
  "Message vide.": "Empty message.",
  "Montant de pourboire invalide.": "Invalid tip amount.",
  "Mot de passe actuel incorrect.": "Incorrect current password.",
  "Nom et téléphone requis pour une demande traiteur.": "Name and phone are required for a catering request.",
  "Nom et téléphone sont requis pour créer un livreur.": "Name and phone are required to create a driver.",
  "Non autorisé pour cette commande.": "Not authorized for this order.",
  "Points insuffisants.": "Not enough points.",
  "Produit introuvable (id §).": "Product not found (id §).",
  "Quartier et adresse requis.": "Neighborhood and address are required.",
  "Récompense indisponible.": "Reward unavailable.",
  "Rôle inconnu.": "Unknown role.",
  "Rôle invalide pour la confirmation.": "Invalid role for confirmation.",
  "Statut invalide. Valeurs autorisées : §.": "Invalid status. Allowed values: §.",
  "Type de paie invalide. Valeurs autorisées : §.": "Invalid pay type. Allowed values: §.",
  "Un compte existe déjà avec cet email.": "An account already exists with this email.",
  "Ville et quartier requis.": "City and neighborhood are required.",
  "Vous devez d'abord accepter cette livraison.": "You must accept this delivery first.",
  "Vous ne pouvez noter qu'une commande déjà livrée.": "You can only rate an order that has already been delivered.",

  // Divers
  "Pas de connexion internet": "No internet connection", "Clo-Clo — Hors ligne": "Clo-Clo — Offline",
  "Cette page n'est pas encore disponible hors-ligne. Reconnectez-vous puis réessayez — vos pages déjà visitées, elles, restent accessibles.":
    "This page is not available offline yet. Reconnect and try again — pages you have already visited remain accessible.",
};

/* Placeholders / attributs : mêmes phrases, résolues via PHRASES + ces ajouts. */
const EXTRA_ATTR = {
  "votre@email.com": "your@email.com", "jean@email.com": "john@email.com", "Jean Dupont": "John Doe",
  "Ex : 6XX XXX XXX": "Ex: 6XX XXX XXX", "Ex : 30": "Ex: 30", "Ex : BIENVENUE10": "Ex: WELCOME10",
  "Ex : CL12 (donné par un ami)": "Ex: CL12 (given by a friend)", "123 Avenue...": "123 Avenue...",
};

/* ───────── Moteur ───────── */
const PREFIX_RE = /^[\s\u00a0✓✅❌✕⭐⏱️+←→↗•·–—\-️]+/u;
const SUFFIX_RE = /[\s\u00a0→←↗]+$/u;
const norm = (s) => s.replace(/’/g, "'").replace(/\s+/g, " ").trim();
const INDEX = new Map();      // clé normalisée → EN (phrases sans §)
const TEMPLATES = [];         // phrases avec § → regex
const REVERSE = new Map();    // EN normalisé → FR (pour revenir au français)

const stripDecor = (x) => norm(x.replace(PREFIX_RE, "").replace(SUFFIX_RE, ""));
for (let [fr, en] of Object.entries({ ...PHRASES, ...EXTRA_ATTR })) {
  const k = stripDecor(fr);
  en = en.replace(PREFIX_RE, "").replace(SUFFIX_RE, "");
  if (k.includes("§")) {
    const re = new RegExp("^" + k.split("§").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.+?)") + "$");
    TEMPLATES.push({ re, en });
  } else {
    if (!INDEX.has(k)) INDEX.set(k, en);
  }
  if (!en.includes("§") && !REVERSE.has(norm(en)) && norm(en) !== k) REVERSE.set(norm(en), stripDecor(fr));
}
TEMPLATES.sort((a, b) => b.re.source.length - a.re.source.length);


function lookupFr(core) {
  const hit = INDEX.get(core);
  if (hit !== undefined) return hit;
  for (const { re, en } of TEMPLATES) {
    const m = core.match(re);
    if (m) {
      let i = 1;
      // les valeurs capturées sont elles-mêmes traduites si connues (statuts, etc.)
      return en.replace(/§/g, () => { const v = m[i++] ?? ""; return INDEX.get(norm(v)) ?? v; });
    }
  }
  return null;
}

/** Traduit une phrase FR → EN (ou EN → FR si lang = fr et phrase anglaise connue). Renvoie null si inconnue. */
function translatePhrase(text, lang) {
  const raw = text;
  const pre = (raw.match(PREFIX_RE) || [""])[0];
  const body = raw.slice(pre.length);
  const suf = (body.match(SUFFIX_RE) || [""])[0];
  const core = norm(body.slice(0, body.length - suf.length));
  if (!core) return null;
  if (lang === "en") {
    const out = lookupFr(core) ?? lookupFr(norm(body));
    return out == null ? null : pre + out + suf;
  }
  const back = REVERSE.get(core);
  return back == null ? null : pre + back + suf;
}

let currentLang = SUPPORTED.includes(localStorage.getItem(STORAGE_KEY)) ? localStorage.getItem(STORAGE_KEY) : "fr";

function t(key, vars) {
  let s = (KEYS[currentLang] && KEYS[currentLang][key]) ?? KEYS.fr[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
  return s;
}

/** Traduit une chaîne libre (toast, dialogue…) selon la langue courante. */
function tr(str) {
  if (typeof str !== "string" || !str) return str;
  return str.split("\n").map((line) => translatePhrase(line, currentLang) ?? line).join("\n");
}

/* — Nœuds texte (original mémorisé pour retour exact au FR) — */
const originalText = new WeakMap();
function translateNode(node) {
  if (!originalText.has(node)) {
    const out = translatePhrase(node.nodeValue, currentLang === "en" ? "en" : "fr");
    if (out == null) return;
    originalText.set(node, currentLang === "en" ? node.nodeValue : out);
  }
  const original = originalText.get(node);
  const target = currentLang === "en" ? translatePhrase(original, "en") : original;
  if (target != null && node.nodeValue !== target) node.nodeValue = target;
}

/* — Attributs — */
const ATTRS = ["placeholder", "title", "aria-label", "alt"];
const originalAttr = new WeakMap();
function translateAttrs(el) {
  for (const a of ATTRS) {
    if (!el.hasAttribute?.(a)) continue;
    const store = originalAttr.get(el) || {};
    if (!(a in store)) {
      const cur = el.getAttribute(a);
      if (translatePhrase(cur, currentLang === "en" ? "en" : "fr") == null) continue;
      store[a] = currentLang === "en" ? cur : translatePhrase(cur, "fr");
      originalAttr.set(el, store);
    }
    const o = store[a];
    el.setAttribute(a, currentLang === "en" ? translatePhrase(o, "en") ?? o : o);
  }
  // Clés explicites : data-i18n / data-i18n-attr
  if (el.dataset?.i18n) el.textContent = t(el.dataset.i18n);
  if (el.dataset?.i18nAttr) {
    el.dataset.i18nAttr.split(",").forEach((pair) => {
      const [attr, key] = pair.split(":").map((x) => x.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  }
}

function walk(root) {
  if (!root) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const tag = n.parentElement?.tagName;
      return tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  let n;
  while ((n = tw.nextNode())) nodes.push(n);
  nodes.forEach(translateNode);
  if (root.querySelectorAll) root.querySelectorAll("[placeholder],[title],[aria-label],[alt],[data-i18n],[data-i18n-attr]").forEach(translateAttrs);
  if (root.nodeType === 1) translateAttrs(root);
}

/* <title> : « Page – Clo-Clo … » traduit par segments */
let originalTitle = null;
function translateTitle() {
  if (originalTitle === null) originalTitle = document.title;
  document.title = currentLang === "en"
    ? originalTitle.split(/(\s[–—-]\s)/).map((p) => translatePhrase(p, "en") ?? p).join("")
    : originalTitle;
}

function refreshToggles() {
  document.querySelectorAll(".lang-toggle").forEach((btn) => {
    btn.querySelectorAll("span").forEach((s) => s.classList.toggle("on", s.dataset.lang === currentLang));
    btn.setAttribute("aria-label", t("lang.aria"));
    btn.title = t("lang.title");
  });
}

function applyLang() {
  document.documentElement.lang = currentLang;
  walk(document.body);
  translateTitle();
  refreshToggles();
  document.dispatchEvent(new CustomEvent("cloclo:langchange", { detail: { lang: currentLang } }));
}

/* alert / confirm / prompt : traduits sans modifier les scripts appelants */
function patchDialogs() {
  if (window.__clocloDialogsPatched) return;
  window.__clocloDialogsPatched = true;
  const wrap = (name) => {
    const native = window[name].bind(window);
    window[name] = (msg, ...rest) => native(tr(String(msg ?? "")), ...rest);
  };
  ["alert", "confirm", "prompt"].forEach(wrap);
}

function ensureToggle() {
  if (document.querySelector(".lang-toggle")) return;
  const host = document.querySelector(".nav-actions, .admin-toolbar, .sidebar-bottom");
  if (host) I18n.injectToggle(host);
  else {
    I18n.injectToggle(document.body);
    document.querySelector(".lang-toggle")?.classList.add("lang-toggle-float");
  }
}

export const I18n = {
  current: () => currentLang,
  supported: SUPPORTED,
  t, tr,
  set(lang) {
    if (!SUPPORTED.includes(lang) || lang === currentLang) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyLang();
    // Montants, dates et données serveur sont formatés à l'affichage : on recharge pour tout
    // aligner, sauf si l'utilisateur a une saisie en cours (formulaire) qu'on ne veut pas perdre.
    const typing = [...document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]), textarea")].some((el) => el.value);
    if (!typing && !window.__clocloNoReload) setTimeout(() => location.reload(), 50);
  },
  toggle() { this.set(currentLang === "fr" ? "en" : "fr"); },
  /** À appeler une fois par page (déjà fait à l'import). */
  init() {
    if (!document.body) { document.addEventListener("DOMContentLoaded", () => this.init()); return; }
    if (this._started) return;
    this._started = true;
    patchDialogs();
    applyLang();
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1) walk(node);
          else if (node.nodeType === 3) translateNode(node);
        });
      }
    }).observe(document.body, { childList: true, subtree: true });
    // Filet de sécurité : si aucune page n'a posé le sélecteur de langue, on le pose nous-mêmes.
    window.addEventListener("load", () => setTimeout(ensureToggle, 1200));
  },
  /** Sélecteur FR | EN (même nom/emplacement qu'avant : navbar, barre admin, sidebar livreur). */
  injectToggle(container) {
    if (!container || container.querySelector(".lang-toggle")) return;
    const btn = document.createElement("button");
    btn.className = "lang-toggle";
    btn.type = "button";
    btn.innerHTML = `<span data-lang="fr">FR</span><span data-lang="en">EN</span>`;
    btn.addEventListener("click", () => this.toggle());
    container.insertBefore(btn, container.firstChild);
    refreshToggles();
  },
};

window.I18n = I18n;
window.t = t;
I18n.init();
