Calc.subcert = (sc, c) => {
  const prev = sc.certs.filter((x) => x.no < c.no).sort((a, b) => b.no - a.no)[0];
  const prevCum = prev ? prev.cumWork : c.prevCum || 0;
  const thisWork = c.cumWork - prevCum;
  const retention = thisWork * sc.retPct / 100;
  const backcharge = c.backcharge || 0;
  const net = thisWork - retention - backcharge;
  const vat = net * S().company.vatRate / 100;
  return { prevCum, thisWork, retention, backcharge, net, vat, total: net + vat };
};

Pages.subcontracts = {
  title: 'Subcontractors',
  render(args) {
    const tab = args[0] || 'contracts';
    return tabs('subcontracts', [['contracts', 'Subcontracts'], ['certs', 'Payment certificates'], ['backcharges', 'Back-charges']], tab) + (this[tab] || this.contracts).call(this);
  },
  contracts() {
    const scs = S().subcontracts;
    const cum = (sc) => Math.max(0, ...sc.certs.filter((c) => c.status !== 'Draft').map((c) => c.cumWork));
    const ret = (sc) => cum(sc) * sc.retPct / 100;
    return `<div class="grid kpis">${kpi('Subcontracts', scs.length)}${kpi('Committed value', aed(short(scs.reduce((a, s) => a + s.value, 0))))}${kpi('Certified to date', aed(short(scs.reduce((a, s) => a + cum(s), 0))))}${kpi('Retention held', aed(short(scs.reduce((a, s) => a + ret(s), 0))), 'Payable at end of their DLP')}</div><div class="mt">` +
      card('Subcontract register', table([
        { h: 'Ref', f: (s) => s.id },
        { h: 'Subcontractor', f: (s) => `<span class="strong">${esc(s.sub)}</span>`, cls: 'wrap' },
        { h: 'Project', f: (s) => s.project },
        { h: 'Scope', f: (s) => esc(s.scope), cls: 'wrap' },
        { h: 'Value', num: true, f: (s) => num(s.value) },
        { h: 'Certified', num: true, f: (s) => num(cum(s)) },
        { h: 'Progress', f: (s) => `<div class="flex">${bar(cum(s) / s.value)}<span class="small">${pct(cum(s) / s.value)}</span></div>` },
        { h: 'Retention', num: true, f: (s) => `${s.retPct}% · ${num(ret(s))}` },
        { h: '', f: (s) => `<button class="btn sm" data-act="newSubCert" data-id="${s.id}">+ Certificate</button>` },
      ], scs), { flush: true, actions: '<button class="btn primary sm" data-act="newSubcontract">+ Subcontract</button>' }) + '</div>';
  },
  certs() {
    const rows = S().subcontracts.flatMap((sc) => sc.certs.map((c) => ({ sc, c, x: Calc.subcert(sc, c) }))).sort((a, b) => b.c.date.localeCompare(a.c.date));
    return '<div class="note">Subcontractor certificate = work this period − retention − back-charges, plus 5% VAT. Approving a certificate creates a payable and posts subcontract cost to the project.</div><div class="mt">' +
      card('Subcontractor payment certificates', table([
        { h: 'Cert', f: (r) => `${r.sc.id} #${r.c.no}` },
        { h: 'Subcontractor', f: (r) => esc(r.sc.sub), cls: 'wrap' },
        { h: 'Project', f: (r) => r.sc.project },
        { h: 'Date', f: (r) => fdate(r.c.date) },
        { h: 'Cumulative', num: true, f: (r) => num(r.c.cumWork) },
        { h: 'This period', num: true, f: (r) => num(r.x.thisWork) },
        { h: 'Retention', num: true, f: (r) => `(${num(r.x.retention)})` },
        { h: 'Back-charges', num: true, f: (r) => (r.x.backcharge ? `(${num(r.x.backcharge)})` : '—') },
        { h: 'Net + VAT', num: true, f: (r) => `<b>${num(r.x.total)}</b>` },
        { h: 'Status', f: (r) => badge(r.c.status) },
        { h: '', f: (r) => (r.c.status === 'Submitted' ? `<button class="btn sm primary" data-act="approveSubCert" data-id="${r.sc.id}" data-no="${r.c.no}">Approve → payable</button>` : '') },
      ], rows), { flush: true }) + '</div>';
  },
  backcharges() {
    return card('Back-charges to subcontractors', table([
      { h: 'Ref', f: (b) => b.id },
      { h: 'Subcontract', f: (b) => { const sc = S().subcontracts.find((x) => x.id === b.sc); return `${b.sc} · ${esc(sc?.sub || '')}`; }, cls: 'wrap' },
      { h: 'Date', f: (b) => fdate(b.date) },
      { h: 'Description', f: (b) => esc(b.desc), cls: 'wrap' },
      { h: 'Amount', num: true, f: (b) => num(b.amount) },
    ], S().backcharges), { flush: true, actions: '<button class="btn primary sm" data-act="newBackcharge">+ Back-charge</button>' }) +
      '<p class="muted small">Back-charges are deducted on the subcontractor\'s next payment certificate.</p>';
  },
};

