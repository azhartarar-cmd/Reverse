Pages.dashboard = {
  title: 'Dashboard',
  render() {
    const s = S();
    const live = s.projects.filter((p) => p.status === 'Active');
    const calcs = live.map((p) => ({ p, c: Calc.project(p) }));
    const contract = calcs.reduce((a, x) => a + x.c.revised, 0);
    const earned = calcs.reduce((a, x) => a + x.c.earned, 0);
    const actual = calcs.reduce((a, x) => a + x.c.actual, 0);
    const cash = s.bank.reduce((a, b) => a + b.balance, 0);
    const ar = s.invoices.reduce((a, i) => a + Calc.invoice(i).open, 0);
    const overdue = s.invoices.filter((i) => Calc.invoice(i).open > 0 && Calc.invoice(i).overdue > 0).reduce((a, i) => a + Calc.invoice(i).open, 0);
    const ap = s.payables.reduce((a, p) => a + p.amount, 0);
    const pipeline = s.leads.reduce((a, l) => a + l.value, 0);

    const cf = s.cashflow;
    const firstForecast = cf.findIndex((m) => m.forecast);
    const lowStock = s.items.filter((i) => Calc.stockQty(i.id) < i.reorder);
    const openRfis = s.rfis.filter((r) => r.status === 'Open');

    return `
      <div class="grid kpis">
        ${kpi('Active projects', live.length, `${s.projects.filter((p) => p.status === 'Tender').length} at tender`)}
        ${kpi('Revised contract value', aed(short(contract)), 'Active projects incl. approved VOs')}
        ${kpi('Work done (earned)', aed(short(earned)), `${pct(earned / contract)} of contract`)}
        ${kpi('Cost to date', aed(short(actual)), `Gross margin ${pct((earned - actual) / earned, 1)}`)}
        ${kpi('Cash at bank', aed(short(cash)), `${s.bank.length} accounts`)}
        ${kpi('Receivables', aed(short(ar)), `<span class="neg">${aed(short(overdue))} overdue</span>`)}
        ${kpi('Payables', aed(short(ap)), `${s.payables.length} open bills`)}
        ${kpi('Sales pipeline', aed(short(pipeline)), `${s.leads.length} opportunities`)}
      </div>

      <div class="grid cols-2 mt">
        ${card('Cash flow (AED k) — actual vs forecast', Chart.bars(cf.map((m) => m.month), [
          { name: 'Inflow', color: 'var(--c3)', values: cf.map((m) => m.inflow) },
          { name: 'Outflow', color: 'var(--c1)', values: cf.map((m) => m.outflow) },
        ], { dashedFrom: firstForecast, fmt: (v) => num(v) }), { actions: '<a class="btn sm" href="#/finance">Open finance</a>' })}
        ${card('Budget vs actual cost — active projects', Chart.hbars(calcs.map(({ p, c }) => ({ label: p.id + ' ' + p.name.split('–')[0], a: c.earnedBudget, b: c.actual }))) +
          '<div class="legend"><span><i style="background:color-mix(in srgb,var(--c2) 25%,transparent)"></i>Budgeted cost of work done</span><span><i style="background:var(--c1)"></i>Actual cost</span><span><i style="background:var(--bad)"></i>Over budget</span></div>')}
      </div>

      <div class="mt">
        ${card('Projects', table([
          { h: 'Project', f: (x) => `<a href="#/projects/${x.p.id}">${x.p.id}</a> <span class="muted">${esc(x.p.name)}</span>`, cls: 'wrap' },
          { h: 'Status', f: (x) => badge(x.p.status) },
          { h: 'Contract', num: true, f: (x) => short(x.c.revised) },
          { h: 'Progress', f: (x) => `<div class="flex">${bar(x.c.progress)}<span class="small">${pct(x.c.progress)}</span></div>` },
          { h: 'Cost variance', num: true, f: (x) => `<span class="${x.c.costVariance >= 0 ? 'pos' : 'neg'}">${short(x.c.costVariance)}</span>` },
          { h: 'Forecast margin', num: true, f: (x) => pct(x.c.forecastMargin, 1) },
          { h: 'Completion', f: (x) => fdate(x.p.end) },
        ], s.projects.map((p) => ({ p, c: Calc.project(p) }))), { flush: true })}
      </div>

      <div class="grid cols-3 mt">
        ${card('Waiting for approval', `<div class="kpi" style="padding:0"><div class="val">${pendingApprovals()}</div><div class="sub">requisitions, POs, leave and equipment requests</div></div><div class="mt"><a class="btn primary sm" href="#/approvals">Review now</a></div>`)}
        ${card('Low stock', lowStock.length ? table([
          { h: 'Item', f: (i) => esc(i.name) },
          { h: 'On hand', num: true, f: (i) => `${num(Calc.stockQty(i.id))} ${i.unit}` },
          { h: 'Reorder at', num: true, f: (i) => num(i.reorder) },
        ], lowStock) : '<div class="muted">All items above reorder level.</div>', { flush: !!lowStock.length })}
        ${card('Open RFIs', table([
          { h: 'RFI', f: (r) => `${r.id} <span class="muted small">${r.project}</span>` },
          { h: 'Subject', f: (r) => esc(r.subject), cls: 'wrap' },
          { h: 'Due', f: (r) => `<span class="${r.due < today() ? 'neg' : ''}">${fdate(r.due)}</span>` },
        ], openRfis), { flush: true })}
      </div>`;
  },
};

