// ---------------- CRM ----------------
const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation'];
Pages.crm = {
  title: 'CRM',
  render() {
    const s = S();
    const cols = STAGES.map((st) => {
      const ls = s.leads.filter((l) => l.stage === st);
      return `<div class="card"><div class="card-h"><h3>${st}</h3><span class="muted small">${ls.length} · ${short(ls.reduce((a, l) => a + l.value, 0))}</span></div>
        <div class="card-b" style="display:grid;gap:10px">${ls.map((l) => `<div style="border:1px solid var(--line);border-radius:8px;padding:10px">
          <div class="strong">${esc(l.company)}</div><div class="small muted">${esc(l.contact)} · AED ${short(l.value)}</div>
          <div class="small" style="margin:6px 0">${esc(l.note)}</div>
          <div class="flex small"><span class="${l.next < today() ? 'neg' : 'muted'}">Next: ${fdate(l.next)}</span><span class="spacer"></span>
          ${st !== 'Negotiation' ? `<button class="btn sm" data-act="advanceLead" data-id="${l.id}">→</button>` : `<button class="btn sm ok" data-act="winLead" data-id="${l.id}">Won</button>`}
          <button class="btn sm" data-act="logLead" data-id="${l.id}">Log</button></div></div>`).join('') || '<div class="muted small">—</div>'}</div></div>`;
    }).join('');
    return `<div class="head-row"><div class="muted">Opportunity pipeline · AED ${short(s.leads.reduce((a, l) => a + l.value, 0))} total</div><button class="btn primary" data-act="newLead">+ Opportunity</button></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${cols}</div>`;
  },
};
Actions.newLead = () => openModal('New opportunity', [
  { name: 'company', label: 'Company', full: true },
  { name: 'contact', label: 'Contact person' },
  { name: 'value', label: 'Estimated value (AED)', type: 'number' },
  { name: 'next', label: 'Next action date', type: 'date', value: addDays(today(), 7) },
  { name: 'note', label: 'Notes', type: 'textarea', full: true, required: false },
], (x) => { S().leads.push({ id: nextId('L'), stage: 'Lead', ...x }); });
Actions.advanceLead = (d) => { const l = S().leads.find((x) => x.id === d.id); l.stage = STAGES[STAGES.indexOf(l.stage) + 1]; commit(`Moved to ${l.stage}`); };
Actions.winLead = (d) => {
  const l = S().leads.find((x) => x.id === d.id);
  S().leads = S().leads.filter((x) => x !== l);
  S().quotations.unshift({ id: nextId('QT'), client: l.company, title: l.note || 'Awarded works', date: today(), status: 'Won', revisions: [{ rev: 0, date: today(), value: l.value, note: 'Converted from CRM' }] });
  commit('Marked as won — create the project from Projects');
};
Actions.logLead = (d) => {
  const l = S().leads.find((x) => x.id === d.id);
  openModal(`Log interaction — ${l.company}`, [
    { name: 'note', label: 'What happened', type: 'textarea', full: true, value: l.note },
    { name: 'next', label: 'Next action date', type: 'date', value: l.next },
  ], (x) => Object.assign(l, x));
};

