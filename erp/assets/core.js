// Core: state store, formatting, calculations, UI helpers, charts.
window.Pages = {};
window.Actions = {};

const Store = {
  key: 'jrc-erp-v1',
  state: null,
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) { this.state = this.migrate(JSON.parse(raw)); return; }
    } catch (e) { /* storage unavailable: fall back to seed */ }
    this.state = buildSeed();
  },
  // Older saved data gets any collections added since it was saved, plus field defaults.
  migrate(st) {
    const seed = buildSeed();
    Object.keys(seed).forEach((k) => { if (st[k] === undefined) st[k] = seed[k]; });
    st.projects.forEach((p) => {
      const sp = seed.projects.find((x) => x.id === p.id) || {};
      ['company', 'length', 'width', 'ldPerDay', 'forecastEnd'].forEach((f) => { if (p[f] === undefined) p[f] = sp[f] ?? (f === 'company' ? 'JRC' : f === 'width' ? 12 : f === 'length' ? 1000 : f === 'ldPerDay' ? 0 : p.end); });
    });
    st.payables.forEach((b) => { if (b.paid === undefined) b.paid = false; if (!b.acc) b.acc = String(b.id).startsWith('SUB') ? '2050' : '2000'; });
    st.employees.forEach((e) => { const se = seed.employees.find((x) => x.id === e.id); if (se) Object.keys(se).forEach((f) => { if (e[f] === undefined) e[f] = se[f]; }); });
    st.equipment.forEach((e) => { const se = seed.equipment.find((x) => x.id === e.id); if (se) Object.keys(se).forEach((f) => { if (e[f] === undefined) e[f] = se[f]; }); });
    st.leads.forEach((l) => { if (!l.history) l.history = []; });
    st.items.forEach((i) => { if (!i.cat) i.cat = 'Material'; });
    seed.items.forEach((i) => { if (!st.items.find((x) => x.id === i.id)) st.items.push(i); });
    seed.bank.forEach((b) => { if (!st.bank.find((x) => x.id === b.id)) st.bank.push(b); });
    st.bank.forEach((b) => { if (!b.entity) b.entity = 'JRC'; });
    return st;
  },
  save() {
    try { localStorage.setItem(this.key, JSON.stringify(this.state)); } catch (e) { /* ignore */ }
  },
  reset() {
    this.state = buildSeed();
    this.save();
  },
};
const S = () => Store.state;
const nextId = (prefix) => `${prefix}-${++S().seq}`;
const openBills = () => S().payables.filter((p) => !p.paid);
// Chainage in metres → "2+400"
const ch = (m) => `${Math.floor(m / 1000)}+${String(Math.round(m % 1000)).padStart(3, '0')}`;
const parseCh = (v) => { const m = String(v).trim().match(/^(\d+)\+(\d{1,3})$/); return m ? +m[1] * 1000 + +m[2] : Number(v); };
const daysTo = (d) => days(today(), d);
const expiryBadge = (d, warn = 60) => {
  if (!d) return '—';
  const n = daysTo(d);
  if (n < 0) return `<span class="badge b-bad">Expired ${fdate(d)}</span>`;
  if (n <= warn) return `<span class="badge b-warn">${fdate(d)} · ${n} d</span>`;
  return fdate(d);
};
const fx = (cur) => (S().currencies.find((c) => c.code === (cur || 'AED')) || { rate: 1 }).rate;

// ---------- formatting ----------
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 0) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const aed = (n, d = 0) => 'AED ' + (typeof n === 'string' ? n : num(n, d));
const short = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(0) + 'k';
  return num(n);
};
const pct = (x, d = 0) => (isFinite(x) ? (x * 100).toFixed(d) : '0') + '%';
const fdate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const today = () => S().today;
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

const badge = (status) => {
  const map = {
    Active: 'info', Tender: 'muted', 'Defects Liability': 'warn', Completed: 'ok',
    Pending: 'warn', Approved: 'ok', Rejected: 'bad', Ordered: 'info', Open: 'warn', Answered: 'ok', Closed: 'muted',
    Received: 'ok', 'Partially received': 'warn', Draft: 'muted', Sent: 'info', Won: 'ok', Lost: 'bad',
    Submitted: 'warn', Certified: 'info', Paid: 'ok', Overdue: 'bad', Due: 'warn', Awarded: 'ok',
    'On track': 'ok', Lead: 'muted', Qualified: 'info', Proposal: 'warn', Negotiation: 'warn',
  };
  return `<span class="badge b-${map[status] || 'muted'}">${esc(status)}</span>`;
};
const bar = (x, cls = '') => `<div class="progress ${cls}"><i style="width:${Math.max(0, Math.min(100, x * 100)).toFixed(1)}%"></i></div>`;

