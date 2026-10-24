// Road-specific project views: chainage progress, cash flow plan, document control.
const LAYERS = ['Earthworks', 'Sub-base', 'Road base', 'Asphalt base', 'Wearing course', 'Road markings'];

// Merge recorded sections of one layer into continuous covered ranges.
function coverage(pid, layer) {
  const segs = S().chainage.filter((c) => c.project === pid && c.layer === layer).map((c) => [c.from, c.to]).sort((a, b) => a[0] - b[0]);
  const out = [];
  segs.forEach(([a, b]) => { const l = out[out.length - 1]; if (l && a <= l[1]) l[1] = Math.max(l[1], b); else out.push([a, b]); });
  return out;
}

Object.assign(Pages.projects, {
  chainage(p) {
    const L = p.length || 1000;
    const W = 900, x = (m) => 130 + (m / L) * (W - 150);
    let svg = '';
    const tick = L > 5000 ? 1000 : 500;
    for (let m = 0; m <= L; m += tick) svg += `<line x1="${x(m)}" x2="${x(m)}" y1="24" y2="${30 + LAYERS.length * 34}" class="grid-line"/><text x="${x(m)}" y="16" text-anchor="middle">${ch(m)}</text>`;
    LAYERS.forEach((l, i) => {
      const y = 30 + i * 34;
      const cov = coverage(p.id, l);
      const done = cov.reduce((a, [f, t]) => a + Math.min(t, L) - f, 0);
      svg += `<text x="0" y="${y + 18}" style="font-weight:600;fill:var(--ink)">${l}</text><rect x="${x(0)}" y="${y + 6}" width="${x(L) - x(0)}" height="18" rx="4" fill="var(--bg)" stroke="var(--line)"/>`;
      cov.forEach(([f, t]) => { svg += `<rect x="${x(f)}" y="${y + 6}" width="${Math.max(2, x(Math.min(t, L)) - x(f))}" height="18" rx="3" fill="var(--c${(i % 4) + 1})"><title>${l}: Ch ${ch(f)} – ${ch(t)}</title></rect>`; });
      svg += `<text x="${W - 4}" y="${y + 19}" text-anchor="end" style="fill:var(--ink)">${pct(done / L)}</text>`;
    });
    const log = S().chainage.filter((c) => c.project === p.id).sort((a, b) => b.date.localeCompare(a.date));
    return card(`Road length Ch ${ch(0)} – ${ch(L)} (${num(L / 1000, 1)} km, ${p.width} m wide)`, `<div class="table-wrap"><svg class="chart" viewBox="0 0 ${W} ${40 + LAYERS.length * 34}" style="min-width:640px">${svg}</svg></div>
      <p class="muted small">Each bar shows completed sections per layer along the road. Recording a section also updates the matching BOQ quantity (length × width).</p>`,
    { actions: `<button class="btn primary sm" data-act="addChainage" data-p="${p.id}">+ Record section</button>` }) + '<div class="mt">' +
      card('Section log', table([
        { h: 'Date', f: (c) => fdate(c.date) },
        { h: 'Layer', f: (c) => c.layer },
        { h: 'From', f: (c) => 'Ch ' + ch(c.from) },
        { h: 'To', f: (c) => 'Ch ' + ch(c.to) },
        { h: 'Length', num: true, f: (c) => `${num(c.to - c.from)} m` },
        { h: 'Side', f: (c) => c.side || 'Both' },
        { h: 'Area', num: true, f: (c) => `${num((c.to - c.from) * p.width)} m²` },
      ], log, { empty: 'No sections recorded yet.' }), { flush: true }) + '</div>';
  },

  cashflow(p) {
    const c = Calc.project(p);
    const start = new Date(p.start), end = new Date(p.end);
    const months = [];
    const m = new Date(start.getFullYear(), start.getMonth(), 1);
    while (m <= end || months.length < 2) { months.push(new Date(m)); m.setMonth(m.getMonth() + 1); }
    months.push(new Date(m), new Date(m.getFullYear(), m.getMonth() + 1, 1)); // payment lag after completion
    const n = months.length - 2;
    // S-curve: cumulative share of work by month i
    const sc = (i) => (i <= 0 ? 0 : i >= n ? 1 : (1 - Math.cos(Math.PI * i / n)) / 2);
    const ret = S().company.retentionPct / 100;
    const lbl = months.map((d) => d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }));
    const cost = months.map((_, i) => c.budget * sc(i + 1));
    const income = months.map((_, i) => c.revised * (1 - ret) * sc(i - 1)); // certified one month after work, paid a month later
    const todayIdx = months.findIndex((d) => d.toISOString().slice(0, 7) >= today().slice(0, 7));
    const certified = S().ipcs.filter((i) => i.project === p.id && ['Certified', 'Paid'].includes(i.status)).reduce((a, i) => Math.max(a, i.cumWork), 0) * (1 - ret)
      + S().invoices.filter((i) => i.project === p.id && i.milestone).reduce((a, i) => a + i.net, 0);
    const actualCost = months.map((_, i) => (i === todayIdx ? c.actual : null));
    const actualIn = months.map((_, i) => (i === todayIdx ? certified : null));
    const net = income.map((v, i) => v - cost[i]);
    const peak = Math.min(...net);
    const rows = months.map((d, i) => ({ l: lbl[i], cost: cost[i] - (cost[i - 1] || 0), inc: income[i] - (income[i - 1] || 0), net: net[i] }));
    return `<div class="grid kpis">${kpi('Planned peak funding', `<span class="neg">${aed(short(-peak))}</span>`, 'Most negative cumulative cash')}${kpi('Cost to date', aed(short(c.actual)), `Plan at this date ${short(cost[todayIdx] || 0)}`)}${kpi('Certified to date (after retention)', aed(short(certified)), `Plan ${short(income[todayIdx] || 0)}`)}</div>
      <div class="mt">${card('Cumulative cash plan vs actual (AED)', Chart.line(lbl, [
        { name: 'Planned cost', color: 'var(--c1)', values: cost },
        { name: 'Planned income (after retention, 2-month lag)', color: 'var(--c3)', values: income },
        { name: 'Actual cost', color: 'var(--bad)', values: actualCost },
        { name: 'Actual certified income', color: 'var(--c2)', values: actualIn },
      ], { marker: todayIdx >= 0 ? todayIdx : null }) + '<p class="muted small">Plan follows an S-curve over the programme. Dots show actual cost and certified income at the current month.</p>')}</div>
      <div class="mt">${card('Monthly plan', table([
        { h: 'Month', f: (r) => r.l },
        { h: 'Cost out', num: true, f: (r) => num(r.cost) },
        { h: 'Income in', num: true, f: (r) => num(r.inc) },
        { h: 'Cumulative net', num: true, f: (r) => `<span class="${r.net < 0 ? 'neg' : 'pos'}">${num(r.net)}</span>` },
      ], rows), { flush: true })}</div>`;
  },

  documents(p) {
    const docs = S().documents.filter((d) => d.project === p.id);
    const st = { Approved: 'ok', 'Approved with comments': 'info', 'For approval': 'warn', Rejected: 'bad', Info: 'muted' };
    return card('Document control', table([
      { h: 'Type', f: (d) => d.type },
      { h: 'Reference', f: (d) => `<span class="strong">${esc(d.ref)}</span>` },
      { h: 'Title', f: (d) => esc(d.title), cls: 'wrap' },
      { h: 'Rev', f: (d) => d.rev },
      { h: 'Date', f: (d) => fdate(d.date) },
      { h: 'Status', f: (d) => `<span class="badge b-${st[d.status] || 'muted'}">${d.status}</span>` },
      { h: 'File', f: (d) => (d.file ? `<span class="small">📎 ${esc(d.file)}</span>` : '<span class="muted small">—</span>') },
      { h: '', f: (d) => `<div class="btn-row"><button class="btn sm" data-act="newRevision" data-id="${d.id}">New rev</button>${d.status === 'For approval' ? `<button class="btn sm ok" data-act="docStatus" data-id="${d.id}" data-v="Approved">Approved</button><button class="btn sm" data-act="docStatus" data-id="${d.id}" data-v="Approved with comments">With comments</button>` : ''}</div>` },
    ], docs.sort((a, b) => b.date.localeCompare(a.date))), { flush: true, actions: `<button class="btn primary sm" data-act="newDoc" data-p="${p.id}">+ Document / transmittal</button>` }) +
      '<p class="muted small">This demo stores the file name and size only. A hosted version would store the files themselves.</p>';
  },
});