// ---------------- Sales & billing ----------------
Pages.sales = {
  title: 'Sales & Billing',
  render(args) {
    const tab = args[0] || 'quotations';
    return tabs('sales', [['quotations', 'Quotations'], ['variations', 'Variation orders'], ['billing', 'Progress billing (IPC)'], ['invoices', 'Invoices'], ['soa', 'Statement of account']], tab) + (this[tab] || this.quotations).call(this, args);
  },
  quotations() {
    const qs = S().quotations;
    return card('Quotations & tenders', table([
      { h: 'Ref', f: (q) => `${q.id} <span class="muted small">Rev ${q.revisions.at(-1).rev}</span>` },
      { h: 'Client', f: (q) => esc(q.client), cls: 'wrap' },
      { h: 'Title', f: (q) => esc(q.title), cls: 'wrap' },
      { h: 'Value', num: true, f: (q) => num(q.revisions.at(-1).value) },
      { h: 'Revisions', f: (q) => q.revisions.map((r) => `<div class="small"><b>R${r.rev}</b> ${fdate(r.date)} · ${short(r.value)} <span class="muted">${esc(r.note)}</span></div>`).join(''), cls: 'wrap' },
      { h: 'Status', f: (q) => `<select class="inline" data-change="quoteStatus" data-id="${q.id}">${options(['Draft', 'Sent', 'Won', 'Lost'].map((x) => [x, x]), q.status)}</select>` },
      { h: '', f: (q) => `<div class="btn-row"><button class="btn sm" data-act="reviseQuote" data-id="${q.id}">New revision</button><button class="btn sm" data-act="proforma" data-id="${q.id}">Proforma</button></div>` },
    ], qs), { flush: true, actions: '<button class="btn primary sm" data-act="newQuote">+ Quotation</button>' }) +
      `<div class="grid kpis mt">${kpi('Win rate', pct(qs.filter((q) => q.status === 'Won').length / Math.max(1, qs.filter((q) => ['Won', 'Lost'].includes(q.status)).length)))}${kpi('Open quotations', aed(short(qs.filter((q) => ['Draft', 'Sent'].includes(q.status)).reduce((a, q) => a + q.revisions.at(-1).value, 0))))}</div>`;
  },
  variations() {
    return card('Variation orders', table([
      { h: 'Project', f: (v) => v.project },
      { h: 'VO', f: (v) => v.id },
      { h: 'Date', f: (v) => fdate(v.date) },
      { h: 'Description', f: (v) => esc(v.desc), cls: 'wrap' },
      { h: 'Value (AED)', num: true, f: (v) => num(v.value) },
      { h: 'Status', f: (v) => badge(v.status) },
      { h: '', f: (v) => (v.status === 'Submitted' ? `<div class="btn-row"><button class="btn sm ok" data-act="voStatus" data-p="${v.project}" data-id="${v.id}" data-v="Approved">Client approved</button><button class="btn sm bad" data-act="voStatus" data-p="${v.project}" data-id="${v.id}" data-v="Rejected">Rejected</button></div>` : '') },
    ], S().variations), { flush: true, actions: '<button class="btn primary sm" data-act="newVo">+ Variation</button>' });
  },
  billing() {
    const c = S().company;
    return `<div class="note">Interim payment certificates: cumulative work done less ${c.retentionPct}% retention and ${c.advancePct}% advance-payment recovery, plus ${c.vatRate}% VAT on the net amount this period.</div><div class="mt">` +
      card('Interim payment certificates', table([
        { h: 'IPC', f: (i) => i.id },
        { h: 'Project', f: (i) => i.project },
        { h: 'Period', f: (i) => i.period },
        { h: 'Cumulative work', num: true, f: (i) => num(i.cumWork) },
        { h: 'Work this period', num: true, f: (i) => num(Calc.ipc(i).thisWork) },
        { h: 'Retention', num: true, f: (i) => `(${num(Calc.ipc(i).retention)})` },
        { h: 'Advance rec.', num: true, f: (i) => `(${num(Calc.ipc(i).advance)})` },
        { h: 'Net', num: true, f: (i) => num(Calc.ipc(i).thisNet) },
        { h: 'VAT', num: true, f: (i) => num(Calc.ipc(i).vat) },
        { h: 'Total due', num: true, f: (i) => `<b>${num(Calc.ipc(i).total)}</b>` },
        { h: 'Status', f: (i) => badge(i.status) },
        { h: '', f: (i) => ({
          Draft: `<button class="btn sm" data-act="ipcStatus" data-id="${i.id}" data-v="Submitted">Submit</button>`,
          Submitted: `<button class="btn sm primary" data-act="ipcCertify" data-id="${i.id}">Certified → invoice</button>`,
        }[i.status] || '') },
      ], S().ipcs.slice().sort((a, b) => b.date.localeCompare(a.date))), { flush: true, actions: '<button class="btn primary sm" data-act="newIpc">+ New IPC from progress</button>' }) + '</div>';
  },
  invoices() {
    const inv = S().invoices;
    return card('Tax invoices', table([
      { h: 'Invoice', f: (i) => i.id },
      { h: 'Client', f: (i) => esc(i.client), cls: 'wrap' },
      { h: 'Project', f: (i) => i.project },
      { h: 'Date', f: (i) => fdate(i.date) },
      { h: 'Due', f: (i) => fdate(i.due) },
      { h: 'Net', num: true, f: (i) => num(i.net) },
      { h: 'VAT', num: true, f: (i) => num(Calc.invoice(i).vat) },
      { h: 'Total', num: true, f: (i) => num(Calc.invoice(i).total) },
      { h: 'Outstanding', num: true, f: (i) => num(Calc.invoice(i).open) },
      { h: 'Status', f: (i) => { const x = Calc.invoice(i); return badge(x.open < 1 ? 'Paid' : x.overdue > 0 ? 'Overdue' : 'Due'); } },
      { h: '', f: (i) => `<div class="btn-row">${Calc.invoice(i).open >= 1 ? `<button class="btn sm" data-act="receipt" data-id="${i.id}">Record receipt</button>` : ''}<button class="btn sm" data-act="printInvoice" data-id="${i.id}">View</button></div>` },
    ], inv.slice().sort((a, b) => b.date.localeCompare(a.date))), { flush: true });
  },
  soa(args) {
    const clients = [...new Set(S().invoices.map((i) => i.client))];
    const sel = args[1] || clients[0];
    const inv = S().invoices.filter((i) => i.client === sel).sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0;
    const lines = [];
    inv.forEach((i) => {
      const x = Calc.invoice(i);
      bal += x.total; lines.push({ date: i.date, ref: i.id, desc: `Tax invoice ${i.project}`, dr: x.total, cr: 0, bal });
      if (i.paid) { const r = i.paid * 1.05; bal -= r; lines.push({ date: i.due, ref: 'RCPT', desc: `Receipt against ${i.id}`, dr: 0, cr: r, bal }); }
    });
    return `<div class="flex" style="margin-bottom:12px"><span class="muted">Client</span><select class="inline" onchange="location.hash='#/sales/soa/'+encodeURIComponent(this.value)">${options(clients.map((c) => [c, c]), sel)}</select></div>` +
      card(`Statement of account — ${esc(sel)}`, table([
        { h: 'Date', f: (l) => fdate(l.date) },
        { h: 'Ref', f: (l) => l.ref },
        { h: 'Description', f: (l) => esc(l.desc) },
        { h: 'Debit', num: true, f: (l) => (l.dr ? num(l.dr, 2) : '') },
        { h: 'Credit', num: true, f: (l) => (l.cr ? num(l.cr, 2) : '') },
        { h: 'Balance', num: true, f: (l) => num(l.bal, 2) },
      ], lines, { foot: `<tr class="total"><td colspan="5">Balance due</td><td class="num">${aed(bal, 2)}</td></tr>` }), { flush: true });
  },
};

