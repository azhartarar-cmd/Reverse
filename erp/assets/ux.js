// UX layer: theme, sidebar rail and groups, command palette, keyboard shortcuts, table sort/filter/export.
// View preferences are per-device conveniences, so they live in localStorage (never business data).
const UI = {
  key: 'jrc-ui',
  prefs: { theme: 'system', rail: false, closed: [] },
  load() {
    try { Object.assign(this.prefs, JSON.parse(localStorage.getItem(this.key) || '{}')); } catch (e) { /* defaults */ }
    this.apply();
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.prefs)); } catch (e) { /* ignore */ } },
  apply() {
    const t = this.prefs.theme;
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    document.body.classList.toggle('rail', !!this.prefs.rail);
    const btn = document.getElementById('theme-btn');
    if (btn) { btn.innerHTML = icon({ light: 'sun', dark: 'moon', system: 'monitor' }[t]); btn.title = `Theme: ${t} (click to change)`; }
  },
};
Actions.cycleTheme = () => {
  const order = ['system', 'light', 'dark'];
  UI.prefs.theme = order[(order.indexOf(UI.prefs.theme) + 1) % 3];
  UI.save(); UI.apply();
  toast(`Theme: ${UI.prefs.theme === 'system' ? 'follows your computer' : UI.prefs.theme}`);
};
Actions.toggleRail = () => { UI.prefs.rail = !UI.prefs.rail; UI.save(); UI.apply(); };
Actions.toggleGroup = (d) => {
  const c = new Set(UI.prefs.closed);
  c.has(d.g) ? c.delete(d.g) : c.add(d.g);
  UI.prefs.closed = [...c]; UI.save(); render();
};

// ---------------- Command palette ----------------
const PAL_TABS = {
  projects: [], procurement: [['rfq', 'RFQs & supplier comparison'], ['orders', 'Purchase orders'], ['analysis', 'PO analysis'], ['suppliers', 'Suppliers']],
  warehouse: [['movements', 'Stock movements'], ['consumption', 'Consumption by project']],
  subcontracts: [['certs', 'Subcontractor certificates'], ['backcharges', 'Back-charges']],
  production: [['tickets', 'Delivery tickets'], ['mixes', 'Mix designs & costing'], ['yield', 'Yield & wastage']],
  quality: [['tests', 'Lab & field tests'], ['ncr', 'Non-conformances'], ['hse', 'HSE']],
  contracts: [['permits', 'Permits & NOCs'], ['claims', 'Claims, EOT & LDs'], ['escalation', 'Price escalation']],
  crm: [['calendar', 'CRM calendar'], ['history', 'Interaction history']],
  sales: [['variations', 'Variation orders'], ['billing', 'Progress billing (IPC)'], ['milestones', 'Milestone billing'], ['invoices', 'Invoices'], ['soa', 'Statement of account']],
  finance: [['receivables', 'Receivables ageing'], ['payables', 'Payables & payment schedule'], ['revenue', 'Revenue recognition'], ['overheads', 'Overhead allocation'], ['currency', 'Multi-currency'], ['close', 'Month-end close']],
  accounting: [['pnl', 'Profit & loss'], ['bs', 'Balance sheet'], ['gl', 'General ledger'], ['journals', 'Journals'], ['coa', 'Chart of accounts'], ['projects', 'Project P&L (ledger)']],
  vat: [['ct', 'Corporate tax']],
  hr: [['timesheets', 'Timesheets & overtime'], ['leave', 'Leave'], ['payroll', 'Payroll & WPS'], ['eosb', 'End-of-service provision'], ['documents', 'Staff documents & expiry'], ['camps', 'Accommodation']],
  equipment: [['calendar', 'Resource calendar'], ['requests', 'Equipment requests'], ['logs', 'Plant logs & fuel'], ['maintenance', 'Maintenance'], ['depreciation', 'Depreciation']],
};
const PAL_ACTIONS = [
  ['New material requisition', 'package', 'procurement', () => Actions.newReq()],
  ['New purchase order', 'swap', 'procurement', () => Actions.newPo()],
  ['Stock issue / receipt / transfer', 'box', 'warehouse', () => Actions.stockTx({ t: 'Issue' })],
  ['New interim payment certificate', 'receipt', 'sales', () => Actions.newIpc()],
  ['New variation order', 'receipt', 'sales', () => Actions.newVo()],
  ['New quotation', 'receipt', 'sales', () => Actions.newQuote()],
  ['New opportunity', 'users', 'crm', () => Actions.newLead()],
  ['Daily plant log', 'fuel', 'equipment', () => Actions.newPlantLog()],
  ['Allocate equipment', 'truck', 'equipment', () => Actions.bookEq()],
  ['Inspection request', 'eye', 'quality', () => Actions.newIr()],
  ['Report incident / near miss', 'alert', 'quality', () => Actions.newIncident()],
  ['Record test result', 'shield', 'quality', () => Actions.newTest()],
  ['New asphalt production order', 'factory', 'production', () => Actions.newProdOrder()],
  ['New subcontract', 'hammer', 'subcontracts', () => Actions.newSubcontract()],
  ['New bond / guarantee', 'scale', 'contracts', () => Actions.newBond()],
  ['New permit / NOC', 'scale', 'contracts', () => Actions.newPermit()],
  ['New claim / extension of time', 'scale', 'contracts', () => Actions.newClaim()],
  ['Manual journal', 'book', 'accounting', () => Actions.newJournal()],
  ['New leave request', 'user', 'hr', () => Actions.newLeave()],
  ['New project / estimate', 'folder', 'projects', () => Actions.newProject()],
  ['Toggle light / dark theme', 'moon', '', () => Actions.cycleTheme()],
  ['Collapse / expand sidebar', 'panel', '', () => Actions.toggleRail()],
  ['Export backup (JSON)', 'download', 'settings', () => Actions.exportJson()],
  ['Keyboard shortcuts', 'keyboard', '', () => Actions.shortcuts()],
];

