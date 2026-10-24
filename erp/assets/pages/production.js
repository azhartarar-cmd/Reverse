Calc.mixCost = (m) => m.bom.reduce((a, b) => a + b.per * item(b.item).cost, 0) + m.plantCost;
Calc.order = (o) => {
  const m = S().mixDesigns.find((x) => x.id === o.mix);
  const delivered = S().tickets.filter((t) => t.order === o.id).reduce((a, t) => a + t.tons, 0);
  const theoretical = o.layArea ? o.layArea * m.thickness * m.density : 0; // tonnes needed for area laid
  return { m, delivered, theoretical, waste: o.tons ? (o.tons - delivered) / o.tons : 0, yieldVar: theoretical ? delivered / theoretical - 1 : null };
};

Pages.production = {
  title: 'Asphalt Plant',
  render(args) {
    const tab = args[0] || 'orders';
    return tabs('production', [['orders', 'Production orders'], ['tickets', 'Delivery tickets'], ['mixes', 'Mix designs (BOM) & costing'], ['yield', 'Yield & wastage']], tab) + (this[tab] || this.orders).call(this);
  },
  orders() {
    const os = S().prodOrders.slice().sort((a, b) => b.date.localeCompare(a.date));
    const produced = os.filter((o) => o.status === 'Produced');
    const tons = produced.reduce((a, o) => a + o.tons, 0);
    return `<div class="grid kpis">${kpi('Produced (last orders)', `${num(tons)} t`)}${kpi('Average cost / t', aed(num(produced.reduce((a, o) => a + o.cost, 0) / Math.max(1, tons), 2)))}${kpi('Planned', `${num(os.filter((o) => o.status === 'Planned').reduce((a, o) => a + o.tons, 0))} t`)}${kpi('Bitumen in main yard', `${num(S().stock['W-01']['I-04'] || 0)} t`)}</div><div class="mt">` +
      card('Production orders', table([
        { h: 'Order', f: (o) => o.id },
        { h: 'Date', f: (o) => fdate(o.date) },
        { h: 'Mix', f: (o) => esc(S().mixDesigns.find((m) => m.id === o.mix).name) },
        { h: 'Project', f: (o) => o.project },
        { h: 'Tonnes', num: true, f: (o) => num(o.tons) },
        { h: 'Delivered', num: true, f: (o) => num(Calc.order(o).delivered, 1) },
        { h: 'Cost', num: true, f: (o) => (o.status === 'Produced' ? num(o.cost) : `<span class="muted">${num(o.tons * Calc.mixCost(S().mixDesigns.find((m) => m.id === o.mix)))}</span>`) },
        { h: 'Status', f: (o) => badge(o.status === 'Produced' ? 'Completed' : o.status) },
        { h: '', f: (o) => (o.status === 'Planned' ? `<button class="btn sm primary" data-act="produce" data-id="${o.id}">Produce</button>` : `<button class="btn sm" data-act="newTicket" data-id="${o.id}">+ Ticket</button> <button class="btn sm" data-act="layArea" data-id="${o.id}">Area laid</button>`) },
      ], os), { flush: true, actions: '<button class="btn primary sm" data-act="newProdOrder">+ Production order</button>' }) + '</div>';
  },
  tickets() {
    return card('Delivery tickets (plant → site)', table([
      { h: 'Ticket', f: (t) => t.id },
      { h: 'Date', f: (t) => fdate(t.date) },
      { h: 'Order', f: (t) => t.order },
      { h: 'Truck', f: (t) => t.truck },
      { h: 'Project', f: (t) => t.project },
      { h: 'Tonnes', num: true, f: (t) => num(t.tons, 1) },
      { h: 'Temp °C', num: true, f: (t) => `<span class="${t.temp < 140 ? 'neg' : ''}">${t.temp}</span>` },
    ], S().tickets.slice().reverse().slice(0, 150)), { flush: true }) + '<p class="muted small">Loads arriving below 140 °C are highlighted for the site QC engineer.</p>';
  },
  mixes() {
    return S().mixDesigns.map((m) => card(`${m.id} · ${esc(m.name)} — ${aed(num(Calc.mixCost(m), 2))} per tonne`, table([
      { h: 'Material', f: (b) => esc(item(b.item).name) },
      { h: 'Per tonne of mix', num: true, f: (b) => `${num(b.per, 3)} ${item(b.item).unit}` },
      { h: 'Unit cost', num: true, f: (b) => num(item(b.item).cost, 2) },
      { h: 'Cost / t', num: true, f: (b) => num(b.per * item(b.item).cost, 2) },
      { h: 'Share', num: true, f: (b) => pct(b.per * item(b.item).cost / Calc.mixCost(m), 1) },
    ], m.bom, { foot: `<tr><td>Plant running (fuel, burner, labour)</td><td></td><td></td><td class="num">${num(m.plantCost, 2)}</td><td class="num">${pct(m.plantCost / Calc.mixCost(m), 1)}</td></tr><tr class="total"><td>Total per tonne</td><td></td><td></td><td class="num">${num(Calc.mixCost(m), 2)}</td><td></td></tr>` }),
    { flush: true, actions: `<span class="muted small">Layer ${m.thickness * 1000} mm · ${m.density} t/m³</span><button class="btn sm" data-act="editMix" data-id="${m.id}">Edit BOM</button>` }) + '<div class="mt"></div>').join('');
  },
  yield() {
    const rows = S().prodOrders.filter((o) => o.status === 'Produced').map((o) => ({ o, x: Calc.order(o) }));
    return '<div class="note">Plant wastage = produced − delivered. Laying yield compares tonnes delivered with tonnes needed for the area laid (area × thickness × density). Positive = over-thickness or loss.</div><div class="mt">' +
      card('Yield by production order', table([
        { h: 'Order', f: (r) => r.o.id },
        { h: 'Project', f: (r) => r.o.project },
        { h: 'Produced t', num: true, f: (r) => num(r.o.tons) },
        { h: 'Delivered t', num: true, f: (r) => num(r.x.delivered, 1) },
        { h: 'Plant wastage', num: true, f: (r) => `<span class="${r.x.waste > 0.02 ? 'neg' : ''}">${pct(r.x.waste, 1)}</span>` },
        { h: 'Area laid m²', num: true, f: (r) => (r.o.layArea ? num(r.o.layArea) : '—') },
        { h: 'Theoretical t', num: true, f: (r) => (r.x.theoretical ? num(r.x.theoretical, 1) : '—') },
        { h: 'Laying yield', num: true, f: (r) => (r.x.yieldVar == null ? '—' : `<span class="${Math.abs(r.x.yieldVar) > 0.03 ? 'neg' : 'pos'}">${r.x.yieldVar > 0 ? '+' : ''}${pct(r.x.yieldVar, 1)}</span>`) },
      ], rows), { flush: true }) + '</div>';
  },
};