Actions.quoteStatus = (v, d) => { S().quotations.find((q) => q.id === d.id).status = v; commit('Quotation updated'); };
Actions.newQuote = () => openModal('New quotation', [
  { name: 'client', label: 'Client', full: true },
  { name: 'title', label: 'Scope / title', full: true },
  { name: 'value', label: 'Value (AED, excl. VAT)', type: 'number' },
  { name: 'note', label: 'Notes', required: false, full: true },
], (x) => { S().quotations.unshift({ id: nextId('QT'), client: x.client, title: x.title, date: today(), status: 'Draft', revisions: [{ rev: 0, date: today(), value: x.value, note: x.note }] }); });
Actions.reviseQuote = (d) => {
  const q = S().quotations.find((x) => x.id === d.id);
  const last = q.revisions.at(-1);
  openModal(`Revise ${q.id}`, [
    { name: 'value', label: 'Revised value (AED)', type: 'number', value: last.value },
    { name: 'note', label: 'Reason for revision', full: true },
  ], (x) => { q.revisions.push({ rev: last.rev + 1, date: today(), ...x }); q.date = today(); });
};
Actions.proforma = (d) => {
  const q = S().quotations.find((x) => x.id === d.id);
  const c = S().company;
  const v = q.revisions.at(-1).value;
  const adv = v * c.advancePct / 100;
  openModal(`Proforma invoice — ${q.id}`, [], null, { html: `<div style="line-height:1.7">
    <div class="strong">${esc(c.legalName)}</div><div class="muted small">${esc(c.address)} · TRN ${c.trn}</div><hr>
    <div><b>To:</b> ${esc(q.client)}</div><div><b>For:</b> ${esc(q.title)} (Rev ${q.revisions.at(-1).rev})</div>
    <table class="mt"><tr><td>Advance payment ${c.advancePct}% of ${aed(v)}</td><td class="num">${num(adv, 2)}</td></tr>
    <tr><td>VAT ${c.vatRate}%</td><td class="num">${num(adv * c.vatRate / 100, 2)}</td></tr>
    <tr class="total"><td>Total</td><td class="num">${aed(adv * (1 + c.vatRate / 100), 2)}</td></tr></table>
    <p class="muted small">Proforma only — not a tax invoice.</p></div>` });
};
Actions.newVo = () => openModal('New variation order', [
  { name: 'project', label: 'Project', type: 'select', options: projOptions('', (p) => p.status !== 'Tender'), full: true },
  { name: 'desc', label: 'Description', full: true },
  { name: 'value', label: 'Value (AED)', type: 'number' },
], (x) => {
  const n = S().variations.filter((v) => v.project === x.project).length + 1;
  S().variations.push({ id: 'VO-' + String(n).padStart(2, '0'), date: today(), status: 'Submitted', ...x });
});
Actions.voStatus = (d) => { S().variations.find((v) => v.project === d.p && v.id === d.id).status = d.v; commit(`${d.id} ${d.v.toLowerCase()}`); };

