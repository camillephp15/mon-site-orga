# StudyFlow - Application Web d'Organisation (Prépa & École d'Ingénieur)

Application web moderne, fluide et responsive dédiée aux étudiants en classes préparatoires (CPGE) et écoles d'ingénieurs.

---

## ✨ Fonctionnalités Principales

### 1. 📅 Emploi du Temps (EDT) 7 jours & Dashboard
- **Horaires étendus** : de 05h00 à 00h00 (19 heures).
- **Affichage intelligent & responsive** :
  - Sur PC : grille 7 jours complète avec gestion des chevauchements d'événements côte à côte (style Apple Calendar).
  - Sur Mobile : bascule automatique en vue 1 jour avec navigation fluide.
  - **Rond cliquable** devant chaque cours pour le cocher et barrer son libellé.
- **Import ICS automatique et précis** : Importez votre emploi du temps via URL (iCal / Webcal) ou fichier `.ics`. Prise en compte de la date exacte et des horaires début/fin pour positionner chaque cours sur son jour réel.
- **Mini-calendrier plurimestriel (5 mois d'affilée)** : Affiche un bloc de 5 mois consécutifs avec navigation. Les dates de DS, partiels et colles apparaissent uniquement sous forme de pastilles colorées dans les cases des jours.
- **To-Do list du jour** : Ajout rapide de tâches quotidiennes, tags par matière et filtres.

---

### 2. 📚 Fiches Matières (Maths, Physique, Info)
- 3 sous-onglets dédiés : **Mathématiques**, **Physique-Chimie**, **Informatique**.
- **Menus dépliants (accordéons)** pour chaque sous-matière / chapitre.
- **Mémorisation en `sessionStorage`** : L'état ouvert/fermé des menus est conservé lors de la navigation entre les pages, mais se réinitialise (tout fermé) à la fermeture du site.
- **Catégories structurées** :
  - *Maths* : "Exos à faire", "Exos durs / typiques à revoir", "Méthodes et formules à connaître".
  - *Physique & Info* : "Exos à faire", "Méthodes et formules à connaître".
- **Rendu LaTeX en direct** : Écrivez des formules avec `$x^2$` ou `$$\int_a^b f(t) dt$$` prévisualisées instantanément via KaTeX.

---

### 3. 🎯 To-Do List Long Terme (Gestion par catégories)
- **Création dynamique de catégories d'objectifs** (ex: *Projets & TIPE*, *Inscriptions*, *Révisions*...).
- Chaque tâche est obligatoirement rattachée à une catégorie et s'affiche clairement regroupée dans sa section dédiée.
- Compte à rebours dynamique des jours restants (`J-X`), badges de priorité (`🔥 Urgent`, `Normal`), et statut (`À faire`, `En cours`, `Terminé`).

---

### 4. ⚡ Colles & Flashcards
- Organisation par paquets de colles et matières.
- **Importateur de fichier de colles** : Importez un lot complet de flashcards à partir d'un fichier `.txt` ou `.md` (format standard `Question ::: Réponse`, une par ligne).
- **Mode Révision interactif (type Quizlet / Anki)** :
  - Retournement de carte 3D au clic ou avec la touche **[Espace]**.
  - Évaluation : **"Je connais ✅"** `[Flèche Droite]` / **"Je ne connais pas ❌"** `[Flèche Gauche]`.
  - Écran de résumé avec pourcentage de réussite et bouton **"Revoir uniquement les cartes ratées"**.

---

### 5. 🧮 Notes & Semestre (Tableur)
- Tableur de notes structuré en 5 blocs (*Maths*, *Physique*, *Info*, *Soft Skills*, *Projets*).
- **Points bonus (+0, +1, +2)** : Menu déroulant pour chaque note augmentant directement la note de l'épreuve.
- **Règle stricte de validation du semestre** : Le semestre est validé si et seulement si **chacun des 5 blocs a une moyenne $\ge 10.00/20$**. Si un seul bloc est sous 10, le semestre est marqué comme "Non Validé".

---

## 💾 Sauvegarde & Transfert Local (Export / Import JSON)

- **100% Local & Privé** : Toutes les données sont enregistrées directement sur votre appareil dans `localStorage`.
- **Export JSON** : Cliquez sur le bouton **"Données JSON"** en haut à droite > **"Exporter mes données (JSON)"** pour télécharger un fichier de sauvegarde.
- **Import JSON** : Cliquez sur **"Importer mes données (JSON)"** pour restaurer instantanément toutes vos données sur un autre appareil (mobile, autre PC, etc.).

---

## 🚀 Utilisation

Ouvrez simplement le fichier `index.html` dans votre navigateur (Chrome, Edge, Firefox, Safari).
