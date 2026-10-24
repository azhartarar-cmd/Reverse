Pages.procurement = {
  title: 'Procurement',
  render(args) {
    const tab = args[0] || 'requisitions';
    const t = tabs('procurement', [['requisitions', 'Requisitions'], ['rfq', 'RFQs & supplier comparison'], ['orders', 'Purchase orders'], ['analysis', 'PO analysis'], ['suppliers', 'Suppliers']], tab);
    return t + (this[tab] || this.requisitions).call(this);
  },
  requisitions() {
    const s = S();
    return card('Material requisitions', table([
      { h: 'Ref', f: (r) => r.id },
      { h: 'Date', f: (r) => fdate(r.date) },
      { h: 'Project', f: (r) => r.project },
      { h: 'Item', f: (r) => esc(item(r.item).name) },
      { h: 'Qty', num: true, f: (r) => `${num(r.qty)} ${item(r.item).unit}` },
      { h: 'Est. value', num: true, f: (r) => num(r.qty * item(r.item).cost) },
      { h: 'Needed by', f: (r) => fdate(r.need) },
      { h: 'Requested by', f: (r) => esc(r.by) },
      { h: 'Status', f: (r) => badge(r.status) },
      { h: '', f: (r) => (r.status === 'Approved' ? `<div class="btn-row"><button class="btn sm" data-act="reqToRfq" data-id="${r.id}">Send RFQ</button><button class="btn sm primary" data-act="reqToPo" data-id="${r.id}">Direct PO</button></div>` : '') },
    ], s.requisitions), { flush: true, actions: '<button class="btn primary sm" data-act="newReq">+ Requisition</button>' });
  },
  rfq() {
    const s = S();
    if (!s.rfqs.length) return card('', '<div class="empty">No RFQs. Approve a requisition and choose “Send RFQ”.</div>');
    return s.rfqs.map((q) => {
      const it = item(q.item);
      const best = Math.min(...q.quotes.map((x) => x.rate));
      return `<div class="mt">` + card(`${q.id} · ${num(q.qty)} ${it.unit} ${esc(it.name)} <span class="muted small">(from ${q.req})</span> ${badge(q.status)}`, table([
        { h: 'Supplier', f: (x) => esc(supplier(x.supplier) ? supplier(x.supplier).name : x.supplier) },
        { h: 'Unit rate', num: true, f: (x) => `<span class="${x.rate === best ? 'pos strong' : ''}">${num(x.rate, 2)}</span>` },
        { h: 'Total', num: true, f: (x) => num(x.rate * q.qty) },
        { h: 'vs lowest', num: true, f: (x) => (x.rate === best ? '<span class="badge b-ok">Lowest</span>' : `+${pct(x.rate / best - 1, 1)}`) },
        { h: 'Lead time', num: true, f: (x) => `${x.lead} days` },
        { h: 'Payment terms', f: (x) => esc(x.terms) },
        { h: '', f: (x, i) => (q.status === 'Open' ? `<button class="btn sm primary" data-act="awardRfq" data-id="${q.id}" data-s="${esc(x.supplier)}">Award</button>` : (q.awarded === x.supplier ? badge('Awarded') : '')) },
      ], q.quotes), { flush: true, actions: q.status === 'Open' ? `<button class="btn sm" data-act="addQuote" data-id="${q.id}">+ Supplier quote</button>` : '' }) + '</div>';
    }).join('');
  },
  orders() {
    return card('Purchase orders', table([
      { h: 'PO', f: (p) => p.id },
      { h: 'Date', f: (p) => fdate(p.date) },
      { h: 'Supplier', f: (p) => esc(supplierName(p.supplier)), cls: 'wrap' },
      { h: 'Project', f: (p) => p.project },
      { h: 'Item', f: (p) => esc(item(p.item).name) },
      { h: 'Qty', num: true, f: (p) => `${num(p.received)} / ${num(p.qty)} ${item(p.item).unit}` },
      { h: 'Net', num: true, f: (p) => `${p.currency && p.currency !== 'AED' ? `<span class="muted small">${p.currency}</span> ` : ''}${num(p.qty * p.rate)}` },
      { h: 'VAT 5%', num: true, f: (p) => num(p.qty * p.rate * 0.05) },
      { h: 'Approval', f: (p) => badge(p.approval) },
      { h: 'Delivery', f: (p) => badge(p.status) },
      { h: '', f: (p) => (p.approval === 'Approved' && p.status !== 'Received' ? `<button class="btn sm" data-act="receivePo" data-id="${p.id}">Receive (GRN)</button>` : '') },
    ], S().pos.slice().sort((a, b) => b.date.localeCompare(a.date))), { flush: true, actions: '<button class="btn primary sm" data-act="newPo">+ Purchase order</button>' });
  },
  analysis() {
    const s = S();
    const bySup = {}, byProj = {}, byItem = {};
    s.pos.forEach((p) => {
      const v = p.qty * p.rate;
      bySup[p.supplier] = (bySup[p.supplier] || 0) + v;
      byProj[p.project] = (byProj[p.project] || 0) + v;
      byItem[p.item] = (byItem[p.item] || 0) + v;
    });
    const colors = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', '#0891b2', '#be185d', '#65a30d'];
    const rows = (o, lbl) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k: lbl(k), v }));
    const t = (o, lbl) => table([{ h: '', f: (r) => esc(r.k), cls: 'wrap' }, { h: 'Committed (AED)', num: true, f: (r) => num(r.v) }], rows(o, lbl));
    return `<div class="grid cols-2">${card('Spend by supplier', Chart.donut(rows(bySup, supplierName).map((r, i) => ({ name: r.k, value: r.v, color: colors[i % colors.length] }))))}
      ${card('Spend by project', t(byProj, projLabel), { flush: true })}</div><div class="mt">${card('Spend by item', t(byItem, (k) => item(k).name), { flush: true })}</div>`;
  },
  suppliers() {
    const s = S();
    return card('Supplier register', table([
      { h: 'Code', f: (x) => x.id },
      { h: 'Supplier', f: (x) => esc(x.name) },
      { h: 'Category', f: (x) => esc(x.category) },
      { h: 'Terms', f: (x) => x.terms },
      { h: 'Rating', f: (x) => `${'★'.repeat(Math.round(x.rating))}${'☆'.repeat(5 - Math.round(x.rating))} <span class="muted small">${x.rating}</span>` },
      { h: 'Open POs', num: true, f: (x) => s.pos.filter((p) => p.supplier === x.id && p.status !== 'Received').length },
      { h: 'Payable', num: true, f: (x) => num(openBills().filter((p) => p.supplier === x.id).reduce((a, p) => a + p.amount, 0)) },
    ], s.suppliers), { flush: true, actions: '<button class="btn primary sm" data-act="newSupplier">+ Supplier</button>' });
  },
};