Actions.newIpc = () => openModal('New interim payment certificate', [
  { name: 'project', label: 'Project', type: 'select', options: projOptions('', (p) => p.status === 'Active'), full: true },
  { name: 'period', label: 'Period', value: new Date(today()).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) },
], (x) => {
  const p = project(x.project);
  const c = Calc.project(p);
  const prev = S().ipcs.filter((i) => i.project === p.id).sort((a, b) => b.no - a.no)[0];
  const no = prev ? prev.no + 1 : 1;
  const cumWork = Math.round(c.earned + c.vo * c.progress);
  if (prev && cumWork <= prev.cumWork) { alert(`No new work since ${prev.id} (cumulative ${num(prev.cumWork)}). Update BOQ progress first.`); return false; }
  S().ipcs.push({ id: `IPC-${p.id.slice(2)}-${String(no).padStart(2, '0')}`, project: p.id, no, date: today(), period: x.period, prevCum: prev ? prev.cumWork : 0, cumWork, status: 'Draft' });
}, { submit: 'Create from BOQ progress', html: '<p class="muted">Cumulative work = BOQ earned value + approved variations pro-rata to progress.</p>' });
Actions.ipcStatus = (d) => { S().ipcs.find((i) => i.id === d.id).status = d.v; commit(`${d.id} ${d.v.toLowerCase()}`); };
Actions.ipcCertify = (d) => {
  const i = S().ipcs.find((x) => x.id === d.id);
  const p = project(i.project);
  i.status = 'Certified';
  S().invoices.unshift({ id: nextId('INV-26'), ipc: i.id, client: p.client, project: p.id, date: today(), due: addDays(today(), 30), net: Math.round(Calc.ipc(i).thisNet), paid: 0 });
  commit('Certified — tax invoice issued');
};
Actions.receipt = (d) => {
  const i = S().invoices.find((x) => x.id === d.id);
  const open = Calc.invoice(i).open;
  openModal(`Receipt against ${i.id}`, [
    { name: 'amount', label: 'Amount received incl. VAT (AED)', type: 'number', step: 'any', value: Math.round(open * 100) / 100 },
    { name: 'bank', label: 'Into account', type: 'select', options: options(S().bank.map((b) => [b.id, b.name])) },
  ], (x) => {
    i.paid += x.amount / (1 + S().company.vatRate / 100);
    S().bank.find((b) => b.id === x.bank).balance += x.amount;
    const ipc = S().ipcs.find((p) => p.id === i.ipc);
    if (ipc && Calc.invoice(i).open < 1) ipc.status = 'Paid';
  }, { submit: 'Post receipt' });
};
Actions.printInvoice = (d) => {
  const i = S().invoices.find((x) => x.id === d.id);
  const c = S().company;
  const x = Calc.invoice(i);
  openModal(`Tax invoice ${i.id}`, [], null, { wide: true, html: `<div style="line-height:1.7">
    <div class="flex"><div><div class="strong" style="font-size:18px">${esc(c.legalName)}</div><div class="muted small">${esc(c.address)}<br>TRN ${c.trn}</div></div><span class="spacer"></span>
    <div class="right"><div class="strong" style="font-size:18px">TAX INVOICE</div><div class="small">${i.id}<br>Date ${fdate(i.date)} · Due ${fdate(i.due)}</div></div></div><hr>
    <div><b>Bill to:</b> ${esc(i.client)}</div><div><b>Project:</b> ${esc(projLabel(i.project))} ${i.ipc ? `· ${i.ipc}` : ''}</div>
    <table class="mt"><thead><tr><th>Description</th><th class="num">Amount (AED)</th></tr></thead><tbody>
    <tr><td>${i.ipc ? `Interim payment certificate ${i.ipc} — net of retention and advance recovery` : 'Contract works'}</td><td class="num">${num(i.net, 2)}</td></tr>
    <tr><td>VAT @ ${c.vatRate}%</td><td class="num">${num(x.vat, 2)}</td></tr>
    <tr class="total"><td>Total</td><td class="num">${num(x.total, 2)}</td></tr></tbody></table>
    <div class="btn-row mt"><button type="button" class="btn" onclick="window.print()">Print</button></div></div>` });
};