Pages.approvals = {
  title: 'Approvals',
  render() {
    const s = S();
    const rows = [
      ...s.requisitions.filter((r) => r.status === 'Pending').map((r) => ({
        kind: 'Material requisition', id: r.id, by: r.by, date: r.date, coll: 'requisitions', field: 'status',
        what: `${num(r.qty)} ${item(r.item).unit} ${item(r.item).name} for ${r.project}`, value: r.qty * item(r.item).cost,
      })),
      ...s.pos.filter((p) => p.approval === 'Pending').map((p) => ({
        kind: 'Purchase order', id: p.id, by: 'Mark Dela Cruz', date: p.date, coll: 'pos', field: 'approval',
        what: `${supplierName(p.supplier)} — ${num(p.qty)} ${item(p.item).unit} ${item(p.item).name}`, value: p.qty * p.rate,
      })),
      ...s.leaves.filter((l) => l.status === 'Pending').map((l) => ({
        kind: 'Leave request', id: l.id, by: emp(l.emp).name, date: l.from, coll: 'leaves', field: 'status',
        what: `${l.type} leave, ${l.days} days (${fdate(l.from)} – ${fdate(l.to)})`, value: null,
      })),
      ...s.eqRequests.filter((r) => r.status === 'Pending').map((r) => ({
        kind: 'Equipment request', id: r.id, by: r.by, date: r.from, coll: 'eqRequests', field: 'status',
        what: `${r.type} for ${r.project}, ${fdate(r.from)} – ${fdate(r.to)}`, value: null,
      })),
    ];
    return card(`Pending items (${rows.length})`, table([
      { h: 'Type', f: (r) => `<span class="badge b-info">${r.kind}</span>` },
      { h: 'Ref', f: (r) => r.id },
      { h: 'Details', f: (r) => esc(r.what), cls: 'wrap' },
      { h: 'Requested by', f: (r) => esc(r.by) },
      { h: 'Value', num: true, f: (r) => (r.value == null ? '—' : aed(r.value)) },
      { h: '', f: (r) => `<div class="btn-row"><button class="btn sm ok" data-act="decide" data-coll="${r.coll}" data-field="${r.field}" data-id="${r.id}" data-v="Approved">Approve</button><button class="btn sm bad" data-act="decide" data-coll="${r.coll}" data-field="${r.field}" data-id="${r.id}" data-v="Rejected">Reject</button></div>` },
    ], rows, { empty: 'All caught up — nothing waiting for approval.' }), { flush: true })
      + '<p class="muted small mt">Approval rules (amount thresholds, approver per role) can be adjusted in Settings.</p>';
  },
};

Actions.decide = (d) => {
  const rec = S()[d.coll].find((x) => x.id === d.id);
  if (!rec) return;
  rec[d.field] = d.v;
  if (d.coll === 'leaves' && d.v === 'Approved' && rec.type === 'Annual') {
    const e = emp(rec.emp);
    e.leaveBalance = Math.max(0, e.leaveBalance - rec.days);
  }
  commit(`${d.id} ${d.v.toLowerCase()}`);
};