Actions.newProdOrder = () => openModal('Production order', [
  { name: 'mix', label: 'Mix design', type: 'select', options: options(S().mixDesigns.map((m) => [m.id, m.name])) },
  { name: 'tons', label: 'Tonnes', type: 'number' },
  { name: 'project', label: 'Deliver to project', type: 'select', options: projOptions('', (p) => p.status === 'Active') },
  { name: 'date', label: 'Production date', type: 'date', value: addDays(today(), 1) },
], (x) => { S().prodOrders.push({ id: nextId('AP'), ...x, status: 'Planned', layArea: 0, cost: 0 }); });

Actions.produce = (d) => {
  const o = S().prodOrders.find((x) => x.id === d.id);
  const m = S().mixDesigns.find((x) => x.id === o.mix);
  const yard = S().stock['W-01'];
  const short = m.bom.filter((b) => (yard[b.item] || 0) < b.per * o.tons);
  if (short.length) { alert('Not enough raw material in Main Yard:\n' + short.map((b) => `${item(b.item).name}: need ${num(b.per * o.tons, 1)}, have ${num(yard[b.item] || 0, 1)}`).join('\n')); return; }
  m.bom.forEach((b) => {
    const q = Math.round(b.per * o.tons * 100) / 100;
    yard[b.item] -= q;
    S().stockTx.unshift({ id: nextId('PRD'), date: today(), type: 'Production', item: b.item, qty: q, from: 'W-01', to: '', project: o.project, ref: o.id });
  });
  o.status = 'Produced';
  o.date = today();
  o.cost = Math.round(o.tons * Calc.mixCost(m));
  commit(`${o.id}: ${num(o.tons)} t produced, raw materials consumed`);
};
Actions.newTicket = (d) => {
  const o = S().prodOrders.find((x) => x.id === d.id);
  const left = o.tons - Calc.order(o).delivered;
  openModal(`Delivery ticket — ${o.id}`, [
    { name: 'truck', label: 'Truck', value: 'AD-4 51203' },
    { name: 'tons', label: 'Tonnes', type: 'number', step: 'any', value: Math.min(40, Math.round(left * 10) / 10) },
    { name: 'temp', label: 'Temperature at dispatch °C', type: 'number', value: 155 },
  ], (x) => {
    if (x.tons > left + 0.01) { alert(`Only ${num(left, 1)} t left on this order.`); return false; }
    const n = S().tickets.filter((t) => t.order === o.id).length + 1;
    S().tickets.push({ id: `DT-${o.id.replace(/^AP-/, '')}-${String(n).padStart(2, '0')}`, order: o.id, date: today(), project: o.project, ...x });
  });
};
Actions.layArea = (d) => {
  const o = S().prodOrders.find((x) => x.id === d.id);
  openModal(`Area laid — ${o.id}`, [{ name: 'layArea', label: 'Area paved with this order (m²)', type: 'number', value: o.layArea }], (x) => { o.layArea = x.layArea; });
};
Actions.editMix = (d) => {
  const m = S().mixDesigns.find((x) => x.id === d.id);
  openModal(`Edit BOM — ${m.name}`, [
    ...m.bom.map((b, i) => ({ name: 'b' + i, label: `${item(b.item).name} (${item(b.item).unit} per t)`, type: 'number', step: 'any', value: b.per })),
    { name: 'plantCost', label: 'Plant running cost per t (AED)', type: 'number', step: 'any', value: m.plantCost },
  ], (x) => { m.bom.forEach((b, i) => { b.per = x['b' + i]; }); m.plantCost = x.plantCost; });
};
