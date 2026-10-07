const App = (() => {

  function init() {
    Store.load();
    UI.initModalBehavior();
    Board.init();
    Task.init();
    Search.init();
    ExcelManager.init();
    Benchmark.init();
    DragDrop.setupDrop();

    setTimeout(() => setupMobileMenu(), 0);
    setTimeout(() => setupDroppableRefresh(), 0);
    setupBackKey();

    Board.renderList();

    window.addEventListener('hashchange', handleHashChange);

    let lastDayKey = new Date().toDateString();
    setInterval(() => {
      const dayKey = new Date().toDateString();
      if (dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        Store.applyDeadlinePriorities();
        if (window.location.hash.startsWith('#task/')) {
          const taskId = window.location.hash.replace('#task/', '');
          if (taskId && TaskDetail.isVisible()) TaskDetail.show(taskId);
        } else if (Store.getCurrentBoardId()) {
          Task.renderBoard();
        }
      }
    }, 60000);

    if (window.location.hash.startsWith('#task/')) {
      handleHashChange();
    } else if (Store.getCurrentBoardId()) {
      Board.selectBoard(Store.getCurrentBoardId());
    } else {
      Board.showEmptyState(true);
      document.getElementById('boardTitle').textContent = 'Select a Board';
    }

    document.getElementById('filterAssignee').addEventListener('change', () => {
      setTimeout(() => setupDroppableRefresh(), 0);
    });

    document.getElementById('filterAssignedBy').addEventListener('change', () => {
      setTimeout(() => setupDroppableRefresh(), 0);
    });
  }

  function handleHashChange() {
    const hash = window.location.hash;
    if (hash.startsWith('#task/')) {
      const taskId = hash.replace('#task/', '');
      if (taskId) {
        TaskDetail.show(taskId);
      }
    } else {
      TaskDetail.hide();
      if (Store.getCurrentBoardId()) {
        Task.renderBoard();
      }
    }
  }

  function setupBackKey() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (goBack()) e.preventDefault();
    });
  }

  function goBack() {
    const replyForm = document.querySelector('.comment-reply-form:not([hidden]), .detail-comment-reply-form:not([hidden])');
    if (replyForm) {
      replyForm.hidden = true;
      return true;
    }

    const openModals = document.querySelectorAll('.modal-overlay.show');
    if (openModals.length > 0) {
      const top = openModals[openModals.length - 1];
      if (top.id) {
        UI.closeModal(top.id);
      } else {
        top.classList.remove('show');
      }
      return true;
    }

    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      const mobileMenu = document.getElementById('mobileMenu');
      if (mobileMenu) mobileMenu.setAttribute('aria-expanded', 'false');
      return true;
    }

    if (window.location.hash.startsWith('#task/')) {
      window.location.hash = '';
      TaskDetail.hide();
      if (Store.getCurrentBoardId()) Task.renderBoard();
      return true;
    }

    return false;
  }

  function setupMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const sidebarClose = document.getElementById('sidebarClose');

    const closeSidebar = () => {
      sidebar.classList.remove('open');
    };

    const toggleSidebar = () => {
      sidebar.classList.toggle('open');
    };

    if (mobileMenu) {
      mobileMenu.addEventListener('click', toggleSidebar);
      mobileMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    const syncMenuAria = () => {
      mobileMenu.setAttribute('aria-expanded', String(sidebar.classList.contains('open')));
    };

    sidebar.addEventListener('transitionend', syncMenuAria, { once: true });
    window.addEventListener('resize', syncMenuAria, { once: true });

    if (sidebarClose) {
      sidebarClose.addEventListener('click', closeSidebar);
    }

    if (backdrop) {
      backdrop.addEventListener('click', closeSidebar);
    }

    document.getElementById('sidebar').addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && e.target.closest('.board-list li') && !e.target.closest('.board-actions')) {
        closeSidebar();
      }
    });
  }

  function setupDroppableRefresh() {
    DragDrop.setupDrop();
  }

  function setupThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    const sync = () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      btn.setAttribute('aria-checked', String(isLight));
      btn.setAttribute('aria-label', isLight ? 'Mode terang' : 'Mode gelap');
    };

    sync();

    btn.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const next = isLight ? 'dark' : 'light';

      if (next === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }

      localStorage.setItem('kanbanTheme', next);
      sync();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    setupThemeToggle();
  });

  return {};
})();
