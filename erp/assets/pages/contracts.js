Calc.ld = (p) => {
  const late = Math.max(0, days(p.end, p.forecastEnd || p.end));
  const granted = S().claims.filter((c) => c.project === p.id && c.type === 'Extension of time').reduce((a, c) => a + (c.daysGranted || 0), 0);
  const net = Math.max(0, late - granted);
  const cap = Calc.project(p).revised * 0.1;
  return { late, granted, net, exposure: Math.min(cap, net * (p.ldPerDay || 0)), cap };
};
Calc.escalation = (e) => {
  const change = (e.current - e.base) / e.base;
  const over = Math.abs(change) > e.threshold / 100 ? Math.sign(change) * (Math.abs(change) - e.threshold / 100) : 0;
  return { change, amount: over * e.base * e.qty };
};

Pages.contracts = {
  title: 'Contracts & Compliance',
  render(args) {
    const tab = args[0] || 'bonds';
    return tabs('contracts', [['bonds', 'Bonds & guarantees'], ['permits', 'Permits & NOCs'], ['claims', 'Claims, EOT & LDs'], ['escalation', 'Price escalation']], tab) + (this[tab] || this.bonds).call(this);
  },
  bonds() {
    const b = S().bonds;
    const act = b.filter((x) => x.status === 'Active');
    return `<div class="grid kpis">${kpi('Active guarantees', act.length)}${kpi('Total exposure', aed(short(act.reduce((a, x) => a + x.amount, 0))), 'Counts against bank facility')}${kpi('Expiring in 60 days', `<span class="${act.some((x) => daysTo(x.expiry) <= 60) ? 'neg' : ''}">${act.filter((x) => daysTo(x.expiry) <= 60).length}</span>`)}</div><div class="mt">` +
      card('Bonds & bank guarantees', table([
        { h: 'Ref', f: (x) => x.id },
        { h: 'Type', f: (x) => esc(x.type) },
        { h: 'Project', f: (x) => x.project },
        { h: 'Bank', f: (x) => esc(x.bank) },
        { h: 'Amount', num: true, f: (x) => num(x.amount) },
        { h: 'Issued', f: (x) => fdate(x.issued) },
        { h: 'Expiry', f: (x) => (x.status === 'Active' ? expiryBadge(x.expiry) : fdate(x.expiry)) },
        { h: 'Status', f: (x) => badge(x.status === 'Active' ? 'Active' : 'Closed') },
        { h: '', f: (x) => (x.status === 'Active' ? `<div class="btn-row"><button class="btn sm" data-act="extendBond" data-id="${x.id}">Extend</button><button class="btn sm" data-act="releaseBond" data-id="${x.id}">Released</button></div>` : '') },
      ], b), { flush: true, actions: '<button class="btn primary sm" data-act="newBond">+ Guarantee</button>' }) + '</div>';
  },
  permits() {
    return card('Permits & no-objection certificates', table([
      { h: 'Ref', f: (x) => x.id },
      { h: 'Project', f: (x) => x.project },
      { h: 'Authority', f: (x) => esc(x.authority), cls: 'wrap' },
      { h: 'Permit', f: (x) => esc(x.type), cls: 'wrap' },
      { h: 'Authority ref.', f: (x) => esc(x.ref) },
      { h: 'Expiry', f: (x) => (x.status === 'Active' ? expiryBadge(x.expiry, 30) : fdate(x.expiry)) },
      { h: '', f: (x) => (x.status === 'Active' ? `<div class="btn-row"><button class="btn sm" data-act="renewPermit" data-id="${x.id}">Renewed</button><button class="btn sm" data-act="closePermit" data-id="${x.id}">Close</button></div>` : badge('Closed')) },
    ], S().permits), { flush: true, actions: '<button class="btn primary sm" data-act="newPermit">+ Permit / NOC</button>' }) +
      '<p class="muted small">Work under an expired permit can stop the site. Permits expiring within 30 days appear in notifications.</p>';
  },
  claims() {
    const lds = S().projects.filter((p) => ['Active', 'Defects Liability'].includes(p.status)).map((p) => ({ p, x: Calc.ld(p) }));
    return card('Delay & liquidated damages exposure', table([
      { h: 'Project', f: (r) => esc(projLabel(r.p.id)), cls: 'wrap' },
      { h: 'Contract completion', f: (r) => fdate(r.p.end) },
      { h: 'Forecast completion', f: (r) => `${fdate(r.p.forecastEnd)} <button class="btn sm" data-act="setForecast" data-id="${r.p.id}">Edit</button>` },
      { h: 'Days late', num: true, f: (r) => r.x.late },
      { h: 'EOT granted', num: true, f: (r) => r.x.granted },
      { h: 'Net delay', num: true, f: (r) => `<span class="${r.x.net ? 'neg strong' : ''}">${r.x.net}</span>` },
      { h: 'LD rate / day', num: true, f: (r) => num(r.p.ldPerDay) },
      { h: 'LD exposure', num: true, f: (r) => `<span class="${r.x.exposure ? 'neg strong' : ''}">${num(r.x.exposure)}</span>` },
    ], lds), { flush: true }) + '<p class="muted small">LDs capped at 10% of revised contract value. Get extensions of time granted to reduce exposure.</p><div class="mt">' +
      card('Claims register', table([
        { h: 'Ref', f: (c) => c.id },
        { h: 'Project', f: (c) => c.project },
        { h: 'Type', f: (c) => c.type },
        { h: 'Event', f: (c) => esc(c.event), cls: 'wrap' },
        { h: 'Notified', f: (c) => fdate(c.notified) },
        { h: 'Days claimed / granted', num: true, f: (c) => (c.daysClaimed ? `${c.daysClaimed} / ${c.daysGranted}` : '—') },
        { h: 'Amount claimed / agreed', num: true, f: (c) => (c.amountClaimed ? `${short(c.amountClaimed)} / ${short(c.amountAgreed)}` : '—') },
        { h: 'Status', f: (c) => `<span class="badge ${c.status === 'Agreed' ? 'b-ok' : c.status === 'Rejected' ? 'b-bad' : 'b-warn'}">${c.status}</span>` },
        { h: '', f: (c) => (c.status === 'Under review' ? `<button class="btn sm" data-act="settleClaim" data-id="${c.id}">Record outcome</button>` : '') },
      ], S().claims), { flush: true, actions: '<button class="btn primary sm" data-act="newClaim">+ Claim / EOT</button>' }) + '</div>';
  },
  escalation() {
    const rows = S().escalation.map((e) => ({ e, x: Calc.escalation(e) }));
    const tot = rows.reduce((a, r) => a + r.x.amount, 0);
    return '<div class="note">Escalation applies only to the part of a price movement beyond the contract threshold (e.g. ±5% of the base price at tender date). Positive = recoverable from client; negative = deduction.</div><div class="mt">' +
      card('Price escalation', table([
        { h: 'Project', f: (r) => r.e.project },
        { h: 'Material', f: (r) => esc(r.e.item) },
        { h: 'Base price', num: true, f: (r) => `${num(r.e.base, 2)} / ${r.e.unit}` },
        { h: 'Current price', num: true, f: (r) => num(r.e.current, 2) },
        { h: 'Change', num: true, f: (r) => `<span class="${r.x.change > 0 ? 'neg' : 'pos'}">${r.x.change > 0 ? '+' : ''}${pct(r.x.change, 1)}</span>` },
        { h: 'Threshold', num: true, f: (r) => `±${r.e.threshold}%` },
        { h: 'Qty used', num: true, f: (r) => num(r.e.qty) },
        { h: 'Escalation (AED)', num: true, f: (r) => `<b class="${r.x.amount >= 0 ? 'pos' : 'neg'}">${num(r.x.amount)}</b>` },
        { h: '', f: (r) => `<button class="btn sm" data-act="editEsc" data-i="${S().escalation.indexOf(r.e)}">Update</button>` },
      ], rows, { foot: `<tr class="total"><td colspan="7">Net escalation</td><td class="num">${num(tot)}</td><td></td></tr>` }), { flush: true }) + '</div>';
  },
};

