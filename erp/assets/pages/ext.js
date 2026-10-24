// Additional views on existing modules: HR documents & camps, milestone billing, e-invoicing, CRM calendar,
// overhead allocation, multi-currency, corporate tax, companies & access settings.

// ---------------- HR ----------------
const DOC_FIELDS = [['passportExpiry', 'Passport'], ['visaExpiry', 'Residence visa'], ['eidExpiry', 'Emirates ID'], ['labourCardExpiry', 'Labour card'], ['licenceExpiry', 'Driving / plant licence']];
Object.assign(Pages.hr, {
  documents() {
    const es = S().employees;
    const soon = es.reduce((a, e) => a + DOC_FIELDS.filter(([f]) => e[f] && daysTo(e[f]) <= 60).length, 0);
    return `<div class="grid kpis">${kpi('Documents tracked', es.reduce((a, e) => a + DOC_FIELDS.filter(([f]) => e[f]).length, 0))}${kpi('Expiring ≤ 60 days or expired', `<span class="${soon ? 'neg' : ''}">${soon}</span>`)}</div><div class="mt">` +
      card('Employee documents', table([
        { h: 'Employee', f: (e) => `${esc(e.name)} <span class="muted small">${esc(e.role)}</span>` },
        ...DOC_FIELDS.map(([f, l]) => ({ h: l, f: (e) => expiryBadge(e[f]) })),
        { h: '', f: (e) => `<button class="btn sm" data-act="renewDocs" data-id="${e.id}">Update</button>` },
      ], es), { flush: true }) + '</div>';
  },
  camps() {
    const s = S();
    return `<div class="grid kpis">${kpi('Beds', num(s.camps.reduce((a, c) => a + c.capacity, 0)))}${kpi('Occupied', num(s.camps.reduce((a, c) => a + c.occupied, 0)))}${kpi('Monthly accommodation cost', aed(num(s.camps.reduce((a, c) => a + c.occupied * c.costPerBed, 0))))}</div><div class="mt">` +
      card('Labour accommodation', table([
        { h: 'Camp', f: (c) => `<span class="strong">${esc(c.name)}</span>` },
        { h: 'Rooms', num: true, f: (c) => c.rooms },
        { h: 'Capacity', num: true, f: (c) => c.capacity },
        { h: 'Occupied', num: true, f: (c) => c.occupied },
        { h: 'Occupancy', f: (c) => `<div class="flex">${bar(c.occupied / c.capacity)}<span class="small">${pct(c.occupied / c.capacity)}</span></div>` },
        { h: 'Cost / bed / month', num: true, f: (c) => num(c.costPerBed) },
      ], s.camps), { flush: true }) + '</div><div class="mt">' +
      card('Room allocation (staff in this register)', table([
        { h: 'Employee', f: (e) => esc(e.name) },
        { h: 'Camp', f: (e) => esc(s.camps.find((c) => c.id === e.camp)?.name || '—') },
        { h: 'Room', f: (e) => e.room || '—' },
        { h: 'Assigned project', f: (e) => e.project || '—' },
      ], s.employees.filter((e) => e.camp)), { flush: true }) + '</div>';
  },
});
Actions.renewDocs = (d) => {
  const e = emp(d.id);
  openModal(`Documents — ${e.name}`, DOC_FIELDS.map(([f, l]) => ({ name: f, label: `${l} expiry`, type: 'date', value: e[f], required: false })), (x) => Object.assign(e, x));
};
Actions.postPayroll = () => {
  const m = today().slice(0, 7);
  if (S().payrollRuns.includes(m)) return;
  const total = S().employees.reduce((a, e) => a + Calc.pay(e).gross, 0);
  const b = S().bank.find((x) => x.id === 'BA-2');
  if (!confirm(`Post ${m} payroll of ${aed(num(total, 2))} and pay it from ${b.name}?`)) return;
  S().payrollRuns.push(m);
  b.balance -= total;
  commit('Payroll posted to the ledger');
};

