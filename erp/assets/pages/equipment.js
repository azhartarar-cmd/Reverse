Pages.equipment = {
  title: 'Equipment',
  render(args) {
    const tab = args[0] || 'fleet';
    return tabs('equipment', [['fleet', 'Fleet register'], ['calendar', 'Resource calendar'], ['requests', 'Equipment requests'], ['depreciation', 'Depreciation']], tab) + (this[tab] || this.fleet).call(this);
  },
  current(eqId) {
    return S().bookings.find((b) => b.eq === eqId && b.from <= today() && b.to >= today());
  },
  fleet() {
    const eq = S().equipment;
    const busy = eq.filter((e) => this.current(e.id)).length;
    return `<div class="grid kpis">${kpi('Fleet items', eq.length)}${kpi('Utilisation today', pct(busy / eq.length), `${busy} deployed · ${eq.length - busy} idle`)}${kpi('Subcontractor plant', eq.filter((e) => e.owner !== 'Own').length)}${kpi('Fleet book value', aed(short(eq.reduce((a, e) => a + Calc.depreciation(e).nbv, 0))))}</div><div class="mt">` +
      card('Fleet register', table([
        { h: 'ID', f: (e) => e.id },
        { h: 'Equipment', f: (e) => `<span class="strong">${esc(e.name)}</span>` },
        { h: 'Type', f: (e) => e.type },
        { h: 'Ownership', f: (e) => (e.owner === 'Own' ? '<span class="badge b-info">Own</span>' : `<span class="badge b-warn">${esc(e.owner.replace('Subcontractor: ', 'Hired: '))}</span>`) },
        { h: 'Internal rate / hr', num: true, f: (e) => (e.rate ? num(e.rate) : '—') },
        { h: 'Currently at', f: (e) => { const b = this.current(e.id); return b ? `${b.project} <span class="muted small">until ${fdate(b.to)}</span>` : '<span class="muted">Yard (idle)</span>'; } },
      ], eq), { flush: true, actions: '<button class="btn primary sm" data-act="bookEq">+ Allocate to project</button>' }) + '</div>';
  },
  calendar() {
    const weeks = 10;
    const start = addDays(today(), -((new Date(today()).getDay() + 6) % 7) - 14); // Monday, two weeks back
    const cols = Array.from({ length: weeks }, (_, i) => addDays(start, i * 7));
    const colors = { 'P-2401': 'var(--c1)', 'P-2402': 'var(--c2)', 'P-2403': 'var(--c3)', 'P-2404': 'var(--c4)' };
    const rows = S().equipment.map((e) => `<tr><td style="text-align:left" class="strong">${esc(e.name)}</td>${cols.map((w) => {
      const we = addDays(w, 6);
      const b = S().bookings.find((x) => x.eq === e.id && x.from <= we && x.to >= w);
      const isNow = w <= today() && today() <= we;
      return `<td class="slot" style="${isNow ? 'background:var(--brand-soft)' : ''}">${b ? `<div class="booked" style="background:color-mix(in srgb,${colors[b.project] || 'var(--c2)'} 22%,transparent);color:var(--ink)" title="${b.project} ${b.from} → ${b.to}">${b.project}</div>` : ''}</td>`;
    }).join('')}</tr>`).join('');
    return card('Allocation by week', `<div class="table-wrap"><table class="cal"><thead><tr><th style="text-align:left">Equipment</th>${cols.map((w) => `<th>${fdate(w).slice(0, 6)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`,
      { flush: true, actions: '<button class="btn primary sm" data-act="bookEq">+ Allocate</button>' }) +
      `<div class="legend">${Object.entries(colors).map(([p, c]) => `<span><i style="background:${c}"></i>${p}</span>`).join('')}<span><i style="background:var(--brand-soft)"></i>This week</span></div>`;
  },
  requests() {
    return card('Requests from site', table([
      { h: 'Ref', f: (r) => r.id },
      { h: 'Project', f: (r) => r.project },
      { h: 'Type needed', f: (r) => r.type },
      { h: 'From', f: (r) => fdate(r.from) },
      { h: 'To', f: (r) => fdate(r.to) },
      { h: 'Requested by', f: (r) => esc(r.by) },
      { h: 'Status', f: (r) => badge(r.status) },
      { h: 'Available units', f: (r) => {
        if (r.status !== 'Pending') return '';
        const free = S().equipment.filter((e) => e.type === r.type && !S().bookings.some((b) => b.eq === e.id && b.from <= r.to && b.to >= r.from));
        return free.length ? free.map((e) => `<button class="btn sm primary" data-act="assignEq" data-id="${r.id}" data-eq="${e.id}">Assign ${e.id}</button>`).join(' ') : '<span class="neg small">None free — hire from subcontractor</span>';
      } },
    ], S().eqRequests), { flush: true, actions: '<button class="btn primary sm" data-act="newEqReq">+ Request</button>' });
  },
  depreciation() {
    const own = S().equipment.filter((e) => e.cost);
    const rows = own.map((e) => ({ e, d: Calc.depreciation(e) }));
    return card('Straight-line depreciation', table([
      { h: 'Equipment', f: (r) => esc(r.e.name) },
      { h: 'Acquired', f: (r) => fdate(r.e.bought) },
      { h: 'Cost', num: true, f: (r) => num(r.e.cost) },
      { h: 'Life (yrs)', num: true, f: (r) => r.e.life },
      { h: 'Salvage', num: true, f: (r) => num(r.e.salvage) },
      { h: 'Monthly charge', num: true, f: (r) => num(r.d.monthly) },
      { h: 'Accumulated', num: true, f: (r) => num(r.d.acc) },
      { h: 'Net book value', num: true, f: (r) => `<b>${num(r.d.nbv)}</b>` },
    ], rows, { foot: `<tr class="total"><td colspan="5">Total</td><td class="num">${num(rows.reduce((a, r) => a + r.d.monthly, 0))}</td><td class="num">${num(rows.reduce((a, r) => a + r.d.acc, 0))}</td><td class="num">${num(rows.reduce((a, r) => a + r.d.nbv, 0))}</td></tr>` }), { flush: true });
  },
};

Actions.bookEq = () => openModal('Allocate equipment', [
  { name: 'eq', label: 'Equipment', type: 'select', options: options(S().equipment.map((e) => [e.id, e.name])), full: true },
  { name: 'project', label: 'Project', type: 'select', options: projOptions('', (p) => p.status === 'Active'), full: true },
  { name: 'from', label: 'From', type: 'date', value: today() },
  { name: 'to', label: 'To', type: 'date', value: addDays(today(), 28) },
], (x) => {
  const clash = S().bookings.find((b) => b.eq === x.eq && b.from <= x.to && b.to >= x.from);
  if (clash) { alert(`Already allocated to ${clash.project} from ${fdate(clash.from)} to ${fdate(clash.to)}.`); return false; }
  S().bookings.push(x);
});
Actions.newEqReq = () => openModal('Equipment request', [
  { name: 'project', label: 'Project', type: 'select', options: projOptions('', (p) => p.status === 'Active'), full: true },
  { name: 'type', label: 'Type', type: 'select', options: options([...new Set(S().equipment.map((e) => e.type))].map((t) => [t, t])) },
  { name: 'by', label: 'Requested by', value: 'Admin' },
  { name: 'from', label: 'From', type: 'date', value: addDays(today(), 7) },
  { name: 'to', label: 'To', type: 'date', value: addDays(today(), 35) },
], (x) => { S().eqRequests.unshift({ id: nextId('ER'), status: 'Pending', ...x }); });
Actions.assignEq = (d) => {
  const r = S().eqRequests.find((x) => x.id === d.id);
  S().bookings.push({ eq: d.eq, project: r.project, from: r.from, to: r.to });
  r.status = 'Approved';
  commit(`${d.eq} assigned to ${r.project}`);
};
