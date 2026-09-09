const Search = (() => {
  let query = '';
  let priorityFilter = '';
  let assigneeFilter = '';
  let dueDateFilter = '';
  let dateFrom = '';
  let dateTo = '';
  let sortKey = 'order';

  function matchesFilters(task, filters = getFilters()) {
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const inTitle = task.title.toLowerCase().includes(q);
      const inDesc = (task.description || '').toLowerCase().includes(q);
      const inAssignee = (task.assignee || '').toLowerCase().includes(q);
      if (!inTitle && !inDesc && !inAssignee) return false;
    }

    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.assignee && (task.assignee || '') !== filters.assignee) return false;

    if (filters.dueDate) {
      const due = task.due_date || '';
      const status = UI.getDueDateStatus(due);
      const today = status === 'today';
      const soon = status === 'soon';
      switch (filters.dueDate) {
        case 'overdue':
          if (status !== 'overdue') return false;
          break;
        case 'today':
          if (!today) return false;
          break;
        case 'soon':
          if (!today && !soon) return false;
          break;
        case 'nodate':
          if (due) return false;
          break;
      }
    }

    if ((filters.dateFrom || filters.dateTo)) {
      const due = task.due_date || '';
      if (!due) return false;
      if (filters.dateFrom && due < filters.dateFrom) return false;
      if (filters.dateTo && due > filters.dateTo) return false;
    }

    return true;
  }

  function sortColumnTasks(list) {
    const arr = list.slice();
    if (sortKey === 'order') {
      return arr.sort((a, b) => a.order - b.order);
    }
    const rank = { urgent: 3, high: 2, medium: 1, low: 0 };
    switch (sortKey) {
      case 'priority':
        arr.sort((a, b) => (rank[b.priority] || 0) - (rank[a.priority] || 0) || a.order - b.order);
        break;
      case 'due_asc':
        arr.sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999') || a.order - b.order);
        break;
      case 'due_desc':
        arr.sort((a, b) => (b.due_date || '0000').localeCompare(a.due_date || '0000') || a.order - b.order);
        break;
      case 'title_asc':
        arr.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'id'));
        break;
      case 'created_desc':
        arr.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        break;
    }
    return arr;
  }

  function getFilters() {
    return {
      query: query,
      priority: priorityFilter,
      assignee: assigneeFilter,
      dueDate: dueDateFilter,
      dateFrom: dateFrom,
      dateTo: dateTo
    };
  }

  function setSort(key) {
    sortKey = key || 'order';
  }

  function isSortActive() {
    return sortKey !== 'order';
  }

  function updateAssigneeFilter() {
    const select = document.getElementById('filterAssignee');
    const currentValue = assigneeFilter;
    const assignees = Store.getAssignees().sort();

    const newSelect = document.createElement('select');
    newSelect.id = 'filterAssignee';

    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All Assignees';
    newSelect.appendChild(allOption);

    assignees.forEach(a => {
      const option = document.createElement('option');
      option.value = a;
      option.textContent = a;
      newSelect.appendChild(option);
    });

    newSelect.value = currentValue;
    select.replaceWith(newSelect);

    newSelect.addEventListener('change', () => {
      assigneeFilter = newSelect.value;
      Task.renderBoard();
    });
  }

  function init() {
    const searchInput = document.getElementById('searchInput');

    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        query = searchInput.value.trim();
        Task.renderBoard();
      }, 300);
    });

    document.getElementById('filterPriority').addEventListener('change', (e) => {
      priorityFilter = e.target.value;
      Task.renderBoard();
    });

    document.getElementById('filterDueDate').addEventListener('change', (e) => {
      dueDateFilter = e.target.value;
      Task.renderBoard();
    });

    document.getElementById('sortTasks').addEventListener('change', (e) => {
      setSort(e.target.value);
      Task.renderBoard();
    });

    const filterFrom = document.getElementById('filterDateFrom');
    const filterTo = document.getElementById('filterDateTo');
    filterFrom.addEventListener('input', () => {
      dateFrom = filterFrom.value;
      if (filterTo.value && filterTo.value < dateFrom) filterTo.value = dateFrom;
      dateTo = filterTo.value;
      Task.renderBoard();
    });
    filterTo.addEventListener('input', () => {
      dateTo = filterTo.value;
      if (filterFrom.value && dateTo < filterFrom.value) filterFrom.value = dateTo;
      dateFrom = filterFrom.value;
      Task.renderBoard();
    });

    updateAssigneeFilter();
  }

  return {
    init,
    getFilters,
    matchesFilters,
    sortColumnTasks,
    setSort,
    isSortActive,
    updateAssigneeFilter
  };
})();
