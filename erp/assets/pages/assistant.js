// ---------------- Notifications ----------------
const Notify = {
  list() {
    const s = S(), out = [];
    const addN = (key, sev, text, link) => out.push({ key, sev, text, link });
    const n = pendingApprovals();
    if (n) addN('appr-' + n, 'warn', `${n} item(s) waiting for your approval`, '#/approvals');
    s.invoices.forEach((i) => { const x = Calc.invoice(i); if (x.open >= 1 && x.overdue > 0) addN('inv-' + i.id, 'bad', `Invoice ${i.id} (${i.client}) overdue ${x.overdue} days — ${aed(num(x.open))}`, '#/sales/invoices'); });
    openBills().forEach((b) => { if (b.due < today()) addN('bill-' + b.id, 'bad', `Supplier bill ${b.id} overdue — ${aed(num(b.amount))}`, '#/finance/payables'); });
    s.items.forEach((i) => { if (Calc.stockQty(i.id) < i.reorder) addN('stk-' + i.id, 'warn', `${i.name} below reorder level (${num(Calc.stockQty(i.id))} ${i.unit})`, '#/warehouse'); });
    s.bonds.filter((b) => b.status === 'Active' && daysTo(b.expiry) <= 60).forEach((b) => addN('bond-' + b.id + b.expiry, daysTo(b.expiry) < 0 ? 'bad' : 'warn', `${b.type} ${b.id} (${b.project}) expires ${fdate(b.expiry)}`, '#/contracts/bonds'));
    s.permits.filter((p) => p.status === 'Active' && daysTo(p.expiry) <= 30).forEach((p) => addN('pmt-' + p.id + p.expiry, daysTo(p.expiry) < 0 ? 'bad' : 'warn', `${p.type} permit (${p.project}) ${daysTo(p.expiry) < 0 ? 'EXPIRED' : 'expires'} ${fdate(p.expiry)}`, '#/contracts/permits'));
    const docF = [['visaExpiry', 'Visa'], ['eidExpiry', 'Emirates ID'], ['passportExpiry', 'Passport'], ['labourCardExpiry', 'Labour card'], ['licenceExpiry', 'Driving / plant licence']];
    s.employees.forEach((e) => docF.forEach(([f, l]) => { if (e[f] && daysTo(e[f]) <= 60) addN(`doc-${e.id}-${f}-${e[f]}`, daysTo(e[f]) < 0 ? 'bad' : 'warn', `${l} of ${e.name} ${daysTo(e[f]) < 0 ? 'expired' : 'expires'} ${fdate(e[f])}`, '#/hr/documents'); }));
    s.rfis.filter((r) => r.status === 'Open' && daysTo(r.due) <= 3).forEach((r) => addN('rfi-' + r.id, daysTo(r.due) < 0 ? 'bad' : 'warn', `RFI ${r.id} response due ${fdate(r.due)}`, `#/projects/${r.project}/reports`));
    s.ncrs.filter((x) => x.status === 'Open').forEach((x) => addN('ncr-' + x.id, 'warn', `Open NCR ${x.id}: ${x.desc}`, '#/quality/ncr'));
    s.labTests.filter((t) => !t.pass && daysTo(t.date) >= -7).forEach((t) => addN('test-' + t.id, 'bad', `Failed test ${t.id} (${t.type}) at ${t.location}`, '#/quality/tests'));
    s.equipment.filter((e) => e.nextService && e.meter >= e.nextService - 50).forEach((e) => addN(`svc-${e.id}-${e.nextService}`, e.meter >= e.nextService ? 'bad' : 'warn', `${e.name} service ${e.meter >= e.nextService ? 'overdue' : 'due'} (${num(e.meter)} / ${num(e.nextService)} h)`, '#/equipment/maintenance'));
    s.projects.filter((p) => p.status === 'Active').forEach((p) => { const x = Calc.ld(p); if (x.exposure) addN('ld-' + p.id + x.net, 'bad', `${p.id} forecast ${x.net} days late — LD exposure ${aed(short(x.exposure))}`, '#/contracts/claims'); });
    s.milestones.filter((m) => m.status === 'Planned' && daysTo(m.due) <= 7).forEach((m) => addN('ms-' + m.id, 'info', `Milestone due ${fdate(m.due)}: ${m.desc} (${m.project})`, '#/sales/milestones'));
    if (!s.payrollRuns.includes(today().slice(0, 7)) && +today().slice(8) >= 20) addN('pr-' + today().slice(0, 7), 'info', `Payroll for ${today().slice(0, 7)} not posted yet`, '#/hr/payroll');
    return out;
  },
  unread() { const r = new Set(S().readNotifs); return this.list().filter((n) => !r.has(n.key)); },
};

