/**
 * StudyFlow - Central State Management & Reactive Store
 * Handles LocalStorage caching, initial default datasets, state change events, and cloud synchronization triggers.
 */

const STORAGE_KEY = 'studyflow_data_v1';
const SESSION_KEY_NAME = 'studyflow_session_id';

// Palette de couleurs pour les matières et événements
export const SUBJECT_COLORS = {
  Maths: '#3b82f6',     // Bleu
  Physique: '#10b981',  // Vert émeraude
  Info: '#8b5cf6',      // Violet
  Chimie: '#06b6d4',    // Cyan
  Colle: '#f59e0b',     // Ambre
  DS: '#ef4444',        // Rouge
  TIPE: '#ec4899',      // Rose
  Langues: '#14b8a6',   // Turquoise
  Perso: '#64748b'      // Gris ardoise
};// Données initiales 100% vierges (aucune donnée factice)
const DEFAULT_DATA = {
  events: [],
  importantDates: [],
  dailyTodos: [],
  subjectsData: {
    maths: [],
    physique: [],
    info: []
  },
  longtermCategories: [
    { id: 'cat-1', name: 'Projets & PIX', color: 'coral' },
    { id: 'cat-2', name: 'Révisions Examens', color: 'orange' },
    { id: 'cat-3', name: 'Objectifs Semestre', color: 'emerald' },
    { id: 'cat-4', name: 'Personnel & Sport', color: 'purple' }
  ],
  longtermTodos: [],
  flashcards: [],
  gradesData: {
    blocks: [
      {
        id: 'blk-maths',
        name: 'MATHS',
        subjects: [
          { id: 'sub-m1', name: 'Intro aux statistiques', coef: 2, evaluations: [] },
          { id: 'sub-m2', name: 'Algèbre linéaire', coef: 4, evaluations: [] },
          { id: 'sub-m3', name: 'Série', coef: 3, evaluations: [] }
        ]
      },
      {
        id: 'blk-physique',
        name: 'PHYSIQUE',
        subjects: [
          { id: 'sub-p1', name: 'Résistance des matériaux', coef: 3, evaluations: [] },
          { id: 'sub-p2', name: 'Mécanique des fluides', coef: 2, evaluations: [] },
          { id: 'sub-p3', name: 'Systèmes électroniques', coef: 2, evaluations: [] }
        ]
      },
      {
        id: 'blk-info',
        name: 'INFORMATIQUE',
        subjects: [
          { id: 'sub-i1', name: 'Algorithmique et POO', coef: 3, evaluations: [] },
          { id: 'sub-i2', name: 'Structures de données', coef: 1, evaluations: [] },
          { id: 'sub-i3', name: 'Conception base de données', coef: 2, evaluations: [] }
        ]
      },
      {
        id: 'blk-projet',
        name: 'PROJET',
        subjects: [
          { id: 'sub-pr1', name: 'Projet PIX', coef: 2, evaluations: [] },
          { id: 'sub-pr2', name: 'Coopération en équipe', coef: 1, evaluations: [] }
        ]
      },
      {
        id: 'blk-soft',
        name: 'SOFT SKILLS',
        subjects: [
          { id: 'sub-ss1', name: 'Green IT', coef: 1, evaluations: [] },
          { id: 'sub-ss2', name: 'Skills stage A2', coef: 1, evaluations: [] },
          { id: 'sub-ss3', name: 'Design Thinking et Créativité', coef: 1, evaluations: [] }
        ]
      }
    ]
  },

  syncSettings: {
    sessionKey: '',
    supabaseUrl: '',
    supabaseKey: '',
    lastSyncedAt: null
  }
};

/**
 * Store Class with event dispatching
 */
class Store {
  constructor() {
    this.data = this._loadLocal();
    this._ensureSessionKey();
    this.listeners = new Map();
  }

