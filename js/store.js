const Store = (() => {
  const STORAGE_KEY = 'kanbanAppData';
  const DEADLINE_CRITICAL_DAYS = 3;
  const DEADLINE_WEEK_DAYS = 7;
  const DEADLINE_URGENT_DAYS = 14;
  const DEADLINE_ALERT_DAYS = 30;
  const DEADLINE_MONTH_DAYS = 90;
  const PRIORITY_RANK = { low: 0, medium: 1, high: 2, urgent: 3 };
  const COLUMNS = ['todo', 'inprogress', 'review', 'done'];
  const DEADLINE_LEVEL_PRIORITY = {
    month: 'medium',
    alert: 'high',
    urgent: 'urgent',
    week: 'urgent',
    critical: 'urgent',
    overdue: 'urgent'
  };

  let state = {
    boards: [],
    tasks: [],
    currentBoardId: null
  };

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state = JSON.parse(saved);
        normalizeTasks();
        applyDeadlinePriorities();
      }
    } catch (e) {
      state = { boards: [], tasks: [], currentBoardId: null };
    }
    return state;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  function getState() {
    return state;
  }

  function setState(newState) {
    state = newState;
  }

  function getBoards() {
    return state.boards;
  }

  function getTasks() {
    return state.tasks;
  }

  function getBoard(id) {
    return state.boards.find(b => b.id === id) || null;
  }

  function getTasksForBoard(boardId) {
    return state.tasks.filter(t => t.board_id === boardId);
  }

  function getCurrentBoardId() {
    return state.currentBoardId;
  }

  function setCurrentBoardId(id) {
    state.currentBoardId = id;
    save();
  }

  function addBoard(name) {
    const board = {
      id: generateId(),
      name: name.trim(),
      created_at: new Date().toISOString()
    };
    state.boards.push(board);
    save();
    return board;
  }

  function updateBoard(id, name) {
    const board = getBoard(id);
    if (board) {
      board.name = name.trim();
      save();
      return board;
    }
    return null;
  }

  function deleteBoard(id) {
    state.boards = state.boards.filter(b => b.id !== id);
    state.tasks = state.tasks.filter(t => t.board_id !== id);
    if (state.currentBoardId === id) {
      state.currentBoardId = null;
    }
    save();
  }

  function titleCase(str) {
    const s = String(str || '');
    const isLetter = c => /[a-zA-ZÀ-ÿ]/.test(c);
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const prev = i > 0 ? s[i - 1] : '';
      out += isLetter(ch) && !isLetter(prev) ? ch.toUpperCase() : ch;
    }
    return out;
  }

  function addTask(taskData) {
    const task = Object.assign({
      id: generateId(),
      board_id: state.currentBoardId,
      title: '',
      description: '',
      column: 'todo',
      priority: 'medium',
      assignee: '',
      sme_lead: '',
      assigned_by: '',
      due_date: '',
      comments: [],
      closed: false,
      closed_at: null,
      created_at: new Date().toISOString(),
      order: getTasksForBoard(state.currentBoardId).filter(t => t.column === taskData.column).length
    }, taskData);
    task.title = titleCase(task.title);
    task.base_priority = task.priority || 'medium';
    state.tasks.push(task);
    recomputePriority(task);
    save();
    return task;
  }

  function updateTask(id, updates) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
      if (updates.priority) {
        task.base_priority = updates.priority;
      }
      Object.assign(task, updates);
      if (updates.title !== undefined) task.title = titleCase(task.title);
      recomputePriority(task);
      save();
      return task;
    }
    return null;
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    save();
  }

  function addComment(taskId, text) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return null;
    const body = String(text || '').trim();
    if (!body) return null;
    if (!Array.isArray(task.comments)) task.comments = [];
    const comment = {
      id: generateId(),
      text: body,
      done: false,
      replies: [],
      created_at: new Date().toISOString()
    };
    task.comments.push(comment);
    save();
    return comment;
  }

  function getComment(taskId, commentId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || !Array.isArray(task.comments)) return null;
    return task.comments.find(c => c.id === commentId) || null;
  }

  function addReply(taskId, commentId, text) {
    const comment = getComment(taskId, commentId);
    if (!comment) return null;
    const body = String(text || '').trim();
    if (!body) return null;
    if (!Array.isArray(comment.replies)) comment.replies = [];
    const reply = {
      id: generateId(),
      text: body,
      created_at: new Date().toISOString()
    };
    comment.replies.push(reply);
    save();
    return reply;
  }

  function deleteReply(taskId, commentId, replyId) {
    const comment = getComment(taskId, commentId);
    if (!comment || !Array.isArray(comment.replies)) return false;
    const index = comment.replies.findIndex(r => r.id === replyId);
    if (index === -1) return false;
    comment.replies.splice(index, 1);
    save();
    return true;
  }

  function toggleReplyDone(taskId, commentId, replyId) {
    const comment = getComment(taskId, commentId);
    if (!comment || !Array.isArray(comment.replies)) return null;
    const reply = comment.replies.find(r => r.id === replyId);
    if (!reply) return null;
    reply.done = !reply.done;
    save();
    return reply;
  }

  function toggleCommentDone(taskId, commentId) {
    const comment = getComment(taskId, commentId);
    if (!comment) return null;
    comment.done = !comment.done;
    save();
    return comment;
  }

  function deleteComment(taskId, commentId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || !Array.isArray(task.comments)) return false;
    const index = task.comments.findIndex(c => c.id === commentId);
    if (index === -1) return false;
    task.comments.splice(index, 1);
    save();
    return true;
  }

  function closeTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return null;
    task.closed = true;
    task.closed_at = new Date().toISOString();
    if (task.column !== 'done') {
      task.prev_column = task.column;
      task.column = 'done';
    }
    recomputePriority(task);
    save();
    return task;
  }

  function reopenTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return null;
    task.closed = false;
    task.closed_at = null;
    if (task.prev_column && COLUMNS.includes(task.prev_column)) {
      task.column = task.prev_column;
    }
    delete task.prev_column;
    recomputePriority(task);
    save();
    return task;
  }

  function moveTask(taskId, newColumn, newOrder) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return null;

    const oldColumn = task.column;
    const oldOrder = task.order;

    task.column = newColumn;

    if (oldColumn === newColumn) {
      const siblings = getTasksForBoard(task.board_id)
        .filter(t => t.column === newColumn)
        .sort((a, b) => a.order - b.order);

      if (newOrder !== undefined) {
        const currentIndex = siblings.findIndex(t => t.id === taskId);
        siblings.splice(currentIndex, 1);
        siblings.splice(newOrder, 0, task);
        siblings.forEach((t, i) => { t.order = i; });
      }
    } else {
      const oldSiblings = getTasksForBoard(task.board_id)
        .filter(t => t.column === oldColumn)
        .sort((a, b) => a.order - b.order);
      oldSiblings.forEach((t, i) => { t.order = i; });

      const newSiblings = getTasksForBoard(task.board_id)
        .filter(t => t.column === newColumn && t.id !== taskId)
        .sort((a, b) => a.order - b.order);

      if (newOrder !== undefined) {
        newSiblings.splice(Math.min(newOrder, newSiblings.length), 0, task);
      } else {
        newSiblings.push(task);
      }
      newSiblings.forEach((t, i) => { t.order = i; });
    }

    save();
    recomputePriority(task);
    return task;
  }

  function daysUntilDue(task) {
    if (!task || !task.due_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.due_date + 'T00:00:00');
    if (isNaN(due)) return null;
    return Math.round((due - today) / (1000 * 60 * 60 * 24));
  }

  function getTaskAlertLevel(task) {
    if (!task || !task.due_date) return null;
    if (task.closed) return null;
    if (task.column === 'done') return null;
    const diff = daysUntilDue(task);
    if (diff === null) return null;
    if (diff < 0) return 'overdue';
    if (diff < DEADLINE_CRITICAL_DAYS) return 'critical';
    if (diff < DEADLINE_WEEK_DAYS) return 'week';
    if (diff < DEADLINE_URGENT_DAYS) return 'urgent';
    if (diff < DEADLINE_ALERT_DAYS) return 'alert';
    if (diff < DEADLINE_MONTH_DAYS) return 'month';
    return null;
  }

  function isTaskOverdue(task) {
    return getTaskAlertLevel(task) === 'overdue';
  }

  function normalizeTasks() {
    state.tasks.forEach(t => {
      t.title = titleCase(t.title);
      if (t.closed && t.column !== 'done') {
        if (!t.prev_column) t.prev_column = t.column;
        t.column = 'done';
      }
      if (!t.priority) t.priority = 'medium';
      t.assignee = String(t.assignee || '');
      t.sme_lead = String(t.sme_lead || '');
      t.assigned_by = String(t.assigned_by || '');
      if (t.base_priority === undefined || t.base_priority === null) {
        t.base_priority = t.priority;
      }
      if (!Array.isArray(t.comments)) {
        t.comments = [];
      } else {
        t.comments.forEach(c => {
          if (!c || typeof c !== 'object') return;
          if (!c.id) c.id = generateId();
          if (!c.created_at) c.created_at = new Date().toISOString();
          c.text = String(c.text || '');
          c.done = !!c.done;
          if (!Array.isArray(c.replies)) {
            c.replies = [];
          } else {
            c.replies.forEach(r => {
              if (!r || typeof r !== 'object') return;
              if (!r.id) r.id = generateId();
              if (!r.created_at) r.created_at = new Date().toISOString();
              r.text = String(r.text || '');
              r.done = !!r.done;
            });
          }
        });
      }
    });
  }

  function recomputePriority(task) {
    if (!task) return;
    if (task.base_priority === undefined || task.base_priority === null) {
      task.base_priority = task.priority || 'medium';
    }
    const level = getTaskAlertLevel(task);
    const auto = level ? DEADLINE_LEVEL_PRIORITY[level] : null;
    if (!auto) {
      task.priority = task.base_priority;
      return;
    }
    const baseRank = PRIORITY_RANK[task.base_priority] !== undefined ? PRIORITY_RANK[task.base_priority] : 0;
    const autoRank = PRIORITY_RANK[auto] !== undefined ? PRIORITY_RANK[auto] : 0;
    task.priority = autoRank > baseRank ? auto : task.base_priority;
  }

  function applyDeadlinePriorities() {
    normalizeTasks();
    let changed = false;
    state.tasks.forEach(t => {
      const before = t.priority;
      recomputePriority(t);
      if (t.priority !== before) changed = true;
    });
    if (changed) save();
  }

  function getAssignees(boardId) {
    const tasks = boardId ? getTasksForBoard(boardId) : state.tasks;
    const assignees = new Set();
    tasks.forEach(t => {
      if (t.assignee) assignees.add(t.assignee);
    });
    return Array.from(assignees);
  }

  function getAssignedBy(boardId) {
    const tasks = boardId ? getTasksForBoard(boardId) : state.tasks;
    const pms = new Set();
    tasks.forEach(t => {
      if (t.assigned_by) pms.add(t.assigned_by);
    });
    return Array.from(pms);
  }

  function isTaskDone(t) {
    return !!t && (t.column === 'done' || !!t.closed);
  }

  function getBenchmark(boardId) {
    const tasks = boardId ? getTasksForBoard(boardId) : state.tasks;
    const map = new Map();

    tasks.forEach(t => {
      const key = (t.assigned_by || '').trim() || 'Tanpa PM';
      if (!map.has(key)) {
        map.set(key, { name: key, total: 0, done: 0, pct: 0 });
      }
      const entry = map.get(key);
      entry.total += 1;
      if (isTaskDone(t)) entry.done += 1;
    });

    const list = Array.from(map.values());
    list.forEach(e => {
      e.pct = e.total > 0 ? Math.round((e.done / e.total) * 100) : 0;
    });
    list.sort((a, b) => b.pct - a.pct || b.total - a.total);
    return list;
  }

  function importData(data) {
    state = data;
    normalizeTasks();
    applyDeadlinePriorities();
    save();
  }

  function generateId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  return {
    load,
    save,
    getState,
    setState,
    getBoards,
    getTasks,
    getBoard,
    getTasksForBoard,
    getCurrentBoardId,
    setCurrentBoardId,
    addBoard,
    updateBoard,
    deleteBoard,
    addTask,
    updateTask,
    deleteTask,
    addComment,
    deleteComment,
    addReply,
    deleteReply,
    toggleReplyDone,
    toggleCommentDone,
    closeTask,
    reopenTask,
    moveTask,
    getAssignees,
    getAssignedBy,
    getBenchmark,
    isTaskDone,
    isTaskOverdue,
    getTaskAlertLevel,
    daysUntilDue,
    applyDeadlinePriorities,
    importData,
    generateId,
    DEADLINE_CRITICAL_DAYS,
    DEADLINE_WEEK_DAYS,
    DEADLINE_URGENT_DAYS,
    DEADLINE_ALERT_DAYS,
    DEADLINE_MONTH_DAYS,
    COLUMNS,
    COLUMN_LABELS: { todo: 'To Do', inprogress: 'In Progress', review: 'Review', done: 'Done' },
    PRIORITY_LABELS: { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }
  };
})();
