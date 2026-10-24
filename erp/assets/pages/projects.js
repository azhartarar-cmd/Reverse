Pages.projects = {
  title: (args) => (args[0] ? `${args[0]} · ${project(args[0])?.name || 'Project'}` : 'Projects & BOQ'),
  render(args) {
    if (args[0] && project(args[0])) return this.detail(project(args[0]), args[1] || 'overview');
    const rows = S().projects.map((p) => ({ p, c: Calc.project(p) }));
    return `<div class="head-row"><div class="muted">${rows.length} projects · BOQ-based estimating, cost control and progress</div>
      <button class="btn primary" data-act="newProject">+ New project / estimate</button></div>` +
      card('', table([
        { h: 'Project', f: (x) => `<a href="#/projects/${x.p.id}" class="strong">${x.p.id}</a><div class="small muted">${esc(x.p.name)}</div>`, cls: 'wrap' },
        { h: 'Client', f: (x) => esc(x.p.client), cls: 'wrap' },
        { h: 'Status', f: (x) => badge(x.p.status) },
        { h: 'PM', f: (x) => esc(x.p.manager) },
        { h: 'Contract (AED)', num: true, f: (x) => num(x.c.revised) },
        { h: 'Budget cost', num: true, f: (x) => num(x.c.budget) },
        { h: 'Margin', num: true, f: (x) => pct(x.c.margin, 1) },
        { h: 'Progress', f: (x) => `<div class="flex">${bar(x.c.progress)}<span class="small">${pct(x.c.progress)}</span></div>` },
        { h: 'Programme', f: (x) => `${fdate(x.p.start)} → ${fdate(x.p.end)}` },
      ], rows), { flush: true });
  },

  detail(p, tab) {
    const c = Calc.project(p);
    const head = `<div class="head-row"><div><a href="#/projects" class="small">← All projects</a>
        <h2>${esc(p.name)}</h2><div class="muted">${esc(p.client)} · ${esc(p.location)} · PM ${esc(p.manager)} · ${badge(p.status)}</div></div>
        <div class="btn-row"><button class="btn" data-act="exportBoq" data-id="${p.id}">Export BOQ (CSV)</button>
        <select class="inline" data-change="setProjectStatus" data-id="${p.id}">${options(['Tender', 'Active', 'Defects Liability', 'Completed'].map((x) => [x, x]), p.status)}</select></div></div>
      <div class="grid kpis">
        ${kpi('Original contract', aed(short(c.value)))}
        ${kpi('Approved variations', aed(short(c.vo)))}
        ${kpi('Earned value', aed(short(c.earned)), pct(c.progress) + ' complete')}
        ${kpi('Actual cost', aed(short(c.actual)), `<span class="${c.costVariance >= 0 ? 'pos' : 'neg'}">${c.costVariance >= 0 ? 'Under' : 'Over'} budget by ${short(Math.abs(c.costVariance))}</span>`)}
        ${kpi('Estimate at completion', aed(short(c.eac)), `Budget ${short(c.budget)}`)}
        ${kpi('Forecast margin', pct(c.forecastMargin, 1), `Tender margin ${pct(c.margin, 1)}`)}
      </div><div class="mt">` +
      tabs(`projects/${p.id}`, [['overview', 'Cost control'], ['boq', 'BOQ & progress'], ['gantt', 'Schedule'], ['chainage', 'Chainage'], ['cashflow', 'Cash flow plan'], ['reports', 'Site reports & RFIs'], ['documents', 'Documents'], ['billing', 'Variations & billing']], tab);
    const body = {
      overview: () => this.overview(p, c),
      boq: () => this.boq(p),
      gantt: () => this.gantt(p),
      reports: () => this.reports(p),
      billing: () => this.billing(p),
      chainage: () => this.chainage(p),
      cashflow: () => this.cashflow(p),
      documents: () => this.documents(p),
    }[tab] || (() => '');
    return head + body() + '</div>';
  },

  overview(p, c) {
    const cats = [...new Set(p.boq.map((b) => b.cat))].map((cat) => {
      const l = p.boq.filter((b) => b.cat === cat);
      const sum = (f) => l.reduce((a, b) => a + f(b), 0);
      return { cat, value: sum((b) => b.qty * b.rate), budget: sum((b) => b.qty * b.costRate), eb: sum((b) => b.doneQty * b.costRate), actual: sum((b) => b.actualCost), earned: sum((b) => b.doneQty * b.rate) };
    });
    const colors = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', '#0891b2', '#be185d', '#65a30d', '#64748b'];
    return `<div class="grid cols-2">
      ${card('Budgeted vs actual cost of work done, by trade', Chart.hbars(cats.map((x) => ({ label: x.cat, a: x.eb, b: x.actual }))))}
      ${card('Budget cost split', Chart.donut(cats.map((x, i) => ({ name: x.cat, value: x.budget, color: colors[i % colors.length] }))))}
    </div><div class="mt">` + card('Project P&L by trade', table([
      { h: 'Trade', f: (x) => esc(x.cat) },
      { h: 'Contract value', num: true, f: (x) => num(x.value) },
      { h: 'Budget cost', num: true, f: (x) => num(x.budget) },
      { h: 'Earned', num: true, f: (x) => num(x.earned) },
      { h: 'Actual cost', num: true, f: (x) => num(x.actual) },
      { h: 'Gross profit to date', num: true, f: (x) => `<span class="${x.earned - x.actual >= 0 ? 'pos' : 'neg'}">${num(x.earned - x.actual)}</span>` },
      { h: 'CPI', num: true, f: (x) => (x.actual ? (x.eb / x.actual).toFixed(2) : '—') },
    ], cats, {
      foot: `<tr class="total"><td>Total</td><td class="num">${num(c.value)}</td><td class="num">${num(c.budget)}</td><td class="num">${num(c.earned)}</td><td class="num">${num(c.actual)}</td><td class="num">${num(c.earned - c.actual)}</td><td class="num">${c.actual ? (c.earnedBudget / c.actual).toFixed(2) : '—'}</td></tr>`,
    }), { flush: true }) + '</div>';
  },

  boq(p) {
    const cats = [...new Set(p.boq.map((b) => b.cat))];
    const rows = cats.map((cat) => {
      const lines = p.boq.filter((b) => b.cat === cat);
      const tot = lines.reduce((a, b) => a + b.qty * b.rate, 0);
      return `<tr class="group"><td colspan="5">${esc(cat)}</td><td class="num">${num(tot)}</td><td colspan="5"></td></tr>` + lines.map((b) => {
        const done = b.qty ? b.doneQty / b.qty : 0;
        const ebc = b.doneQty * b.costRate;
        return `<tr><td>${b.code}</td><td class="wrap">${esc(b.desc)}</td><td>${b.unit}</td><td class="num">${num(b.qty, b.unit === 'LS' ? 0 : 0)}</td><td class="num">${num(b.rate, 2)}</td>
          <td class="num">${num(b.qty * b.rate)}</td><td class="num">${num(b.costRate, 2)}</td>
          <td class="num">${num(b.doneQty, b.unit === 'LS' ? 2 : 0)}</td><td><div class="flex">${bar(done, done >= 1 ? 'ok' : '')}<span class="small">${pct(done)}</span></div></td>
          <td class="num ${b.actualCost > ebc ? 'neg' : ''}">${num(b.actualCost)}</td>
          <td><button class="btn sm" data-act="editBoq" data-p="${p.id}" data-id="${b.id}">Edit</button></td></tr>`;
      }).join('');
    }).join('');
    const c = Calc.project(p);
    return card('Bill of quantities', `<div class="table-wrap"><table>
      <thead><tr><th>Item</th><th>Description</th><th>Unit</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th><th class="num">Cost rate</th><th class="num">Done qty</th><th>Progress</th><th class="num">Actual cost</th><th></th></tr></thead>
      <tbody>${rows}<tr class="total"><td colspan="5">Total (excl. VAT)</td><td class="num">${num(c.value)}</td><td colspan="5"></td></tr></tbody></table></div>`,
    { flush: true, actions: `<button class="btn sm" data-act="markup" data-p="${p.id}">Apply markup</button><button class="btn primary sm" data-act="addBoq" data-p="${p.id}">+ BOQ item</button>` });
  },

  gantt(p) {
    const start = new Date(p.start), end = new Date(p.end);
    const span = end - start;
    const pos = (d) => ((new Date(d) - start) / span) * 100;
    const months = [];
    const m = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    while (m < end) { months.push(new Date(m)); m.setMonth(m.getMonth() + 1); }
    const todayX = pos(today());
    const tline = todayX > 0 && todayX < 100 ? `<div class="gantt-today" style="left:${todayX}%" title="Today"></div>` : '';
    const rows = p.tasks.map((t) => `<div class="gantt-row"><div class="g-name">${esc(t.cat)}</div><div class="gantt-track">${tline}
      <div class="gantt-bar" style="left:${t.from * 100}%;width:${(t.to - t.from) * 100}%"><i style="width:${Math.min(100, t.pct * 100)}%"></i><span>${pct(t.pct)}</span></div></div></div>`).join('');
    const ahead = p.tasks.map((t) => {
      const planned = Math.max(0, Math.min(1, (pos(today()) / 100 - t.from) / (t.to - t.from)));
      return { ...t, planned, diff: t.pct - planned };
    });
    return card(`Programme ${fdate(p.start)} → ${fdate(p.end)}`, `<div class="table-wrap"><div class="gantt">
        <div class="gantt-head"><div class="g-name small muted" style="padding:6px 12px">Activity</div><div class="gantt-months">${months.map((d) => `<span style="left:${pos(d.toISOString().slice(0, 10))}%">${d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}</span>`).join('')}</div></div>
        ${rows}</div></div>`, { flush: true }) + '<div class="mt">' + card('Planned vs actual progress', table([
      { h: 'Activity', f: (t) => esc(t.cat) },
      { h: 'Planned to date', num: true, f: (t) => pct(t.planned) },
      { h: 'Actual', num: true, f: (t) => pct(t.pct) },
      { h: 'Status', f: (t) => (t.diff >= -0.02 ? badge('On track') : `<span class="badge b-bad">Behind ${pct(-t.diff)}</span>`) },
    ], ahead), { flush: true }) + '</div>';
  },

  reports(p) {
    const reps = S().reports.filter((r) => r.project === p.id);
    const rfis = S().rfis.filter((r) => r.project === p.id);
    return `<div class="grid cols-2">` + card('Daily site reports', reps.length ? reps.map((r) => `<div style="padding:12px 16px;border-bottom:1px solid var(--line)">
        <div class="flex"><span class="strong">${fdate(r.date)}</span><span class="muted small">${r.id} · ${esc(r.author)}</span><span class="spacer"></span><span class="small muted">${esc(r.weather)} · ${r.manpower} workers · ${r.equipment} plant</span></div>
        <div style="margin-top:6px">${esc(r.summary)}</div></div>`).join('') : '<div class="empty">No reports yet.</div>',
    { flush: true, actions: `<button class="btn primary sm" data-act="addReport" data-p="${p.id}">+ Daily report</button>` }) +
      card('Requests for information', table([
        { h: 'RFI', f: (r) => r.id },
        { h: 'Subject', f: (r) => esc(r.subject), cls: 'wrap' },
        { h: 'Due', f: (r) => fdate(r.due) },
        { h: 'Status', f: (r) => (r.status === 'Open' ? `<button class="btn sm" data-act="closeRfi" data-id="${r.id}">Mark answered</button>` : badge(r.status)) },
      ], rfis), { flush: true, actions: `<button class="btn primary sm" data-act="addRfi" data-p="${p.id}">+ RFI</button>` }) + '</div>';
  },

  billing(p) {
    const vos = S().variations.filter((v) => v.project === p.id);
    const ipcs = S().ipcs.filter((i) => i.project === p.id);
    return card('Variation orders', table([
      { h: 'VO', f: (v) => v.id },
      { h: 'Date', f: (v) => fdate(v.date) },
      { h: 'Description', f: (v) => esc(v.desc), cls: 'wrap' },
      { h: 'Value', num: true, f: (v) => num(v.value) },
      { h: 'Status', f: (v) => badge(v.status) },
    ], vos), { flush: true, actions: `<a class="btn sm" href="#/sales/variations">Manage</a>` }) + '<div class="mt">' +
      card('Interim payment certificates', table([
        { h: 'IPC', f: (i) => i.id },
        { h: 'Period', f: (i) => i.period },
        { h: 'Cumulative work', num: true, f: (i) => num(i.cumWork) },
        { h: 'This certificate (net)', num: true, f: (i) => num(Calc.ipc(i).thisNet) },
        { h: 'Status', f: (i) => badge(i.status) },
      ], ipcs), { flush: true, actions: `<a class="btn sm" href="#/sales/billing">Progress billing</a>` }) + '</div>';
  },
};