const scOptions = () => options(S().subcontracts.map((s) => [s.id, `${s.id} · ${s.sub}`]));
Actions.newSubcontract = () => openModal('New subcontract', [
  { name: 'sub', label: 'Subcontractor', full: true },
  { name: 'project', label: 'Project', type: 'select', options: projOptions('', (p) => p.status === 'Active'), full: true },
  { name: 'scope', label: 'Scope', full: true },
  { name: 'value', label: 'Subcontract value (AED)', type: 'number' },
  { name: 'retPct', label: 'Retention %', type: 'number', value: 10 },
], (x) => { S().subcontracts.push({ id: 'SC-' + String(S().subcontracts.length + 1).padStart(2, '0'), ...x, certs: [] }); });
Actions.newSubCert = (d) => {
  const sc = S().subcontracts.find((x) => x.id === d.id);
  const last = sc.certs.slice().sort((a, b) => b.no - a.no)[0];
  const pendingBc = S().backcharges.filter((b) => b.sc === sc.id && !b.applied).reduce((a, b) => a + b.amount, 0);
  openModal(`New certificate — ${sc.sub}`, [
    { name: 'cumWork', label: 'Cumulative work done to date (AED)', type: 'number', value: last ? last.cumWork : 0 },
    { name: 'backcharge', label: 'Back-charges to deduct (AED)', type: 'number', value: pendingBc },
  ], (x) => {
    if (last && x.cumWork <= last.cumWork) { alert(`Must exceed previous cumulative ${num(last.cumWork)}.`); return false; }
    if (x.cumWork > sc.value * 1.1) { alert('Cumulative work exceeds subcontract value by more than 10% — raise a variation first.'); return false; }
    sc.certs.push({ no: last ? last.no + 1 : 1, date: today(), cumWork: x.cumWork, backcharge: x.backcharge, status: 'Submitted' });
    S().backcharges.filter((b) => b.sc === sc.id).forEach((b) => { b.applied = true; });
  }, { submit: 'Submit certificate' });
};
Actions.approveSubCert = (d) => {
  const sc = S().subcontracts.find((x) => x.id === d.id);
  const c = sc.certs.find((x) => x.no === Number(d.no));
  const x = Calc.subcert(sc, c);
  c.status = 'Approved';
  S().payables.unshift({ id: nextId('SUB'), supplier: sc.sub, ref: `${sc.id} cert ${c.no}`, date: today(), due: addDays(today(), 30), amount: Math.round(x.total), acc: '2050', paid: false, currency: 'AED', source: 'subcert' });
  commit('Certificate approved — payable created');
};
Actions.newBackcharge = () => openModal('Back-charge', [
  { name: 'sc', label: 'Subcontract', type: 'select', options: scOptions(), full: true },
  { name: 'desc', label: 'Reason', full: true },
  { name: 'amount', label: 'Amount (AED)', type: 'number' },
], (x) => { S().backcharges.unshift({ id: nextId('BC'), date: today(), ...x }); });
