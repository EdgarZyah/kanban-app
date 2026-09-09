const DragDrop = (() => {
  const DRAG_THRESHOLD = 6;
  let suppressClick = false;
  let dragState = null;
  let highlightedList = null;

  function startPointerDrag(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const card = e.currentTarget;
    const taskId = card.dataset.taskId;
    if (!taskId) return;

    const state = {
      pointerId: e.pointerId,
      card: card,
      taskId: taskId,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
      dead: false,
      ghost: null
    };

    dragState = state;

    try {
      card.setPointerCapture(e.pointerId);
    } catch (err) {}

    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerup', onPointerUp);
    card.addEventListener('pointercancel', onPointerCancel);
  }

  function onPointerMove(e) {
    const state = dragState;
    if (!state || e.pointerId !== state.pointerId || state.dead) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (!state.dragging) {
      let initiate = false;

      if (e.pointerType === 'mouse') {
        initiate = Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD;
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > DRAG_THRESHOLD) {
        state.dead = true;
        return;
      } else {
        initiate = Math.abs(dx) > DRAG_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.15;
      }

      if (!initiate) return;

      state.dragging = true;
      suppressClick = true;
      state.card.classList.add('dragging');
      state.ghost = createGhost(state.card);
      document.body.appendChild(state.ghost);
      if (e.cancelable) e.preventDefault();
    }

    positionGhost(state.ghost, e.clientX, e.clientY);
    highlightDropZone(e.clientX, e.clientY);
  }

  function onPointerUp(e) {
    const state = dragState;
    if (!state || e.pointerId !== state.pointerId) return;

    cleanupDragListeners(state);

    if (state.dragging) {
      const list = hitTestTaskList(e.clientX, e.clientY);
      if (list) {
        const order = Search.isSortActive() ? undefined : computeOrder(list, e.clientY);
        Store.moveTask(state.taskId, list.dataset.column, order);
        Task.renderBoard();
      }
    }

    finalize(state);
  }

  function onPointerCancel(e) {
    const state = dragState;
    if (!state || e.pointerId !== state.pointerId) return;

    cleanupDragListeners(state);
    finalize(state);
  }

  function cleanupDragListeners(state) {
    state.card.removeEventListener('pointermove', onPointerMove);
    state.card.removeEventListener('pointerup', onPointerUp);
    state.card.removeEventListener('pointercancel', onPointerCancel);
    try {
      state.card.releasePointerCapture(state.pointerId);
    } catch (err) {}
  }

  function finalize(state) {
    if (state.dragging) {
      state.card.classList.remove('dragging');
      if (state.ghost && state.ghost.parentNode) {
        state.ghost.remove();
      }
      clearHighlight();
    }
    setTimeout(() => { suppressClick = false; }, 0);
    dragState = null;
  }

  function createGhost(card) {
    const ghost = card.cloneNode(true);
    ghost.classList.add('drag-ghost');
    const rect = card.getBoundingClientRect();
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    return ghost;
  }

  function positionGhost(ghost, x, y) {
    ghost.style.transform = `translate(${x - ghost.offsetWidth / 2}px, ${y - 20}px)`;
  }

  function hitTestTaskList(x, y) {
    const els = document.elementsFromPoint(x, y);
    for (let i = 0; i < els.length; i++) {
      const list = els[i].closest('.task-list');
      if (list) return list;
    }
    return null;
  }

  function computeOrder(list, y) {
    const cards = Array.from(list.querySelectorAll('.task-card:not(.dragging)'));
    if (cards.length === 0) return 0;

    const after = getDragAfterElement(cards, y);
    if (after === null) return cards.length;
    return cards.indexOf(after);
  }

  function getDragAfterElement(cards, y) {
    let closest = { offset: -Infinity, element: null };

    cards.forEach(el => {
      const box = el.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: el };
      }
    });

    return closest.element;
  }

  function highlightDropZone(x, y) {
    const list = hitTestTaskList(x, y);

    if (highlightedList && highlightedList !== list) {
      clearHighlight(highlightedList);
    }

    if (list) {
      list.classList.add('drag-over');

      let indicator = list.querySelector('.drop-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
      }

      const cards = Array.from(list.querySelectorAll('.task-card:not(.dragging)'));
      if (cards.length === 0) {
        list.appendChild(indicator);
      } else {
        const after = getDragAfterElement(cards, y);
        if (after === null) {
          list.insertBefore(indicator, list.firstChild);
        } else {
          list.insertBefore(indicator, after);
        }
      }

      highlightedList = list;
    }
  }

  function clearHighlight(list) {
    const target = list || document.querySelectorAll('.task-list.drag-over');
    if (target instanceof Element) {
      target.classList.remove('drag-over');
      const indicator = target.querySelector('.drop-indicator');
      if (indicator) indicator.remove();
      return;
    }
    target.forEach(el => {
      el.classList.remove('drag-over');
      const indicator = el.querySelector('.drop-indicator');
      if (indicator) indicator.remove();
    });
    highlightedList = null;
  }

  function consumeClick() {
    const value = suppressClick;
    suppressClick = false;
    return value;
  }

  function setupDrop() {}

  return {
    startPointerDrag,
    consumeClick,
    setupDrop
  };
})();