Actions.newProject = () => openModal('New project / estimate', [
  { name: 'name', label: 'Project name', full: true },
  { name: 'client', label: 'Client' },
  { name: 'location', label: 'Location', value: 'Abu Dhabi' },
  { name: 'start', label: 'Start', type: 'date', value: addDays(today(), 30) },
  { name: 'end', label: 'Completion', type: 'date', value: addDays(today(), 395) },
  { name: 'manager', label: 'Project manager', type: 'select', options: options(S().employees.filter((e) => /Manager|Engineer/.test(e.role)).map((e) => [e.name, e.name])) },
  { name: 'template', label: 'Start BOQ from', type: 'select', options: options([['P-2401', 'Copy rates from P-2401 (quantities zeroed)'], ['', 'Empty BOQ']], 'P-2401') },
], (d) => {
  const id = 'P-' + (2400 + S().projects.length + 1);
  const src = d.template ? project(d.template) : null;
  const boq = src ? src.boq.map((b) => ({ ...b, id: id + '-' + b.code, qty: b.unit === 'LS' ? 1 : 0, doneQty: 0, actualCost: 0 })) : [];
  const tasks = src ? src.tasks.map((t) => ({ ...t, pct: 0 })) : [];
  S().projects.push({ id, name: d.name, client: d.client, location: d.location, start: d.start, end: d.end, status: 'Tender', manager: d.manager, boq, tasks });
  setTimeout(() => { location.hash = `#/projects/${id}/boq`; }, 0);
});