// ---------- lookups ----------
const project = (id) => S().projects.find((p) => p.id === id);
const item = (id) => S().items.find((i) => i.id === id);
const supplier = (id) => S().suppliers.find((x) => x.id === id);
const supplierName = (id) => supplier(id)?.name || id;
const emp = (id) => S().employees.find((e) => e.id === id);
const whName = (id) => S().warehouses.find((w) => w.id === id)?.name || id;
const projLabel = (id) => (id ? `${id} · ${project(id)?.name || ''}` : '—');

// ---------- calculations ----------
const Calc = {
  project(p) {
    let value = 0, budget = 0, earned = 0, earnedBudget = 0, actual = 0;
    p.boq.forEach((b) => {
      value += b.qty * b.rate;
      budget += b.qty * b.costRate;
      earned += b.doneQty * b.rate;
      earnedBudget += b.doneQty * b.costRate;
      actual += b.actualCost;
    });
    const vo = S().variations.filter((v) => v.project === p.id && v.status === 'Approved').reduce((a, v) => a + v.value, 0);
    const eac = actual + (budget - earnedBudget);
    return {
      value, budget, earned, earnedBudget, actual, vo, revised: value + vo,
      progress: value ? earned / value : 0,
      margin: value ? (value - budget) / value : 0,
      eac, forecastMargin: value + vo ? (value + vo - eac) / (value + vo) : 0,
      costVariance: earnedBudget - actual,
    };
  },
  ipc(ipc) {
    const c = S().company;
    const prev = S().ipcs.find((x) => x.project === ipc.project && x.no === ipc.no - 1);
    const prevCum = prev ? prev.cumWork : ipc.prevCum || 0;
    const net = (w) => w * (1 - c.retentionPct / 100 - c.advancePct / 100);
    const thisWork = ipc.cumWork - prevCum;
    const retention = thisWork * c.retentionPct / 100;
    const advance = thisWork * c.advancePct / 100;
    const thisNet = net(ipc.cumWork) - net(prevCum);
    const vat = thisNet * c.vatRate / 100;
    return { prevCum, thisWork, retention, advance, thisNet, vat, total: thisNet + vat };
  },
  invoice(inv) {
    const vat = inv.net * S().company.vatRate / 100;
    const total = inv.net + vat;
    const open = total - inv.paid * (1 + S().company.vatRate / 100);
    const overdue = days(inv.due, today());
    return { vat, total, open: Math.max(0, open), overdue };
  },
  hourly: (e) => e.basic / 30 / 8,
  pay(e) {
    const t = S().timesheets[e.id] || { normal: 208, ot: 0, otHoliday: 0, unpaidDays: 0 };
    const h = Calc.hourly(e);
    const otPay = t.ot * h * 1.25 + t.otHoliday * h * 1.5;
    const fixed = e.basic + e.housing + e.transport;
    const deduction = fixed / 30 * t.unpaidDays;
    return { t, fixed, otPay, deduction, gross: fixed + otPay - deduction };
  },
  // UAE end-of-service gratuity (unlimited contract): 21 days' basic per year for first 5 years, 30 days thereafter,
  // capped at two years' total wage. Simplified illustration.
  eosb(e, asOf = today()) {
    const years = days(e.joined, asOf) / 365.25;
    if (years < 1) return { years, amount: 0 };
    const daily = e.basic / 30;
    let amount = Math.min(years, 5) * 21 * daily + Math.max(0, years - 5) * 30 * daily;
    amount = Math.min(amount, (e.basic + e.housing + e.transport) * 24);
    return { years, amount };
  },
  depreciation(eq, asOf = today()) {
    if (!eq.cost) return { annual: 0, acc: 0, nbv: 0, months: 0 };
    const months = Math.max(0, days(eq.bought, asOf) / 30.4375);
    const annual = (eq.cost - eq.salvage) / eq.life;
    const acc = Math.min(eq.cost - eq.salvage, annual * months / 12);
    return { annual, monthly: annual / 12, acc, nbv: eq.cost - acc, months };
  },
  stockQty(itemId) {
    return Object.values(S().stock).reduce((a, w) => a + (w[itemId] || 0), 0);
  },
};