Pages.notifications = {
  title: 'Notifications',
  render() {
    const read = new Set(S().readNotifs);
    const list = Notify.list();
    const p = S().notifPrefs;
    return `<div class="head-row"><div class="muted">${list.length} alerts · ${Notify.unread().length} unread · channels: ${['inApp', 'email', 'mobile'].filter((k) => p[k]).map((k) => ({ inApp: 'in-app', email: 'email', mobile: 'mobile push' }[k])).join(', ')}</div>
      <div class="btn-row"><button class="btn" data-act="emailDigest">Email digest</button><button class="btn primary" data-act="markRead">Mark all read</button></div></div>` +
      card('', list.length ? list.map((n) => `<a href="${n.link}" class="flex" style="padding:10px 16px;border-bottom:1px solid var(--line);color:var(--ink);${read.has(n.key) ? 'opacity:.55' : ''}">
        <span class="badge b-${n.sev}">${{ bad: 'Urgent', warn: 'Soon', info: 'Info' }[n.sev]}</span><span>${esc(n.text)}</span><span class="spacer"></span><span class="muted small">Open →</span></a>`).join('') : '<div class="empty">No alerts.</div>', { flush: true });
  },
};
Actions.markRead = () => { S().readNotifs = Notify.list().map((n) => n.key); commit('All marked read'); };
Actions.emailDigest = () => {
  const me = currentUser();
  const body = Notify.list().map((n) => `• ${n.text}`).join('\n');
  location.href = `mailto:${encodeURIComponent(me.email)}?subject=${encodeURIComponent('JRC ERP – daily alerts ' + today())}&body=${encodeURIComponent(body)}`;
};

// ---------------- Assistant ----------------
const HELP = [
  [/ipc|payment cert|certificate|bill.*client/, 'Create a payment certificate', 'Update BOQ done quantities (Projects → BOQ & progress), then Sales & Billing → Progress billing → “New IPC from progress”. Submit it, then “Certified → invoice” issues the tax invoice.', '#/sales/billing'],
  [/wps|salary|payroll|sif/, 'Run payroll and the WPS file', 'HR & Payroll → Timesheets to check hours, then Payroll & WPS → “Post payroll” and “Generate WPS SIF file”. Upload the file to your WPS agent bank.', '#/hr/payroll'],
  [/requisition|order material|buy|purchase/, 'Order material', 'Procurement → Requisitions → “+ Requisition”. After approval choose “Send RFQ” (compare 3 quotes) or “Direct PO”. Receive it with “Receive (GRN)”.', '#/procurement'],
  [/chainage|section|layer|km/, 'Record completed road sections', 'Open the project → Chainage tab → “Record section”. Pick the layer and from/to chainage; the BOQ quantity is updated automatically.', '#/projects/P-2401/chainage'],
  [/asphalt|plant|production|mix/, 'Produce asphalt', 'Asphalt Plant → “+ Production order”, then “Produce” consumes aggregates, sand, filler and bitumen from the Main Yard. Add delivery tickets per truck.', '#/production'],
  [/vat|tax return|corporate tax/, 'VAT and corporate tax', 'Taxes → pick the quarter for the VAT return summary; the Corporate tax tab estimates tax on the year\'s profit.', '#/vat'],
  [/approve|approval/, 'Approve things', 'Click Approvals at the top right. Requisitions, POs, leave and equipment requests waiting for your role are listed there.', '#/approvals'],
  [/backup|export|import|reset/, 'Back up or restore data', 'Settings → Export backup (JSON) / Import backup / Reset demo data.', '#/settings'],
  [/role|user|access|permission|login/, 'Users and access', 'Switch user from the menu at the top right. Settings → Users & roles shows what each role can open.', '#/settings'],
];

