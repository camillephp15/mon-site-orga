/**
 * StudyFlow - Application Web d'Organisation (Prépa / Ingénieur)
 * 
 * NOUVEAUTÉS & AJUSTEMENTS :
 * 1. Mini-calendrier mensuel épuré : Affiche UNIQUEMENT les événements personnels manuels (0 pastille provenant de l'EDT).
 * 2. Création manuelle de calendriers : Création simple avec Nom + Couleur (sans URL requise), avec support optionnel des flux ICS.
 * 3. Sticker marguerite rose : Élément décoratif Pop & Solaire positionné à gauche de la barre des matières.
 * 4. Synchronisation GitHub REST API avec PAT & Commits automatiques.
 */

(function() {
  'use strict';

  // ==========================================================================
  // 1. UTILITAIRES ENCODAGE BASE64 UTF-8 (Support des accents, formules & LaTeX)
  // ==========================================================================
  function utf8ToBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
      return String.fromCharCode('0x' + p1);
    }));
  }

  function base64ToUtf8(str) {
    return decodeURIComponent(atob(str.replace(/\s/g, '')).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  // ==========================================================================
  // 2. COULEURS PAR CATÉGORIE POUR LES TÂCHES & BADGES
  // ==========================================================================
  const CATEGORY_COLORS = {
    'Maths': { hex: '#ff3366', bg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900' },
    'Physique': { hex: '#f97316', bg: 'bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-900' },
    'Info': { hex: '#8b5cf6', bg: 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-900' },
    'Autres cours': { hex: '#0284c7', bg: 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-900' },
    'Maison': { hex: '#10b981', bg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900' },
    'Sport': { hex: '#eab308', bg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900' },
    'Autre': { hex: '#64748b', bg: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' }
  };

  function getCategoryColor(cat) {
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS['Autre'];
  }

  // ==========================================================================
  // 3. TOAST NOTIFICATIONS
  // ==========================================================================
  const Toast = {
    show(message, type = 'info', duration = 3500) {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 ${this._getStyle(type)}`;

      const icon = this._getIcon(type);

      toast.innerHTML = `
        <div class="flex-shrink-0">${icon}</div>
        <div class="flex-1">${message}</div>
        <button class="toast-close text-current opacity-60 hover:opacity-100 p-0.5 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `;

      container.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
      });

      const removeToast = () => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
      };

      toast.querySelector('.toast-close').addEventListener('click', removeToast);
      if (duration > 0) setTimeout(removeToast, duration);
    },

    success(msg, duration) { this.show(msg, 'success', duration); },
    error(msg, duration) { this.show(msg, 'error', duration || 5000); },
    warning(msg, duration) { this.show(msg, 'warning', duration); },
    info(msg, duration) { this.show(msg, 'info', duration); },

    _getStyle(type) {
      switch (type) {
        case 'success':
          return 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20';
        case 'error':
          return 'bg-rose-500 text-white border-rose-600 shadow-rose-500/20';
        case 'warning':
          return 'bg-orangePop-500 text-white border-orangePop-600 shadow-orangePop-500/20';
        default:
          return 'bg-ink text-white dark:bg-white dark:text-ink border-creme-300 dark:border-ink-border';
      }
    },

    _getIcon(type) {
      switch (type) {
        case 'success':
          return '<span class="font-bold text-sm">✓</span>';
        case 'error':
          return '<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        case 'warning':
          return '<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        default:
          return '<span class="text-solaire-400 font-bold text-sm">ℹ</span>';
      }
    }
  };

  // ==========================================================================
  // 4. MODALES ACCESSIBLES
  // ==========================================================================
  const Modal = {
    activeModal: null,

    open({ title, content, footer = '', maxWidth = 'max-w-lg', onOpen = null, onClose = null }) {
      this.close();

      const root = document.getElementById('modals-root');
      if (!root) return;

      const modalEl = document.createElement('div');
      modalEl.id = 'current-modal';
      modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto modal-backdrop animate-fade-in';

      modalEl.innerHTML = `
        <div class="relative w-full ${maxWidth} bg-white dark:bg-ink-darkcard rounded-3xl shadow-2xl border border-creme-300 dark:border-ink-border overflow-hidden my-auto transition-all flex flex-col max-h-[90vh]">
          <div class="flex items-center justify-between px-6 py-4 border-b border-creme-200 dark:border-ink-border bg-creme-100/50 dark:bg-ink-darkbg/50">
            <h3 class="font-extrabold text-base text-ink dark:text-white">
              ${title}
            </h3>
            <button id="modal-close-btn" class="p-1.5 rounded-xl text-zinc-400 hover:text-ink dark:hover:text-white hover:bg-creme-200 dark:hover:bg-zinc-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="px-6 py-5 overflow-y-auto flex-1 text-xs text-zinc-700 dark:text-zinc-300 space-y-4">
            ${content}
          </div>
          ${footer ? `<div class="px-6 py-4 bg-creme-100/70 dark:bg-ink-darkbg/70 border-t border-creme-200 dark:border-ink-border flex items-center justify-end gap-2.5">${footer}</div>` : ''}
        </div>
      `;

      root.appendChild(modalEl);
      this.activeModal = { el: modalEl, onClose };

      modalEl.querySelector('#modal-close-btn').addEventListener('click', () => this.close());
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) this.close();
      });

      this._handleKeyDown = (e) => {
        if (e.key === 'Escape') this.close();
      };
      document.addEventListener('keydown', this._handleKeyDown);

      if (window.lucide) window.lucide.createIcons();
      if (onOpen) onOpen(modalEl);
    },

    close() {
      if (!this.activeModal) return;
      const { el, onClose } = this.activeModal;
      document.removeEventListener('keydown', this._handleKeyDown);
      el.remove();
      this.activeModal = null;
      if (onClose) onClose();
    }
  };

  // ==========================================================================
  // 5. GITHUB REST API SYNC CLIENT (PAT & data.json)
  // ==========================================================================
  const GITHUB_CONFIG_KEY = 'studyflow_github_config';

  const GitHubSync = {
    lastSha: null,
    lastSyncTime: null,
    status: 'unconfigured',
    _debounceTimer: null,

    getConfig() {
      try {
        const stored = localStorage.getItem(GITHUB_CONFIG_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {}
      return {
        owner: '',
        repo: '',
        branch: 'main',
        path: 'data.json',
        token: ''
      };
    },

    saveConfig(cfg) {
      const clean = {
        owner: (cfg.owner || '').trim(),
        repo: (cfg.repo || '').trim(),
        branch: (cfg.branch || 'main').trim(),
        path: (cfg.path || 'data.json').trim().replace(/^\//, ''),
        token: (cfg.token || '').trim()
      };
      localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(clean));
      this._updateStatus(this.isConfigured() ? 'synced' : 'unconfigured');
      return clean;
    },

    isConfigured() {
      const cfg = this.getConfig();
      return !!(cfg.owner && cfg.repo && cfg.token && cfg.path);
    },

    _updateStatus(status, label = '') {
      this.status = status;
      const indicator = document.getElementById('github-sync-indicator');
      const labelEl = document.getElementById('github-sync-label');

      if (indicator) {
        indicator.className = 'w-2 h-2 rounded-full inline-block transition-all';
        if (status === 'synced') indicator.classList.add('bg-emerald-500', 'shadow-xs', 'shadow-emerald-500');
        else if (status === 'syncing') indicator.classList.add('bg-amber-400', 'animate-pulse');
        else if (status === 'error') indicator.classList.add('bg-rose-500');
        else indicator.classList.add('bg-zinc-400');
      }

      if (labelEl) {
        if (label) labelEl.textContent = label;
        else if (status === 'synced') labelEl.textContent = 'GitHub Sync';
        else if (status === 'syncing') labelEl.textContent = 'Sync...';
        else if (status === 'error') labelEl.textContent = 'GitHub Erreur';
        else labelEl.textContent = 'GitHub Sync';
      }
    },

    _getHeaders(token) {
      return {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      };
    },

    async testConnection(cfg) {
      const config = cfg || this.getConfig();
      if (!config.owner || !config.repo || !config.token) {
        throw new Error('Veuillez renseigner le propriétaire, le dépôt et le token.');
      }
      const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
      const res = await fetch(url, { headers: this._getHeaders(config.token) });
      if (!res.ok) {
        if (res.status === 401) throw new Error('Token d\'accès GitHub (PAT) invalide ou expiré.');
        if (res.status === 404) throw new Error(`Dépôt "${config.owner}/${config.repo}" introuvable ou privé sans permission.`);
        throw new Error(`Erreur GitHub (${res.status}) : ${res.statusText}`);
      }
      const repoInfo = await res.json();
      return repoInfo;
    },

    async fetchRemoteData(cfg) {
      const config = cfg || this.getConfig();
      if (!config.owner || !config.repo || !config.token) return null;

      this._updateStatus('syncing');
      const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodeURIComponent(config.path)}?ref=${encodeURIComponent(config.branch)}&_t=${Date.now()}`;

      try {
        const res = await fetch(url, { headers: this._getHeaders(config.token) });
        if (res.status === 404) {
          this._updateStatus('synced');
          return { notFound: true, sha: null, data: null };
        }
        if (!res.ok) {
          throw new Error(`Erreur récupération (${res.status}) : ${res.statusText}`);
        }

        const dataObj = await res.json();
        this.lastSha = dataObj.sha;
        this.lastSyncTime = new Date();

        const jsonString = base64ToUtf8(dataObj.content);
        const parsed = JSON.parse(jsonString);

        this._updateStatus('synced');
        return { data: parsed, sha: dataObj.sha };
      } catch (err) {
        this._updateStatus('error');
        console.error('Erreur lecture GitHub:', err);
        throw err;
      }
    },

    async commitRemoteData(dataToCommit, customMessage = null) {
      const config = this.getConfig();
      if (!this.isConfigured()) return;

      this._updateStatus('syncing');

      try {
        if (!this.lastSha) {
          const checkUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodeURIComponent(config.path)}?ref=${encodeURIComponent(config.branch)}&_t=${Date.now()}`;
          const checkRes = await fetch(checkUrl, { headers: this._getHeaders(config.token) });
          if (checkRes.ok) {
            const checkObj = await checkRes.json();
            this.lastSha = checkObj.sha;
          }
        }

        const jsonStr = JSON.stringify(dataToCommit, null, 2);
        const base64Content = utf8ToBase64(jsonStr);

        const putUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodeURIComponent(config.path)}`;
        const bodyPayload = {
          message: customMessage || `Auto-sync StudyFlow data [skip ci]`,
          content: base64Content,
          branch: config.branch || 'main'
        };
        if (this.lastSha) bodyPayload.sha = this.lastSha;

        const res = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            ...this._getHeaders(config.token),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodyPayload)
        });

        if (res.status === 409) {
          console.warn('Conflit de SHA GitHub détecté, actualisation et retry...');
          const refetchUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodeURIComponent(config.path)}?ref=${encodeURIComponent(config.branch)}&_t=${Date.now()}`;
          const refetchRes = await fetch(refetchUrl, { headers: this._getHeaders(config.token) });
          if (refetchRes.ok) {
            const refetchObj = await refetchRes.json();
            this.lastSha = refetchObj.sha;
            bodyPayload.sha = this.lastSha;

            const retryRes = await fetch(putUrl, {
              method: 'PUT',
              headers: {
                ...this._getHeaders(config.token),
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(bodyPayload)
            });

            if (!retryRes.ok) throw new Error(`Échec commit retry (${retryRes.status})`);
            const retryJson = await retryRes.json();
            this.lastSha = retryJson.content?.sha || this.lastSha;
            this.lastSyncTime = new Date();
            this._updateStatus('synced');
            return true;
          }
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Erreur commit GitHub (${res.status})`);
        }

        const resJson = await res.json();
        this.lastSha = resJson.content?.sha || this.lastSha;
        this.lastSyncTime = new Date();
        this._updateStatus('synced');
        return true;
      } catch (err) {
        this._updateStatus('error');
        console.error('Erreur écriture GitHub:', err);
        throw err;
      }
    },

    triggerAutoSync(data) {
      if (!this.isConfigured()) return;
      this._updateStatus('syncing');

      if (this._debounceTimer) clearTimeout(this._debounceTimer);

      this._debounceTimer = setTimeout(async () => {
        try {
          await this.commitRemoteData(data);
        } catch (err) {
          Toast.error(`Échec synchronisation GitHub : ${err.message}`);
        }
      }, 1200);
    }
  };

  // ==========================================================================
  // 6. STORE LOCAL & ÉTAT INITIAL 100% VIERGE
  // ==========================================================================
  const CALENDAR_COLORS = [
    { name: 'Rose Pop', hex: '#ff3366' },
    { name: 'Orange Solaire', hex: '#f97316' },
    { name: 'Ambre Soleil', hex: '#f59e0b' },
    { name: 'Violet Électrique', hex: '#8b5cf6' },
    { name: 'Bleu Azur', hex: '#0284c7' },
    { name: 'Vert Menthe', hex: '#10b981' },
    { name: 'Fuchsia Fluo', hex: '#d946ef' },
    { name: 'Noir d\'Encre', hex: '#0f0f12' }
  ];

  const STORAGE_KEY = 'studyflow_data_v12_clean';

  function getMondayOfDate(d) {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // Structure officielle des notes (prête à l'emploi avec 0 note d'exemple)
  const DEFAULT_GRADES_DATA = {
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
  };

  const DEFAULT_DATA = {
    calendars: [
      { id: 'cal-default', name: 'Emploi du temps Principal', color: '#ff3366', feedUrl: '', lastSync: null, isDefault: true }
    ],
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
    gradesData: DEFAULT_GRADES_DATA
  };

  class Store {
    constructor() {
      this._purgeLegacyStorage();
      this.data = this._loadLocalCache();
      this.listeners = new Map();
    }

    _purgeLegacyStorage() {
      try {
        const legacyKeys = [
          'studyflow_data_v1', 'studyflow_data_v2', 'studyflow_data_v3',
          'studyflow_data_v4', 'studyflow_data_v5', 'studyflow_data_v6',
          'studyflow_data_v7', 'studyflow_data_v8', 'studyflow_data_v9_clean',
          'studyflow_data_v10'
        ];
        legacyKeys.forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }

    _loadLocalCache() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const cleanedDates = (parsed.importantDates || []).filter(imp => {
            const legacyIds = ['imp-1', 'imp-2', 'imp-3', 'imp-4', 'imp-5'];
            return !legacyIds.includes(imp.id) && !imp.title?.includes('Colle Maths Semaine');
          });

          return {
            ...DEFAULT_DATA,
            ...parsed,
            calendars: (parsed.calendars && parsed.calendars.length) ? parsed.calendars : DEFAULT_DATA.calendars,
            importantDates: cleanedDates,
            longtermCategories: parsed.longtermCategories || DEFAULT_DATA.longtermCategories,
            subjectsData: { ...DEFAULT_DATA.subjectsData, ...(parsed.subjectsData || {}) },
            gradesData: (parsed.gradesData && parsed.gradesData.blocks && parsed.gradesData.blocks[0] && parsed.gradesData.blocks[0].subjects) ? parsed.gradesData : DEFAULT_GRADES_DATA
          };
        }
      } catch (e) {
        console.warn('Chargement cache local:', e);
      }
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        this.emit('dataChanged', this.data);
        GitHubSync.triggerAutoSync(this.data);
      } catch (e) {
        console.error('Erreur sauvegarde locale:', e);
      }
    }

    applyRemoteData(remoteData) {
      if (!remoteData || typeof remoteData !== 'object') return false;
      this.data = {
        ...DEFAULT_DATA,
        ...remoteData,
        calendars: (remoteData.calendars && remoteData.calendars.length) ? remoteData.calendars : DEFAULT_DATA.calendars,
        longtermCategories: remoteData.longtermCategories || DEFAULT_DATA.longtermCategories,
        subjectsData: { ...DEFAULT_DATA.subjectsData, ...(remoteData.subjectsData || {}) },
        gradesData: (remoteData.gradesData && remoteData.gradesData.blocks) ? remoteData.gradesData : DEFAULT_GRADES_DATA
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {}
      this.emit('dataChanged', this.data);
      return true;
    }

    exportJSON() {
      try {
        const jsonStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `studyflow_backup_${now}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Toast.success('Sauvegarde JSON exportée !');
      } catch (err) {
        Toast.error('Erreur lors de l\'export JSON.');
      }
    }

    importJSON(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== 'object') throw new Error('Format JSON invalide.');
        this.applyRemoteData(parsed);
        this.save();
        Toast.success('Données restaurées avec succès !');
        return true;
      } catch (err) {
        Toast.error('Fichier JSON corrompu ou invalide.');
        return false;
      }
    }

    on(event, callback) {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
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
          try { cb(payload); } catch (err) { console.error(err); }
        });
      }
    }

    // Calendriers & Synchronisation ICS
    getCalendars() { return this.data.calendars || []; }
    getCalendar(id) { return (this.data.calendars || []).find(c => c.id === id); }
    
    addCalendar(name, color = '#ff3366', feedUrl = '') {
      const cal = {
        id: 'cal_' + Date.now(),
        name: name.trim(),
        color,
        feedUrl: feedUrl ? feedUrl.trim() : '',
        lastSync: feedUrl ? new Date().toISOString() : null
      };
      if (!this.data.calendars) this.data.calendars = [];
      this.data.calendars.push(cal);
      this.save();
      return cal;
    }

    updateCalendar(id, updates) {
      const cal = this.getCalendar(id);
      if (cal) {
        Object.assign(cal, updates);
        this.save();
      }
    }

    deleteCalendar(calId) {
      this.data.calendars = (this.data.calendars || []).filter(c => c.id !== calId);
      this.data.events = (this.data.events || []).filter(e => e.calendarId !== calId);
      this.save();
    }

    async refreshCalendarFeed(calId) {
      const cal = this.getCalendar(calId);
      if (!cal || !cal.feedUrl) return 0;

      try {
        const events = await ICSParser.fetchFromUrl(cal.feedUrl, cal.id);
        if (events && events.length) {
          this.data.events = (this.data.events || []).filter(e => e.calendarId !== cal.id);
          this.data.events.push(...events);
          cal.lastSync = new Date().toISOString();
          this.save();
          return events.length;
        }
      } catch (err) {
        console.warn(`Échec mise à jour flux calendrier ${cal.name}:`, err);
      }
      return 0;
    }

    async refreshAllFeeds() {
      const calsWithUrl = (this.data.calendars || []).filter(c => !!c.feedUrl);
      if (!calsWithUrl.length) return 0;

      let totalUpdated = 0;
      for (const cal of calsWithUrl) {
        const count = await this.refreshCalendarFeed(cal.id);
        totalUpdated += count;
      }
      return totalUpdated;
    }

    getEvents() { return this.data.events || []; }
    addEvent(ev) {
      if (!ev.id) ev.id = 'ev_' + Date.now();
      if (!ev.calendarId) {
        const cals = this.getCalendars();
        ev.calendarId = cals.length ? cals[0].id : 'cal-default';
      }
      this.data.events.push(ev);
      this.save();
      return ev;
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

    getImportantDates() { return this.data.importantDates || []; }
    addImportantDate(item) {
      if (!item.id) item.id = 'imp_' + Date.now();
      this.data.importantDates.push(item);
      this.save();
      return item;
    }
    deleteImportantDate(id) {
      this.data.importantDates = this.data.importantDates.filter(i => i.id !== id);
      this.save();
    }

    getDailyTodos() { return this.data.dailyTodos || []; }
    addDailyTodo(text, priority = 'normal', tag = 'Autres cours') {
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

    getSubjectData(subjectKey) { return (this.data.subjectsData && this.data.subjectsData[subjectKey]) || []; }
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
      if (!this.data.subjectsData[subjectKey]) this.data.subjectsData[subjectKey] = [];
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

    getLongtermCategories() { return this.data.longtermCategories || []; }
    addLongtermCategory(name, color = 'coral') {
      const cat = { id: 'cat_' + Date.now(), name: name.trim(), color };
      this.data.longtermCategories.push(cat);
      this.save();
      return cat;
    }
    deleteLongtermCategory(catId) {
      this.data.longtermCategories = this.data.longtermCategories.filter(c => c.id !== catId);
      this.data.longtermTodos = this.data.longtermTodos.filter(t => t.categoryId !== catId);
      this.save();
    }

    getLongtermTodos() { return this.data.longtermTodos || []; }
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

    getFlashcardDecks() { return this.data.flashcards || []; }
    addFlashcardDeck(deck) {
      if (!deck.id) deck.id = 'deck_' + Date.now();
      if (!deck.cards) deck.cards = [];
      this.data.flashcards.push(deck);
      this.save();
      return deck;
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

    // Gestion hiérarchique des notes
    getGradesData() { return this.data.gradesData || DEFAULT_GRADES_DATA; }

    addEvaluation(blockId, subjectId, evaluation) {
      const block = (this.data.gradesData.blocks || []).find(b => b.id === blockId);
      if (block) {
        const sub = (block.subjects || []).find(s => s.id === subjectId);
        if (sub) {
          if (!sub.evaluations) sub.evaluations = [];
          if (!evaluation.id) evaluation.id = 'ev_' + Date.now();
          sub.evaluations.push(evaluation);
          this.save();
        }
      }
    }

    updateEvaluation(blockId, subjectId, evalId, updates) {
      const block = (this.data.gradesData.blocks || []).find(b => b.id === blockId);
      if (block) {
        const sub = (block.subjects || []).find(s => s.id === subjectId);
        if (sub && sub.evaluations) {
          const ev = sub.evaluations.find(e => e.id === evalId);
          if (ev) {
            Object.assign(ev, updates);
            this.save();
          }
        }
      }
    }

    deleteEvaluation(blockId, subjectId, evalId) {
      const block = (this.data.gradesData.blocks || []).find(b => b.id === blockId);
      if (block) {
        const sub = (block.subjects || []).find(s => s.id === subjectId);
        if (sub && sub.evaluations) {
          sub.evaluations = sub.evaluations.filter(e => e.id !== evalId);
          this.save();
        }
      }
    }
  }

  const store = new Store();

  // ==========================================================================
  // 7. PARSER ICS PRÉCIS
  // ==========================================================================
  const ICSParser = {
    parse(icsText, calendarId = 'cal-default') {
      if (!icsText || typeof icsText !== 'string') return [];
      const normalized = icsText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
      const lines = normalized.split('\n');
      const events = [];
      let inEvent = false;
      let currentEvent = {};

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line === 'BEGIN:VEVENT') {
          inEvent = true;
          currentEvent = {};
          continue;
        }
        if (line === 'END:VEVENT') {
          inEvent = false;
          const parsedList = this._processVEvent(currentEvent, calendarId);
          if (parsedList && parsedList.length) events.push(...parsedList);
          continue;
        }
        if (inEvent) {
          const colonIdx = line.indexOf(':');
          if (colonIdx !== -1) {
            const propFull = line.substring(0, colonIdx);
            const value = line.substring(colonIdx + 1);
            const propName = propFull.split(';')[0].toUpperCase();
            currentEvent[propName] = value;
          }
        }
      }
      return events;
    },

    _processVEvent(raw, calendarId) {
      const summary = (raw['SUMMARY'] || 'Cours').replace(/\\,/g, ',').replace(/\\;/g, ';').trim();
      const location = (raw['LOCATION'] || '').replace(/\\,/g, ',').trim();
      const dtStart = raw['DTSTART'];
      const dtEnd = raw['DTEND'];
      if (!dtStart) return null;

      const startDate = this._parseICSDate(dtStart);
      let endDate = dtEnd ? this._parseICSDate(dtEnd) : new Date(startDate.getTime() + 120 * 60000);
      const durationMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
      if (durationMin <= 0 || isNaN(durationMin)) return null;

      const startHours = String(startDate.getHours()).padStart(2, '0');
      const startMinutes = String(startDate.getMinutes()).padStart(2, '0');
      const startTime = `${startHours}:${startMinutes}`;

      const { type } = this._detectSubjectInfo(summary, location);

      const daysMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const dayKey = daysMap[startDate.getDay()];

      const resultEvents = [];
      const baseDateStr = this._formatDateYYYYMMDD(startDate);

      resultEvents.push({
        id: 'ics_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        calendarId: calendarId,
        title: summary,
        date: baseDateStr,
        day: dayKey,
        startTime: startTime,
        duration: durationMin,
        room: location || 'Salle',
        type: type,
        completed: false
      });

      const rrule = raw['RRULE'];
      if (rrule && rrule.includes('FREQ=WEEKLY')) {
        const untilMatch = rrule.match(/UNTIL=([0-9TZ]+)/i);
        const untilDate = untilMatch ? this._parseICSDate(untilMatch[1]) : new Date(startDate.getTime() + 16 * 7 * 86400000);

        let nextDate = new Date(startDate);
        for (let w = 1; w <= 20; w++) {
          nextDate.setDate(nextDate.getDate() + 7);
          if (nextDate > untilDate) break;

          resultEvents.push({
            id: 'ics_' + Math.random().toString(36).substring(2, 9) + '_' + w,
            calendarId: calendarId,
            title: summary,
            date: this._formatDateYYYYMMDD(nextDate),
            day: dayKey,
            startTime: startTime,
            duration: durationMin,
            room: location || 'Salle',
            type: type,
            completed: false
          });
        }
      }

      return resultEvents;
    },

    _formatDateYYYYMMDD(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    },

    _parseICSDate(dateStr) {
      const clean = dateStr.replace(/[^0-9TZ]/g, '');
      if (clean.length < 8) return new Date();
      const year = parseInt(clean.substring(0, 4), 10);
      const month = parseInt(clean.substring(4, 6), 10) - 1;
      const day = parseInt(clean.substring(6, 8), 10);

      if (clean.indexOf('T') !== -1) {
        const timePart = clean.substring(clean.indexOf('T') + 1);
        const hours = parseInt(timePart.substring(0, 2) || '0', 10);
        const minutes = parseInt(timePart.substring(2, 4) || '0', 10);
        const seconds = parseInt(timePart.substring(4, 6) || '0', 10);

        if (clean.endsWith('Z')) {
          return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
        }
        return new Date(year, month, day, hours, minutes, seconds);
      }
      return new Date(year, month, day, 8, 0, 0);
    },

    _detectSubjectInfo(title, loc) {
      const text = `${title} ${loc}`.toLowerCase();
      let type = 'course';
      if (text.includes('ds') || text.includes('partiel') || text.includes('examen')) type = 'ds';
      else if (text.includes('colle') || text.includes('khôlle')) type = 'colle';
      else if (text.includes('tp')) type = 'tp';
      else if (text.includes('td')) type = 'td';
      return { type };
    },

    async fetchFromUrl(url, calendarId) {
      let targetUrl = url.trim();
      if (targetUrl.startsWith('webcal://')) targetUrl = targetUrl.replace('webcal://', 'https://');
      try {
        const resp = await fetch(targetUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();
        return this.parse(text, calendarId);
      } catch (e) {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const respProxy = await fetch(proxyUrl);
        if (!respProxy.ok) throw new Error('Erreur de chargement du flux.');
        const text = await respProxy.text();
        return this.parse(text, calendarId);
      }
    }
  };

  // ==========================================================================
  // 8. VUE ACCUEIL / DASHBOARD (CALENDRIER MENSUEL 100% PERSO SANS COURS EDT)
  // ==========================================================================
  const DashboardView = {
    activeMonday: getMondayOfDate(new Date()),
    activeDayMobileIndex: 0,
    miniCalDate: new Date(),
    todoFilter: 'all',
    _autoSynced: false,

    _getWeekDates(monday) {
      const days = [];
      const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      const dayLabels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      const dayShorts = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        days.push({
          index: i,
          key: dayKeys[i],
          date: d,
          dateStr: dateStr,
          dayNum: d.getDate(),
          label: dayLabels[i],
          short: dayShorts[i]
        });
      }
      return days;
    },

    render(container) {
      const weekDays = this._getWeekDates(this.activeMonday);
      const startDay = weekDays[0];
      const endDay = weekDays[6];

      const startMonthName = startDay.date.toLocaleDateString('fr-FR', { month: 'short' });
      const endMonthName = endDay.date.toLocaleDateString('fr-FR', { month: 'short' });
      const weekRangeLabel = `${startDay.dayNum} ${startMonthName} ${startDay.date.getFullYear()} — ${endDay.dayNum} ${endMonthName} ${endDay.date.getFullYear()}`;

      const todayStr = new Date().toISOString().split('T')[0];
      const todayInWeekIdx = weekDays.findIndex(w => w.dateStr === todayStr);
      if (!this._hasSetInitialMobileDay && todayInWeekIdx !== -1) {
        this.activeDayMobileIndex = todayInWeekIdx;
        this._hasSetInitialMobileDay = true;
      }

      container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- Timetable Section -->
          <div class="lg:col-span-8 xl:col-span-9 space-y-4">
            
            <!-- Week Navigation & Actions Bar -->
            <div class="bg-white dark:bg-ink-darkcard p-4 rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm flex flex-wrap items-center justify-between gap-3">
              
              <!-- Week Switcher Controls -->
              <div class="flex items-center gap-2 flex-wrap">
                <div class="flex items-center gap-1 bg-creme-200/90 dark:bg-ink-darkbg p-1 rounded-2xl border border-creme-300 dark:border-ink-border">
                  <button id="week-prev-btn" title="Semaine précédente" class="p-1.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 text-ink dark:text-zinc-200 transition-colors">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                  </button>
                  <button id="week-today-btn" class="px-3 py-1 rounded-xl text-xs font-extrabold hover:bg-white dark:hover:bg-zinc-800 text-ink dark:text-zinc-200 transition-colors">
                    Aujourd'hui
                  </button>
                  <button id="week-next-btn" title="Semaine suivante" class="p-1.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 text-ink dark:text-zinc-200 transition-colors">
                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                  </button>
                </div>

                <div class="text-xs font-extrabold text-ink dark:text-white flex items-center gap-1.5 px-2">
                  <i data-lucide="calendar" class="w-4 h-4 text-solaire-500"></i>
                  <span class="tracking-tight">${weekRangeLabel}</span>
                </div>
              </div>

              <!-- Actions: Gérer les calendriers & Ajouter un cours -->
              <div class="flex items-center gap-2 flex-wrap">
                <button id="manage-calendars-btn" class="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-creme-200 hover:bg-creme-300 dark:bg-ink-darkbg dark:hover:bg-zinc-800 text-ink dark:text-zinc-200 border border-creme-300 dark:border-ink-border transition-all flex items-center gap-1.5 shadow-xs">
                  <i data-lucide="layers" class="w-3.5 h-3.5 text-solaire-500"></i>
                  <span>Gérer les calendriers</span>
                </button>

                <button id="add-event-btn" class="px-4 py-2 rounded-xl text-xs font-extrabold bg-solaire-500 hover:bg-solaire-600 text-white transition-all flex items-center gap-1.5 shadow-md shadow-solaire-500/25">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  <span>Ajouter un cours</span>
                </button>
              </div>
            </div>

            <!-- Mobile Day Switcher -->
            <div class="lg:hidden bg-white dark:bg-ink-darkcard p-2 rounded-2xl border border-creme-300 dark:border-ink-border shadow-sm flex items-center justify-between gap-1 overflow-x-auto">
              ${weekDays.map((d, idx) => `
                <button data-day-index="${idx}" class="mobile-day-tab flex-1 py-2 px-2 rounded-xl text-xs font-bold text-center transition-all ${this.activeDayMobileIndex === idx ? 'bg-solaire-500 text-white font-black shadow-md shadow-solaire-500/20' : 'text-zinc-600 dark:text-zinc-400 hover:bg-creme-200 dark:hover:bg-zinc-800'}">
                  <div>${d.short}</div>
                  <div class="text-[10px] opacity-80">${d.dayNum}</div>
                </button>
              `).join('')}
            </div>

            <!-- Timetable Grid Container -->
            <div class="bg-white dark:bg-ink-darkcard rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm overflow-hidden flex flex-col">
              
              <!-- Column Headers -->
              <div class="grid grid-cols-[50px_repeat(7,1fr)] max-lg:grid-cols-[50px_1fr] border-b border-creme-200 dark:border-ink-border bg-creme-100/70 dark:bg-ink-darkbg/70 text-xs font-extrabold text-ink dark:text-zinc-300 select-none">
                <div class="py-3 text-center text-zinc-400 text-[11px] border-r border-creme-200 dark:border-ink-border font-mono">Heure</div>
                
                ${weekDays.map(d => {
                  const isToday = d.dateStr === todayStr;
                  return `
                    <div class="hidden lg:flex flex-col items-center justify-center py-2.5 border-r border-creme-200 dark:border-ink-border last:border-r-0 ${isToday ? 'bg-solaire-500/10 text-solaire-600 dark:text-solaire-400 font-black' : ''}">
                      <span>${d.label}</span>
                      <span class="text-[11px] font-mono ${isToday ? 'text-solaire-600 dark:text-solaire-400 font-black' : 'text-zinc-400 font-normal'}">${d.dayNum} ${d.date.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                    </div>
                  `;
                }).join('')}

                <!-- Mobile Single Header -->
                <div class="lg:hidden flex items-center justify-between px-4 py-2.5 text-solaire-600 dark:text-solaire-400 font-black">
                  <button id="mobile-prev-day" class="p-1 hover:bg-creme-200 dark:hover:bg-zinc-800 rounded-lg">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                  </button>
                  <span>${weekDays[this.activeDayMobileIndex]?.label} ${weekDays[this.activeDayMobileIndex]?.dayNum}</span>
                  <button id="mobile-next-day" class="p-1 hover:bg-creme-200 dark:hover:bg-zinc-800 rounded-lg">
                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>

              <!-- Grid Area 5h00 - 00h00 -->
              <div class="relative overflow-y-auto max-h-[720px] timetable-grid" id="timetable-scroll-area">
                <div class="grid grid-cols-[50px_repeat(7,1fr)] max-lg:grid-cols-[50px_1fr] relative" style="height: calc(19 * var(--hour-height));">
                  <div class="relative border-r border-creme-200 dark:border-ink-border select-none text-[11px] text-zinc-400 font-mono text-center">
                    ${Array.from({ length: 19 }, (_, i) => i + 5).map(hour => `
                      <div class="absolute left-0 right-0 flex items-center justify-center -translate-y-2.5" style="top: ${(hour - 5) * 54}px;">
                        ${String(hour).padStart(2, '0')}h
                      </div>
                    `).join('')}
                  </div>

                  ${weekDays.map(d => `
                    <div data-col-datestr="${d.dateStr}" class="hidden lg:block relative border-r border-creme-200/60 dark:border-ink-border/60 last:border-r-0 ${d.dateStr === todayStr ? 'bg-solaire-500/[0.04]' : ''}"></div>
                  `).join('')}

                  <div id="mobile-single-day-col" class="lg:hidden relative"></div>
                  <div id="current-time-indicator" class="current-time-line hidden"></div>
                </div>
              </div>

            </div>

          </div>

          <!-- Right Sidebar: Mini-Calendar & To-Do -->
          <div class="lg:col-span-4 xl:col-span-3 space-y-6">
            
            <!-- Mini-Calendrier Mensuel (Événements Personnels Uniquement) -->
            <div class="bg-white dark:bg-ink-darkcard p-5 rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-black text-ink dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <i data-lucide="calendar" class="w-4 h-4 text-solaire-500"></i>
                  <span id="mini-cal-month-title">Août 2026</span>
                </h3>
                <div class="flex items-center gap-1">
                  <button id="mini-cal-prev" title="Mois précédent" class="p-1 rounded-lg hover:bg-creme-200 dark:hover:bg-zinc-800 text-zinc-500">
                    <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                  </button>
                  <button id="mini-cal-today-btn" class="text-[10px] px-2 py-0.5 font-bold rounded-lg bg-creme-200 hover:bg-creme-300 dark:bg-zinc-800 text-ink dark:text-zinc-200">
                    Aujourd'hui
                  </button>
                  <button id="mini-cal-next" title="Mois suivant" class="p-1 rounded-lg hover:bg-creme-200 dark:hover:bg-zinc-800 text-zinc-500">
                    <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                  </button>
                  <button id="add-important-date-btn" title="Ajouter un événement personnel" class="ml-1 p-1 bg-solaire-50 dark:bg-solaire-950 text-solaire-600 dark:text-solaire-400 hover:bg-solaire-100 rounded-lg text-xs font-bold">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>

              <!-- Month Grid Header -->
              <div class="grid grid-cols-7 text-center text-[10px] font-black text-zinc-400">
                <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
              </div>

              <!-- Month Days -->
              <div id="mini-cal-grid" class="grid grid-cols-7 gap-1"></div>
            </div>

            <!-- Daily To-Do : Compacte, sans bouton + et avec badge catégorie réduit -->
            <div class="bg-white dark:bg-ink-darkcard p-5 rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm space-y-3.5 overflow-hidden">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xs font-black text-ink dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                    <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i>
                    To-Do du Jour
                  </h3>
                  <p class="text-[10px] text-zinc-500 font-bold mt-0.5" id="todo-completion-count">0 / 0 terminée(s)</p>
                </div>
                <div class="flex items-center gap-1 text-[10px] bg-creme-200 dark:bg-zinc-800 p-0.5 rounded-xl border border-creme-300 dark:border-zinc-700">
                  <button data-filter="all" class="todo-filter-btn px-2 py-0.5 rounded-lg font-bold ${this.todoFilter === 'all' ? 'bg-white dark:bg-zinc-700 text-ink dark:text-white shadow-xs' : 'text-zinc-500'}">Toutes</button>
                  <button data-filter="pending" class="todo-filter-btn px-2 py-0.5 rounded-lg font-bold ${this.todoFilter === 'pending' ? 'bg-white dark:bg-zinc-700 text-ink dark:text-white shadow-xs' : 'text-zinc-500'}">À faire</button>
                </div>
              </div>

              <!-- Formulaire simplifié (saisie + sélection catégorie, validation sur Entrée) -->
              <form id="add-daily-todo-form" class="flex items-center gap-1.5 w-full">
                <input type="text" id="daily-todo-input" placeholder="Ajouter une tâche (Entrée)..." class="flex-1 min-w-0 text-xs px-3 py-2 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-solaire-500 font-medium">
                <select id="daily-todo-tag" class="text-xs max-w-[100px] flex-shrink-0 px-2 py-2 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 text-ink dark:text-white font-bold truncate">
                  <option value="Maths">Maths</option>
                  <option value="Physique">Physique</option>
                  <option value="Info">Info</option>
                  <option value="Autres cours">Autres cours</option>
                  <option value="Maison">Maison</option>
                  <option value="Sport">Sport</option>
                </select>
              </form>

              <div id="daily-todos-container" class="space-y-2 max-h-64 overflow-y-auto pr-0.5"></div>
            </div>

          </div>

        </div>
      `;

      if (window.lucide) window.lucide.createIcons();

      this._bindEvents(container);
      this._renderTimetableEvents();
      this._renderMiniCalendar();
      this._renderDailyTodos();
      this._updateCurrentTimeIndicator();

      if (!this._autoSynced) {
        this._autoSynced = true;
        const calsWithUrl = store.getCalendars().filter(c => !!c.feedUrl);
        if (calsWithUrl.length) {
          store.refreshAllFeeds().then(count => {
            if (count > 0) {
              this._renderTimetableEvents();
              Toast.info(`EDT actualisé : ${count} cours synchronisés.`);
            }
          });
        }
      }
    },

    _bindEvents(container) {
      container.querySelector('#week-prev-btn').addEventListener('click', () => {
        const d = new Date(this.activeMonday);
        d.setDate(d.getDate() - 7);
        this.activeMonday = d;
        this.render(container);
      });

      container.querySelector('#week-next-btn').addEventListener('click', () => {
        const d = new Date(this.activeMonday);
        d.setDate(d.getDate() + 7);
        this.activeMonday = d;
        this.render(container);
      });

      container.querySelector('#week-today-btn').addEventListener('click', () => {
        this.activeMonday = getMondayOfDate(new Date());
        this.render(container);
      });

      container.querySelectorAll('.mobile-day-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          this.activeDayMobileIndex = parseInt(btn.dataset.dayIndex, 10);
          this.render(container);
        });
      });

      const mobPrev = container.querySelector('#mobile-prev-day');
      const mobNext = container.querySelector('#mobile-next-day');
      if (mobPrev && mobNext) {
        mobPrev.addEventListener('click', () => {
          this.activeDayMobileIndex = (this.activeDayMobileIndex - 1 + 7) % 7;
          this.render(container);
        });
        mobNext.addEventListener('click', () => {
          this.activeDayMobileIndex = (this.activeDayMobileIndex + 1) % 7;
          this.render(container);
        });
      }

      container.querySelector('#add-event-btn').addEventListener('click', () => this._openAddEventModal());
      container.querySelector('#manage-calendars-btn').addEventListener('click', () => this._openManageCalendarsModal(container));
      container.querySelector('#add-important-date-btn').addEventListener('click', () => this._openAddImportantDateModal());

      container.querySelector('#mini-cal-prev').addEventListener('click', () => {
        this.miniCalDate.setMonth(this.miniCalDate.getMonth() - 1);
        this._renderMiniCalendar();
      });
      container.querySelector('#mini-cal-next').addEventListener('click', () => {
        this.miniCalDate.setMonth(this.miniCalDate.getMonth() + 1);
        this._renderMiniCalendar();
      });
      container.querySelector('#mini-cal-today-btn').addEventListener('click', () => {
        this.miniCalDate = new Date();
        this._renderMiniCalendar();
      });

      container.querySelectorAll('.todo-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.todoFilter = btn.dataset.filter;
          this._renderDailyTodos();
          container.querySelectorAll('.todo-filter-btn').forEach(b => {
            b.className = `todo-filter-btn px-2 py-0.5 rounded-lg font-bold ${b.dataset.filter === this.todoFilter ? 'bg-white dark:bg-zinc-700 text-ink dark:text-white shadow-xs' : 'text-zinc-500'}`;
          });
        });
      });

      const todoForm = container.querySelector('#add-daily-todo-form');
      todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = container.querySelector('#daily-todo-input');
        const tagSelect = container.querySelector('#daily-todo-tag');
        const text = input.value.trim();
        if (text) {
          store.addDailyTodo(text, 'normal', tagSelect.value);
          input.value = '';
          this._renderDailyTodos();
          Toast.success('Tâche ajoutée !');
        }
      });
    },

    _renderTimetableEvents() {
      const allEvents = store.getEvents();
      const calendars = store.getCalendars();
      const calMap = new Map(calendars.map(c => [c.id, c]));

      const weekDays = this._getWeekDates(this.activeMonday);
      const HOUR_HEIGHT = 54;
      const START_HOUR = 5;

      weekDays.forEach(d => {
        const colEl = document.querySelector(`[data-col-datestr="${d.dateStr}"]`);
        if (colEl) {
          colEl.innerHTML = '';
          const dayEvents = allEvents.filter(e => {
            if (e.date) return e.date === d.dateStr;
            return e.day === d.key;
          }).map(e => {
            const cal = calMap.get(e.calendarId) || calendars[0];
            return {
              ...e,
              color: cal ? cal.color : (e.color || '#ff3366')
            };
          });
          this._layoutDayEvents(dayEvents, colEl, HOUR_HEIGHT, START_HOUR);
        }
      });

      const mobileColEl = document.getElementById('mobile-single-day-col');
      if (mobileColEl) {
        mobileColEl.innerHTML = '';
        const currentMobDay = weekDays[this.activeDayMobileIndex];
        if (currentMobDay) {
          const mobileEvents = allEvents.filter(e => {
            if (e.date) return e.date === currentMobDay.dateStr;
            return e.day === currentMobDay.key;
          }).map(e => {
            const cal = calMap.get(e.calendarId) || calendars[0];
            return {
              ...e,
              color: cal ? cal.color : (e.color || '#ff3366')
            };
          });
          this._layoutDayEvents(mobileEvents, mobileColEl, HOUR_HEIGHT, START_HOUR);
        }
      }
    },

    _layoutDayEvents(events, containerEl, hourHeight, startHour) {
      if (!events.length) return;

      const parsedEvents = events.map(ev => {
        const [h, m] = (ev.startTime || '08:00').split(':').map(Number);
        const startMin = (h - startHour) * 60 + m;
        const endMin = startMin + (ev.duration || 60);
        return { ...ev, startMin, endMin };
      });

      parsedEvents.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

      const clusters = [];
      let currentCluster = [];
      let clusterEnd = -1;

      parsedEvents.forEach(ev => {
        if (ev.startMin < clusterEnd) {
          currentCluster.push(ev);
          clusterEnd = Math.max(clusterEnd, ev.endMin);
        } else {
          if (currentCluster.length) clusters.push(currentCluster);
          currentCluster = [ev];
          clusterEnd = ev.endMin;
        }
      });
      if (currentCluster.length) clusters.push(currentCluster);

      clusters.forEach(cluster => {
        const columns = [];
        cluster.forEach(ev => {
          let placed = false;
          for (let colIdx = 0; colIdx < columns.length; colIdx++) {
            if (columns[colIdx] <= ev.startMin) {
              columns[colIdx] = ev.endMin;
              ev.colIndex = colIdx;
              placed = true;
              break;
            }
          }
          if (!placed) {
            ev.colIndex = columns.length;
            columns.push(ev.endMin);
          }
        });

        const totalCols = columns.length;

        cluster.forEach(ev => {
          const topPx = (ev.startMin / 60) * hourHeight;
          const heightPx = Math.max((ev.duration / 60) * hourHeight - 2, 24);
          const widthPct = (100 / totalCols);
          const leftPct = (ev.colIndex / totalCols) * 100;

          const eventEl = document.createElement('div');
          eventEl.className = `timetable-event ${ev.completed ? 'completed' : ''}`;
          eventEl.style.top = `${topPx}px`;
          eventEl.style.height = `${heightPx}px`;
          eventEl.style.left = `calc(${leftPct}% + 2px)`;
          eventEl.style.width = `calc(${widthPct}% - 4px)`;
          eventEl.style.backgroundColor = `${ev.color}1c`;
          eventEl.style.borderLeftColor = ev.color;
          eventEl.style.color = ev.color;

          const startH = parseInt(ev.startTime.split(':')[0], 10);
          const startM = parseInt(ev.startTime.split(':')[1], 10);
          const endTotalM = startH * 60 + startM + ev.duration;
          const endH = Math.floor(endTotalM / 60) % 24;
          const endMinStr = String(endTotalM % 60).padStart(2, '0');
          const endTimeStr = `${String(endH).padStart(2, '0')}:${endMinStr}`;

          eventEl.innerHTML = `
            <div class="flex items-start justify-between gap-1 w-full overflow-hidden">
              <div class="flex items-center gap-1.5 truncate">
                <span class="event-checkbox ${ev.completed ? 'checked' : ''}" title="Cocher le cours"></span>
                <span class="event-title font-extrabold truncate text-ink dark:text-zinc-100">${ev.title}</span>
              </div>
            </div>
            <div class="flex items-center justify-between text-[10px] text-zinc-600 dark:text-zinc-300 mt-0.5 font-bold truncate">
              <span>${ev.startTime} - ${endTimeStr}</span>
              ${ev.room ? `<span class="truncate ml-1 font-mono px-1 rounded bg-black/10 dark:bg-white/15 text-ink dark:text-white">${ev.room}</span>` : ''}
            </div>
          `;

          eventEl.querySelector('.event-checkbox').addEventListener('click', (e) => {
            e.stopPropagation();
            store.toggleEventCompleted(ev.id);
            this._renderTimetableEvents();
          });

          eventEl.addEventListener('click', () => this._openEditEventModal(ev));
          containerEl.appendChild(eventEl);
        });
      });
    },

    _updateCurrentTimeIndicator() {
      const indicator = document.getElementById('current-time-indicator');
      if (!indicator) return;
      const now = new Date();
      const hour = now.getHours();
      const min = now.getMinutes();

      if (hour >= 5 && hour < 24) {
        const topPx = ((hour - 5) + min / 60) * 54;
        indicator.style.top = `${topPx}px`;
        indicator.classList.remove('hidden');
      } else {
        indicator.classList.add('hidden');
      }
    },

    // Mini-calendrier : N'affiche AUCUN cours d'EDT, UNIQUEMENT les événements manuels
    _renderMiniCalendar() {
      const grid = document.getElementById('mini-cal-grid');
      const title = document.getElementById('mini-cal-month-title');
      if (!grid || !title) return;

      const year = this.miniCalDate.getFullYear();
      const month = this.miniCalDate.getMonth();
      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      title.textContent = `${monthNames[month]} ${year}`;

      grid.innerHTML = '';
      const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
      const totalDays = new Date(year, month + 1, 0).getDate();
      const prevMonthTotalDays = new Date(year, month, 0).getDate();

      const importantDates = store.getImportantDates();
      const today = new Date();
      const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

      for (let i = firstDayIndex - 1; i >= 0; i--) {
        const cell = document.createElement('div');
        cell.className = 'mini-cal-day text-zinc-300 dark:text-zinc-700 opacity-30 text-[10px] cursor-default font-normal';
        cell.textContent = prevMonthTotalDays - i;
        grid.appendChild(cell);
      }

      for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement('div');
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = isCurrentMonth && today.getDate() === day;

        cell.className = `mini-cal-day text-[11px] ${isToday ? 'today' : 'text-zinc-800 dark:text-zinc-200'}`;
        cell.textContent = day;

        // SEULS les événements personnels manuels s'affichent sous forme de pastilles
        const dayImportant = importantDates.filter(imp => imp.date === dateStr);

        if (dayImportant.length > 0) {
          const dot = document.createElement('span');
          dot.className = 'event-dot';
          dot.style.backgroundColor = dayImportant[0].color || '#ff3366';
          cell.appendChild(dot);
          cell.title = dayImportant.map(e => `• ${e.title}`).join('\n');
        }

        cell.addEventListener('click', () => {
          if (dayImportant.length > 0) {
            this._openDayEventsModal(dateStr, dayImportant);
          } else {
            this._openAddImportantDateModal(dateStr);
          }
        });

        grid.appendChild(cell);
      }
    },

    _openDayEventsModal(dateStr, events) {
      const content = `
        <div class="space-y-4">
          <p class="text-xs text-zinc-500 font-bold">Événements prévus pour le <span class="font-mono text-ink dark:text-white">${dateStr}</span> :</p>
          <div class="space-y-2.5 max-h-60 overflow-y-auto">
            ${events.map(ev => `
              <div class="p-3.5 rounded-2xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm" style="background-color: ${ev.color};"></span>
                  <span class="text-xs font-black text-ink dark:text-white">${ev.title}</span>
                </div>
                <button data-delete-imp="${ev.id}" class="text-zinc-400 hover:text-rose-500 p-1 rounded-lg">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      Modal.open({
        title: `Événements personnels (${events.length})`,
        content,
        footer: `
          <button id="add-another-event-btn" class="px-4 py-2 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black mr-auto shadow-xs">+ Ajouter un événement</button>
          <button id="close-day-ev-btn" class="px-5 py-2 bg-ink dark:bg-white text-white dark:text-ink rounded-2xl text-xs font-black">Fermer</button>
        `,
        onOpen: (modalEl) => {
          modalEl.querySelector('#close-day-ev-btn').addEventListener('click', () => Modal.close());
          modalEl.querySelector('#add-another-event-btn').addEventListener('click', () => {
            Modal.close();
            this._openAddImportantDateModal(dateStr);
          });
          modalEl.querySelectorAll('[data-delete-imp]').forEach(btn => {
            btn.addEventListener('click', () => {
              store.deleteImportantDate(btn.dataset.deleteImp);
              Toast.info('Événement supprimé');
              Modal.close();
              this._renderMiniCalendar();
            });
          });
        }
      });
    },

    _renderDailyTodos() {
      const container = document.getElementById('daily-todos-container');
      const countEl = document.getElementById('todo-completion-count');
      if (!container) return;

      let todos = store.getDailyTodos();
      const completedCount = todos.filter(t => t.completed).length;
      if (countEl) countEl.textContent = `${completedCount} / ${todos.length} terminée(s)`;

      if (this.todoFilter === 'pending') todos = todos.filter(t => !t.completed);

      if (!todos.length) {
        container.innerHTML = `<p class="text-xs text-zinc-400 italic py-4 text-center select-none">Aucune tâche pour le moment.<br><span class="text-[10px] text-zinc-500 font-bold">Tapez une tâche ci-dessus et appuyez sur Entrée.</span></p>`;
        return;
      }

      container.innerHTML = todos.map(todo => {
        const catInfo = getCategoryColor(todo.tag);
        return `
          <div class="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-creme-100/90 dark:bg-ink-darkbg/90 border border-creme-200 dark:border-zinc-800 transition-all ${todo.completed ? 'opacity-45' : ''}">
            <label class="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none">
              <input type="checkbox" ${todo.completed ? 'checked' : ''} data-todo-id="${todo.id}" style="accent-color: ${catInfo.hex};" class="w-4 h-4 flex-shrink-0 rounded cursor-pointer">
              <span class="text-xs font-bold text-ink dark:text-zinc-100 truncate ${todo.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}">${todo.text}</span>
            </label>
            <div class="flex items-center gap-1 flex-shrink-0">
              <span class="text-[9px] max-w-[65px] truncate px-1.5 py-0.5 rounded-md font-black border ${catInfo.bg}" title="${todo.tag || 'Autre'}">${todo.tag || 'Autre'}</span>
              <button data-delete-todo="${todo.id}" class="text-zinc-400 hover:text-rose-500 p-0.5 rounded-lg flex-shrink-0">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        chk.addEventListener('change', () => {
          store.toggleDailyTodo(chk.dataset.todoId);
          this._renderDailyTodos();
        });
      });

      container.querySelectorAll('[data-delete-todo]').forEach(btn => {
        btn.addEventListener('click', () => {
          store.deleteDailyTodo(btn.dataset.deleteTodo);
          this._renderDailyTodos();
        });
      });
    },

    // GESTION DES CALENDRIERS : Création Manuelle Simplifiée + Option Flux ICS
    _openManageCalendarsModal(container) {
      const calendars = store.getCalendars();
      const allEvents = store.getEvents();

      const content = `
        <div class="space-y-6">
          
          <!-- 1. Créer un calendrier manuel (Nom + Couleur) -->
          <div class="p-5 rounded-3xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-ink-border space-y-4 shadow-xs">
            <h4 class="text-xs font-black uppercase tracking-wider text-ink dark:text-white flex items-center gap-1.5">
              <i data-lucide="plus-circle" class="w-4 h-4 text-solaire-500"></i>
              Créer un calendrier manuel
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Nom du calendrier *</label>
                <input type="text" id="manual-cal-name" placeholder="Ex: Perso, Sport, Projets..." class="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 font-bold">
              </div>
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Couleur associée *</label>
                <div class="flex items-center gap-2">
                  <select id="manual-cal-color" class="flex-1 text-xs px-3 py-2 rounded-xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 font-bold">
                    ${CALENDAR_COLORS.map(c => `<option value="${c.hex}">${c.name}</option>`).join('')}
                  </select>
                  <input type="color" id="manual-cal-color-picker" value="#ff3366" class="w-8 h-8 rounded-xl cursor-pointer bg-transparent border-0">
                </div>
              </div>
            </div>

            <button id="btn-create-manual-cal" class="w-full py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Créer le calendrier</span>
            </button>
          </div>

          <!-- 2. Option : Importer / Synchroniser un flux iCal / Webcal -->
          <div class="p-5 rounded-3xl bg-creme-100/70 dark:bg-ink-darkbg/70 border border-creme-300 dark:border-zinc-800 space-y-3.5">
            <h4 class="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <i data-lucide="download-cloud" class="w-4 h-4 text-orangePop-500"></i>
              Ou Synchroniser un flux iCal / Webcal (Lien école)
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Nom du flux</label>
                <input type="text" id="ics-cal-name" placeholder="Ex: ESILV / ADE Campus" class="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 font-bold">
              </div>
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Couleur</label>
                <select id="ics-cal-color" class="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 font-bold">
                  ${CALENDAR_COLORS.map(c => `<option value="${c.hex}">${c.name}</option>`).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Lien URL permanent iCal / Webcal</label>
              <div class="flex gap-2">
                <input type="text" id="ics-cal-url" placeholder="https://... ou webcal://..." class="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 font-mono">
                <button id="btn-import-ics-url" class="px-4 py-2 bg-orangePop-500 hover:bg-orangePop-600 text-white rounded-xl text-xs font-black flex-shrink-0 flex items-center gap-1 shadow-sm">
                  <i data-lucide="download" class="w-3.5 h-3.5"></i>
                  <span>Sync</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 3. Calendriers enregistrés -->
          <div class="space-y-3">
            <h4 class="text-xs font-black uppercase tracking-wider text-ink dark:text-white">
              Calendriers enregistrés (${calendars.length})
            </h4>

            <div class="space-y-3 max-h-60 overflow-y-auto pr-1">
              ${calendars.map(cal => {
                const count = allEvents.filter(e => e.calendarId === cal.id).length;
                return `
                  <div class="p-4 rounded-2xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-ink-border flex items-center justify-between gap-3 shadow-xs">
                    <div class="flex items-center gap-3">
                      <input type="color" value="${cal.color}" data-change-cal-color="${cal.id}" title="Changer la couleur" class="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 flex-shrink-0">
                      <div>
                        <h5 class="text-xs font-black text-ink dark:text-white">${cal.name}</h5>
                        <p class="text-[10px] text-zinc-500 font-bold">${count} cours associés ${cal.feedUrl ? '• Flux synchronisé' : '• Calendrier manuel'}</p>
                      </div>
                    </div>

                    <button data-delete-cal="${cal.id}" title="Supprimer ce calendrier" class="p-1.5 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>
      `;

      Modal.open({
        title: 'Gérer les Calendriers de l\'EDT',
        content,
        maxWidth: 'max-w-lg',
        footer: `<button id="close-manage-cal-btn" class="px-5 py-2.5 bg-ink dark:bg-white text-white dark:text-ink hover:opacity-90 rounded-2xl text-xs font-black">Fermer</button>`,
        onOpen: (modalEl) => {
          modalEl.querySelector('#close-manage-cal-btn').addEventListener('click', () => Modal.close());

          const manualColorSelect = modalEl.querySelector('#manual-cal-color');
          const manualColorPicker = modalEl.querySelector('#manual-cal-color-picker');
          manualColorSelect.addEventListener('change', () => { manualColorPicker.value = manualColorSelect.value; });
          manualColorPicker.addEventListener('input', () => { manualColorSelect.value = manualColorPicker.value; });

          // Création manuelle (sans lien web)
          modalEl.querySelector('#btn-create-manual-cal').addEventListener('click', () => {
            const name = modalEl.querySelector('#manual-cal-name').value.trim();
            const color = manualColorPicker.value;
            if (!name) { Toast.warning('Veuillez renseigner un nom pour le calendrier.'); return; }

            store.addCalendar(name, color, '');
            Toast.success(`Calendrier "${name}" créé avec succès !`);
            Modal.close();
            this.render(container);
          });

          // Import via flux URL
          modalEl.querySelector('#btn-import-ics-url').addEventListener('click', async () => {
            const name = modalEl.querySelector('#ics-cal-name').value.trim() || 'EDT École';
            const url = modalEl.querySelector('#ics-cal-url').value.trim();
            const color = modalEl.querySelector('#ics-cal-color').value;
            if (!url) { Toast.warning('Veuillez renseigner une URL de flux.'); return; }

            try {
              const newCal = store.addCalendar(name, color, url);
              const events = await ICSParser.fetchFromUrl(url, newCal.id);
              events.forEach(e => store.addEvent(e));
              Toast.success(`Flux "${name}" synchronisé (${events.length} cours) !`);
              Modal.close();
              this.render(container);
            } catch (err) {
              Toast.error(err.message || 'Erreur lors de l\'import.');
            }
          });

          modalEl.querySelectorAll('[data-change-cal-color]').forEach(input => {
            input.addEventListener('change', () => {
              store.updateCalendar(input.dataset.changeCalColor, { color: input.value });
              Toast.info('Couleur du calendrier mise à jour');
              this._renderTimetableEvents();
            });
          });

          modalEl.querySelectorAll('[data-delete-cal]').forEach(btn => {
            btn.addEventListener('click', () => {
              const calId = btn.dataset.deleteCal;
              const cal = store.getCalendar(calId);
              if (confirm(`Supprimer le calendrier "${cal ? cal.name : ''}" et retirer tous ses cours ?`)) {
                store.deleteCalendar(calId);
                Toast.info('Calendrier supprimé');
                Modal.close();
                this.render(container);
              }
            });
          });
        }
      });
    },

    _openAddEventModal() {
      const weekDays = this._getWeekDates(this.activeMonday);
      const defaultDateStr = weekDays[0].dateStr;
      const calendars = store.getCalendars();

      const content = `
        <form id="add-course-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Nom du cours / tâche *</label>
            <input type="text" id="ev-title" required placeholder="Ex: Algèbre linéaire" class="w-full text-xs px-3 py-2.5 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-bold">
          </div>
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Calendrier associé *</label>
            <select id="ev-calendar" class="w-full text-xs px-3 py-2.5 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-bold">
              ${calendars.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Date exacte *</label>
              <input type="date" id="ev-date" required value="${defaultDateStr}" class="w-full text-xs px-3 py-2 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-mono">
            </div>
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Heure de début *</label>
              <input type="time" id="ev-start" required value="08:00" class="w-full text-xs px-3 py-2 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-mono">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Durée *</label>
              <select id="ev-duration" class="w-full text-xs px-3 py-2 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-bold">
                <option value="60">1h (60 min)</option><option value="90">1h30 (90 min)</option><option value="105">1h45 (105 min)</option>
                <option value="120" selected>2h (120 min)</option><option value="180">3h (180 min)</option><option value="240">4h (240 min)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Salle</label>
              <input type="text" id="ev-room" placeholder="Ex: Amphi Poincaré" class="w-full text-xs px-3 py-2 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700">
            </div>
          </div>
        </form>
      `;

      Modal.open({
        title: 'Ajouter un cours',
        content,
        footer: `
          <button id="cancel-add-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="save-course-btn" class="px-5 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-md shadow-solaire-500/25">Enregistrer</button>
        `,
        onOpen: (modalEl) => {
          modalEl.querySelector('#cancel-add-btn').addEventListener('click', () => Modal.close());
          modalEl.querySelector('#save-course-btn').addEventListener('click', () => {
            const title = modalEl.querySelector('#ev-title').value.trim();
            const dateVal = modalEl.querySelector('#ev-date').value;
            const calendarId = modalEl.querySelector('#ev-calendar').value;
            if (!title || !dateVal) { Toast.warning('Veuillez renseigner le titre et la date.'); return; }

            const dObj = new Date(dateVal);
            const daysMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const dayKey = daysMap[dObj.getDay()];

            store.addEvent({
              calendarId,
              title,
              date: dateVal,
              day: dayKey,
              startTime: modalEl.querySelector('#ev-start').value,
              duration: parseInt(modalEl.querySelector('#ev-duration').value, 10),
              room: modalEl.querySelector('#ev-room').value.trim(),
              completed: false
            });
            Toast.success('Cours ajouté !');
            Modal.close();
            this._renderTimetableEvents();
          });
        }
      });
    },

    _openEditEventModal(event) {
      const content = `
        <div class="space-y-3">
          <div class="p-4 rounded-2xl" style="background-color: ${event.color}18; border-left: 5px solid ${event.color};">
            <h4 class="font-extrabold text-sm text-ink dark:text-white">${event.title}</h4>
            <p class="text-xs font-medium text-zinc-600 dark:text-zinc-300 mt-1">${event.date || 'Toutes les semaines'} • ${event.startTime} (${event.duration} min) • ${event.room || 'Salle non précisée'}</p>
          </div>
        </div>
      `;

      Modal.open({
        title: 'Détails du cours',
        content,
        footer: `
          <button id="delete-event-btn" class="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-xs font-black mr-auto">Supprimer</button>
          <button id="toggle-done-btn" class="px-4 py-2 bg-creme-200 dark:bg-zinc-800 text-ink dark:text-white rounded-2xl text-xs font-bold">
            ${event.completed ? 'Marquer non fait' : 'Marquer comme fait ✓'}
          </button>
          <button id="close-detail-btn" class="px-5 py-2 bg-ink dark:bg-white text-white dark:text-ink rounded-2xl text-xs font-black">Fermer</button>
        `,
        onOpen: (modalEl) => {
          modalEl.querySelector('#close-detail-btn').addEventListener('click', () => Modal.close());
          modalEl.querySelector('#toggle-done-btn').addEventListener('click', () => {
            store.toggleEventCompleted(event.id);
            Modal.close();
            this._renderTimetableEvents();
          });
          modalEl.querySelector('#delete-event-btn').addEventListener('click', () => {
            if (confirm('Supprimer ce cours ?')) {
              store.deleteEvent(event.id);
              Toast.info('Cours supprimé');
              Modal.close();
              this._renderTimetableEvents();
            }
          });
        }
      });
    },

    // Événement personnel manuel (Mini-calendrier)
    _openAddImportantDateModal(prefilledDate = null) {
      const defaultDate = prefilledDate || new Date().toISOString().split('T')[0];

      const content = `
        <form id="add-imp-date-form" class="space-y-3.5">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Intitulé de l'événement *</label>
            <input type="text" id="imp-title" required placeholder="Ex: Anniversaire, Rendez-vous, DS Maths..." class="w-full text-xs px-3 py-2 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-bold">
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Date de l'événement *</label>
              <input type="date" id="imp-date" required value="${defaultDate}" class="w-full text-xs px-3 py-2 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-mono">
            </div>
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Couleur de la pastille *</label>
              <div class="flex items-center gap-2">
                <select id="imp-color-select" class="flex-1 text-xs px-3 py-2 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-bold">
                  ${CALENDAR_COLORS.map(c => `<option value="${c.hex}">${c.name}</option>`).join('')}
                </select>
                <input type="color" id="imp-color-picker" value="#ff3366" class="w-8 h-8 rounded-xl cursor-pointer bg-transparent border-0">
              </div>
            </div>
          </div>
        </form>
      `;

      Modal.open({
        title: 'Ajouter un événement personnel',
        content,
        footer: `
          <button id="cancel-imp-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="save-imp-btn" class="px-5 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-sm">Enregistrer</button>
        `,
        onOpen: (modalEl) => {
          const colorSelect = modalEl.querySelector('#imp-color-select');
          const colorPicker = modalEl.querySelector('#imp-color-picker');
          colorSelect.addEventListener('change', () => { colorPicker.value = colorSelect.value; });
          colorPicker.addEventListener('input', () => { colorSelect.value = colorPicker.value; });

          modalEl.querySelector('#cancel-imp-btn').addEventListener('click', () => Modal.close());
          modalEl.querySelector('#save-imp-btn').addEventListener('click', () => {
            const title = modalEl.querySelector('#imp-title').value.trim();
            const date = modalEl.querySelector('#imp-date').value;
            const color = colorPicker.value;
            if (!title || !date) { Toast.warning('Veuillez renseigner le nom et la date.'); return; }

            store.addImportantDate({ title, date, color });
            Toast.success('Événement personnel ajouté au calendrier !');
            Modal.close();
            this._renderMiniCalendar();
          });
        }
      });
    }
  };

  // ==========================================================================
  // 9. VUE MATIÈRES (STICKER MARGUERITE ROSE & COULEURS DYNAMIQUES)
  // ==========================================================================
  const ACCORDION_STORAGE_KEY = 'studyflow_accordions_state';

  const SUBJECT_THEMES = {
    maths: {
      name: 'Mathématiques',
      btnClass: 'bg-solaire-500 hover:bg-solaire-600 shadow-solaire-500/25 text-white',
      dotClass: 'bg-solaire-500',
      iconClass: 'text-solaire-500',
      categories: [
        { key: 'exosTodo', label: 'Exos à faire', icon: 'list-todo' },
        { key: 'exosHard', label: 'Exos durs / typiques à revoir', icon: 'flame' },
        { key: 'methods', label: 'Méthodes et formules', icon: 'sparkles' }
      ]
    },
    physique: {
      name: 'Physique - Chimie',
      btnClass: 'bg-orangePop-500 hover:bg-orangePop-600 shadow-orangePop-500/25 text-white',
      dotClass: 'bg-orangePop-500',
      iconClass: 'text-orangePop-500',
      categories: [
        { key: 'exosTodo', label: 'Exos à faire', icon: 'list-todo' },
        { key: 'methods', label: 'Méthodes et formules', icon: 'sparkles' }
      ]
    },
    info: {
      name: 'Informatique',
      btnClass: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/25 text-white',
      dotClass: 'bg-purple-600',
      iconClass: 'text-purple-600',
      categories: [
        { key: 'exosTodo', label: 'Exos à faire', icon: 'list-todo' },
        { key: 'methods', label: 'Méthodes et formules', icon: 'sparkles' }
      ]
    }
  };

  const SubjectsView = {
    currentSubject: 'maths',

    _getOpenAccordions() {
      try {
        const stored = sessionStorage.getItem(ACCORDION_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch (e) { return {}; }
    },

    _saveAccordionState(id, isOpen) {
      try {
        const state = this._getOpenAccordions();
        state[id] = isOpen;
        sessionStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}
    },

    render(container) {
      const theme = SUBJECT_THEMES[this.currentSubject] || SUBJECT_THEMES.maths;
      const chapters = store.getSubjectData(this.currentSubject);
      const accordionState = this._getOpenAccordions();

      container.innerHTML = `
        <div class="space-y-6">
          <div class="bg-white dark:bg-ink-darkcard p-4 sm:p-5 rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <!-- Left Side: Onglets Matières -->
            <div class="flex items-center gap-2 bg-creme-200/90 dark:bg-ink-darkbg p-1.5 rounded-2xl border border-creme-300 dark:border-ink-border">
              <button data-subj="maths" class="subj-tab-btn px-5 py-2.5 rounded-xl text-xs font-black transition-all ${this.currentSubject === 'maths' ? 'bg-solaire-500 text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-ink'}">Maths</button>
              <button data-subj="physique" class="subj-tab-btn px-5 py-2.5 rounded-xl text-xs font-black transition-all ${this.currentSubject === 'physique' ? 'bg-orangePop-500 text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-ink'}">Physique</button>
              <button data-subj="info" class="subj-tab-btn px-5 py-2.5 rounded-xl text-xs font-black transition-all ${this.currentSubject === 'info' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-ink'}">Informatique</button>
            </div>

            <!-- Bouton + Ajouter une sous-matière assorti à la couleur de la matière active -->
            <button id="add-chapter-btn" class="px-4 py-2.5 rounded-2xl text-xs font-black ${theme.btnClass} transition-all flex items-center gap-1.5 shadow-md sm:ml-auto">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Ajouter une sous-matière</span>
            </button>
          </div>

          <div class="space-y-4" id="chapters-accordion-list">
            ${chapters.length === 0 ? `
              <div class="p-12 text-center bg-white dark:bg-ink-darkcard rounded-3xl border border-creme-300 dark:border-ink-border">
                <p class="text-xs text-zinc-400 font-bold">Aucune sous-matière pour le moment.<br><span class="text-[11px] text-zinc-500">Cliquez sur "+ Ajouter une sous-matière" pour créer votre premier chapitre.</span></p>
              </div>
            ` : chapters.map(ch => {
              const isOpen = accordionState[ch.id] === true;
              return `
                <div class="bg-white dark:bg-ink-darkcard rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm overflow-hidden" data-chapter-box="${ch.id}">
                  <div class="accordion-header px-6 py-4 flex items-center justify-between bg-creme-100/50 hover:bg-creme-200/50 dark:bg-ink-darkbg/50 dark:hover:bg-zinc-800/40 transition-colors" data-toggle-ch="${ch.id}">
                    <div class="flex items-center gap-3">
                      <!-- Point assorti à la couleur de la matière active -->
                      <span class="w-2.5 h-2.5 rounded-full ${theme.dotClass}"></span>
                      <h3 class="text-sm font-extrabold text-ink dark:text-white">${ch.title}</h3>
                    </div>
                    <div class="flex items-center gap-3">
                      <button data-delete-ch="${ch.id}" title="Supprimer" class="text-zinc-400 hover:text-rose-500 p-1 rounded-lg">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                      <div class="p-1.5 rounded-xl bg-creme-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transform transition-transform ${isOpen ? 'rotate-180' : ''}" id="acc-chevron-${ch.id}">
                        <i data-lucide="chevron-down" class="w-4 h-4"></i>
                      </div>
                    </div>
                  </div>

                  <div class="accordion-content ${isOpen ? 'open' : ''} border-t border-creme-200 dark:border-ink-border p-6 space-y-5" id="acc-content-${ch.id}">
                    <div class="grid grid-cols-1 ${theme.categories.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4">
                      ${theme.categories.map(cat => `
                        <div class="flex flex-col space-y-2 bg-creme-100/80 dark:bg-ink-darkbg/80 p-4 rounded-2xl border border-creme-300/80 dark:border-zinc-800">
                          <label class="text-xs font-black text-ink dark:text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
                            <i data-lucide="${cat.icon}" class="w-3.5 h-3.5 ${theme.iconClass}"></i>
                            <span>${cat.label}</span>
                          </label>
                          <textarea data-ch-id="${ch.id}" data-cat="${cat.key}" placeholder="Notes, exercices ou méthodes..." rows="8" class="chapter-textarea flex-1 w-full text-xs font-sans p-3.5 rounded-xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-solaire-500 leading-relaxed resize-y font-medium">${ch[cat.key] || ''}</textarea>
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
    },

    _bindEvents(container) {
      container.querySelectorAll('.subj-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.currentSubject = btn.dataset.subj;
          this.render(container);
        });
      });

      const addBtn = container.querySelector('#add-chapter-btn');
      if (addBtn) addBtn.addEventListener('click', () => this._openAddChapterModal(container));

      container.querySelectorAll('[data-toggle-ch]').forEach(header => {
        header.addEventListener('click', (e) => {
          if (e.target.closest('[data-delete-ch]')) return;
          const chId = header.dataset.toggleCh;
          const content = container.querySelector(`#acc-content-${chId}`);
          const chevron = container.querySelector(`#acc-chevron-${chId}`);
          if (content) {
            const isOpen = content.classList.contains('open');
            content.classList.toggle('open', !isOpen);
            if (chevron) chevron.classList.toggle('rotate-180', !isOpen);
            this._saveAccordionState(chId, !isOpen);
          }
        });
      });

      container.querySelectorAll('[data-delete-ch]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const chId = btn.dataset.deleteCh;
          if (confirm('Supprimer cette sous-matière ?')) {
            store.deleteSubjectChapter(this.currentSubject, chId);
            Toast.info('Sous-matière supprimée');
            this.render(container);
          }
        });
      });

      container.querySelectorAll('.chapter-textarea').forEach(textarea => {
        const chId = textarea.dataset.chId;
        const cat = textarea.dataset.cat;
        textarea.addEventListener('blur', () => {
          store.updateSubjectChapter(this.currentSubject, chId, { [cat]: textarea.value });
        });
      });
    },

    _openAddChapterModal(container) {
      const theme = SUBJECT_THEMES[this.currentSubject] || SUBJECT_THEMES.maths;
      const content = `
        <form id="add-ch-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Nom de la sous-matière *</label>
            <input type="text" id="ch-title-input" required placeholder="Ex: Réduction des endomorphismes" class="w-full text-xs px-3 py-2.5 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-bold">
          </div>
        </form>
      `;

      Modal.open({
        title: `Ajouter une sous-matière (${theme.name})`,
        content,
        footer: `
          <button id="cancel-ch-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="save-ch-btn" class="px-5 py-2.5 ${theme.btnClass} rounded-2xl text-xs font-black shadow-sm">Ajouter</button>
        `,
        onOpen: (modalEl) => {
          modalEl.querySelector('#cancel-ch-btn').addEventListener('click', () => Modal.close());
          modalEl.querySelector('#save-ch-btn').addEventListener('click', () => {
            const title = modalEl.querySelector('#ch-title-input').value.trim();
            if (!title) return;
            const newChapter = { id: `${this.currentSubject}_ch_${Date.now()}`, title, exosTodo: '', exosHard: '', methods: '' };
            store.addSubjectChapter(this.currentSubject, newChapter);
            this._saveAccordionState(newChapter.id, true);
            Toast.success('Sous-matière ajoutée !');
            Modal.close();
            this.render(container);
          });
        }
      });
    }
  };

  // ==========================================================================
  // 10. VUE TO-DO LIST LONG TERME
  // ==========================================================================
  const LongtermView = {
    render(container) {
      const categories = store.getLongtermCategories();
      const todos = store.getLongtermTodos();
      const totalCount = todos.length;
      const doneCount = todos.filter(t => t.status === 'done').length;
      const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

      container.innerHTML = `
        <div class="space-y-6">
          <div class="bg-white dark:bg-ink-darkcard p-5 sm:p-6 rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <!-- Encadré d'avancement à gauche -->
            <div class="bg-creme-100 dark:bg-ink-darkbg px-5 py-3 rounded-2xl border border-creme-300 dark:border-zinc-800 flex items-center gap-4 shadow-xs">
              <div class="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs bg-solaire-500 text-white shadow-sm flex-shrink-0">
                ${progressPercent}%
              </div>
              <div>
                <div class="text-xs font-black text-ink dark:text-white">${doneCount} / ${totalCount} validé(s)</div>
                <div class="text-[11px] text-zinc-500 font-bold">${progressPercent}% de progression</div>
              </div>
            </div>

            <!-- Boutons à droite -->
            <div class="flex items-center gap-3 flex-wrap">
              <button id="add-cat-btn" class="px-4 py-2.5 rounded-2xl text-xs font-black bg-creme-200 hover:bg-creme-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-ink dark:text-white border border-creme-300 dark:border-zinc-700 transition-colors flex items-center gap-1.5 shadow-xs">
                <i data-lucide="folder-plus" class="w-4 h-4 text-solaire-500"></i>
                <span>Nouvelle Catégorie</span>
              </button>

              <button id="add-longterm-btn" class="px-4 py-2.5 rounded-2xl text-xs font-black bg-solaire-500 hover:bg-solaire-600 text-white transition-all flex items-center gap-2 shadow-md shadow-solaire-500/25">
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span>Ajouter une tâche</span>
              </button>
            </div>
          </div>

          <div class="space-y-6" id="categories-grouped-container">
            ${categories.length === 0 ? `
              <div class="p-12 text-center bg-white dark:bg-ink-darkcard rounded-3xl border border-creme-300 dark:border-ink-border">
                <p class="text-xs text-zinc-400 font-bold">Aucune catégorie. Créez-en une pour organiser vos tâches.</p>
              </div>
            ` : categories.map(cat => {
              const catTodos = todos.filter(t => t.categoryId === cat.id);
              const catDone = catTodos.filter(t => t.status === 'done').length;
              return `
                <div class="bg-white dark:bg-ink-darkcard rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm p-6 space-y-4">
                  <div class="flex items-center justify-between border-b border-creme-200 dark:border-ink-border pb-3">
                    <div class="flex items-center gap-2.5">
                      <span class="w-3 h-3 rounded-full bg-solaire-500"></span>
                      <h3 class="text-base font-black text-ink dark:text-white">${cat.name}</h3>
                      <span class="text-xs px-2.5 py-0.5 rounded-full font-black bg-creme-200 dark:bg-zinc-800 text-ink dark:text-zinc-300">
                        ${catDone}/${catTodos.length} terminée(s)
                      </span>
                    </div>

                    <div class="flex items-center gap-2">
                      <button data-add-to-cat="${cat.id}" class="text-xs font-black text-solaire-600 dark:text-solaire-400 hover:underline flex items-center gap-1">
                        <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                        <span>Ajouter</span>
                      </button>
                      <button data-delete-cat="${cat.id}" title="Supprimer la catégorie" class="text-zinc-400 hover:text-rose-500 p-1 rounded-lg">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${catTodos.length === 0 ? `
                      <p class="text-xs text-zinc-400 italic py-2">Aucune tâche dans cette catégorie.</p>
                    ` : catTodos.map(todo => {
                      const daysRemaining = this._computeDaysRemaining(todo.deadline);
                      return `
                        <div class="p-4 rounded-2xl bg-creme-100/80 dark:bg-ink-darkbg/80 border border-creme-300/80 dark:border-zinc-800 flex flex-col justify-between space-y-3">
                          <div>
                            <div class="flex items-start justify-between gap-2 mb-1.5">
                              <span class="text-[10px] font-black px-2.5 py-0.5 rounded-full ${todo.priority === 'urgent' ? 'bg-rose-500 text-white' : 'bg-creme-200 text-ink dark:bg-zinc-800 dark:text-zinc-300'}">${todo.priority === 'urgent' ? '🔥 Urgent' : 'Normal'}</span>
                              <button data-delete-lt="${todo.id}" class="text-zinc-400 hover:text-rose-500 p-0.5"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                            </div>
                            <h4 class="text-sm font-black text-ink dark:text-white ${todo.status === 'done' ? 'line-through text-zinc-400' : ''}">${todo.title}</h4>
                            ${todo.notes ? `<p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed font-medium">${todo.notes}</p>` : ''}
                          </div>

                          <div class="pt-2 border-t border-creme-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                            <div class="flex items-center gap-1.5 text-zinc-500 font-bold">
                              <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                              <span>${todo.deadline || 'Sans date'}</span>
                              ${daysRemaining !== null ? `<span class="font-black text-[10px] px-2 py-0.5 rounded-lg ${daysRemaining < 0 ? 'bg-rose-500 text-white' : 'bg-creme-300 text-ink dark:bg-zinc-700 dark:text-white'}">${daysRemaining < 0 ? 'Dépassé' : `J-${daysRemaining}`}</span>` : ''}
                            </div>
                            <select data-status-lt="${todo.id}" class="text-xs font-black px-2.5 py-1 rounded-xl border bg-white dark:bg-ink-darkcard border-creme-300 dark:border-zinc-700">
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
      return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    },

    _bindEvents(container) {
      const addBtn = container.querySelector('#add-longterm-btn');
      if (addBtn) addBtn.addEventListener('click', () => this._openAddGoalModal(null, container));

      const addCatBtn = container.querySelector('#add-cat-btn');
      if (addCatBtn) addCatBtn.addEventListener('click', () => this._openAddCatModal(container));

      container.querySelectorAll('[data-add-to-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          this._openAddGoalModal(btn.dataset.addToCat, container);
        });
      });

      container.querySelectorAll('[data-delete-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('Supprimer cette catégorie et toutes ses tâches ?')) {
            store.deleteLongtermCategory(btn.dataset.deleteCat);
            Toast.info('Catégorie supprimée');
            this.render(container);
          }
        });
      });

      container.querySelectorAll('[data-status-lt]').forEach(select => {
        select.addEventListener('change', () => {
          store.updateLongtermTodo(select.dataset.statusLt, { status: select.value });
          this.render(container);
        });
      });

      container.querySelectorAll('[data-delete-lt]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('Supprimer cette tâche ?')) {
            store.deleteLongtermTodo(btn.dataset.deleteLt);
            Toast.info('Tâche supprimée');
            this.render(container);
          }
        });
      });
    },

    _openAddCatModal(container) {
      const content = `
        <form id="add-cat-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Nom de la catégorie *</label>
            <input type="text" id="cat-name-input" required placeholder="Ex: Projets / Inscriptions / Révisions" class="w-full text-xs px-3 py-2.5 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-bold">
          </div>
        </form>
      `;

      Modal.open({
        title: 'Créer une catégorie',
        content,
        footer: `
          <button id="cancel-cat-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="save-cat-btn" class="px-5 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-sm">Créer</button>
        `,
        onOpen: (modalEl) => {
          modalEl.querySelector('#cancel-cat-btn').addEventListener('click', () => Modal.close());
          modalEl.querySelector('#save-cat-btn').addEventListener('click', () => {
            const name = modalEl.querySelector('#cat-name-input').value.trim();
            if (!name) return;
            store.addLongtermCategory(name, 'coral');
            Toast.success('Catégorie créée !');
            Modal.close();
            this.render(container);
          });
        }
      });
    },

    _openAddGoalModal(preselectedCatId, container) {
      const categories = store.getLongtermCategories();
      if (!categories.length) {
        Toast.warning('Veuillez créer une catégorie d\'abord.');
        this._openAddCatModal(container);
        return;
      }

      const content = `
        <form id="add-goal-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Titre de la tâche *</label>
            <input type="text" id="goal-title" required placeholder="Ex: Rédiger le rapport PIX" class="w-full text-xs px-3 py-2.5 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-bold">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Catégorie *</label>
              <select id="goal-category" class="w-full text-xs px-3 py-2.5 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-bold">
                ${categories.map(c => `<option value="${c.id}" ${preselectedCatId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Priorité</label>
              <select id="goal-priority" class="w-full text-xs px-3 py-2.5 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-bold">
                <option value="normal">Normal</option>
                <option value="urgent">🔥 Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Date limite</label>
            <input type="date" id="goal-deadline" value="${new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}" class="w-full text-xs px-3 py-2 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-mono">
          </div>
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Notes</label>
            <textarea id="goal-notes" rows="3" placeholder="Détails..." class="w-full text-xs px-3 py-2.5 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-medium"></textarea>
          </div>
        </form>
      `;

      Modal.open({
        title: 'Ajouter une tâche',
        content,
        footer: `
          <button id="cancel-goal-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="save-goal-btn" class="px-5 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-md shadow-solaire-500/25">Enregistrer</button>
        `,
        onOpen: (modalEl) => {
          modalEl.querySelector('#cancel-goal-btn').addEventListener('click', () => Modal.close());
          modalEl.querySelector('#save-goal-btn').addEventListener('click', () => {
            const title = modalEl.querySelector('#goal-title').value.trim();
            const categoryId = modalEl.querySelector('#goal-category').value;
            if (!title) return;
            store.addLongtermTodo({
              title,
              categoryId,
              priority: modalEl.querySelector('#goal-priority').value,
              deadline: modalEl.querySelector('#goal-deadline').value,
              notes: modalEl.querySelector('#goal-notes').value.trim(),
              status: 'todo'
            });
            Toast.success('Tâche ajoutée !');
            Modal.close();
            this.render(container);
          });
        }
      });
    }
  };

  // ==========================================================================
  // 11. VUE FLASHCARDS
  // ==========================================================================
  const FlashcardsView = {
    activeSession: null,

    render(container) {
      if (this.activeSession) {
        this._renderRevisionMode(container);
        return;
      }

      const decks = store.getFlashcardDecks();
      const totalCardsCount = decks.reduce((acc, d) => acc + (d.cards ? d.cards.length : 0), 0);

      container.innerHTML = `
        <div class="space-y-6">
          <div class="bg-white dark:bg-ink-darkcard p-5 sm:p-6 rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 class="font-extrabold text-xl text-ink dark:text-white">
                Flashcards
              </h2>
              <p class="text-xs text-zinc-500 font-bold mt-0.5">${totalCardsCount} carte${totalCardsCount > 1 ? 's' : ''} au total</p>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <button id="import-deck-file-btn" class="px-3.5 py-2.5 rounded-2xl text-xs font-black bg-creme-200 hover:bg-creme-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-ink dark:text-white border border-creme-300 dark:border-zinc-700 transition-colors flex items-center gap-1.5 shadow-xs">
                <i data-lucide="file-up" class="w-4 h-4 text-solaire-500"></i>
                <span>Importer un fichier (:::)</span>
              </button>
              <button id="create-deck-btn" class="px-4 py-2.5 rounded-2xl text-xs font-black bg-solaire-500 hover:bg-solaire-600 text-white transition-all flex items-center gap-1.5 shadow-md shadow-solaire-500/25">
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span>Nouveau paquet</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="decks-grid">
            ${decks.length === 0 ? `
              <div class="col-span-full p-12 text-center bg-white dark:bg-ink-darkcard rounded-3xl border border-creme-300 dark:border-ink-border">
                <p class="text-xs text-zinc-400 font-bold">Aucun paquet de flashcards.<br><span class="text-[11px] text-zinc-500">Créez votre premier paquet ou importez vos questions pour commencer à réviser.</span></p>
              </div>
            ` : decks.map(deck => {
              const cardCount = deck.cards ? deck.cards.length : 0;
              return `
                <div class="bg-white dark:bg-ink-darkcard rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm p-6 flex flex-col justify-between space-y-5">
                  <div>
                    <div class="flex items-center justify-between gap-2 mb-2.5">
                      <span class="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-solaire-50 text-solaire-700 dark:bg-solaire-950 dark:text-solaire-300 border border-solaire-200 dark:border-solaire-900">${deck.subject || 'Maths'}</span>
                      <div class="flex items-center gap-1">
                        <button data-add-card="${deck.id}" title="Ajouter une carte" class="text-zinc-400 hover:text-solaire-600 p-1 rounded-lg"><i data-lucide="plus-circle" class="w-4 h-4"></i></button>
                        <button data-delete-deck="${deck.id}" title="Supprimer" class="text-zinc-400 hover:text-rose-500 p-1 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                      </div>
                    </div>
                    <h3 class="text-base font-black text-ink dark:text-white">${deck.deckName}</h3>
                    <p class="text-xs text-zinc-500 font-bold mt-1">${cardCount} carte${cardCount > 1 ? 's' : ''} de révision</p>
                  </div>

                  <div class="pt-4 border-t border-creme-200 dark:border-ink-border flex items-center justify-between gap-2">
                    <button data-view-deck="${deck.id}" class="text-xs font-black text-zinc-600 dark:text-zinc-400 hover:underline">Gérer cartes</button>
                    <button data-start-quiz="${deck.id}" ${cardCount === 0 ? 'disabled' : ''} class="px-4 py-2 bg-solaire-500 hover:bg-solaire-600 disabled:opacity-40 disabled:pointer-events-none text-white rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-solaire-500/25">
                      <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
                      <span>Réviser</span>
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

    _bindEvents(container) {
      const createBtn = container.querySelector('#create-deck-btn');
      if (createBtn) createBtn.addEventListener('click', () => this._openCreateDeckModal(container));

      const importFileBtn = container.querySelector('#import-deck-file-btn');
      if (importFileBtn) importFileBtn.addEventListener('click', () => this._openBatchImportModal(container));

      container.querySelectorAll('[data-add-card]').forEach(btn => {
        btn.addEventListener('click', () => this._openAddCardModal(btn.dataset.addCard, container));
      });

      container.querySelectorAll('[data-delete-deck]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('Supprimer ce paquet ?')) {
            store.deleteFlashcardDeck(btn.dataset.deleteDeck);
            Toast.info('Paquet supprimé');
            this.render(container);
          }
        });
      });

      container.querySelectorAll('[data-view-deck]').forEach(btn => {
        btn.addEventListener('click', () => this._openDeckCardsModal(btn.dataset.viewDeck, container));
      });

      container.querySelectorAll('[data-start-quiz]').forEach(btn => {
        btn.addEventListener('click', () => {
          const deck = store.getFlashcardDecks().find(d => d.id === btn.dataset.startQuiz);
          if (deck && deck.cards && deck.cards.length > 0) {
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

    _renderRevisionMode(container) {
      const session = this.activeSession;
      const isFinished = session.currentIndex >= session.cards.length;

      if (isFinished) {
        const knownCount = session.known.length;
        const unknownCount = session.unknown.length;

        container.innerHTML = `
          <div class="max-w-xl mx-auto space-y-6 animate-fade-in py-8">
            <div class="bg-white dark:bg-ink-darkcard p-8 rounded-3xl border border-creme-300 dark:border-ink-border shadow-xl text-center space-y-6">
              <div class="w-16 h-16 rounded-3xl mx-auto bg-gradient-to-tr from-solaire-500 to-orangePop-500 flex items-center justify-center text-white shadow-lg shadow-solaire-500/30">
                <i data-lucide="trophy" class="w-8 h-8"></i>
              </div>
              <h2 class="text-2xl font-black text-ink dark:text-white">Session terminée !</h2>

              <div class="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-900">
                  <div class="text-3xl font-black text-emerald-600 dark:text-emerald-400">${knownCount}</div>
                  <div class="text-xs font-black text-emerald-800 dark:text-emerald-300">Maîtrisées ✓</div>
                </div>
                <div class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900">
                  <div class="text-3xl font-black text-rose-600 dark:text-rose-400">${unknownCount}</div>
                  <div class="text-xs font-black text-rose-800 dark:text-rose-300">À revoir ✗</div>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-creme-200 dark:border-ink-border">
                ${unknownCount > 0 ? `
                  <button id="retry-failed-cards-btn" class="w-full sm:w-auto px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2">
                    <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                    <span>Revoir les ${unknownCount} ratées</span>
                  </button>
                ` : ''}
                <button id="restart-deck-btn" class="w-full sm:w-auto px-5 py-3 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black transition-all">Recommencer</button>
                <button id="quit-quiz-btn" class="w-full sm:w-auto px-5 py-3 bg-creme-200 dark:bg-zinc-800 text-ink dark:text-white rounded-2xl text-xs font-black">Quitter</button>
              </div>
            </div>
          </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        const retryBtn = container.querySelector('#retry-failed-cards-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            this.activeSession = { ...session, cards: [...session.unknown], currentIndex: 0, known: [], unknown: [], isFlipped: false };
            this.render(container);
          });
        }
        container.querySelector('#restart-deck-btn').addEventListener('click', () => {
          const deck = store.getFlashcardDecks().find(d => d.id === session.deckId);
          this.activeSession = { ...session, cards: deck ? [...deck.cards] : [...session.cards], currentIndex: 0, known: [], unknown: [], isFlipped: false };
          this.render(container);
        });
        container.querySelector('#quit-quiz-btn').addEventListener('click', () => {
          this.activeSession = null;
          this.render(container);
        });
        return;
      }

      const card = session.cards[session.currentIndex];
      const progress = Math.round(((session.currentIndex) / session.cards.length) * 100);

      container.innerHTML = `
        <div class="max-w-2xl mx-auto space-y-5 animate-fade-in">
          <div class="flex items-center justify-between">
            <button id="exit-quiz-btn" class="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-creme-200 hover:bg-creme-300 dark:bg-zinc-800 text-xs font-black text-ink dark:text-white">
              <i data-lucide="arrow-left" class="w-4 h-4"></i>
              <span>Retour</span>
            </button>
            <div class="text-xs font-black text-zinc-600 dark:text-zinc-400">Carte ${session.currentIndex + 1} / ${session.cards.length}</div>
            <div class="flex items-center gap-1.5 font-mono">
              <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">${session.known.length} ✓</span>
              <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">${session.unknown.length} ✗</span>
            </div>
          </div>

          <div class="w-full h-2.5 bg-creme-300 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div class="h-full bg-solaire-500 transition-all duration-300" style="width: ${progress}%"></div>
          </div>

          <div class="flashcard-scene">
            <div class="flashcard-card ${session.isFlipped ? 'flipped' : ''}" id="flashcard-card-el">
              <div class="flashcard-face bg-white dark:bg-ink-darkcard border-2 border-creme-300 dark:border-ink-border shadow-xl">
                <div class="flex items-center justify-between text-xs text-zinc-400 font-black uppercase tracking-wider">
                  <span>QUESTION</span>
                  <span class="text-[10px] font-mono">[Espace] pour retourner</span>
                </div>
                <div class="my-auto py-6 text-center text-base sm:text-lg font-bold text-ink dark:text-white select-none" id="card-front-text"></div>
                <div class="text-center text-xs text-solaire-600 dark:text-solaire-400 font-black">Afficher la réponse ↺</div>
              </div>

              <div class="flashcard-face flashcard-face-back bg-solaire-50/90 dark:bg-ink-darkbg border-2 border-solaire-300 dark:border-solaire-800 shadow-xl">
                <div class="flex items-center justify-between text-xs text-solaire-600 dark:text-solaire-400 font-black uppercase tracking-wider">
                  <span>RÉPONSE & FORMULE</span>
                  <span class="text-[10px] font-mono">Retourner ↺</span>
                </div>
                <div class="my-auto py-6 text-center text-base sm:text-lg font-bold text-ink dark:text-white select-none" id="card-back-text"></div>
                <div class="text-center text-xs text-zinc-400 font-bold">Évaluez ci-dessous</div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 pt-2">
            <button id="btn-dont-know" class="py-4 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-2 border-rose-200 dark:border-rose-800 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2">
              <i data-lucide="x" class="w-5 h-5"></i>
              <span>À revoir [←]</span>
            </button>
            <button id="btn-know" class="py-4 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2">
              <i data-lucide="check" class="w-5 h-5"></i>
              <span>Maîtrisé [→]</span>
            </button>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();

      const frontEl = container.querySelector('#card-front-text');
      const backEl = container.querySelector('#card-back-text');
      this._renderMath(frontEl, card.front);
      this._renderMath(backEl, card.back);

      const cardEl = container.querySelector('#flashcard-card-el');
      cardEl.addEventListener('click', () => {
        session.isFlipped = !session.isFlipped;
        cardEl.classList.toggle('flipped', session.isFlipped);
      });

      container.querySelector('#btn-dont-know').addEventListener('click', () => {
        session.unknown.push(card);
        session.currentIndex++;
        session.isFlipped = false;
        this.render(container);
      });

      container.querySelector('#btn-know').addEventListener('click', () => {
        session.known.push(card);
        session.currentIndex++;
        session.isFlipped = false;
        this.render(container);
      });

      container.querySelector('#exit-quiz-btn').addEventListener('click', () => {
        this.activeSession = null;
        this.render(container);
      });
    },

    _renderMath(el, text) {
      if (!el) return;
      el.innerHTML = (text || '').replace(/\n/g, '<br/>');
      if (window.renderMathInElement) {
        window.renderMathInElement(el, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      }
    },

    _openBatchImportModal(container) {
      const content = `
        <div class="space-y-4">
          <div class="p-4 bg-creme-100 dark:bg-ink-darkbg rounded-2xl border border-creme-300 dark:border-zinc-800 text-xs">
            <p class="font-black text-ink dark:text-white mb-1">Formats acceptés :</p>
            <ul class="list-disc list-inside space-y-1 text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
              <li><code>Question ::: Réponse</code> (une par ligne)</li>
              <li>Support LaTeX : <code>$x^2$</code> ou <code>$$\\int...$$</code></li>
            </ul>
          </div>

          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Nom du paquet *</label>
            <input type="text" id="import-deck-name" placeholder="Ex: Formules Algèbre" class="w-full text-xs px-3 py-2.5 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-bold">
          </div>

          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Fichier (.txt, .md)</label>
            <input type="file" id="import-file-input" accept=".txt,.md" class="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-solaire-100 file:text-solaire-700">
          </div>

          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Ou collez votre texte :</label>
            <textarea id="import-raw-text" rows="5" placeholder="Définition matrice nilpotente ? ::: $\\exists p \\in \\mathbb{N}, A^p = 0$" class="w-full text-xs font-mono p-3 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700"></textarea>
          </div>
        </div>
      `;

      Modal.open({
        title: 'Importer des flashcards',
        content,
        maxWidth: 'max-w-xl',
        footer: `
          <button id="cancel-batch-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="confirm-batch-import-btn" class="px-5 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-sm">Importer</button>
        `,
        onOpen: (modalEl) => {
          const rawTextEl = modalEl.querySelector('#import-raw-text');
          const fileInput = modalEl.querySelector('#import-file-input');
          const deckNameInput = modalEl.querySelector('#import-deck-name');

          fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!deckNameInput.value) deckNameInput.value = file.name.replace(/\.[^/.]+$/, '');
            const reader = new FileReader();
            reader.onload = (ev) => { rawTextEl.value = ev.target.result; };
            reader.readAsText(file);
          });

          modalEl.querySelector('#cancel-batch-btn').addEventListener('click', () => Modal.close());
          modalEl.querySelector('#confirm-batch-import-btn').addEventListener('click', () => {
            const deckName = deckNameInput.value.trim() || 'Lot de flashcards';
            const cards = this._parseCards(rawTextEl.value);

            if (!cards.length) { Toast.warning('Aucune carte détectée.'); return; }
            store.addFlashcardDeck({ subject: 'Maths', deckName, cards });
            Toast.success(`${cards.length} flashcards importées !`);
            Modal.close();
            this.render(container);
          });
        }
      });
    },

    _parseCards(text) {
      if (!text || !text.trim()) return [];
      const cards = [];
      const lines = text.split('\n');

      for (const line of lines) {
        const tr = line.trim();
        if (!tr || tr.startsWith('#')) continue;
        let sep = ':::';
        if (!tr.includes(':::') && tr.includes('\t')) sep = '\t';

        const parts = tr.split(sep);
        if (parts.length >= 2) {
          cards.push({
            id: 'c_' + Math.random().toString(36).substring(2, 9),
            front: parts[0].trim(),
            back: parts.slice(1).join(sep).trim(),
            status: 'learning'
          });
        }
      }
      return cards;
    },

    _openCreateDeckModal(container) {
      const content = `
        <form id="create-deck-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Nom du paquet *</label>
            <input type="text" id="new-deck-name" required placeholder="Ex: Formules Réduction" class="w-full text-xs px-3 py-2.5 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-bold">
          </div>
        </form>
      `;

      Modal.open({
        title: 'Nouveau paquet de flashcards',
        content,
        footer: `
          <button id="cancel-nd-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="save-nd-btn" class="px-5 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-sm">Créer</button>
        `,
        onOpen: (modalEl) => {
          modalEl.querySelector('#cancel-nd-btn').addEventListener('click', () => Modal.close());
          modalEl.querySelector('#save-nd-btn').addEventListener('click', () => {
            const deckName = modalEl.querySelector('#new-deck-name').value.trim();
            if (!deckName) return;
            store.addFlashcardDeck({ subject: 'Maths', deckName, cards: [] });
            Toast.success('Paquet créé !');
            Modal.close();
            this.render(container);
          });
        }
      });
    },

    _openAddCardModal(deckId, container) {
      const content = `
        <form id="add-card-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Recto (Question / Formule) *</label>
            <textarea id="card-front-input" rows="3" required placeholder="Ex: Définition valeur propre $\\lambda$ ?" class="w-full text-xs font-mono p-3 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700"></textarea>
          </div>
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Verso (Réponse / Démonstration) *</label>
            <textarea id="card-back-input" rows="4" required placeholder="Ex: $u(x) = \\lambda x$ avec $x \\neq 0$" class="w-full text-xs font-mono p-3 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700"></textarea>
          </div>
        </form>
      `;

      Modal.open({
        title: 'Ajouter une carte',
        content,
        footer: `
          <button id="cancel-card-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="save-card-btn" class="px-5 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-sm">Ajouter</button>
        `,
        onOpen: (modalEl) => {
          modalEl.querySelector('#cancel-card-btn').addEventListener('click', () => Modal.close());
          modalEl.querySelector('#save-card-btn').addEventListener('click', () => {
            const front = modalEl.querySelector('#card-front-input').value.trim();
            const back = modalEl.querySelector('#card-back-input').value.trim();
            if (!front || !back) return;
            store.addCardsToDeck(deckId, [{ front, back }]);
            Toast.success('Carte ajoutée !');
            Modal.close();
            this.render(container);
          });
        }
      });
    },

    _openDeckCardsModal(deckId, container) {
      const deck = store.getFlashcardDecks().find(d => d.id === deckId);
      if (!deck) return;
      const cards = deck.cards || [];

      const content = `
        <div class="space-y-4">
          <div class="space-y-2.5 max-h-96 overflow-y-auto">
            ${cards.map((c, idx) => `
              <div class="p-3.5 rounded-2xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 text-xs space-y-1">
                <div class="flex items-start justify-between gap-2">
                  <span class="font-black">#${idx + 1} Recto :</span>
                  <button data-del-card="${c.id}" class="text-zinc-400 hover:text-rose-500"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </div>
                <div class="text-ink dark:text-zinc-200 font-mono text-[11px]">${c.front}</div>
                <div class="font-black text-solaire-600 dark:text-solaire-400 mt-1">Verso :</div>
                <div class="text-ink dark:text-zinc-200 font-mono text-[11px]">${c.back}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      Modal.open({
        title: `Cartes de "${deck.deckName}"`,
        content,
        footer: `<button id="close-deck-m-btn" class="px-5 py-2 bg-ink dark:bg-white text-white dark:text-ink rounded-2xl text-xs font-black">Fermer</button>`,
        onOpen: (modalEl) => {
          modalEl.querySelector('#close-deck-m-btn').addEventListener('click', () => Modal.close());
          modalEl.querySelectorAll('[data-del-card]').forEach(btn => {
            btn.addEventListener('click', () => {
              deck.cards = deck.cards.filter(c => c.id !== btn.dataset.delCard);
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

  // ==========================================================================
  // 12. VUE NOTES & SEMESTRE (STRUCTURE HIÉRARCHIQUE BLOC -> MATIÈRE -> ÉPREUVES)
  // ==========================================================================
  const GradesView = {
    render(container) {
      const gradesData = store.getGradesData();
      const blocks = gradesData.blocks || [];

      let totalBlockScores = 0;
      let totalBlocksEvaluated = 0;
      let allBlocksValidated = true;
      let failedBlocksCount = 0;
      const failedBlockNames = [];

      const computedBlocks = blocks.map(block => {
        let blockWeightedSum = 0;
        let blockSubjectCoefSum = 0;

        const computedSubjects = (block.subjects || []).map(subject => {
          let evalSum = 0;
          let evalCoefSum = 0;

          const evals = (subject.evaluations || []).map(ev => {
            const rawGrade = (ev.grade !== null && ev.grade !== undefined && !isNaN(ev.grade)) ? Number(ev.grade) : null;
            const bonus = Number(ev.bonus || 0);
            const effectiveGrade = rawGrade !== null ? Math.min(20, rawGrade + bonus) : null;

            if (effectiveGrade !== null) {
              evalSum += effectiveGrade * (ev.coef || 1);
              evalCoefSum += (ev.coef || 1);
            }
            return { ...ev, rawGrade, bonus, effectiveGrade };
          });

          const subjectAverage = evalCoefSum > 0 ? (evalSum / evalCoefSum) : null;

          if (subjectAverage !== null) {
            blockWeightedSum += subjectAverage * (subject.coef || 1);
            blockSubjectCoefSum += (subject.coef || 1);
          }

          return {
            ...subject,
            evaluations: evals,
            subjectAverage
          };
        });

        const blockAverage = blockSubjectCoefSum > 0 ? (blockWeightedSum / blockSubjectCoefSum) : null;
        const isValidated = blockAverage !== null && blockAverage >= 10.0;

        if (blockAverage !== null) {
          totalBlockScores += blockAverage;
          totalBlocksEvaluated++;
          if (!isValidated) {
            allBlocksValidated = false;
            failedBlocksCount++;
            failedBlockNames.push(block.name);
          }
        } else {
          allBlocksValidated = false;
        }

        return {
          ...block,
          subjects: computedSubjects,
          blockAverage,
          isValidated
        };
      });

      const semesterAverage = totalBlocksEvaluated > 0 ? (totalBlockScores / totalBlocksEvaluated) : null;

      container.innerHTML = `
        <div class="space-y-6">
          <div class="bg-white dark:bg-ink-darkcard p-5 sm:p-6 rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 class="font-extrabold text-xl text-ink dark:text-white">
                Notes du semestre
              </h2>
            </div>

            <!-- Validation Status Pill -->
            <div class="p-4 px-6 rounded-3xl border flex items-center gap-4 ${semesterAverage !== null && allBlocksValidated ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/20' : 'bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-500/20'}">
              <div>
                <div class="text-[10px] uppercase tracking-wider font-black opacity-80">Moyenne Générale</div>
                <div class="text-2xl font-black font-mono">${semesterAverage !== null ? semesterAverage.toFixed(2) : '--'} <span class="text-xs font-normal">/ 20</span></div>
              </div>

              <div class="h-9 w-px bg-white opacity-25"></div>

              <div>
                <div class="text-xs font-black tracking-wider">
                  ${allBlocksValidated && semesterAverage !== null ? `
                    <span>SEMESTRE VALIDÉ 🎉</span>
                  ` : `
                    <span>SEMESTRE NON VALIDÉ ❌</span>
                  `}
                </div>
                ${!allBlocksValidated && failedBlocksCount > 0 ? `
                  <div class="text-[11px] opacity-90 mt-0.5 font-bold">
                    ${failedBlocksCount} bloc(s) < 10/20 (${failedBlockNames.join(', ')})
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Les 5 Blocs Hiérarchiques -->
          <div class="space-y-8">
            ${computedBlocks.map(block => `
              <div class="bg-white dark:bg-ink-darkcard rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm overflow-hidden p-6 space-y-6">
                
                <!-- En-tête du Bloc -->
                <div class="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-creme-200 dark:border-ink-border">
                  <div class="flex items-center gap-3">
                    <span class="w-3.5 h-3.5 rounded-full ${block.isValidated ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                    <h3 class="text-base font-black text-ink dark:text-white tracking-wide">BLOC ${block.name}</h3>
                  </div>

                  <div class="text-xs font-black px-4 py-2 rounded-2xl border ${block.isValidated ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'}">
                    Moyenne du bloc : <span class="font-mono text-sm">${block.blockAverage !== null ? block.blockAverage.toFixed(2) : '--'} / 20</span> ${block.isValidated ? '✓ Validé' : '✗ Non validé (< 10)'}
                  </div>
                </div>

                <!-- Matières contenues dans ce Bloc -->
                <div class="space-y-6">
                  ${block.subjects.map(subject => `
                    <div class="rounded-2xl border border-creme-300 dark:border-zinc-800 bg-creme-100/60 dark:bg-ink-darkbg/60 overflow-hidden">
                      
                      <!-- En-tête de la Matière -->
                      <div class="px-5 py-3.5 bg-creme-200/80 dark:bg-zinc-800/80 border-b border-creme-300 dark:border-zinc-700/80 flex items-center justify-between flex-wrap gap-3">
                        <div class="flex items-center gap-3">
                          <h4 class="text-xs font-extrabold text-ink dark:text-white">${subject.name}</h4>
                          <span class="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 text-solaire-600 dark:text-solaire-400">
                            Coef. ${subject.coef}
                          </span>
                        </div>

                        <div class="flex items-center gap-3">
                          <div class="text-xs font-bold text-ink dark:text-zinc-200">
                            Moyenne matière : <span class="font-mono font-black ${subject.subjectAverage !== null && subject.subjectAverage >= 10 ? 'text-emerald-600 dark:text-emerald-400' : (subject.subjectAverage !== null ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400')}">${subject.subjectAverage !== null ? subject.subjectAverage.toFixed(2) + ' / 20' : '--'}</span>
                          </div>

                          <button data-add-eval-sub="${subject.id}" data-block-id="${block.id}" class="px-3 py-1.5 rounded-xl bg-solaire-500 hover:bg-solaire-600 text-white text-xs font-black transition-all flex items-center gap-1 shadow-xs">
                            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                            <span>Ajouter une épreuve</span>
                          </button>
                        </div>
                      </div>

                      <!-- Tableau des Épreuves passées dans cette Matière -->
                      <div class="overflow-x-auto grade-table p-2">
                        ${(!subject.evaluations || subject.evaluations.length === 0) ? `
                          <p class="text-xs text-zinc-400 italic py-4 text-center select-none">Aucune épreuve renseignée pour cette matière. Cliquez sur "+ Ajouter une épreuve".</p>
                        ` : `
                          <table class="w-full text-left text-xs">
                            <thead class="text-[10px] uppercase tracking-wider text-zinc-400 border-b border-creme-200 dark:border-zinc-800 font-black">
                              <tr>
                                <th class="py-2.5 px-4">Épreuve (DS, Examen, TP, Colle)</th>
                                <th class="py-2.5 px-4 w-28">Note (/20)</th>
                                <th class="py-2.5 px-4 w-24">Coef</th>
                                <th class="py-2.5 px-4 w-28">Bonus</th>
                                <th class="py-2.5 px-4 w-28">Note finale</th>
                                <th class="py-2.5 px-3 w-12 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-creme-200/60 dark:divide-zinc-800/60">
                              ${subject.evaluations.map(ev => `
                                <tr class="hover:bg-creme-200/40 dark:hover:bg-zinc-800/40 transition-colors">
                                  <td class="py-2.5 px-4 font-bold">
                                    <input type="text" value="${ev.name}" data-block="${block.id}" data-sub="${subject.id}" data-eval="${ev.id}" data-field="name" class="w-full bg-transparent border-0 focus:ring-1 focus:ring-solaire-500 rounded-lg px-1.5 -mx-1.5 text-xs text-ink dark:text-white font-bold">
                                  </td>
                                  <td class="py-2.5 px-4">
                                    <input type="number" step="0.25" min="0" max="20" placeholder="--" value="${ev.rawGrade !== null ? ev.rawGrade : ''}" data-block="${block.id}" data-sub="${subject.id}" data-eval="${ev.id}" data-field="grade" class="w-20 font-mono font-black text-center py-1 rounded-xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 text-ink dark:text-white">
                                  </td>
                                  <td class="py-2.5 px-4">
                                    <input type="number" step="0.5" min="0.5" max="20" value="${ev.coef || 1}" data-block="${block.id}" data-sub="${subject.id}" data-eval="${ev.id}" data-field="coef" class="w-16 font-mono font-bold text-center py-1 rounded-xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                                  </td>
                                  <td class="py-2.5 px-4">
                                    <select data-block="${block.id}" data-sub="${subject.id}" data-eval="${ev.id}" data-field="bonus" class="w-24 text-xs font-black py-1 px-2 rounded-xl bg-solaire-50 dark:bg-ink-darkcard border border-solaire-200 dark:border-zinc-700 text-solaire-700 dark:text-solaire-300">
                                      <option value="0" ${ev.bonus === 0 ? 'selected' : ''}>+0 pt</option>
                                      <option value="1" ${ev.bonus === 1 ? 'selected' : ''}>+1 pt ⭐</option>
                                      <option value="2" ${ev.bonus === 2 ? 'selected' : ''}>+2 pts ⭐⭐</option>
                                    </select>
                                  </td>
                                  <td class="py-2.5 px-4 font-mono font-black ${ev.effectiveGrade >= 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                                    ${ev.effectiveGrade !== null ? ev.effectiveGrade.toFixed(2) : '--'}
                                  </td>
                                  <td class="py-2.5 px-3 text-center">
                                    <button data-delete-eval="${ev.id}" data-sub="${subject.id}" data-block="${block.id}" class="text-zinc-400 hover:text-rose-500 p-1 rounded-lg">
                                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                  </td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                        `}
                      </div>

                    </div>
                  `).join('')}
                </div>

              </div>
            `).join('')}
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      this._bindEvents(container);
    },

    _bindEvents(container) {
      container.querySelectorAll('input[data-field], select[data-field]').forEach(input => {
        const handler = () => {
          const blockId = input.dataset.block;
          const subId = input.dataset.sub;
          const evalId = input.dataset.eval;
          const field = input.dataset.field;
          let val = input.value;
          if (field === 'grade') val = val === '' ? null : parseFloat(val);
          else if (field === 'coef' || field === 'bonus') val = parseFloat(val);

          store.updateEvaluation(blockId, subId, evalId, { [field]: val });
          this.render(container);
        };

        if (input.tagName === 'SELECT') input.addEventListener('change', handler);
        else {
          input.addEventListener('blur', handler);
          input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
        }
      });

      container.querySelectorAll('[data-add-eval-sub]').forEach(btn => {
        btn.addEventListener('click', () => {
          const blockId = btn.dataset.blockId;
          const subjectId = btn.dataset.addEvalSub;
          this._openAddEvalModal(blockId, subjectId, container);
        });
      });

      container.querySelectorAll('[data-delete-eval]').forEach(btn => {
        btn.addEventListener('click', () => {
          const blockId = btn.dataset.block;
          const subId = btn.dataset.sub;
          const evalId = btn.dataset.deleteEval;
          if (confirm('Supprimer cette épreuve ?')) {
            store.deleteEvaluation(blockId, subId, evalId);
            Toast.info('Épreuve supprimée');
            this.render(container);
          }
        });
      });
    },

    _openAddEvalModal(blockId, subjectId, container) {
      const gradesData = store.getGradesData();
      const block = (gradesData.blocks || []).find(b => b.id === blockId);
      const subject = block ? (block.subjects || []).find(s => s.id === subjectId) : null;
      const subName = subject ? subject.name : 'la matière';

      const content = `
        <form id="add-eval-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Intitulé de l'épreuve *</label>
            <input type="text" id="eval-name" required placeholder="Ex: DS 2 / Examen final / TP noté" class="w-full text-xs px-3 py-2.5 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-bold">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Note (/20)</label>
              <input type="number" step="0.25" min="0" max="20" id="eval-grade" placeholder="--" class="w-full text-xs px-3 py-2 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-mono">
            </div>
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1">Coefficient de l'épreuve *</label>
              <input type="number" step="0.5" min="0.5" max="20" id="eval-coef" required value="2" class="w-full text-xs px-3 py-2 rounded-xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-700 font-mono">
            </div>
          </div>
        </form>
      `;

      Modal.open({
        title: `Ajouter une épreuve (${subName})`,
        content,
        footer: `
          <button id="cancel-eval-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="save-eval-btn" class="px-5 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-sm">Ajouter</button>
        `,
        onOpen: (modalEl) => {
          modalEl.querySelector('#cancel-eval-btn').addEventListener('click', () => Modal.close());
          modalEl.querySelector('#save-eval-btn').addEventListener('click', () => {
            const name = modalEl.querySelector('#eval-name').value.trim();
            const gradeVal = modalEl.querySelector('#eval-grade').value;
            const coef = parseFloat(modalEl.querySelector('#eval-coef').value) || 1;
            if (!name) return;

            store.addEvaluation(blockId, subjectId, {
              id: 'ev_' + Date.now(),
              name,
              grade: gradeVal !== '' ? parseFloat(gradeVal) : null,
              coef,
              bonus: 0
            });
            Toast.success('Épreuve ajoutée !');
            Modal.close();
            this.render(container);
          });
        }
      });
    }
  };

  // ==========================================================================
  // 13. ORCHESTRATEUR PRINCIPAL & NAVIGATION
  // ==========================================================================
  class App {
    constructor() {
      this.currentPage = 'dashboard';
      this.views = {
        dashboard: DashboardView,
        subjects: SubjectsView,
        longterm: LongtermView,
        flashcards: FlashcardsView,
        grades: GradesView
      };

      this.init();
    }

    async init() {
      this._initTheme();
      this._bindNavigation();
      this._bindGitHubSync();
      this._bindGlobalShortcuts();

      this.navigateTo('dashboard');

      if (GitHubSync.isConfigured()) {
        try {
          const remote = await GitHubSync.fetchRemoteData();
          if (remote && remote.data) {
            store.applyRemoteData(remote.data);
            this.navigateTo(this.currentPage);
            Toast.success('Données synchronisées depuis GitHub !');
          } else if (remote && remote.notFound) {
            await GitHubSync.commitRemoteData(store.data, 'Initial commit: StudyFlow data.json');
            Toast.info('Fichier data.json initialisé sur votre dépôt GitHub !');
          }
        } catch (err) {
          console.warn('Sync GitHub au démarrage:', err);
          Toast.warning(`GitHub non accessible : mode local utilisé (${err.message})`);
        }
      } else {
        GitHubSync._updateStatus('unconfigured');
      }
    }

    _initTheme() {
      const savedTheme = localStorage.getItem('studyflow_theme') || 'dark';
      if (savedTheme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');

      const themeToggleBtn = document.getElementById('theme-toggle-btn');
      if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
          const isDark = document.documentElement.classList.toggle('dark');
          localStorage.setItem('studyflow_theme', isDark ? 'dark' : 'light');
        });
      }
    }

    _bindNavigation() {
      document.querySelectorAll('#desktop-nav .nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const page = btn.dataset.page;
          this.navigateTo(page);
        });
      });

      document.querySelectorAll('#mobile-nav .mobile-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const page = btn.dataset.page;
          this.navigateTo(page);
        });
      });
    }

    navigateTo(pageName) {
      if (!this.views[pageName]) return;
      this.currentPage = pageName;

      document.querySelectorAll('#desktop-nav .nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageName);
      });

      document.querySelectorAll('#mobile-nav .mobile-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageName);
      });

      document.querySelectorAll('.page-view').forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('active');
      });

      const targetSection = document.getElementById(`view-${pageName}`);
      if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('active');
        this.views[pageName].render(targetSection);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    _bindGitHubSync() {
      const syncBtn = document.getElementById('github-sync-btn');
      if (syncBtn) {
        syncBtn.addEventListener('click', () => this._openGitHubSettingsModal());
      }
    }

    _openGitHubSettingsModal() {
      const cfg = GitHubSync.getConfig();
      const isConf = GitHubSync.isConfigured();
      const lastSyncStr = GitHubSync.lastSyncTime ? GitHubSync.lastSyncTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Aucune';

      const content = `
        <div class="space-y-5">
          <!-- Intro & Guide -->
          <div class="p-4 rounded-2xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-black text-xs text-ink dark:text-white flex items-center gap-1.5">
                <i data-lucide="cloud" class="w-4 h-4 text-solaire-500"></i>
                Synchronisation GitHub (API REST)
              </span>
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${isConf ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'}">
                ${isConf ? 'Configuré ✓' : 'Non configuré'}
              </span>
            </div>
            <p class="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
              Vos données sont enregistrées et commitées en direct dans un fichier <code>${cfg.path || 'data.json'}</code> sur votre dépôt GitHub.
            </p>
          </div>

          <!-- Formulaire Configuration GitHub -->
          <form id="github-config-form" class="space-y-3.5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Utilisateur / Organisation GitHub *</label>
                <input type="text" id="gh-owner" required value="${cfg.owner || ''}" placeholder="Ex: mon-pseudo" class="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 font-bold">
              </div>
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Nom du Dépôt GitHub *</label>
                <input type="text" id="gh-repo" required value="${cfg.repo || ''}" placeholder="Ex: site_orga" class="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 font-bold">
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Branche *</label>
                <input type="text" id="gh-branch" required value="${cfg.branch || 'main'}" placeholder="main" class="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Chemin du fichier *</label>
                <input type="text" id="gh-path" required value="${cfg.path || 'data.json'}" placeholder="data.json" class="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 font-mono">
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">
                Personal Access Token (PAT) GitHub *
              </label>
              <div class="relative">
                <input type="password" id="gh-token" required value="${cfg.token || ''}" placeholder="ghp_... ou github_pat_..." class="w-full text-xs px-3 py-2 pr-10 rounded-xl bg-white dark:bg-ink-darkcard border border-creme-300 dark:border-zinc-700 font-mono">
                <button type="button" id="gh-toggle-token" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-ink dark:hover:text-white p-1">
                  <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                </button>
              </div>
              <p class="text-[10px] text-zinc-500 mt-1 font-medium">
                Créez un token sur GitHub : <i>Settings &gt; Developer settings &gt; Personal access tokens</i> (avec droit <b>repo</b> ou <b>Contents: Read &amp; write</b>).
              </p>
            </div>
          </form>

          <!-- État de la connexion & Actions rapides -->
          <div class="p-3.5 rounded-2xl bg-creme-100/70 dark:bg-ink-darkbg/70 border border-creme-300 dark:border-zinc-800 flex items-center justify-between text-xs font-bold">
            <span class="text-zinc-500">Dernière sync : <span class="font-mono text-ink dark:text-white">${lastSyncStr}</span></span>
            <button id="gh-test-btn" class="px-3 py-1.5 rounded-xl bg-creme-200 hover:bg-creme-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-ink dark:text-white text-xs font-black transition-colors flex items-center gap-1">
              <i data-lucide="zap" class="w-3.5 h-3.5 text-orangePop-500"></i>
              <span>Tester la connexion</span>
            </button>
          </div>

          <!-- Actions de Synchronisation Manuelle -->
          ${isConf ? `
            <div class="grid grid-cols-2 gap-2.5 pt-1">
              <button id="gh-pull-btn" class="px-3 py-2.5 bg-creme-200 hover:bg-creme-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-ink dark:text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors">
                <i data-lucide="download-cloud" class="w-3.5 h-3.5 text-sky-500"></i>
                <span>Recharger depuis GitHub</span>
              </button>
              <button id="gh-push-btn" class="px-3 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors shadow-sm">
                <i data-lucide="upload-cloud" class="w-3.5 h-3.5"></i>
                <span>Pousser vers GitHub</span>
              </button>
            </div>
          ` : ''}

          <!-- Option de Secours JSON -->
          <div class="pt-3 border-t border-creme-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Sauvegarde fichier locale (secours) :</span>
            <div class="flex items-center gap-2">
              <button id="gh-export-local-json" class="font-bold text-solaire-600 dark:text-solaire-400 hover:underline">Exporter JSON</button>
              <span>•</span>
              <button id="gh-import-local-json" class="font-bold text-solaire-600 dark:text-solaire-400 hover:underline">Importer JSON</button>
            </div>
          </div>
        </div>
      `;

      Modal.open({
        title: 'Configuration Synchronisation GitHub',
        content,
        maxWidth: 'max-w-lg',
        footer: `
          <button id="gh-disconnect-btn" class="px-4 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-black mr-auto ${isConf ? '' : 'hidden'}">Déconnecter</button>
          <button id="gh-cancel-btn" class="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500">Fermer</button>
          <button id="gh-save-btn" class="px-5 py-2 bg-solaire-500 hover:bg-solaire-600 text-white rounded-xl text-xs font-black shadow-md shadow-solaire-500/25">Enregistrer &amp; Sync</button>
        `,
        onOpen: (modalEl) => {
          const toggleBtn = modalEl.querySelector('#gh-toggle-token');
          const tokenInput = modalEl.querySelector('#gh-token');
          toggleBtn.addEventListener('click', () => {
            tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
          });

          modalEl.querySelector('#gh-cancel-btn').addEventListener('click', () => Modal.close());

          modalEl.querySelector('#gh-test-btn').addEventListener('click', async () => {
            const testCfg = {
              owner: modalEl.querySelector('#gh-owner').value.trim(),
              repo: modalEl.querySelector('#gh-repo').value.trim(),
              branch: modalEl.querySelector('#gh-branch').value.trim() || 'main',
              path: modalEl.querySelector('#gh-path').value.trim() || 'data.json',
              token: modalEl.querySelector('#gh-token').value.trim()
            };

            try {
              Toast.info('Test de la connexion GitHub en cours...');
              const repoInfo = await GitHubSync.testConnection(testCfg);
              Toast.success(`Connexion réussie au dépôt "${repoInfo.full_name}" !`);
            } catch (err) {
              Toast.error(`Échec connexion : ${err.message}`);
            }
          });

          modalEl.querySelector('#gh-save-btn').addEventListener('click', async () => {
            const newCfg = {
              owner: modalEl.querySelector('#gh-owner').value.trim(),
              repo: modalEl.querySelector('#gh-repo').value.trim(),
              branch: modalEl.querySelector('#gh-branch').value.trim() || 'main',
              path: modalEl.querySelector('#gh-path').value.trim() || 'data.json',
              token: modalEl.querySelector('#gh-token').value.trim()
            };

            if (!newCfg.owner || !newCfg.repo || !newCfg.token) {
              Toast.warning('Veuillez renseigner tous les champs obligatoires.');
              return;
            }

            try {
              Toast.info('Vérification et synchronisation GitHub...');
              await GitHubSync.testConnection(newCfg);
              GitHubSync.saveConfig(newCfg);

              const remote = await GitHubSync.fetchRemoteData(newCfg);
              if (remote && remote.data) {
                store.applyRemoteData(remote.data);
                Toast.success(`Données chargées depuis GitHub (${newCfg.path}) !`);
              } else {
                await GitHubSync.commitRemoteData(store.data, 'Initial commit: StudyFlow data.json');
                Toast.success(`Fichier ${newCfg.path} créé et synchronisé sur GitHub !`);
              }

              Modal.close();
              this.navigateTo(this.currentPage);
            } catch (err) {
              Toast.error(`Erreur GitHub : ${err.message}`);
            }
          });

          const pushBtn = modalEl.querySelector('#gh-push-btn');
          if (pushBtn) {
            pushBtn.addEventListener('click', async () => {
              try {
                Toast.info('Envoi des données vers GitHub...');
                await GitHubSync.commitRemoteData(store.data, 'Manual sync from StudyFlow');
                Toast.success('Données poussées avec succès sur GitHub !');
                Modal.close();
              } catch (err) {
                Toast.error(`Échec envoi GitHub : ${err.message}`);
              }
            });
          }

          const pullBtn = modalEl.querySelector('#gh-pull-btn');
          if (pullBtn) {
            pullBtn.addEventListener('click', async () => {
              try {
                Toast.info('Téléchargement depuis GitHub...');
                const remote = await GitHubSync.fetchRemoteData();
                if (remote && remote.data) {
                  store.applyRemoteData(remote.data);
                  Toast.success('Données rechargées avec succès depuis GitHub !');
                  Modal.close();
                  this.navigateTo(this.currentPage);
                } else {
                  Toast.warning('Aucun fichier data.json trouvé sur le dépôt.');
                }
              } catch (err) {
                Toast.error(`Échec rechargement GitHub : ${err.message}`);
              }
            });
          }

          const discBtn = modalEl.querySelector('#gh-disconnect-btn');
          if (discBtn) {
            discBtn.addEventListener('click', () => {
              if (confirm('Déconnecter la synchronisation GitHub ? (Vos données restent en mémoire locale)')) {
                localStorage.removeItem(GITHUB_CONFIG_KEY);
                GitHubSync._updateStatus('unconfigured');
                Toast.info('Synchronisation GitHub désactivée');
                Modal.close();
              }
            });
          }

          modalEl.querySelector('#gh-export-local-json').addEventListener('click', () => {
            store.exportJSON();
          });

          modalEl.querySelector('#gh-import-local-json').addEventListener('click', () => {
            const input = document.getElementById('global-json-import-input');
            if (input) {
              input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  if (store.importJSON(ev.target.result)) {
                    Modal.close();
                    this.navigateTo(this.currentPage);
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            }
          });
        }
      });
    }

    _bindGlobalShortcuts() {
      document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        if (e.altKey) {
          if (e.key === '1') this.navigateTo('dashboard');
          if (e.key === '2') this.navigateTo('subjects');
          if (e.key === '3') this.navigateTo('longterm');
          if (e.key === '4') this.navigateTo('flashcards');
          if (e.key === '5') this.navigateTo('grades');
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
  } else {
    window.app = new App();
  }

})();