// ---------- UI helpers ----------
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

function card(title, body, { actions = '', flush = false } = {}) {
  return `<section class="card">${title ? `<div class="card-h"><h3>${title}</h3><div class="btn-row">${actions}</div></div>` : ''}
    <div class="card-b ${flush ? 'flush' : ''}">${body}</div></section>`;
}
function kpi(label, value, sub = '') {
  return `<div class="card kpi"><div class="lbl">${label}</div><div class="val">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
}
// cols: [{ h, f: row => html, num?: bool, cls? }]
function table(cols, rows, { empty = 'Nothing here yet.', foot = '' } = {}) {
  if (!rows.length) return `<div class="empty">${empty}</div>`;
  return `<div class="table-wrap"><table><thead><tr>${cols.map((c) => `<th class="${c.num ? 'num' : ''}">${c.h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.num ? 'num' : ''} ${c.cls || ''}">${c.f(r)}</td>`).join('')}</tr>`).join('')}${foot}</tbody></table></div>`;
}
function tabs(base, list, active) {
  return `<div class="tabs">${list.map(([k, label]) => `<a class="tab ${k === active ? 'active' : ''}" href="#/${base}/${k}">${label}</a>`).join('')}</div>`;
}
const options = (list, sel) => list.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`).join('');
const projOptions = (sel, filter = () => true) => options(S().projects.filter(filter).map((p) => [p.id, `${p.id} · ${p.name}`]), sel);

// fields: [{ name, label, type?, value?, options?, full?, step? }]
function openModal(title, fields, onSubmit, { submit = 'Save', wide = false, html = '' } = {}) {
  const root = document.getElementById('modal-root');
  const body = fields.map((f) => {
    const v = f.value ?? '';
    let input;
    if (f.type === 'select') input = `<select name="${f.name}">${f.options}</select>`;
    else if (f.type === 'textarea') input = `<textarea name="${f.name}" rows="3">${esc(v)}</textarea>`;
    else input = `<input name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" ${f.step ? `step="${f.step}"` : ''} ${f.required === false ? '' : 'required'}>`;
    return `<label class="field ${f.full ? 'full' : ''}"><span>${f.label}</span>${input}</label>`;
  }).join('');
  root.innerHTML = `<div class="modal-back"><form class="modal ${wide ? 'wide' : ''}">
    <div class="modal-h"><h3>${title}</h3><button type="button" class="icon-btn" data-close>✕</button></div>
    <div class="modal-b">${html}<div class="form-grid">${body}</div></div>
    <div class="modal-f">${onSubmit ? `<button type="button" class="btn" data-close>Cancel</button><button class="btn primary">${submit}</button>` : '<button type="button" class="btn" data-close>Close</button>'}</div>
  </form></div>`;
  const form = root.querySelector('form');
  root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
  root.querySelector('.modal-back').addEventListener('mousedown', (e) => { if (e.target.classList.contains('modal-back')) closeModal(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {};
    fields.forEach((f) => {
      const raw = form.elements[f.name].value;
      data[f.name] = f.type === 'number' ? Number(raw) : raw;
    });
    if (onSubmit(data) !== false) { closeModal(); commit(); }
  });
  form.querySelector('input,select,textarea')?.focus();
}
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function toCSV(rows) {
  return rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n');
}

