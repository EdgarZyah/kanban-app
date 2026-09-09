const UI = (() => {
  let lastFocused = null;

  function icon(name) {
    return `<svg class="icon" aria-hidden="true"><use href="#${name}"></use></svg>`;
  }

  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <span>${message}</span>
      <button class="toast-close" aria-label="Tutup notifikasi">${icon('icon-close')}</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => hideToast(toast));

    container.appendChild(toast);

    setTimeout(() => hideToast(toast), duration);
  }

  function hideToast(toast) {
    if (!toast.parentNode) return;
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      lastFocused = document.activeElement;
      modal.classList.add('show');
      setTimeout(() => {
        const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
        if (firstInput) firstInput.focus();
      }, 100);
    }
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('show');
      restoreFocus();
    }
  }

  function closeAllModals() {
    const open = document.querySelectorAll('.modal-overlay.show');
    if (open.length > 0) {
      open.forEach(m => m.classList.remove('show'));
      restoreFocus();
    }
  }

  function restoreFocus() {
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
      lastFocused = null;
    }
  }

  function getFocusableElements(modal) {
    return Array.from(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.disabled && el.offsetParent !== null);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date)) return dateStr;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    return date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getDueDateStatus(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr + 'T00:00:00');
    const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) return 'overdue';
    if (diff === 0) return 'today';
    if (diff <= 3) return 'soon';
    return 'normal';
  }

  function initModalBehavior() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      const header = modal.querySelector('.modal-header h3');
      if (header && header.id) {
        modal.setAttribute('aria-labelledby', header.id);
      }

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
          restoreFocus();
        }
      });

      modal.querySelectorAll('[data-close]').forEach(btn => {
        btn.setAttribute('aria-label', 'Tutup dialog');
        btn.addEventListener('click', () => {
          modal.classList.remove('show');
          restoreFocus();
        });
      });

      modal.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab' || !modal.classList.contains('show')) return;
        const focusables = getFocusableElements(modal);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (e.shiftKey && (active === first || active === modal)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllModals();
      }
    });
  }

  function confirmDialog(message) {
    return window.confirm(message);
  }

  return {
    showToast,
    icon,
    openModal,
    closeModal,
    closeAllModals,
    formatDate,
    formatDateTime,
    getDueDateStatus,
    initModalBehavior,
    confirmDialog
  };
})();