// ---------------- Sales: milestones, e-invoice, email ----------------
Object.assign(Pages.sales, {
  milestones() {
    const ms = S().milestones;
    return '<div class="note">Milestone billing invoices a fixed % of the contract when a defined stage is reached — an alternative to measured progress billing (IPCs).</div><div class="mt">' +
      card('Billing milestones', table([
        { h: 'Ref', f: (m) => m.id },
        { h: 'Project', f: (m) => m.project },
        { h: 'Milestone', f: (m) => esc(m.desc), cls: 'wrap' },
        { h: '% of contract', num: true, f: (m) => `${m.pct}%` },
        { h: 'Amount', num: true, f: (m) => num(Calc.project(project(m.project)).revised * m.pct / 100) },
        { h: 'Due', f: (m) => `<span class="${m.status === 'Planned' && m.due < today() ? 'neg' : ''}">${fdate(m.due)}</span>` },
        { h: 'Status', f: (m) => (m.status === 'Invoiced' ? `${badge('Paid').replace('Paid', 'Invoiced')} <span class="small muted">${m.invoice}</span>` : badge('Draft').replace('Draft', 'Planned')) },
        { h: '', f: (m) => (m.status === 'Planned' ? `<button class="btn sm primary" data-act="invoiceMilestone" data-id="${m.id}">Milestone reached → invoice</button>` : '') },
      ], ms), { flush: true, actions: '<button class="btn primary sm" data-act="newMilestone">+ Milestone</button>' }) + '</div>';
  },
});
Actions.newMilestone = () => openModal('Billing milestone', [
  { name: 'project', label: 'Project', type: 'select', options: projOptions('', (p) => p.status !== 'Tender'), full: true },
  { name: 'desc', label: 'Milestone', full: true },
  { name: 'pct', label: '% of contract', type: 'number', step: 'any' },
  { name: 'due', label: 'Target date', type: 'date', value: addDays(today(), 60) },
], (x) => {
  const used = S().milestones.filter((m) => m.project === x.project).reduce((a, m) => a + m.pct, 0);
  if (used + x.pct > 100) { alert(`Milestones for ${x.project} would exceed 100% (already ${used}%).`); return false; }
  S().milestones.push({ id: nextId('MS-' + x.project.slice(2)), ...x, status: 'Planned' });
});
Actions.invoiceMilestone = (d) => {
  const m = S().milestones.find((x) => x.id === d.id);
  const p = project(m.project);
  const net = Math.round(Calc.project(p).revised * m.pct / 100);
  const id = nextId('INV-26');
  S().invoices.unshift({ id, ipc: '', client: p.client, project: p.id, date: today(), due: addDays(today(), 30), net, paid: 0, milestone: m.id });
  Object.assign(m, { status: 'Invoiced', invoice: id });
  commit(`Milestone invoiced — ${id}`);
};
const xmlEsc = (v) => String(v).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
Actions.einvoice = (d) => {
  const i = S().invoices.find((x) => x.id === d.id);
  const c = S().company, x = Calc.invoice(i);
  const cl = S().clients.find((k) => k.name === i.client) || { trn: '', address: '' };
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${xmlEsc(i.id)}</cbc:ID>
  <cbc:IssueDate>${i.date}</cbc:IssueDate>
  <cbc:DueDate>${i.due}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>AED</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${xmlEsc(i.project)}</cbc:BuyerReference>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyName><cbc:Name>${xmlEsc(c.legalName)}</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cbc:StreetName>${xmlEsc(c.address)}</cbc:StreetName><cac:Country><cbc:IdentificationCode>AE</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyTaxScheme><cbc:CompanyID>${c.trn}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyName><cbc:Name>${xmlEsc(i.client)}</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cbc:StreetName>${xmlEsc(cl.address)}</cbc:StreetName><cac:Country><cbc:IdentificationCode>AE</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyTaxScheme><cbc:CompanyID>${cl.trn}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="AED">${x.vat.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal><cbc:TaxableAmount currencyID="AED">${i.net.toFixed(2)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="AED">${x.vat.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${c.vatRate}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="AED">${i.net.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="AED">${i.net.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="AED">${x.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="AED">${x.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="AED">${i.net.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>${xmlEsc(i.ipc ? `Interim payment certificate ${i.ipc}` : i.milestone ? `Milestone ${i.milestone}` : 'Contract works')} – ${xmlEsc(i.project)}</cbc:Name>
      <cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${c.vatRate}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="AED">${i.net.toFixed(2)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>
`;
  download(`${i.id}.xml`, xml, 'application/xml');
  toast('E-invoice XML downloaded');
};
Actions.emailInvoice = (d) => {
  const i = S().invoices.find((x) => x.id === d.id);
  const x = Calc.invoice(i);
  const cl = S().clients.find((k) => k.name === i.client);
  const body = `Dear ${i.client},\n\nPlease find our tax invoice ${i.id} dated ${fdate(i.date)} for project ${projLabel(i.project)}.\n\nNet: AED ${num(i.net, 2)}\nVAT ${S().company.vatRate}%: AED ${num(x.vat, 2)}\nTotal: AED ${num(x.total, 2)}\nDue date: ${fdate(i.due)}\n\nKind regards,\n${S().company.legalName}`;
  location.href = `mailto:${encodeURIComponent(cl?.email || '')}?subject=${encodeURIComponent(`Tax invoice ${i.id} – ${S().company.name}`)}&body=${encodeURIComponent(body)}`;
};

// ---------------- CRM: tabs, calendar, history ----------------
Pages.crm.pipeline = Pages.crm.render;
Pages.crm.render = function (args) {
  const tab = args[0] || 'pipeline';
  return tabs('crm', [['pipeline', 'Pipeline'], ['calendar', 'Event calendar'], ['history', 'Interaction history']], tab) + (this[tab] || this.pipeline).call(this);
};
Object.assign(Pages.crm, {
  calendar() {
    const t = new Date(today());
    const first = new Date(t.getFullYear(), t.getMonth(), 1);
    const startDow = (first.getDay() + 6) % 7;
    const daysIn = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push('');
    for (let d = 1; d <= daysIn; d++) cells.push(d);
    while (cells.length % 7) cells.push('');
    const ym = today().slice(0, 7);
    const evs = S().events;
    const cell = (d) => {
      if (!d) return '<td style="background:var(--bg)"></td>';
      const date = `${ym}-${String(d).padStart(2, '0')}`;
      const list = evs.filter((e) => e.date === date);
      return `<td style="vertical-align:top;height:86px;white-space:normal;${date === today() ? 'background:var(--brand-soft)' : ''}"><div class="small strong">${d}</div>${list.map((e) => `<div class="badge ${e.type === 'Tender deadline' ? 'b-bad' : 'b-info'}" style="display:block;margin-top:3px;white-space:normal;font-weight:500">${e.time} ${esc(e.title)}</div>`).join('')}</td>`;
    };
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(`<tr>${cells.slice(i, i + 7).map(cell).join('')}</tr>`);
    const upcoming = evs.filter((e) => e.date >= today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return card(first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), `<div class="table-wrap"><table style="table-layout:fixed;min-width:700px"><thead><tr>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<th>${d}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`,
      { flush: true, actions: '<button class="btn primary sm" data-act="newEvent">+ Event</button>' }) + '<div class="mt">' +
      card('Upcoming', table([
        { h: 'Date', f: (e) => `${fdate(e.date)} ${e.time}` },
        { h: 'Type', f: (e) => e.type },
        { h: 'Event', f: (e) => esc(e.title), cls: 'wrap' },
        { h: 'Opportunity', f: (e) => esc(S().leads.find((l) => l.id === e.lead)?.company || '—') },
      ], upcoming), { flush: true }) + '</div>';
  },
  history() {
    const rows = S().leads.flatMap((l) => (l.history || []).map((h) => ({ l, h }))).sort((a, b) => b.h.date.localeCompare(a.h.date));
    return card('Interaction history', table([
      { h: 'Date', f: (r) => fdate(r.h.date) },
      { h: 'Company', f: (r) => esc(r.l.company) },
      { h: 'Contact', f: (r) => esc(r.l.contact) },
      { h: 'Stage', f: (r) => badge(r.l.stage) },
      { h: 'Note', f: (r) => esc(r.h.note), cls: 'wrap' },
    ], rows), { flush: true });
  },
});
Actions.logLead = (d) => {
  const l = S().leads.find((x) => x.id === d.id);
  openModal(`Log interaction — ${l.company}`, [
    { name: 'note', label: 'What happened', type: 'textarea', full: true },
    { name: 'next', label: 'Next action date', type: 'date', value: l.next },
  ], (x) => { (l.history || (l.history = [])).unshift({ date: today(), note: x.note }); l.note = x.note; l.next = x.next; },
  { html: (l.history || []).length ? `<div class="small muted" style="margin-bottom:10px">${l.history.slice(0, 4).map((h) => `<div>${fdate(h.date)} — ${esc(h.note)}</div>`).join('')}</div>` : '' });
};
Actions.newEvent = () => openModal('New event', [
  { name: 'title', label: 'Title', full: true },
  { name: 'type', label: 'Type', type: 'select', options: options(['Meeting', 'Site visit', 'Call', 'Tender deadline'].map((x) => [x, x])) },
  { name: 'lead', label: 'Opportunity', type: 'select', options: '<option value="">—</option>' + options(S().leads.map((l) => [l.id, l.company])) },
  { name: 'date', label: 'Date', type: 'date', value: addDays(today(), 3) },
  { name: 'time', label: 'Time', type: 'time', value: '10:00' },
], (x) => { S().events.push({ id: nextId('EV'), ...x }); });

// ---------------- Finance: overheads, multi-currency ----------------
Object.assign(Pages.finance, {
  overheads() {
    const s = S();
    const live = s.projects.filter((p) => ['Active', 'Defects Liability'].includes(p.status)).map((p) => ({ p, c: Calc.project(p) }));
    const basis = s.overheads.basis;
    const w = (x) => (basis === 'revenue' ? x.c.earned : basis === 'cost' ? x.c.actual : 1);
    const tot = live.reduce((a, x) => a + w(x), 0) || 1;
    const ytd = s.overheads.monthly * 10;
    return `<div class="flex" style="margin-bottom:12px"><span class="muted">Head-office overhead</span><b>${aed(num(s.overheads.monthly))} / month</b>
      <span class="muted">Allocate by</span><select class="inline" data-change="setOhBasis">${options([['revenue', 'Earned revenue'], ['cost', 'Direct cost'], ['equal', 'Equal share']], basis)}</select>
      <button class="btn sm" data-act="editOh">Edit amount</button></div>` +
      card('Overhead allocation (Jan–Oct 2026)', table([
        { h: 'Project', f: (x) => esc(projLabel(x.p.id)), cls: 'wrap' },
        { h: 'Basis', num: true, f: (x) => (basis === 'equal' ? '1' : num(w(x))) },
        { h: 'Share', num: true, f: (x) => pct(w(x) / tot, 1) },
        { h: 'Allocated overhead', num: true, f: (x) => num(ytd * w(x) / tot) },
        { h: 'Gross profit to date', num: true, f: (x) => num(x.c.earned - x.c.actual) },
        { h: 'Net after overhead', num: true, f: (x) => { const v = x.c.earned - x.c.actual - ytd * w(x) / tot; return `<span class="${v >= 0 ? 'pos' : 'neg'}">${num(v)}</span>`; } },
      ], live), { flush: true }) + '<p class="muted small">Shows which projects really make money once office costs (management, estimating, finance, HR, rent) are shared out.</p>';
  },
  currency() {
    const s = S();
    const fxBills = openBills().filter((b) => b.currency && b.currency !== 'AED');
    const rows = fxBills.map((b) => { const cur = b.fxAmount * fx(b.currency); return { b, booked: b.amount + (b.reval || 0), cur, diff: cur - b.amount - (b.reval || 0) }; });
    return `<div class="grid cols-2">` + card('Exchange rates (to AED)', table([
      { h: 'Currency', f: (c) => `<b>${c.code}</b> ${c.name}` },
      { h: 'Rate', num: true, f: (c) => num(c.rate, 4) },
      { h: '', f: (c) => (c.code === 'AED' ? '<span class="muted small">base</span>' : `<button class="btn sm" data-act="editRate" data-c="${c.code}">Update</button>`) },
    ], s.currencies), { flush: true }) +
      card('Unrealised FX on open foreign-currency bills', table([
        { h: 'Bill', f: (r) => r.b.id },
        { h: 'Supplier', f: (r) => esc(supplierName(r.b.supplier)) },
        { h: 'Amount', num: true, f: (r) => `${r.b.currency} ${num(r.b.fxAmount, 2)}` },
        { h: 'Booked AED', num: true, f: (r) => num(r.booked, 2) },
        { h: 'At today\'s rate', num: true, f: (r) => num(r.cur, 2) },
        { h: 'Gain / (loss)', num: true, f: (r) => `<span class="${r.diff > 0 ? 'neg' : 'pos'}">${num(-r.diff, 2)}</span>` },
      ], rows, { empty: 'No open foreign-currency bills.' }), { flush: true, actions: rows.some((r) => Math.abs(r.diff) >= 1) ? '<button class="btn primary sm" data-act="revalue">Post revaluation</button>' : '' }) + '</div>' +
      '<p class="muted small">Purchase orders can be raised in any listed currency; bills convert to AED at the rate on the day and are revalued at month end.</p>';
  },
});
Actions.setOhBasis = (v) => { S().overheads.basis = v; commit(); };
Actions.editOh = () => openModal('Head-office overhead', [{ name: 'monthly', label: 'Monthly overhead (AED)', type: 'number', value: S().overheads.monthly }], (x) => { S().overheads.monthly = x.monthly; });
Actions.editRate = (d) => { const c = S().currencies.find((x) => x.code === d.c); openModal(`${c.code} rate`, [{ name: 'rate', label: `AED per 1 ${c.code}`, type: 'number', step: 'any', value: c.rate }], (x) => { c.rate = x.rate; }); };
Actions.revalue = () => {
  openBills().filter((b) => b.currency && b.currency !== 'AED').forEach((b) => { b.reval = Math.round((b.fxAmount * fx(b.currency) - b.amount) * 100) / 100; b.revalDate = today(); });
  commit('FX revaluation posted');
};

// ---------------- Taxes: corporate tax ----------------
Object.assign(Pages.vat, {
  ctBar() {
    return `<div class="flex" style="margin-bottom:16px"><span class="muted">Tax</span>${['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'].map((x) => `<a class="btn sm" href="#/vat/${x}">VAT ${x.replace('-', ' ')}</a>`).join('')}<a class="btn sm primary" href="#/vat/ct">Corporate tax</a></div>`;
  },
  ct() {
    const p = Ledger.pnl('ALL', Ledger.yearStart, today());
    const months = +today().slice(5, 7) - 1 + (+today().slice(8) / 30);
    const annual = p.net / Math.max(1, months) * 12;
    const threshold = 375000, rate = 0.09;
    const ct = Math.max(0, annual - threshold) * rate;
    return `<div class="grid kpis">${kpi('Group net profit YTD', aed(short(p.net)))}${kpi('Projected full-year profit', aed(short(annual)), `straight-line from ${months.toFixed(1)} months`)}${kpi('Estimated corporate tax', `<span class="neg">${aed(num(ct))}</span>`, '9% above AED 375,000')}${kpi('Set aside per month', aed(num(ct / 12)))}</div>
      <div class="mt">` + card('Corporate tax estimate — FY 2026', `<div class="table-wrap"><table><tbody>
        <tr><td>Accounting profit YTD (consolidated, intercompany eliminated)</td><td class="num">${num(p.net, 2)}</td></tr>
        <tr><td>Projected accounting profit for the year</td><td class="num">${num(annual, 2)}</td></tr>
        <tr><td>Less: 0% band</td><td class="num">(${num(Math.min(threshold, Math.max(0, annual)), 2)})</td></tr>
        <tr><td>Taxable at 9%</td><td class="num">${num(Math.max(0, annual - threshold), 2)}</td></tr>
        <tr class="total"><td>Estimated corporate tax</td><td class="num">${num(ct, 2)}</td></tr></tbody></table></div>
        <p class="muted small" style="padding:0 16px 12px">Estimate only, before adjustments such as disallowed expenses, exempt income, tax-group elections and losses brought forward. Confirm with your tax adviser.</p>`, { flush: true }) + '</div>';
  },
});

// ---------------- Settings: companies, currencies, access, notifications ----------------
const ROLE_ACCESS = {
  Administrator: '*',
  Finance: ['dashboard', 'approvals', 'accounting', 'finance', 'vat', 'sales', 'subcontracts', 'contracts', 'procurement', 'notifications', 'assistant', 'settings'],
  'Project Manager': ['dashboard', 'approvals', 'projects', 'equipment', 'production', 'quality', 'subcontracts', 'contracts', 'procurement', 'warehouse', 'sales', 'site', 'notifications', 'assistant'],
  Procurement: ['dashboard', 'approvals', 'procurement', 'warehouse', 'subcontracts', 'notifications', 'assistant'],
  HR: ['dashboard', 'approvals', 'hr', 'notifications', 'assistant'],
  Storekeeper: ['warehouse', 'production', 'site', 'notifications', 'assistant'],
  'Site Engineer': ['site', 'projects', 'quality', 'equipment', 'notifications', 'assistant'],
};
const currentUser = () => S().users.find((u) => u.email === S().currentUser) || S().users[0];
const canSee = (page) => { const a = ROLE_ACCESS[currentUser().role]; return a === '*' || !a || a.includes(page); };
const APPROVER = { requisitions: ['Project Manager', 'Administrator'], pos: ['Procurement', 'Finance', 'Administrator'], leaves: ['HR', 'Administrator'], eqRequests: ['Project Manager', 'Administrator'] };
const canApprove = (coll) => { const r = currentUser().role; return r === 'Administrator' || (APPROVER[coll] || []).includes(r); };

const baseSettings = Pages.settings.render;
Pages.settings.render = function () {
  const s = S();
  const p = s.notifPrefs;
  const mods = ['dashboard', 'approvals', 'projects', 'site', 'equipment', 'production', 'quality', 'procurement', 'warehouse', 'subcontracts', 'contracts', 'crm', 'sales', 'finance', 'accounting', 'vat', 'hr', 'settings'];
  return baseSettings.call(this) + `<div class="grid cols-2 mt">
    ${card('Companies (multi-company)', table([
      { h: 'Code', f: (c) => c.id }, { h: 'Company', f: (c) => esc(c.name) }, { h: 'TRN', f: (c) => c.trn }, { h: 'Role', f: (c) => esc(c.role), cls: 'wrap' },
    ], s.companies), { flush: true })}
    ${card('Notifications', `${[['inApp', 'In-app alerts'], ['email', 'Email (digest + approvals)'], ['mobile', 'Mobile push (site app)']].map(([k, l]) => `<label class="flex" style="padding:6px 0"><input type="checkbox" style="width:auto" data-change="notifPref" data-k="${k}" ${p[k] ? 'checked' : ''}> ${l}</label>`).join('')}
      <div class="muted small mt">Digest schedule: ${esc(p.digest)}. Alerts cover approvals, overdue invoices and bills, low stock, expiring bonds, permits and staff documents, failed tests, open NCRs, plant service and delay exposure.</div>`)}
    </div><div class="mt">` + card('Role access matrix', `<div class="table-wrap"><table><thead><tr><th>Module</th>${Object.keys(ROLE_ACCESS).map((r) => `<th class="num">${r}</th>`).join('')}</tr></thead><tbody>
      ${mods.map((m) => `<tr><td>${m}</td>${Object.keys(ROLE_ACCESS).map((r) => `<td class="num">${ROLE_ACCESS[r] === '*' || ROLE_ACCESS[r].includes(m) ? '<span class="pos">✓</span>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>`, { flush: true }) + '<p class="muted small">Switch the signed-in user from the top-right menu to see the system as that role. In this demo, roles control what is visible; a hosted version would enforce them on the server with real logins.</p></div>';
};
Actions.notifPref = (v, d, el) => { S().notifPrefs[d.k] = el.checked; commit(); };
