Pages.accounting = {
  title: 'Accounting',
  entity: 'ALL',
  render(args) {
    const tab = args[0] || 'tb';
    const ents = [['ALL', 'Consolidated (group)'], ...S().companies.map((c) => [c.id, c.name])];
    return `<div class="flex" style="margin-bottom:12px"><span class="muted">Company</span>
      <select class="inline" data-change="setEntity">${options(ents, this.entity)}</select>
      <span class="muted small">${this.entity === 'ALL' ? 'Intercompany plant hire is eliminated on consolidation.' : ''}</span>
      <span class="spacer"></span><span class="small muted">Books locked up to ${fdate(S().periodLock)}</span></div>` +
      tabs('accounting', [['tb', 'Trial balance'], ['pnl', 'Profit & loss'], ['bs', 'Balance sheet'], ['gl', 'General ledger'], ['journals', 'Journals'], ['coa', 'Chart of accounts'], ['projects', 'Project P&L']], tab) +
      (this[tab] || this.tb).call(this, args);
  },
  tb() {
    const b = Ledger.balances(this.entity, { to: today() });
    const rows = S().coa.map((a) => ({ a, dr: b[a.code]?.dr || 0, cr: b[a.code]?.cr || 0 })).filter((r) => r.dr || r.cr)
      .map((r) => ({ ...r, net: r.dr - r.cr }));
    const tdr = rows.reduce((x, r) => x + Math.max(0, r.net), 0), tcr = rows.reduce((x, r) => x + Math.max(0, -r.net), 0);
    return card(`Trial balance as of ${fdate(today())}`, table([
      { h: 'Account', f: (r) => `<a href="#/accounting/gl/${r.a.code}">${r.a.code}</a> ${esc(r.a.name)}` },
      { h: 'Type', f: (r) => `<span class="muted small">${r.a.type}</span>` },
      { h: 'Debit', num: true, f: (r) => (r.net > 0 ? num(r.net, 2) : '') },
      { h: 'Credit', num: true, f: (r) => (r.net < 0 ? num(-r.net, 2) : '') },
    ], rows, { foot: `<tr class="total"><td colspan="2">Total ${Math.abs(tdr - tcr) < 1 ? '<span class="badge b-ok">Balanced</span>' : '<span class="badge b-bad">Out of balance</span>'}</td><td class="num">${num(tdr, 2)}</td><td class="num">${num(tcr, 2)}</td></tr>` }),
    { flush: true, actions: '<button class="btn sm" data-act="exportTb">Export CSV</button>' });
  },
  pnl() {
    const p = Ledger.pnl(this.entity, Ledger.yearStart, today());
    const sect = (type, label) => `<tr class="group"><td colspan="2">${label}</td></tr>` +
      p.rows.filter((r) => r.type === type && r.amt).map((r) => `<tr><td style="padding-left:24px">${r.code} ${esc(r.name)}</td><td class="num">${num(r.amt, 2)}</td></tr>`).join('');
    return `<div class="grid kpis">${kpi('Revenue YTD', aed(short(p.revenue)))}${kpi('Gross profit', aed(short(p.gross)), p.revenue ? pct(p.gross / p.revenue, 1) + ' margin' : '')}${kpi('Net profit YTD', `<span class="${p.net >= 0 ? 'pos' : 'neg'}">${aed(short(p.net))}</span>`)}</div><div class="mt">` +
      card(`Profit & loss — 1 Jan 2026 to ${fdate(today())}`, `<div class="table-wrap"><table><tbody>
        ${sect('Revenue', 'Revenue')}<tr class="total"><td>Total revenue</td><td class="num">${num(p.revenue, 2)}</td></tr>
        ${sect('Cost of sales', 'Cost of sales')}<tr class="total"><td>Gross profit</td><td class="num">${num(p.gross, 2)}</td></tr>
        ${sect('Expense', 'Operating expenses')}<tr class="total"><td>Net profit before tax</td><td class="num ${p.net >= 0 ? 'pos' : 'neg'}">${num(p.net, 2)}</td></tr>
      </tbody></table></div>`, { flush: true }) + '</div>';
  },
  bs() {
    const b = Ledger.balances(this.entity, { to: today() });
    const p = Ledger.pnl(this.entity, Ledger.yearStart, today());
    const bal = (a) => (b[a.code]?.dr || 0) - (b[a.code]?.cr || 0);
    const rows = (type, sign) => S().coa.filter((a) => a.type === type).map((a) => ({ a, v: bal(a) * sign })).filter((r) => Math.abs(r.v) > 0.5);
    const assets = rows('Asset', 1), liab = rows('Liability', -1), eq = rows('Equity', -1);
    const sum = (r) => r.reduce((x, y) => x + y.v, 0);
    const ta = sum(assets), tl = sum(liab), te = sum(eq) + p.net;
    const list = (r) => r.map((x) => `<tr><td style="padding-left:24px">${x.a.code} ${esc(x.a.name)}</td><td class="num">${num(x.v, 2)}</td></tr>`).join('');
    return `<div class="grid cols-2">` + card(`Assets — ${fdate(today())}`, `<div class="table-wrap"><table><tbody>${list(assets)}<tr class="total"><td>Total assets</td><td class="num">${num(ta, 2)}</td></tr></tbody></table></div>`, { flush: true }) +
      card('Liabilities & equity', `<div class="table-wrap"><table><tbody><tr class="group"><td colspan="2">Liabilities</td></tr>${list(liab)}<tr class="total"><td>Total liabilities</td><td class="num">${num(tl, 2)}</td></tr>
        <tr class="group"><td colspan="2">Equity</td></tr>${list(eq)}<tr><td style="padding-left:24px">Current year profit</td><td class="num">${num(p.net, 2)}</td></tr>
        <tr class="total"><td>Total liabilities & equity ${Math.abs(ta - tl - te) < 1 ? '<span class="badge b-ok">Balances</span>' : '<span class="badge b-bad">Difference ' + num(ta - tl - te, 2) + '</span>'}</td><td class="num">${num(tl + te, 2)}</td></tr></tbody></table></div>`, { flush: true }) + '</div>';
  },
  gl(args) {
    const code = args[1] || '1010';
    const J = Ledger.filter(Ledger.build(), this.entity);
    let run = 0;
    const lines = [];
    J.forEach((j) => j.lines.forEach((l) => { if (l.acc === code) { run += l.dr - l.cr; lines.push({ j, l, run }); } }));
    return `<div class="flex" style="margin-bottom:12px"><span class="muted">Account</span><select class="inline" onchange="location.hash='#/accounting/gl/'+this.value">${options(S().coa.map((a) => [a.code, `${a.code} ${a.name}`]), code)}</select></div>` +
      card(`${code} ${esc(Ledger.acc(code).name)}`, table([
        { h: 'Date', f: (x) => fdate(x.j.date) },
        { h: 'Ref', f: (x) => `<a href="${x.j.link}">${esc(x.j.id)}</a>` },
        { h: 'Source', f: (x) => `<span class="badge b-muted">${x.j.src}</span>` },
        { h: 'Description', f: (x) => esc(x.j.memo), cls: 'wrap' },
        { h: 'Project', f: (x) => x.l.project || '' },
        { h: 'Debit', num: true, f: (x) => (x.l.dr ? num(x.l.dr, 2) : '') },
        { h: 'Credit', num: true, f: (x) => (x.l.cr ? num(x.l.cr, 2) : '') },
        { h: 'Balance', num: true, f: (x) => num(x.run, 2) },
      ], lines.slice(-300).reverse(), { empty: 'No postings to this account for the selected company.' }), { flush: true });
  },
  journals() {
    const J = Ledger.filter(Ledger.build(), this.entity).filter((j) => !j.opening).slice().reverse();
    const srcs = [...new Set(J.map((j) => j.src))];
    const f = this.src || '';
    const rows = J.filter((j) => !f || j.src === f).slice(0, 200);
    return `<div class="flex" style="margin-bottom:12px"><span class="muted">Source</span><select class="inline" data-change="setJSrc">${options([['', 'All sources'], ...srcs.map((x) => [x, x])], f)}</select>
      <span class="muted small">Journals are created automatically from invoices, bills, payroll, stock, depreciation and plant hire. Showing latest ${rows.length}.</span></div>` +
      card('Journal entries', table([
        { h: 'Date', f: (j) => fdate(j.date) },
        { h: 'Ref', f: (j) => esc(j.id) },
        { h: 'Co.', f: (j) => j.entity },
        { h: 'Source', f: (j) => `<span class="badge b-muted">${j.src}</span>` },
        { h: 'Description', f: (j) => esc(j.memo), cls: 'wrap' },
        { h: 'Lines', f: (j) => j.lines.map((l) => `<div class="small">${l.acc} ${esc(Ledger.acc(l.acc).name)} <span class="${l.dr ? '' : 'muted'}">${l.dr ? 'Dr ' + num(l.dr, 2) : 'Cr ' + num(l.cr, 2)}</span></div>`).join(''), cls: 'wrap' },
      ], rows), { flush: true, actions: '<button class="btn primary sm" data-act="newJournal">+ Manual journal</button>' });
  },
  coa() {
    const b = Ledger.balances(this.entity, { to: today() });
    return card('Chart of accounts', table([
      { h: 'Code', f: (a) => a.code },
      { h: 'Account', f: (a) => `<a href="#/accounting/gl/${a.code}">${esc(a.name)}</a>` },
      { h: 'Type', f: (a) => a.type },
      { h: 'Balance', num: true, f: (a) => num((b[a.code]?.dr || 0) - (b[a.code]?.cr || 0), 2) },
    ], S().coa), { flush: true, actions: '<button class="btn primary sm" data-act="newAccount">+ Account</button>' });
  },
  projects() {
    const J = Ledger.filter(Ledger.build(), 'JRC');
    const by = {};
    J.filter((j) => !j.opening).forEach((j) => j.lines.forEach((l) => {
      if (!l.project) return;
      const t = Ledger.acc(l.acc).type;
      const o = by[l.project] || (by[l.project] = { rev: 0, mat: 0, sub: 0, plant: 0 });
      if (t === 'Revenue') o.rev += l.cr - l.dr;
      if (l.acc === '5000') o.mat += l.dr - l.cr;
      if (l.acc === '5100') o.sub += l.dr - l.cr;
      if (l.acc === '5300') o.plant += l.dr - l.cr;
    }));
    const rows = Object.entries(by).map(([p, o]) => ({ p, ...o, gp: o.rev - o.mat - o.sub - o.plant }));
    return '<p class="muted small">Revenue and direct costs posted to the ledger with a project tag, year to date. Labour and overheads are allocated separately (Cash & Accounts → Overhead allocation).</p>' +
      card('Project profitability from the ledger (YTD)', table([
        { h: 'Project', f: (r) => esc(projLabel(r.p)), cls: 'wrap' },
        { h: 'Revenue', num: true, f: (r) => num(r.rev) },
        { h: 'Materials', num: true, f: (r) => num(r.mat) },
        { h: 'Subcontract', num: true, f: (r) => num(r.sub) },
        { h: 'Plant hire', num: true, f: (r) => num(r.plant) },
        { h: 'Contribution', num: true, f: (r) => `<span class="${r.gp >= 0 ? 'pos' : 'neg'}">${num(r.gp)}</span>` },
      ], rows), { flush: true });
  },
};