Actions.newBond = () => openModal('New bond / guarantee', [
  { name: 'type', label: 'Type', type: 'select', options: options(['Tender bond', 'Performance bond', 'Advance payment guarantee', 'Retention bond'].map((x) => [x, x])) },
  { name: 'project', label: 'Project', type: 'select', options: projOptions() },
  { name: 'bank', label: 'Issuing bank', value: 'Bank A' },
  { name: 'amount', label: 'Amount (AED)', type: 'number' },
  { name: 'issued', label: 'Issue date', type: 'date', value: today() },
  { name: 'expiry', label: 'Expiry', type: 'date', value: addDays(today(), 365) },
], (x) => { S().bonds.push({ id: nextId('BG'), ...x, status: 'Active' }); });
Actions.extendBond = (d) => { const b = S().bonds.find((x) => x.id === d.id); openModal(`Extend ${b.id}`, [{ name: 'expiry', label: 'New expiry', type: 'date', value: addDays(b.expiry, 180) }], (x) => { b.expiry = x.expiry; }); };
Actions.releaseBond = (d) => { S().bonds.find((x) => x.id === d.id).status = 'Released'; commit('Guarantee released'); };
Actions.newPermit = (d = {}) => openModal('New permit / NOC', [
  { name: 'project', label: 'Project', type: 'select', options: projOptions(d.p), full: true },
  { name: 'authority', label: 'Authority', full: true },
  { name: 'type', label: 'Permit for', full: true },
  { name: 'ref', label: 'Authority reference' },
  { name: 'issued', label: 'Issued', type: 'date', value: today() },
  { name: 'expiry', label: 'Expiry', type: 'date', value: addDays(today(), 90) },
], (x) => { S().permits.push({ id: nextId('NOC'), ...x, status: 'Active' }); });
Actions.renewPermit = (d) => { const p = S().permits.find((x) => x.id === d.id); openModal(`Renew ${p.id}`, [{ name: 'expiry', label: 'New expiry', type: 'date', value: addDays(today(), 90) }, { name: 'ref', label: 'New reference', value: p.ref }], (x) => Object.assign(p, x)); };
Actions.closePermit = (d) => { S().permits.find((x) => x.id === d.id).status = 'Closed'; commit('Permit closed'); };
Actions.newClaim = () => openModal('New claim / extension of time', [
  { name: 'project', label: 'Project', type: 'select', options: projOptions('', (p) => p.status !== 'Tender'), full: true },
  { name: 'type', label: 'Type', type: 'select', options: options(['Extension of time', 'Cost claim', 'EOT + cost'].map((x) => [x, x])) },
  { name: 'event', label: 'Event / cause', full: true },
  { name: 'daysClaimed', label: 'Days claimed', type: 'number', value: 0 },
  { name: 'amountClaimed', label: 'Amount claimed (AED)', type: 'number', value: 0 },
], (x) => { S().claims.push({ id: nextId('CLM-' + x.project.slice(2)), notified: today(), daysGranted: 0, amountAgreed: 0, status: 'Under review', ...x }); });
Actions.settleClaim = (d) => {
  const c = S().claims.find((x) => x.id === d.id);
  openModal(`Outcome — ${c.id}`, [
    { name: 'daysGranted', label: 'Days granted', type: 'number', value: c.daysClaimed },
    { name: 'amountAgreed', label: 'Amount agreed (AED)', type: 'number', value: c.amountClaimed },
    { name: 'status', label: 'Status', type: 'select', options: options([['Agreed', 'Agreed'], ['Rejected', 'Rejected']]) },
  ], (x) => Object.assign(c, x));
};
Actions.setForecast = (d) => { const p = project(d.id); openModal(`Forecast completion — ${p.id}`, [{ name: 'forecastEnd', label: 'Forecast completion date', type: 'date', value: p.forecastEnd }, { name: 'ldPerDay', label: 'LD rate per day (AED)', type: 'number', value: p.ldPerDay }], (x) => Object.assign(p, x)); };
Actions.editEsc = (d) => { const e = S().escalation[d.i]; openModal(`${e.item} — ${e.project}`, [{ name: 'current', label: `Current price per ${e.unit}`, type: 'number', step: 'any', value: e.current }, { name: 'qty', label: 'Quantity used to date', type: 'number', step: 'any', value: e.qty }], (x) => Object.assign(e, x)); };
