/**
 * Long Term Goals & Project Planning View
 * Features:
 * - Structured categories (TIPE/Projets, Concours, Révisions, Objectifs Semestre)
 * - Deadline tracking with remaining days calculation
 * - Priority badges & status progress (À faire, En cours, Terminé)
 * - Modal to add / edit goals
 */

import { store } from '../store.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';

export const LongtermView = {
  currentCategoryFilter: 'all',

  categories: [
    'Projets & TIPE',
    'Inscriptions & Concours',
    'Révisions Concours/Partiels',
    'Objectifs Semestre'
  ],

  render(container) {
    const todos = store.getLongtermTodos();
    const filteredTodos = this.currentCategoryFilter === 'all' 
      ? todos 
      : todos.filter(t => t.category === this.currentCategoryFilter);

    // Summary metrics
    const totalCount = todos.length;
    const doneCount = todos.filter(t => t.status === 'done').length;
    const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
    const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header & Stats -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div class="flex items-center gap-3">
            <div class="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60">
              <i data-lucide="target" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Planification & Objectifs Long Terme</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">TIPE, concours, grands projets et jalons du semestre</p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <!-- Progress Pill -->
            <div class="bg-slate-50 dark:bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div class="text-right">
                <div class="text-xs font-bold text-slate-900 dark:text-slate-100">${doneCount} / ${totalCount} validé(s)</div>
                <div class="text-[10px] text-slate-500">${inProgressCount} en cours</div>
              </div>
              <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border-2 border-brand-500">
                ${progressPercent}%
              </div>
            </div>

            <!-- Add Goal Button -->
            <button id="add-longterm-btn" class="px-4 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-all flex items-center gap-2 shadow-md shadow-brand-500/20">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Nouvel objectif</span>
            </button>
          </div>

        </div>

        <!-- Category Filters -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
          <button data-cat="all" class="cat-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${this.currentCategoryFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}">
            Tous (${todos.length})
          </button>
          ${this.categories.map(cat => {
            const count = todos.filter(t => t.category === cat).length;
            return `
              <button data-cat="${cat}" class="cat-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${this.currentCategoryFilter === cat ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}">
                ${cat} (${count})
              </button>
            `;
          }).join('')}
        </div>

        <!-- Goals Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="longterm-list">
          ${filteredTodos.length === 0 ? `
            <div class="col-span-2 p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <i data-lucide="sparkles" class="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50"></i>
              <p class="text-sm text-slate-400 font-medium">Aucun objectif dans cette catégorie.</p>
            </div>
          ` : filteredTodos.map(todo => {
            const daysRemaining = this._computeDaysRemaining(todo.deadline);
            return `
              <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                
                <div>
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full ${this._getCategoryBadgeStyle(todo.category)}">
                      ${todo.category}
                    </span>
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${this._getPriorityBadgeStyle(todo.priority)}">
                        ${this._getPriorityLabel(todo.priority)}
                      </span>
                      <button data-delete-lt="${todo.id}" class="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>

                  <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 ${todo.status === 'done' ? 'line-through text-slate-400 dark:text-slate-500' : ''}">
                    ${todo.title}
                  </h3>

                  ${todo.notes ? `
                    <p class="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      ${todo.notes}
                    </p>
                  ` : ''}
                </div>

                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  
                  <!-- Deadline status -->
                  <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                    <span>${todo.deadline ? new Date(todo.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Pas de date'}</span>
                    ${daysRemaining !== null ? `
                      <span class="font-semibold text-[10px] px-1.5 py-0.2 rounded ${daysRemaining < 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : daysRemaining <= 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
                        ${daysRemaining < 0 ? 'Dépassé' : `J-${daysRemaining}`}
                      </span>
                    ` : ''}
                  </div>

                  <!-- Status Selector -->
                  <select data-status-lt="${todo.id}" class="text-xs font-semibold px-2.5 py-1 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 ${this._getStatusSelectStyle(todo.status)}">
                    <option value="todo" ${todo.status === 'todo' ? 'selected' : ''}>À faire</option>
                    <option value="in_progress" ${todo.status === 'in_progress' ? 'selected' : ''}>En cours</option>
                    <option value="done" ${todo.status === 'done' ? 'selected' : ''}>Terminé ✓</option>
                  </select>

                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    this._bindEvents(container);
  },

  _computeDaysRemaining(deadlineStr) {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = deadline - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  _getCategoryBadgeStyle(cat) {
    switch (cat) {
      case 'Projets & TIPE': return 'bg-pink-100 text-pink-700 dark:bg-pink-950/70 dark:text-pink-300';
      case 'Inscriptions & Concours': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300';
      case 'Révisions Concours/Partiels': return 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300';
      default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300';
    }
  },

  _getPriorityBadgeStyle(priority) {
    switch (priority) {
      case 'urgent': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300';
      case 'important': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  },

  _getPriorityLabel(priority) {
    switch (priority) {
      case 'urgent': return '🔥 Urgent';
      case 'important': return '⚡ Important';
      default: return 'Normal';
    }
  },

  _getStatusSelectStyle(status) {
    switch (status) {
      case 'done': return 'text-emerald-600 dark:text-emerald-400';
      case 'in_progress': return 'text-brand-600 dark:text-brand-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  },

  _bindEvents(container) {
    // Filter categories
    container.querySelectorAll('.cat-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentCategoryFilter = btn.dataset.cat;
        this.render(container);
      });
    });

    // Add Goal Button
    const addBtn = container.querySelector('#add-longterm-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this._openAddGoalModal(container));
    }

    // Change status select
    container.querySelectorAll('[data-status-lt]').forEach(select => {
      select.addEventListener('change', () => {
        const id = select.dataset.statusLt;
        store.updateLongtermTodo(id, { status: select.value });
        this.render(container);
      });
    });

    // Delete goal
    container.querySelectorAll('[data-delete-lt]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteLt;
        if (confirm('Voulez-vous supprimer cet objectif ?')) {
          store.deleteLongtermTodo(id);
          Toast.info('Objectif supprimé');
          this.render(container);
        }
      });
    });
  },

  _openAddGoalModal(container) {
    const content = `
      <form id="add-goal-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Titre de l'objectif *</label>
          <input type="text" id="goal-title" required placeholder="Ex: Rédiger le rapport TIPE / Inscription concours" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Catégorie *</label>
            <select id="goal-category" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
              ${this.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Priorité</label>
            <select id="goal-priority" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
              <option value="normal">Normal</option>
              <option value="important">⚡ Important</option>
              <option value="urgent">🔥 Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date limite / Échéance</label>
          <input type="date" id="goal-deadline" value="${new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes & Détails</label>
          <textarea id="goal-notes" rows="3" placeholder="Étapes clés, contacts, consignes..." class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"></textarea>
        </div>
      </form>
    `;

    Modal.open({
      title: 'Ajouter un objectif à long terme',
      content,
      footer: `
        <button id="cancel-goal-btn" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-500">Annuler</button>
        <button id="save-goal-btn" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold">Enregistrer</button>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector('#cancel-goal-btn').addEventListener('click', () => Modal.close());
        modalEl.querySelector('#save-goal-btn').addEventListener('click', () => {
          const title = modalEl.querySelector('#goal-title').value.trim();
          if (!title) {
            Toast.warning('Veuillez renseigner le titre de l\'objectif.');
            return;
          }

          const newGoal = {
            title,
            category: modalEl.querySelector('#goal-category').value,
            priority: modalEl.querySelector('#goal-priority').value,
            deadline: modalEl.querySelector('#goal-deadline').value,
            notes: modalEl.querySelector('#goal-notes').value.trim(),
            status: 'todo'
          };

          store.addLongtermTodo(newGoal);
          Toast.success('Objectif ajouté !');
          Modal.close();
          this.render(container);
        });
      }
    });
  }
};
