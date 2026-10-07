# Refonte blanc-vert + FR/EN — ce qui a changé

## Design (nouveau fichier `theme.css`, chargé en dernier sur les 21 pages)
Palette : vert profond #0F5B2C, vert moyen #4C9A52, fonds blancs / vert très pâle, contours #CFE3CF.
Polices : Bricolage Grotesque (titres) + DM Sans (texte), déjà chargées. Aucune classe ni id n'a été renommé.
Client : navbar blanche, pastilles de catégories, cartes produit (badge prix + « Populaire » + prix en bas + bouton « + » rond),
recherche dans le menu, barre du bas arrondie sur mobile. Admin et livreur : barre latérale blanche, actif en pilule verte.

## Contacts
Pied de page (index, menu, suivi, profil, connexion) : +237 699876628 (lien tel:), alpha.b.35@icloud.com (lien mailto:),
adresse unique « Nkolfoulou, Yaoundé, Cameroun ». WhatsApp flottant : pastille avec le numéro. Source : `config.js`.

## FR / EN (`i18n.js`)
Clés nommées t("clé") + data-i18n, dictionnaire de ~550 phrases avec variables (§), observateur DOM, alert/confirm/prompt traduits,
retour exact au français, sélecteur FR|EN injecté partout (flottant si aucun emplacement). Évènement `cloclo:langchange`.

## Incohérences trouvées et corrigées
1. Police « Nunito » utilisée partout mais jamais chargée → DM Sans.
2. Deux verts différents (CSS #0F6B4D vs 50+ #22c55e codés en dur) → palette unique.
3. Numéro du pied de page : 3 variantes dont un gabarit « 6 XX XXX XXX » ; adresse Yaoundé vs Nkolfoulou → unifiés.
4. Mobile : hamburger ET barre du bas en double → hamburger retiré.
5. Logo de marque absent sur plusieurs pages → logo feuille partout.
6. `admin-traiteur.js` n'importait pas i18n (page ni traduite ni avec bascule) → corrigé.
7. i18n d'origine : correspondance exacte seulement (toasts, textes à variables, titres, attributs non traduits), doublons de clés → réécrit.
8. `sw.js` : traiteur.html/js, admin-traiteur.html/js, widgets.js absents du cache hors-ligne → ajoutés, cache v5.
9. `.dot-orange` utilisé par livreur.js mais jamais défini → ajouté.
10. Toasts masqués par la barre du bas sur mobile ; bouton thème chevauchant WhatsApp → repositionnés.
11. manifest / meta theme-color / offline.html encore dans l'ancienne charte → mis à jour.

## Points laissés « à décider » — maintenant réglés
- `suivie.html` renommé en `suivi.html` (liens, cache hors-ligne mis à jour ; anciennes URL redirigées via vercel.json).
- Les 37 messages d'erreur du backend sont traduits côté client (dictionnaire de `i18n.js`).
- Indices « admin / admin123 » et « driver / driver123 » retirés des pages de connexion.
- Pieds de page ajoutés sur checkout, traiteur et inscription (mêmes contacts). Les espaces admin/livreur restent sans pied de page : ce sont des tableaux de bord à barre latérale.
- Montants et dates suivent la langue du site (`window.CLOCLO_LOCALE`), et la page se recharge au changement de langue pour tout réaligner (sauf saisie en cours).
- Mode sombre : conservé par filtre d'inversion, car des centaines de couleurs sont codées en ligne dans les scripts ; une vraie refonte en variables CSS serait un chantier à part.
