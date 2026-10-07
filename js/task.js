const Task = (() => {
  const VIEW_STORAGE_KEY = 'kanbanViewMode';
  let viewMode = 'card';

  function loadViewMode() {
    try {
      viewMode = localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'card';
    } catch (e) {
      viewMode = 'card';
    }
  }

  function getViewMode() {
    return viewMode;
  }

  function setViewMode(mode) {
    viewMode = mode === 'list' ? 'list' : 'card';
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    } catch (e) { /* ignore */ }
    syncViewToggle();
    renderBoard();
  }

  function syncViewToggle() {
    const cardBtn = document.getElementById('btnViewCard');
    const listBtn = document.getElementById('btnViewList');
    if (!cardBtn || !listBtn) return;
    cardBtn.classList.toggle('active', viewMode === 'card');
    listBtn.classList.toggle('active', viewMode === 'list');
    cardBtn.setAttribute('aria-pressed', String(viewMode === 'card'));
    listBtn.setAttribute('aria-pressed', String(viewMode === 'list'));
  }

  function showListContainer(show) {
    const list = document.getElementById('listContainer');
    const cols = document.getElementById('columnsWrapper');
    if (!list || !cols) return;
    if (show) {
      list.style.display = '';
      cols.style.display = 'none';
      document.getElementById('emptyState').style.display = 'none';
    } else {
      list.style.display = 'none';
    }
  }

  function renderBoard() {
    const boardId = Store.getCurrentBoardId();

    if (!boardId) {
      showListContainer(false);
      Board.showEmptyState(true);
      updateClosedCount();
      return;
    }

    const tasks = Store.getTasksForBoard(boardId).filter(t => !t.closed);
    const filters = Search.getFilters();

    if (viewMode === 'list') {
      showListContainer(true);
      renderList(tasks.filter(t => Search.matchesFilters(t, filters)));
      updateClosedCount();
      return;
    }

    showListContainer(false);
    Board.showEmptyState(false);

    Store.COLUMNS.forEach(column => {
      const taskList = document.querySelector(`.task-list[data-column="${column}"]`);
      const countEl = document.querySelector(`.task-count[data-count="${column}"]`);

      const columnTasks = Search.sortColumnTasks(
        tasks
          .filter(t => t.column === column)
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

  function renderList(tasks) {
    const body = document.getElementById('listBody');
    if (!body) return;

    const sorted = Search.sortColumnTasks(tasks);

    body.innerHTML = '';

    if (sorted.length === 0) {
      body.innerHTML = '<div class="list-empty">Tidak ada task.</div>';
      return;
    }

    sorted.forEach(task => body.appendChild(renderListRow(task)));
  }

  function renderListRow(task) {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.dataset.taskId = task.id;
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `Open task: ${task.title}`);

    const alertLevel = Store.getTaskAlertLevel(task);
    const columnLabel = Store.COLUMN_LABELS[task.column] || task.column;

    let statusHtml = `<span class="list-status-badge">${escapeHtml(columnLabel)}</span>`;
    if (alertLevel === 'overdue') {
      statusHtml += `<span class="overdue-status-badge">${UI.icon('icon-warning')} Overdue</span>`;
    } else if (alertLevel === 'critical') {
      statusHtml += `<span class="critical-status-badge">${UI.icon('icon-warning')} &lt; 3 Hari</span>`;
    } else if (alertLevel === 'week') {
      statusHtml += `<span class="week-status-badge">${UI.icon('icon-warning')} &lt; 1 Minggu</span>`;
    } else if (alertLevel === 'urgent') {
      statusHtml += `<span class="urgent-status-badge">${UI.icon('icon-warning')} &lt; 2 Minggu</span>`;
    } else if (alertLevel === 'alert') {
      statusHtml += `<span class="alert-status-badge">${UI.icon('icon-warning')} &lt; 1 Bulan</span>`;
    } else if (alertLevel === 'month') {
      statusHtml += `<span class="month-status-badge">${UI.icon('icon-warning')} &lt; 3 Bulan</span>`;
    }

    let dueHtml = '<span class="muted">-</span>';
    if (task.due_date) {
      const status = UI.getDueDateStatus(task.due_date);
      let cls = 'due-badge';
      if (status === 'overdue') cls += ' overdue';
      else if (status === 'today') cls += ' today';
      let label = UI.formatDate(task.due_date);
      if (status === 'today') label = `Today (${label})`;
      dueHtml = `<span class="${cls}">${UI.icon('icon-calendar')}${label}</span>`;
    }

    const comments = task.comments || [];
    const logsCount = comments.length + comments.reduce((n, c) => n + (Array.isArray(c.replies) ? c.replies.length : 0), 0);

    row.innerHTML = `
      <span class="list-col list-col-title">
        <span class="list-task-title">${escapeHtml(task.title)}</span>
        ${task.description ? `<span class="list-task-desc">${escapeHtml(task.description)}</span>` : ''}
      </span>
      <span class="list-col list-col-status">${statusHtml}</span>
      <span class="list-col list-col-priority">
        <span class="priority-badge ${task.priority}">${Store.PRIORITY_LABELS[task.priority] || task.priority}</span>
      </span>
      <span class="list-col list-col-due">${dueHtml}</span>
      <span class="list-col list-col-sme">${task.assignee ? escapeHtml(task.assignee) : '<span class="muted">-</span>'}</span>
      <span class="list-col list-col-sme-lead">${task.sme_lead ? escapeHtml(task.sme_lead) : '<span class="muted">-</span>'}</span>
      <span class="list-col list-col-pm">${task.assigned_by ? escapeHtml(task.assigned_by) : '<span class="muted">-</span>'}</span>
      <span class="list-col list-col-logs">${UI.icon('icon-comment')} ${logsCount}</span>
      <span class="list-col list-col-created">${task.created_at ? UI.formatDateTime(task.created_at) : ''}</span>
    `;

    row.addEventListener('click', () => {
      window.location.hash = `#task/${task.id}`;
    });

    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.hash = `#task/${task.id}`;
      }
    });

    return row;
  }

  function renderCard(task) {
    const card = document.createElement('div');
    card.className = `task-card priority-${task.priority}`;
    card.dataset.taskId = task.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Open task: ${task.title}`);

    const alertLevel = Store.getTaskAlertLevel(task);
    if (alertLevel === 'overdue') card.classList.add('overdue');
    else if (alertLevel === 'critical') card.classList.add('critical');
    else if (alertLevel === 'week') card.classList.add('week');
    else if (alertLevel === 'month') card.classList.add('month');

    let html = `<div class="task-card-title">${escapeHtml(task.title)}</div>`;

    if (task.description) {
      html += `<div class="task-card-desc">${escapeHtml(task.description)}</div>`;
    }

    const comments = task.comments && task.comments.length ? task.comments : [];
    const lastComment = comments.length > 0
      ? comments.slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))[comments.length - 1]
      : null;

    if (lastComment) {
      const lcDate = lastComment.created_at
        ? new Date(lastComment.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : '';
      html += `<div class="task-card-latest-comment${lastComment.done ? ' is-done' : ''}">
        <span class="latest-comment-icon">${UI.icon('icon-comment')}</span>
        <span class="latest-comment-text">${escapeHtml(lastComment.text)}</span>
        <span class="latest-comment-date">${lcDate}</span>
      </div>`;
    }

    html += '<div class="task-card-meta">';
    html += '<div class="badge-row">';
    html += `<span class="priority-badge ${task.priority}">${Store.PRIORITY_LABELS[task.priority] || task.priority}</span>`;

    if (alertLevel === 'overdue') {
      html += `<span class="overdue-status-badge">${UI.icon('icon-warning')} Overdue</span>`;
    } else if (alertLevel === 'critical') {
      html += `<span class="critical-status-badge">${UI.icon('icon-warning')} &lt; 3 Hari</span>`;
    } else if (alertLevel === 'week') {
      html += `<span class="week-status-badge">${UI.icon('icon-warning')} &lt; 1 Minggu</span>`;
    } else if (alertLevel === 'urgent') {
      html += `<span class="urgent-status-badge">${UI.icon('icon-warning')} &lt; 2 Minggu</span>`;
    } else if (alertLevel === 'alert') {
      html += `<span class="alert-status-badge">${UI.icon('icon-warning')} &lt; 1 Bulan</span>`;
    } else if (alertLevel === 'month') {
      html += `<span class="month-status-badge">${UI.icon('icon-warning')} &lt; 3 Bulan</span>`;
    }

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

    if (comments.length > 0) {
      html += `<span class="comment-count-badge">${UI.icon('icon-comment')} ${comments.length}</span>`;
    }

    html += '</div>';

    if (task.assigned_by) {
      html += `<div class="assignee-from">${UI.icon('icon-user')} PM <strong>${escapeHtml(task.assigned_by)}</strong></div>`;
    }

    if (task.sme_lead) {
      html += `<div class="assignee-from">${UI.icon('icon-user')} SME Lead <strong>${escapeHtml(task.sme_lead)}</strong></div>`;
    }

    if (task.created_at) {
      html += `<div class="card-created">${UI.icon('icon-calendar')} Dibuat ${UI.formatDateTime(task.created_at)}</div>`;
    }

    html += '</div>';

    card.innerHTML = html;

    card.addEventListener('click', (e) => {
      if (DragDrop.consumeClick()) return;
      window.location.hash = `#task/${task.id}`;
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.hash = `#task/${task.id}`;
      }
    });

    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      window.location.hash = `#task/${task.id}`;
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
    document.getElementById('taskSmeLead').value = '';
    document.getElementById('taskAssignedBy').value = '';
    document.getElementById('btnDeleteTask').style.display = 'none';
    document.getElementById('btnCloseTicket').style.display = 'none';
    document.getElementById('commentInput').value = '';
    renderComments([], '');
    bindCommentDelete();
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
    document.getElementById('taskPriority').value = task.base_priority || task.priority || 'medium';
    document.getElementById('taskDueDate').value = task.due_date || '';
    document.getElementById('taskAssignee').value = task.assignee || '';
    document.getElementById('taskSmeLead').value = task.sme_lead || '';
    document.getElementById('taskAssignedBy').value = task.assigned_by || '';
    document.getElementById('btnDeleteTask').style.display = 'inline-block';
    document.getElementById('btnCloseTicket').style.display = 'inline-block';
    document.getElementById('commentInput').value = '';
    renderComments(task.comments || [], task.id);
    bindCommentDelete();
    UI.openModal('taskModal');
  }

  function renderComments(comments, taskId) {
    const list = document.getElementById('commentsList');
    list.innerHTML = '';

    if (!comments || comments.length === 0) {
      list.innerHTML = '<div class="no-comments">Belum ada log progress.</div>';
      return;
    }

    const sorted = comments.slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));

    sorted.forEach(c => {
      const item = document.createElement('div');
      item.className = 'comment-item' + (c.done ? ' is-done' : '');
      item.dataset.commentId = c.id || '';

      const dateStr = c.created_at
        ? new Date(c.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
        : '';

      const replies = Array.isArray(c.replies) ? c.replies : [];

      const repliesHtml = replies.map(r => {
        const rDate = r.created_at
          ? new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
          : '';
        return `
          <div class="comment-reply-item${r.done ? ' is-done' : ''}" data-reply-id="${escapeHtml(r.id || '')}">
            <div class="comment-reply-meta">
              <span>${rDate}</span>
              <span class="comment-reply-actions">
                <button type="button" class="comment-reply-toggle-done${r.done ? ' is-done' : ''}" data-comment-id="${escapeHtml(c.id || '')}" data-reply-id="${escapeHtml(r.id || '')}" data-task-id="${escapeHtml(taskId || '')}" title="${r.done ? 'Tandai belum selesai' : 'Tandai sudah selesai'}" aria-label="Tandai sub log sudah selesai">
                  ${UI.icon('icon-check')}
                </button>
                <button type="button" class="comment-reply-delete" data-comment-id="${escapeHtml(c.id || '')}" data-reply-id="${escapeHtml(r.id || '')}" data-task-id="${escapeHtml(taskId || '')}" title="Hapus sub log" aria-label="Hapus sub log">
                  ${UI.icon('icon-trash')}
                </button>
              </span>
            </div>
            <div class="comment-reply-text${r.done ? ' is-done' : ''}">${escapeHtml(r.text)}</div>
          </div>`;
      }).join('');

      item.innerHTML = `
        <div class="comment-meta">
          <span>${dateStr}</span>
          <span class="comment-actions">
            <button type="button" class="comment-toggle-done ${c.done ? 'is-done' : ''}" data-comment-id="${escapeHtml(c.id || '')}" data-task-id="${escapeHtml(taskId || '')}" title="${c.done ? 'Tandai belum selesai' : 'Tandai sudah selesai'}" aria-label="Tandai sudah selesai">
              ${UI.icon('icon-check')}
            </button>
            <button type="button" class="comment-reply-btn" data-comment-id="${escapeHtml(c.id || '')}" title="Tambah sub log" aria-label="Tambah sub log">
              ${UI.icon('icon-plus')}
            </button>
            <button type="button" class="comment-delete" data-comment-id="${escapeHtml(c.id || '')}" data-task-id="${escapeHtml(taskId || '')}" title="Hapus progress log" aria-label="Hapus progress log">
              ${UI.icon('icon-trash')}
            </button>
          </span>
        </div>
        <div class="comment-text${c.done ? ' is-done' : ''}">${escapeHtml(c.text)}</div>
        ${replies.length > 0 ? `<div class="comment-replies">${repliesHtml}</div>` : ''}
        <div class="comment-reply-form" hidden>
          <input type="text" placeholder="Tulis detail log..." maxlength="300">
          <button type="button" class="btn btn-primary comment-reply-save" data-comment-id="${escapeHtml(c.id || '')}" data-task-id="${escapeHtml(taskId || '')}">Add</button>
        </div>
      `;

      list.appendChild(item);
    });
  }

  function bindCommentDelete() {
    const list = document.getElementById('commentsList');
    if (!list || list.dataset.deleteBound === '1') return;
    list.dataset.deleteBound = '1';

    list.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.comment-toggle-done');
      if (toggleBtn) {
        const commentId = toggleBtn.getAttribute('data-comment-id');
        const tid = toggleBtn.getAttribute('data-task-id');
        if (!commentId || !tid) return;
        const comment = Store.toggleCommentDone(tid, commentId);
        if (comment) {
          UI.showToast(comment.done ? 'Log ditandai selesai' : 'Log ditandai belum selesai', 'success');
        }
        refreshComments(tid);
        return;
      }

      const replyBtn = e.target.closest('.comment-reply-btn');
      if (replyBtn) {
        const item = replyBtn.closest('.comment-item');
        const form = item ? item.querySelector('.comment-reply-form') : null;
        if (form) {
          form.hidden = !form.hidden;
          if (!form.hidden) form.querySelector('input').focus();
        }
        return;
      }

      const replySaveBtn = e.target.closest('.comment-reply-save');
      if (replySaveBtn) {
        const commentId = replySaveBtn.getAttribute('data-comment-id');
        const tid = replySaveBtn.getAttribute('data-task-id');
        const form = replySaveBtn.closest('.comment-reply-form');
        const input = form ? form.querySelector('input') : null;
        if (!commentId || !tid || !input) return;
        const text = input.value.trim();
        if (!text) return;
        if (!Store.addReply(tid, commentId, text)) return;
        UI.showToast('Sub log ditambahkan', 'success');
        refreshComments(tid);
        return;
      }

      const replyDoneBtn = e.target.closest('.comment-reply-toggle-done');
      if (replyDoneBtn) {
        const commentId = replyDoneBtn.getAttribute('data-comment-id');
        const replyId = replyDoneBtn.getAttribute('data-reply-id');
        const tid = replyDoneBtn.getAttribute('data-task-id');
        if (!commentId || !replyId || !tid) return;
        const reply = Store.toggleReplyDone(tid, commentId, replyId);
        if (reply) {
          UI.showToast(reply.done ? 'Sub log ditandai selesai' : 'Sub log ditandai belum selesai', 'success');
        }
        refreshComments(tid);
        return;
      }

      const replyDelBtn = e.target.closest('.comment-reply-delete');
      if (replyDelBtn) {
        const commentId = replyDelBtn.getAttribute('data-comment-id');
        const replyId = replyDelBtn.getAttribute('data-reply-id');
        const tid = replyDelBtn.getAttribute('data-task-id');
        if (!commentId || !replyId || !tid) return;
        if (!UI.confirmDialog('Hapus sub log ini? Tindakan ini tidak dapat dibatalkan.')) return;
        if (Store.deleteReply(tid, commentId, replyId)) {
          UI.showToast('Sub log dihapus', 'info');
        }
        refreshComments(tid);
        return;
      }

      const btn = e.target.closest('.comment-delete');
      if (!btn) return;
      const commentId = btn.getAttribute('data-comment-id');
      const taskId = btn.getAttribute('data-task-id');
      if (!commentId || !taskId) return;
      if (!UI.confirmDialog('Hapus progress log ini? Tindakan ini tidak dapat dibatalkan.')) return;
      if (!Store.deleteComment(taskId, commentId)) {
        UI.showToast('Progress log tidak ditemukan', 'error');
        return;
      }
      UI.showToast('Progress log dihapus', 'info');
      refreshComments(taskId);
    });

    list.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const form = e.target.closest('.comment-reply-form');
      if (!form) return;
      e.preventDefault();
      const saveBtn = form.querySelector('.comment-reply-save');
      if (saveBtn) saveBtn.click();
    });
  }

  function refreshComments(taskId) {
    const task = Store.getTasks().find(t => t.id === taskId);
    renderComments(task ? (task.comments || []) : [], taskId);
    renderBoard();
    if (TaskDetail.isVisible() && TaskDetail.getCurrentTaskId() === taskId) {
      TaskDetail.show(taskId);
    }
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

    const comment = Store.addComment(id, text);
    if (!comment) return;

    input.value = '';
    const task = Store.getTasks().find(t => t.id === id);
    renderComments(task ? (task.comments || []) : [], id);
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
    const sme_lead = document.getElementById('taskSmeLead').value.trim();
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
      sme_lead,
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

    if (TaskDetail.isVisible()) {
      const currentId = TaskDetail.getCurrentTaskId();
      if (currentId) TaskDetail.show(currentId);
    }
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

    if (TaskDetail.isVisible()) {
      window.location.hash = '';
    }
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

    if (TaskDetail.isVisible()) {
      const currentId = TaskDetail.getCurrentTaskId();
      if (currentId) TaskDetail.show(currentId);
    }
  }

  function getClosedTasks() {
    const boardId = Store.getCurrentBoardId();
    if (!boardId) return [];
    return Store.getState().tasks.filter(t => t.closed && t.board_id === boardId);
  }

  function updateClosedCount() {
    const el = document.getElementById('closedCount');
    if (!el) return;
    el.textContent = getClosedTasks().length;
  }

  function openClosedModal() {
    renderClosedList();
    UI.openModal('closedModal');
  }

  function renderClosedList() {
    const list = document.getElementById('closedList');
    const closed = getClosedTasks();
    list.innerHTML = '';

    if (!Store.getCurrentBoardId()) {
      list.innerHTML = '<div class="no-comments">Pilih board terlebih dahulu.</div>';
      return;
    }

    if (closed.length === 0) {
      list.innerHTML = '<div class="no-comments">Belum ada ticket tertutup di board ini.</div>';
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

    if (TaskDetail.isVisible()) {
      const currentId = TaskDetail.getCurrentTaskId();
      if (currentId) TaskDetail.show(currentId);
    }
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
    document.getElementById('ticketSmeLead').value = '';
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
      sme_lead: document.getElementById('ticketSmeLead').value.trim(),
      assigned_by: document.getElementById('ticketAssignedBy').value.trim(),
      column: 'todo'
    });

    UI.closeModal('ticketModal');
    Task.renderBoard();
    Search.updateAssigneeFilter();
    UI.showToast('Ticket created in To Do', 'success');

    if (TaskDetail.isVisible()) {
      const currentId = TaskDetail.getCurrentTaskId();
      if (currentId) TaskDetail.show(currentId);
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function init() {
    loadViewMode();
    syncViewToggle();

    document.getElementById('btnViewCard').addEventListener('click', () => setViewMode('card'));
    document.getElementById('btnViewList').addEventListener('click', () => setViewMode('list'));

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

    bindCommentDelete();

    document.getElementById('taskTitle').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveTask();
    });
  }

  return {
    init,
    renderBoard,
    renderCard,
    renderList,
    setupCards,
    getViewMode,
    setViewMode,
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
