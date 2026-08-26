/**
 * Toast Notification Module
 * Manages clean, non-intrusive notifications for user actions and sync events.
 */

export const Toast = {
  show(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 ${this._getStyle(type)}`;

    const icon = this._getIcon(type);

    toast.innerHTML = `
      <div class="flex-shrink-0">${icon}</div>
      <div class="flex-1">${message}</div>
      <button class="toast-close text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    const removeToast = () => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', removeToast);

    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  },

  success(msg, duration) {
    this.show(msg, 'success', duration);
  },

  error(msg, duration) {
    this.show(msg, 'error', duration || 5000);
  },

  warning(msg, duration) {
    this.show(msg, 'warning', duration);
  },

  info(msg, duration) {
    this.show(msg, 'info', duration);
  },

  _getStyle(type) {
    switch (type) {
      case 'success':
        return 'bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800';
      case 'error':
        return 'bg-rose-50/95 dark:bg-rose-950/90 text-rose-900 dark:text-rose-100 border-rose-200 dark:border-rose-800';
      case 'warning':
        return 'bg-amber-50/95 dark:bg-amber-950/90 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800';
    }
  },

  _getIcon(type) {
    switch (type) {
      case 'success':
        return '<svg class="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
      case 'error':
        return '<svg class="w-5 h-5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
      case 'warning':
        return '<svg class="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      default:
        return '<svg class="w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }
  }
};