const Palette = {
  open: false, items: [], sel: 0,
  show() {
    if (this.open) return this.hide();
    this.open = true;
    const el = document.createElement('div');
    el.className = 'palette-back'; el.id = 'palette';
    el.innerHTML = `<div class="palette" role="dialog" aria-label="Command palette">
      <div class="palette-in">${icon('search')}<input id="pal-q" placeholder="Go to a screen, run an action, or find a record…" autocomplete="off"><span class="kbd">Esc</span></div>
      <div class="palette-list" id="pal-list"></div>
      <div class="palette-foot"><span><span class="kbd">↑</span> <span class="kbd">↓</span> move</span><span><span class="kbd">Enter</span> open</span><span><span class="kbd">${isMac ? '⌘' : 'Ctrl'} K</span> toggle</span></div></div>`;
    el.addEventListener('mousedown', (e) => { if (e.target === el) this.hide(); });
    document.body.appendChild(el);
    const q = el.querySelector('#pal-q');
    q.addEventListener('input', () => { this.sel = 0; this.fill(q.value); });
    q.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); this.run(this.sel); }
    });
    el.querySelector('#pal-list').addEventListener('click', (e) => { const it = e.target.closest('[data-i]'); if (it) this.run(+it.dataset.i); });
    this.fill('');
    q.focus();
  },
  hide() { document.getElementById('palette')?.remove(); this.open = false; },
  build(q) {
    const t = q.trim().toLowerCase();
    const match = (s) => !t || t.split(/\s+/).every((w) => s.toLowerCase().includes(w));
    const out = [];
    NAV.forEach(([g, links]) => links.forEach(([k, ic, label]) => {
      if (!canSee(k)) return;
      if (match(`${label} ${g}`)) out.push({ sec: 'Go to', ic, label, sub: g, go: `#/${k}` });
      (PAL_TABS[k] || []).forEach(([tab, tl]) => { if (match(`${tl} ${label}`)) out.push({ sec: 'Go to', ic, label: tl, sub: label, go: `#/${k}/${tab}` }); });
    }));
    S().projects.forEach((p) => { if (match(`${p.id} ${p.name} ${p.client}`)) out.push({ sec: 'Projects', ic: 'folder', label: `${p.id} · ${p.name}`, sub: p.status, go: `#/projects/${p.id}` }); });
    PAL_ACTIONS.forEach(([label, ic, mod, fn]) => { if ((!mod || canSee(mod)) && match(label)) out.push({ sec: 'Actions', ic, label, sub: '', fn }); });
    if (t.length >= 2) {
      Pages.assistant.search(t).filter((h) => h.kind !== 'Project').slice(0, 8).forEach((h) => out.push({ sec: 'Records', ic: 'search', label: h.text, sub: h.kind, go: h.link }));
      out.push({ sec: 'Ask', ic: 'sparkle', label: `Ask the assistant: “${q.trim()}”`, sub: '', go: '#/assistant/' + encodeURIComponent(q.trim()) });
    }
    return out.slice(0, t ? 40 : 60);
  },
  fill(q) {
    this.items = this.build(q);
    let sec = '';
    document.getElementById('pal-list').innerHTML = this.items.length ? this.items.map((x, i) => {
      const head = x.sec !== sec ? `<div class="palette-sec">${(sec = x.sec)}</div>` : '';
      return `${head}<div class="palette-item ${i === this.sel ? 'sel' : ''}" data-i="${i}">${icon(x.ic, 16)}<span>${esc(x.label)}</span><span class="sub">${esc(x.sub)}</span></div>`;
    }).join('') : '<div class="empty">No matches</div>';
  },
  move(d) {
    if (!this.items.length) return;
    this.sel = (this.sel + d + this.items.length) % this.items.length;
    document.querySelectorAll('.palette-item').forEach((el) => el.classList.toggle('sel', +el.dataset.i === this.sel));
    document.querySelector('.palette-item.sel')?.scrollIntoView({ block: 'nearest' });
  },
  run(i) {
    const x = this.items[i];
    if (!x) return;
    this.hide();
    if (x.go) location.hash = x.go; else x.fn();
  },
};
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
Actions.palette = () => Palette.show();

