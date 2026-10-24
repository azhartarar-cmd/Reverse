Pages.finance = {
  title: 'Cash & Accounts',
  render(args) {
    const tab = args[0] || 'cash';
    return tabs('finance', [['cash', 'Cash flow'], ['receivables', 'Receivables'], ['payables', 'Payables & payment schedule'], ['revenue', 'Revenue recognition'], ['close', 'Month-end close']], tab) + (this[tab] || this.cash).call(this);
  },
  cash() {
    const s = S();
    const cf = s.cashflow;
    let run = s.bank.reduce((a, b) => a + b.balance, 0) / 1000;
    const fc = cf.filter((m) => m.forecast).map((m) => ({ ...m, net: m.inflow - m.outflow, close: (run += m.inflow - m.outflow) }));
    return `<div class="grid kpis">${s.bank.map((b) => kpi(esc(b.name), aed(num(b.balance)))).join('')}${kpi('Total cash', aed(num(s.bank.reduce((a, b) => a + b.balance, 0))))}</div>
      <div class="mt">${card('Monthly cash flow (AED k)', Chart.bars(cf.map((m) => m.month), [
        { name: 'Inflow', color: 'var(--c3)', values: cf.map((m) => m.inflow) },
        { name: 'Outflow', color: 'var(--c1)', values: cf.map((m) => m.outflow) },
      ], { dashedFrom: cf.findIndex((m) => m.forecast), fmt: (v) => num(v), height: 260 }))}</div>
      <div class="mt">${card('Forecast (AED k)', table([
        { h: 'Month', f: (m) => m.month },
        { h: 'Inflow', num: true, f: (m) => num(m.inflow) },
        { h: 'Outflow', num: true, f: (m) => num(m.outflow) },
        { h: 'Net', num: true, f: (m) => `<span class="${m.net >= 0 ? 'pos' : 'neg'}">${num(m.net)}</span>` },
        { h: 'Closing cash', num: true, f: (m) => num(m.close) },
      ], fc), { flush: true })}</div>`;
  },
  receivables() {
    const open = S().invoices.map((i) => ({ i, x: Calc.invoice(i) })).filter((r) => r.x.open >= 1);
    const buckets = [['Not due', (d) => d <= 0], ['1–30', (d) => d > 0 && d <= 30], ['31–60', (d) => d > 30 && d <= 60], ['61–90', (d) => d > 60 && d <= 90], ['90+', (d) => d > 90]];
    const clients = [...new Set(open.map((r) => r.i.client))];
    const rows = clients.map((c) => {
      const mine = open.filter((r) => r.i.client === c);
      return { c, b: buckets.map(([, fn]) => mine.filter((r) => fn(r.x.overdue)).reduce((a, r) => a + r.x.open, 0)), t: mine.reduce((a, r) => a + r.x.open, 0) };
    });
    const retention = S().ipcs.reduce((a, i) => a + i.cumWork * S().company.retentionPct / 100, 0);
    return `<div class="grid kpis">${kpi('Total receivable', aed(short(rows.reduce((a, r) => a + r.t, 0))))}${kpi('Overdue', aed(short(open.filter((r) => r.x.overdue > 0).reduce((a, r) => a + r.x.open, 0))))}${kpi('Retention held by clients', aed(short(retention)), 'Released at handover / end of DLP')}</div><div class="mt">` +
      card('Aged receivables (AED, incl. VAT)', table([
        { h: 'Client', f: (r) => esc(r.c), cls: 'wrap' },
        ...buckets.map(([l], k) => ({ h: l, num: true, f: (r) => (r.b[k] ? `<span class="${k > 1 ? 'neg' : ''}">${num(r.b[k])}</span>` : '—') })),
        { h: 'Total', num: true, f: (r) => `<b>${num(r.t)}</b>` },
      ], rows), { flush: true, actions: '<a class="btn sm" href="#/sales/invoices">Invoices</a>' }) + '</div>';
  },
  payables() {
    const ps = S().payables.slice().sort((a, b) => a.due.localeCompare(b.due));
    const name = (p) => (supplier(p.supplier) ? supplier(p.supplier).name : p.supplier);
    const next30 = ps.filter((p) => days(today(), p.due) <= 30).reduce((a, p) => a + p.amount, 0);
    return `<div class="grid kpis">${kpi('Total payable', aed(short(ps.reduce((a, p) => a + p.amount, 0))))}${kpi('Due in 30 days', aed(short(next30)))}${kpi('Overdue', aed(short(ps.filter((p) => p.due < today()).reduce((a, p) => a + p.amount, 0))))}</div><div class="mt">` +
      card('Payment schedule', table([
        { h: 'Due', f: (p) => `<span class="${p.due < today() ? 'neg strong' : ''}">${fdate(p.due)}</span>` },
        { h: 'Bill', f: (p) => p.id },
        { h: 'Supplier / subcontractor', f: (p) => esc(name(p)), cls: 'wrap' },
        { h: 'Reference', f: (p) => esc(p.ref) },
        { h: 'Amount (incl. VAT)', num: true, f: (p) => num(p.amount) },
        { h: '', f: (p) => `<button class="btn sm" data-act="payBill" data-id="${p.id}">Pay</button>` },
      ], ps, { empty: 'No open bills.' }), { flush: true }) + '</div>';
  },
  revenue() {
    const rows = S().projects.filter((p) => p.status !== 'Tender').map((p) => {
      const c = Calc.project(p);
      const costPct = c.eac ? c.actual / c.eac : 0; // cost-to-cost input method
      const revenue = c.revised * costPct;
      const billed = S().ipcs.filter((i) => i.project === p.id && i.status !== 'Draft').reduce((a, i) => Math.max(a, i.cumWork), 0);
      return { p, c, costPct, revenue, billed, wip: revenue - billed };
    });
    return `<div class="note">Revenue recognised over time using cost-to-cost progress (cost to date ÷ estimated total cost). Positive difference = contract asset (unbilled work); negative = contract liability (billed in advance).</div><div class="mt">` +
      card('Revenue recognition by project (AED)', table([
        { h: 'Project', f: (r) => `${r.p.id} <span class="muted small">${esc(r.p.name)}</span>`, cls: 'wrap' },
        { h: 'Revised contract', num: true, f: (r) => num(r.c.revised) },
        { h: 'Cost to date', num: true, f: (r) => num(r.c.actual) },
        { h: 'Est. total cost', num: true, f: (r) => num(r.c.eac) },
        { h: '% complete', num: true, f: (r) => pct(r.costPct, 1) },
        { h: 'Revenue to date', num: true, f: (r) => num(r.revenue) },
        { h: 'Certified to date', num: true, f: (r) => num(r.billed) },
        { h: 'Contract asset / (liability)', num: true, f: (r) => `<span class="${r.wip >= 0 ? 'pos' : 'neg'}">${num(r.wip)}</span>` },
      ], rows), { flush: true }) + '</div>';
  },
  close() {
    const s = S();
    s.closeChecklist = s.closeChecklist || [
      ['Post all GRNs and supplier bills for the month', false], ['Book accrued subcontractor work not yet invoiced', false],
      ['Run payroll and post WPS file', false], ['Post equipment depreciation', false], ['Reconcile bank accounts', false],
      ['Update BOQ progress and cost-to-complete for every project', false], ['Recognise revenue / WIP adjustments', false], ['Review VAT control account', false],
    ];
    const done = s.closeChecklist.filter((c) => c[1]).length;
    return card(`October 2026 close — ${done}/${s.closeChecklist.length} complete`, `${bar(done / s.closeChecklist.length, 'ok')}<div class="mt">` +
      s.closeChecklist.map(([t, ok], i) => `<label class="flex" style="padding:8px 0;border-bottom:1px solid var(--line);cursor:pointer"><input type="checkbox" style="width:auto" data-change="closeStep" data-i="${i}" ${ok ? 'checked' : ''}><span class="${ok ? 'muted' : ''}" style="${ok ? 'text-decoration:line-through' : ''}">${t}</span></label>`).join('') + '</div>');
  },
};
Actions.closeStep = (v, d, el) => { S().closeChecklist[d.i][1] = el.checked; commit(); };
Actions.payBill = (d) => {
  const p = S().payables.find((x) => x.id === d.id);
  openModal(`Pay ${p.id}`, [
    { name: 'bank', label: 'From account', type: 'select', options: options(S().bank.map((b) => [b.id, `${b.name} (${aed(b.balance)})`])) },
  ], (x) => {
    S().bank.find((b) => b.id === x.bank).balance -= p.amount;
    S().payables = S().payables.filter((y) => y !== p);
    const po = S().pos.find((o) => o.id === p.ref);
    if (po) po.paid = true;
  }, { submit: `Pay ${aed(p.amount)}` });
};

