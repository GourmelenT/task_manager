// ==========================
// GESTIONNAIRE DE TÂCHES
// ==========================

class TaskManager {
    constructor() {
        this.tasks = [];
        this.archivedTasks = [];
        this.contacts = [];
        this.categories = [];
        this.dailyNotes = {}; // Notes quotidiennes { 'YYYY-MM-DD': 'contenu' }
        this.currentNoteDate = new Date(); // Date actuelle pour les notes
        this.currentView = 'kanban';
        this.currentFilter = {
            search: '',
            category: '',
            status: '',
            priority: '',
            date: ''
        };
        this.currentSort = ''; // Tri actuel
        this.editingTaskId = null;
        this.editingCategoryId = null; // Pour édition de catégories
        this.currentDate = new Date();
        this.theme = 'light';
        this.archiveDelay = 30; // jours avant archivage automatique
        
        this.init();
    }

    // Initialisation
    init() {
        this.loadFromStorage();
        this.initializeDefaultCategories();
        this.initializeDefaultContacts();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.loadTheme();
        this.checkReminders();
        this.checkRecurrence();
        this.autoArchive();
        this.render();
        
        // Vérifier les rappels toutes les minutes
        setInterval(() => this.checkReminders(), 60000);
        // Vérifier les récurrences chaque jour
        setInterval(() => this.checkRecurrence(), 86400000);
        // Auto-archivage quotidien
        setInterval(() => this.autoArchive(), 86400000);
    }

    // Initialiser les catégories par défaut
    initializeDefaultCategories() {
        if (this.categories.length === 0) {
            this.categories = [
                { id: this.generateId(), name: 'Travail', color: '#3498db' },
                { id: this.generateId(), name: 'Personnel', color: '#2ecc71' },
                { id: this.generateId(), name: 'Urgent', color: '#e74c3c' }
            ];
            this.saveToStorage();
        }
    }

    // Initialiser contacts par défaut (vide)
    initializeDefaultContacts() {
        if (!Array.isArray(this.contacts)) this.contacts = [];
        // pas de contact par défaut
        this.saveToStorage();
    }