// ---------------- Keyboard shortcuts ----------------
const GOTO = { d: 'dashboard', a: 'approvals', p: 'projects', s: 'sales', f: 'finance', c: 'accounting', h: 'hr', e: 'equipment', w: 'warehouse', r: 'procurement', q: 'quality', n: 'notifications' };
Actions.shortcuts = () => openModal('Keyboard shortcuts', [], null, { html: `<div class="keys">
  <span class="kbd">${isMac ? '⌘' : 'Ctrl'} K</span><span>Command palette — go anywhere, run actions, find records</span>
  <span class="kbd">/</span><span>Search or ask the assistant</span>
  <span class="kbd">Esc</span><span>Close a form or the palette</span>
  <span class="kbd">${isMac ? '⌘' : 'Ctrl'} Enter</span><span>Save the open form</span>
  <span class="kbd">?</span><span>Show this list</span>
  ${Object.entries(GOTO).map(([k, r]) => `<span><span class="kbd">G</span> then <span class="kbd">${k.toUpperCase()}</span></span><span>Go to ${NAV.flatMap(([, l]) => l).find(([x]) => x === r)?.[2] || r}</span>`).join('')}
  </div>` });

let gPending = 0;
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable;
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); Palette.show(); return; }
  if (e.key === 'Escape') {
    if (Palette.open) { Palette.hide(); return; }
    if (document.querySelector('#modal-root .modal')) { closeModal(); return; }
  }
  if (mod && e.key === 'Enter') { const f = document.querySelector('#modal-root form'); if (f && f.querySelector('button.primary')) { e.preventDefault(); f.requestSubmit(); } return; }
  if (typing || mod || e.altKey || Palette.open || document.querySelector('#modal-root .modal')) return;
  if (e.key === '/') { e.preventDefault(); document.querySelector('#search input')?.focus(); return; }
  if (e.key === '?') { Actions.shortcuts(); return; }
  if (e.key === 'g') { gPending = Date.now(); return; }
  if (gPending && Date.now() - gPending < 1200 && GOTO[e.key]) { gPending = 0; location.hash = '#/' + GOTO[e.key]; }
});

// ---------------- Tables: sort, filter, export ----------------
const cellVal = (td) => {
  const t = td.textContent.trim();
  const n = t.replace(/[,\s]|AED|%|d$|t$|m²|m$/g, '').replace(/^\((.*)\)$/, '-$1');
  if (/^-?\d+(\.\d+)?$/.test(n)) return parseFloat(n);
  const k = t.match(/^(-?[\d.]+)(k|M)$/);
  if (k) return parseFloat(k[1]) * (k[2] === 'M' ? 1e6 : 1e3);
  const d = Date.parse(t);
  if (/\d{4}/.test(t) && !isNaN(d)) return d;
  return t.toLowerCase();
};
document.addEventListener('click', (e) => {
  const th = e.target.closest('th[data-sort]');
  if (!th) return;
  const tbody = th.closest('table').tBodies[0];
  if (tbody.querySelector('tr.group')) return; // grouped tables keep their order
  const i = th.cellIndex;
  const dir = th.dataset.dir === 'asc' ? 'desc' : 'asc';
  th.closest('tr').querySelectorAll('th').forEach((x) => delete x.dataset.dir);
  th.dataset.dir = dir;
  const rows = [...tbody.rows].filter((r) => !r.classList.contains('total'));
  const totals = [...tbody.rows].filter((r) => r.classList.contains('total'));
  rows.sort((a, b) => {
    const x = cellVal(a.cells[i]), y = cellVal(b.cells[i]);
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return dir === 'asc' ? c : -c;
  });
  [...rows, ...totals].forEach((r) => tbody.appendChild(r));
});
document.addEventListener('input', (e) => {
  if (!e.target.classList.contains('tbl-filter')) return;
  const box = e.target.closest('.tbl');
  const q = e.target.value.trim().toLowerCase();
  let shown = 0;
  const rows = [...box.querySelectorAll('tbody tr')].filter((r) => !r.classList.contains('total'));
  rows.forEach((r) => { const hit = !q || r.textContent.toLowerCase().includes(q); r.classList.toggle('hide', !hit); shown += hit; });
  box.querySelector('.tbl-count').textContent = q ? `${shown} of ${rows.length}` : '';
});
Actions.tblCsv = (d, el) => {
  const t = el.closest('.tbl').querySelector('table');
  const rows = [...t.rows].filter((r) => !r.classList.contains('hide')).map((r) => [...r.cells].map((c) => c.textContent.replace(/\s+/g, ' ').trim()));
  const name = (document.getElementById('page-title').textContent || 'export').replace(/[^\w-]+/g, '-').toLowerCase();
  download(`${name}-${today()}.csv`, toCSV(rows), 'text/csv');
};
