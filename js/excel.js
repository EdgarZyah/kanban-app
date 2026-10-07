const ExcelManager = (() => {
  const BOARD_SHEET = 'boards';

  const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E2E52"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFB9C6DC"/></left>
      <right style="thin"><color rgb="FFB9C6DC"/></right>
      <top style="thin"><color rgb="FFB9C6DC"/></top>
      <bottom style="thin"><color rgb="FFB9C6DC"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  function buildContentTypes(sheetEntries) {
    const overrides = sheetEntries.map((e, i) =>
      `  <Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    ).join('\n');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${overrides}
</Types>`;
  }

  function buildWorkbookXml(sheetEntries) {
    const sheets = sheetEntries.map((e, i) =>
      `    <sheet name="${escapeXml(e.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
    ).join('\n');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
${sheets}
  </sheets>
</workbook>`;
  }

  function buildWorkbookRels(sheetEntries) {
    const rels = sheetEntries.map((e, i) =>
      `  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    ).join('\n');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${rels}
  <Relationship Id="rId${sheetEntries.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  }

  function buildStyledWorkbook(state) {
    const boardHeaders = ['id', 'name', 'created_at'];
    const boardRows = state.boards.map(b => [b.id, b.name, b.created_at]);
    const boardWidths = [30, 28, 24];

    const taskHeaders = ['id', 'title', 'description', 'status', 'priority', 'due_date',
      'sme', 'sme_lead', 'pm', 'progress_log', 'closed', 'closed_at', 'created_at', 'order'];
    const taskWidths = [30, 28, 40, 14, 12, 14, 16, 16, 16, 48, 10, 24, 24, 8];

    const boardsXml = buildSheetXml('boards', boardHeaders, boardRows, boardWidths);

    const sheetEntries = [{ name: 'boards', xml: boardsXml }];

    state.boards.forEach(board => {
      const boardTasks = state.tasks.filter(t => t.board_id === board.id);
      const rows = boardTasks.map(t => [
        t.id, t.title, t.description || '', Store.COLUMN_LABELS[t.column] || t.column,
        t.priority || 'medium', t.due_date || '', t.assignee || '', t.sme_lead || '', t.assigned_by || '',
        serializeComments(t.comments),
        t.closed ? 1 : 0, t.closed_at || '', t.created_at || '', t.order
      ]);
      const sheetName = sanitizeSheetName(board.name);
      const taskXml = buildSheetXml(sheetName, taskHeaders, rows, taskWidths);
      sheetEntries.push({ name: sheetName, xml: taskXml });
    });

    const parts = [
      { name: '[Content_Types].xml', data: buildContentTypes(sheetEntries) },
      { name: '_rels/.rels', data: ROOT_RELS },
      { name: 'xl/workbook.xml', data: buildWorkbookXml(sheetEntries) },
      { name: 'xl/_rels/workbook.xml.rels', data: buildWorkbookRels(sheetEntries) },
      { name: 'xl/styles.xml', data: STYLES_XML }
    ];

    sheetEntries.forEach((e, i) => {
      parts.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: e.xml });
    });

    return zipStore(parts);
  }

  function sanitizeSheetName(name) {
    let safe = name.replace(/[\\\/\?\*\[\]:]/g, '_').trim();
    if (safe.length > 31) safe = safe.substring(0, 31);
    if (!safe) safe = 'Board';
    return safe;
  }

  function buildSheetXml(name, headers, rows, widths) {
    const lastCol = colName(headers.length);
    const lastRow = rows.length + 1;
    const colXml = widths
      .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
      .join('');

    let data = '<sheetData>';
    data += rowXml(1, headers.map((h, i) => ({ v: h, s: 1 })), 20);
    rows.forEach((r, ri) => {
      data += rowXml(ri + 2, r.map((v, ci) => ({ v: v, s: 2 })));
    });
    data += '</sheetData>';

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<dimension ref="A1:${lastCol}${lastRow}"/>` +
      `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
      `<sheetFormatPr defaultRowHeight="15"/>` +
      `<cols>${colXml}</cols>` +
      data +
      `<autoFilter ref="A1:${lastCol}${lastRow}"/>` +
      `<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>` +
      `</worksheet>`;
  }

  function rowXml(r, cells, rowHeight) {
    let xml = `<row r="${r}"${rowHeight ? ` ht="${rowHeight}" customHeight="1"` : ''}>`;
    cells.forEach((c, i) => {
      const ref = colName(i + 1) + r;
      const s = c.s;
      const v = c.v;
      if (v === undefined || v === null || v === '') {
        xml += `<c r="${ref}" s="${s}"/>`;
      } else if (typeof v === 'number') {
        xml += `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
      } else {
        xml += `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(v))}</t></is></c>`;
      }
    });
    xml += '</row>';
    return xml;
  }

  function colName(n) {
    let name = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  }

  function escapeXml(v) {
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function crc32(u8) {
    let crc = ~0;
    for (let i = 0; i < u8.length; i++) {
      crc ^= u8[i];
      for (let k = 0; k < 8; k++) {
        crc = (crc & 1) ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1;
      }
    }
    return (~crc) >>> 0;
  }

  function zipStore(parts) {
    const enc = new TextEncoder();
    const out = [];
    const central = [];
    let offset = 0;

    parts.forEach(p => {
      const nameBytes = enc.encode(p.name);
      const dataBytes = p.data instanceof Uint8Array ? p.data : enc.encode(p.data);
      const crc = crc32(dataBytes);

      const local = new Uint8Array(30 + nameBytes.length);
      const dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0, true);
      dv.setUint16(8, 0, true);
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, dataBytes.length, true);
      dv.setUint32(22, dataBytes.length, true);
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);
      local.set(nameBytes, 30);
      out.push(local, dataBytes);

      const cd = new Uint8Array(46 + nameBytes.length);
      const cdv = new DataView(cd.buffer);
      cdv.setUint32(0, 0x02014b50, true);
      cdv.setUint16(4, 20, true);
      cdv.setUint16(6, 20, true);
      cdv.setUint16(8, 0, true);
      cdv.setUint16(10, 0, true);
      cdv.setUint16(12, 0, true);
      cdv.setUint16(14, 0, true);
      cdv.setUint32(16, crc, true);
      cdv.setUint32(20, dataBytes.length, true);
      cdv.setUint32(24, dataBytes.length, true);
      cdv.setUint16(28, nameBytes.length, true);
      cdv.setUint16(30, 0, true);
      cdv.setUint16(32, 0, true);
      cdv.setUint16(34, 0, true);
      cdv.setUint16(36, 0, true);
      cdv.setUint32(38, 0, true);
      cdv.setUint32(42, offset, true);
      cd.set(nameBytes, 46);
      central.push(cd);

      offset += local.length + dataBytes.length;
    });

    const cdSize = central.reduce((s, c) => s + c.length, 0);
    const end = new Uint8Array(22);
    const edv = new DataView(end.buffer);
    edv.setUint32(0, 0x06054b50, true);
    edv.setUint16(4, 0, true);
    edv.setUint16(6, 0, true);
    edv.setUint16(8, parts.length, true);
    edv.setUint16(10, parts.length, true);
    edv.setUint32(12, cdSize, true);
    edv.setUint32(16, offset, true);
    edv.setUint16(20, 0, true);

    out.push.apply(out, central);
    out.push(end);
    const total = out.reduce((s, a) => s + a.length, 0);
    const result = new Uint8Array(total);
    let pos = 0;
    out.forEach(a => { result.set(a, pos); pos += a.length; });
    return result;
  }

  function exportToExcel() {
    const state = Store.getState();
    const bytes = buildStyledWorkbook(state);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    const filename = `kanban-backup-${dateStr}_${timeStr}.xlsx`;

    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 100);
    return filename;
  }

  function importFromExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });

          if (!wb.Sheets[BOARD_SHEET]) {
            throw new Error('Invalid file format. Missing "boards" sheet.');
          }

          const boards = XLSX.utils.sheet_to_json(wb.Sheets[BOARD_SHEET]);

          let allTasks = [];

          if (wb.Sheets['tasks']) {
            allTasks = XLSX.utils.sheet_to_json(wb.Sheets['tasks']);
          } else {
            boards.forEach(b => {
              const sheetName = b.name;
              if (wb.Sheets[sheetName]) {
                const boardTasks = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
                boardTasks.forEach(t => {
                  if (!t.board_id) t.board_id = b.id;
                  allTasks.push(t);
                });
              }
            });
          }

          const state = {
            boards: boards.map(b => ({
              id: b.id || Store.generateId(),
              name: String(b.name || 'Untitled'),
              created_at: b.created_at || new Date().toISOString()
            })),
            tasks: allTasks.map(t => ({
              id: t.id || Store.generateId(),
              board_id: t.board_id || (boards[0] ? boards[0].id : null),
              title: String(t.title || ''),
              description: String(t.description || ''),
              column: resolveColumn(t.status !== undefined ? t.status : t.column),
              priority: t.priority || 'medium',
              assignee: String(pickValue(t.sme, t.pic, t.assignee)),
              sme_lead: String(pickValue(t.sme_lead, t.smeLead)),
              assigned_by: String(pickValue(t.pm, t.assigned_by)),
              due_date: formatExcelDate(t.due_date),
              comments: parseComments(pickValue(t.progress_log, t.comments)),
              closed: t.closed === true || t.closed === 1 || String(t.closed || '') === 'true' || String(t.closed || '') === '1',
              closed_at: t.closed_at || null,
              created_at: t.created_at || new Date().toISOString(),
              order: t.order !== undefined ? Number(t.order) : 0
            })),
            currentBoardId: boards.length > 0 ? (boards[0].id || boards[0].id) : null
          };

          Store.importData(state);
          resolve(state);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  const COLUMN_ALIASES = {
    'to do': 'todo',
    'todo': 'todo',
    'in progress': 'inprogress',
    'inprogress': 'inprogress',
    'review': 'review',
    'done': 'done'
  };

  function resolveColumn(value) {
    if (value === undefined || value === null || value === '') return 'todo';
    return COLUMN_ALIASES[String(value).trim().toLowerCase()] || 'todo';
  }

  function pickValue() {
    for (let i = 0; i < arguments.length; i++) {
      const v = arguments[i];
      if (v !== undefined && v !== null) return v;
    }
    return '';
  }

  function formatExcelDate(value) {
    if (!value) return '';
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
      return '';
    }
    const str = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    return str;
  }

  function serializeComments(comments) {
    if (!Array.isArray(comments) || comments.length === 0) return '';
    const lines = [];
    comments.forEach(c => {
      let time = '';
      const d = c.created_at ? new Date(c.created_at) : null;
      if (d && !isNaN(d)) {
        const dateStr =
          d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        time = `[${dateStr} ${timeStr}] `;
      }
      const doneFlag = c.done ? '[done] ' : '';
      const text = String(c.text || '').replace(/\r?\n/g, ' ');
      lines.push(time + doneFlag + text);

      if (Array.isArray(c.replies)) {
        c.replies.forEach(r => {
          const rText = String(r.text || '').replace(/\r?\n/g, ' ');
          lines.push(time + (r.done ? '[done] ' : '') + '\u21B3 ' + rText);
        });
      }
    });
    return lines.join('\n');
  }

  function parseComments(value) {
    if (!value) return [];
    const lines = String(value).split(/\r?\n/).filter(l => l.trim());
    const comments = [];

    lines.forEach(line => {
      const m = line.match(/^\[([^\]]+)\]\s?(.*)$/);
      let created_at = null;
      let text = line;
      if (m) {
        created_at = parseLogDate(m[1]);
        text = m[2];
      }
      text = text.trim();

      let done = false;
      if (text.startsWith('[done] ')) {
        done = true;
        text = text.slice(7).trim();
      }

      if (text.startsWith('\u21B3 ')) {
        const replyText = text.slice(2).trim();
        if (comments.length > 0) {
          const parent = comments[comments.length - 1];
          parent.replies.push({
            id: Store.generateId(),
            text: replyText,
            done: done,
            created_at: created_at || new Date().toISOString()
          });
          return;
        }
      }

      comments.push({
        id: Store.generateId(),
        text: text,
        done: done,
        replies: [],
        created_at: created_at || new Date().toISOString()
      });
    });

    return comments;
  }

  function parseLogDate(str) {
    const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})[ ,]+(\d{2}):(\d{2})$/);
    if (m) {
      const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
      if (!isNaN(d)) return d.toISOString();
    }
    return null;
  }

  function init() {
    document.getElementById('btnExport').addEventListener('click', () => {
      try {
        const filename = exportToExcel();
        UI.showToast(`Exported to ${filename}`, 'success', 4000);
      } catch (err) {
        console.error(err);
        UI.showToast('Export failed: ' + err.message, 'error');
      }
    });

    const importBtn = document.getElementById('btnImport');
    const fileInput = document.getElementById('fileInput');

    importBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;

      if (!UI.confirmDialog('Importing will replace all current data. Continue?')) {
        fileInput.value = '';
        return;
      }

      importFromExcel(file)
        .then(() => {
          fileInput.value = '';
          UI.showToast('Data imported successfully', 'success');
          TaskDetail.hide();
          Board.renderList();
          Task.renderBoard();
          Search.updateAssigneeFilter();
          const current = Store.getBoard(Store.getCurrentBoardId());
          document.getElementById('boardTitle').textContent = current ? current.name : 'No Board';
        })
        .catch(err => {
          fileInput.value = '';
          UI.showToast('Import failed: ' + err.message, 'error', 5000);
        });
    });
  }

  return {
    init,
    exportToExcel,
    buildStyledWorkbook,
    importFromExcel
  };
})();