const itemOptions = (sel) => options(S().items.map((i) => [i.id, `${i.name} (${i.unit})`]), sel);
const supplierOptions = (sel) => options(S().suppliers.map((x) => [x.id, x.name]), sel);

Actions.newReq = () => openModal('Material requisition', [
  { name: 'project', label: 'Project', type: 'select', options: projOptions('', (p) => p.status === 'Active') },
  { name: 'item', label: 'Item', type: 'select', options: itemOptions() },
  { name: 'qty', label: 'Quantity', type: 'number', step: 'any' },
  { name: 'need', label: 'Needed by', type: 'date', value: addDays(today(), 10) },
  { name: 'note', label: 'Purpose', full: true, required: false },
], (x) => { S().requisitions.unshift({ id: nextId('MR'), date: today(), by: 'Admin', status: 'Pending', ...x }); });

Actions.reqToRfq = (d) => {
  const r = S().requisitions.find((x) => x.id === d.id);
  const it = item(r.item);
  // Seed three indicative quotes around standard cost so the comparison has data to work with.
  const quotes = [it.supplier, ...S().suppliers.filter((x) => x.id !== it.supplier).slice(0, 2).map((x) => x.id)]
    .map((sid, i) => ({ supplier: sid, rate: Math.round(it.cost * [1, 0.97, 1.05][i] * 100) / 100, lead: [7, 12, 5][i], terms: supplier(sid).terms }));
  S().rfqs.unshift({ id: nextId('RFQ'), req: r.id, item: r.item, qty: r.qty, status: 'Open', quotes });
  r.status = 'Ordered';
  commit('RFQ issued to 3 suppliers');
  location.hash = '#/procurement/rfq';
};

Actions.addQuote = (d) => {
  const q = S().rfqs.find((x) => x.id === d.id);
  openModal('Record supplier quote', [
    { name: 'supplier', label: 'Supplier', type: 'select', options: supplierOptions() },
    { name: 'rate', label: 'Unit rate (AED)', type: 'number', step: 'any' },
    { name: 'lead', label: 'Lead time (days)', type: 'number', value: 7 },
    { name: 'terms', label: 'Payment terms', value: '30 days' },
  ], (x) => { q.quotes.push(x); });
};

Actions.awardRfq = (d) => {
  const q = S().rfqs.find((x) => x.id === d.id);
  const quote = q.quotes.find((x) => x.supplier === d.s);
  let sid = d.s;
  if (!supplier(sid)) { sid = 'S-' + String(S().suppliers.length + 1).padStart(2, '0'); S().suppliers.push({ id: sid, name: d.s.replace(' (new)', ''), category: 'General', terms: quote.terms, rating: 3.5 }); }
  const req = S().requisitions.find((r) => r.id === q.req);
  q.status = 'Closed';
  q.awarded = d.s;
  S().pos.unshift({ id: nextId('PO'), date: today(), supplier: sid, project: req?.project || '', item: q.item, qty: q.qty, rate: quote.rate, received: 0, status: 'Open', approval: 'Pending', paid: false });
  commit('Awarded — PO raised and sent for approval');
};