    // Générer un ID unique
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Configuration des écouteurs d'événements
    setupEventListeners() {
        // Navigation entre les vues
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Boutons d'action
        document.getElementById('addTaskBtn').addEventListener('click', () => this.openTaskModal());
        document.getElementById('addCategoryBtn').addEventListener('click', () => this.openCategoryModal());
        document.getElementById('themeBtn').addEventListener('click', () => this.openThemeModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.openExportModal());
        document.getElementById('importBtn').addEventListener('click', () => this.openImportModal());

        // Formulaire de tâche
        document.getElementById('taskForm').addEventListener('submit', (e) => this.saveTask(e));
        document.getElementById('closeTaskModal').addEventListener('click', () => this.closeModal('taskModal'));
        document.getElementById('cancelTaskBtn').addEventListener('click', () => this.closeModal('taskModal'));

        // Formulaire de catégorie
        document.getElementById('categoryForm').addEventListener('submit', (e) => this.saveCategory(e));
        document.getElementById('closeCategoryModal').addEventListener('click', () => this.closeModal('categoryModal'));
        document.getElementById('cancelCategoryBtn').addEventListener('click', () => this.closeModal('categoryModal'));

        // Modal de thème
        document.getElementById('closeThemeModal').addEventListener('click', () => this.closeModal('themeModal'));
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyTheme(e.target.dataset.theme);
            });
        });
        document.getElementById('primaryColor').addEventListener('change', (e) => this.applyCustomColor('primary', e.target.value));
        document.getElementById('backgroundColor').addEventListener('change', (e) => this.applyCustomColor('background', e.target.value));

        // Modal d'exportation
        document.getElementById('closeExportModal').addEventListener('click', () => this.closeModal('exportModal'));
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                this.exportData(format);
                this.closeModal('exportModal');
            });
        });

        // Recherche et filtres
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.currentFilter.search = e.target.value;
            this.render();
        });
        document.getElementById('filterCategory').addEventListener('change', (e) => {
            this.currentFilter.category = e.target.value;
            this.render();
        });
        document.getElementById('filterStatus').addEventListener('change', (e) => {
            this.currentFilter.status = e.target.value;
            this.render();
        });
        document.getElementById('filterPriority').addEventListener('change', (e) => {
            this.currentFilter.priority = e.target.value;
            this.render();
        });
        const filterPersonEl = document.getElementById('filterPerson');
        if (filterPersonEl) {
            filterPersonEl.addEventListener('change', (e) => {
                this.currentFilter.person = e.target.value;
                this.render();
            });
        }
        document.getElementById('filterDate').addEventListener('change', (e) => {
            this.currentFilter.date = e.target.value;
            this.render();
        });
        
        // Tri
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.render();
        });

        // Calendrier
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));

        // Fermer les modales en cliquant à l'extérieur
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Import / Contacts buttons
        const importBtn = document.getElementById('importBtn');
        if (importBtn) importBtn.addEventListener('click', () => this.openImportModal());
        document.getElementById('closeImportModal').addEventListener('click', () => this.closeModal('importModal'));
        document.getElementById('cancelImportBtn').addEventListener('click', () => this.closeModal('importModal'));
        document.getElementById('confirmImportBtn').addEventListener('click', () => this.confirmImport());
        document.getElementById('importFileInput').addEventListener('change', (e) => { 
            this._importFile = e.target.files[0];
            const display = document.getElementById('fileNameDisplay');
            if (display) {
                display.textContent = this._importFile ? `✓ ${this._importFile.name}` : '';
            }
        });

        const contactsBtn = document.getElementById('contactsBtn');
        if (contactsBtn) contactsBtn.addEventListener('click', () => this.openContactsModal());
        document.getElementById('closeContactsModal').addEventListener('click', () => this.closeModal('contactsModal'));
        document.getElementById('cancelContactBtn').addEventListener('click', () => this.closeModal('contactsModal'));
        document.getElementById('contactForm').addEventListener('submit', (e) => this.saveContact(e));
        
        // Rapports
        document.getElementById('generateWeeklyReport').addEventListener('click', () => this.generateReport('weekly'));
        document.getElementById('generateMonthlyReport').addEventListener('click', () => this.generateReport('monthly'));
        
        // Commentaires
        document.getElementById('commentForm').addEventListener('submit', (e) => this.addComment(e));
        
        // Notes du jour
        document.getElementById('dailyNoteInput').addEventListener('input', () => this.saveDailyNote());
        document.getElementById('prevDayBtn').addEventListener('click', () => this.changeNoteDay(-1));
        document.getElementById('nextDayBtn').addEventListener('click', () => this.changeNoteDay(1));
        document.getElementById('todayBtn').addEventListener('click', () => this.goToToday());
        
        // Pièces jointes
        document.getElementById('taskAttachments').addEventListener('change', (e) => this.handleAttachments(e));
    }

    // Changer de vue
    switchView(view) {
        this.currentView = view;
        
        // Mettre à jour les onglets
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Mettre à jour le contenu
        document.querySelectorAll('.view-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${view}View`).classList.add('active');
        
        this.render();
    }

    // Ouvrir la modale de tâche
    openTaskModal(taskId = null) {
        this.editingTaskId = taskId;
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('taskForm');
        const historyDiv = document.getElementById('taskHistory');
        
        // Remplir les catégories
        const categorySelect = document.getElementById('taskCategory');
        categorySelect.innerHTML = this.categories.map(cat => 
            `<option value="${cat.id}">${cat.name}</option>`
        ).join('');

        // Remplir les contacts (assignees)
        const assigneesSelect = document.getElementById('taskAssignees');
        if (assigneesSelect) {
            assigneesSelect.innerHTML = this.contacts.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
        
        // Remplir les dépendances (autres tâches)
        const dependenciesSelect = document.getElementById('taskDependencies');
        if (dependenciesSelect) {
            dependenciesSelect.innerHTML = this.tasks
                .filter(t => t.id !== taskId) // Exclure la tâche en cours
                .map(t => `<option value="${t.id}">${this.escapeHtml(t.name)}</option>`)
                .join('');
        }
        
        if (taskId) {
            // Chercher dans les tâches actives ET archivées
            let task = this.tasks.find(t => t.id === taskId);
            if (!task) {
                task = this.archivedTasks.find(t => t.id === taskId);
            }
            
            if (task) {
                title.textContent = 'Modifier la tâche';
                document.getElementById('taskName').value = task.name;
                document.getElementById('taskDescription').value = task.description || '';
                document.getElementById('taskDate').value = task.date;
                document.getElementById('taskCategory').value = task.categoryId;
                document.getElementById('taskStatus').value = task.status;
                document.getElementById('taskPriority').value = task.priority;
                
                // Récurrence
                document.getElementById('taskRecurrence').value = task.recurrence || '';
                
                // Rappels
                document.getElementById('taskReminders').value = task.reminders ? task.reminders.join(', ') : '';
                
                // Assignés
                if (assigneesSelect && task.assignees) {
                    Array.from(assigneesSelect.options).forEach(opt => {
                        opt.selected = task.assignees.includes(opt.value);
                    });
                }
                
                // Dépendances
                if (dependenciesSelect && task.dependencies) {
                    Array.from(dependenciesSelect.options).forEach(opt => {
                        opt.selected = task.dependencies.includes(opt.value);
                    });
                }
                
                // Afficher les commentaires
                this.renderComments(task);
                
                // Afficher l'historique
                if (task.history && task.history.length > 0) {
                    historyDiv.style.display = 'block';
                    document.getElementById('historyList').innerHTML = task.history
                        .map(h => `
                            <div class="history-item">
                                <div>${h.action}</div>
                                <div class="history-date">${this.formatDateTime(h.date)}</div>
                            </div>
                        `).join('');
                } else {
                    historyDiv.style.display = 'none';
                }
                
                // Afficher les pièces jointes
                if (task.attachments && task.attachments.length > 0) {
                    this._pendingAttachments = task.attachments;
                    this.renderAttachmentsList(task.attachments);
                } else {
                    this._pendingAttachments = [];
                    this.renderAttachmentsList([]);
                }
            }
        } else {
            title.textContent = 'Ajouter une tâche';
            form.reset();
            historyDiv.style.display = 'none';
            document.getElementById('taskComments').style.display = 'none';
            this._pendingAttachments = [];
            this.renderAttachmentsList([]);
            
            // Définir la date par défaut à aujourd'hui
            document.getElementById('taskDate').value = new Date().toISOString().split('T')[0];
        }
        
        modal.classList.add('active');
    }

    // Sauvegarder la tâche
    async saveTask(e) {
        e.preventDefault();
        
        const name = document.getElementById('taskName').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const date = document.getElementById('taskDate').value;
        const categoryId = document.getElementById('taskCategory').value;
        const status = document.getElementById('taskStatus').value;
        const priority = document.getElementById('taskPriority').value;
        const assigneesSelect = document.getElementById('taskAssignees');
        const assignees = assigneesSelect ? Array.from(assigneesSelect.selectedOptions).map(o => o.value) : [];
        const recurrence = document.getElementById('taskRecurrence').value;
        const remindersInput = document.getElementById('taskReminders').value.trim();
        const reminders = remindersInput ? remindersInput.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r)) : [];
        const dependenciesSelect = document.getElementById('taskDependencies');
        const dependencies = dependenciesSelect ? Array.from(dependenciesSelect.selectedOptions).map(o => o.value) : [];
        
        if (!name || !date || !categoryId) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }

        // Gérer les pièces jointes
        let attachments = [];
        if (this._pendingAttachments && this._pendingAttachments.length > 0) {
            for (const file of this._pendingAttachments) {
                const attachment = await this.fileToAttachment(file);
                attachments.push(attachment);
            }
        }
        
        if (this.editingTaskId) {
            // Modification - chercher dans les tâches actives ET archivées
            let task = this.tasks.find(t => t.id === this.editingTaskId);
            let isArchived = false;
            
            if (!task) {
                task = this.archivedTasks.find(t => t.id === this.editingTaskId);
                isArchived = true;
            }
            
            if (task) {
                const changes = [];
                if (task.name !== name) changes.push(`Nom modifié de "${task.name}" à "${name}"`);
                if (task.status !== status) changes.push(`Statut modifié de "${this.getStatusLabel(task.status)}" à "${this.getStatusLabel(status)}"`);
                if (task.priority !== priority) changes.push(`Priorité modifiée de "${this.getPriorityLabel(task.priority)}" à "${this.getPriorityLabel(priority)}"`);
                if (task.date !== date) changes.push(`Date modifiée de "${this.formatDate(task.date)}" à "${this.formatDate(date)}"`);
                
                task.name = name;
                task.description = description;
                task.date = date;
                task.categoryId = categoryId;
                task.status = status;
                task.priority = priority;
                task.assignees = assignees;
                task.recurrence = recurrence;
                task.reminders = reminders;
                task.dependencies = dependencies;
                task.updatedAt = new Date().toISOString();
                
                // Fusionner les nouvelles pièces jointes avec les anciennes
                if (attachments.length > 0) {
                    task.attachments = task.attachments || [];
                    task.attachments.push(...attachments);
                }
                
                if (!task.history) task.history = [];
                if (changes.length > 0) {
                    task.history.push({
                        action: changes.join(', '),
                        date: new Date().toISOString()
                    });
                }
            }
        } else {
            // Nouvelle tâche
            const task = {
                id: this.generateId(),
                name,
                description,
                date,
                categoryId,
                status,
                priority,
                assignees,
                recurrence,
                reminders,
                dependencies,
                attachments: attachments.length > 0 ? attachments : undefined,
                completed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                history: [{
                    action: 'Tâche créée',
                    date: new Date().toISOString()
                }]
            };
            this.tasks.push(task);
        }

        this._pendingAttachments = [];
        this.saveToStorage();
        this.closeModal('taskModal');
        this.render();
    }

    async fileToAttachment(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    content: e.target.result,
                    uploadedAt: new Date().toISOString()
                });
            };
            reader.readAsDataURL(file);
        });
    }

    // Supprimer une tâche
    deleteTask(taskId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveToStorage();
            this.render();
        }
    }

    // Archiver manuellement une tâche terminée
    manualArchiveTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.completed) {
            if (confirm('Êtes-vous sûr de vouloir archiver cette tâche ?')) {
                // Retirer la tâche de la liste active
                this.tasks = this.tasks.filter(t => t.id !== taskId);
                
                // Ajouter aux archives
                if (!this.archivedTasks) this.archivedTasks = [];
                task.archivedDate = new Date().toISOString();
                if (!task.history) task.history = [];
                task.history.push({
                    action: 'Tâche archivée manuellement',
                    date: task.archivedDate
                });
                this.archivedTasks.push(task);
                
                this.saveToStorage();
                this.render();
            }
        }
    }

    // Supprimer une tâche archivée
    deleteArchivedTask(taskId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer définitivement cette tâche archivée ?')) {
            this.archivedTasks = this.archivedTasks.filter(t => t.id !== taskId);
            this.saveToStorage();
            this.render();
        }
    }

    // Basculer l'état de completion
    toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            if (task.completed) {
                task.status = 'done';
                if (!task.history) task.history = [];
                task.history.push({
                    action: 'Tâche marquée comme terminée',
                    date: new Date().toISOString()
                });
            }
            task.updatedAt = new Date().toISOString();
            this.saveToStorage();
            this.render();
        }
    }

    // Changer le statut d'une tâche (drag & drop)
    changeTaskStatus(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
            const oldStatus = task.status;
            task.status = newStatus;
            task.updatedAt = new Date().toISOString();
            if (!task.history) task.history = [];
            task.history.push({
                action: `Statut modifié de "${this.getStatusLabel(oldStatus)}" à "${this.getStatusLabel(newStatus)}"`,
                date: new Date().toISOString()
            });
            this.saveToStorage();
            this.render();
        }
    }

    // Ouvrir la modale de catégorie
    openCategoryModal() {
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryModal').classList.add('active');
    }

    // Sauvegarder la catégorie
    saveCategory(e) {
        e.preventDefault();
        
        const name = document.getElementById('categoryName').value.trim();
        const color = document.getElementById('categoryColor').value;
        
        if (!name) {
            alert('Veuillez entrer un nom de catégorie');
            return;
        }

        if (this.editingCategoryId) {
            // Modification
            const category = this.categories.find(c => c.id === this.editingCategoryId);
            if (category) {
                category.name = name;
                category.color = color;
            }
            this.editingCategoryId = null;
        } else {
            // Nouvelle catégorie
            this.categories.push({
                id: this.generateId(),
                name,
                color
            });
        }
        
        this.saveToStorage();
        this.renderCategoriesList();
        document.getElementById('categoryForm').reset();
        this.render();
    }

    // Ouvrir la modale d'exportation
    openExportModal() {
        document.getElementById('exportModal').classList.add('active');
    }

    // Exporter les données
    exportData(format) {
        const filteredTasks = this.getFilteredTasks();
        
        switch(format) {
            case 'csv':
                this.exportToCSV(filteredTasks);
                break;
            case 'json':
                this.exportToJSON(filteredTasks);
                break;
            case 'pdf':
                this.exportToPDF(filteredTasks);
                break;
        }
        
        this.closeModal('exportModal');
    }

    // Exporter en CSV
    exportToCSV(tasks) {
        const headers = ['Nom', 'Description', 'Date', 'Catégorie', 'Statut', 'Priorité', 'Terminé'];
        const rows = tasks.map(task => {
            const category = this.categories.find(c => c.id === task.categoryId);
            return [
                task.name,
                task.description || '',
                task.date,
                category ? category.name : '',
                this.getStatusLabel(task.status),
                this.getPriorityLabel(task.priority),
                task.completed ? 'Oui' : 'Non'
            ];
        });
        
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });
        
        this.downloadFile(csv, 'taches.csv', 'text/csv');
    }

    // Exporter en JSON
    exportToJSON(tasks) {
        // Export complet incluant : tâches, archives, catégories, contacts, thème, notes
        // Les pièces jointes (attachments) sont incluses dans chaque objet task/archivedTask
        const data = {
            version: '2.0',
            tasks,
            archivedTasks: this.archivedTasks,
            categories: this.categories,
            contacts: this.contacts,
            theme: this.theme,
            dailyNotes: this.dailyNotes,
            exportedAt: new Date().toISOString()
        };
        
        const json = JSON.stringify(data, null, 2);
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `taches_${dateStr}.json`;
        this.downloadFile(json, filename, 'application/json');
    }

    // Exporter en PDF (simulation - dans un vrai projet, utiliser une librairie comme jsPDF)
    exportToPDF(tasks) {
        // Utilise jsPDF si disponible (inclus via CDN dans index.html)
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            let y = 15;
            doc.setFontSize(14);
            doc.text('Liste des tâches', 14, y);
            y += 8;
            doc.setFontSize(10);
            doc.text(`Exporté le ${this.formatDateTime(new Date().toISOString())}`, 14, y);
            y += 8;

            tasks.forEach((task, index) => {
                const category = this.categories.find(c => c.id === task.categoryId);
                const assignees = task.assignees && task.assignees.length ? task.assignees.map(a => (this.contacts.find(c=>c.id===a)||{name:'?' }).name).join(', ') : '';
                const lines = [
                    `${index + 1}. ${task.name}`,
                    task.description ? `   Description: ${task.description}` : null,
                    `   Date: ${this.formatDate(task.date)}`,
                    `   Catégorie: ${category ? category.name : 'N/A'}`,
                    `   Statut: ${this.getStatusLabel(task.status)}`,
                    `   Priorité: ${this.getPriorityLabel(task.priority)}`,
                    `   Terminé: ${task.completed ? 'Oui' : 'Non'}`,
                    assignees ? `   Personnes: ${assignees}` : null,
                    ''
                ].filter(Boolean);

                lines.forEach(line => {
                    const split = doc.splitTextToSize(line, 180);
                    doc.text(split, 14, y);
                    y += split.length * 6;
                    if (y > 270) { doc.addPage(); y = 15; }
                });
            });

            doc.save('taches.pdf');
        } catch (err) {
            console.error(err);
            alert('Impossible de générer le PDF — bibliothèque jsPDF non chargée.');
        }
    }

    // Télécharger un fichier
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Ouvrir la modale de thème
    openThemeModal() {
        document.getElementById('themeModal').classList.add('active');
        
        // Mettre à jour le bouton actif
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.theme);
        });
    }

    // Appliquer un thème
    applyTheme(theme) {
        this.theme = theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }

    // Appliquer une couleur personnalisée
    applyCustomColor(type, color) {
        if (type === 'primary') {
            document.documentElement.style.setProperty('--primary-color', color);
            localStorage.setItem('custom-primary-color', color);
        } else if (type === 'background') {
            document.documentElement.style.setProperty('--background-color', color);
            localStorage.setItem('custom-background-color', color);
        }
    }

    // Charger le thème
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.applyTheme(savedTheme);
        }
        
        const customPrimary = localStorage.getItem('custom-primary-color');
        if (customPrimary) {
            document.documentElement.style.setProperty('--primary-color', customPrimary);
            document.getElementById('primaryColor').value = customPrimary;
        }
        
        const customBackground = localStorage.getItem('custom-background-color');
        if (customBackground) {
            document.documentElement.style.setProperty('--background-color', customBackground);
            document.getElementById('backgroundColor').value = customBackground;
        }
    }

    // Fermer une modale
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        this.editingTaskId = null;
    }

    // Obtenir les tâches filtrées
    getFilteredTasks() {
        let filtered = this.tasks.filter(task => {
            // Recherche
            if (this.currentFilter.search) {
                const search = this.currentFilter.search.toLowerCase();
                const matchName = task.name.toLowerCase().includes(search);
                const matchDesc = task.description && task.description.toLowerCase().includes(search);
                if (!matchName && !matchDesc) return false;
            }
            
            // Catégorie
            if (this.currentFilter.category && task.categoryId !== this.currentFilter.category) {
                return false;
            }
            
            // Statut
            if (this.currentFilter.status && task.status !== this.currentFilter.status) {
                return false;
            }
            
            // Priorité
            if (this.currentFilter.priority && task.priority !== this.currentFilter.priority) {
                return false;
            }
            
            // Date
            if (this.currentFilter.date && task.date !== this.currentFilter.date) {
                return false;
            }

            // Filtre par personne
            if (this.currentFilter.person && (!task.assignees || !task.assignees.includes(this.currentFilter.person))) {
                return false;
            }
            
            return true;
        });

        // Appliquer le tri
        if (this.currentSort) {
            filtered = this.sortTasks(filtered, this.currentSort);
        }

        return filtered;
    }

    // Trier les tâches
    sortTasks(tasks, sortType) {
        const sorted = [...tasks];
        switch(sortType) {
            case 'name':
                return sorted.sort((a, b) => a.name.localeCompare(b.name));
            case 'date-asc':
                return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
            case 'date-desc':
                return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
            case 'priority':
                const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                return sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            case 'status':
                const statusOrder = { todo: 0, inprogress: 1, review: 2, done: 3 };
                return sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
            case 'category':
                return sorted.sort((a, b) => {
                    const catA = this.categories.find(c => c.id === a.categoryId)?.name || '';
                    const catB = this.categories.find(c => c.id === b.categoryId)?.name || '';
                    return catA.localeCompare(catB);
                });
            default:
                return sorted;
        }
    }

    // Vérifier l'état de la date
    getDateStatus(dateString) {
        const taskDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        taskDate.setHours(0, 0, 0, 0);
        
        const diffTime = taskDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'overdue';
        if (diffDays <= 2) return 'warning';
        return 'normal';
    }

    // Rendu principal
    render() {
        this.updateCategoryFilters();
        this.updatePersonFilter();
        
        switch(this.currentView) {
            case 'kanban':
                this.renderKanban();
                break;
            case 'list':
                this.renderList();
                break;
            case 'calendar':
                this.renderCalendar();
                break;
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'archive':
                this.renderArchive();
                break;
            case 'notes':
                this.renderNotes();
                break;
        }
    }

    // Mettre à jour la liste des personnes dans les filtres
    updatePersonFilter() {
        const filterPerson = document.getElementById('filterPerson');
        if (!filterPerson) return;
        const current = filterPerson.value;
        filterPerson.innerHTML = '<option value="">Toutes les personnes</option>' + this.contacts.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        if (current) filterPerson.value = current;
    }

    // Gestion des contacts
    openContactsModal() {
        this.closeModal('contactsModal'); // ensure closed then open
        document.getElementById('contactsModal').classList.add('active');
        this.renderContactsList();
        document.getElementById('contactForm').reset();
    }

    saveContact(e) {
        e.preventDefault();
        const name = document.getElementById('contactName').value.trim();
        const email = document.getElementById('contactEmail').value.trim();
        const color = document.getElementById('contactColor').value;
        if (!name) return alert('Nom requis');
        const contact = { id: this.generateId(), name, email, color };
        this.contacts.push(contact);
        this.saveToStorage();
        this.renderContactsList();
        this.updatePersonFilter();
        document.getElementById('contactForm').reset();
    }

    renderContactsList() {
        const container = document.getElementById('contactsList');
        if (!container) return;
        if (this.contacts.length === 0) {
            container.innerHTML = '<div class="empty-message">Aucun contact</div>';
            return;
        }
        container.innerHTML = this.contacts.map(c => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;border:1px solid var(--border-color);margin-bottom:8px;">
                <div style="width:34px;height:34px;border-radius:50%;background:${c.color};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">${this.escapeHtml(c.name.split(' ').map(s=>s[0]).join('').slice(0,2))}</div>
                <div style="flex:1;"><strong>${this.escapeHtml(c.name)}</strong><div style="font-size:0.85em;color:var(--text-secondary)">${this.escapeHtml(c.email||'')}</div></div>
                <div style="display:flex;gap:6px"><button class="btn btn-secondary" onclick="taskManager.removeContact('${c.id}')">Suppr</button></div>
            </div>
        `).join('');
    }

    removeContact(id) {
        if (!confirm('Supprimer ce contact ? Les tâches ne seront pas supprimées mais la liaison sera retirée.')) return;
        this.contacts = this.contacts.filter(c => c.id !== id);
        // retirer des assignés
        this.tasks.forEach(t => {
            if (t.assignees) t.assignees = t.assignees.filter(a => a !== id);
        });
        this.saveToStorage();
        this.renderContactsList();
        this.render();
    }

    // Import
    openImportModal() {
        this._importFile = null;
        document.getElementById('importFileInput').value = null;
        const display = document.getElementById('fileNameDisplay');
        if (display) display.textContent = '';
        document.getElementById('importModal').classList.add('active');
    }

    confirmImport() {
        if (!this._importFile) return alert('Sélectionnez un fichier JSON ou CSV');
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const name = this._importFile.name.toLowerCase();
            if (name.endsWith('.json')) {
                this.importFromJSON(text);
            } else if (name.endsWith('.csv')) {
                this.importFromCSV(text);
            } else {
                alert('Format non pris en charge');
            }
            this.closeModal('importModal');
        };
        reader.readAsText(this._importFile);
    }

    importFromJSON(text) {
        try {
            const data = JSON.parse(text);
            
            // Supporter le nouveau format complet (v2.0) et l'ancien format
            // Les pièces jointes (attachments) sont automatiquement incluses dans les objets tasks
            if (data.version === '2.0') {
                // Import complet : remplacer tout
                if (confirm('Cet import contient un backup complet (tâches, catégories, contacts, thème, notes, pièces jointes). Voulez-vous REMPLACER toutes vos données actuelles ?')) {
                    this.tasks = data.tasks || [];
                    this.archivedTasks = data.archivedTasks || [];
                    this.categories = data.categories || [];
                    this.contacts = data.contacts || [];
                    this.dailyNotes = data.dailyNotes || {};
                    if (data.theme) {
                        this.theme = data.theme;
                        this.applyTheme(data.theme);
                    }
                    this.saveToStorage();
                    this.render();
                    alert('Import complet terminé avec succès !');
                    return;
                }
            }
            
            // Format ancien ou import partiel
            const tasks = Array.isArray(data) ? data : (data.tasks || []);
            const categories = data.categories || [];
            const contacts = data.contacts || [];
            const archivedTasks = data.archivedTasks || [];
            const dailyNotes = data.dailyNotes || {};

            // fusionner catégories et contacts (on évite dupliqués en comparant par nom)
            categories.forEach(cat => {
                if (!this.categories.some(c => c.name === cat.name)) this.categories.push({...cat, id: cat.id || this.generateId()});
            });
            contacts.forEach(c => {
                if (!this.contacts.some(x => x.email && x.email === c.email) && !this.contacts.some(x=>x.name===c.name)) this.contacts.push({...c, id: c.id || this.generateId()});
            });

            // Fusionner les notes
            Object.assign(this.dailyNotes, dailyNotes);

            // importer tâches: si l'id du category/contacts ne correspond pas, tenter de mapper par nom
            tasks.forEach(t => {
                const newTask = { ...t };
                // ensure id
                newTask.id = newTask.id || this.generateId();
                // map category
                if (newTask.categoryId && !this.categories.some(c=>c.id===newTask.categoryId)) {
                    const cat = this.categories.find(c=>c.name===t.categoryName) || this.categories[0];
                    newTask.categoryId = cat ? cat.id : (this.categories[0] && this.categories[0].id);
                }
                // map assignees by email/name
                if (newTask.assignees && Array.isArray(newTask.assignees)) {
                    newTask.assignees = newTask.assignees.map(a => {
                        if (this.contacts.some(c=>c.id===a)) return a;
                        const found = this.contacts.find(c=>c.email===a || c.name===a);
                        return found ? found.id : null;
                    }).filter(Boolean);
                }
                this.tasks.push(newTask);
            });
            
            // Importer les tâches archivées
            archivedTasks.forEach(t => {
                if (!this.archivedTasks.some(x => x.id === t.id)) {
                    this.archivedTasks.push(t);
                }
            });

            this.saveToStorage();
            this.render();
            alert('Import JSON terminé');
        } catch (err) {
            console.error(err);
            alert('Erreur lors de l\'import JSON');
        }
    }

    importFromCSV(text) {
        // parser CSV simple: première ligne headers
        const lines = text.split(/\r?\n/).filter(l=>l.trim());
        if (lines.length < 2) return alert('CSV vide');
        const headers = lines.shift().split(',').map(h=>h.replace(/^"|"$/g,'').trim());
        lines.forEach(line => {
            const parts = line.match(/("[^"]*"|[^,]*)/g).map(p=>p.replace(/^"|"$/g,'').trim()).filter(Boolean);
            const obj = {};
            headers.forEach((h,i)=> obj[h] = parts[i] || '');
            // construire tâche minimale
            const task = {
                id: this.generateId(),
                name: obj['Nom'] || obj['name'] || 'Sans titre',
                description: obj['Description'] || obj['description'] || '',
                date: obj['Date'] || obj['date'] || '',
                status: this.mapStatusLabelToKey(obj['Statut'] || obj['status']),
                priority: this.mapPriorityLabelToKey(obj['Priorité'] || obj['priority']),
                completed: (obj['Terminé'] || obj['done'] || '').toLowerCase().startsWith('o')
            };
            // category mapping
            const catName = obj['Catégorie'] || obj['category'];
            if (catName) {
                let cat = this.categories.find(c=>c.name===catName);
                if (!cat) { cat = { id: this.generateId(), name: catName, color: '#999' }; this.categories.push(cat); }
                task.categoryId = cat.id;
            } else if (this.categories[0]) task.categoryId = this.categories[0].id;
            this.tasks.push(task);
        });
        this.saveToStorage();
        this.render();
        alert('Import CSV terminé');
    }

    mapStatusLabelToKey(label) {
        if (!label) return 'todo';
        label = label.toLowerCase();
        if (label.includes('faire') || label.includes('todo')) return 'todo';
        if (label.includes('en cours') || label.includes('inprogress')) return 'inprogress';
        if (label.includes('term') || label.includes('done')) return 'done';
        if (label.includes('revoir') || label.includes('review')) return 'review';
        return 'todo';
    }

    mapPriorityLabelToKey(label) {
        if (!label) return 'medium';
        label = label.toLowerCase();
        if (label.includes('basse') || label.includes('low')) return 'low';
        if (label.includes('moy') || label.includes('medium')) return 'medium';
        if (label.includes('haut') || label.includes('high')) return 'high';
        if (label.includes('urgent')) return 'urgent';
        return 'medium';
    }

    // Mettre à jour les filtres de catégories
    updateCategoryFilters() {
        const filterCategory = document.getElementById('filterCategory');
        const taskCategory = document.getElementById('taskCategory');
        
        const categoryOptions = this.categories.map(cat => 
            `<option value="${cat.id}">${cat.name}</option>`
        ).join('');
        
        if (filterCategory) {
            const currentValue = filterCategory.value;
            filterCategory.innerHTML = '<option value="">Toutes les catégories</option>' + categoryOptions;
            filterCategory.value = currentValue;
        }
        
        if (taskCategory) {
            const currentValue = taskCategory.value;
            taskCategory.innerHTML = categoryOptions;
            if (currentValue) taskCategory.value = currentValue;
        }
    }

    // Rendu Kanban
    renderKanban() {
        const statuses = ['todo', 'inprogress', 'done', 'review'];
        const filteredTasks = this.getFilteredTasks();
        
        statuses.forEach(status => {
            const container = document.getElementById(`${status}Tasks`);
            const tasks = filteredTasks.filter(t => t.status === status);
            
            // Mettre à jour le compteur
            const column = container.closest('.kanban-column');
            const counter = column.querySelector('.task-count');
            counter.textContent = tasks.length;
            
            if (tasks.length === 0) {
                container.innerHTML = '<div class="empty-message">Aucune tâche</div>';
            } else {
                container.innerHTML = tasks.map(task => this.createTaskCard(task)).join('');
            }
        });
        
        this.attachTaskEventListeners();
    }

    // Rendu Liste
    renderList() {
        const container = document.getElementById('listContainer');
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            container.innerHTML = '<div class="empty-message">Aucune tâche trouvée</div>';
            return;
        }
        
        // Grouper par catégorie
        const tasksByCategory = {};
        this.categories.forEach(cat => {
            tasksByCategory[cat.id] = {
                category: cat,
                tasks: []
            };
        });
        
        filteredTasks.forEach(task => {
            if (tasksByCategory[task.categoryId]) {
                tasksByCategory[task.categoryId].tasks.push(task);
            }
        });
        
        let html = '';
        Object.values(tasksByCategory).forEach(({ category, tasks }) => {
            if (tasks.length > 0) {
                html += `
                    <div class="category-section">
                        <h2 style="color: ${category.color}">${category.name}</h2>
                        <div class="category-tasks">
                            ${tasks.map(task => this.createTaskCard(task)).join('')}
                        </div>
                    </div>
                `;
            }
        });
        
        container.innerHTML = html;
        this.attachTaskEventListeners();
    }

    // Rendu Calendrier
    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Mettre à jour le titre
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                           'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
        
        // Première et dernière date du mois
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Jour de la semaine du premier jour (0 = Dimanche, 6 = Samedi)
        let startDay = firstDay.getDay();
        startDay = startDay === 0 ? 6 : startDay - 1; // Ajuster pour commencer lundi
        
        const daysInMonth = lastDay.getDate();
        
    // Créer la grille
    const grid = document.getElementById('calendarGrid');
    let html = '';
        
        // En-têtes des jours
        const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        dayNames.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        
        // Jours du mois précédent
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            html += `<div class="calendar-day other-month">
                <div class="calendar-day-number">${prevMonthDays - i}</div>
            </div>`;
        }
        
        // Jours du mois courant
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            // construire la date localement au format YYYY-MM-DD sans toISOString pour éviter le décalage
            const dateString = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
            const isToday = date.getTime() === today.getTime();
            
            // Trouver les tâches pour ce jour
            const dayTasks = this.tasks.filter(t => t.date === dateString);
            
            html += `<div class="calendar-day ${isToday ? 'today' : ''}">
                <div class="calendar-day-number">${day}</div>
                <div class="calendar-tasks">
                    ${dayTasks.map(task => {
                        const category = this.categories.find(c => c.id === task.categoryId);
                        const color = category ? category.color : '#777';
                        const assignees = task.assignees && task.assignees.length ? ' · ' + task.assignees.map(a => (this.contacts.find(c=>c.id===a)||{name:'?' }).name).join(', ') : '';
                        // badge plus lisible avec nom et couleur de catégorie
                        return `<div class="calendar-task-badge" style="background:${color}" data-task-id="${task.id}" title="${this.escapeHtml(task.name)}${this.escapeHtml(assignees)}">${this.escapeHtml(task.name)}</div>`;
                    }).join('')}
                </div>
            </div>`;
        }
        
        // Jours du mois suivant
        const remainingDays = 42 - (startDay + daysInMonth); // 6 semaines = 42 jours
        for (let day = 1; day <= remainingDays; day++) {
            html += `<div class="calendar-day other-month">
                <div class="calendar-day-number">${day}</div>
            </div>`;
        }
        
        grid.innerHTML = html;

        // Attacher click sur les badges calendrier
        grid.querySelectorAll('.calendar-task-badge').forEach(el => {
            el.addEventListener('click', (e) => {
                const id = el.dataset.taskId;
                this.openTaskModal(id);
            });
        });
    }

    // Changer de mois dans le calendrier
    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.renderCalendar();
    }

    // Rendu Tableau de bord
    renderDashboard() {
        const tasks = this.getFilteredTasks();
        const completed = tasks.filter(t => t.completed || t.status === 'done').length;
        const active = tasks.filter(t => !t.completed && t.status !== 'done').length;
        const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
        
        // Mettre à jour les statistiques
        document.getElementById('totalTasks').textContent = tasks.length;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('activeTasks').textContent = active;
        document.getElementById('completionRate').textContent = completionRate + '%';
        
        // Graphique par catégorie
        this.renderCategoryChart(tasks);
        
        // Graphique par priorité
        this.renderPriorityChart(tasks);
        
        // Graphique par statut
        this.renderStatusChart(tasks);
    }

    // Graphique par catégorie
    renderCategoryChart(tasks) {
        const container = document.getElementById('categoryChart');
        const categoryCounts = {};
        
        this.categories.forEach(cat => {
            categoryCounts[cat.id] = {
                name: cat.name,
                count: 0,
                color: cat.color
            };
        });
        
        tasks.forEach(task => {
            if (categoryCounts[task.categoryId]) {
                categoryCounts[task.categoryId].count++;
            }
        });
        
        const maxCount = Math.max(...Object.values(categoryCounts).map(c => c.count), 1);
        
        let html = '';
        Object.values(categoryCounts).forEach(cat => {
            const percentage = (cat.count / maxCount) * 100;
            html += `
                <div class="chart-bar">
                    <div class="chart-label">${cat.name}</div>
                    <div class="chart-bar-container">
                        <div class="chart-bar-fill" style="width: ${percentage}%; background: ${cat.color}">
                            ${cat.count}
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<div class="empty-message">Aucune donnée</div>';
    }

    // Graphique par priorité
    renderPriorityChart(tasks) {
        const container = document.getElementById('priorityChart');
        const priorities = {
            low: { name: 'Basse', count: 0, color: '#3498db' },
            medium: { name: 'Moyenne', count: 0, color: '#f39c12' },
            high: { name: 'Haute', count: 0, color: '#e67e22' },
            urgent: { name: 'Urgente', count: 0, color: '#c0392b' }
        };
        
        tasks.forEach(task => {
            if (priorities[task.priority]) {
                priorities[task.priority].count++;
            }
        });
        
        const maxCount = Math.max(...Object.values(priorities).map(p => p.count), 1);
        
        let html = '';
        Object.values(priorities).forEach(priority => {
            const percentage = (priority.count / maxCount) * 100;
            html += `
                <div class="chart-bar">
                    <div class="chart-label">${priority.name}</div>
                    <div class="chart-bar-container">
                        <div class="chart-bar-fill" style="width: ${percentage}%; background: ${priority.color}">
                            ${priority.count}
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // Graphique par statut
    renderStatusChart(tasks) {
        const container = document.getElementById('statusChart');
        const statuses = {
            todo: { name: 'À faire', count: 0, color: '#95a5a6' },
            inprogress: { name: 'En cours', count: 0, color: '#f39c12' },
            done: { name: 'Terminé', count: 0, color: '#2ecc71' },
            review: { name: 'À revoir', count: 0, color: '#e74c3c' }
        };
        
        tasks.forEach(task => {
            if (statuses[task.status]) {
                statuses[task.status].count++;
            }
        });
        
        const maxCount = Math.max(...Object.values(statuses).map(s => s.count), 1);
        
        let html = '';
        Object.values(statuses).forEach(status => {
            const percentage = (status.count / maxCount) * 100;
            html += `
                <div class="chart-bar">
                    <div class="chart-label">${status.name}</div>
                    <div class="chart-bar-container">
                        <div class="chart-bar-fill" style="width: ${percentage}%; background: ${status.color}">
                            ${status.count}
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // Créer une carte de tâche
    createTaskCard(task, isArchived = false) {
        const category = this.categories.find(c => c.id === task.categoryId);
        const dateStatus = this.getDateStatus(task.date);
        const reminderStatus = this.getReminderStatus(task);
        const isBlocked = this.isTaskBlocked(task);
        const blockingTasks = this.getBlockingTasks(task);
        
        return `
            <div class="task-card status-${task.status} ${task.completed ? 'completed' : ''} ${isBlocked ? 'task-blocked' : ''}" data-task-id="${task.id}" draggable="true">
                <div class="task-header">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} ${isBlocked ? 'disabled title="Tâche bloquée"' : ''}
                           onclick="taskManager.toggleTaskComplete('${task.id}')">
                    <div class="task-title">
                        ${this.escapeHtml(task.name)}
                        ${reminderStatus ? `<span class="reminder-indicator reminder-${reminderStatus}" title="${reminderStatus === 'late' ? 'En retard !' : 'Rappel actif'}"></span>` : ''}
                    </div>
                    <div class="task-actions">
                        <button onclick="taskManager.openTaskModal('${task.id}')" title="Modifier">✏️</button>
                        ${!isArchived && task.completed ? `<button onclick="taskManager.manualArchiveTask('${task.id}')" title="Archiver" style="background:#f39c12;color:white;border-radius:4px;padding:5px 10px;">📦</button>` : ''}
                        <button onclick="taskManager.${isArchived ? 'deleteArchivedTask' : 'deleteTask'}('${task.id}')" title="Supprimer">🗑️</button>
                    </div>
                </div>
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                ${isBlocked && blockingTasks.length > 0 ? `
                    <div style="margin:8px 0;">
                        <span class="task-dependency-badge">⚠️ Bloquée par: ${blockingTasks.map(t => this.escapeHtml(t.name)).join(', ')}</span>
                    </div>
                ` : ''}
                <div class="task-meta">
                    <span class="task-badge task-date ${dateStatus}">📅 ${this.formatDate(task.date)}</span>
                    ${category ? `<span class="task-badge task-category" style="background: ${category.color}">📁 ${category.name}</span>` : ''}
                    <span class="task-badge task-priority priority-${task.priority}">${this.getPriorityIcon(task.priority)} ${this.getPriorityLabel(task.priority)}</span>
                    ${task.assignees && task.assignees.length ? `<span class="task-badge" style="background:#9b87f5; color:white">👥 ${task.assignees.map(a=> (this.contacts.find(c=>c.id===a)||{name:'?' }).name).join(', ')}</span>` : ''}
                    ${task.recurrence ? `<span class="recurrence-badge">🔁 ${this.getRecurrenceLabel(task.recurrence)}</span>` : ''}
                    ${task.comments && task.comments.length ? `<span class="task-badge" style="background:#94c5cc; color:white" title="${task.comments.length} commentaire(s)">💬 ${task.comments.length}</span>` : ''}
                    ${isArchived ? `<span class="task-badge" style="background:#999">📦 Archivée</span>` : ''}
                </div>
            </div>
        `;
    }

    // Attacher les écouteurs d'événements aux tâches
    attachTaskEventListeners() {
        const taskCards = document.querySelectorAll('.task-card');
        
        taskCards.forEach(card => {
            // Drag & Drop
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('taskId', card.dataset.taskId);
                card.style.opacity = '0.5';
            });
            
            card.addEventListener('dragend', (e) => {
                card.style.opacity = '1';
            });
        });
        
        // Drop zones (colonnes Kanban)
        const columns = document.querySelectorAll('.column-tasks');
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.style.background = 'rgba(52, 152, 219, 0.1)';
            });
            
            column.addEventListener('dragleave', (e) => {
                column.style.background = '';
            });
            
            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.style.background = '';
                
                const taskId = e.dataTransfer.getData('taskId');
                const newStatus = column.id.replace('Tasks', '');
                this.changeTaskStatus(taskId, newStatus);
            });
        });
    }

    // Utilitaires
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getStatusLabel(status) {
        const labels = {
            todo: 'À faire',
            inprogress: 'En cours',
            done: 'Terminé',
            review: 'À revoir'
        };
        return labels[status] || status;
    }

    getPriorityLabel(priority) {
        const labels = {
            low: 'Basse',
            medium: 'Moyenne',
            high: 'Haute',
            urgent: 'Urgente'
        };
        return labels[priority] || priority;
    }

    getPriorityIcon(priority) {
        const icons = {
            low: '🔵',
            medium: '🟡',
            high: '🟠',
            urgent: '🔴'
        };
        return icons[priority] || '⚪';
    }

    // Sauvegarde et chargement
    saveToStorage() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        localStorage.setItem('categories', JSON.stringify(this.categories));
        localStorage.setItem('contacts', JSON.stringify(this.contacts));
        localStorage.setItem('archivedTasks', JSON.stringify(this.archivedTasks));
        localStorage.setItem('dailyNotes', JSON.stringify(this.dailyNotes));
    }

    loadFromStorage() {
        const tasksData = localStorage.getItem('tasks');
        const categoriesData = localStorage.getItem('categories');
        const contactsData = localStorage.getItem('contacts');
        const archivedData = localStorage.getItem('archivedTasks');
        const notesData = localStorage.getItem('dailyNotes');
        
        if (tasksData) {
            this.tasks = JSON.parse(tasksData);
        }
        
        if (categoriesData) {
            this.categories = JSON.parse(categoriesData);
        }
        if (contactsData) {
            this.contacts = JSON.parse(contactsData);
        }
        if (archivedData) {
            this.archivedTasks = JSON.parse(archivedData);
        }
        if (notesData) {
            this.dailyNotes = JSON.parse(notesData);
        }
    }

    // ==========================================
    // NOUVELLES FONCTIONNALITÉS
    // ==========================================

    // Raccourcis clavier
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+N : Nouvelle tâche
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openTaskModal();
            }
            // Ctrl+F : Focus sur la recherche
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
            // Ctrl+K : Ouvrir contacts
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.openContactsModal();
            }
            // Ctrl+E : Export
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.openExportModal();
            }
            // Ctrl+I : Import
            if (e.ctrlKey && e.key === 'i') {
                e.preventDefault();
                this.openImportModal();
            }
            // Échap : Fermer toutes les modales
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    this.closeModal(modal.id);
                });
            }
        });
    }

    // Récurrence des tâches
    checkRecurrence() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        this.tasks.forEach(task => {
            if (!task.recurrence || task.recurrence === '') return;
            
            const taskDate = new Date(task.date);
            taskDate.setHours(0, 0, 0, 0);
            
            // Si la tâche est complétée et la date est passée
            if (task.completed && taskDate < today) {
                let nextDate = new Date(taskDate);
                
                switch(task.recurrence) {
                    case 'daily':
                        nextDate.setDate(nextDate.getDate() + 1);
                        break;
                    case 'weekly':
                        nextDate.setDate(nextDate.getDate() + 7);
                        break;
                    case 'monthly':
                        nextDate.setMonth(nextDate.getMonth() + 1);
                        break;
                }
                
                // Créer une nouvelle tâche
                const newTask = {
                    ...task,
                    id: this.generateId(),
                    date: `${nextDate.getFullYear()}-${String(nextDate.getMonth()+1).padStart(2,'0')}-${String(nextDate.getDate()).padStart(2,'0')}`,
                    completed: false,
                    status: 'todo',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    history: [{
                        action: `Tâche récurrente créée automatiquement (${this.getRecurrenceLabel(task.recurrence)})`,
                        date: new Date().toISOString()
                    }]
                };
                
                this.tasks.push(newTask);
            }
        });
        
        this.saveToStorage();
        this.render();
    }

    getRecurrenceLabel(recurrence) {
        const labels = {
            daily: 'Quotidien',
            weekly: 'Hebdomadaire',
            monthly: 'Mensuel'
        };
        return labels[recurrence] || '';
    }

    // Rappels avec indicateurs de couleur
    checkReminders() {
        const now = new Date();
        
        this.tasks.forEach(task => {
            if (!task.reminders || task.completed) return;
            
            const taskDate = new Date(task.date);
            const diffMinutes = Math.floor((taskDate - now) / 60000);
            
            // Vérifier chaque rappel
            task.reminders.forEach(reminderMinutes => {
                const reminderKey = `${task.id}-${reminderMinutes}`;
                
                // Si on est dans la fenêtre du rappel (±2 minutes)
                if (Math.abs(diffMinutes - reminderMinutes) <= 2) {
                    // Vérifier si on n'a pas déjà notifié
                    const notified = localStorage.getItem(reminderKey);
                    if (!notified) {
                        this.showNotification(task, reminderMinutes);
                        localStorage.setItem(reminderKey, 'true');
                    }
                }
            });
        });
    }

    showNotification(task, minutesBefore) {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification('🔔 Rappel de tâche', {
                    body: `${task.name} - Échéance dans ${minutesBefore} minutes`,
                    icon: '📋',
                    tag: task.id
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification('🔔 Rappel de tâche', {
                            body: `${task.name} - Échéance dans ${minutesBefore} minutes`,
                            icon: '📋',
                            tag: task.id
                        });
                    }
                });
            }
        }
    }

    getReminderStatus(task) {
        if (!task.reminders || task.completed) return null;
        
        const now = new Date();
        const taskDate = new Date(task.date);
        const diffMinutes = Math.floor((taskDate - now) / 60000);
        
        if (diffMinutes < 0) return 'late'; // En retard
        if (task.reminders.some(r => diffMinutes <= r)) return 'on-time'; // Dans la période de rappel
        return null;
    }

    // Dépendances entre tâches
    isTaskBlocked(task) {
        if (!task.dependencies || task.dependencies.length === 0) return false;
        
        return task.dependencies.some(depId => {
            const depTask = this.tasks.find(t => t.id === depId);
            return depTask && !depTask.completed;
        });
    }

    getBlockingTasks(task) {
        if (!task.dependencies) return [];
        
        return task.dependencies
            .map(depId => this.tasks.find(t => t.id === depId))
            .filter(t => t && !t.completed);
    }

    // Archivage automatique
    autoArchive() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.archiveDelay);
        
        this.tasks = this.tasks.filter(task => {
            if (task.completed && new Date(task.updatedAt) < cutoffDate) {
                // Archiver la tâche
                this.archivedTasks.push({
                    ...task,
                    archivedAt: new Date().toISOString()
                });
                return false;
            }
            return true;
        });
        
        this.saveToStorage();
    }

    // Vue Archive
    renderArchive() {
        const container = document.getElementById('archiveContainer');
        
        if (this.archivedTasks.length === 0) {
            container.innerHTML = '<div class="empty-message">Aucune tâche archivée</div>';
            return;
        }
        
        container.innerHTML = this.archivedTasks
            .sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt))
            .map(task => this.createTaskCard(task, true))
            .join('');
    }

    // Commentaires sur tâches
    addComment(e) {
        e.preventDefault();
        const input = document.getElementById('commentInput');
        const text = input.value.trim();
        
        if (!text || !this.editingTaskId) return;
        
        const task = this.tasks.find(t => t.id === this.editingTaskId);
        if (!task) return;
        
        if (!task.comments) task.comments = [];
        
        task.comments.push({
            id: this.generateId(),
            text,
            author: 'Utilisateur',
            date: new Date().toISOString()
        });
        
        task.updatedAt = new Date().toISOString();
        this.saveToStorage();
        
        input.value = '';
        this.renderComments(task);
    }

    renderComments(task) {
        const container = document.getElementById('commentsList');
        const section = document.getElementById('taskComments');
        
        if (!task.comments || task.comments.length === 0) {
            container.innerHTML = '<div class="empty-message">Aucun commentaire</div>';
        } else {
            container.innerHTML = task.comments
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map(comment => `
                    <div class="comment-item">
                        <div class="comment-author">${this.escapeHtml(comment.author)}</div>
                        <div class="comment-date">${this.formatDateTime(comment.date)}</div>
                        <div class="comment-text">${this.escapeHtml(comment.text)}</div>
                    </div>
                `).join('');
        }
        
        section.style.display = 'block';
    }

    // Partage de listes
    // Rapports hebdomadaires/mensuels
    generateReport(period) {
        const now = new Date();
        let startDate = new Date();
        let title = '';
        
        if (period === 'weekly') {
            startDate.setDate(now.getDate() - 7);
            title = 'Rapport Hebdomadaire';
        } else {
            startDate.setMonth(now.getMonth() - 1);
            title = 'Rapport Mensuel';
        }
        
        // Filtrer les tâches de la période
        const periodTasks = this.tasks.filter(t => {
            const taskDate = new Date(t.createdAt);
            return taskDate >= startDate && taskDate <= now;
        });
        
        const completed = periodTasks.filter(t => t.completed).length;
        const total = periodTasks.length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        // Générer PDF
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            let y = 22;
            
            // En-tête avec bordure
            
            doc.setDrawColor(102, 126, 234);
            doc.setLineWidth(0.8);
            doc.line(14, 15, 196, 15);
            
            // Titre
            doc.setFontSize(18);
            doc.setTextColor(102, 126, 234);
            doc.text(title, 105, y, { align: 'center' });
            y += 6;
            
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text('Periode: ' + this.formatDate(startDate.toISOString().split('T')[0]) + ' - ' + this.formatDate(now.toISOString().split('T')[0]), 105, y, { align: 'center' });
            y += 4;
            
            doc.setDrawColor(102, 126, 234);
            doc.line(14, y, 196, y);
            y += 12;
            
            // Statistiques principales
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(13);
            doc.setFont(undefined, 'bold');
            doc.text('Statistiques Generales', 14, y);
            y += 8;
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            
            doc.text('Total de taches: ' + total, 18, y);
            y += 6;
            doc.text('Taches terminees: ' + completed, 18, y);
            y += 6;
            doc.setTextColor(46, 204, 113);
            doc.text('Taux d\'achevement: ' + completionRate + '%', 18, y);
            doc.setTextColor(50, 50, 50);
            y += 6;
            doc.text('Taches en cours: ' + periodTasks.filter(t => !t.completed).length, 18, y);
            y += 12;
            
            // Répartition par priorité
            doc.setFontSize(13);
            doc.setFont(undefined, 'bold');
            doc.text('Repartition par Priorite', 14, y);
            y += 8;
            
            const priorities = { urgent: 0, high: 0, medium: 0, low: 0 };
            periodTasks.forEach(t => priorities[t.priority]++);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            const priorityLabels = {
                urgent: 'Urgente',
                high: 'Haute',
                medium: 'Moyenne',
                low: 'Basse'
            };
            
            Object.entries(priorities).forEach(([key, count]) => {
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                doc.text(priorityLabels[key] + ': ' + count + ' (' + percentage + '%)', 18, y);
                // Barre de progression
                const barWidth = total > 0 ? (count / total) * 80 : 0;
                doc.setFillColor(220, 220, 220);
                doc.rect(100, y - 3.5, 80, 4, 'F');
                if (key === 'urgent') doc.setFillColor(231, 76, 60);
                else if (key === 'high') doc.setFillColor(243, 156, 18);
                else if (key === 'medium') doc.setFillColor(241, 196, 15);
                else doc.setFillColor(46, 204, 113);
                doc.rect(100, y - 3.5, barWidth, 4, 'F');
                y += 7;
            });
            y += 8;
            
            // Répartition par catégorie
            if (y > 230) { doc.addPage(); y = 20; }
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(13);
            doc.setFont(undefined, 'bold');
            doc.text('Repartition par Categorie', 14, y);
            y += 8;
            
            const categoryCounts = {};
            periodTasks.forEach(t => {
                const cat = this.categories.find(c => c.id === t.categoryId);
                const name = cat ? cat.name : 'Sans categorie';
                categoryCounts[name] = (categoryCounts[name] || 0) + 1;
            });
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            Object.entries(categoryCounts).forEach(([name, count]) => {
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                doc.text(name + ': ' + count + ' (' + percentage + '%)', 18, y);
                y += 6;
                if (y > 270) { doc.addPage(); y = 20; }
            });
            y += 8;
            
            // Top tâches terminées
            if (y > 210) { doc.addPage(); y = 20; }
            doc.setFontSize(13);
            doc.setFont(undefined, 'bold');
            doc.text('Taches Terminees Recentes', 14, y);
            y += 8;
            
            const completedTasks = periodTasks.filter(t => t.completed).slice(0, 15);
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            
            if (completedTasks.length === 0) {
                doc.setTextColor(150, 150, 150);
                doc.text('Aucune tache terminee dans cette periode.', 18, y);
            } else {
                completedTasks.forEach((task, i) => {
                    const cat = this.categories.find(c => c.id === task.categoryId);
                    const text = (i + 1) + '. ' + task.name + (cat ? ' (' + cat.name + ')' : '');
                    const lines = doc.splitTextToSize(text, 170);
                    doc.text(lines, 18, y);
                    y += lines.length * 5;
                    if (y > 270) { doc.addPage(); y = 20; }
                });
            }
            
            // Pied de page
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Page ' + i + ' sur ' + pageCount, 105, 290, { align: 'center' });
                doc.text('Genere le ' + new Date().toLocaleDateString('fr-FR') + ' a ' + new Date().toLocaleTimeString('fr-FR'), 14, 290);
            }
            
            const filename = period === 'weekly' ? 'rapport_hebdomadaire.pdf' : 'rapport_mensuel.pdf';
            doc.save(filename);
            
            alert('Rapport ' + (period === 'weekly' ? 'hebdomadaire' : 'mensuel') + ' genere avec succes !');
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la generation du rapport');
        }
    }

    // ==========================================
    // NOTE DU JOUR
    // ==========================================

    renderNotes() {
        this.updateNoteDate();
        this.loadCurrentNote();
        this.renderNotesHistory();
    }

    updateNoteDate() {
        const dateStr = this.formatDate(this.dateToString(this.currentNoteDate));
        document.getElementById('currentNoteDate').textContent = dateStr;
    }

    dateToString(date) {
        return date.toISOString().split('T')[0];
    }

    loadCurrentNote() {
        const dateKey = this.dateToString(this.currentNoteDate);
        const noteContent = this.dailyNotes[dateKey] || '';
        document.getElementById('dailyNoteInput').value = noteContent;
    }

    saveDailyNote() {
        const dateKey = this.dateToString(this.currentNoteDate);
        const content = document.getElementById('dailyNoteInput').value.trim();
        
        // Ne sauvegarder que si du contenu existe
        if (content) {
            this.dailyNotes[dateKey] = content;
            this.saveToStorage();
            document.getElementById('noteStatus').textContent = `✓ Note sauvegardée le ${new Date().toLocaleTimeString('fr-FR')}`;
        } else {
            // Supprimer la note si vide
            delete this.dailyNotes[dateKey];
            this.saveToStorage();
            document.getElementById('noteStatus').textContent = '💡 Vos notes sont sauvegardées automatiquement';
        }
        
        this.renderNotesHistory();
    }

    changeNoteDay(direction) {
        this.currentNoteDate.setDate(this.currentNoteDate.getDate() + direction);
        this.updateNoteDate();
        this.loadCurrentNote();
    }

    goToToday() {
        this.currentNoteDate = new Date();
        this.updateNoteDate();
        this.loadCurrentNote();
    }

    renderNotesHistory() {
        const container = document.getElementById('notesHistoryList');
        const notes = Object.entries(this.dailyNotes).sort((a, b) => b[0].localeCompare(a[0]));
        
        if (notes.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px;">Aucune note enregistrée</p>';
            return;
        }

        container.innerHTML = notes.map(([date, content]) => {
            const preview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
            return `
                <div class="note-item" onclick="taskManager.loadNoteByDate('${date}')">
                    <div class="note-item-date">${this.formatDate(date)}</div>
                    <div class="note-item-preview">${this.escapeHtml(preview)}</div>
                </div>
            `;
        }).join('');
    }

    loadNoteByDate(dateStr) {
        this.currentNoteDate = new Date(dateStr + 'T12:00:00');
        this.updateNoteDate();
        this.loadCurrentNote();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ==========================================
    // GESTION DES CATÉGORIES (édition/suppression)
    // ==========================================

    openCategoryModal(categoryId = null) {
        this.editingCategoryId = categoryId;
        const modal = document.getElementById('categoryModal');
        const title = document.getElementById('categoryModalTitle');
        const form = document.getElementById('categoryForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if (categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            if (category) {
                title.textContent = 'Modifier la catégorie';
                document.getElementById('categoryName').value = category.name;
                document.getElementById('categoryColor').value = category.color;
                submitBtn.textContent = 'Modifier';
            }
        } else {
            title.textContent = 'Nouvelle catégorie';
            form.reset();
            submitBtn.textContent = 'Créer';
        }
        
        modal.classList.add('active');
        this.renderCategoriesList();
    }

    renderCategoriesList() {
        const container = document.getElementById('categoriesList');
        if (!container) return;
        
        if (this.categories.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;">Aucune catégorie</p>';
            return;
        }

        container.innerHTML = this.categories.map(cat => `
            <div class="category-item" style="border-left-color:${cat.color}">
                <div class="category-color-indicator" style="background:${cat.color}"></div>
                <div class="category-info">
                    <div class="category-name">${this.escapeHtml(cat.name)}</div>
                </div>
                <div class="category-actions">
                    <button class="btn btn-icon" onclick="taskManager.openCategoryModal('${cat.id}')" title="Modifier">✏️</button>
                    <button class="btn btn-icon" onclick="taskManager.deleteCategory('${cat.id}')" title="Supprimer">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    deleteCategory(categoryId) {
        if (!confirm('Supprimer cette catégorie ? Les tâches associées ne seront pas supprimées.')) return;
        
        this.categories = this.categories.filter(c => c.id !== categoryId);
        this.saveToStorage();
        this.renderCategoriesList();
        this.render();
    }

    // ==========================================
    // PIÈCES JOINTES
    // ==========================================

    handleAttachments(e) {
        const files = Array.from(e.target.files);
        this._pendingAttachments = files;
        this.renderAttachmentsList(files);
    }

    renderAttachmentsList(files) {
        const container = document.getElementById('attachmentsList');
        if (!container) return;
        
        if (!files || files.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9em;">Aucune pièce jointe</p>';
            return;
        }

        container.innerHTML = files.map((file, index) => {
            const icon = this.getFileIcon(file.name);
            const size = this.formatFileSize(file.size);
            return `
                <div class="attachment-item">
                    <span class="attachment-icon">${icon}</span>
                    <div class="attachment-info">
                        <div class="attachment-name">${this.escapeHtml(file.name)}</div>
                        <div class="attachment-size">${size}</div>
                    </div>
                    <div class="attachment-actions">
                        <button type="button" class="btn btn-icon" onclick="taskManager.previewAttachment(${index})" title="Aperçu">👁️</button>
                        <button type="button" class="btn btn-icon" onclick="taskManager.removeAttachment(${index})" title="Retirer">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'pdf': '📄',
            'doc': '📝', 'docx': '📝',
            'xls': '📊', 'xlsx': '📊',
            'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️',
            'zip': '📦', 'rar': '📦',
            'md': '📋', 'txt': '📋',
            'js': '💻', 'py': '💻', 'java': '💻', 'cpp': '💻'
        };
        return icons[ext] || '📎';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    removeAttachment(index) {
        if (!this._pendingAttachments) return;
        this._pendingAttachments.splice(index, 1);
        this.renderAttachmentsList(this._pendingAttachments);
    }

    async previewAttachment(index) {
        // Vérifier d'abord les pièces jointes déjà sauvegardées
        if (this._pendingAttachments && this._pendingAttachments[index]) {
            const item = this._pendingAttachments[index];
            
            // Si c'est un objet déjà sauvegardé (avec content)
            if (item.content) {
                this.showAttachmentPreview(item);
                return;
            }
            
            // Sinon c'est un fichier File qu'on doit lire
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const content = e.target.result;
                this.showAttachmentPreview({
                    name: item.name,
                    type: item.type,
                    content: content
                });
            };
            
            if (item.type.startsWith('image/')) {
                reader.readAsDataURL(item);
            } else if (item.name.endsWith('.md') || item.type === 'text/markdown' || item.type.startsWith('text/')) {
                reader.readAsText(item);
            } else {
                reader.readAsDataURL(item);
            }
        }
    }

    showAttachmentPreview(attachment) {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'attachment-preview';
        previewDiv.style.position = 'fixed';
        previewDiv.style.top = '50%';
        previewDiv.style.left = '50%';
        previewDiv.style.transform = 'translate(-50%, -50%)';
        previewDiv.style.maxWidth = '80%';
        previewDiv.style.maxHeight = '80%';
        previewDiv.style.zIndex = '10000';
        previewDiv.style.overflow = 'auto';
        previewDiv.style.padding = '20px';
        
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.7)';
        overlay.style.zIndex = '9999';
        overlay.onclick = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(previewDiv);
        };
        
        // Décoder le contenu si c'est du Base64 et que c'est un fichier texte/markdown
        let content = attachment.content;
        const isTextFile = attachment.name.endsWith('.md') || (attachment.type && attachment.type.startsWith('text/'));
        
        if (isTextFile && content.startsWith('data:')) {
            // Extraire et décoder le Base64
            const base64Data = content.split(',')[1];
            try {
                content = decodeURIComponent(escape(atob(base64Data)));
            } catch (e) {
                content = atob(base64Data);
            }
        }
        
        if (attachment.type && attachment.type.startsWith('image/')) {
            previewDiv.innerHTML = `
                <h3>${this.escapeHtml(attachment.name)}</h3>
                <img src="${attachment.content}" style="max-width:100%;">
            `;
        } else if (attachment.name.endsWith('.md')) {
            // Utiliser marked.js pour le rendu Markdown
            const htmlContent = typeof marked !== 'undefined' ? marked.parse(content) : `<pre>${this.escapeHtml(content)}</pre>`;
            previewDiv.innerHTML = `
                <h3>📋 ${this.escapeHtml(attachment.name)}</h3>
                <div class="markdown-content">${htmlContent}</div>
            `;
        } else if (attachment.type && attachment.type.startsWith('text/')) {
            previewDiv.innerHTML = `
                <h3>${this.escapeHtml(attachment.name)}</h3>
                <pre>${this.escapeHtml(content)}</pre>
            `;
        } else {
            previewDiv.innerHTML = `
                <div style="text-align:center;padding:40px 20px;">
                    <h3 style="margin-bottom:20px;">${this.escapeHtml(attachment.name)}</h3>
                    <p style="color:#888;margin-bottom:30px;">Aperçu non disponible pour ce type de fichier</p>
                    <a href="${attachment.content}" download="${attachment.name}" class="btn btn-primary" style="display:inline-block;padding:12px 24px;background:#667eea;color:white;border-radius:8px;text-decoration:none;font-weight:600;box-shadow:0 2px 8px rgba(102,126,234,0.3);transition:all 0.3s;" onmouseover="this.style.background='#5568d3'" onmouseout="this.style.background='#667eea'">📥 Télécharger</a>
                </div>
            `;
        }
        
        document.body.appendChild(overlay);
        document.body.appendChild(previewDiv);
    }

    // Ouvrir la modale d'exportation
    openExportModal() {
        document.getElementById('exportModal').classList.add('active');
    }
}

// Initialiser l'application
let taskManager;
document.addEventListener('DOMContentLoaded', () => {
    taskManager = new TaskManager();
});