Actions.addChainage = (d) => {
  const p = project(d.p);
  openModal(`Record completed section — ${p.id}`, [
    { name: 'layer', label: 'Layer', type: 'select', options: options(LAYERS.map((l) => [l, l])) },
    { name: 'side', label: 'Carriageway', type: 'select', options: options(['Both', 'Eastbound', 'Westbound', 'Northbound', 'Southbound'].map((x) => [x, x])) },
    { name: 'from', label: 'From chainage (e.g. 2+400)', value: '0+000' },
    { name: 'to', label: 'To chainage', value: '0+500' },
    { name: 'date', label: 'Date', type: 'date', value: today() },
    { name: 'boq', label: 'Update BOQ quantity', type: 'select', options: options([['yes', 'Yes — add length × width'], ['no', 'No']], 'yes') },
  ], (x) => {
    const from = parseCh(x.from), to = parseCh(x.to);
    if (!(to > from) || from < 0 || to > p.length) { alert(`Enter a valid range within Ch 0+000 – ${ch(p.length)}.`); return false; }
    S().chainage.push({ id: nextId('CH'), project: p.id, layer: x.layer, from, to, date: x.date, side: x.side });
    if (x.boq === 'yes') {
      const code = S().layerMap[x.layer];
      const b = p.boq.find((l) => l.code === code);
      if (b) {
        const factor = x.layer === 'Road markings' ? 0.75 : (x.side === 'Both' ? p.width : p.width / 2);
        b.doneQty = Math.min(b.qty, b.doneQty + (to - from) * factor);
        if (x.layer === 'Asphalt base') { const pr = p.boq.find((l) => l.code === '4.01'); if (pr) pr.doneQty = Math.min(pr.qty, pr.doneQty + (to - from) * factor); }
        if (x.layer === 'Wearing course') { const tk = p.boq.find((l) => l.code === '4.03'); if (tk) tk.doneQty = Math.min(tk.qty, tk.doneQty + (to - from) * factor); }
        Pages.projects.syncTasks(p);
      }
    }
  }, { submit: 'Record' });
};
Actions.newDoc = (d) => openModal('New document', [
  { name: 'type', label: 'Type', type: 'select', options: options(['Drawing', 'Shop drawing', 'Method statement', 'Material submittal', 'Transmittal', 'Letter', 'Minutes of meeting', 'Site photo'].map((x) => [x, x])) },
  { name: 'ref', label: 'Reference no.' },
  { name: 'title', label: 'Title', full: true },
  { name: 'rev', label: 'Revision', value: '0' },
  { name: 'status', label: 'Status', type: 'select', options: options(['For approval', 'Approved', 'Approved with comments', 'Rejected', 'Info'].map((x) => [x, x])) },
], (x) => {
  const f = document.getElementById('doc-file')?.files?.[0];
  S().documents.unshift({ id: nextId('DOC'), project: d.p, date: today(), ...x, file: f ? `${f.name} (${Math.round(f.size / 1024)} KB)` : '' });
}, { html: '<label class="field"><span>Attach file (optional)</span><input type="file" id="doc-file"></label>' });
Actions.newRevision = (d) => {
  const doc = S().documents.find((x) => x.id === d.id);
  const next = /^\d+$/.test(doc.rev) ? String(+doc.rev + 1) : String.fromCharCode(doc.rev.charCodeAt(0) + 1);
  openModal(`New revision — ${doc.ref}`, [{ name: 'rev', label: 'Revision', value: next }, { name: 'note', label: 'What changed', full: true, required: false }], (x) => {
    S().documents.unshift({ ...doc, id: nextId('DOC'), rev: x.rev, date: today(), status: 'For approval', title: doc.title + (x.note ? ` — ${x.note}` : ''), file: '' });
    doc.status = doc.status === 'For approval' ? 'Superseded' : doc.status;
  });
};
Actions.docStatus = (d) => { S().documents.find((x) => x.id === d.id).status = d.v; commit('Document status updated'); };