Actions.reqToPo = (d) => {
  const r = S().requisitions.find((x) => x.id === d.id);
  const it = item(r.item);
  S().pos.unshift({ id: nextId('PO'), date: today(), supplier: it.supplier, project: r.project, item: r.item, qty: r.qty, rate: it.cost, received: 0, status: 'Open', approval: 'Pending', paid: false });
  r.status = 'Ordered';
  commit('PO raised and sent for approval');
};

Actions.newPo = () => openModal('Purchase order', [
  { name: 'supplier', label: 'Supplier', type: 'select', options: supplierOptions() },
  { name: 'project', label: 'Project', type: 'select', options: projOptions() },
  { name: 'item', label: 'Item', type: 'select', options: itemOptions() },
  { name: 'qty', label: 'Quantity', type: 'number', step: 'any' },
  { name: 'rate', label: 'Unit rate (excl. VAT)', type: 'number', step: 'any' },
  { name: 'currency', label: 'Currency', type: 'select', options: options(S().currencies.map((c) => [c.code, `${c.code} (${num(c.rate, 4)})`]), 'AED') },
], (x) => { S().pos.unshift({ id: nextId('PO'), date: today(), received: 0, status: 'Open', approval: 'Pending', paid: false, ...x }); });

Actions.receivePo = (d) => {
  const p = S().pos.find((x) => x.id === d.id);
  openModal(`Goods received note — ${p.id}`, [
    { name: 'qty', label: `Quantity received (${item(p.item).unit})`, type: 'number', step: 'any', value: p.qty - p.received },
    { name: 'wh', label: 'Into warehouse', type: 'select', options: options(S().warehouses.map((w) => [w.id, w.name])) },
  ], (x) => {
    p.received += x.qty;
    p.status = p.received >= p.qty ? 'Received' : 'Partially received';
    const st = S().stock[x.wh] || (S().stock[x.wh] = {});
    st[p.item] = (st[p.item] || 0) + x.qty;
    S().stockTx.unshift({ id: nextId('GRN'), date: today(), type: 'Receipt', item: p.item, qty: x.qty, from: p.supplier, to: x.wh, project: p.project, ref: p.id });
    const amt = x.qty * p.rate * 1.05;
    S().payables.unshift({ id: nextId('BILL'), supplier: p.supplier, ref: p.id, date: today(), due: addDays(today(), parseInt(supplier(p.supplier)?.terms) || 30), amount: Math.round(amt * fx(p.currency)), currency: p.currency || 'AED', fxAmount: Math.round(amt), acc: '2000', grn: true, paid: false });
  }, { submit: 'Post GRN' });
};

Actions.newSupplier = () => openModal('New supplier', [
  { name: 'name', label: 'Name', full: true },
  { name: 'category', label: 'Category' },
  { name: 'terms', label: 'Payment terms', value: '30 days' },
], (x) => { S().suppliers.push({ id: 'S-' + String(S().suppliers.length + 1).padStart(2, '0'), rating: 4, ...x }); });

