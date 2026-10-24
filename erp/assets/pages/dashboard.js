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
    const ap = openBills().reduce((a, p) => a + p.amount, 0);
    const pipeline = s.leads.reduce((a, l) => a + l.value, 0);

    const cf = s.cashflow;
    const firstForecast = cf.findIndex((m) => m.forecast);
    const lowStock = s.items.filter((i) => Calc.stockQty(i.id) < i.reorder);
    const openRfis = s.rfis.filter((r) => r.status === 'Open');

    const u = currentUser();
    const hour = 9; // fixed demo clock
    const quick = [
      ['procurement', 'newReq', 'package', 'Requisition'], ['sales', 'newIpc', 'receipt', 'New IPC'], ['equipment', 'newPlantLog', 'fuel', 'Plant log'],
      ['quality', 'newIncident', 'alert', 'Incident'], ['accounting', 'newJournal', 'book', 'Journal'],
    ].filter(([m]) => canSee(m));
    const due = Notify.list().filter((n) => n.sev === 'bad').length;
    return `
      <div class="hero"><div><h2>Good ${hour < 12 ? 'morning' : 'afternoon'}, ${esc(u.name.split(' ')[0])}</h2>
        <p>${new Date(today()).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${due ? `<a href="#/notifications">${due} urgent alert${due > 1 ? 's' : ''}</a>` : 'no urgent alerts'} · ${pendingApprovals()} waiting for approval</p></div>
        <div class="quick">${quick.map(([, act, ic, l]) => `<button class="btn" data-act="${act}">${icon(ic, 16)} ${l}</button>`).join('')}<button class="btn primary" data-act="palette">${icon('search', 16)} Find anything <span class="kbd" style="background:transparent;color:inherit;border-color:#ffffff66">${isMac ? '⌘' : 'Ctrl'} K</span></button></div></div>
      <div class="grid kpis k4">
        ${kpi('Active projects', live.length, `${s.projects.filter((p) => p.status === 'Tender').length} at tender`, '#/projects')}
        ${kpi('Revised contract value', aed(short(contract)), 'Active projects incl. approved VOs', '#/projects')}
        ${kpi('Work done (earned)', aed(short(earned)), `${pct(earned / contract)} of contract`, '#/sales/billing')}
        ${kpi('Cost to date', aed(short(actual)), `Gross margin ${pct((earned - actual) / earned, 1)}`, '#/accounting/projects')}
        ${kpi('Cash at bank', aed(short(cash)), `${s.bank.length} accounts`, '#/finance')}
        ${kpi('Receivables', aed(short(ar)), `<span class="neg">${aed(short(overdue))} overdue</span>`, '#/finance/receivables')}
        ${kpi('Payables', aed(short(ap)), `${openBills().length} open bills`, '#/finance/payables')}
        ${kpi('Sales pipeline', aed(short(pipeline)), `${s.leads.length} opportunities`, '#/crm')}
      </div>

      <div class="grid kpis k6 mt">
        ${kpi('Asphalt produced (7 days)', `${num(s.prodOrders.filter((o) => o.status === 'Produced' && daysTo(o.date) >= -7).reduce((a, o) => a + o.tons, 0))} t`, '', '#/production')}
        ${kpi('Open NCRs / failed tests', `${s.ncrs.filter((n) => n.status === 'Open').length} / ${s.labTests.filter((t) => !t.pass).length}`, '', '#/quality/ncr')}
        ${kpi('Days without LTI', days(s.hseStats.lastLti, today()), '', '#/quality/hse')}
        ${kpi('Delay (LD) exposure', `<span class="neg">${aed(short(s.projects.reduce((a, p) => a + (p.status === 'Active' ? Calc.ld(p).exposure : 0), 0)))}</span>`, '', '#/contracts/claims')}
        ${kpi('Permits / bonds expiring', `${s.permits.filter((p) => p.status === 'Active' && daysTo(p.expiry) <= 30).length} / ${s.bonds.filter((b) => b.status === 'Active' && daysTo(b.expiry) <= 60).length}`, '30 / 60 days', '#/contracts/permits')}
        ${kpi('Plant deployed today', `${s.equipment.filter((e) => s.bookings.some((b) => b.eq === e.id && b.from <= today() && b.to >= today())).length} / ${s.equipment.length}`, '', '#/equipment/calendar')}
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
      ...s.requisitions.filter((r) => r.status === 'Pending' && canApprove('requisitions')).map((r) => ({
        kind: 'Material requisition', id: r.id, by: r.by, date: r.date, coll: 'requisitions', field: 'status',
        what: `${num(r.qty)} ${item(r.item).unit} ${item(r.item).name} for ${r.project}`, value: r.qty * item(r.item).cost,
      })),
      ...s.pos.filter((p) => p.approval === 'Pending' && canApprove('pos')).map((p) => ({
        kind: 'Purchase order', id: p.id, by: 'Mark Dela Cruz', date: p.date, coll: 'pos', field: 'approval',
        what: `${supplierName(p.supplier)} — ${num(p.qty)} ${item(p.item).unit} ${item(p.item).name}`, value: p.qty * p.rate,
      })),
      ...s.leaves.filter((l) => l.status === 'Pending' && canApprove('leaves')).map((l) => ({
        kind: 'Leave request', id: l.id, by: emp(l.emp).name, date: l.from, coll: 'leaves', field: 'status',
        what: `${l.type} leave, ${l.days} days (${fdate(l.from)} – ${fdate(l.to)})`, value: null,
      })),
      ...s.eqRequests.filter((r) => r.status === 'Pending' && canApprove('eqRequests')).map((r) => ({
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
