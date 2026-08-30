/**
 * StudyFlow - Application Web d'Organisation (Prépa / Ingénieur)
 * 
 * FONCTIONNALITÉS & AJUSTEMENTS :
 * 1. EDT immersif à gauche & Calendrier mensuel étendu à droite, To-Do List spacieuse en dessous.
 * 2. Glisser-déposer fluide à la souris sur l'EDT avec encadré rose pointillé temps réel + appui long 2s tactile.
 * 3. Menus déroulants 100% personnalisés (CustomDropdown) aux couleurs du site (Pop & Solaire).
 * 4. Sélecteur de vue mobile adaptatif (1j, 2j, 3j, 4j, 5j, 7j) avec menu déroulant fluide.
 * 5. Panneaux latéraux (Drawers) coulissants sur la droite de l'écran & Toasts de succès silencieux.
 * 6. Raccourcis claviers : Flashcards (Espace = retourner, Flèche gauche = à revoir, Flèche droite = maîtrisé)
 *    et navigation de formulaires (Entrée = champ suivant / validation sur dernier champ).
 * 7. Synchronisation GitHub REST API configurable manuellement via le bouton de navigation.
 */

(function() {
  'use strict';

  // ==========================================================================
  // 1. UTILITAIRES ENCODAGE BASE64 UTF-8 (Support accents, formules & LaTeX)
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
  // 3. TOAST NOTIFICATIONS (Succès silencieux pour création/mise à jour)
  // ==========================================================================
  const Toast = {
    show(message, type = 'info', duration = 3500) {
      if (type === 'success' || type === 'info') return; // Silence des toasts de succès/info demandés
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
        setTimeout(() => toast.remove(), 250);
      };

      toast.querySelector('.toast-close').addEventListener('click', removeToast);
      if (duration > 0) setTimeout(removeToast, duration);
    },

    success(msg, duration) {
      // Silence total des pop-ups de succès lors de la création / modification
    },
    info(msg, duration) {
      // Silence des notifications informatives intempestives
    },
    error(msg, duration) { this.show(msg, 'error', duration || 5000); },
    warning(msg, duration) { this.show(msg, 'warning', duration); },

    _getStyle(type) {
      switch (type) {
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
  // 4. MENUS DÉROULANTS CUSTOM (CustomDropdown) — 100% HTML/CSS/JS Pop & Solaire
  // ==========================================================================
  const CustomDropdown = {
    _openInstance: null,

    create({ options = [], value = null, onChange = null, placeholder = 'Sélectionner...', className = '', name = '' }) {
      const selectedOption = options.find(o => o.value === value) || options[0] || null;
      const currentValue = selectedOption ? selectedOption.value : '';

      const wrapper = document.createElement('div');
      wrapper.className = `custom-dropdown-wrapper ${className}`;
      wrapper.dataset.value = currentValue;
      wrapper.dataset.name = name;
      wrapper.setAttribute('role', 'combobox');
      wrapper.setAttribute('aria-haspopup', 'listbox');
      wrapper.setAttribute('aria-expanded', 'false');
      wrapper.tabIndex = 0;

      wrapper.innerHTML = `
        <div class="custom-dropdown-trigger">
          <span class="custom-dropdown-label">${this._renderLabel(selectedOption, placeholder)}</span>
          <svg class="custom-dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <div class="custom-dropdown-list" role="listbox">
          ${options.map(opt => `
            <div class="custom-dropdown-option ${opt.value === currentValue ? 'selected' : ''}" 
                 role="option" 
                 aria-selected="${opt.value === currentValue}" 
                 data-val="${opt.value}">
              ${opt.color ? `<span class="custom-dropdown-opt-dot" style="background-color:${opt.color}"></span>` : ''}
              <span>${opt.label}</span>
              ${opt.value === currentValue ? `<svg class="custom-dropdown-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"></path></svg>` : ''}
            </div>
          `).join('')}
        </div>
      `;

      const trigger = wrapper.querySelector('.custom-dropdown-trigger');
      const list = wrapper.querySelector('.custom-dropdown-list');

      const openDropdown = (e) => {
        e.stopPropagation();
        if (CustomDropdown._openInstance && CustomDropdown._openInstance !== wrapper) {
          CustomDropdown._closeDropdown(CustomDropdown._openInstance);
        }
        if (wrapper.classList.contains('open')) {
          CustomDropdown._closeDropdown(wrapper);
        } else {
          CustomDropdown._openDropdown(wrapper);
        }
      };

      trigger.addEventListener('click', openDropdown);
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDropdown(e); }
        if (e.key === 'Escape') CustomDropdown._closeDropdown(wrapper);
      });

      list.querySelectorAll('.custom-dropdown-option').forEach(optEl => {
        optEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const newVal = optEl.dataset.val;
          const newOpt = options.find(o => o.value === newVal);
          const newLabel = newOpt ? newOpt.label : newVal;

          wrapper.dataset.value = newVal;
          wrapper.querySelector('.custom-dropdown-label').innerHTML = this._renderLabel(newOpt, placeholder);

          list.querySelectorAll('.custom-dropdown-option').forEach(el => {
            const isSel = el.dataset.val === newVal;
            el.classList.toggle('selected', isSel);
            el.setAttribute('aria-selected', String(isSel));
            const check = el.querySelector('.custom-dropdown-check');
            if (check) check.remove();
            if (isSel) {
              el.insertAdjacentHTML('beforeend', `<svg class="custom-dropdown-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"></path></svg>`);
            }
          });

          CustomDropdown._closeDropdown(wrapper);
          if (onChange) onChange(newVal, newLabel);
        });

        optEl.addEventListener('mouseenter', () => {
          list.querySelectorAll('.custom-dropdown-option').forEach(el => el.classList.remove('hovered'));
          optEl.classList.add('hovered');
        });
      });

      wrapper.addEventListener('keydown', (e) => {
        if (!wrapper.classList.contains('open')) return;
        const opts = Array.from(list.querySelectorAll('.custom-dropdown-option'));
        const current = list.querySelector('.custom-dropdown-option.hovered') || list.querySelector('.custom-dropdown-option.selected');
        const idx = opts.indexOf(current);

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = opts[Math.min(idx + 1, opts.length - 1)];
          if (next) { opts.forEach(el => el.classList.remove('hovered')); next.classList.add('hovered'); next.scrollIntoView({ block: 'nearest' }); }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = opts[Math.max(idx - 1, 0)];
          if (prev) { opts.forEach(el => el.classList.remove('hovered')); prev.classList.add('hovered'); prev.scrollIntoView({ block: 'nearest' }); }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const hovered = list.querySelector('.custom-dropdown-option.hovered');
          if (hovered) hovered.click();
        } else if (e.key === 'Escape') {
          CustomDropdown._closeDropdown(wrapper);
        }
      });

      return wrapper;
    },

    _renderLabel(opt, placeholder) {
      if (!opt) return `<span class="text-zinc-400">${placeholder}</span>`;
      if (opt.color) return `<span class="custom-dropdown-opt-dot" style="background-color:${opt.color}"></span><span>${opt.label}</span>`;
      return `<span>${opt.label}</span>`;
    },

    _openDropdown(wrapper) {
      wrapper.classList.add('open');
      wrapper.setAttribute('aria-expanded', 'true');
      CustomDropdown._openInstance = wrapper;

      const list = wrapper.querySelector('.custom-dropdown-list');
      if (list) {
        list.classList.remove('dropup');
      }

      setTimeout(() => {
        document.addEventListener('click', CustomDropdown._globalClickHandler);
        document.addEventListener('keydown', CustomDropdown._globalEscHandler);
      }, 10);
    },

    _closeDropdown(wrapper) {
      if (!wrapper) return;
      wrapper.classList.remove('open');
      wrapper.setAttribute('aria-expanded', 'false');
      const list = wrapper.querySelector('.custom-dropdown-list');
      if (list) list.querySelectorAll('.custom-dropdown-option').forEach(el => el.classList.remove('hovered'));
      if (CustomDropdown._openInstance === wrapper) CustomDropdown._openInstance = null;
      document.removeEventListener('click', CustomDropdown._globalClickHandler);
      document.removeEventListener('keydown', CustomDropdown._globalEscHandler);
    },

    _globalClickHandler(e) {
      if (CustomDropdown._openInstance && !CustomDropdown._openInstance.contains(e.target)) {
        CustomDropdown._closeDropdown(CustomDropdown._openInstance);
      }
    },

    _globalEscHandler(e) {
      if (e.key === 'Escape' && CustomDropdown._openInstance) {
        CustomDropdown._closeDropdown(CustomDropdown._openInstance);
      }
    },

    getValue(wrapperEl) {
      return wrapperEl ? wrapperEl.dataset.value || '' : '';
    },

    setValue(wrapperEl, newValue) {
      if (!wrapperEl) return;
      const list = wrapperEl.querySelector('.custom-dropdown-list');
      const optEl = list ? list.querySelector(`[data-val="${newValue}"]`) : null;
      if (optEl) optEl.click();
    },

    _autoInitPanel(panelEl) {
      if (!panelEl) return;

      panelEl.querySelectorAll('select.custom-select').forEach(sel => {
        const options = Array.from(sel.options).map(o => ({
          value: o.value,
          label: o.text,
          color: o.dataset.color || null
        }));

        const currentValue = sel.value;
        const idAttr = sel.id || '';
        const nameAttr = sel.name || '';
        const dataAttrs = sel.dataset;

        const extraClasses = Array.from(sel.classList)
          .filter(c => c !== 'custom-select' && !c.startsWith('text-') && !c.startsWith('font-') && !c.startsWith('px-') && !c.startsWith('py-') && !c.startsWith('rounded-'))
          .join(' ');

        const isCompact = sel.classList.contains('compact') || sel.offsetHeight < 35;

        const dropdownEl = this.create({
          options,
          value: currentValue,
          className: `${extraClasses} ${isCompact ? 'compact' : ''}`.trim(),
          name: nameAttr || idAttr,
          onChange: (newVal) => {
            sel.value = newVal;
            const event = new Event('change', { bubbles: true });
            sel.dispatchEvent(event);
          }
        });

        Object.keys(dataAttrs).forEach(key => {
          dropdownEl.dataset[key] = dataAttrs[key];
        });

        if (idAttr) {
          dropdownEl.id = idAttr + '-dd';
          sel.id = idAttr;
          sel.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;overflow:hidden;';
          sel.setAttribute('aria-hidden', 'true');
          sel.setAttribute('tabindex', '-1');
          sel.parentNode.insertBefore(dropdownEl, sel);
        } else {
          sel.parentNode.replaceChild(dropdownEl, sel);
        }
      });
    }
  };

  // Styles injectés pour CustomDropdown
  (function injectCustomDropdownStyles() {
    if (document.getElementById('custom-dropdown-styles')) return;
    const style = document.createElement('style');
    style.id = 'custom-dropdown-styles';
    style.textContent = `
      .custom-dropdown-wrapper {
        position: relative;
        display: inline-flex;
        flex-direction: column;
        width: 100%;
        user-select: none;
      }
      .custom-dropdown-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 14px;
        background-color: #fcfaf6;
        border: 1.5px solid #ded4c1;
        border-radius: 16px;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 700;
        color: #0f0f12;
        font-family: inherit;
        transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
        min-height: 40px;
        white-space: nowrap;
        overflow: hidden;
      }
      .dark .custom-dropdown-trigger {
        background-color: #0d0d11 !important;
        border-color: #272730 !important;
        color: #fdfdfd !important;
      }
      .custom-dropdown-wrapper:focus .custom-dropdown-trigger,
      .custom-dropdown-wrapper.open .custom-dropdown-trigger {
        border-color: #ff3366 !important;
        box-shadow: 0 0 0 3.5px rgba(255, 51, 102, 0.22) !important;
        outline: none;
      }
      .custom-dropdown-label {
        display: flex;
        align-items: center;
        gap: 7px;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .custom-dropdown-chevron {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
        color: #ff3366;
        transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
      }
      .custom-dropdown-wrapper.open .custom-dropdown-chevron {
        transform: rotate(180deg);
      }
      .custom-dropdown-list {
        position: absolute;
        top: calc(100% + 6px) !important;
        bottom: auto !important;
        left: 0;
        right: 0;
        z-index: 99999;
        background-color: #ffffff;
        border: 1.5px solid #ded4c1;
        border-radius: 18px;
        box-shadow: 0 16px 40px -8px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08);
        overflow: hidden;
        max-height: 0;
        opacity: 0;
        pointer-events: none;
        transition: max-height 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        transform: translateY(-4px) scale(0.98);
        overflow-y: auto;
      }
      .dark .custom-dropdown-list {
        background-color: #111116 !important;
        border-color: #272730 !important;
        box-shadow: 0 16px 40px -8px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4);
      }
      .custom-dropdown-wrapper.open .custom-dropdown-list {
        max-height: 280px;
        opacity: 1;
        pointer-events: all;
        transform: translateY(0) scale(1);
      }
      .custom-dropdown-list::-webkit-scrollbar { width: 5px; }
      .custom-dropdown-list::-webkit-scrollbar-track { background: transparent; }
      .custom-dropdown-list::-webkit-scrollbar-thumb { background: rgba(120,113,108,0.3); border-radius: 4px; }
      .custom-dropdown-option {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 10px 14px;
        font-size: 0.75rem;
        font-weight: 700;
        color: #0f0f12;
        cursor: pointer;
        transition: background-color 0.14s ease, color 0.14s ease;
      }
      .dark .custom-dropdown-option { color: #f4f4f5; }
      .custom-dropdown-option:hover, .custom-dropdown-option.hovered {
        background-color: rgba(255, 51, 102, 0.08);
        color: #ff3366;
      }
      .dark .custom-dropdown-option:hover, .dark .custom-dropdown-option.hovered {
        background-color: rgba(255, 51, 102, 0.14);
        color: #ff6680;
      }
      .custom-dropdown-option.selected {
        background-color: rgba(255, 51, 102, 0.06);
        color: #ff3366;
        font-weight: 900;
      }
      .dark .custom-dropdown-option.selected {
        background-color: rgba(255, 51, 102, 0.12);
        color: #ff6680;
      }
      .custom-dropdown-check {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
        color: #ff3366;
        margin-left: auto;
      }
      .custom-dropdown-opt-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      .custom-dropdown-wrapper.compact .custom-dropdown-trigger {
        padding: 7px 11px;
        font-size: 0.7rem;
        border-radius: 12px;
        min-height: 32px;
      }
      .custom-dropdown-wrapper.compact .custom-dropdown-option {
        padding: 8px 12px;
        font-size: 0.7rem;
      }
    `;
    document.head.appendChild(style);
  })();

  // ==========================================================================
  // 5. PANNEAUX LATÉRAUX COULISSANTS (DRAWERS SUR LA DROITE)
  // ==========================================================================
  const Drawer = {
    activeDrawer: null,

    open({ title, icon = '', content, footer = '', maxWidth = 'max-w-lg', onOpen = null, onClose = null }) {
      this.close();

      const root = document.getElementById('drawers-root') || document.getElementById('modals-root') || document.body;

      const backdrop = document.createElement('div');
      backdrop.className = 'drawer-backdrop items-stretch';

      const panel = document.createElement('div');
      panel.className = `drawer-panel-right ${maxWidth} flex flex-col overflow-hidden`;

      panel.innerHTML = `
        <!-- Drawer Header -->
        <div class="px-6 py-5 border-b border-creme-300 dark:border-ink-border flex items-center justify-between bg-creme-100/70 dark:bg-ink-darkbg/70 flex-shrink-0">
          <div class="flex items-center gap-3">
            ${icon ? `<div class="p-2 rounded-2xl bg-solaire-500/10 text-solaire-500">${icon}</div>` : ''}
            <h3 class="font-extrabold text-base text-ink dark:text-white tracking-tight">${title}</h3>
          </div>
          <button id="drawer-close-btn" class="p-2 rounded-2xl text-zinc-400 hover:text-ink dark:hover:text-white hover:bg-creme-200 dark:hover:bg-zinc-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Drawer Body -->
        <div class="px-6 py-6 overflow-y-auto flex-1 text-xs text-zinc-700 dark:text-zinc-300 space-y-5">
          ${content}
        </div>

        <!-- Drawer Footer -->
        ${footer ? `
          <div class="px-6 py-4 bg-creme-100/80 dark:bg-ink-darkbg/80 border-t border-creme-300 dark:border-ink-border flex items-center justify-end gap-3 flex-shrink-0">
            ${footer}
          </div>
        ` : ''}
      `;

      backdrop.appendChild(panel);
      root.appendChild(backdrop);

      requestAnimationFrame(() => {
        backdrop.classList.add('active');
      });

      this.activeDrawer = { backdrop, panel, onClose };

      panel.querySelector('#drawer-close-btn').addEventListener('click', () => this.close());
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });

      this._handleKeyDown = (e) => {
        if (e.key === 'Escape') this.close();
      };
      document.addEventListener('keydown', this._handleKeyDown);

      if (window.lucide) window.lucide.createIcons();

      // Remplacement automatique des <select> natifs par des CustomDropdowns
      CustomDropdown._autoInitPanel(panel);

      // Productivité : Touche Entrée passe au champ suivant ou valide le formulaire
      panel.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (e.target.tagName === 'TEXTAREA' && !e.ctrlKey && !e.metaKey) return;
          e.preventDefault();

          const focusables = Array.from(panel.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([disabled]), textarea:not([disabled]), .custom-dropdown-wrapper[tabindex="0"]'));
          const currentTarget = e.target.closest('.custom-dropdown-wrapper') || e.target;
          const currentIndex = focusables.indexOf(currentTarget);

          if (currentIndex >= 0 && currentIndex < focusables.length - 1) {
            const next = focusables[currentIndex + 1];
            next.focus();
            if (next.select) next.select();
          } else {
            const submitBtn = panel.querySelector('#save-course-btn, #update-course-btn, #btn-create-manual-cal, #save-imp-btn, #save-goal-btn, #save-cat-btn, #save-deck-btn, #confirm-batch-import-btn, #save-nd-btn, #save-card-btn, #gh-save-btn, #save-eval-btn, button[type=submit], button.btn-primary');
            if (submitBtn) submitBtn.click();
          }
        }
      });

      if (onOpen) onOpen(panel);
    },

    close() {
      if (!this.activeDrawer) return;
      const { backdrop, onClose } = this.activeDrawer;
      document.removeEventListener('keydown', this._handleKeyDown);

      backdrop.classList.add('drawer-closing');
      backdrop.classList.remove('active');

      setTimeout(() => {
        backdrop.remove();
        if (onClose) onClose();
      }, 220);

      this.activeDrawer = null;
    }
  };

  // Alias universel Modal -> Drawer pour que toutes les modales glissent sur la droite
  const Modal = {
    open(options) { Drawer.open(options); },
    close() { Drawer.close(); }
  };

  // ==========================================================================
  // 6. GITHUB REST API SYNC CLIENT (PAT & data.json Manuel)
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
          console.warn('Sync GitHub:', err.message);
        }
      }, 1200);
    }
  };

  // ==========================================================================
  // 7. STORE LOCAL & ÉTAT INITIAL 100% PROPRE
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
    subjectsData: { maths: [], physique: [], info: [] },
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
          'studyflow_data_v10', 'studyflow_data_v11'
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
    updateEvent(id, updates) {
      const ev = this.data.events.find(e => e.id === id);
      if (ev) {
        Object.assign(ev, updates);
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
  // 8. PARSER ICS
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
  // 9. VUE ACCUEIL / DASHBOARD (EDT À GAUCHE, CALENDRIER À DROITE, TO-DO EN DESSOUS)
  // ==========================================================================
  const DashboardView = {
    activeMonday: getMondayOfDate(new Date()),
    activeDayMobileIndex: 0,
    mobileViewDays: 1,
    miniCalDate: new Date(),
    todoFilter: 'all',
    selectedTagForNewTodo: 'Maths',
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

    _getTimeSelectOptions(selectedTime = '08:00') {
      const times = [];
      for (let h = 6; h <= 23; h++) {
        for (let m of [0, 15, 30, 45]) {
          if (h === 23 && m > 0) continue;
          times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
      }
      if (selectedTime && !times.includes(selectedTime)) times.unshift(selectedTime);
      return times.map(t => `<option value="${t}" ${t === selectedTime ? 'selected' : ''}>${t}</option>`).join('');
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

      const dailyTodos = store.getDailyTodos();
      const availableTags = ['Maths', 'Physique', 'Info', 'Autres cours', 'Maison', 'Sport'];
      
      const filteredTodos = dailyTodos.filter(t => {
        if (this.todoFilter === 'active') return !t.completed;
        if (this.todoFilter === 'completed') return t.completed;
        if (this.todoFilter !== 'all') return t.tag === this.todoFilter;
        return true;
      });
      const completedTodosCount = dailyTodos.filter(t => t.completed).length;
      const progressPercent = dailyTodos.length > 0 ? Math.round((completedTodosCount / dailyTodos.length) * 100) : 0;

      container.innerHTML = `
        <div class="space-y-6 flex-1 flex flex-col">
          
          <!-- HAUT : GRILLE 2 COLONNES (EDT À GAUCHE + MINI-CALENDRIER À DROITE) -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            <!-- COLONNE GAUCHE (EDT) -->
            <div class="lg:col-span-8 xl:col-span-9 space-y-3.5 flex flex-col">
              
              <!-- Barre de navigation semaine de l'EDT -->
              <div class="bg-white dark:bg-ink-darkcard p-3 sm:p-4 rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <div class="flex items-center gap-1 bg-creme-200/90 dark:bg-ink-darkbg p-1 rounded-2xl border border-creme-300 dark:border-ink-border">
                    <button id="week-prev-btn" title="Semaine précédente" class="p-1.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 text-ink dark:text-zinc-200 transition-all">
                      <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    </button>
                    <button id="week-today-btn" class="px-3 py-1 rounded-xl text-xs font-extrabold hover:bg-white dark:hover:bg-zinc-800 text-ink dark:text-zinc-200 transition-all">
                      Aujourd'hui
                    </button>
                    <button id="week-next-btn" title="Semaine suivante" class="p-1.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 text-ink dark:text-zinc-200 transition-all">
                      <i data-lucide="chevron-right" class="w-4 h-4"></i>
                    </button>
                  </div>

                  <span class="text-xs font-black text-ink dark:text-white px-3 py-1.5 rounded-2xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-zinc-800 tracking-tight">
                    ${weekRangeLabel}
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <button id="manage-calendars-btn" class="px-3.5 py-2 rounded-xl text-xs font-black bg-creme-200 hover:bg-creme-300 dark:bg-ink-darkbg dark:hover:bg-zinc-800 text-ink dark:text-zinc-200 border border-creme-300 dark:border-ink-border transition-all flex items-center gap-1.5 shadow-xs">
                    <i data-lucide="layers" class="w-3.5 h-3.5 text-solaire-500"></i>
                    <span class="hidden sm:inline">Calendriers</span>
                  </button>

                  <button id="add-event-btn" class="px-4 py-2 rounded-xl text-xs font-black bg-solaire-500 hover:bg-solaire-600 text-white transition-all flex items-center gap-1.5 shadow-md shadow-solaire-500/25">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                    <span>Ajouter cours</span>
                  </button>
                </div>
              </div>

              <!-- Sélecteur de vue mobile -->
              <div class="lg:hidden space-y-2.5">
                <div class="bg-white dark:bg-ink-darkcard p-2.5 rounded-2xl border border-creme-300 dark:border-ink-border shadow-sm flex items-center justify-between gap-2.5">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span class="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex-shrink-0">Vue</span>
                    <select id="mobile-view-select" class="custom-select w-full text-xs px-3 py-2 rounded-xl font-black">
                      <option value="1" ${this.mobileViewDays === 1 ? 'selected' : ''}>1 jour</option>
                      <option value="2" ${this.mobileViewDays === 2 ? 'selected' : ''}>2 jours</option>
                      <option value="3" ${this.mobileViewDays === 3 ? 'selected' : ''}>3 jours</option>
                      <option value="4" ${this.mobileViewDays === 4 ? 'selected' : ''}>4 jours</option>
                      <option value="5" ${this.mobileViewDays === 5 ? 'selected' : ''}>5 jours</option>
                      <option value="7" ${this.mobileViewDays === 7 ? 'selected' : ''}>7 jours</option>
                    </select>
                  </div>
                  <div class="flex items-center gap-1 pl-2 border-l border-creme-200 dark:border-zinc-700 flex-shrink-0">
                    <button id="mobile-prev-btn" title="Jours précédents" class="p-2 rounded-xl hover:bg-creme-200 dark:hover:bg-zinc-800 text-zinc-500 transition-all">
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <button id="mobile-today-btn" class="px-2.5 py-1.5 rounded-xl text-xs font-black text-solaire-600 dark:text-solaire-400 bg-solaire-500/10 transition-all">Auj.</button>
                    <button id="mobile-next-btn" title="Jours suivants" class="p-2 rounded-xl hover:bg-creme-200 dark:hover:bg-zinc-800 text-zinc-500 transition-all">
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                  </div>
                </div>

                <div class="bg-white dark:bg-ink-darkcard px-2 py-1.5 rounded-2xl border border-creme-300 dark:border-ink-border shadow-sm grid" style="grid-template-columns: repeat(${Math.min(this.mobileViewDays, weekDays.slice(this.activeDayMobileIndex).length)}, 1fr)">
                  ${weekDays.slice(this.activeDayMobileIndex, this.activeDayMobileIndex + this.mobileViewDays).map(d => {
                    const isToday = d.dateStr === todayStr;
                    return `<div class="text-center py-1 rounded-xl text-xs font-black ${isToday ? 'text-solaire-600 dark:text-solaire-400 bg-solaire-500/10' : 'text-ink dark:text-zinc-300'}">
                      <div>${d.short}</div>
                      <div class="text-[10px] font-mono opacity-70">${d.dayNum}</div>
                    </div>`;
                  }).join('')}
                </div>
              </div>

              <!-- Grille de l'Emploi du Temps -->
              <div class="bg-white dark:bg-ink-darkcard rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm overflow-hidden flex flex-col min-h-[580px]">
                <div class="hidden lg:grid border-b border-creme-200 dark:border-ink-border bg-creme-100/70 dark:bg-ink-darkbg/70 text-xs font-extrabold text-ink dark:text-zinc-300 select-none flex-shrink-0"
                     style="grid-template-columns: 54px repeat(7, 1fr);">
                  <div class="py-2.5 text-center text-zinc-400 text-[11px] border-r border-creme-200 dark:border-ink-border font-mono">Heure</div>
                  ${weekDays.map(d => {
                    const isToday = d.dateStr === todayStr;
                    return `
                      <div class="hidden lg:flex flex-col items-center justify-center py-2.5 border-r border-creme-200 dark:border-ink-border last:border-r-0 ${isToday ? 'bg-solaire-500/10 text-solaire-600 dark:text-solaire-400 font-black' : ''}">
                        <span>${d.label}</span>
                        <span class="text-[11px] font-mono ${isToday ? 'text-solaire-600 dark:text-solaire-400 font-black' : 'text-zinc-400 font-normal'}">${d.dayNum} ${d.date.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                      </div>
                    `;
                  }).join('')}
                </div>

                <div class="relative overflow-y-auto flex-1 timetable-grid" id="timetable-scroll-area" style="min-height: 520px;">
                  <!-- Grille Desktop (Lundi à Dimanche) -->
                  <div class="hidden lg:grid relative" id="desktop-timetable-grid" style="grid-template-columns: 54px repeat(7, 1fr); height: 1064px;">
                    <div class="relative border-r border-creme-200 dark:border-ink-border select-none text-[11px] text-zinc-400 font-mono text-center">
                      ${Array.from({ length: 19 }, (_, i) => i + 5).map(hour => {
                        const isFirst = hour === 5;
                        return `
                          <div class="absolute left-0 right-0 flex items-center justify-center font-bold select-none text-[11px] text-zinc-400 font-mono" style="top: ${isFirst ? '6px' : `${(hour - 5) * 56}px`}; ${isFirst ? '' : 'transform: translateY(-50%);'}">
                            ${String(hour).padStart(2, '0')}h
                          </div>
                        `;
                      }).join('')}
                    </div>
                    ${weekDays.map(d => `
                      <div data-col-datestr="${d.dateStr}" class="timetable-column relative border-r border-creme-200/60 dark:border-ink-border/60 last:border-r-0 ${d.dateStr === todayStr ? 'bg-solaire-500/[0.03]' : ''}"></div>
                    `).join('')}
                    <div id="current-time-indicator" class="current-time-line hidden"></div>
                  </div>

                  <!-- Grille Mobile (Vue adaptative 1j à 7j) -->
                  <div class="grid lg:hidden relative" id="mobile-timetable-grid" style="grid-template-columns: 48px repeat(${this.mobileViewDays}, 1fr); height: 1064px;">
                    <div class="relative border-r border-creme-200 dark:border-ink-border select-none text-[11px] text-zinc-400 font-mono text-center">
                      ${Array.from({ length: 19 }, (_, i) => i + 5).map(hour => {
                        const isFirst = hour === 5;
                        return `
                          <div class="absolute left-0 right-0 flex items-center justify-center font-bold select-none text-[11px] text-zinc-400 font-mono" style="top: ${isFirst ? '6px' : `${(hour - 5) * 56}px`}; ${isFirst ? '' : 'transform: translateY(-50%);'}">
                            ${String(hour).padStart(2, '0')}h
                          </div>
                        `;
                      }).join('')}
                    </div>
                    ${weekDays.slice(this.activeDayMobileIndex, this.activeDayMobileIndex + this.mobileViewDays).map(d => `
                      <div data-col-datestr="${d.dateStr}" class="timetable-column relative border-r border-creme-200/60 dark:border-ink-border/60 last:border-r-0 ${d.dateStr === todayStr ? 'bg-solaire-500/[0.03]' : ''}"></div>
                    `).join('')}
                    <div id="current-time-indicator-mobile" class="current-time-line hidden"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- COLONNE DROITE (CALENDRIER MENSUEL & ÉVÉNEMENTS) -->
            <div class="lg:col-span-4 xl:col-span-3 space-y-4">
              <div class="bg-white dark:bg-ink-darkcard rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm p-5 space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-black text-ink dark:text-white uppercase tracking-wider flex items-center gap-1.5" id="mini-cal-title">Août 2026</h3>
                  <div class="flex items-center gap-1">
                    <button id="mini-cal-prev" class="p-1.5 rounded-xl hover:bg-creme-200 dark:hover:bg-zinc-800 text-zinc-500"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
                    <button id="mini-cal-today-btn" class="text-[11px] px-2.5 py-1 font-black rounded-xl bg-creme-200 hover:bg-creme-300 dark:bg-zinc-800 text-ink dark:text-white">Aujourd'hui</button>
                    <button id="mini-cal-next" class="p-1.5 rounded-xl hover:bg-creme-200 dark:hover:bg-zinc-800 text-zinc-500"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
                  </div>
                </div>
                <div class="grid grid-cols-7 text-center text-[10px] font-black text-zinc-400">
                  <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
                </div>
                <div id="mini-cal-grid" class="grid grid-cols-7 gap-1.5"></div>
              </div>

              <div class="bg-white dark:bg-ink-darkcard rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm p-5 space-y-3.5">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-black text-ink dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <i data-lucide="bookmark" class="w-4 h-4 text-orangePop-500"></i>
                    Événements personnels
                  </h3>
                  <button id="add-important-date-btn" class="text-[11px] font-black text-solaire-600 dark:text-solaire-400 hover:underline flex items-center gap-1">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                    <span>Ajouter</span>
                  </button>
                </div>
                <div id="important-dates-list" class="space-y-2 max-h-48 overflow-y-auto pr-1"></div>
              </div>
            </div>
          </div>

          <!-- BAS : TO-DO LIST DU JOUR (AVEC LE MENU DÉROULANT DES CATÉGORIES) -->
          <div class="bg-white dark:bg-ink-darkcard rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm p-6 sm:p-7 space-y-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-creme-200 dark:border-ink-border">
              <div class="flex items-center gap-3.5">
                <div class="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <i data-lucide="check-circle-2" class="w-6 h-6"></i>
                </div>
                <div>
                  <h3 class="text-base font-extrabold text-ink dark:text-white">To-Do List du Jour</h3>
                  <p class="text-xs text-zinc-500 font-bold mt-0.5">${completedTodosCount} sur ${dailyTodos.length} tâche(s) terminée(s) (${progressPercent}%)</p>
                </div>
              </div>

              <!-- FILTRES SIMPLIFIÉS + MENU DÉROULANT DES CATÉGORIES -->
              <div class="flex items-center gap-2 flex-wrap">
                <button data-filter="all" class="todo-filter-btn px-3 py-1.5 rounded-xl text-xs font-black transition-all ${this.todoFilter === 'all' ? 'bg-ink text-white dark:bg-white dark:text-ink shadow-xs' : 'bg-creme-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-ink'}">Toutes</button>
                <button data-filter="active" class="todo-filter-btn px-3 py-1.5 rounded-xl text-xs font-black transition-all ${this.todoFilter === 'active' ? 'bg-solaire-500 text-white shadow-xs' : 'bg-creme-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-ink'}">À faire</button>
                <button data-filter="completed" class="todo-filter-btn px-3 py-1.5 rounded-xl text-xs font-black transition-all ${this.todoFilter === 'completed' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-creme-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-ink'}">Faites</button>
                
                <div class="w-48 inline-block">
                  <select id="todo-category-filter-select" class="custom-select text-xs font-black">
                    <option value="all_categories" ${!availableTags.includes(this.todoFilter) ? 'selected' : ''}>Catégories...</option>
                    ${availableTags.map(tag => {
                      const cat = getCategoryColor(tag);
                      return `<option value="${tag}" data-color="${cat.hex}" ${this.todoFilter === tag ? 'selected' : ''}>${tag}</option>`;
                    }).join('')}
                  </select>
                </div>
              </div>
            </div>

            <form id="add-daily-todo-form" class="p-4 sm:p-5 rounded-2xl bg-creme-100/80 dark:bg-ink-darkbg/80 border border-creme-300 dark:border-zinc-800 space-y-3.5">
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input type="text" id="daily-todo-text" required placeholder="Ajouter une tâche pour aujourd'hui (Entrée)..." class="custom-input flex-1 text-xs px-4 py-3 rounded-2xl font-bold">
                <button type="submit" class="px-6 py-3 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-md shadow-solaire-500/25 transition-all flex items-center justify-center gap-2 flex-shrink-0">
                  <i data-lucide="plus" class="w-4 h-4"></i>
                  <span>Ajouter la tâche</span>
                </button>
              </div>

              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[11px] font-black text-zinc-500 uppercase tracking-wider mr-1">Catégorie :</span>
                ${availableTags.map(tag => {
                  const cat = getCategoryColor(tag);
                  const isSelected = this.selectedTagForNewTodo === tag;
                  return `
                    <button type="button" data-tag-select="${tag}" class="tag-pill-btn px-3 py-1 rounded-xl text-xs font-black border transition-all ${isSelected ? `${cat.bg} ring-2 ring-solaire-500 shadow-xs scale-105` : 'bg-white dark:bg-ink-darkcard border-creme-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-solaire-400'}">
                      ${tag}
                    </button>
                  `;
                }).join('')}
              </div>
            </form>

            <div id="daily-todos-grid" class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              ${filteredTodos.length === 0 ? `
                <div class="col-span-full p-8 text-center bg-creme-100/50 dark:bg-ink-darkbg/50 rounded-2xl border border-dashed border-creme-300 dark:border-zinc-800">
                  <p class="text-xs text-zinc-400 font-bold">Aucune tâche dans cette sélection.<br><span class="text-[11px] text-zinc-500">Ajoutez une tâche ci-dessus pour rythmer votre journée.</span></p>
                </div>
              ` : filteredTodos.map(todo => {
                const catInfo = getCategoryColor(todo.tag);
                return `
                  <div class="p-4 rounded-2xl bg-creme-100/90 dark:bg-ink-darkbg/90 border border-creme-300 dark:border-zinc-800 flex items-center justify-between gap-3.5 transition-all hover:border-solaire-300 dark:hover:border-zinc-700 shadow-2xs ${todo.completed ? 'opacity-50' : ''}">
                    <label class="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer select-none">
                      <input type="checkbox" ${todo.completed ? 'checked' : ''} data-todo-id="${todo.id}" style="accent-color: ${catInfo.hex};" class="w-4 h-4 rounded-lg cursor-pointer flex-shrink-0">
                      <span class="text-xs font-black text-ink dark:text-zinc-100 truncate ${todo.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}">${todo.text}</span>
                    </label>

                    <div class="flex items-center gap-2 flex-shrink-0">
                      <span class="text-[10px] font-black px-2.5 py-0.5 rounded-lg border ${catInfo.bg}">${todo.tag || 'Autre'}</span>
                      <button data-delete-todo="${todo.id}" class="text-zinc-400 hover:text-rose-500 p-1 rounded-lg">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

          </div>

        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      CustomDropdown._autoInitPanel(container);
      this._bindEvents(container);
      this._renderTimetableEvents();
      this._initDragToCreateEvents(container);
      this._renderMiniCalendar();
      this._renderImportantDates();
      this._updateCurrentTimeIndicator();

      if (!this._autoSynced) {
        this._autoSynced = true;
        const calsWithUrl = store.getCalendars().filter(c => !!c.feedUrl);
        if (calsWithUrl.length) {
          store.refreshAllFeeds().then(count => {
            if (count > 0) {
              this._renderTimetableEvents();
            }
          });
        }
      }
    },

    _renderTimetableEvents() {
      const allEvents = store.getEvents();
      const calendars = store.getCalendars();
      const calMap = new Map(calendars.map(c => [c.id, c]));

      const weekDays = this._getWeekDates(this.activeMonday);
      const HOUR_HEIGHT = 56;
      const START_HOUR = 5;

      weekDays.forEach(d => {
        const colEls = document.querySelectorAll(`[data-col-datestr="${d.dateStr}"]`);
        colEls.forEach(colEl => {
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
        });
      });
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
          const heightPx = Math.max((ev.duration / 60) * hourHeight - 2, 26);
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
              ${ev.room ? `<span class="truncate ml-1 font-mono px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/15 text-ink dark:text-white">${ev.room}</span>` : ''}
            </div>
          `;

          eventEl.querySelector('.event-checkbox').addEventListener('click', (e) => {
            e.stopPropagation();
            store.toggleEventCompleted(ev.id);
            this._renderTimetableEvents();
          });

          eventEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this._openEditCourseDrawer(ev);
          });

          containerEl.appendChild(eventEl);
        });
      });
    },

    _updateCurrentTimeIndicator() {
      const indicators = [document.getElementById('current-time-indicator'), document.getElementById('current-time-indicator-mobile')];
      const now = new Date();
      const hour = now.getHours();
      const min = now.getMinutes();

      indicators.forEach(indicator => {
        if (!indicator) return;
        if (hour >= 5 && hour < 24) {
          const topPx = ((hour - 5) + min / 60) * 56;
          indicator.style.top = `${topPx}px`;
          indicator.classList.remove('hidden');
        } else {
          indicator.classList.add('hidden');
        }
      });
    },

    _renderMiniCalendar() {
      const grid = document.getElementById('mini-cal-grid');
      const title = document.getElementById('mini-cal-title');
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

        const dayImportant = importantDates.filter(imp => imp.date === dateStr);

        if (dayImportant.length > 0) {
          const dot = document.createElement('span');
          dot.className = 'event-dot';
          dot.style.backgroundColor = dayImportant[0].color || '#ff3366';
          cell.appendChild(dot);
          cell.title = dayImportant.map(e => `• ${e.title}`).join('\n');
        }

        cell.addEventListener('click', () => {
          this._openAddImportantDateDrawer(null, dateStr);
        });

        grid.appendChild(cell);
      }
    },

    _renderImportantDates() {
      const container = document.getElementById('important-dates-list');
      if (!container) return;

      const items = store.getImportantDates();
      if (!items.length) {
        container.innerHTML = `<p class="text-xs text-zinc-400 italic py-2 text-center select-none">Aucun événement personnel enregistré.</p>`;
        return;
      }

      container.innerHTML = items.map(item => `
        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-creme-100/90 dark:bg-ink-darkbg/90 border border-creme-200 dark:border-zinc-800 text-xs">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-xs" style="background-color: ${item.color || '#ff3366'};"></span>
            <div class="min-w-0">
              <h4 class="font-extrabold text-ink dark:text-white truncate">${item.title}</h4>
              <p class="text-[10px] text-zinc-500 font-mono font-bold">${item.date || ''}</p>
            </div>
          </div>
          <button data-delete-imp="${item.id}" class="text-zinc-400 hover:text-rose-500 p-1 flex-shrink-0"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
      `).join('');

      if (window.lucide) window.lucide.createIcons();

      container.querySelectorAll('[data-delete-imp]').forEach(btn => {
        btn.addEventListener('click', () => {
          store.deleteImportantDate(btn.dataset.deleteImp);
          this._renderImportantDates();
          this._renderMiniCalendar();
        });
      });
    },

    // TIROIR AJOUT DE COURS
    _openCourseDrawer(prefill = {}) {
      const weekDays = this._getWeekDates(this.activeMonday);
      const defaultDateStr = prefill.date || weekDays[0].dateStr;
      const calendars = store.getCalendars();

      const content = `
        <form id="drawer-course-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Intitulé du cours / activité *</label>
            <input type="text" id="dev-title" required placeholder="Ex: Algèbre linéaire" class="custom-input w-full text-xs px-4 py-3 rounded-2xl font-bold">
          </div>

          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Calendrier associé *</label>
            <select id="dev-calendar" class="custom-select w-full text-xs px-4 py-3 rounded-2xl font-bold">
              ${calendars.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Date exacte *</label>
              <input type="date" id="dev-date" required value="${defaultDateStr}" class="custom-input w-full text-xs px-4 py-2.5 rounded-2xl font-mono">
            </div>
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Heure de début *</label>
              <select id="dev-start" class="custom-select w-full text-xs px-4 py-3 rounded-2xl font-bold">
                ${this._getTimeSelectOptions(prefill.startTime || '08:00')}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Durée</label>
              <select id="dev-duration" class="custom-select w-full text-xs px-4 py-3 rounded-2xl font-bold">
                <option value="30" ${prefill.duration === 30 ? 'selected' : ''}>30 min</option>
                <option value="45" ${prefill.duration === 45 ? 'selected' : ''}>45 min</option>
                <option value="60" ${prefill.duration === 60 ? 'selected' : ''}>1h (60 min)</option>
                <option value="90" ${prefill.duration === 90 ? 'selected' : ''}>1h30 (90 min)</option>
                <option value="105" ${prefill.duration === 105 ? 'selected' : ''}>1h45 (105 min)</option>
                <option value="120" ${(!prefill.duration || prefill.duration === 120) ? 'selected' : ''}>2h (120 min)</option>
                <option value="180" ${prefill.duration === 180 ? 'selected' : ''}>3h (180 min)</option>
                <option value="240" ${prefill.duration === 240 ? 'selected' : ''}>4h (240 min)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Salle / Lieu</label>
              <input type="text" id="dev-room" placeholder="Ex: Amphi Poincaré" class="custom-input w-full text-xs px-4 py-2.5 rounded-2xl">
            </div>
          </div>
        </form>
      `;

      Drawer.open({
        title: 'Ajouter un cours à l\'EDT',
        icon: '<i data-lucide="plus-circle" class="w-5 h-5"></i>',
        content,
        footer: `
          <button id="cancel-course-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500 hover:text-ink">Annuler</button>
          <button id="save-course-btn" class="px-6 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-md shadow-solaire-500/25 transition-all">Enregistrer</button>
        `,
        onOpen: (panelEl) => {
          panelEl.querySelector('#cancel-course-btn').addEventListener('click', () => Drawer.close());
          panelEl.querySelector('#save-course-btn').addEventListener('click', () => {
            const title = panelEl.querySelector('#dev-title').value.trim();
            const dateVal = panelEl.querySelector('#dev-date').value;
            const calendarId = panelEl.querySelector('#dev-calendar').value;
            if (!title || !dateVal) { Toast.warning('Veuillez renseigner le nom et la date.'); return; }

            const dObj = new Date(dateVal);
            const daysMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const dayKey = daysMap[dObj.getDay()];

            store.addEvent({
              calendarId,
              title,
              date: dateVal,
              day: dayKey,
              startTime: panelEl.querySelector('#dev-start').value,
              duration: parseInt(panelEl.querySelector('#dev-duration').value, 10),
              room: panelEl.querySelector('#dev-room').value.trim(),
              completed: false
            });

            Drawer.close();
            this._renderTimetableEvents();
          });
        }
      });
    },

    // TIROIR ÉDITION DE COURS
    _openEditCourseDrawer(event) {
      const calendars = store.getCalendars();

      const content = `
        <form id="edit-course-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Intitulé du cours *</label>
            <input type="text" id="ed-title" required value="${event.title}" class="custom-input w-full text-xs px-4 py-3 rounded-2xl font-bold">
          </div>

          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Calendrier associé</label>
            <select id="ed-calendar" class="custom-select w-full text-xs px-4 py-3 rounded-2xl font-bold">
              ${calendars.map(c => `<option value="${c.id}" ${event.calendarId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Date</label>
              <input type="date" id="ed-date" required value="${event.date || ''}" class="custom-input w-full text-xs px-4 py-2.5 rounded-2xl font-mono">
            </div>
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Heure début</label>
              <select id="ed-start" class="custom-select w-full text-xs px-4 py-3 rounded-2xl font-bold">
                ${this._getTimeSelectOptions(event.startTime || '08:00')}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Durée</label>
              <select id="ed-duration" class="custom-select w-full text-xs px-4 py-3 rounded-2xl font-bold">
                <option value="30" ${event.duration === 30 ? 'selected' : ''}>30 min</option>
                <option value="45" ${event.duration === 45 ? 'selected' : ''}>45 min</option>
                <option value="60" ${event.duration === 60 ? 'selected' : ''}>1h (60 min)</option>
                <option value="90" ${event.duration === 90 ? 'selected' : ''}>1h30 (90 min)</option>
                <option value="105" ${event.duration === 105 ? 'selected' : ''}>1h45 (105 min)</option>
                <option value="120" ${event.duration === 120 ? 'selected' : ''}>2h (120 min)</option>
                <option value="180" ${event.duration === 180 ? 'selected' : ''}>3h (180 min)</option>
                <option value="240" ${event.duration === 240 ? 'selected' : ''}>4h (240 min)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Salle</label>
              <input type="text" id="ed-room" value="${event.room || ''}" placeholder="Ex: Amphi Poincaré" class="custom-input w-full text-xs px-4 py-2.5 rounded-2xl">
            </div>
          </div>
        </form>
      `;

      Drawer.open({
        title: 'Modifier le cours',
        icon: '<i data-lucide="edit-3" class="w-5 h-5 text-orangePop-500"></i>',
        content,
        footer: `
          <button id="delete-course-btn" class="px-4 py-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl text-xs font-black mr-auto transition-all">Supprimer</button>
          <button id="cancel-edit-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500 hover:text-ink">Annuler</button>
          <button id="update-course-btn" class="px-6 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-md shadow-solaire-500/25 transition-all">Sauvegarder</button>
        `,
        onOpen: (panelEl) => {
          panelEl.querySelector('#cancel-edit-btn').addEventListener('click', () => Drawer.close());

          panelEl.querySelector('#update-course-btn').addEventListener('click', () => {
            const title = panelEl.querySelector('#ed-title').value.trim();
            const dateVal = panelEl.querySelector('#ed-date').value;
            const calendarId = panelEl.querySelector('#ed-calendar').value;
            if (!title || !dateVal) { Toast.warning('Veuillez renseigner le titre et la date.'); return; }

            const dObj = new Date(dateVal);
            const daysMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const dayKey = daysMap[dObj.getDay()];

            store.updateEvent(event.id, {
              title,
              date: dateVal,
              day: dayKey,
              calendarId,
              startTime: panelEl.querySelector('#ed-start').value,
              duration: parseInt(panelEl.querySelector('#ed-duration').value, 10),
              room: panelEl.querySelector('#ed-room').value.trim()
            });

            Drawer.close();
            this._renderTimetableEvents();
          });

          panelEl.querySelector('#delete-course-btn').addEventListener('click', () => {
            if (confirm(`Supprimer le cours "${event.title}" ?`)) {
              store.deleteEvent(event.id);
              Drawer.close();
              this._renderTimetableEvents();
            }
          });
        }
      });
    },

    // TIROIR GESTION DES CALENDRIERS
    _openManageCalendarsDrawer(container) {
      const calendars = store.getCalendars();
      const allEvents = store.getEvents();

      const content = `
        <div class="space-y-6">
          <div class="p-5 rounded-3xl bg-creme-100 dark:bg-ink-darkbg border border-creme-300 dark:border-ink-border space-y-4 shadow-xs">
            <h4 class="text-xs font-black uppercase tracking-wider text-ink dark:text-white flex items-center gap-1.5">
              <i data-lucide="plus-circle" class="w-4 h-4 text-solaire-500"></i>
              Créer un calendrier manuel
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Nom du calendrier *</label>
                <input type="text" id="manual-cal-name" placeholder="Ex: Perso, Sport..." class="custom-input w-full text-xs px-3 py-2 rounded-xl font-bold">
              </div>
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Couleur associée *</label>
                <select id="mcal-color" class="custom-select flex-1 text-xs px-3 py-2.5 rounded-2xl font-bold">
                  ${CALENDAR_COLORS.map(c => `<option value="${c.hex}" data-color="${c.hex}">${c.name}</option>`).join('')}
                </select>
              </div>
            </div>

            <button id="btn-create-manual-cal" class="w-full py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Créer le calendrier</span>
            </button>
          </div>

          <div class="p-5 rounded-3xl bg-creme-100/70 dark:bg-ink-darkbg/70 border border-creme-300 dark:border-zinc-800 space-y-3.5">
            <h4 class="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <i data-lucide="download-cloud" class="w-4 h-4 text-orangePop-500"></i>
              Ou Synchroniser un flux iCal / Webcal
            </h4>

            <div>
              <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Nom du flux</label>
              <input type="text" id="ics-cal-name" placeholder="Ex: ESILV / ADE Campus" class="custom-input w-full text-xs px-3 py-2 rounded-xl font-bold">
            </div>

            <div>
              <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Lien URL permanent</label>
              <div class="flex gap-2">
                <input type="text" id="ics-cal-url" placeholder="https://... ou webcal://..." class="custom-input w-full text-xs px-3 py-2 rounded-xl font-mono">
                <button id="btn-import-ics-url" class="px-4 py-2 bg-orangePop-500 hover:bg-orangePop-600 text-white rounded-xl text-xs font-black flex-shrink-0 flex items-center gap-1 shadow-sm">
                  <span>Sync</span>
                </button>
              </div>
            </div>
          </div>

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
                      <span class="w-4 h-4 rounded-full flex-shrink-0 shadow-xs" style="background-color: ${cal.color};"></span>
                      <div>
                        <h5 class="text-xs font-black text-ink dark:text-white">${cal.name}</h5>
                        <p class="text-[10px] text-zinc-500 font-bold">${count} cours associés</p>
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

      Drawer.open({
        title: 'Gérer les Calendriers de l\'EDT',
        content,
        footer: `<button id="close-manage-cal-btn" class="px-5 py-2.5 bg-ink dark:bg-white text-white dark:text-ink hover:opacity-90 rounded-2xl text-xs font-black">Fermer</button>`,
        onOpen: (panelEl) => {
          panelEl.querySelector('#close-manage-cal-btn').addEventListener('click', () => Drawer.close());

          panelEl.querySelector('#btn-create-manual-cal').addEventListener('click', () => {
            const name = panelEl.querySelector('#manual-cal-name').value.trim();
            const color = panelEl.querySelector('#mcal-color').value;
            if (!name) { Toast.warning('Veuillez renseigner un nom pour le calendrier.'); return; }

            store.addCalendar(name, color, '');
            Drawer.close();
            this.render(container);
          });

          panelEl.querySelector('#btn-import-ics-url').addEventListener('click', async () => {
            const name = panelEl.querySelector('#ics-cal-name').value.trim() || 'EDT École';
            const url = panelEl.querySelector('#ics-cal-url').value.trim();
            if (!url) { Toast.warning('Veuillez renseigner une URL de flux.'); return; }

            try {
              const newCal = store.addCalendar(name, '#ff3366', url);
              const events = await ICSParser.fetchFromUrl(url, newCal.id);
              events.forEach(e => store.addEvent(e));
              Drawer.close();
              this.render(container);
            } catch (err) {
              Toast.error(err.message || 'Erreur lors de l\'import.');
            }
          });

          panelEl.querySelectorAll('[data-delete-cal]').forEach(btn => {
            btn.addEventListener('click', () => {
              const calId = btn.dataset.deleteCal;
              const cal = store.getCalendar(calId);
              if (confirm(`Supprimer le calendrier "${cal ? cal.name : ''}" et retirer tous ses cours ?`)) {
                store.deleteCalendar(calId);
                Drawer.close();
                this.render(container);
              }
            });
          });
        }
      });
    },

    // TIROIR ÉVÉNEMENT PERSONNEL (Mini-calendrier)
    _openAddImportantDateDrawer(container, prefilledDate = null) {
      const defaultDate = prefilledDate || new Date().toISOString().split('T')[0];

      const content = `
        <form id="add-imp-date-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Intitulé de l'événement *</label>
            <input type="text" id="imp-title" required placeholder="Ex: Anniversaire, DS Maths, Rendez-vous..." class="custom-input w-full text-xs px-4 py-3 rounded-2xl font-bold">
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Date de l'événement *</label>
              <input type="date" id="imp-date" required value="${defaultDate}" class="custom-input w-full text-xs px-4 py-2.5 rounded-2xl font-mono">
            </div>
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Couleur de la pastille *</label>
              <select id="imp-color" class="custom-select w-full text-xs px-3 py-2.5 rounded-2xl font-bold">
                ${CALENDAR_COLORS.map(c => `<option value="${c.hex}" data-color="${c.hex}">${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
        </form>
      `;

      Drawer.open({
        title: 'Ajouter un événement personnel',
        icon: '<i data-lucide="bookmark" class="w-5 h-5 text-orangePop-500"></i>',
        content,
        footer: `
          <button id="imp-cancel-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="save-imp-btn" class="px-6 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-sm transition-all">Enregistrer</button>
        `,
        onOpen: (panelEl) => {
          panelEl.querySelector('#imp-cancel-btn').addEventListener('click', () => Drawer.close());
          panelEl.querySelector('#save-imp-btn').addEventListener('click', () => {
            const title = panelEl.querySelector('#imp-title').value.trim();
            const date = panelEl.querySelector('#imp-date').value;
            const color = panelEl.querySelector('#imp-color').value;
            if (!title || !date) { Toast.warning('Veuillez renseigner le titre et la date.'); return; }

            store.addImportantDate({ title, date, color });
            Drawer.close();
            this._renderMiniCalendar();
            this._renderImportantDates();
          });
        }
      });
    },

    // INTERACTIVITÉ GLISSER/ÉTIRER SUR LA GRILLE
    _initDragToCreateEvents(container) {
      const HOUR_HEIGHT = 56;
      const START_HOUR = 5;

      const columns = container.querySelectorAll('.timetable-column');

      columns.forEach(col => {
        const dateStr = col.dataset.colDatestr;
        if (!dateStr) return;

        const getYFromEvent = (e) => {
          const rect = col.getBoundingClientRect();
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          return Math.max(0, Math.min(rect.height, clientY - rect.top));
        };

        const yToMinutes = (y) => {
          const totalHours = y / HOUR_HEIGHT;
          const totalMin = (START_HOUR * 60) + Math.round((totalHours * 60) / 15) * 15;
          return Math.max(5 * 60, Math.min(23 * 60 + 45, totalMin));
        };

        const formatMinToTime = (min) => {
          const h = Math.floor(min / 60);
          const m = min % 60;
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        let startY = 0;
        let startMin = 0;
        let isDragging = false;
        let selectionEl = null;

        const startSelection = (e) => {
          if (e.target.closest('.timetable-event')) return;

          startY = getYFromEvent(e);
          startMin = yToMinutes(startY);
          isDragging = true;

          selectionEl = document.createElement('div');
          selectionEl.className = 'timetable-drag-selection';
          selectionEl.style.top = `${((startMin - (START_HOUR * 60)) / 60) * HOUR_HEIGHT}px`;
          selectionEl.style.height = `20px`;
          selectionEl.innerHTML = `<span class="timetable-drag-badge">${formatMinToTime(startMin)}</span>`;
          col.appendChild(selectionEl);

          const moveHandler = (ev) => {
            if (!isDragging || !selectionEl) return;
            const currentY = getYFromEvent(ev);
            const currentMin = yToMinutes(currentY);

            const sMin = Math.min(startMin, currentMin);
            const eMin = Math.max(startMin, currentMin) + 15;
            const duration = eMin - sMin;

            const topPx = ((sMin - (START_HOUR * 60)) / 60) * HOUR_HEIGHT;
            const heightPx = Math.max(24, (duration / 60) * HOUR_HEIGHT);

            selectionEl.style.top = `${topPx}px`;
            selectionEl.style.height = `${heightPx}px`;

            const durHours = Math.floor(duration / 60);
            const durMins = duration % 60;
            const durLabel = durHours > 0 ? `${durHours}h${durMins > 0 ? String(durMins).padStart(2, '0' ) : ''}` : `${durMins}min`;

            selectionEl.innerHTML = `
              <span class="timetable-drag-badge">${formatMinToTime(sMin)} - ${formatMinToTime(eMin)} (${durLabel})</span>
              <span class="text-[9px] font-bold text-solaire-700 dark:text-solaire-300 self-end opacity-90 select-none">Relâcher pour créer</span>
            `;
          };

          const upHandler = (ev) => {
            if (!isDragging) return;
            isDragging = false;
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('mouseup', upHandler);
            window.removeEventListener('touchmove', moveHandler);
            window.removeEventListener('touchend', upHandler);

            const currentY = getYFromEvent(ev);
            const currentMin = yToMinutes(currentY);

            const sMin = Math.min(startMin, currentMin);
            const eMin = Math.max(startMin, currentMin) + (Math.abs(currentMin - startMin) < 15 ? 120 : 15);
            const duration = Math.max(30, eMin - sMin);

            if (selectionEl) {
              selectionEl.remove();
              selectionEl = null;
            }

            this._openCourseDrawer({
              date: dateStr,
              startTime: formatMinToTime(sMin),
              duration: duration
            });
          };

          window.addEventListener('mousemove', moveHandler);
          window.addEventListener('mouseup', upHandler);
          window.addEventListener('touchmove', moveHandler, { passive: true });
          window.addEventListener('touchend', upHandler);
        };

        col.addEventListener('mousedown', startSelection);
        col.addEventListener('touchstart', startSelection, { passive: true });
      });
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

      const mobileViewSelect = container.querySelector('#mobile-view-select');
      if (mobileViewSelect) {
        mobileViewSelect.addEventListener('change', () => {
          this.mobileViewDays = parseInt(mobileViewSelect.value, 10);
          const weekDays = this._getWeekDates(this.activeMonday);
          this.activeDayMobileIndex = Math.min(this.activeDayMobileIndex, Math.max(0, weekDays.length - this.mobileViewDays));
          this.render(container);
        });
      }

      const mobilePrevBtn = container.querySelector('#mobile-prev-btn');
      const mobileNextBtn = container.querySelector('#mobile-next-btn');
      const mobileTodayBtn = container.querySelector('#mobile-today-btn');

      if (mobilePrevBtn) {
        mobilePrevBtn.addEventListener('click', () => {
          const weekDays = this._getWeekDates(this.activeMonday);
          const step = this.mobileViewDays;
          const newIdx = this.activeDayMobileIndex - step;
          if (newIdx >= 0) {
            this.activeDayMobileIndex = newIdx;
            this.render(container);
          } else {
            const d = new Date(this.activeMonday);
            d.setDate(d.getDate() - 7);
            this.activeMonday = d;
            this.activeDayMobileIndex = Math.max(0, 7 - step);
            this.render(container);
          }
        });
      }

      if (mobileNextBtn) {
        mobileNextBtn.addEventListener('click', () => {
          const weekDays = this._getWeekDates(this.activeMonday);
          const step = this.mobileViewDays;
          const newIdx = this.activeDayMobileIndex + step;
          if (newIdx + this.mobileViewDays <= weekDays.length) {
            this.activeDayMobileIndex = newIdx;
            this.render(container);
          } else {
            const d = new Date(this.activeMonday);
            d.setDate(d.getDate() + 7);
            this.activeMonday = d;
            this.activeDayMobileIndex = 0;
            this.render(container);
          }
        });
      }

      if (mobileTodayBtn) {
        mobileTodayBtn.addEventListener('click', () => {
          this.activeMonday = getMondayOfDate(new Date());
          const todayStr = new Date().toISOString().split('T')[0];
          const weekDays = this._getWeekDates(this.activeMonday);
          const idx = weekDays.findIndex(w => w.dateStr === todayStr);
          this.activeDayMobileIndex = idx !== -1 ? idx : 0;
          this.render(container);
        });
      }

      container.querySelector('#add-event-btn').addEventListener('click', () => this._openCourseDrawer());
      container.querySelector('#manage-calendars-btn').addEventListener('click', () => this._openManageCalendarsDrawer(container));
      container.querySelector('#add-important-date-btn').addEventListener('click', () => this._openAddImportantDateDrawer(container));

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

      // Filtres To-Do (boutons standard)
      container.querySelectorAll('.todo-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.todoFilter = btn.dataset.filter;
          this.render(container);
        });
      });

      // Écouteur pour le nouveau menu déroulant de catégories To-Do
      const todoCatSelect = container.querySelector('#todo-category-filter-select');
      if (todoCatSelect) {
        todoCatSelect.addEventListener('change', () => {
          const val = todoCatSelect.value;
          this.todoFilter = val === 'all_categories' ? 'all' : val;
          this.render(container);
        });
      }

      // Choix de tag pour nouvelle tâche
      container.querySelectorAll('[data-tag-select]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.selectedTagForNewTodo = btn.dataset.tagSelect;
          container.querySelectorAll('[data-tag-select]').forEach(b => {
            const cat = getCategoryColor(b.dataset.tagSelect);
            const isSel = b.dataset.tagSelect === this.selectedTagForNewTodo;
            b.className = `tag-pill-btn px-3 py-1 rounded-xl text-xs font-black border transition-all ${isSel ? `${cat.bg} ring-2 ring-solaire-500 shadow-xs scale-105` : 'bg-white dark:bg-ink-darkcard border-creme-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-solaire-400'}`;
          });
        });
      });

      const todoForm = container.querySelector('#add-daily-todo-form');
      if (todoForm) {
        todoForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const input = container.querySelector('#daily-todo-text');
          const text = input.value.trim();
          if (text) {
            store.addDailyTodo(text, 'normal', this.selectedTagForNewTodo);
            input.value = '';
            this.render(container);
          }
        });
      }

      container.querySelectorAll('[data-todo-id]').forEach(chk => {
        chk.addEventListener('change', () => {
          store.toggleDailyTodo(chk.dataset.todoId);
          this.render(container);
        });
      });

      container.querySelectorAll('[data-delete-todo]').forEach(btn => {
        btn.addEventListener('click', () => {
          store.deleteDailyTodo(btn.dataset.deleteTodo);
          this.render(container);
        });
      });
    }
  };

  // ==========================================================================
  // 10. VUE MATIÈRES (STICKER MARGUERITE ROSE & ACCORDÉONS)
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
            
            <div class="flex items-center gap-2 bg-creme-200/90 dark:bg-ink-darkbg p-1.5 rounded-2xl border border-creme-300 dark:border-ink-border">
              <button data-subj="maths" class="subj-tab-btn px-5 py-2.5 rounded-xl text-xs font-black transition-all ${this.currentSubject === 'maths' ? 'bg-solaire-500 text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-ink'}">Maths</button>
              <button data-subj="physique" class="subj-tab-btn px-5 py-2.5 rounded-xl text-xs font-black transition-all ${this.currentSubject === 'physique' ? 'bg-orangePop-500 text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-ink'}">Physique</button>
              <button data-subj="info" class="subj-tab-btn px-5 py-2.5 rounded-xl text-xs font-black transition-all ${this.currentSubject === 'info' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-ink'}">Informatique</button>
            </div>

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
      if (addBtn) addBtn.addEventListener('click', () => this._openAddChapterDrawer(container));

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

    _openAddChapterDrawer(container) {
      const theme = SUBJECT_THEMES[this.currentSubject] || SUBJECT_THEMES.maths;
      const content = `
        <form id="add-ch-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Nom de la sous-matière *</label>
            <input type="text" id="ch-title-input" required placeholder="Ex: Réduction des endomorphismes" class="custom-input w-full text-xs px-4 py-3 rounded-2xl font-bold">
          </div>
        </form>
      `;

      Drawer.open({
        title: `Ajouter une sous-matière (${theme.name})`,
        icon: '<i data-lucide="book-open" class="w-5 h-5 text-solaire-500"></i>',
        content,
        footer: `
          <button id="cancel-ch-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="save-ch-btn" class="px-6 py-2.5 ${theme.btnClass} rounded-2xl text-xs font-black shadow-sm">Ajouter</button>
        `,
        onOpen: (panelEl) => {
          panelEl.querySelector('#cancel-ch-btn').addEventListener('click', () => Drawer.close());
          panelEl.querySelector('#save-ch-btn').addEventListener('click', () => {
            const title = panelEl.querySelector('#ch-title-input').value.trim();
            if (!title) return;
            const newChapter = { id: `${this.currentSubject}_ch_${Date.now()}`, title, exosTodo: '', exosHard: '', methods: '' };
            store.addSubjectChapter(this.currentSubject, newChapter);
            this._saveAccordionState(newChapter.id, true);
            Drawer.close();
            this.render(container);
          });
        }
      });
    }
  };

  // ==========================================================================
  // 11. VUE TO-DO LIST LONG TERME
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
            
            <div class="bg-creme-100 dark:bg-ink-darkbg px-5 py-3 rounded-2xl border border-creme-300 dark:border-zinc-800 flex items-center gap-4 shadow-xs">
              <div class="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs bg-solaire-500 text-white shadow-sm flex-shrink-0">
                ${progressPercent}%
              </div>
              <div>
                <div class="text-xs font-black text-ink dark:text-white">${doneCount} / ${totalCount} validé(s)</div>
                <div class="text-[11px] text-zinc-500 font-bold">${progressPercent}% de progression</div>
              </div>
            </div>

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
                            <select data-status-lt="${todo.id}" class="custom-select text-xs font-black px-2.5 py-1 rounded-xl">
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
      CustomDropdown._autoInitPanel(container);
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
      if (addBtn) addBtn.addEventListener('click', () => this._openAddGoalDrawer(null, container));

      const addCatBtn = container.querySelector('#add-cat-btn');
      if (addCatBtn) addCatBtn.addEventListener('click', () => this._openAddCatDrawer(container));

      container.querySelectorAll('[data-add-to-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          this._openAddGoalDrawer(btn.dataset.addToCat, container);
        });
      });

      container.querySelectorAll('[data-delete-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('Supprimer cette catégorie et toutes ses tâches ?')) {
            store.deleteLongtermCategory(btn.dataset.deleteCat);
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
            this.render(container);
          }
        });
      });
    },

    _openAddCatDrawer(container) {
      const content = `
        <form id="add-cat-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Nom de la catégorie *</label>
            <input type="text" id="cat-name-input" required placeholder="Ex: Projets / Inscriptions / Révisions" class="custom-input w-full text-xs px-4 py-3 rounded-2xl font-bold">
          </div>
        </form>
      `;

      Drawer.open({
        title: 'Créer une catégorie',
        icon: '<i data-lucide="folder-plus" class="w-5 h-5 text-solaire-500"></i>',
        content,
        footer: `
          <button id="cancel-cat-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="save-cat-btn" class="px-6 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-sm">Créer</button>
        `,
        onOpen: (panelEl) => {
          panelEl.querySelector('#cancel-cat-btn').addEventListener('click', () => Drawer.close());
          panelEl.querySelector('#save-cat-btn').addEventListener('click', () => {
            const name = panelEl.querySelector('#cat-name-input').value.trim();
            if (!name) return;
            store.addLongtermCategory(name, 'coral');
            Drawer.close();
            this.render(container);
          });
        }
      });
    },

    _openAddGoalDrawer(preselectedCatId, container) {
      const categories = store.getLongtermCategories();
      if (!categories.length) {
        Toast.warning('Veuillez créer une catégorie d\'abord.');
        this._openAddCatDrawer(container);
        return;
      }

      const content = `
        <form id="add-goal-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Titre de la tâche *</label>
            <input type="text" id="goal-title" required placeholder="Ex: Rédiger le rapport PIX" class="custom-input w-full text-xs px-4 py-3 rounded-2xl font-bold">
          </div>
          <div class="grid grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Catégorie *</label>
              <select id="goal-category" class="custom-select w-full text-xs px-4 py-3 rounded-2xl font-bold">
                ${categories.map(c => `<option value="${c.id}" ${preselectedCatId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Priorité</label>
              <select id="goal-priority" class="custom-select w-full text-xs px-4 py-3 rounded-2xl font-bold">
                <option value="normal">Normal</option>
                <option value="urgent">🔥 Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Date limite</label>
            <input type="date" id="goal-deadline" value="${new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}" class="custom-input w-full text-xs px-4 py-2.5 rounded-2xl font-mono">
          </div>
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Notes</label>
            <textarea id="goal-notes" rows="3" placeholder="Détails..." class="custom-textarea w-full text-xs px-4 py-2.5 rounded-2xl font-medium"></textarea>
          </div>
        </form>
      `;

      Drawer.open({
        title: 'Ajouter une tâche long terme',
        icon: '<i data-lucide="plus-circle" class="w-5 h-5 text-solaire-500"></i>',
        content,
        footer: `
          <button id="cancel-goal-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="save-goal-btn" class="px-6 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-md shadow-solaire-500/25">Enregistrer</button>
        `,
        onOpen: (panelEl) => {
          panelEl.querySelector('#cancel-goal-btn').addEventListener('click', () => Drawer.close());
          panelEl.querySelector('#save-goal-btn').addEventListener('click', () => {
            const title = panelEl.querySelector('#goal-title').value.trim();
            const categoryId = panelEl.querySelector('#goal-category').value;
            if (!title) return;
            store.addLongtermTodo({
              title,
              categoryId,
              priority: panelEl.querySelector('#goal-priority').value,
              deadline: panelEl.querySelector('#goal-deadline').value,
              notes: panelEl.querySelector('#goal-notes').value.trim(),
              status: 'todo'
            });
            Drawer.close();
            this.render(container);
          });
        }
      });
    }
  };

  // ==========================================================================
  // 12. VUE FLASHCARDS (RACCOURCIS CLAVIERS ESPACE, GAUCHE, DROITE)
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
      if (createBtn) createBtn.addEventListener('click', () => this._openCreateDeckDrawer(container));

      const importFileBtn = container.querySelector('#import-deck-file-btn');
      if (importFileBtn) importFileBtn.addEventListener('click', () => this._openBatchImportDrawer(container));

      container.querySelectorAll('[data-add-card]').forEach(btn => {
        btn.addEventListener('click', () => this._openAddCardDrawer(btn.dataset.addCard, container));
      });

      container.querySelectorAll('[data-delete-deck]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('Supprimer ce paquet ?')) {
            store.deleteFlashcardDeck(btn.dataset.deleteDeck);
            this.render(container);
          }
        });
      });

      container.querySelectorAll('[data-view-deck]').forEach(btn => {
        btn.addEventListener('click', () => this._openDeckCardsDrawer(btn.dataset.viewDeck, container));
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
        if (this._keyRevisionHandler) {
          document.removeEventListener('keydown', this._keyRevisionHandler);
          this._keyRevisionHandler = null;
        }
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
        if (this._keyRevisionHandler) {
          document.removeEventListener('keydown', this._keyRevisionHandler);
          this._keyRevisionHandler = null;
        }
        this.activeSession = null;
        this.render(container);
      });

      // Raccourcis claviers : [Espace] = Retourner, [←] = À revoir, [→] = Maîtrisé
      if (this._keyRevisionHandler) {
        document.removeEventListener('keydown', this._keyRevisionHandler);
      }
      this._keyRevisionHandler = (e) => {
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
        if (e.code === 'Space') {
          e.preventDefault();
          session.isFlipped = !session.isFlipped;
          cardEl.classList.toggle('flipped', session.isFlipped);
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          container.querySelector('#btn-dont-know')?.click();
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          container.querySelector('#btn-know')?.click();
        }
      };
      document.addEventListener('keydown', this._keyRevisionHandler);
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

    _openBatchImportDrawer(container) {
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
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Nom du paquet *</label>
            <input type="text" id="import-deck-name" placeholder="Ex: Formules Algèbre" class="custom-input w-full text-xs px-4 py-3 rounded-2xl font-bold">
          </div>

          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Fichier (.txt, .md)</label>
            <input type="file" id="import-file-input" accept=".txt,.md" class="w-full text-xs text-zinc-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-solaire-100 file:text-solaire-700 cursor-pointer">
          </div>

          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Ou collez votre texte :</label>
            <textarea id="import-raw-text" rows="5" placeholder="Définition matrice nilpotente ? ::: $\\exists p \\in \\mathbb{N}, A^p = 0$" class="custom-textarea w-full text-xs font-mono p-3.5 rounded-2xl"></textarea>
          </div>
        </div>
      `;

      Drawer.open({
        title: 'Importer des flashcards',
        icon: '<i data-lucide="file-up" class="w-5 h-5 text-solaire-500"></i>',
        content,
        footer: `
          <button id="cancel-batch-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500 hover:text-ink">Annuler</button>
          <button id="confirm-batch-import-btn" class="px-6 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-sm transition-all">Importer</button>
        `,
        onOpen: (panelEl) => {
          const rawTextEl = panelEl.querySelector('#import-raw-text');
          const fileInput = panelEl.querySelector('#import-file-input');
          const deckNameInput = panelEl.querySelector('#import-deck-name');

          fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!deckNameInput.value) deckNameInput.value = file.name.replace(/\.[^/.]+$/, '');
            const reader = new FileReader();
            reader.onload = (ev) => { rawTextEl.value = ev.target.result; };
            reader.readAsText(file);
          });

          panelEl.querySelector('#cancel-batch-btn').addEventListener('click', () => Drawer.close());
          panelEl.querySelector('#confirm-batch-import-btn').addEventListener('click', () => {
            const deckName = deckNameInput.value.trim() || 'Lot de flashcards';
            const cards = this._parseCards(rawTextEl.value);

            if (!cards.length) { Toast.warning('Aucune carte détectée.'); return; }
            store.addFlashcardDeck({ subject: 'Maths', deckName, cards });
            Drawer.close();
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

    _openCreateDeckDrawer(container) {
      const content = `
        <form id="create-deck-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Nom du paquet *</label>
            <input type="text" id="new-deck-name" required placeholder="Ex: Formules Réduction" class="custom-input w-full text-xs px-4 py-3 rounded-2xl font-bold">
          </div>
        </form>
      `;

      Drawer.open({
        title: 'Nouveau paquet de flashcards',
        icon: '<i data-lucide="plus-circle" class="w-5 h-5 text-solaire-500"></i>',
        content,
        footer: `
          <button id="cancel-nd-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500 hover:text-ink">Annuler</button>
          <button id="save-nd-btn" class="px-6 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-sm transition-all">Créer</button>
        `,
        onOpen: (panelEl) => {
          panelEl.querySelector('#cancel-nd-btn').addEventListener('click', () => Drawer.close());
          panelEl.querySelector('#save-nd-btn').addEventListener('click', () => {
            const deckName = panelEl.querySelector('#new-deck-name').value.trim();
            if (!deckName) return;
            store.addFlashcardDeck({ subject: 'Maths', deckName, cards: [] });
            Drawer.close();
            this.render(container);
          });
        }
      });
    },

    _openAddCardDrawer(deckId, container) {
      const content = `
        <form id="add-card-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Recto (Question / Formule) *</label>
            <textarea id="card-front-input" rows="3" required placeholder="Ex: Définition valeur propre $\\lambda$ ?" class="custom-textarea w-full text-xs font-mono p-4 rounded-2xl"></textarea>
          </div>
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Verso (Réponse / Démonstration) *</label>
            <textarea id="card-back-input" rows="4" required placeholder="Ex: $u(x) = \\lambda x$ avec $x \\neq 0$" class="custom-textarea w-full text-xs font-mono p-4 rounded-2xl"></textarea>
          </div>
        </form>
      `;

      Drawer.open({
        title: 'Ajouter une carte',
        icon: '<i data-lucide="plus-circle" class="w-5 h-5 text-solaire-500"></i>',
        content,
        footer: `
          <button id="cancel-card-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500 hover:text-ink">Annuler</button>
          <button id="save-card-btn" class="px-6 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-sm transition-all">Ajouter</button>
        `,
        onOpen: (panelEl) => {
          panelEl.querySelector('#cancel-card-btn').addEventListener('click', () => Drawer.close());
          panelEl.querySelector('#save-card-btn').addEventListener('click', () => {
            const front = panelEl.querySelector('#card-front-input').value.trim();
            const back = panelEl.querySelector('#card-back-input').value.trim();
            if (!front || !back) return;
            store.addCardsToDeck(deckId, [{ front, back }]);
            Drawer.close();
            this.render(container);
          });
        }
      });
    },

    _openDeckCardsDrawer(deckId, container) {
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

      Drawer.open({
        title: `Cartes de "${deck.deckName}"`,
        content,
        footer: `<button id="close-deck-m-btn" class="px-5 py-2 bg-ink dark:bg-white text-white dark:text-ink rounded-2xl text-xs font-black">Fermer</button>`,
        onOpen: (panelEl) => {
          panelEl.querySelector('#close-deck-m-btn').addEventListener('click', () => Drawer.close());
          panelEl.querySelectorAll('[data-del-card]').forEach(btn => {
            btn.addEventListener('click', () => {
              deck.cards = deck.cards.filter(c => c.id !== btn.dataset.delCard);
              store.save();
              Drawer.close();
              this.render(container);
            });
          });
        }
      });
    }
  };

  // ==========================================================================
  // 13. VUE NOTES & SEMESTRE
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

          <div class="space-y-8">
            ${computedBlocks.map(block => `
              <div class="bg-white dark:bg-ink-darkcard rounded-3xl border border-creme-300 dark:border-ink-border shadow-sm overflow-hidden p-6 space-y-6">
                
                <div class="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-creme-200 dark:border-ink-border">
                  <div class="flex items-center gap-3">
                    <span class="w-3.5 h-3.5 rounded-full ${block.isValidated ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                    <h3 class="text-base font-black text-ink dark:text-white tracking-wide">BLOC ${block.name}</h3>
                  </div>

                  <div class="text-xs font-black px-4 py-2 rounded-2xl border ${block.isValidated ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'}">
                    Moyenne du bloc : <span class="font-mono text-sm">${block.blockAverage !== null ? block.blockAverage.toFixed(2) : '--'} / 20</span> ${block.isValidated ? '✓ Validé' : '✗ Non validé (< 10)'}
                  </div>
                </div>

                <div class="space-y-6">
                  ${block.subjects.map(subject => `
                    <div class="rounded-2xl border border-creme-300 dark:border-zinc-800 bg-creme-100/60 dark:bg-ink-darkbg/60 overflow-hidden">
                      
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

                      <div class="overflow-x-auto grade-table p-2">
                        ${(!subject.evaluations || subject.evaluations.length === 0) ? `
                          <p class="text-xs text-zinc-400 italic py-4 text-center select-none">Aucune épreuve renseignée pour cette matière. Cliquez sur "+ Ajouter une épreuve".</p>
                        ` : `
                          <table class="w-full text-left text-xs">
                            <thead class="text-[10px] uppercase tracking-wider text-zinc-400 border-b border-creme-200 dark:border-zinc-800 font-black">
                              <tr>
                                <th class="py-2.5 px-4">Épreuve</th>
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
                                    <select data-block="${block.id}" data-sub="${subject.id}" data-eval="${ev.id}" data-field="bonus" class="custom-select w-24 text-xs font-black py-1 px-2 rounded-xl">
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
      CustomDropdown._autoInitPanel(container);
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
          this._openAddEvalDrawer(blockId, subjectId, container);
        });
      });

      container.querySelectorAll('[data-delete-eval]').forEach(btn => {
        btn.addEventListener('click', () => {
          const blockId = btn.dataset.block;
          const subId = btn.dataset.sub;
          const evalId = btn.dataset.deleteEval;
          if (confirm('Supprimer cette épreuve ?')) {
            store.deleteEvaluation(blockId, subId, evalId);
            this.render(container);
          }
        });
      });
    },

    _openAddEvalDrawer(blockId, subjectId, container) {
      const gradesData = store.getGradesData();
      const block = (gradesData.blocks || []).find(b => b.id === blockId);
      const subject = block ? (block.subjects || []).find(s => s.id === subjectId) : null;
      const subName = subject ? subject.name : 'la matière';

      const content = `
        <form id="add-eval-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Intitulé de l'épreuve *</label>
            <input type="text" id="eval-name" required placeholder="Ex: DS 2 / Examen final / TP noté" class="custom-input w-full text-xs px-4 py-3 rounded-2xl font-bold">
          </div>
          <div class="grid grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Note (/20)</label>
              <input type="number" step="0.25" min="0" max="20" id="eval-grade" placeholder="--" class="custom-input w-full text-xs px-4 py-2.5 rounded-2xl font-mono">
            </div>
            <div>
              <label class="block text-xs font-black text-ink dark:text-zinc-300 mb-1.5">Coefficient *</label>
              <input type="number" step="0.5" min="0.5" max="20" id="eval-coef" required value="2" class="custom-input w-full text-xs px-4 py-2.5 rounded-2xl font-mono">
            </div>
          </div>
        </form>
      `;

      Drawer.open({
        title: `Ajouter une épreuve (${subName})`,
        icon: '<i data-lucide="plus-circle" class="w-5 h-5 text-solaire-500"></i>',
        content,
        footer: `
          <button id="cancel-eval-btn" class="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-500">Annuler</button>
          <button id="save-eval-btn" class="px-6 py-2.5 bg-solaire-500 hover:bg-solaire-600 text-white rounded-2xl text-xs font-black shadow-sm">Ajouter</button>
        `,
        onOpen: (panelEl) => {
          panelEl.querySelector('#cancel-eval-btn').addEventListener('click', () => Drawer.close());
          panelEl.querySelector('#save-eval-btn').addEventListener('click', () => {
            const name = panelEl.querySelector('#eval-name').value.trim();
            const gradeVal = panelEl.querySelector('#eval-grade').value;
            const coef = parseFloat(panelEl.querySelector('#eval-coef').value) || 1;
            if (!name) return;

            store.addEvaluation(blockId, subjectId, {
              id: 'ev_' + Date.now(),
              name,
              grade: gradeVal !== '' ? parseFloat(gradeVal) : null,
              coef,
              bonus: 0
            });
            Drawer.close();
            this.render(container);
          });
        }
      });
    }
  };

  // ==========================================================================
  // 14. ORCHESTRATEUR PRINCIPAL & NAVIGATION
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
          } else if (remote && remote.notFound) {
            await GitHubSync.commitRemoteData(store.data, 'Initial commit: StudyFlow data.json');
          }
        } catch (err) {
          console.warn('Sync GitHub au démarrage:', err);
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
        syncBtn.addEventListener('click', () => this._openGitHubSettingsDrawer());
      }
    }

    _openGitHubSettingsDrawer() {
      const cfg = GitHubSync.getConfig();
      const isConf = GitHubSync.isConfigured();
      const lastSyncStr = GitHubSync.lastSyncTime ? GitHubSync.lastSyncTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Aucune';

      const content = `
        <div class="space-y-5">
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
              Vos données sont sauvegardées en continu dans le fichier <code>${cfg.path || 'data.json'}</code> sur votre dépôt GitHub.
            </p>
          </div>

          <form id="github-config-form" class="space-y-3.5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Utilisateur / Organisation *</label>
                <input type="text" id="gh-owner" required value="${cfg.owner || ''}" placeholder="Ex: mon-pseudo" class="custom-input w-full text-xs px-3 py-2 rounded-xl font-bold">
              </div>
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Nom du Dépôt *</label>
                <input type="text" id="gh-repo" required value="${cfg.repo || ''}" placeholder="Ex: site_orga" class="custom-input w-full text-xs px-3 py-2 rounded-xl font-bold">
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Branche *</label>
                <input type="text" id="gh-branch" required value="${cfg.branch || 'main'}" placeholder="main" class="custom-input w-full text-xs px-3 py-2 rounded-xl font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">Chemin du fichier *</label>
                <input type="text" id="gh-path" required value="${cfg.path || 'data.json'}" placeholder="data.json" class="custom-input w-full text-xs px-3 py-2 rounded-xl font-mono">
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-black text-ink dark:text-zinc-300 mb-1">
                Personal Access Token (PAT) GitHub *
              </label>
              <div class="relative">
                <input type="password" id="gh-token" required value="${cfg.token || ''}" placeholder="ghp_... ou github_pat_..." class="custom-input w-full text-xs px-3 py-2 pr-10 rounded-xl font-mono">
                <button type="button" id="gh-toggle-token" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-ink dark:hover:text-white p-1">
                  <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          </form>

          <div class="p-3.5 rounded-2xl bg-creme-100/70 dark:bg-ink-darkbg/70 border border-creme-300 dark:border-zinc-800 flex items-center justify-between text-xs font-bold">
            <span class="text-zinc-500">Dernière sync : <span class="font-mono text-ink dark:text-white">${lastSyncStr}</span></span>
            <button id="gh-test-btn" class="px-3 py-1.5 rounded-xl bg-creme-200 hover:bg-creme-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-ink dark:text-white text-xs font-black transition-colors flex items-center gap-1">
              <i data-lucide="zap" class="w-3.5 h-3.5 text-orangePop-500"></i>
              <span>Tester la connexion</span>
            </button>
          </div>

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

      Drawer.open({
        title: 'Synchronisation GitHub',
        icon: '<i data-lucide="github" class="w-5 h-5 text-ink dark:text-white"></i>',
        content,
        maxWidth: 'max-w-lg',
        footer: `
          <button id="gh-disconnect-btn" class="px-4 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-black mr-auto ${isConf ? '' : 'hidden'}">Déconnecter</button>
          <button id="gh-cancel-btn" class="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500">Fermer</button>
          <button id="gh-save-btn" class="px-5 py-2 bg-solaire-500 hover:bg-solaire-600 text-white rounded-xl text-xs font-black shadow-md shadow-solaire-500/25">Enregistrer &amp; Sync</button>
        `,
        onOpen: (panelEl) => {
          const toggleBtn = panelEl.querySelector('#gh-toggle-token');
          const tokenInput = panelEl.querySelector('#gh-token');
          toggleBtn.addEventListener('click', () => {
            tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
          });

          panelEl.querySelector('#gh-cancel-btn').addEventListener('click', () => Drawer.close());

          panelEl.querySelector('#gh-test-btn').addEventListener('click', async () => {
            const testCfg = {
              owner: panelEl.querySelector('#gh-owner').value.trim(),
              repo: panelEl.querySelector('#gh-repo').value.trim(),
              branch: panelEl.querySelector('#gh-branch').value.trim() || 'main',
              path: panelEl.querySelector('#gh-path').value.trim() || 'data.json',
              token: panelEl.querySelector('#gh-token').value.trim()
            };

            try {
              const repoInfo = await GitHubSync.testConnection(testCfg);
              alert(`Connexion réussie au dépôt "${repoInfo.full_name}" !`);
            } catch (err) {
              Toast.error(`Échec connexion : ${err.message}`);
            }
          });

          panelEl.querySelector('#gh-save-btn').addEventListener('click', async () => {
            const newCfg = {
              owner: panelEl.querySelector('#gh-owner').value.trim(),
              repo: panelEl.querySelector('#gh-repo').value.trim(),
              branch: panelEl.querySelector('#gh-branch').value.trim() || 'main',
              path: panelEl.querySelector('#gh-path').value.trim() || 'data.json',
              token: panelEl.querySelector('#gh-token').value.trim()
            };

            if (!newCfg.owner || !newCfg.repo || !newCfg.token) {
              Toast.warning('Veuillez renseigner tous les champs obligatoires.');
              return;
            }

            try {
              await GitHubSync.testConnection(newCfg);
              GitHubSync.saveConfig(newCfg);

              const remote = await GitHubSync.fetchRemoteData(newCfg);
              if (remote && remote.data) {
                store.applyRemoteData(remote.data);
              } else {
                await GitHubSync.commitRemoteData(store.data, 'Initial commit: StudyFlow data.json');
              }

              Drawer.close();
              this.navigateTo(this.currentPage);
            } catch (err) {
              Toast.error(`Erreur GitHub : ${err.message}`);
            }
          });

          const pushBtn = panelEl.querySelector('#gh-push-btn');
          if (pushBtn) {
            pushBtn.addEventListener('click', async () => {
              try {
                await GitHubSync.commitRemoteData(store.data, 'Manual sync from StudyFlow');
                Drawer.close();
              } catch (err) {
                Toast.error(`Échec envoi GitHub : ${err.message}`);
              }
            });
          }

          const pullBtn = panelEl.querySelector('#gh-pull-btn');
          if (pullBtn) {
            pullBtn.addEventListener('click', async () => {
              try {
                const remote = await GitHubSync.fetchRemoteData();
                if (remote && remote.data) {
                  store.applyRemoteData(remote.data);
                  Drawer.close();
                  this.navigateTo(this.currentPage);
                } else {
                  Toast.warning('Aucun fichier data.json trouvé sur le dépôt.');
                }
              } catch (err) {
                Toast.error(`Échec rechargement GitHub : ${err.message}`);
              }
            });
          }

          const discBtn = panelEl.querySelector('#gh-disconnect-btn');
          if (discBtn) {
            discBtn.addEventListener('click', () => {
              if (confirm('Déconnecter la synchronisation GitHub ? (Vos données restent en mémoire locale)')) {
                localStorage.removeItem(GITHUB_CONFIG_KEY);
                GitHubSync._updateStatus('unconfigured');
                Drawer.close();
              }
            });
          }

          panelEl.querySelector('#gh-export-local-json').addEventListener('click', () => {
            store.exportJSON();
          });

          panelEl.querySelector('#gh-import-local-json').addEventListener('click', () => {
            const input = document.getElementById('global-json-import-input');
            if (input) {
              input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  if (store.importJSON(ev.target.result)) {
                    Drawer.close();
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