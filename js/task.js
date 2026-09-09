const Task = (() => {

  function renderBoard() {
    const boardId = Store.getCurrentBoardId();

    if (!boardId) {
      Board.showEmptyState(true);
      return;
    }

    Board.showEmptyState(false);

    const tasks = Store.getTasksForBoard(boardId);
    const filters = Search.getFilters();

    Store.COLUMNS.forEach(column => {
      const taskList = document.querySelector(`.task-list[data-column="${column}"]`);
      const countEl = document.querySelector(`.task-count[data-count="${column}"]`);

      const columnTasks = Search.sortColumnTasks(
        tasks
          .filter(t => t.column === column && !t.closed)
          .filter(t => Search.matchesFilters(t, filters))
      );

      taskList.innerHTML = '';

      if (columnTasks.length === 0) {
        countEl.textContent = '0';
        return;
      }

      countEl.textContent = columnTasks.length;

      columnTasks.forEach(task => {
        taskList.appendChild(renderCard(task));
      });
    });

    updateClosedCount();
    Task.setupCards();
  }

  function renderCard(task) {
    const card = document.createElement('div');
    card.className = `task-card priority-${task.priority}`;
    card.dataset.taskId = task.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Open task: ${task.title}`);

    let html = `<div class="task-card-title">${escapeHtml(task.title)}</div>`;

    if (task.description) {
      html += `<div class="task-card-desc">${escapeHtml(task.description)}</div>`;
    }

    html += '<div class="task-card-meta">';
    html += '<div class="badge-row">';
    html += `<span class="priority-badge ${task.priority}">${Store.PRIORITY_LABELS[task.priority] || task.priority}</span>`;

    if (task.assignee) {
      html += `<span class="assignee-badge">${UI.icon('icon-user')}${escapeHtml(task.assignee)}</span>`;
    }

    if (task.due_date) {
      const status = UI.getDueDateStatus(task.due_date);
      let cls = 'due-badge';
      if (status === 'overdue') cls += ' overdue';
      else if (status === 'today') cls += ' today';

      let label = UI.formatDate(task.due_date);
      if (status === 'overdue') label = `${UI.icon('icon-warning')} ${label}`;
      else if (status === 'today') label = `Today (${label})`;

      html += `<span class="${cls}">${UI.icon('icon-calendar')}${label}</span>`;
    }

    const comments = task.comments && task.comments.length ? task.comments.length : 0;
    if (comments > 0) {
      html += `<span class="comment-count-badge">${UI.icon('icon-comment')} ${comments}</span>`;
    }

    html += '</div>';

    if (task.assigned_by) {
      html += `<div class="assignee-from">${UI.icon('icon-user')} Assigned by <strong>${escapeHtml(task.assigned_by)}</strong></div>`;
    }

    if (task.created_at) {
      html += `<div class="card-created">${UI.icon('icon-calendar')} Dibuat ${UI.formatDateTime(task.created_at)}</div>`;
    }

    html += '</div>';

    card.innerHTML = html;

    card.addEventListener('click', (e) => {
      if (DragDrop.consumeClick()) return;
      openEditModal(task.id);
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openEditModal(task.id);
      }
    });

    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openEditModal(task.id);
    });

    return card;
  }

  function setupCards() {
    document.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('pointerdown', DragDrop.startPointerDrag);
    });
  }

  function openAddModal(column) {
    document.getElementById('taskModalTitle').textContent = 'New Task';
    document.getElementById('taskId').value = '';
    document.getElementById('taskColumn').value = column;
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskDueDate').value = '';
    document.getElementById('taskAssignee').value = '';
    document.getElementById('taskAssignedBy').value = '';
    document.getElementById('btnDeleteTask').style.display = 'none';
    document.getElementById('btnCloseTicket').style.display = 'none';
    document.getElementById('commentInput').value = '';
    renderComments([]);
    UI.openModal('taskModal');
  }

  function openEditModal(taskId) {
    const task = Store.getTasks().find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('taskModalTitle').textContent = 'Edit Task';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskColumn').value = task.column;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDesc').value = task.description || '';
    document.getElementById('taskPriority').value = task.priority || 'medium';
    document.getElementById('taskDueDate').value = task.due_date || '';
    document.getElementById('taskAssignee').value = task.assignee || '';
    document.getElementById('taskAssignedBy').value = task.assigned_by || '';
    document.getElementById('btnDeleteTask').style.display = 'inline-block';
    document.getElementById('btnCloseTicket').style.display = 'inline-block';
    document.getElementById('commentInput').value = '';
    renderComments(task.comments || []);
    UI.openModal('taskModal');
  }

  function renderComments(comments) {
    const list = document.getElementById('commentsList');
    list.innerHTML = '';

    if (!comments || comments.length === 0) {
      list.innerHTML = '<div class="no-comments">Belum ada log progress.</div>';
      return;
    }

    const sorted = comments.slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));

    sorted.forEach(c => {
      const item = document.createElement('div');
      item.className = 'comment-item';

      const dateStr = c.created_at
        ? new Date(c.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
        : '';

      item.innerHTML = `
        <div class="comment-meta">${dateStr}</div>
        <div class="comment-text">${escapeHtml(c.text)}</div>
      `;

      list.appendChild(item);
    });
  }

  function addComment() {
    const id = document.getElementById('taskId').value;
    const input = document.getElementById('commentInput');
    const text = input.value.trim();

    if (!id) {
      UI.showToast('Simpan task dulu sebelum menambah log', 'error');
      return;
    }
    if (!text) return;

    const task = Store.getTasks().find(t => t.id === id);
    if (!task) return;

    if (!Array.isArray(task.comments)) task.comments = [];
    task.comments.push({
      text: text,
      created_at: new Date().toISOString()
    });
    Store.save();

    input.value = '';
    renderComments(task.comments);
    renderBoard();
    UI.showToast('Log progress ditambahkan', 'success');
  }

  function saveTask() {
    const id = document.getElementById('taskId').value;
    const column = document.getElementById('taskColumn').value;
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDesc').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const due_date = document.getElementById('taskDueDate').value;
    const assignee = document.getElementById('taskAssignee').value.trim();
    const assigned_by = document.getElementById('taskAssignedBy').value.trim();

    if (!title) {
      UI.showToast('Task title is required', 'error');
      document.getElementById('taskTitle').focus();
      return;
    }

    const taskData = {
      title,
      description,
      priority,
      due_date,
      assignee,
      assigned_by,
      column
    };

    if (id) {
      Store.updateTask(id, taskData);
      UI.showToast('Task updated', 'success');
    } else {
      Store.addTask(taskData);
      UI.showToast('Task created', 'success');
    }

    UI.closeModal('taskModal');
    renderBoard();
    Search.updateAssigneeFilter();
  }

  function deleteTask() {
    const id = document.getElementById('taskId').value;
    if (!id) return;
    if (!UI.confirmDialog('Delete this task?')) return;

    Store.deleteTask(id);
    UI.closeModal('taskModal');
    renderBoard();
    Search.updateAssigneeFilter();
    UI.showToast('Task deleted', 'info');
  }

  function closeTicket() {
    const id = document.getElementById('taskId').value;
    if (!id) return;
    if (!UI.confirmDialog('Tutup ticket ini? Ticket akan masuk daftar Closed dan bisa dibuka kembali.')) return;

    Store.closeTask(id);
    UI.closeModal('taskModal');
    renderBoard();
    Search.updateAssigneeFilter();
    UI.showToast('Ticket di-close', 'success');
  }

  function updateClosedCount() {
    const el = document.getElementById('closedCount');
    if (!el) return;
    el.textContent = Store.getState().tasks.filter(t => t.closed).length;
  }

  function openClosedModal() {
    renderClosedList();
    UI.openModal('closedModal');
  }

  function renderClosedList() {
    const list = document.getElementById('closedList');
    const closed = Store.getState().tasks.filter(t => t.closed);
    list.innerHTML = '';

    if (closed.length === 0) {
      list.innerHTML = '<div class="no-comments">Belum ada ticket tertutup.</div>';
      return;
    }

    closed
      .slice()
      .sort((a, b) => (b.closed_at || '').localeCompare(a.closed_at || ''))
      .forEach(t => {
        const board = Store.getBoard(t.board_id);
        const item = document.createElement('div');
        item.className = 'closed-item';

        const due = t.due_date
          ? `${UI.icon('icon-calendar')} ${UI.formatDate(t.due_date)}`
          : '<span class="muted">no due date</span>';

        item.innerHTML = `
          <div class="closed-item-main">
            <div class="closed-item-title">${escapeHtml(t.title)}</div>
            <div class="closed-item-sub">${board ? escapeHtml(board.name) : ''} · ${UI.icon('icon-user')} ${escapeHtml(t.assignee || '-')}</div>
            <div class="closed-item-meta">
              <span class="priority-badge ${t.priority || 'medium'}">${Store.PRIORITY_LABELS[t.priority] || t.priority}</span>
              <span>${due}</span>
              <span class="muted">Closed ${t.closed_at ? new Date(t.closed_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
            </div>
          </div>
          <div class="closed-item-actions">
            <button class="btn btn-outline btn-reopen" title="Buka kembali ticket">
              ${UI.icon('icon-reopen')} Reopen
            </button>
          </div>
        `;

        item.querySelector('.btn-reopen').addEventListener('click', () => reopenTicket(t.id));
        list.appendChild(item);
      });
  }

  function reopenTicket(id) {
    const task = Store.reopenTask(id);
    if (!task) return;
    renderClosedList();
    renderBoard();
    Search.updateAssigneeFilter();
    UI.showToast('Ticket dibuka kembali', 'success');
  }

  function openTicketModal() {
    if (!Store.getCurrentBoardId()) {
      UI.showToast('Select a board first', 'error');
      return;
    }
    document.getElementById('ticketTitle').value = '';
    document.getElementById('ticketDesc').value = '';
    document.getElementById('ticketPriority').value = 'medium';
    document.getElementById('ticketDueDate').value = '';
    document.getElementById('ticketAssignee').value = '';
    document.getElementById('ticketAssignedBy').value = '';
    UI.openModal('ticketModal');
  }

  function saveTicket() {
    if (!Store.getCurrentBoardId()) {
      UI.showToast('Select a board first', 'error');
      return;
    }

    const title = document.getElementById('ticketTitle').value.trim();
    if (!title) {
      UI.showToast('Ticket title is required', 'error');
      document.getElementById('ticketTitle').focus();
      return;
    }

    Store.addTask({
      title: title,
      description: document.getElementById('ticketDesc').value.trim(),
      priority: document.getElementById('ticketPriority').value,
      due_date: document.getElementById('ticketDueDate').value,
      assignee: document.getElementById('ticketAssignee').value.trim(),
      assigned_by: document.getElementById('ticketAssignedBy').value.trim(),
      column: 'todo'
    });

    UI.closeModal('ticketModal');
    Task.renderBoard();
    Search.updateAssigneeFilter();
    UI.showToast('Ticket created in To Do', 'success');
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function init() {
    document.querySelectorAll('.btn-add-task').forEach(btn => {
      btn.addEventListener('click', () => {
        const column = btn.dataset.column;
        if (Store.getCurrentBoardId()) {
          openAddModal(column);
        } else {
          UI.showToast('Please select a board first', 'error');
        }
      });
    });

    document.getElementById('btnSaveTask').addEventListener('click', saveTask);
    document.getElementById('btnDeleteTask').addEventListener('click', deleteTask);
    document.getElementById('btnCloseTicket').addEventListener('click', closeTicket);
    document.getElementById('btnAddComment').addEventListener('click', addComment);

    document.getElementById('btnOpenTicket').addEventListener('click', openTicketModal);
    document.getElementById('btnSaveTicket').addEventListener('click', saveTicket);
    document.getElementById('btnClosedTickets').addEventListener('click', openClosedModal);

    document.getElementById('ticketTitle').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveTicket();
    });

    document.getElementById('commentInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addComment();
    });

    document.getElementById('taskTitle').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveTask();
    });
  }

  return {
    init,
    renderBoard,
    renderCard,
    setupCards,
    openAddModal,
    openEditModal,
    saveTask,
    deleteTask,
    closeTicket,
    addComment,
    openTicketModal,
    saveTicket,
    openClosedModal,
    renderClosedList,
    reopenTicket,
    escapeHtml
  };
})();
