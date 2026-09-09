const Store = (() => {
  const STORAGE_KEY = 'kanbanAppData';

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

  function addTask(taskData) {
    const task = Object.assign({
      id: generateId(),
      board_id: state.currentBoardId,
      title: '',
      description: '',
      column: 'todo',
      priority: 'medium',
      assignee: '',
      assigned_by: '',
      due_date: '',
      comments: [],
      closed: false,
      closed_at: null,
      created_at: new Date().toISOString(),
      order: getTasksForBoard(state.currentBoardId).filter(t => t.column === taskData.column).length
    }, taskData);
    state.tasks.push(task);
    save();
    return task;
  }

  function updateTask(id, updates) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
      Object.assign(task, updates);
      save();
      return task;
    }
    return null;
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    save();
  }

  function closeTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return null;
    task.closed = true;
    task.closed_at = new Date().toISOString();
    save();
    return task;
  }

  function reopenTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return null;
    task.closed = false;
    task.closed_at = null;
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
    return task;
  }

  function getAssignees() {
    const assignees = new Set();
    state.tasks.forEach(t => {
      if (t.assignee) assignees.add(t.assignee);
    });
    return Array.from(assignees);
  }

  function importData(data) {
    state = data;
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
    closeTask,
    reopenTask,
    moveTask,
    getAssignees,
    importData,
    generateId,
    COLUMNS: ['todo', 'inprogress', 'review', 'done'],
    COLUMN_LABELS: { todo: 'To Do', inprogress: 'In Progress', review: 'Review', done: 'Done' },
    PRIORITY_LABELS: { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }
  };
})();