Pages.assistant = {
  title: 'Assistant',
  render(args) {
    const q = (args[0] || '').trim();
    return `<form class="flex" onsubmit="event.preventDefault();location.hash='#/assistant/'+encodeURIComponent(this.q.value)">
        <input name="q" value="${esc(q)}" placeholder="Ask about your data, e.g. “overdue invoices”, “P-2401”, “bitumen stock”, “expiring visas”, “how do I run WPS”" style="flex:1;min-width:240px">
        <button class="btn primary">Ask</button></form>
      <div class="muted small" style="margin:6px 0 16px">Answers come from the data in this ERP. Try: ${['cash position', 'overdue invoices', 'low stock', 'expiring documents', 'P-2401', 'LD exposure', 'how do I create an IPC'].map((x) => `<a href="#/assistant/${encodeURIComponent(x)}">${x}</a>`).join(' · ')}</div>` +
      (q ? this.answer(q) : '');
  },
  answer(q) {
    const s = S(), t = q.toLowerCase();
    const blocks = [];
    const say = (title, body, link) => blocks.push(card(title, body + (link ? `<div class="mt"><a class="btn sm" href="${link}">Open</a></div>` : '')));
    if (/how|where|what is|create|make|run|record|add/.test(t)) HELP.filter(([re]) => re.test(t)).forEach(([, title, body, link]) => say(title, `<p>${body}</p>`, link));
    if (/cash|bank|balance/.test(t)) say('Cash position', table([{ h: 'Account', f: (b) => esc(b.name) }, { h: 'Co.', f: (b) => b.entity }, { h: 'Balance', num: true, f: (b) => aed(num(b.balance)) }], s.bank) + `<p class="strong">Total ${aed(num(s.bank.reduce((a, b) => a + b.balance, 0)))}</p>`, '#/finance');
    if (/overdue|receivable|owe|unpaid|debtor/.test(t)) {
      const od = s.invoices.map((i) => ({ i, x: Calc.invoice(i) })).filter((r) => r.x.open >= 1);
      say('Unpaid invoices', table([{ h: 'Invoice', f: (r) => r.i.id }, { h: 'Client', f: (r) => esc(r.i.client) }, { h: 'Outstanding', num: true, f: (r) => num(r.x.open) }, { h: 'Overdue', num: true, f: (r) => (r.x.overdue > 0 ? `<span class="neg">${r.x.overdue} d</span>` : 'not due') }], od), '#/finance/receivables');
    }
    if (/payable|supplier.*pay|creditor/.test(t)) say('Open supplier bills', table([{ h: 'Bill', f: (b) => b.id }, { h: 'Supplier', f: (b) => esc(supplierName(b.supplier)) }, { h: 'Due', f: (b) => fdate(b.due) }, { h: 'Amount', num: true, f: (b) => num(b.amount) }], openBills()), '#/finance/payables');
    if (/stock|inventory|reorder/.test(t)) {
      const hit = s.items.filter((i) => t.includes(i.name.toLowerCase().split(' ')[0]) || t.includes(i.code.toLowerCase()));
      const list = hit.length ? hit : /low|reorder/.test(t) ? s.items.filter((i) => Calc.stockQty(i.id) < i.reorder) : s.items;
      say(hit.length ? 'Stock' : /low|reorder/.test(t) ? 'Items below reorder level' : 'Stock on hand', table([{ h: 'Item', f: (i) => esc(i.name) }, { h: 'On hand', num: true, f: (i) => `${num(Calc.stockQty(i.id))} ${i.unit}` }, { h: 'Reorder at', num: true, f: (i) => num(i.reorder) }], list, { empty: 'All items are above reorder level.' }), '#/warehouse');
    }
    if (/expir|renew|visa|passport|emirates id|permit|bond|guarantee|noc/.test(t)) {
      const al = Notify.list().filter((n) => /^(doc|bond|pmt)-/.test(n.key));
      say('Expiring documents, permits and guarantees', al.length ? al.map((n) => `<div style="padding:4px 0"><span class="badge b-${n.sev}">${n.sev === 'bad' ? 'Expired' : 'Soon'}</span> <a href="${n.link}">${esc(n.text)}</a></div>`).join('') : 'Nothing expires in the next 60 days.');
    }
    if (/\bld\b|liquidated|delay|late|eot/.test(t)) say('Delay exposure', table([{ h: 'Project', f: (p) => p.id }, { h: 'Net days late', num: true, f: (p) => Calc.ld(p).net }, { h: 'LD exposure', num: true, f: (p) => num(Calc.ld(p).exposure) }], s.projects.filter((p) => p.status === 'Active')), '#/contracts/claims');
    if (/vat/.test(t)) say('VAT', '<p>See the quarterly VAT return summary (output tax, recoverable input tax and net payable).</p>', '#/vat');
    if (/profit|p&l|margin|revenue/.test(t)) { const p = Ledger.pnl('ALL', Ledger.yearStart, today()); say('Group profit year to date', `<p>Revenue ${aed(num(p.revenue))} · Gross profit ${aed(num(p.gross))} · Net profit ${aed(num(p.net))}</p>`, '#/accounting/pnl'); }
    // entity lookups
    s.projects.filter((p) => t.includes(p.id.toLowerCase()) || (t.length > 4 && p.name.toLowerCase().includes(t))).forEach((p) => {
      const c = Calc.project(p);
      say(`${p.id} · ${esc(p.name)}`, `<p>${esc(p.client)} · ${badge(p.status)} · PM ${esc(p.manager)}</p><p>Contract ${aed(num(c.revised))} · ${pct(c.progress)} complete · cost to date ${aed(num(c.actual))} · forecast margin ${pct(c.forecastMargin, 1)} · completion ${fdate(p.end)} (forecast ${fdate(p.forecastEnd)})</p>
        <p>Open RFIs ${s.rfis.filter((r) => r.project === p.id && r.status === 'Open').length} · open NCRs ${s.ncrs.filter((r) => r.project === p.id && r.status === 'Open').length} · plant on site ${s.bookings.filter((b) => b.project === p.id && b.from <= today() && b.to >= today()).length}</p>`, `#/projects/${p.id}`);
    });
    s.employees.filter((e) => t.length > 3 && e.name.toLowerCase().includes(t)).forEach((e) => say(esc(e.name), `<p>${esc(e.role)} · ${esc(e.dept)} · ${e.project || 'Head office'} · joined ${fdate(e.joined)}</p><p>Leave balance ${num(e.leaveBalance)} days · visa ${expiryBadge(e.visaExpiry)} · Emirates ID ${expiryBadge(e.eidExpiry)}</p>`, '#/hr'));
    s.suppliers.filter((x) => t.length > 3 && x.name.toLowerCase().includes(t)).forEach((x) => say(esc(x.name), `<p>${esc(x.category)} · terms ${x.terms} · rating ${x.rating}</p><p>Open POs ${s.pos.filter((p) => p.supplier === x.id && p.status !== 'Received').length} · owed ${aed(num(openBills().filter((b) => b.supplier === x.id).reduce((a, b) => a + b.amount, 0)))}</p>`, '#/procurement/suppliers'));
    if (!blocks.length) {
      const hits = this.search(t);
      blocks.push(card(`Search results for “${esc(q)}”`, hits.length ? hits.slice(0, 30).map((h) => `<div style="padding:5px 0"><span class="badge b-muted">${h.kind}</span> <a href="${h.link}">${esc(h.text)}</a></div>`).join('') : '<p>No matching records. Try a project number, a person, a supplier, or words like “overdue”, “stock”, “expiring”.</p>'));
    }
    return blocks.join('<div class="mt"></div>');
  },
  search(t) {
    const s = S(), hits = [];
    const scan = (kind, list, text, link) => list.forEach((x) => { const v = text(x); if (v.toLowerCase().includes(t)) hits.push({ kind, text: v, link: link(x) }); });
    scan('Project', s.projects, (p) => `${p.id} ${p.name} – ${p.client}`, (p) => `#/projects/${p.id}`);
    scan('BOQ', s.projects.flatMap((p) => p.boq.map((b) => ({ ...b, p: p.id }))), (b) => `${b.p} ${b.code} ${b.desc}`, (b) => `#/projects/${b.p}/boq`);
    scan('Invoice', s.invoices, (i) => `${i.id} ${i.client}`, () => '#/sales/invoices');
    scan('PO', s.pos, (p) => `${p.id} ${supplierName(p.supplier)} ${item(p.item).name}`, () => '#/procurement/orders');
    scan('Item', s.items, (i) => `${i.code} ${i.name}`, () => '#/warehouse');
    scan('Document', s.documents, (d) => `${d.ref} ${d.title}`, (d) => `#/projects/${d.project}/documents`);
    scan('RFI', s.rfis, (r) => `${r.id} ${r.subject}`, (r) => `#/projects/${r.project}/reports`);
    scan('NCR', s.ncrs, (r) => `${r.id} ${r.desc}`, () => '#/quality/ncr');
    scan('Permit', s.permits, (r) => `${r.id} ${r.authority} ${r.type}`, () => '#/contracts/permits');
    scan('Employee', s.employees, (e) => `${e.id} ${e.name} ${e.role}`, () => '#/hr');
    scan('Equipment', s.equipment, (e) => `${e.id} ${e.name}`, () => '#/equipment');
    scan('Subcontract', s.subcontracts, (x) => `${x.id} ${x.sub} ${x.scope}`, () => '#/subcontracts');
    return hits;
  },
};

