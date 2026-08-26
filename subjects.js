/**
 * Subjects View (Maths, Physique, Info)
 * Features:
 * - 3 sub-tabs: Maths, Physique-Chimie, Informatique
 * - Sub-subjects as accordions
 * - Open/closed accordion state stored in sessionStorage (persists during page navigation, resets on browser close)
 * - 3 categories for Maths, 2 categories for Physique/Info
 * - Live KaTeX LaTeX formula rendering & instant auto-save
 */

import { store } from '../store.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';

const ACCORDION_STORAGE_KEY = 'studyflow_accordions_state';

export const SubjectsView = {
  currentSubject: 'maths', // 'maths' | 'physique' | 'info'

  subjectsMeta: {
    maths: {
      name: 'Mathématiques',
      subtitle: 'Algèbre, Analyse, Probabilités, Géométrie',
      icon: 'calculator',
      color: 'blue',
      categories: [
        { key: 'exosTodo', label: 'Exos à faire', icon: 'list-todo' },
        { key: 'exosHard', label: 'Exos durs / typiques à revoir', icon: 'flame' },
        { key: 'methods', label: 'Méthodes et formules à connaître', icon: 'sparkles' }
      ]
    },
    physique: {
      name: 'Physique - Chimie',
      subtitle: 'Thermodynamique, Électromagnétisme, Optique, Mécanique',
      icon: 'atom',
      color: 'emerald',
      categories: [
        { key: 'exosTodo', label: 'Exos à faire', icon: 'list-todo' },
        { key: 'methods', label: 'Méthodes et formules à connaître', icon: 'sparkles' }
      ]
    },
    info: {
      name: 'Informatique',
      subtitle: 'Algorithmique, Programmation Python/C, SQL & Graphes',
      icon: 'terminal',
      color: 'purple',
      categories: [
        { key: 'exosTodo', label: 'Exos à faire', icon: 'list-todo' },
        { key: 'methods', label: 'Méthodes et formules à connaître', icon: 'sparkles' }
      ]
    }
  },

  _getOpenAccordions() {
    try {
      const stored = sessionStorage.getItem(ACCORDION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  },

  _saveAccordionState(id, isOpen) {
    try {
      const state = this._getOpenAccordions();
      state[id] = isOpen;
      sessionStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  },

  render(container) {
    const meta = this.subjectsMeta[this.currentSubject];
    const chapters = store.getSubjectData(this.currentSubject);
    const accordionState = this._getOpenAccordions();

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header & Subject Switcher Tabs -->
        <div class="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div class="flex items-center gap-3">
            <div class="p-3 rounded-2xl bg-${meta.color}-50 dark:bg-${meta.color}-950/60 text-${meta.color}-600 dark:text-${meta.color}-400 border border-${meta.color}-200/60 dark:border-${meta.color}-900/60">
              <i data-lucide="${meta.icon}" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">${meta.name}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">${meta.subtitle}</p>
            </div>
          </div>

          <!-- Tabs: Maths / Physique / Info -->
          <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button data-subj="maths" class="subj-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${this.currentSubject === 'maths' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}">
              Maths
            </button>
            <button data-subj="physique" class="subj-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${this.currentSubject === 'physique' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}">
              Physique
            </button>
            <button data-subj="info" class="subj-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${this.currentSubject === 'info' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}">
              Informatique
            </button>
          </div>

        </div>

        <!-- Action Bar: Add Chapter -->
        <div class="flex items-center justify-between">
          <div class="text-xs text-slate-500 font-medium">
            ${chapters.length} sous-matière(s) / chapitre(s)
          </div>
          <button id="add-chapter-btn" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-brand-500/20">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Ajouter une sous-matière</span>
          </button>
        </div>

        <!-- Accordions List -->
        <div class="space-y-4" id="chapters-accordion-list">
          ${chapters.length === 0 ? `
            <div class="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p class="text-sm text-slate-400">Aucun chapitre créé dans cette matière.</p>
              <button id="empty-add-ch-btn" class="mt-3 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold">Créer un premier chapitre</button>
            </div>
          ` : chapters.map(ch => {
            const isOpen = accordionState[ch.id] === true;
            return `
              <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200" data-chapter-box="${ch.id}">
                
                <!-- Accordion Header -->
                <div class="accordion-header px-5 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/40 transition-colors" data-toggle-ch="${ch.id}">
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-${meta.color}-500"></div>
                    <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">${ch.title}</h3>
                  </div>
                  <div class="flex items-center gap-3">
                    <button data-delete-ch="${ch.id}" title="Supprimer ce chapitre" class="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                    <div class="p-1 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-500 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}" id="acc-chevron-${ch.id}">
                      <i data-lucide="chevron-down" class="w-4 h-4"></i>
                    </div>
                  </div>
                </div>

                <!-- Accordion Content Body -->
                <div class="accordion-content ${isOpen ? 'open' : ''} border-t border-slate-100 dark:border-slate-800/80 p-5 space-y-5" id="acc-content-${ch.id}">
                  
                  <div class="grid grid-cols-1 ${meta.categories.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4">
                    ${meta.categories.map(cat => `
                      <div class="flex flex-col space-y-2 bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/70">
                        <div class="flex items-center justify-between">
                          <label class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <i data-lucide="${cat.icon}" class="w-3.5 h-3.5 text-${meta.color}-500"></i>
                            ${cat.label}
                          </label>
                          <span class="text-[10px] text-slate-400 font-mono">LaTeX OK</span>
                        </div>
                        <textarea data-ch-id="${ch.id}" data-cat="${cat.key}" placeholder="Saisir des notes, exos ou formules (ex: $x^2 + y^2 = 1$)..." rows="6" class="chapter-textarea flex-1 w-full text-xs font-mono p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y leading-relaxed">${ch[cat.key] || ''}</textarea>
                        
                        <!-- KaTeX Live Math Preview Box -->
                        <div class="katex-preview-box text-xs p-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 min-h-[32px] overflow-x-auto" id="preview-${ch.id}-${cat.key}"></div>
                      </div>
                    `).join('')}
                  </div>

                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    this._bindEvents(container);
    this._renderAllKatexPreviews(container);
  },

  _bindEvents(container) {
    // Switch subject tabs
    container.querySelectorAll('.subj-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentSubject = btn.dataset.subj;
        this.render(container);
      });
    });

    // Add chapter buttons
    const addBtn = container.querySelector('#add-chapter-btn');
    const emptyAddBtn = container.querySelector('#empty-add-ch-btn');
    if (addBtn) addBtn.addEventListener('click', () => this._openAddChapterModal());
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => this._openAddChapterModal());

    // Accordion click handlers
    container.querySelectorAll('[data-toggle-ch]').forEach(header => {
      header.addEventListener('click', (e) => {
        // Prevent if click was on delete button
        if (e.target.closest('[data-delete-ch]')) return;

        const chId = header.dataset.toggleCh;
        const content = container.querySelector(`#acc-content-${chId}`);
        const chevron = container.querySelector(`#acc-chevron-${chId}`);

        if (content) {
          const isOpen = content.classList.contains('open');
          if (isOpen) {
            content.classList.remove('open');
            if (chevron) chevron.classList.remove('rotate-180');
            this._saveAccordionState(chId, false);
          } else {
            content.classList.add('open');
            if (chevron) chevron.classList.add('rotate-180');
            this._saveAccordionState(chId, true);
          }
        }
      });
    });

    // Delete chapter handlers
    container.querySelectorAll('[data-delete-ch]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chId = btn.dataset.deleteCh;
        if (confirm('Voulez-vous vraiment supprimer cette sous-matière ?')) {
          store.deleteSubjectChapter(this.currentSubject, chId);
          Toast.info('Sous-matière supprimée');
          this.render(container);
        }
      });
    });

    // Textarea live changes & auto-save
    container.querySelectorAll('.chapter-textarea').forEach(textarea => {
      const chId = textarea.dataset.chId;
      const cat = textarea.dataset.cat;
      const previewEl = container.querySelector(`#preview-${chId}-${cat}`);

      const updatePreview = () => {
        this._renderMathInElement(previewEl, textarea.value);
      };

      textarea.addEventListener('input', () => {
        updatePreview();
      });

      textarea.addEventListener('blur', () => {
        store.updateSubjectChapter(this.currentSubject, chId, { [cat]: textarea.value });
      });
    });
  },

  _renderAllKatexPreviews(container) {
    container.querySelectorAll('.chapter-textarea').forEach(textarea => {
      const chId = textarea.dataset.chId;
      const cat = textarea.dataset.cat;
      const previewEl = container.querySelector(`#preview-${chId}-${cat}`);
      if (previewEl) {
        this._renderMathInElement(previewEl, textarea.value);
      }
    });
  },

  _renderMathInElement(el, text) {
    if (!el) return;
    if (!text || !text.trim()) {
      el.innerHTML = '<span class="text-slate-400 italic text-[11px]">Aperçu des formules LaTeX...</span>';
      return;
    }

    // Convert newlines to breaks and sanitize lightly
    const formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');

    el.innerHTML = formatted;

    if (window.renderMathInElement) {
      window.renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    }
  },

  _openAddChapterModal() {
    const meta = this.subjectsMeta[this.currentSubject];
    const content = `
      <form id="add-ch-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nom du chapitre / sous-matière *</label>
          <input type="text" id="ch-title-input" required placeholder="Ex: Réduction des endomorphismes / Ondes mécaniques" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
        </div>
      </form>
    `;

    Modal.open({
      title: `Ajouter un chapitre (${meta.name})`,
      content,
      footer: `
        <button id="cancel-ch-btn" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-500">Annuler</button>
        <button id="save-ch-btn" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold">Ajouter</button>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector('#cancel-ch-btn').addEventListener('click', () => Modal.close());
        modalEl.querySelector('#save-ch-btn').addEventListener('click', () => {
          const title = modalEl.querySelector('#ch-title-input').value.trim();
          if (!title) {
            Toast.warning('Veuillez entrer un titre pour ce chapitre.');
            return;
          }

          const newChapter = {
            id: `${this.currentSubject}_ch_${Date.now()}`,
            title,
            exosTodo: '',
            exosHard: '',
            methods: ''
          };

          store.addSubjectChapter(this.currentSubject, newChapter);
          this._saveAccordionState(newChapter.id, true); // Auto-open newly added chapter
          Toast.success('Chapitre ajouté !');
          Modal.close();

          const mainContainer = document.getElementById('view-subjects');
          if (mainContainer) this.render(mainContainer);
        });
      }
    });
  }
};
