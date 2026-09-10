const TaskDetail = (() => {
  let currentTaskId = null;

  function show(taskId) {
    const task = Store.getTasks().find(t => t.id === taskId);
    if (!task) {
      window.location.hash = '';
      return;
    }

    currentTaskId = taskId;
    render(task);

    document.getElementById('boardContainer').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('taskDetailView').style.display = 'block';

    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.add('open');
    }
  }

  function hide() {
    currentTaskId = null;
    document.getElementById('taskDetailView').style.display = 'none';
    document.getElementById('boardContainer').style.display = '';
    if (Store.getCurrentBoardId()) {
      Board.showEmptyState(false);
    }
  }

  function render(task) {
    const board = Store.getBoard(task.board_id);
    const boardName = board ? board.name : '';
    const statusLabel = Store.COLUMN_LABELS[task.column] || task.column;
    const priorityLabel = Store.PRIORITY_LABELS[task.priority] || task.priority;
    const dueDateStatus = UI.getDueDateStatus(task.due_date);

    let breadcrumb = `<a href="#" class="breadcrumb-link">Boards</a>`;
    if (boardName) {
      breadcrumb += ` <span class="breadcrumb-sep">/</span> <a href="#" class="breadcrumb-link" onclick="TaskDetail.goBack(); return false;">${escapeHtml(boardName)}</a>`;
    }
    breadcrumb += ` <span class="breadcrumb-sep">/</span> <span class="breadcrumb-current">Task</span>`;

    let dueDateHtml = '<span class="detail-muted">No due date</span>';
    if (task.due_date) {
      let dueClass = 'detail-due-normal';
      if (dueDateStatus === 'overdue') dueClass = 'detail-due-overdue';
      else if (dueDateStatus === 'today') dueClass = 'detail-due-today';
      else if (dueDateStatus === 'soon') dueClass = 'detail-due-soon';
      dueDateHtml = `<span class="${dueClass}">${UI.icon('icon-calendar')} ${UI.formatDate(task.due_date)}</span>`;
    }

    let assigneeHtml = '<span class="detail-muted">Unassigned</span>';
    if (task.assignee) {
      assigneeHtml = `<span class="detail-assignee">${UI.icon('icon-user')} ${escapeHtml(task.assignee)}</span>`;
    }

    let assignedByHtml = '';
    if (task.assigned_by) {
      assignedByHtml = `<div class="detail-row"><span class="detail-label">Assigned By</span><span>${escapeHtml(task.assigned_by)}</span></div>`;
    }

    const closedBadge = task.closed
      ? `<span class="detail-badge detail-badge-closed">${UI.icon('icon-archive')} Closed</span>`
      : '';

    const comments = (task.comments || []).slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));

    let commentsHtml = '';
    if (comments.length === 0) {
      commentsHtml = '<div class="detail-no-comments">No progress logs yet.</div>';
    } else {
      commentsHtml = comments.map(c => {
        const dateStr = c.created_at
          ? new Date(c.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
          : '';
        return `
          <div class="detail-comment">
            <div class="detail-comment-header">
              <span class="detail-comment-date">${dateStr}</span>
            </div>
            <div class="detail-comment-body">${escapeHtml(c.text)}</div>
          </div>`;
      }).join('');
    }

    const canEdit = !task.closed;
    const canClose = !task.closed;
    const canReopen = task.closed;

    let actionsHtml = '';
    if (canEdit) {
      actionsHtml += `<button class="btn btn-primary" id="detailBtnEdit">${UI.icon('icon-edit')} Edit</button>`;
    }
    if (canClose) {
      actionsHtml += `<button class="btn btn-outline" id="detailBtnClose">${UI.icon('icon-archive')} Close Ticket</button>`;
    }
    if (canReopen) {
      actionsHtml += `<button class="btn btn-primary" id="detailBtnReopen">${UI.icon('icon-reopen')} Reopen</button>`;
    }
    actionsHtml += `<button class="btn btn-danger" id="detailBtnDelete">${UI.icon('icon-trash')} Delete</button>`;

    document.getElementById('taskDetailView').innerHTML = `
      <div class="detail-page">
        <div class="detail-topbar">
          <button class="btn btn-outline detail-back-btn" id="detailBtnBack">
            ${UI.icon('icon-reopen')} Back to Board
          </button>
          <div class="detail-breadcrumb">${breadcrumb}</div>
        </div>

        <div class="detail-container">
          <div class="detail-main">
            <div class="detail-header">
              <h1 class="detail-title">${escapeHtml(task.title)}</h1>
              <div class="detail-header-badges">
                <span class="detail-badge detail-badge-priority detail-badge-${task.priority}">${priorityLabel}</span>
                <span class="detail-badge detail-badge-status">${UI.icon('icon-clipboard')} ${statusLabel}</span>
                ${closedBadge}
              </div>
            </div>

            <div class="detail-meta-bar">
              <div class="detail-row"><span class="detail-label">Assignee</span>${assigneeHtml}</div>
              ${assignedByHtml}
              <div class="detail-row"><span class="detail-label">Due Date</span>${dueDateHtml}</div>
              <div class="detail-row"><span class="detail-label">Created</span><span class="detail-muted">${UI.formatDateTime(task.created_at)}</span></div>
            </div>

            ${task.description ? `
              <div class="detail-section">
                <h3 class="detail-section-title">Description</h3>
                <div class="detail-description">${escapeHtml(task.description).replace(/\n/g, '<br>')}</div>
              </div>
            ` : ''}

            <div class="detail-section">
              <h3 class="detail-section-title">Progress Log <span class="detail-comment-count">${comments.length}</span></h3>
              <div class="detail-comments-list">
                ${commentsHtml}
              </div>
              ${!task.closed ? `
                <div class="detail-comment-form">
                  <textarea id="detailCommentInput" rows="2" placeholder="Write a progress update..." maxlength="300"></textarea>
                  <button class="btn btn-primary" id="detailBtnAddComment">${UI.icon('icon-comment')} Add Comment</button>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="detail-sidebar">
            <div class="detail-actions">
              <h3 class="detail-section-title">Actions</h3>
              <div class="detail-action-buttons">
                ${actionsHtml}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    bindEvents(task);
  }

  function bindEvents(task) {
    const backBtn = document.getElementById('detailBtnBack');
    if (backBtn) {
      backBtn.addEventListener('click', () => goBack());
    }

    const editBtn = document.getElementById('detailBtnEdit');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        openEditModal(task.id);
      });
    }

    const closeBtn = document.getElementById('detailBtnClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (UI.confirmDialog('Close this ticket? It will move to the Closed list and can be reopened later.')) {
          Store.closeTask(task.id);
          UI.showToast('Ticket closed', 'success');
          show(task.id);
          Task.renderBoard();
          Search.updateAssigneeFilter();
        }
      });
    }

    const reopenBtn = document.getElementById('detailBtnReopen');
    if (reopenBtn) {
      reopenBtn.addEventListener('click', () => {
        Store.reopenTask(task.id);
        UI.showToast('Ticket reopened', 'success');
        show(task.id);
        Task.renderBoard();
        Search.updateAssigneeFilter();
      });
    }

    const deleteBtn = document.getElementById('detailBtnDelete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (UI.confirmDialog('Delete this task? This cannot be undone.')) {
          Store.deleteTask(task.id);
          UI.showToast('Task deleted', 'info');
          Task.renderBoard();
          Search.updateAssigneeFilter();
          window.location.hash = '';
        }
      });
    }

    const commentInput = document.getElementById('detailCommentInput');
    const addCommentBtn = document.getElementById('detailBtnAddComment');

    if (addCommentBtn && commentInput) {
      const addComment = () => {
        const text = commentInput.value.trim();
        if (!text) return;

        const t = Store.getTasks().find(tk => tk.id === task.id);
        if (!t) return;
        if (!Array.isArray(t.comments)) t.comments = [];
        t.comments.push({
          text: text,
          created_at: new Date().toISOString()
        });
        Store.save();

        commentInput.value = '';
        show(task.id);
        Task.renderBoard();
        UI.showToast('Progress log added', 'success');
      };

      addCommentBtn.addEventListener('click', addComment);
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          addComment();
        }
      });
    }
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
    document.getElementById('btnCloseTicket').style.display = task.closed ? 'none' : 'inline-block';
    document.getElementById('commentInput').value = '';
    document.getElementById('commentsList').innerHTML = '';
    UI.openModal('taskModal');
  }

  function goBack() {
    window.location.hash = '';
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function isVisible() {
    return currentTaskId !== null;
  }

  function getCurrentTaskId() {
    return currentTaskId;
  }

  return {
    show,
    hide,
    goBack,
    isVisible,
    getCurrentTaskId,
    openEditModal,
    escapeHtml
  };
})();