// ---------------- Site app (phone-friendly) ----------------
Pages.site = {
  title: 'Site app',
  project: null,
  render() {
    const mine = S().projects.filter((p) => p.status === 'Active');
    const pid = this.project || mine[0]?.id;
    const p = project(pid);
    const c = Calc.project(p);
    const tile = (act, icon, label, extra = '') => `<button class="card" style="padding:18px 12px;text-align:center;cursor:pointer;font:inherit;color:var(--ink)" data-act="${act}" data-p="${pid}" ${extra}><div style="font-size:26px">${icon}</div><div class="strong" style="margin-top:6px">${label}</div></button>`;
    return `<div style="max-width:560px;margin:0 auto">
      <label class="field"><span>Project</span><select data-change="siteProject">${projOptions(pid, (x) => x.status === 'Active')}</select></label>
      <div class="card kpi"><div class="lbl">${esc(p.name)}</div><div class="val">${pct(c.progress)} complete</div>${bar(c.progress)}
        <div class="sub mt">${S().reports.filter((r) => r.project === pid && r.date === today()).length ? '✓ Daily report submitted today' : '<span class="neg">Daily report not yet submitted today</span>'}</div></div>
      <div class="grid mt" style="grid-template-columns:1fr 1fr">
        ${tile('addReport', '📝', 'Daily report')}${tile('addChainage', '🛣️', 'Completed section')}
        ${tile('newPlantLog', '🚜', 'Plant hours & fuel')}${tile('siteReq', '📦', 'Request material')}
        ${tile('newIr', '🔍', 'Inspection request')}${tile('newIncident', '⚠️', 'Report incident')}
        ${tile('sitePhoto', '📷', 'Site photo')}${tile('addRfi', '❓', 'Raise RFI')}
      </div>
      <p class="muted small mt">Designed for phones on site. Add this page to your home screen: browser menu → “Add to Home screen”.</p></div>`;
  },
};
Actions.siteProject = (v) => { Pages.site.project = v; render(); };
Actions.siteReq = (d) => openModal('Request material', [
  { name: 'item', label: 'Item', type: 'select', options: options(S().items.map((i) => [i.id, `${i.name} (${i.unit})`])) },
  { name: 'qty', label: 'Quantity', type: 'number', step: 'any' },
  { name: 'need', label: 'Needed by', type: 'date', value: addDays(today(), 5) },
  { name: 'note', label: 'Purpose', full: true, required: false },
], (x) => { S().requisitions.unshift({ id: nextId('MR'), date: today(), project: d.p, by: currentUser().name, status: 'Pending', ...x }); });
Actions.sitePhoto = (d) => {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    S().documents.unshift({ id: nextId('DOC'), project: d.p, type: 'Site photo', ref: f.name, title: `Site photo ${today()}`, rev: '-', date: today(), status: 'Info', file: `${f.name} (${Math.round(f.size / 1024)} KB)` });
    commit('Photo logged in project documents');
  };
  inp.click();
};
