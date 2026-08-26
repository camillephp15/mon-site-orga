/**
 * Dashboard & Timetable View
 * Features:
 * - 7-day timetable (05:00 to 00:00) with Apple Calendar style overlapping algorithm
 * - Desktop 7-col view & Mobile 1-day view with smooth day switcher
 * - Event clickable circle to toggle completion (strikethrough)
 * - Manual event modal + ICS import modal
 * - Interactive mini-calendar with exam/DS highlights
 * - Daily to-do list with quick add and filters
 */

import { store, SUBJECT_COLORS } from '../store.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { ICSParser } from '../icsParser.js';

export const DashboardView = {
  activeDayMobile: 'mon', // 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
  miniCalDate: new Date(),
  todoFilter: 'all', // 'all' | 'pending' | 'completed'

  daysConfig: [
    { key: 'mon', label: 'Lundi', short: 'Lun' },
    { key: 'tue', label: 'Mardi', short: 'Mar' },
    { key: 'wed', label: 'Mercredi', short: 'Mer' },
    { key: 'thu', label: 'Jeudi', short: 'Jeu' },
    { key: 'fri', label: 'Vendredi', short: 'Ven' },
    { key: 'sat', label: 'Samedi', short: 'Sam' },
    { key: 'sun', label: 'Dimanche', short: 'Dim' }
  ],

  render(container) {
    // Determine current day of week to set default mobile view
    const todayDayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon...
    const mapDayIndexToKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    if (!this._hasSetInitialDay) {
      this.activeDayMobile = mapDayIndexToKey[todayDayIndex] || 'mon';
      this._hasSetInitialDay = true;
    }

    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- Left 8/12 or 9/12: Timetable Section -->
        <div class="lg:col-span-8 xl:col-span-9 space-y-4">
          
          <!-- Timetable Top Bar -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
            
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-900/60">
                <i data-lucide="calendar-days" class="w-5 h-5"></i>
              </div>
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Emploi du Temps Hebdomadaire
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">05h00 - 00h00</span>
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Gestion des chevauchements & synchronisation en temps réel</p>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-2">
              <button id="import-ics-btn" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm">
                <i data-lucide="download" class="w-3.5 h-3.5 text-indigo-500"></i>
                <span>Importer ICS</span>
              </button>
              <button id="add-event-btn" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-all flex items-center gap-1.5 shadow-md shadow-brand-500/20">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                <span>Ajouter un cours</span>
              </button>
            </div>

          </div>

          <!-- Mobile Day Switcher (Visible only on < lg screens) -->
          <div class="lg:hidden bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-1 overflow-x-auto">
            ${this.daysConfig.map(d => `
              <button data-day="${d.key}" class="mobile-day-tab flex-1 py-1.5 px-2 rounded-xl text-xs font-medium text-center transition-all ${this.activeDayMobile === d.key ? 'bg-brand-600 text-white font-bold shadow' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                ${d.short}
              </button>
            `).join('')}
          </div>

          <!-- Timetable Grid Container -->
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            
            <!-- Day Column Headers (Desktop: 7 cols, Mobile: 1 col) -->
            <div class="grid grid-cols-[50px_repeat(7,1fr)] max-lg:grid-cols-[50px_1fr] border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
              <div class="py-2.5 text-center text-slate-400 text-[11px] border-r border-slate-200 dark:border-slate-800">Heure</div>
              
              <!-- Desktop headers -->
              ${this.daysConfig.map(d => `
                <div class="hidden lg:flex flex-col items-center justify-center py-2.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0 ${this._isToday(d.key) ? 'bg-brand-50/60 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold' : ''}">
                  <span>${d.label}</span>
                  ${this._isToday(d.key) ? '<span class="text-[10px] text-brand-500 font-normal">Aujourd\'hui</span>' : ''}
                </div>
              `).join('')}

              <!-- Mobile single header -->
              <div class="lg:hidden flex items-center justify-between px-4 py-2.5 text-brand-600 dark:text-brand-400 font-bold">
                <button id="prev-day-btn" class="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
                  <i data-lucide="chevron-left" class="w-4 h-4"></i>
                </button>
                <span>${this.daysConfig.find(d => d.key === this.activeDayMobile)?.label || 'Lundi'}</span>
                <button id="next-day-btn" class="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
                  <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </button>
              </div>

            </div>

            <!-- Scrollable Body with 19 Hours (05:00 to 00:00) -->
            <div class="relative overflow-y-auto max-h-[720px] timetable-grid" id="timetable-scroll-area">
              
              <div class="grid grid-cols-[50px_repeat(7,1fr)] max-lg:grid-cols-[50px_1fr] relative" style="height: calc(19 * var(--hour-height));">
                
                <!-- Time Labels Column (5h00 -> 23h00) -->
                <div class="relative border-r border-slate-200 dark:border-slate-800 select-none text-[11px] text-slate-400 font-mono text-center">
                  ${Array.from({ length: 19 }, (_, i) => i + 5).map(hour => `
                    <div class="absolute left-0 right-0 flex items-center justify-center -translate-y-2.5" style="top: ${(hour - 5) * 54}px;">
                      ${String(hour).padStart(2, '0')}h
                    </div>
                  `).join('')}
                </div>

                <!-- Desktop 7 Day Columns -->
                ${this.daysConfig.map(d => `
                  <div data-col-day="${d.key}" class="hidden lg:block relative border-r border-slate-200/70 dark:border-slate-800/70 last:border-r-0 ${this._isToday(d.key) ? 'bg-brand-500/[0.02]' : ''}">
                    <!-- Events will be dynamically injected here -->
                  </div>
                `).join('')}

                <!-- Mobile 1 Day Column -->
                <div id="mobile-single-day-col" class="lg:hidden relative">
                  <!-- Mobile day events injected here -->
                </div>

                <!-- Current time red line -->
                <div id="current-time-indicator" class="current-time-line hidden"></div>

              </div>

            </div>

          </div>

        </div>

        <!-- Right 4/12 or 3/12: Mini-Calendar & Daily To-Do List -->
        <div class="lg:col-span-4 xl:col-span-3 space-y-6">
          
          <!-- Mini-Calendar Card -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <i data-lucide="calendar" class="w-4 h-4 text-brand-500"></i>
                <span id="mini-cal-month-title">Septembre 2026</span>
              </h3>
              <div class="flex items-center gap-1">
                <button id="mini-cal-prev" class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                  <i data-lucide="chevron-left" class="w-4 h-4"></i>
                </button>
                <button id="mini-cal-today-btn" class="text-[11px] px-2 py-0.5 font-medium rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Aujourd'hui
                </button>
                <button id="mini-cal-next" class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                  <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </button>
              </div>
            </div>

            <!-- Weekday headers -->
            <div class="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400">
              <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
            </div>

            <!-- Days Grid -->
            <div id="mini-cal-grid" class="grid grid-cols-7 gap-1"></div>

            <!-- Important Dates / Exam List -->
            <div class="border-t border-slate-100 dark:border-slate-800 pt-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                  Événements & Partiels
                </span>
                <button id="add-important-date-btn" class="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                  + Ajouter
                </button>
              </div>
              <div id="important-dates-list" class="space-y-1.5 max-h-36 overflow-y-auto"></div>
            </div>

          </div>

          <!-- Daily To-Do List Card -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i>
                  To-Do du Jour
                </h3>
                <p class="text-[11px] text-slate-500" id="todo-completion-count">0 / 0 terminée(s)</p>
              </div>

              <!-- Filter tabs -->
              <div class="flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                <button data-filter="all" class="todo-filter-btn px-2 py-0.5 rounded font-medium ${this.todoFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}">Toutes</button>
                <button data-filter="pending" class="todo-filter-btn px-2 py-0.5 rounded font-medium ${this.todoFilter === 'pending' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}">À faire</button>
              </div>
            </div>

            <!-- Quick Add Input -->
            <form id="add-daily-todo-form" class="flex gap-1.5">
              <input type="text" id="daily-todo-input" placeholder="Ajouter une tâche pour aujourd'hui..." class="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500">
              <select id="daily-todo-tag" class="text-xs px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <option value="Maths">Maths</option>
                <option value="Physique">Physique</option>
                <option value="Info">Info</option>
                <option value="Autre">Autre</option>
              </select>
              <button type="submit" class="p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors">
                <i data-lucide="plus" class="w-4 h-4"></i>
              </button>
            </form>

            <!-- Tasks Container -->
            <div id="daily-todos-container" class="space-y-2 max-h-60 overflow-y-auto"></div>

          </div>

        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    this._bindEvents(container);
    this._renderTimetableEvents();
    this._renderMiniCalendar();
    this._renderImportantDates();
    this._renderDailyTodos();
    this._updateCurrentTimeIndicator();
  },

  _isToday(dayKey) {
    const todayIdx = new Date().getDay();
    const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return map[todayIdx] === dayKey;
  },

  _bindEvents(container) {
    // Mobile day switch tabs
    container.querySelectorAll('.mobile-day-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeDayMobile = btn.dataset.day;
        this.render(container);
      });
    });

    // Mobile prev/next arrows
    const prevBtn = container.querySelector('#prev-day-btn');
    const nextBtn = container.querySelector('#next-day-btn');
    if (prevBtn && nextBtn) {
      const keys = this.daysConfig.map(d => d.key);
      prevBtn.addEventListener('click', () => {
        const curIdx = keys.indexOf(this.activeDayMobile);
        this.activeDayMobile = keys[(curIdx - 1 + keys.length) % keys.length];
        this.render(container);
      });
      nextBtn.addEventListener('click', () => {
        const curIdx = keys.indexOf(this.activeDayMobile);
        this.activeDayMobile = keys[(curIdx + 1) % keys.length];
        this.render(container);
      });
    }

    // Add Course Button
    container.querySelector('#add-event-btn').addEventListener('click', () => {
      this._openAddEventModal();
    });

    // Import ICS Button
    container.querySelector('#import-ics-btn').addEventListener('click', () => {
      this._openImportICSModal();
    });

    // Add Important Date Button
    container.querySelector('#add-important-date-btn').addEventListener('click', () => {
      this._openAddImportantDateModal();
    });

    // Mini-calendar navigation
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

    // Daily todo filter buttons
    container.querySelectorAll('.todo-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.todoFilter = btn.dataset.filter;
        this._renderDailyTodos();
        // Update styling
        container.querySelectorAll('.todo-filter-btn').forEach(b => {
          b.className = `todo-filter-btn px-2 py-0.5 rounded font-medium ${b.dataset.filter === this.todoFilter ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`;
        });
      });
    });

    // Add daily todo form
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

    // Listen to store updates
    this._storeUnsub = store.on('dataChanged', () => {
      this._renderTimetableEvents();
      this._renderMiniCalendar();
      this._renderImportantDates();
      this._renderDailyTodos();
    });
  },

  // --------------------------------------------------------------------------
  // Timetable Layout & Overlapping Algorithm (Apple Calendar style)
  // --------------------------------------------------------------------------
  _renderTimetableEvents() {
    const events = store.getEvents();
    const HOUR_HEIGHT = 54; // px per hour
    const START_HOUR = 5;   // 05:00

    // Render for each day column (Desktop)
    this.daysConfig.forEach(dayConfig => {
      const colEl = document.querySelector(`[data-col-day="${dayConfig.key}"]`);
      if (colEl) {
        colEl.innerHTML = '';
        const dayEvents = events.filter(e => e.day === dayConfig.key);
        this._layoutDayEvents(dayEvents, colEl, HOUR_HEIGHT, START_HOUR);
      }
    });

    // Render for mobile single day
    const mobileColEl = document.getElementById('mobile-single-day-col');
    if (mobileColEl) {
      mobileColEl.innerHTML = '';
      const mobileEvents = events.filter(e => e.day === this.activeDayMobile);
      this._layoutDayEvents(mobileEvents, mobileColEl, HOUR_HEIGHT, START_HOUR);
    }
  },

  _layoutDayEvents(events, containerEl, hourHeight, startHour) {
    if (!events.length) return;

    // Convert time to minutes from startHour (5h00)
    const parsedEvents = events.map(ev => {
      const [h, m] = ev.startTime.split(':').map(Number);
      const startMin = (h - startHour) * 60 + m;
      const endMin = startMin + (ev.duration || 60);
      return { ...ev, startMin, endMin };
    });

    // Sort by startMin, then duration desc
    parsedEvents.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

    // Detect overlapping clusters (connected components)
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

    // For each cluster, assign columns (interval coloring)
    clusters.forEach(cluster => {
      const columns = []; // array of end times for each column

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
        const heightPx = Math.max((ev.duration / 60) * hourHeight - 2, 24); // min 24px
        const widthPct = (100 / totalCols);
        const leftPct = (ev.colIndex / totalCols) * 100;

        const eventEl = document.createElement('div');
        eventEl.className = `timetable-event ${ev.completed ? 'completed' : ''}`;
        eventEl.style.top = `${topPx}px`;
        eventEl.style.height = `${heightPx}px`;
        eventEl.style.left = `calc(${leftPct}% + 2px)`;
        eventEl.style.width = `calc(${widthPct}% - 4px)`;
        eventEl.style.backgroundColor = `${ev.color}18`; // 10% opacity background
        eventEl.style.borderLeftColor = ev.color;
        eventEl.style.color = ev.color;

        // End time calculation
        const startH = parseInt(ev.startTime.split(':')[0], 10);
        const startM = parseInt(ev.startTime.split(':')[1], 10);
        const endTotalM = startH * 60 + startM + ev.duration;
        const endH = Math.floor(endTotalM / 60) % 24;
        const endMinStr = String(endTotalM % 60).padStart(2, '0');
        const endTimeStr = `${String(endH).padStart(2, '0')}:${endMinStr}`;

        eventEl.innerHTML = `
          <div class="flex items-start justify-between gap-1 w-full overflow-hidden">
            <div class="flex items-center gap-1.5 truncate">
              <!-- Clickable Checkbox Circle -->
              <span class="event-checkbox ${ev.completed ? 'checked' : ''}" title="Cocher / Valider le cours" data-toggle-id="${ev.id}"></span>
              <span class="event-title font-bold truncate text-slate-900 dark:text-slate-100">${ev.title}</span>
            </div>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 opacity-90 truncate">
            <span>${ev.startTime} - ${endTimeStr}</span>
            ${ev.room ? `<span class="truncate ml-1 font-medium px-1 rounded bg-black/5 dark:bg-white/10">${ev.room}</span>` : ''}
          </div>
        `;

        // Checkbox click stops propagation and toggles completion
        const chk = eventEl.querySelector('.event-checkbox');
        chk.addEventListener('click', (e) => {
          e.stopPropagation();
          store.toggleEventCompleted(ev.id);
        });

        // Click on event card opens edit/details modal
        eventEl.addEventListener('click', () => {
          this._openEditEventModal(ev);
        });

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

  // --------------------------------------------------------------------------
  // Mini Calendar & Important Dates
  // --------------------------------------------------------------------------
  _renderMiniCalendar() {
    const grid = document.getElementById('mini-cal-grid');
    const title = document.getElementById('mini-cal-month-title');
    if (!grid || !title) return;

    const year = this.miniCalDate.getFullYear();
    const month = this.miniCalDate.getMonth();

    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    title.textContent = `${monthNames[month]} ${year}`;

    grid.innerHTML = '';

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const importantDates = store.getImportantDates();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const cell = document.createElement('div');
      cell.className = 'mini-cal-day text-slate-300 dark:text-slate-700 opacity-40 cursor-default';
      cell.textContent = dayNum;
      grid.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = isCurrentMonth && today.getDate() === day;

      cell.className = `mini-cal-day ${isToday ? 'today' : 'text-slate-700 dark:text-slate-300'}`;
      cell.textContent = day;

      // Check if this date has important events
      const dayEvents = importantDates.filter(imp => imp.date === dateStr);
      if (dayEvents.length > 0) {
        const dot = document.createElement('span');
        dot.className = 'event-dot';
        dot.style.backgroundColor = dayEvents[0].color || '#ef4444';
        cell.appendChild(dot);
        cell.title = dayEvents.map(e => e.title).join('\n');
      }

      grid.appendChild(cell);
    }
  },

  _renderImportantDates() {
    const list = document.getElementById('important-dates-list');
    if (!list) return;

    const items = store.getImportantDates();
    if (!items.length) {
      list.innerHTML = `<p class="text-xs text-slate-400 italic py-1">Aucun partiel ou DS programmé.</p>`;
      return;
    }

    // Sort by date ascending
    const sorted = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));

    list.innerHTML = sorted.map(item => {
      const dateObj = new Date(item.date);
      const dateFormatted = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      return `
        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
          <div class="flex items-center gap-2 truncate">
            <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${item.color || '#ef4444'};"></span>
            <span class="font-semibold text-slate-800 dark:text-slate-200 truncate">${item.title}</span>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="font-mono text-[11px] text-slate-500">${dateFormatted}</span>
            <button data-delete-imp="${item.id}" class="text-slate-400 hover:text-rose-500 p-0.5 rounded">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind delete buttons
    list.querySelectorAll('[data-delete-imp]').forEach(btn => {
      btn.addEventListener('click', () => {
        store.deleteImportantDate(btn.dataset.deleteImp);
        this._renderImportantDates();
        this._renderMiniCalendar();
        Toast.info('Événement supprimé');
      });
    });
  },

  // --------------------------------------------------------------------------
  // Daily To-Do List
  // --------------------------------------------------------------------------
  _renderDailyTodos() {
    const container = document.getElementById('daily-todos-container');
    const countEl = document.getElementById('todo-completion-count');
    if (!container) return;

    let todos = store.getDailyTodos();
    const completedCount = todos.filter(t => t.completed).length;

    if (countEl) {
      countEl.textContent = `${completedCount} / ${todos.length} terminée(s)`;
    }

    if (this.todoFilter === 'pending') {
      todos = todos.filter(t => !t.completed);
    }

    if (!todos.length) {
      container.innerHTML = `<p class="text-xs text-slate-400 italic py-2 text-center">Aucune tâche pour le moment.</p>`;
      return;
    }

    container.innerHTML = todos.map(todo => `
      <div class="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 transition-all ${todo.completed ? 'opacity-50' : ''}">
        <label class="flex items-start gap-2.5 flex-1 cursor-pointer select-none">
          <input type="checkbox" ${todo.completed ? 'checked' : ''} data-todo-id="${todo.id}" class="mt-0.5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer">
          <span class="text-xs text-slate-800 dark:text-slate-200 ${todo.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${todo.text}</span>
        </label>
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <span class="text-[10px] px-1.5 py-0.5 rounded font-medium ${this._getTagBadgeClass(todo.tag)}">${todo.tag || 'Autre'}</span>
          <button data-delete-todo="${todo.id}" class="text-slate-400 hover:text-rose-500 p-0.5 rounded">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
    `).join('');

    // Bind checkboxes & delete
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

  _getTagBadgeClass(tag) {
    switch (tag) {
      case 'Maths': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300';
      case 'Physique': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300';
      case 'Info': return 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300';
      default: return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  },

  // --------------------------------------------------------------------------
  // Modals (Add Event, Edit Event, Import ICS, Add Important Date)
  // --------------------------------------------------------------------------
  _openAddEventModal() {
    const content = `
      <form id="add-course-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nom du cours / tâche *</label>
          <input type="text" id="ev-title" required placeholder="Ex: Maths - Algèbre linéaire (Cours)" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-brand-500">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Jour *</label>
            <select id="ev-day" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
              <option value="mon">Lundi</option>
              <option value="tue">Mardi</option>
              <option value="wed">Mercredi</option>
              <option value="thu">Jeudi</option>
              <option value="fri">Vendredi</option>
              <option value="sat">Samedi</option>
              <option value="sun">Dimanche</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Heure de début *</label>
            <input type="time" id="ev-start" required value="08:00" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Durée (minutes) *</label>
            <select id="ev-duration" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
              <option value="60">1h (60 min)</option>
              <option value="90">1h30 (90 min)</option>
              <option value="105">1h45 (105 min)</option>
              <option value="120" selected>2h (120 min)</option>
              <option value="180">3h (180 min)</option>
              <option value="240">4h (240 min)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Type de séance</label>
            <select id="ev-type" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
              <option value="course">Cours magistral</option>
              <option value="td">Travaux Dirigés (TD)</option>
              <option value="tp">Travaux Pratiques (TP)</option>
              <option value="colle">Colle / Khôlle</option>
              <option value="ds">Devoir Surveillé (DS)</option>
              <option value="perso">Travail personnel</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Salle / Amphi</label>
            <input type="text" id="ev-room" placeholder="Ex: Amphi Poincaré" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Enseignant</label>
            <input type="text" id="ev-teacher" placeholder="Ex: M. Dupont" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
          </div>
        </div>

        <!-- Color picker presets -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Couleur personnalisée</label>
          <div class="flex items-center gap-2">
            ${Object.entries(SUBJECT_COLORS).map(([name, hex]) => `
              <button type="button" data-color="${hex}" class="color-preset-btn w-6 h-6 rounded-full border-2 border-transparent transition-transform hover:scale-110" style="background-color: ${hex};"></button>
            `).join('')}
            <input type="color" id="ev-color" value="#3b82f6" class="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0">
          </div>
        </div>

      </form>
    `;

    Modal.open({
      title: 'Ajouter un cours / événement',
      content,
      footer: `
        <button id="cancel-add-btn" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Annuler</button>
        <button id="save-course-btn" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md">Enregistrer</button>
      `,
      onOpen: (modalEl) => {
        const colorInput = modalEl.querySelector('#ev-color');
        modalEl.querySelectorAll('.color-preset-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            colorInput.value = btn.dataset.color;
            modalEl.querySelectorAll('.color-preset-btn').forEach(b => b.classList.remove('ring-2', 'ring-offset-2', 'ring-brand-500'));
            btn.classList.add('ring-2', 'ring-offset-2', 'ring-brand-500');
          });
        });

        modalEl.querySelector('#cancel-add-btn').addEventListener('click', () => Modal.close());
        modalEl.querySelector('#save-course-btn').addEventListener('click', () => {
          const form = modalEl.querySelector('#add-course-form');
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const newEvent = {
            title: modalEl.querySelector('#ev-title').value.trim(),
            day: modalEl.querySelector('#ev-day').value,
            startTime: modalEl.querySelector('#ev-start').value,
            duration: parseInt(modalEl.querySelector('#ev-duration').value, 10),
            type: modalEl.querySelector('#ev-type').value,
            room: modalEl.querySelector('#ev-room').value.trim(),
            teacher: modalEl.querySelector('#ev-teacher').value.trim(),
            color: colorInput.value,
            completed: false,
            isRecurring: true
          };

          store.addEvent(newEvent);
          Toast.success('Cours ajouté à l\'emploi du temps !');
          Modal.close();
        });
      }
    });
  },

  _openEditEventModal(event) {
    const content = `
      <div class="space-y-3">
        <div class="p-3 rounded-xl" style="background-color: ${event.color}15; border-left: 4px solid ${event.color};">
          <h4 class="font-bold text-sm text-slate-900 dark:text-slate-100">${event.title}</h4>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">${event.startTime} (${event.duration} min) • ${event.room || 'Salle non précisée'}</p>
          ${event.teacher ? `<p class="text-xs text-slate-500 mt-0.5">Enseignant : ${event.teacher}</p>` : ''}
        </div>
        <p class="text-xs text-slate-500">Voulez-vous modifier le statut ou supprimer cet événement ?</p>
      </div>
    `;

    Modal.open({
      title: 'Détails du cours',
      content,
      footer: `
        <button id="delete-event-btn" class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold mr-auto">Supprimer</button>
        <button id="toggle-done-btn" class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium">
          ${event.completed ? 'Marquer non fait' : 'Marquer comme fait'}
        </button>
        <button id="close-detail-btn" class="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold">Fermer</button>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector('#close-detail-btn').addEventListener('click', () => Modal.close());
        modalEl.querySelector('#toggle-done-btn').addEventListener('click', () => {
          store.toggleEventCompleted(event.id);
          Modal.close();
        });
        modalEl.querySelector('#delete-event-btn').addEventListener('click', () => {
          if (confirm('Voulez-vous vraiment supprimer ce cours ?')) {
            store.deleteEvent(event.id);
            Toast.info('Cours supprimé');
            Modal.close();
          }
        });
      }
    });
  },

  _openImportICSModal() {
    const content = `
      <div class="space-y-4">
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Importez votre emploi du temps depuis votre ENT universitaire (ADE, Hyperplanning, Google Agenda, etc.) via un lien iCal / Webcal ou en téléversant un fichier <code>.ics</code>.
        </p>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Option 1 : Lien de flux iCal / Webcal</label>
          <div class="flex gap-2">
            <input type="text" id="ics-url-input" placeholder="https://planning.universite.fr/ade/custom/..." class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
            <button id="fetch-ics-url-btn" class="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex-shrink-0">
              Importer
            </button>
          </div>
        </div>

        <div class="flex items-center my-2 text-xs text-slate-400">
          <div class="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
          <span class="px-2">OU</span>
          <div class="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Option 2 : Fichier .ics direct</label>
          <input type="file" id="ics-file-input" accept=".ics,text/calendar" class="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 dark:file:bg-brand-950 file:text-brand-700 dark:file:text-brand-300 hover:file:bg-brand-100">
        </div>
      </div>
    `;

    Modal.open({
      title: 'Importer un Emploi du Temps (ICS)',
      content,
      onOpen: (modalEl) => {
        // Option 1: URL
        const fetchBtn = modalEl.querySelector('#fetch-ics-url-btn');
        fetchBtn.addEventListener('click', async () => {
          const url = modalEl.querySelector('#ics-url-input').value.trim();
          if (!url) {
            Toast.warning('Veuillez entrer une URL de calendrier.');
            return;
          }
          fetchBtn.disabled = true;
          fetchBtn.textContent = 'Chargement...';

          try {
            const events = await ICSParser.fetchFromUrl(url);
            if (!events.length) {
              Toast.warning('Aucun événement trouvé dans ce flux.');
            } else {
              events.forEach(e => store.addEvent(e));
              Toast.success(`${events.length} cours importés avec succès !`);
              Modal.close();
            }
          } catch (err) {
            Toast.error(err.message || 'Erreur lors de l\'import ICS');
          } finally {
            fetchBtn.disabled = false;
            fetchBtn.textContent = 'Importer';
          }
        });

        // Option 2: File upload
        const fileInput = modalEl.querySelector('#ics-file-input');
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (ev) => {
            const text = ev.target.result;
            const parsed = ICSParser.parse(text);
            if (parsed.length > 0) {
              parsed.forEach(p => store.addEvent(p));
              Toast.success(`${parsed.length} cours importés depuis le fichier !`);
              Modal.close();
            } else {
              Toast.warning('Aucun cours détecté dans le fichier ICS.');
            }
          };
          reader.readAsText(file);
        });
      }
    });
  },

  _openAddImportantDateModal() {
    const content = `
      <form id="add-imp-date-form" class="space-y-3">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nom de l'échéance *</label>
          <input type="text" id="imp-title" required placeholder="Ex: DS 1 Maths - Algèbre" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date *</label>
            <input type="date" id="imp-date" required value="${new Date().toISOString().split('T')[0]}" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
            <select id="imp-type" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
              <option value="ds">Devoir Surveillé (DS)</option>
              <option value="partiel">Partiel / Concours Blanc</option>
              <option value="colle">Colle importante</option>
              <option value="concours">Concours officiel</option>
            </select>
          </div>
        </div>
      </form>
    `;

    Modal.open({
      title: 'Ajouter une date d\'examen / DS',
      content,
      footer: `
        <button id="cancel-imp-btn" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-500">Annuler</button>
        <button id="save-imp-btn" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold">Enregistrer</button>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector('#cancel-imp-btn').addEventListener('click', () => Modal.close());
        modalEl.querySelector('#save-imp-btn').addEventListener('click', () => {
          const title = modalEl.querySelector('#imp-title').value.trim();
          const date = modalEl.querySelector('#imp-date').value;
          const type = modalEl.querySelector('#imp-type').value;

          if (!title || !date) {
            Toast.warning('Veuillez remplir tous les champs.');
            return;
          }

          let color = '#ef4444';
          if (type === 'colle') color = '#f59e0b';
          if (type === 'partiel') color = '#dc2626';

          store.addImportantDate({ title, date, type, color });
          Toast.success('Date ajoutée au calendrier !');
          Modal.close();
        });
      }
    });
  }
};
