const Benchmark = (() => {

  function open() {
    const boardId = Store.getCurrentBoardId();
    if (!boardId) {
      UI.showToast('Pilih board terlebih dahulu', 'error');
      return;
    }

    const board = Store.getBoard(boardId);
    document.getElementById('benchmarkBoardName').textContent = board
      ? `Board: ${board.name}`
      : '';

    render(Store.getBenchmark(boardId));
    UI.openModal('benchmarkModal');
  }

  function render(list) {
    const container = document.getElementById('benchmarkList');
    container.innerHTML = '';

    if (!list || list.length === 0) {
      container.innerHTML = '<div class="no-comments">Belum ada task pada board ini.</div>';
      return;
    }
    const totals = list.reduce((acc, e) => {
      acc.total += e.total;
      acc.done += e.done;
      return acc;
    }, { total: 0, done: 0 });
    const overallPct = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;

    const overall = document.createElement('div');
    overall.className = 'benchmark-item benchmark-overall';
    overall.innerHTML = `
      <div class="benchmark-item-header">
        <span class="benchmark-name">Overall</span>
        <span class="benchmark-count">${totals.done}/${totals.total} task</span>
        <span class="benchmark-pct">${overallPct}%</span>
      </div>
      <div class="benchmark-track">
        <div class="benchmark-bar ${pctClass(overallPct)}" style="width:${overallPct}%"></div>
      </div>
    `;
    container.appendChild(overall);

    list.forEach(e => {
      const item = document.createElement('div');
      item.className = 'benchmark-item';
      item.innerHTML = `
        <div class="benchmark-item-header">
          <span class="benchmark-name">${Task.escapeHtml(e.name)}</span>
          <span class="benchmark-count">${e.done}/${e.total} task</span>
          <span class="benchmark-pct">${e.pct}%</span>
        </div>
        <div class="benchmark-track">
          <div class="benchmark-bar ${pctClass(e.pct)}" style="width:${e.pct}%"></div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  function pctClass(pct) {
    if (pct >= 80) return 'is-high';
    if (pct >= 50) return 'is-mid';
    if (pct > 0) return 'is-low';
    return 'is-zero';
  }

  function init() {
    const btn = document.getElementById('btnBenchmark');
    if (btn) btn.addEventListener('click', open);
  }

  return {
    init,
    open
  };
})();