// ---------------- VAT ----------------
Pages.vat = {
  title: 'VAT',
  render(args) {
    const s = S();
    const q = args[0] || '2026-Q3';
    const [y, qn] = q.split('-Q').map(Number);
    const from = `${y}-${String((qn - 1) * 3 + 1).padStart(2, '0')}-01`;
    const to = `${qn === 4 ? y + 1 : y}-${String(qn === 4 ? 1 : qn * 3 + 1).padStart(2, '0')}-01`;
    const inQ = (d) => d >= from && d < to;
    const rate = s.company.vatRate / 100;

    const invs = s.invoices.filter((i) => inQ(i.date));
    const salesNet = invs.reduce((a, i) => a + i.net, 0) + (s.otherSales.find((o) => o.quarter === q)?.net || 0);
    const posQ = s.pos.filter((p) => inQ(p.date) && p.received > 0);
    const purchNet = posQ.reduce((a, p) => a + p.received * p.rate, 0) + (s.otherPurchases.find((o) => o.quarter === q)?.net || 0);
    const outVat = salesNet * rate, inVat = purchNet * rate, payable = outVat - inVat;
    const quarters = ['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'];
    const box = (n, l, a, v) => `<tr><td>${n}</td><td>${l}</td><td class="num">${num(a, 2)}</td><td class="num">${v == null ? '' : num(v, 2)}</td></tr>`;
    return `<div class="flex" style="margin-bottom:16px"><span class="muted">Tax period</span>${quarters.map((x) => `<a class="btn sm ${x === q ? 'primary' : ''}" href="#/vat/${x}">${x.replace('-', ' ')}</a>`).join('')}
        <span class="spacer"></span><button class="btn sm" data-act="exportVat" data-q="${q}">Export CSV</button></div>
      <div class="grid kpis">${kpi('Output VAT', aed(num(outVat)))}${kpi('Recoverable input VAT', aed(num(inVat)))}${kpi(payable >= 0 ? 'Net VAT payable' : 'Net VAT refundable', `<span class="${payable >= 0 ? 'neg' : 'pos'}">${aed(num(Math.abs(payable)))}</span>`, `Due 28 days after period end`)}</div>
      <div class="grid cols-2 mt">
        ${card(`VAT return summary — ${q.replace('-', ' ')}`, `<div class="table-wrap"><table><thead><tr><th>Box</th><th>Description</th><th class="num">Amount (AED)</th><th class="num">VAT (AED)</th></tr></thead><tbody>
          ${box('1', 'Standard-rated supplies (Abu Dhabi)', salesNet, outVat)}
          ${box('8', 'Totals — supplies', salesNet, outVat)}
          ${box('9', 'Standard-rated expenses', purchNet, inVat)}
          ${box('11', 'Totals — expenses', purchNet, inVat)}
          <tr class="total"><td>12</td><td>Total value of due tax</td><td></td><td class="num">${num(outVat, 2)}</td></tr>
          <tr class="total"><td>13</td><td>Total value of recoverable tax</td><td></td><td class="num">${num(inVat, 2)}</td></tr>
          <tr class="total"><td>14</td><td>Payable tax for the period</td><td></td><td class="num">${num(payable, 2)}</td></tr></tbody></table></div>
          <p class="muted small" style="padding:0 16px 12px">Simplified layout for review; file the return on the FTA portal after your accountant checks it.</p>`, { flush: true })}
        ${card('Tax account balances by quarter', table([
          { h: 'Quarter', f: (x) => x.q },
          { h: 'Output', num: true, f: (x) => num(x.o) },
          { h: 'Input', num: true, f: (x) => num(x.i) },
          { h: 'Net', num: true, f: (x) => num(x.o - x.i) },
        ], quarters.map((qq) => {
          const [yy, n] = qq.split('-Q').map(Number);
          const f = `${yy}-${String((n - 1) * 3 + 1).padStart(2, '0')}-01`, t = `${n === 4 ? yy + 1 : yy}-${String(n === 4 ? 1 : n * 3 + 1).padStart(2, '0')}-01`;
          const w = (d) => d >= f && d < t;
          const o = (s.invoices.filter((i) => w(i.date)).reduce((a, i) => a + i.net, 0) + (s.otherSales.find((x) => x.quarter === qq)?.net || 0)) * rate;
          const i = (s.pos.filter((p) => w(p.date) && p.received).reduce((a, p) => a + p.received * p.rate, 0) + (s.otherPurchases.find((x) => x.quarter === qq)?.net || 0)) * rate;
          return { q: qq, o, i };
        })), { flush: true })}
      </div>
      <div class="mt">${card('Output tax — invoices in period', table([
        { h: 'Invoice', f: (i) => i.id }, { h: 'Date', f: (i) => fdate(i.date) }, { h: 'Client', f: (i) => esc(i.client), cls: 'wrap' },
        { h: 'Net', num: true, f: (i) => num(i.net) }, { h: 'VAT', num: true, f: (i) => num(i.net * rate) },
      ], invs, { empty: 'No project invoices in this period (other sales are included in the totals).' }), { flush: true })}</div>`;
  },
};
Actions.exportVat = (d) => {
  const t = document.querySelector('.card table');
  const rows = [...t.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim()));
  download(`VAT-return-${d.q}.csv`, toCSV(rows), 'text/csv');
};
