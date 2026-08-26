/**
 * Flashcards & Colles Revision View
 * Features:
 * - Decks organized by subject and upcoming colles/chapters
 * - LaTeX formula rendering on Front & Back (via KaTeX)
 * - Interactive Quizlet/Anki revision mode: 3D flip card, "Je connais" / "Je ne connais pas", retry failed cards
 * - Batch File Import: imports .txt/.md files with ':::', '---', 'Q:/A:' or TSV format with live preview
 */

import { store } from '../store.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';

export const FlashcardsView = {
  currentSubjectFilter: 'all',
  
  // State for active revision session
  activeSession: null, // { deckId, cards: [], currentIndex: 0, known: [], unknown: [], isFlipped: false }

  render(container) {
    if (this.activeSession) {
      this._renderRevisionMode(container);
      return;
    }

    const decks = store.getFlashcardDecks();
    const filteredDecks = this.currentSubjectFilter === 'all'
      ? decks
      : decks.filter(d => d.subject.toLowerCase() === this.currentSubjectFilter.toLowerCase());

    const totalCardsCount = decks.reduce((acc, d) => acc + (d.cards ? d.cards.length : 0), 0);

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header & Action Buttons -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div class="flex items-center gap-3">
            <div class="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/60">
              <i data-lucide="sparkles" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Révisions de Colles & Flashcards</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Répétition active avec support LaTeX complet ($...$ et $$...$$)</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 flex-wrap">
            <button id="import-deck-file-btn" class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm">
              <i data-lucide="file-up" class="w-4 h-4 text-brand-500"></i>
              <span>Importer un fichier de colles</span>
            </button>
            <button id="create-deck-btn" class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-all flex items-center gap-1.5 shadow-md shadow-brand-500/20">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Nouveau paquet</span>
            </button>
          </div>

        </div>

        <!-- Subject Filter Tabs -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
          <button data-subj="all" class="deck-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${this.currentSubjectFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}">
            Tous les paquets (${totalCardsCount} cartes)
          </button>
          <button data-subj="maths" class="deck-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${this.currentSubjectFilter === 'maths' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}">
            Maths
          </button>
          <button data-subj="physique" class="deck-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${this.currentSubjectFilter === 'physique' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}">
            Physique
          </button>
          <button data-subj="info" class="deck-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${this.currentSubjectFilter === 'info' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}">
            Info
          </button>
        </div>

        <!-- Decks Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="decks-grid">
          ${filteredDecks.length === 0 ? `
            <div class="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <i data-lucide="layers" class="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-40"></i>
              <p class="text-sm text-slate-400 font-medium">Aucun paquet de flashcards dans cette catégorie.</p>
              <button id="empty-create-deck-btn" class="mt-3 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold">Créer un paquet</button>
            </div>
          ` : filteredDecks.map(deck => {
            const cardCount = deck.cards ? deck.cards.length : 0;
            return `
              <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all group">
                
                <div>
                  <div class="flex items-center justify-between gap-2 mb-2.5">
                    <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${this._getSubjectBadgeStyle(deck.subject)}">
                      ${deck.subject}
                    </span>
                    <div class="flex items-center gap-1">
                      <button data-add-card="${deck.id}" title="Ajouter une carte" class="text-slate-400 hover:text-brand-600 p-1 rounded transition-colors">
                        <i data-lucide="plus-circle" class="w-4 h-4"></i>
                      </button>
                      <button data-delete-deck="${deck.id}" title="Supprimer le paquet" class="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </div>

                  <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    ${deck.deckName}
                  </h3>

                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                    ${cardCount} carte${cardCount > 1 ? 's' : ''} de révision
                  </p>
                </div>

                <!-- Action Button: Start Quizlet Mode -->
                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button data-view-deck="${deck.id}" class="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline">
                    Gérer cartes
                  </button>
                  <button data-start-quiz="${deck.id}" ${cardCount === 0 ? 'disabled' : ''} class="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm">
                    <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
                    <span>Réviser (Quizlet)</span>
                  </button>
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

  _getSubjectBadgeStyle(subject) {
    const s = (subject || '').toLowerCase();
    if (s.includes('math')) return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
    if (s.includes('phys')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    if (s.includes('info')) return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
  },

  _bindEvents(container) {
    // Subject filter
    container.querySelectorAll('.deck-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentSubjectFilter = btn.dataset.subj;
        this.render(container);
      });
    });

    // Create deck
    const createBtn = container.querySelector('#create-deck-btn');
    const emptyCreateBtn = container.querySelector('#empty-create-deck-btn');
    if (createBtn) createBtn.addEventListener('click', () => this._openCreateDeckModal(container));
    if (emptyCreateBtn) emptyCreateBtn.addEventListener('click', () => this._openCreateDeckModal(container));

    // Import file button
    const importFileBtn = container.querySelector('#import-deck-file-btn');
    if (importFileBtn) {
      importFileBtn.addEventListener('click', () => this._openBatchImportModal(container));
    }

    // Add card to deck
    container.querySelectorAll('[data-add-card]').forEach(btn => {
      btn.addEventListener('click', () => {
        const deckId = btn.dataset.addCard;
        this._openAddCardModal(deckId, container);
      });
    });

    // Delete deck
    container.querySelectorAll('[data-delete-deck]').forEach(btn => {
      btn.addEventListener('click', () => {
        const deckId = btn.dataset.deleteDeck;
        if (confirm('Voulez-vous vraiment supprimer ce paquet de cartes ?')) {
          store.deleteFlashcardDeck(deckId);
          Toast.info('Paquet supprimé');
          this.render(container);
        }
      });
    });

    // View / Manage cards list in deck
    container.querySelectorAll('[data-view-deck]').forEach(btn => {
      btn.addEventListener('click', () => {
        const deckId = btn.dataset.viewDeck;
        this._openDeckCardsModal(deckId, container);
      });
    });

    // Start Quizlet revision session
    container.querySelectorAll('[data-start-quiz]').forEach(btn => {
      btn.addEventListener('click', () => {
        const deckId = btn.dataset.startQuiz;
        const decks = store.getFlashcardDecks();
        const deck = decks.find(d => d.id === deckId);
        if (deck && deck.cards && deck.cards.length > 0) {
          // Clone cards to session
          this.activeSession = {
            deckId: deck.id,
            deckName: deck.deckName,
            subject: deck.subject,
            cards: [...deck.cards],
            currentIndex: 0,
            known: [],
            unknown: [],
            isFlipped: false
          };
          this.render(container);
        }
      });
    });
  },

  // --------------------------------------------------------------------------
  // Interactive Quizlet / Anki Revision Mode
  // --------------------------------------------------------------------------
  _renderRevisionMode(container) {
    const session = this.activeSession;
    const isFinished = session.currentIndex >= session.cards.length;

    if (isFinished) {
      // Summary Screen
      const total = session.cards.length;
      const knownCount = session.known.length;
      const unknownCount = session.unknown.length;
      const scorePct = total > 0 ? Math.round((knownCount / total) * 100) : 0;

      container.innerHTML = `
        <div class="max-w-xl mx-auto space-y-6 animate-fade-in py-8">
          
          <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
            
            <div class="w-16 h-16 rounded-3xl mx-auto bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
              <i data-lucide="trophy" class="w-8 h-8"></i>
            </div>

            <div>
              <h2 class="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Session de révision terminée !</h2>
              <p class="text-xs text-slate-500 mt-1">${session.deckName} (${session.subject})</p>
            </div>

            <!-- Score Pill -->
            <div class="grid grid-cols-2 gap-4 max-w-xs mx-auto">
              <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900">
                <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400">${knownCount}</div>
                <div class="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Maîtrisées ✅</div>
              </div>
              <div class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900">
                <div class="text-2xl font-black text-rose-600 dark:text-rose-400">${unknownCount}</div>
                <div class="text-xs font-semibold text-rose-800 dark:text-rose-300">À revoir ❌</div>
              </div>
            </div>

            <!-- Progress bar -->
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Taux de réussite</span>
                <span>${scorePct}%</span>
              </div>
              <div class="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500" style="width: ${scorePct}%"></div>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              ${unknownCount > 0 ? `
                <button id="retry-failed-cards-btn" class="w-full sm:w-auto px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2">
                  <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                  <span>Revoir uniquement les ${unknownCount} ratées</span>
                </button>
              ` : ''}
              <button id="restart-deck-btn" class="w-full sm:w-auto px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                <span>Recommencer tout</span>
              </button>
              <button id="quit-quiz-btn" class="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold transition-all">
                Quitter
              </button>
            </div>

          </div>

        </div>
      `;

      if (window.lucide) window.lucide.createIcons();

      const retryBtn = container.querySelector('#retry-failed-cards-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.activeSession = {
            ...session,
            cards: [...session.unknown],
            currentIndex: 0,
            known: [],
            unknown: [],
            isFlipped: false
          };
          this.render(container);
        });
      }

      container.querySelector('#restart-deck-btn').addEventListener('click', () => {
        const decks = store.getFlashcardDecks();
        const deck = decks.find(d => d.id === session.deckId);
        this.activeSession = {
          ...session,
          cards: deck ? [...deck.cards] : [...session.cards],
          currentIndex: 0,
          known: [],
          unknown: [],
          isFlipped: false
        };
        this.render(container);
      });

      container.querySelector('#quit-quiz-btn').addEventListener('click', () => {
        this.activeSession = null;
        this.render(container);
      });

      return;
    }

    // Active Card View
    const card = session.cards[session.currentIndex];
    const progress = Math.round(((session.currentIndex) / session.cards.length) * 100);

    container.innerHTML = `
      <div class="max-w-2xl mx-auto space-y-5 animate-fade-in">
        
        <!-- Revision Top Bar -->
        <div class="flex items-center justify-between">
          <button id="exit-quiz-btn" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span>Retour aux paquets</span>
          </button>

          <div class="text-xs font-bold text-slate-600 dark:text-slate-400">
            Carte ${session.currentIndex + 1} / ${session.cards.length}
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              ${session.known.length} ✓
            </span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
              ${session.unknown.length} ✗
            </span>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full bg-brand-500 transition-all duration-300" style="width: ${progress}%"></div>
        </div>

        <!-- 3D Flashcard Container -->
        <div class="flashcard-scene" id="flashcard-scene">
          <div class="flashcard-card ${session.isFlipped ? 'flipped' : ''}" id="flashcard-card-el">
            
            <!-- Front Face (Question) -->
            <div class="flashcard-face bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xl">
              <div class="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                <span>QUESTION</span>
                <span class="text-[10px] font-mono flex items-center gap-1">
                  <i data-lucide="mouse-pointer-click" class="w-3.5 h-3.5"></i>
                  Cliquer ou [Espace] pour retourner
                </span>
              </div>

              <div class="my-auto py-6 text-center text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 select-none katex-render-target" id="card-front-text"></div>

              <div class="text-center text-xs text-brand-600 dark:text-brand-400 font-semibold">
                Afficher la réponse ↺
              </div>
            </div>

            <!-- Back Face (Answer) -->
            <div class="flashcard-face flashcard-face-back bg-brand-50/90 dark:bg-slate-900 border-2 border-brand-300 dark:border-brand-800 shadow-xl">
              <div class="flex items-center justify-between text-xs text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider">
                <span>RÉPONSE & FORMULE</span>
                <span class="text-[10px] font-mono">Retourner ↺</span>
              </div>

              <div class="my-auto py-6 text-center text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 select-none katex-render-target" id="card-back-text"></div>

              <div class="text-center text-xs text-slate-400 font-semibold">
                Évaluez votre réponse ci-dessous
              </div>
            </div>

          </div>
        </div>

        <!-- Action Controls: Je ne connais pas / Je connais -->
        <div class="grid grid-cols-2 gap-4 pt-2">
          <button id="btn-dont-know" class="py-3.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-95">
            <i data-lucide="x" class="w-5 h-5"></i>
            <span>Je ne connais pas [←]</span>
          </button>
          
          <button id="btn-know" class="py-3.5 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-95">
            <i data-lucide="check" class="w-5 h-5"></i>
            <span>Je connais [→]</span>
          </button>
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Render KaTeX in Card Front & Back
    const frontEl = container.querySelector('#card-front-text');
    const backEl = container.querySelector('#card-back-text');
    this._renderMath(frontEl, card.front);
    this._renderMath(backEl, card.back);

    // Bind Flip & Controls
    const cardEl = container.querySelector('#flashcard-card-el');
    const toggleFlip = () => {
      session.isFlipped = !session.isFlipped;
      cardEl.classList.toggle('flipped', session.isFlipped);
    };

    cardEl.addEventListener('click', toggleFlip);

    // Don't know button
    container.querySelector('#btn-dont-know').addEventListener('click', () => {
      session.unknown.push(card);
      session.currentIndex++;
      session.isFlipped = false;
      this.render(container);
    });

    // Know button
    container.querySelector('#btn-know').addEventListener('click', () => {
      session.known.push(card);
      session.currentIndex++;
      session.isFlipped = false;
      this.render(container);
    });

    // Exit
    container.querySelector('#exit-quiz-btn').addEventListener('click', () => {
      this.activeSession = null;
      this.render(container);
    });

    // Keyboard controls
    this._handleKeyRevision = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        toggleFlip();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        container.querySelector('#btn-dont-know')?.click();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        container.querySelector('#btn-know')?.click();
      }
    };
    document.removeEventListener('keydown', this._prevKeyHandler);
    document.addEventListener('keydown', this._handleKeyRevision);
    this._prevKeyHandler = this._handleKeyRevision;
  },

  _renderMath(el, text) {
    if (!el) return;
    el.innerHTML = (text || '').replace(/\n/g, '<br/>');
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

  // --------------------------------------------------------------------------
  // Batch File Import Modal (Colles & Flashcards Parser)
  // --------------------------------------------------------------------------
  _openBatchImportModal(container) {
    const decks = store.getFlashcardDecks();

    const content = `
      <div class="space-y-4">
        
        <div class="p-3.5 bg-brand-50 dark:bg-brand-950/50 rounded-xl border border-brand-200 dark:border-brand-900 text-xs text-brand-900 dark:text-brand-200">
          <p class="font-bold mb-1 flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Formats de texte acceptés :
          </p>
          <ul class="list-disc list-inside space-y-0.5 text-[11px]">
            <li><code>Question ::: Réponse</code> (une par ligne)</li>
            <li><code>Question --- Réponse</code> ou cartes séparées par <code>---</code></li>
            <li><code>Q: Question... \n A: Réponse...</code></li>
            <li>Export Anki / Quizlet (séparé par tabulation <code>Tab</code>)</li>
            <li>Support complet LaTeX : <code>$x^2$</code> ou <code>$$\\int...$$</code></li>
          </ul>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Matière *</label>
            <select id="import-subject-select" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
              <option value="Maths">Mathématiques</option>
              <option value="Physique">Physique - Chimie</option>
              <option value="Info">Informatique</option>
              <option value="Autre">Autre matière</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nom du paquet *</label>
            <input type="text" id="import-deck-name" placeholder="Ex: Colle Maths Semaine 4" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Fichier texte (.txt, .md)</label>
          <input type="file" id="import-file-input" accept=".txt,.md,.csv,.tsv" class="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 dark:file:bg-brand-950 file:text-brand-700 dark:file:text-brand-300 hover:file:bg-brand-100">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ou collez votre texte brut ici :</label>
          <textarea id="import-raw-text" rows="6" placeholder="Quelle est la formule de Taylor avec reste intégral ? ::: $$f(x) = \\sum_{k=0}^n \\frac{f^{(k)}(a)}{k!}(x-a)^k + \\int_a^x ...$$\nDéfinition d'un endomorphisme nilpotent ? ::: Il existe $p \\in \\mathbb{N}$ tel que $u^p = 0$." class="w-full text-xs font-mono p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"></textarea>
        </div>

        <!-- Preview Count -->
        <div id="import-preview-count" class="text-xs font-bold text-brand-600 dark:text-brand-400">
          0 carte(s) détectée(s)
        </div>

      </div>
    `;

    Modal.open({
      title: 'Importer un lot de flashcards (Fichier / Texte)',
      content,
      maxWidth: 'max-w-xl',
      footer: `
        <button id="cancel-batch-btn" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-500">Annuler</button>
        <button id="confirm-batch-import-btn" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md">Importer le paquet</button>
      `,
      onOpen: (modalEl) => {
        const rawTextEl = modalEl.querySelector('#import-raw-text');
        const fileInput = modalEl.querySelector('#import-file-input');
        const countEl = modalEl.querySelector('#import-preview-count');
        const deckNameInput = modalEl.querySelector('#import-deck-name');

        const parseCards = (text) => {
          return this._parseFlashcardsText(text);
        };

        const updatePreview = () => {
          const cards = parseCards(rawTextEl.value);
          countEl.textContent = `${cards.length} carte(s) détectée(s)`;
        };

        rawTextEl.addEventListener('input', updatePreview);

        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          if (!deckNameInput.value) {
            // Auto fill deck name from filename
            const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
            deckNameInput.value = cleanName;
          }

          const reader = new FileReader();
          reader.onload = (ev) => {
            rawTextEl.value = ev.target.result;
            updatePreview();
          };
          reader.readAsText(file);
        });

        modalEl.querySelector('#cancel-batch-btn').addEventListener('click', () => Modal.close());
        modalEl.querySelector('#confirm-batch-import-btn').addEventListener('click', () => {
          const subject = modalEl.querySelector('#import-subject-select').value;
          const deckName = deckNameInput.value.trim() || 'Lot de révision';
          const cards = parseCards(rawTextEl.value);

          if (cards.length === 0) {
            Toast.warning('Aucune carte détectée dans le texte fourni.');
            return;
          }

          const newDeck = {
            id: 'deck_' + Date.now(),
            subject,
            deckName,
            cards
          };

          store.addFlashcardDeck(newDeck);
          Toast.success(`${cards.length} flashcards importées dans "${deckName}" !`);
          Modal.close();
          this.render(container);
        });
      }
    });
  },

  _parseFlashcardsText(rawText) {
    if (!rawText || !rawText.trim()) return [];

    const cards = [];
    const lines = rawText.split('\n');

    // Case 1: Cards delimited by ::: (one per line)
    // Case 2: Cards delimited by \t (TSV)
    // Case 3: Cards separated by '---' blocks
    // Case 4: Q: ... A: ... blocks

    if (rawText.includes(':::') || rawText.includes('\t')) {
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        let sep = ':::';
        if (!trimmed.includes(':::') && trimmed.includes('\t')) sep = '\t';

        const parts = trimmed.split(sep);
        if (parts.length >= 2) {
          const front = parts[0].trim();
          const back = parts.slice(1).join(sep).trim();
          if (front && back) {
            cards.push({
              id: 'c_' + Math.random().toString(36).substring(2, 9),
              front,
              back,
              status: 'learning'
            });
          }
        }
      }
      if (cards.length > 0) return cards;
    }

    // Case 3: Blocks separated by ---
    if (rawText.includes('---')) {
      const blocks = rawText.split(/^---$/m);
      for (const block of blocks) {
        const b = block.trim();
        if (!b) continue;

        if (b.includes(':::')) {
          const [f, ...rest] = b.split(':::');
          cards.push({
            id: 'c_' + Math.random().toString(36).substring(2, 9),
            front: f.trim(),
            back: rest.join(':::').trim(),
            status: 'learning'
          });
        } else {
          // If first line is front and rest is back
          const blockLines = b.split('\n');
          if (blockLines.length >= 2) {
            cards.push({
              id: 'c_' + Math.random().toString(36).substring(2, 9),
              front: blockLines[0].trim(),
              back: blockLines.slice(1).join('\n').trim(),
              status: 'learning'
            });
          }
        }
      }
      if (cards.length > 0) return cards;
    }

    // Case 4: Q: ... \n A: ...
    let currentQ = '';
    let currentA = '';
    let readingA = false;

    for (const line of lines) {
      const tr = line.trim();
      if (tr.match(/^(Q|Question)\s*:\s*/i)) {
        if (currentQ && currentA) {
          cards.push({
            id: 'c_' + Math.random().toString(36).substring(2, 9),
            front: currentQ.trim(),
            back: currentA.trim(),
            status: 'learning'
          });
          currentQ = '';
          currentA = '';
        }
        currentQ = tr.replace(/^(Q|Question)\s*:\s*/i, '');
        readingA = false;
      } else if (tr.match(/^(A|R|Réponse|Reponse)\s*:\s*/i)) {
        currentA = tr.replace(/^(A|R|Réponse|Reponse)\s*:\s*/i, '');
        readingA = true;
      } else if (readingA) {
        currentA += '\n' + tr;
      } else if (currentQ) {
        currentQ += '\n' + tr;
      }
    }

    if (currentQ && currentA) {
      cards.push({
        id: 'c_' + Math.random().toString(36).substring(2, 9),
        front: currentQ.trim(),
        back: currentA.trim(),
        status: 'learning'
      });
    }

    return cards;
  },

  _openCreateDeckModal(container) {
    const content = `
      <form id="create-deck-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Matière *</label>
          <select id="new-deck-subj" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
            <option value="Maths">Mathématiques</option>
            <option value="Physique">Physique - Chimie</option>
            <option value="Info">Informatique</option>
            <option value="Autre">Autre matière</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nom du paquet de colles *</label>
          <input type="text" id="new-deck-name" required placeholder="Ex: Colle Maths Semaine 3 - Séries" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
        </div>
      </form>
    `;

    Modal.open({
      title: 'Créer un nouveau paquet de flashcards',
      content,
      footer: `
        <button id="cancel-nd-btn" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-500">Annuler</button>
        <button id="save-nd-btn" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold">Créer</button>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector('#cancel-nd-btn').addEventListener('click', () => Modal.close());
        modalEl.querySelector('#save-nd-btn').addEventListener('click', () => {
          const subject = modalEl.querySelector('#new-deck-subj').value;
          const deckName = modalEl.querySelector('#new-deck-name').value.trim();

          if (!deckName) {
            Toast.warning('Veuillez entrer un nom pour le paquet.');
            return;
          }

          store.addFlashcardDeck({ subject, deckName, cards: [] });
          Toast.success('Paquet créé !');
          Modal.close();
          this.render(container);
        });
      }
    });
  },

  _openAddCardModal(deckId, container) {
    const decks = store.getFlashcardDecks();
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    const content = `
      <form id="add-card-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Recto (Question / Définition) *</label>
          <textarea id="card-front-input" rows="3" required placeholder="Ex: Énoncer le théorème de Cayley-Hamilton ($...$)" class="w-full text-xs font-mono p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"></textarea>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Verso (Réponse / Démonstration) *</label>
          <textarea id="card-back-input" rows="4" required placeholder="Ex: $\\chi_A(A) = 0$" class="w-full text-xs font-mono p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"></textarea>
        </div>

        <div class="text-[11px] text-slate-400">
          💡 Support LaTeX : utilisez <code>$...$</code> pour les formules inline ou <code>$$...$$</code> pour les blocs.
        </div>
      </form>
    `;

    Modal.open({
      title: `Ajouter une carte à "${deck.deckName}"`,
      content,
      footer: `
        <button id="cancel-card-btn" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-500">Annuler</button>
        <button id="save-card-btn" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold">Ajouter</button>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector('#cancel-card-btn').addEventListener('click', () => Modal.close());
        modalEl.querySelector('#save-card-btn').addEventListener('click', () => {
          const front = modalEl.querySelector('#card-front-input').value.trim();
          const back = modalEl.querySelector('#card-back-input').value.trim();

          if (!front || !back) {
            Toast.warning('Veuillez remplir le recto et le verso.');
            return;
          }

          store.addCardsToDeck(deckId, [{ front, back }]);
          Toast.success('Carte ajoutée au paquet !');
          Modal.close();
          this.render(container);
        });
      }
    });
  },

  _openDeckCardsModal(deckId, container) {
    const decks = store.getFlashcardDecks();
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    const cards = deck.cards || [];

    const content = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-500">${cards.length} carte(s) enregistrée(s)</span>
          <button id="modal-add-card-btn" class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
            + Ajouter une carte
          </button>
        </div>

        <div class="space-y-2.5 max-h-96 overflow-y-auto">
          ${cards.length === 0 ? `
            <p class="text-xs text-slate-400 italic py-4 text-center">Aucune carte dans ce paquet.</p>
          ` : cards.map((c, idx) => `
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div class="flex items-start justify-between gap-2">
                <span class="font-bold text-slate-800 dark:text-slate-200">#${idx + 1} Recto :</span>
                <button data-del-card="${c.id}" class="text-slate-400 hover:text-rose-500 p-0.5">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div class="text-slate-700 dark:text-slate-300 font-mono text-[11px]">${c.front}</div>
              <div class="font-bold text-brand-600 dark:text-brand-400 mt-1">Verso :</div>
              <div class="text-slate-700 dark:text-slate-300 font-mono text-[11px]">${c.back}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    Modal.open({
      title: `Cartes de "${deck.deckName}"`,
      content,
      footer: `<button id="close-deck-m-btn" class="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold">Fermer</button>`,
      onOpen: (modalEl) => {
        modalEl.querySelector('#close-deck-m-btn').addEventListener('click', () => Modal.close());
        modalEl.querySelector('#modal-add-card-btn').addEventListener('click', () => {
          Modal.close();
          this._openAddCardModal(deckId, container);
        });

        modalEl.querySelectorAll('[data-del-card]').forEach(btn => {
          btn.addEventListener('click', () => {
            const cardId = btn.dataset.delCard;
            deck.cards = deck.cards.filter(c => c.id !== cardId);
            store.save();
            Toast.info('Carte supprimée');
            Modal.close();
            this.render(container);
          });
        });
      }
    });
  }
};