// ---------------- Warehouse ----------------
Pages.warehouse = {
  title: 'Warehouse',
  render(args) {
    const tab = args[0] || 'stock';
    return tabs('warehouse', [['stock', 'Stock on hand'], ['movements', 'Receipts, issues & transfers'], ['consumption', 'Consumption by project']], tab) + (this[tab] || this.stock).call(this);
  },
  stock() {
    const s = S();
    const val = s.items.reduce((a, i) => a + Calc.stockQty(i.id) * i.cost, 0);
    const cols = [
      { h: 'Item', f: (i) => `<span class="strong">${esc(i.name)}</span> <span class="muted small">${i.code}</span>` },
      ...s.warehouses.map((w) => ({ h: esc(w.name.split('–')[1]?.trim() || w.name), num: true, f: (i) => num(s.stock[w.id]?.[i.id] || 0) })),
      { h: 'Total', num: true, f: (i) => `<span class="strong">${num(Calc.stockQty(i.id))}</span> ${i.unit}` },
      { h: 'Unit cost', num: true, f: (i) => num(i.cost, 2) },
      { h: 'Value', num: true, f: (i) => num(Calc.stockQty(i.id) * i.cost) },
      { h: '', f: (i) => (Calc.stockQty(i.id) < i.reorder ? '<span class="badge b-bad">Below reorder</span>' : '') },
    ];
    return `<div class="grid kpis">${kpi('Inventory value', aed(short(val)))}${kpi('Warehouses', s.warehouses.length)}${kpi('Items below reorder', s.items.filter((i) => Calc.stockQty(i.id) < i.reorder).length)}</div><div class="mt">` +
      card('Multi-warehouse stock', table(cols, s.items), { flush: true, actions: '<button class="btn sm" data-act="stockTx" data-t="Transfer">Transfer</button><button class="btn sm" data-act="stockTx" data-t="Issue">Issue to project</button><button class="btn primary sm" data-act="stockTx" data-t="Receipt">Receipt</button>' }) + '</div>';
  },
  movements() {
    return card('Stock movements', table([
      { h: 'Ref', f: (t) => t.id },
      { h: 'Date', f: (t) => fdate(t.date) },
      { h: 'Type', f: (t) => `<span class="badge ${t.type === 'Receipt' ? 'b-ok' : t.type === 'Issue' ? 'b-warn' : t.type === 'Production' ? 'b-muted' : 'b-info'}">${t.type}</span>` },
      { h: 'Item', f: (t) => esc(item(t.item).name) },
      { h: 'Qty', num: true, f: (t) => `${num(t.qty)} ${item(t.item).unit}` },
      { h: 'From', f: (t) => esc(t.type === 'Receipt' ? supplierName(t.from) : whName(t.from)), cls: 'wrap' },
      { h: 'To', f: (t) => esc(['Issue', 'Production'].includes(t.type) ? t.project : whName(t.to)), cls: 'wrap' },
      { h: 'Reference', f: (t) => esc(t.ref) },
    ], S().stockTx), { flush: true, actions: '<button class="btn primary sm" data-act="stockTx" data-t="Issue">+ Movement</button>' });
  },
  consumption() {
    const s = S();
    const rows = {};
    s.stockTx.filter((t) => ['Issue', 'Production'].includes(t.type)).forEach((t) => {
      const k = t.project + '|' + t.item;
      rows[k] = rows[k] || { project: t.project, item: t.item, qty: 0 };
      rows[k].qty += t.qty;
    });
    const list = Object.values(rows).sort((a, b) => a.project.localeCompare(b.project));
    const total = list.reduce((a, r) => a + r.qty * item(r.item).cost, 0);
    return card('Material consumption by project', table([
      { h: 'Project', f: (r) => esc(projLabel(r.project)), cls: 'wrap' },
      { h: 'Item', f: (r) => esc(item(r.item).name) },
      { h: 'Qty issued', num: true, f: (r) => `${num(r.qty)} ${item(r.item).unit}` },
      { h: 'Cost (AED)', num: true, f: (r) => num(r.qty * item(r.item).cost) },
    ], list, { foot: `<tr class="total"><td colspan="3">Total</td><td class="num">${num(total)}</td></tr>` }), { flush: true });
  },
};

Actions.stockTx = (d) => {
  const t = d.t;
  const whs = options(S().warehouses.map((w) => [w.id, w.name]));
  const fields = [
    { name: 'type', label: 'Movement', type: 'select', options: options([['Receipt', 'Receipt'], ['Issue', 'Issue to project'], ['Transfer', 'Transfer between warehouses']], t) },
    { name: 'item', label: 'Item', type: 'select', options: itemOptions() },
    { name: 'qty', label: 'Quantity', type: 'number', step: 'any' },
    { name: 'from', label: 'From warehouse (issue / transfer)', type: 'select', options: whs },
    { name: 'to', label: 'To warehouse (receipt / transfer)', type: 'select', options: options(S().warehouses.map((w) => [w.id, w.name]), t === 'Transfer' ? 'W-02' : 'W-01') },
    { name: 'project', label: 'Project (issue)', type: 'select', options: '<option value="">—</option>' + projOptions() },
    { name: 'ref', label: 'Reference', required: false, full: true },
  ];
  openModal('Stock movement', fields, (x) => {
    const st = S().stock;
    const get = (w) => st[w] || (st[w] = {});
    if (x.type === 'Issue' && !x.project) { alert('Choose a project for the issue.'); return false; }
    if (x.type === 'Transfer' && x.from === x.to) { alert('Choose two different warehouses.'); return false; }
    if (x.type !== 'Receipt') {
      const have = get(x.from)[x.item] || 0;
      if (x.qty > have) { alert(`Only ${num(have)} available in ${whName(x.from)}.`); return false; }
      get(x.from)[x.item] = have - x.qty;
    }
    if (x.type !== 'Issue') get(x.to)[x.item] = (get(x.to)[x.item] || 0) + x.qty;
    const prefix = { Receipt: 'GRN', Issue: 'GIN', Transfer: 'TRN' }[x.type];
    S().stockTx.unshift({ id: nextId(prefix), date: today(), ...x, from: x.type === 'Receipt' ? item(x.item).supplier : x.from, to: x.type === 'Issue' ? '' : x.to });
  }, { submit: 'Post' });
};