Actions.setEntity = (v) => { Pages.accounting.entity = v; render(); };
Actions.setJSrc = (v) => { Pages.accounting.src = v; render(); };
Actions.exportTb = () => {
  const b = Ledger.balances(Pages.accounting.entity, { to: today() });
  const rows = [['Code', 'Account', 'Type', 'Debit', 'Credit']].concat(S().coa.filter((a) => b[a.code]).map((a) => { const n = b[a.code].dr - b[a.code].cr; return [a.code, a.name, a.type, n > 0 ? n.toFixed(2) : '', n < 0 ? (-n).toFixed(2) : '']; }));
  download(`trial-balance-${Pages.accounting.entity}-${today()}.csv`, toCSV(rows), 'text/csv');
};
Actions.newJournal = () => {
  const accs = options(S().coa.map((a) => [a.code, `${a.code} ${a.name}`]));
  const accsBlank = '<option value="">—</option>' + accs;
  openModal('Manual journal', [
    { name: 'date', label: 'Date', type: 'date', value: today() },
    { name: 'entity', label: 'Company', type: 'select', options: options(S().companies.map((c) => [c.id, c.name])) },
    { name: 'memo', label: 'Narration', full: true },
    { name: 'a1', label: 'Line 1 account', type: 'select', options: accs }, { name: 'v1', label: 'Line 1 amount (+ debit / − credit)', type: 'number', step: 'any' },
    { name: 'a2', label: 'Line 2 account', type: 'select', options: accs }, { name: 'v2', label: 'Line 2 amount', type: 'number', step: 'any' },
    { name: 'a3', label: 'Line 3 account (optional)', type: 'select', options: accsBlank }, { name: 'v3', label: 'Line 3 amount', type: 'number', step: 'any', value: 0, required: false },
  ], (x) => {
    if (x.date <= S().periodLock) { alert(`The period up to ${fdate(S().periodLock)} is locked. Use a later date.`); return false; }
    const lines = [[x.a1, x.v1], [x.a2, x.v2], [x.a3, x.v3]].filter(([a, v]) => a && v).map(([acc, v]) => ({ acc, dr: v > 0 ? v : 0, cr: v < 0 ? -v : 0 }));
    const diff = lines.reduce((a, l) => a + l.dr - l.cr, 0);
    if (Math.abs(diff) > 0.005) { alert(`Debits and credits differ by ${num(diff, 2)}. Amounts must add up to zero.`); return false; }
    const bankRev = Object.fromEntries(Object.entries(Ledger.bankAcc).map(([k, v]) => [v, k]));
    lines.forEach((l) => { const b = S().bank.find((y) => y.id === bankRev[l.acc]); if (b) b.balance += l.dr - l.cr; });
    S().journals.push({ id: nextId('JV-26'), date: x.date, entity: x.entity, memo: x.memo, lines });
  }, { submit: 'Post journal', html: '<p class="muted small">Enter debits as positive and credits as negative amounts. Bank account lines also update the bank balance.</p>' });
};
Actions.newAccount = () => openModal('New account', [
  { name: 'code', label: 'Code' }, { name: 'name', label: 'Name' },
  { name: 'type', label: 'Type', type: 'select', options: options(['Asset', 'Liability', 'Equity', 'Revenue', 'Cost of sales', 'Expense'].map((t) => [t, t])) },
], (x) => {
  if (S().coa.some((a) => a.code === x.code)) { alert('That code already exists.'); return false; }
  S().coa.push(x); S().coa.sort((a, b) => a.code.localeCompare(b.code));
});
