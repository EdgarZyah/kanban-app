const Board = (() => {

  function renderList() {
    const list = document.getElementById('boardList');
    const boards = Store.getBoards();
    const currentId = Store.getCurrentBoardId();

    list.innerHTML = '';

    if (boards.length === 0) {
      list.innerHTML = '<li style="cursor:default; opacity:0.6; text-align:center;">No boards yet</li>';
      return;
    }

    boards.forEach(board => {
      const li = document.createElement('li');
      li.className = board.id === currentId ? 'active' : '';
      li.dataset.boardId = board.id;
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', `Select board: ${board.name}`);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'board-name';
      nameSpan.textContent = board.name;
      nameSpan.title = board.name;

      const actions = document.createElement('div');
      actions.className = 'board-actions';

      const renameBtn = document.createElement('button');
      renameBtn.className = 'btn-icon';
      renameBtn.innerHTML = UI.icon('icon-edit');
      renameBtn.title = 'Rename Board';
      renameBtn.setAttribute('aria-label', `Rename board: ${board.name}`);
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openRenameModal(board);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon';
      deleteBtn.innerHTML = UI.icon('icon-trash');
      deleteBtn.title = 'Delete Board';
      deleteBtn.setAttribute('aria-label', `Delete board: ${board.name}`);
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDelete(board);
      });

      actions.appendChild(renameBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(nameSpan);
      li.appendChild(actions);

      li.addEventListener('click', () => {
        selectBoard(board.id);
      });

      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectBoard(board.id);
        }
      });

      list.appendChild(li);
    });
  }

  function selectBoard(id) {
    Store.setCurrentBoardId(id);
    renderList();
    const board = Store.getBoard(id);
    document.getElementById('boardTitle').textContent = board ? board.name : 'No Board';
    window.location.hash = '';
    TaskDetail.hide();
    Task.renderBoard();
    Search.updateAssigneeFilter();
    document.getElementById('boardContainer').scrollLeft = 0;
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('open');
    }
  }

  function openNewModal() {
    document.getElementById('boardModalTitle').textContent = 'New Board';
    document.getElementById('boardNameInput').value = '';
    document.getElementById('boardNameInput').dataset.editId = '';
    UI.openModal('boardModal');
  }

  function openRenameModal(board) {
    document.getElementById('boardModalTitle').textContent = 'Rename Board';
    document.getElementById('boardNameInput').value = board.name;
    document.getElementById('boardNameInput').dataset.editId = board.id;
    UI.openModal('boardModal');
  }

  function saveBoard() {
    const input = document.getElementById('boardNameInput');
    const name = input.value.trim();
    const editId = input.dataset.editId || '';

    if (!name) {
      UI.showToast('Board name cannot be empty', 'error');
      return;
    }

    if (editId) {
      Store.updateBoard(editId, name);
      UI.showToast('Board renamed successfully', 'success');
    } else {
      const board = Store.addBoard(name);
      Store.setCurrentBoardId(board.id);
      UI.showToast('Board created successfully', 'success');
    }

    UI.closeModal('boardModal');
    renderList();
    const board = Store.getBoard(Store.getCurrentBoardId());
    document.getElementById('boardTitle').textContent = board ? board.name : 'No Board';
    TaskDetail.hide();
    Task.renderBoard();
    Search.updateAssigneeFilter();
  }

  function handleDelete(board) {
    const taskCount = Store.getTasksForBoard(board.id).length;
    if (!UI.confirmDialog(`Delete board "${board.name}" and its ${taskCount} task(s)? This cannot be undone.`)) {
      return;
    }
    Store.deleteBoard(board.id);
    renderList();
    const current = Store.getBoard(Store.getCurrentBoardId());
    document.getElementById('boardTitle').textContent = current ? current.name : 'No Board';
    TaskDetail.hide();
    Task.renderBoard();
    Search.updateAssigneeFilter();
    UI.showToast('Board deleted', 'info');
  }

  function showEmptyState(show) {
    document.getElementById('emptyState').style.display = show ? 'flex' : 'none';
    document.getElementById('columnsWrapper').style.display = show ? 'none' : 'flex';
  }

  function init() {
    document.getElementById('btnNewBoard').addEventListener('click', openNewModal);
    document.getElementById('btnSaveBoard').addEventListener('click', saveBoard);

    document.getElementById('boardNameInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveBoard();
    });
  }

  return {
    init,
    renderList,
    selectBoard,
    showEmptyState
  };
})();
