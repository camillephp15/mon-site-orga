/**
 * Modal Manager Component
 * Provides clean accessible modal dialogs with backdrop blur and escape-to-close.
 */

export const Modal = {
  activeModal: null,

  /**
   * Opens a modal with custom HTML content
   * @param {Object} options
   * @param {string} options.title - Modal title
   * @param {string} options.content - HTML body
   * @param {string} [options.footer] - Optional HTML footer buttons
   * @param {string} [options.maxWidth] - CSS max-width class (default 'max-w-lg')
   * @param {Function} [options.onOpen] - Callback after DOM insert
   * @param {Function} [options.onClose] - Callback after modal close
   */
  open({ title, content, footer = '', maxWidth = 'max-w-lg', onOpen = null, onClose = null }) {
    this.close();

    const root = document.getElementById('modals-root');
    if (!root) return;

    const modalEl = document.createElement('div');
    modalEl.id = 'current-modal';
    modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto modal-backdrop animate-fade-in';

    modalEl.innerHTML = `
      <div class="relative w-full ${maxWidth} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto transition-all transform scale-100 flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">${title}</h3>
          <button id="modal-close-btn" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Body Content -->
        <div class="px-5 py-4 overflow-y-auto flex-1 text-sm text-slate-700 dark:text-slate-300">
          ${content}
        </div>

        <!-- Footer -->
        ${footer ? `<div class="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">${footer}</div>` : ''}
      </div>
    `;

    root.appendChild(modalEl);
    this.activeModal = { el: modalEl, onClose };

    // Close button
    modalEl.querySelector('#modal-close-btn').addEventListener('click', () => this.close());

    // Click outside backdrop
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) this.close();
    });

    // Escape key
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
