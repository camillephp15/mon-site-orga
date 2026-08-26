/**
 * Cloud Sync Module (Supabase + Transparent Pairing)
 * Handles automatic, passwordless cloud synchronization via a unique session key,
 * real-time/debounced push, pull on focus, and mobile QR code generation.
 */

import { store } from './store.js';
import { Toast } from './components/toast.js';
import { Modal } from './components/modal.js';

// Configuration Supabase par défaut (ou personnalisable par l'utilisateur)
const DEFAULT_SUPABASE_URL = 'https://studyflow-cloud.supabase.co'; // Template URL
const DEFAULT_SUPABASE_KEY = 'public-anon-key-placeholder';

class SyncManager {
  constructor() {
    this.supabase = null;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncDebounceTimer = null;
    this.status = 'idle'; // 'synced' | 'syncing' | 'offline' | 'error'

    this.init();
  }

  init() {
    this._initSupabase();

    // Listen to store triggers
    store.on('triggerCloudSync', (data) => {
      this.scheduleSync(data);
    });

    store.on('syncKeyChanged', () => {
      this.pullFromCloud();
    });

    // Pull changes when user returns to tab / phone screen wakes up
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.pullFromCloud(true);
      }
    });

    window.addEventListener('focus', () => {
      this.pullFromCloud(true);
    });

    // Check for URL hash sync param on load
    this._checkUrlHashSync();

    // Initial pull
    setTimeout(() => {
      this.pullFromCloud();
      this.updateStatusUI();
    }, 300);
  }

  _initSupabase() {
    const customUrl = store.data.syncSettings.supabaseUrl || DEFAULT_SUPABASE_URL;
    const customKey = store.data.syncSettings.supabaseKey || DEFAULT_SUPABASE_KEY;

    if (window.supabase && customUrl && customKey && !customUrl.includes('placeholder')) {
      try {
        this.supabase = window.supabase.createClient(customUrl, customKey);
      } catch (e) {
        console.warn('Supabase init failed:', e);
      }
    }
  }

  _checkUrlHashSync() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const syncParam = params.get('sync');
    if (syncParam && syncParam !== store.getSessionKey()) {
      store.setSessionKey(syncParam);
      Toast.success('Appairage réussi ! Espace synchronisé avec votre session.');
      // Clean hash without reloading
      history.replaceState(null, '', window.location.pathname);
    }
  }

  scheduleSync(data) {
    if (this.syncDebounceTimer) clearTimeout(this.syncDebounceTimer);
    this.setStatus('syncing');

    this.syncDebounceTimer = setTimeout(() => {
      this.pushToCloud(data);
    }, 1000); // 1s debounce
  }

  async pushToCloud(data) {
    if (!this.supabase) {
      // Offline / Local-only mode
      this.setStatus('synced');
      return;
    }

    const sessionKey = store.getSessionKey();
    if (!sessionKey) return;

    try {
      this.isSyncing = true;
      this.setStatus('syncing');

      const payload = {
        session_id: sessionKey,
        data: data,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('studyflow_sync')
        .upsert(payload, { onConflict: 'session_id' });

      if (error) throw error;

      this.lastSyncTime = new Date();
      store.data.syncSettings.lastSyncedAt = this.lastSyncTime.toISOString();
      this.setStatus('synced');
    } catch (err) {
      console.warn('Sync push notice (local cache safe):', err.message || err);
      this.setStatus('offline');
    } finally {
      this.isSyncing = false;
    }
  }

  async pullFromCloud(silent = false) {
    if (!this.supabase) return;
    const sessionKey = store.getSessionKey();
    if (!sessionKey) return;

    try {
      this.setStatus('syncing');
      const { data, error } = await this.supabase
        .from('studyflow_sync')
        .select('data, updated_at')
        .eq('session_id', sessionKey)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found yet
        throw error;
      }

      if (data && data.data) {
        store.loadFromCloud(data.data);
        this.lastSyncTime = new Date(data.updated_at || Date.now());
        if (!silent) {
          Toast.success('Données synchronisées depuis le Cloud !', 2000);
        }
      }
      this.setStatus('synced');
    } catch (err) {
      console.warn('Sync pull error:', err);
      this.setStatus('offline');
    }
  }

  setStatus(status) {
    this.status = status;
    this.updateStatusUI();
  }

  updateStatusUI() {
    const dot = document.getElementById('sync-indicator-dot');
    const text = document.getElementById('sync-status-text');
    if (!dot || !text) return;

    switch (this.status) {
      case 'syncing':
        dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping';
        text.textContent = 'Synchronisation...';
        break;
      case 'synced':
        dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
        text.textContent = 'Cloud Synchronisé';
        break;
      case 'offline':
        dot.className = 'w-2.5 h-2.5 rounded-full bg-slate-400';
        text.textContent = 'Mode Local (Actif)';
        break;
      default:
        dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
        text.textContent = 'Cloud Synchronisé';
    }
  }

  /**
   * Opens the seamless pairing modal with QR Code and direct link
   */
  openSyncModal() {
    const sessionKey = store.getSessionKey();
    const currentUrl = window.location.origin + window.location.pathname;
    const syncUrl = `${currentUrl}#sync=${sessionKey}`;

    const content = `
      <div class="space-y-5">
        
        <!-- Explication de la synchro transparente -->
        <div class="p-3.5 bg-brand-50 dark:bg-brand-950/50 rounded-xl border border-brand-200 dark:border-brand-900/60 text-xs leading-relaxed text-brand-900 dark:text-brand-200">
          <p class="font-bold flex items-center gap-1.5 mb-1 text-brand-700 dark:text-brand-300">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Synchronisation transparente PC & Téléphone
          </p>
          Aucun mot de passe ni identifiant requis. Votre clé de session unique est liée à vos appareils. Pour synchroniser votre téléphone en 2 secondes, scannez simplement le QR Code ci-dessous avec l'appareil photo de votre mobile.
        </div>

        <!-- QR Code Container -->
        <div class="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
          <div id="sync-qrcode" class="p-2 bg-white rounded-xl shadow-md"></div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-3 flex items-center gap-1">
            <i data-lucide="camera" class="w-3.5 h-3.5"></i>
            Scannez ce QR Code avec votre téléphone
          </p>
        </div>

        <!-- Clé de session & Lien direct -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Lien de synchronisation direct</label>
          <div class="flex gap-2">
            <input type="text" readonly value="${syncUrl}" id="sync-link-input" class="w-full text-xs font-mono px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none select-all">
            <button id="copy-sync-link-btn" class="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 flex-shrink-0">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              Copier
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Clé de session actuelle</label>
          <div class="flex gap-2">
            <input type="text" value="${sessionKey}" id="custom-sync-key-input" class="w-full text-xs font-mono px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <button id="apply-sync-key-btn" class="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex-shrink-0">
              Appliquer
            </button>
          </div>
        </div>

        <!-- Section avancée Supabase Cloud -->
        <details class="text-xs border-t border-slate-200 dark:border-slate-800 pt-3">
          <summary class="cursor-pointer font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors py-1">
            ⚙️ Paramètres avancés de la base de données (Supabase)
          </summary>
          <div class="mt-3 space-y-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <p class="text-[11px] text-slate-500">
              Par défaut, vos données sont sauvegardées en local de manière ultra-rapide. Pour connecter votre propre projet cloud Supabase gratuit :
            </p>
            <div>
              <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Supabase Project URL</label>
              <input type="text" id="supabase-url-input" placeholder="https://votre-projet.supabase.co" value="${store.data.syncSettings.supabaseUrl || ''}" class="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono">
            </div>
            <div>
              <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Supabase Anon Key</label>
              <input type="password" id="supabase-key-input" placeholder="eyJhbGciOiJIUzI1NiIsIn..." value="${store.data.syncSettings.supabaseKey || ''}" class="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono">
            </div>
            <button id="save-supabase-config-btn" class="w-full py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-medium">
              Enregistrer la configuration Cloud
            </button>
          </div>
        </details>

      </div>
    `;

    Modal.open({
      title: 'Synchronisation Cloud & Appairage Téléphone',
      content,
      maxWidth: 'max-w-md',
      onOpen: (modalEl) => {
        // Render QR Code
        const qrContainer = modalEl.querySelector('#sync-qrcode');
        if (qrContainer && window.QRCode) {
          qrContainer.innerHTML = '';
          new window.QRCode(qrContainer, {
            text: syncUrl,
            width: 170,
            height: 170,
            colorDark: '#0f172a',
            colorLight: '#ffffff',
            correctLevel: window.QRCode.CorrectLevel.M
          });
        }

        // Copy link
        const copyBtn = modalEl.querySelector('#copy-sync-link-btn');
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(syncUrl);
            Toast.success('Lien copié dans le presse-papier !');
          } catch (e) {
            const input = modalEl.querySelector('#sync-link-input');
            input.select();
            document.execCommand('copy');
            Toast.success('Lien copié !');
          }
        });

        // Apply custom key
        const applyKeyBtn = modalEl.querySelector('#apply-sync-key-btn');
        applyKeyBtn.addEventListener('click', () => {
          const val = modalEl.querySelector('#custom-sync-key-input').value.trim();
          if (val) {
            store.setSessionKey(val);
            Toast.success('Nouvelle clé de session appliquée !');
            Modal.close();
          }
        });

        // Save Supabase config
        const saveSupabaseBtn = modalEl.querySelector('#save-supabase-config-btn');
        if (saveSupabaseBtn) {
          saveSupabaseBtn.addEventListener('click', () => {
            const url = modalEl.querySelector('#supabase-url-input').value.trim();
            const key = modalEl.querySelector('#supabase-key-input').value.trim();
            store.data.syncSettings.supabaseUrl = url;
            store.data.syncSettings.supabaseKey = key;
            store.save();
            this._initSupabase();
            this.pullFromCloud();
            Toast.success('Configuration Supabase enregistrée !');
            Modal.close();
          });
        }

        if (window.lucide) window.lucide.createIcons();
      }
    });
  }
}

export const syncManager = new SyncManager();