Actions.setProjectStatus = (v, d) => { project(d.id).status = v; commit('Status updated'); };

Actions.addBoq = (d) => {
  const p = project(d.p);
  openModal('Add BOQ item', [
    { name: 'cat', label: 'Trade / section', value: p.boq.at(-1)?.cat || 'Earthworks' },
    { name: 'code', label: 'Item no.', value: '' },
    { name: 'desc', label: 'Description', full: true },
    { name: 'unit', label: 'Unit', value: 'm2' },
    { name: 'qty', label: 'Quantity', type: 'number', step: 'any', value: 0 },
    { name: 'costRate', label: 'Cost rate (AED)', type: 'number', step: 'any', value: 0 },
    { name: 'rate', label: 'Sell rate (AED)', type: 'number', step: 'any', value: 0 },
  ], (x) => {
    p.boq.push({ id: p.id + '-' + (x.code || nextId('X')), ...x, doneQty: 0, actualCost: 0 });
    p.boq.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, { submit: 'Add item' });
};

Actions.editBoq = (d) => {
  const p = project(d.p);
  const b = p.boq.find((x) => x.id === d.id);
  openModal(`${b.code} · ${b.desc}`, [
    { name: 'desc', label: 'Description', value: b.desc, full: true },
    { name: 'qty', label: `Contract quantity (${b.unit})`, type: 'number', step: 'any', value: b.qty },
    { name: 'rate', label: 'Sell rate (AED)', type: 'number', step: 'any', value: b.rate },
    { name: 'costRate', label: 'Budget cost rate (AED)', type: 'number', step: 'any', value: b.costRate },
    { name: 'doneQty', label: `Quantity done to date (${b.unit})`, type: 'number', step: 'any', value: b.doneQty },
    { name: 'addCost', label: 'Add actual cost booked (AED)', type: 'number', step: 'any', value: 0 },
  ], (x) => {
    Object.assign(b, { desc: x.desc, qty: x.qty, rate: x.rate, costRate: x.costRate, doneQty: x.doneQty });
    b.actualCost += x.addCost;
    Pages.projects.syncTasks(p);
  });
};

Actions.markup = (d) => {
  const p = project(d.p);
  openModal('Apply markup to sell rates', [
    { name: 'm', label: 'Markup on cost (%)', type: 'number', step: 'any', value: 18 },
  ], (x) => { p.boq.forEach((b) => { b.rate = Math.round(b.costRate * (1 + x.m / 100) * 100) / 100; }); },
  { submit: 'Reprice BOQ', html: '<p class="muted">Sets every sell rate = cost rate × (1 + markup). Use for tender estimates.</p>' });
};

Pages.projects.syncTasks = (p) => {
  p.tasks.forEach((t) => {
    const l = p.boq.filter((b) => b.cat === t.cat);
    const v = l.reduce((a, b) => a + b.qty * b.rate, 0);
    t.pct = v ? l.reduce((a, b) => a + b.doneQty * b.rate, 0) / v : 0;
  });
};

Actions.exportBoq = (d) => {
  const p = project(d.id);
  const rows = [['Item', 'Trade', 'Description', 'Unit', 'Qty', 'Rate', 'Amount', 'Cost rate', 'Done qty', 'Actual cost']]
    .concat(p.boq.map((b) => [b.code, b.cat, b.desc, b.unit, b.qty, b.rate, (b.qty * b.rate).toFixed(2), b.costRate, b.doneQty, b.actualCost]));
  download(`${p.id}-BOQ.csv`, toCSV(rows), 'text/csv');
};

Actions.addReport = (d) => openModal('Daily site report', [
  { name: 'date', label: 'Date', type: 'date', value: today() },
  { name: 'weather', label: 'Weather', value: 'Clear, 33°C' },
  { name: 'manpower', label: 'Manpower on site', type: 'number', value: 60 },
  { name: 'equipment', label: 'Plant on site', type: 'number', value: 10 },
  { name: 'summary', label: 'Work carried out / issues', type: 'textarea', full: true },
], (x) => { S().reports.unshift({ id: nextId('DR'), project: d.p, author: project(d.p).manager, ...x }); });

Actions.addRfi = (d) => openModal('New RFI', [
  { name: 'subject', label: 'Subject', full: true },
  { name: 'due', label: 'Response due', type: 'date', value: addDays(today(), 7) },
], (x) => { S().rfis.unshift({ id: nextId('RFI'), project: d.p, date: today(), status: 'Open', ...x }); });

Actions.closeRfi = (d) => { S().rfis.find((r) => r.id === d.id).status = 'Answered'; commit('RFI answered'); };
