# 📋 Gestionnaire de Tâches

Une application web complète de gestion de tâches avec vues multiples, rappels intelligents, et fonctionnalités avancées.

## 🚀 Démarrage Rapide

1. Téléchargez ou clonez ce dépôt
2. Ouvrez le fichier `index.html` dans votre navigateur
3. Commencez à créer vos tâches !

Aucune installation ou serveur requis - l'application fonctionne entièrement dans votre navigateur.

## ✨ Fonctionnalités Principales

### Gestion des Tâches
- ✅ Création, modification et suppression de tâches
- ✅ Priorités (Critique, Haute, Moyenne, Basse)
- ✅ Statuts personnalisables (À faire, En cours, En attente, Terminé)
- ✅ Dates d'échéance avec alertes visuelles
- ✅ Catégories colorées personnalisables
- ✅ Assignation de contacts multiples

### Vues Multiples
- **📊 Kanban** : Tableau avec colonnes par statut et drag & drop
- **📝 Liste** : Vue détaillée avec filtres avancés
- **📅 Calendrier** : Visualisation mensuelle des tâches
- **📈 Tableau de Bord** : Statistiques et graphiques
- **📦 Archive** : Archivage automatique des tâches terminées

### Fonctionnalités Avancées
- 🔔 **Rappels intelligents** avec notifications navigateur
- ♻️ **Tâches récurrentes** (quotidiennes, hebdomadaires, mensuelles)
- 🔗 **Dépendances** entre tâches
- 💬 **Système de commentaires**
- 📊 **Rapports PDF** hebdomadaires et mensuels
- 🔗 **Partage avec QR Code**
- ⌨️ **Raccourcis clavier**
- 📦 **Archivage automatique** après 30 jours

### Export & Import
- 📄 Export en **CSV** (compatible Excel)
- 📋 Export en **JSON** (sauvegarde complète)
- 📕 Export en **PDF** (rapports détaillés)
- 📤 Import de fichiers JSON/CSV par glisser-déposer

### Personnalisation
- 🎨 5 thèmes prédéfinis (Clair, Sombre, Bleu, Vert, Violet)
- 🎨 Créateur de thème personnalisé
- 💾 Sauvegarde automatique dans le navigateur

## 📋 Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl + N` | Nouvelle tâche |
| `Ctrl + F` | Rechercher |
| `Ctrl + K` | Gérer les contacts |
| `Ctrl + E` | Exporter |
| `Ctrl + I` | Importer |
| `Ctrl + S` | Partager |
| `Échap` | Fermer les modals |

## 🛠️ Technologies Utilisées

- **HTML5** - Structure sémantique
- **CSS3** - Design moderne et responsive
- **JavaScript (Vanilla)** - Logique applicative
- **localStorage** - Persistance des données
- **jsPDF** - Génération de PDF
- **QRCode.js** - Génération de QR Codes

## 📱 Compatibilité

- ✅ Chrome / Edge (recommandé)
- ✅ Firefox
- ✅ Safari
- ✅ Responsive (mobile, tablette, desktop)

## 📚 Utilisation

### Créer une Tâche
1. Cliquez sur **"+ Nouvelle Tâche"** ou appuyez sur `Ctrl+N`
2. Remplissez les informations (nom, description, date, etc.)
3. Sélectionnez une priorité et une catégorie
4. Ajoutez des rappels si nécessaire
5. Cliquez sur **"Enregistrer"**

### Gérer les Contacts
1. Cliquez sur l'icône **👤** ou appuyez sur `Ctrl+K`
2. Ajoutez des contacts avec nom, email et téléphone
3. Assignez-les aux tâches lors de la création

### Exporter vos Données
1. Cliquez sur **"💾 Exporter"**
2. Choisissez le format (CSV, JSON ou PDF)
3. Le fichier se télécharge automatiquement

### Créer des Tâches Récurrentes
1. Lors de la création d'une tâche, sélectionnez une récurrence
2. Une fois la tâche complétée, elle sera automatiquement recréée

### Configurer les Rappels
1. Dans une tâche, cochez les rappels souhaités
2. Autorisez les notifications navigateur si demandé
3. Vous recevrez des notifications aux moments choisis

## 📊 Structure des Données

Les données sont stockées localement dans votre navigateur (localStorage) :
- `tasks` - Tâches actives
- `archivedTasks` - Tâches archivées
- `categories` - Catégories personnalisées
- `contacts` - Liste des contacts
- `dailyNotes` - Notes quotidiennes
- `theme` - Préférences de thème

## 🔒 Confidentialité

- ✅ Toutes vos données restent **100% locales** dans votre navigateur
- ✅ Aucune connexion internet requise
- ✅ Aucun serveur distant
- ✅ Vos données ne sont jamais envoyées nulle part

## 🐛 Dépannage

**Les notifications ne fonctionnent pas ?**
→ Vérifiez les permissions de notification dans les paramètres de votre navigateur

**Mes données ont disparu ?**
→ Vérifiez que le localStorage n'est pas désactivé. Exportez régulièrement vos données en JSON

**Le thème ne se sauvegarde pas ?**
→ Effacez le cache du navigateur et réessayez

**L'import échoue ?**
→ Vérifiez que votre fichier est un JSON valide ou un CSV correctement formaté

## 📄 Licence

Ce projet est libre d'utilisation pour un usage personnel et éducatif.