  _loadLocal() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with DEFAULT_DATA structure to prevent missing keys on upgrades
        return {
          ...DEFAULT_DATA,
          ...parsed,
          subjectsData: { ...DEFAULT_DATA.subjectsData, ...(parsed.subjectsData || {}) },
          gradesData: parsed.gradesData || DEFAULT_DATA.gradesData,
          syncSettings: { ...DEFAULT_DATA.syncSettings, ...(parsed.syncSettings || {}) }
        };
      }
    } catch (e) {
      console.warn('Erreur lors du chargement des données locales:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  _ensureSessionKey() {
    let key = localStorage.getItem(SESSION_KEY_NAME);
    if (!key) {
      // Check URL hash for direct pairing: #sync=KEY
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      if (hashParams.get('sync')) {
        key = hashParams.get('sync');
      } else {
        // Generate a clean readable UUID token
        key = 'study_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      }
      localStorage.setItem(SESSION_KEY_NAME, key);
    }
    this.data.syncSettings.sessionKey = key;
    this.save(false); // Save without triggering recursive sync
  }

  getSessionKey() {
    return this.data.syncSettings.sessionKey;
  }

  setSessionKey(newKey) {
    if (!newKey) return;
    this.data.syncSettings.sessionKey = newKey.trim();
    localStorage.setItem(SESSION_KEY_NAME, newKey.trim());
    this.save(true);
    this.emit('syncKeyChanged', newKey.trim());
  }

  save(notifySync = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.emit('dataChanged', this.data);
      if (notifySync) {
        this.emit('triggerCloudSync', this.data);
      }
    } catch (e) {
      console.error('Erreur sauvegarde localStorage:', e);
    }
  }

  /**
   * Replace state from cloud sync
   */
  loadFromCloud(cloudData) {
    if (!cloudData || typeof cloudData !== 'object') return;
    const sessionKey = this.data.syncSettings.sessionKey;
    this.data = {
      ...DEFAULT_DATA,
      ...cloudData,
      syncSettings: {
        ...(cloudData.syncSettings || {}),
        sessionKey: sessionKey // Keep active session key
      }
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {}
    this.emit('dataChanged', this.data);
    this.emit('cloudLoaded', this.data);
  }

  // --- Events API ---
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    this.listeners.set(event, this.listeners.get(event).filter(cb => cb !== callback));
  }

  emit(event, payload) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Erreur listener pour ${event}:`, err);
        }
      });
    }
  }

  // --- Helper getters & mutation shortcuts ---
  getEvents() {
    return this.data.events || [];
  }

  addEvent(event) {
    if (!event.id) event.id = 'ev_' + Date.now();
    this.data.events.push(event);
    this.save();
    return event;
  }

  updateEvent(id, updates) {
    const idx = this.data.events.findIndex(e => e.id === id);
    if (idx !== -1) {
      this.data.events[idx] = { ...this.data.events[idx], ...updates };
      this.save();
    }
  }

  deleteEvent(id) {
    this.data.events = this.data.events.filter(e => e.id !== id);
    this.save();
  }

  toggleEventCompleted(id) {
    const ev = this.data.events.find(e => e.id === id);
    if (ev) {
      ev.completed = !ev.completed;
      this.save();
    }
  }

  getImportantDates() {
    return this.data.importantDates || [];
  }

  addImportantDate(item) {
    if (!item.id) item.id = 'imp_' + Date.now();
    this.data.importantDates.push(item);
    this.save();
  }

  deleteImportantDate(id) {
    this.data.importantDates = this.data.importantDates.filter(i => i.id !== id);
    this.save();
  }

  getDailyTodos() {
    return this.data.dailyTodos || [];
  }

  addDailyTodo(text, priority = 'normal', tag = 'Autre') {
    const item = {
      id: 'td_' + Date.now(),
      text: text.trim(),
      completed: false,
      priority,
      tag,
      createdAt: new Date().toISOString()
    };
    this.data.dailyTodos.unshift(item);
    this.save();
    return item;
  }

  toggleDailyTodo(id) {
    const item = this.data.dailyTodos.find(t => t.id === id);
    if (item) {
      item.completed = !item.completed;
      this.save();
    }
  }

  deleteDailyTodo(id) {
    this.data.dailyTodos = this.data.dailyTodos.filter(t => t.id !== id);
    this.save();
  }

  // Subjects
  getSubjectData(subjectKey) {
    return (this.data.subjectsData && this.data.subjectsData[subjectKey]) || [];
  }

  updateSubjectChapter(subjectKey, chapterId, fields) {
    const chapters = this.data.subjectsData[subjectKey];
    if (chapters) {
      const ch = chapters.find(c => c.id === chapterId);
      if (ch) {
        Object.assign(ch, fields);
        this.save();
      }
    }
  }

  addSubjectChapter(subjectKey, chapter) {
    if (!this.data.subjectsData[subjectKey]) {
      this.data.subjectsData[subjectKey] = [];
    }
    if (!chapter.id) chapter.id = `${subjectKey}_ch_${Date.now()}`;
    this.data.subjectsData[subjectKey].push(chapter);
    this.save();
  }

  deleteSubjectChapter(subjectKey, chapterId) {
    if (this.data.subjectsData[subjectKey]) {
      this.data.subjectsData[subjectKey] = this.data.subjectsData[subjectKey].filter(c => c.id !== chapterId);
      this.save();
    }
  }

  // Longterm
  getLongtermTodos() {
    return this.data.longtermTodos || [];
  }

  addLongtermTodo(todo) {
    if (!todo.id) todo.id = 'lt_' + Date.now();
    this.data.longtermTodos.push(todo);
    this.save();
  }

  updateLongtermTodo(id, updates) {
    const idx = this.data.longtermTodos.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.longtermTodos[idx] = { ...this.data.longtermTodos[idx], ...updates };
      this.save();
    }
  }

  deleteLongtermTodo(id) {
    this.data.longtermTodos = this.data.longtermTodos.filter(t => t.id !== id);
    this.save();
  }

  // Flashcards
  getFlashcardDecks() {
    return this.data.flashcards || [];
  }

  addFlashcardDeck(deck) {
    if (!deck.id) deck.id = 'deck_' + Date.now();
    if (!deck.cards) deck.cards = [];
    this.data.flashcards.push(deck);
    this.save();
    return deck;
  }

  updateFlashcardDeck(deckId, updates) {
    const idx = this.data.flashcards.findIndex(d => d.id === deckId);
    if (idx !== -1) {
      this.data.flashcards[idx] = { ...this.data.flashcards[idx], ...updates };
      this.save();
    }
  }

  deleteFlashcardDeck(deckId) {
    this.data.flashcards = this.data.flashcards.filter(d => d.id !== deckId);
    this.save();
  }

  addCardsToDeck(deckId, newCards) {
    const deck = this.data.flashcards.find(d => d.id === deckId);
    if (deck) {
      newCards.forEach(c => {
        if (!c.id) c.id = 'c_' + Math.random().toString(36).substring(2, 9);
        if (!c.status) c.status = 'learning';
      });
      deck.cards.push(...newCards);
      this.save();
    }
  }

  // Grades
  getGradesData() {
    return this.data.gradesData || { blocks: [] };
  }

  updateGradeItem(blockId, subjectId, updates) {
    const block = this.data.gradesData.blocks.find(b => b.id === blockId);
    if (block) {
      const sub = block.subjects.find(s => s.id === subjectId);
      if (sub) {
        Object.assign(sub, updates);
        this.save();
      }
    }
  }

  addGradeItem(blockId, item) {
    const block = this.data.gradesData.blocks.find(b => b.id === blockId);
    if (block) {
      if (!item.id) item.id = 's_' + Date.now();
      block.subjects.push(item);
      this.save();
    }
  }

  deleteGradeItem(blockId, subjectId) {
    const block = this.data.gradesData.blocks.find(b => b.id === blockId);
    if (block) {
      block.subjects = block.subjects.filter(s => s.id !== subjectId);
      this.save();
    }
  }
}

export const store = new Store();