// ---------- charts (inline SVG) ----------
const Chart = {
  // series: [{ name, color, values[] }], labels[]; dashedFrom: index where forecast starts
  bars(labels, series, { height = 220, dashedFrom = null, fmt = short } = {}) {
    const W = 720, H = height, pl = 46, pb = 24, pt = 10;
    const max = Math.max(1, ...series.flatMap((s) => s.values)) * 1.1;
    const gw = (W - pl) / labels.length;
    const bw = Math.min(18, (gw - 8) / series.length);
    const y = (v) => pt + (H - pt - pb) * (1 - v / max);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4;
      g += `<line class="grid-line" x1="${pl}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
    }
    labels.forEach((l, i) => {
      const x0 = pl + i * gw + (gw - bw * series.length) / 2;
      series.forEach((s, j) => {
        const v = s.values[i];
        const op = dashedFrom !== null && i >= dashedFrom ? 0.45 : 1;
        g += `<rect x="${x0 + j * bw}" y="${y(v)}" width="${bw - 2}" height="${Math.max(0, H - pb - y(v))}" rx="2" fill="${s.color}" opacity="${op}"><title>${esc(l)} · ${esc(s.name)}: ${num(v)}</title></rect>`;
      });
      if (labels.length <= 12 || i % 2 === 0) g += `<text x="${pl + i * gw + gw / 2}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`;
    });
    if (dashedFrom !== null) {
      const x = pl + dashedFrom * gw;
      g += `<line x1="${x}" x2="${x}" y1="${pt}" y2="${H - pb}" stroke="var(--muted)" stroke-dasharray="4 4"/><text x="${x + 4}" y="${pt + 10}">forecast →</text>`;
    }
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${g}</svg>` + Chart.legend(series);
  },
  hbars(rows, { fmt = short } = {}) {
    // rows: [{ label, a, b }] budget vs actual
    const max = Math.max(1, ...rows.flatMap((r) => [r.a, r.b]));
    return rows.map((r) => `<div style="margin-bottom:10px">
      <div class="flex small"><span class="strong">${esc(r.label)}</span><span class="spacer"></span><span class="muted">${fmt(r.b)} / ${fmt(r.a)}</span></div>
      <div style="position:relative;height:14px;margin-top:4px;background:var(--bg);border-radius:4px">
        <div style="position:absolute;inset:0 auto 0 0;width:${(r.a / max) * 100}%;background:color-mix(in srgb,var(--c2) 25%,transparent);border-radius:4px"></div>
        <div style="position:absolute;top:3px;bottom:3px;left:0;width:${(r.b / max) * 100}%;background:${r.b > r.a ? 'var(--bad)' : 'var(--c1)'};border-radius:3px"></div>
      </div></div>`).join('');
  },
  donut(parts, { size = 160 } = {}) {
    const total = parts.reduce((a, p) => a + p.value, 0) || 1;
    const r = 60, c = 2 * Math.PI * r;
    let off = 0;
    const arcs = parts.map((p) => {
      const len = (p.value / total) * c;
      const s = `<circle r="${r}" cx="80" cy="80" fill="none" stroke="${p.color}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"><title>${esc(p.name)}: ${num(p.value)}</title></circle>`;
      off += len;
      return s;
    }).join('');
    return `<div class="flex"><svg width="${size}" height="${size}" viewBox="0 0 160 160">${arcs}</svg>${Chart.legend(parts.map((p) => ({ ...p, name: `${p.name} (${pct(p.value / total)})` })), true)}</div>`;
  },
  // series: [{ name, color, values[], dash? }] (null values are skipped)
  line(labels, series, { height = 240, fmt = short, marker = null } = {}) {
    const W = 720, H = height, pl = 52, pb = 24, pt = 12;
    const max = Math.max(1, ...series.flatMap((s) => s.values.filter((v) => v != null))) * 1.08;
    const x = (i) => pl + (labels.length < 2 ? 0 : (i / (labels.length - 1)) * (W - pl - 12));
    const y = (v) => pt + (H - pt - pb) * (1 - v / max);
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = max * i / 4; g += `<line class="grid-line" x1="${pl}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`; }
    const step = Math.ceil(labels.length / 12);
    labels.forEach((l, i) => { if (i % step === 0) g += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`; });
    if (marker != null) g += `<line x1="${x(marker)}" x2="${x(marker)}" y1="${pt}" y2="${H - pb}" stroke="var(--bad)" stroke-dasharray="4 4"/><text x="${x(marker) + 4}" y="${pt + 10}">today</text>`;
    series.forEach((s) => {
      const pts = s.values.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter(Boolean);
      if (pts.length > 1) g += `<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.4" ${s.dash ? 'stroke-dasharray="6 5"' : ''}/>`;
      else s.values.forEach((v, i) => { if (v != null) g += `<circle cx="${x(i)}" cy="${y(v)}" r="6" fill="${s.color}" stroke="var(--panel)" stroke-width="2"><title>${esc(s.name)}: ${fmt(v)}</title></circle>`; });
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${g}</svg>` + Chart.legend(series);
  },
  legend(series, vertical = false) {
    return `<div class="legend" ${vertical ? 'style="flex-direction:column"' : ''}>${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
  },
};
