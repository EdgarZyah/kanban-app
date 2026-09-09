const App = (() => {

  function init() {
    Store.load();
    UI.initModalBehavior();
    Board.init();
    Task.init();
    Search.init();
    ExcelManager.init();
    DragDrop.setupDrop();

    setTimeout(() => setupMobileMenu(), 0);
    setTimeout(() => setupDroppableRefresh(), 0);

    if (Store.getCurrentBoardId()) {
      Board.selectBoard(Store.getCurrentBoardId());
    } else {
      Board.renderList();
      Board.showEmptyState(true);
      document.getElementById('boardTitle').textContent = 'Select a Board';
    }

    document.getElementById('filterAssignee').addEventListener('change', () => {
      setTimeout(() => setupDroppableRefresh(), 0);
    });
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
