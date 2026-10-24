Pages.quality = {
  title: 'QA/QC & HSE',
  render(args) {
    const tab = args[0] || 'inspections';
    return tabs('quality', [['inspections', 'Inspection requests'], ['tests', 'Lab & field tests'], ['ncr', 'Non-conformances'], ['hse', 'HSE']], tab) + (this[tab] || this.inspections).call(this);
  },
  inspections() {
    const ir = S().inspections;
    return `<div class="grid kpis">${kpi('Open IRs', ir.filter((i) => i.status === 'Open').length)}${kpi('Approved', ir.filter((i) => i.status === 'Approved').length)}${kpi('Rejected', ir.filter((i) => i.status === 'Rejected').length)}${kpi('First-time approval', pct(ir.filter((i) => i.status === 'Approved').length / Math.max(1, ir.filter((i) => i.status !== 'Open').length)))}</div><div class="mt">` +
      card('Inspection requests to the consultant', table([
        { h: 'IR', f: (i) => i.id },
        { h: 'Date', f: (i) => fdate(i.date) },
        { h: 'Project', f: (i) => i.project },
        { h: 'Activity', f: (i) => esc(i.activity), cls: 'wrap' },
        { h: 'Location', f: (i) => esc(i.location) },
        { h: 'Status', f: (i) => badge(i.status) + (i.comment ? `<div class="small muted" style="white-space:normal;max-width:260px">${esc(i.comment)}</div>` : '') },
        { h: '', f: (i) => (i.status === 'Open' ? `<div class="btn-row"><button class="btn sm ok" data-act="irResult" data-id="${i.id}" data-v="Approved">Approved</button><button class="btn sm bad" data-act="irResult" data-id="${i.id}" data-v="Rejected">Rejected</button></div>` : '') },
      ], ir.slice().sort((a, b) => b.date.localeCompare(a.date))), { flush: true, actions: '<button class="btn primary sm" data-act="newIr">+ Inspection request</button>' }) + '</div>';
  },
  tests() {
    const t = S().labTests;
    return `<div class="grid kpis">${kpi('Tests logged', t.length)}${kpi('Pass rate', pct(t.filter((x) => x.pass).length / Math.max(1, t.length)))}${kpi('Failures', `<span class="neg">${t.filter((x) => !x.pass).length}</span>`)}</div><div class="mt">` +
      card('Test results', table([
        { h: 'Test', f: (x) => x.id },
        { h: 'Date', f: (x) => fdate(x.date) },
        { h: 'Project', f: (x) => x.project },
        { h: 'Type', f: (x) => esc(x.type), cls: 'wrap' },
        { h: 'Location / sample', f: (x) => esc(x.location) },
        { h: 'Result', num: true, f: (x) => `<b>${x.result}</b>` },
        { h: 'Spec', f: (x) => esc(x.spec) },
        { h: '', f: (x) => (x.pass ? '<span class="badge b-ok">Pass</span>' : '<span class="badge b-bad">Fail</span>') },
      ], t.slice().sort((a, b) => b.date.localeCompare(a.date))), { flush: true, actions: '<button class="btn primary sm" data-act="newTest">+ Test result</button>' }) + '</div>';
  },
  ncr() {
    return card('Non-conformance reports', table([
      { h: 'NCR', f: (n) => n.id },
      { h: 'Date', f: (n) => fdate(n.date) },
      { h: 'Project', f: (n) => n.project },
      { h: 'Non-conformance', f: (n) => esc(n.desc), cls: 'wrap' },
      { h: 'Raised by', f: (n) => esc(n.raisedBy) },
      { h: 'Corrective action', f: (n) => esc(n.action), cls: 'wrap' },
      { h: 'Status', f: (n) => (n.status === 'Open' ? `<button class="btn sm" data-act="closeNcr" data-id="${n.id}">Close out</button>` : badge('Closed')) },
    ], S().ncrs), { flush: true, actions: '<button class="btn primary sm" data-act="newNcr">+ NCR</button>' });
  },
  hse() {
    const s = S();
    const daysSince = days(s.hseStats.lastLti, today());
    const types = ['Near miss', 'First aid', 'Medical treatment', 'Lost time injury', 'Property damage', 'Environmental'];
    return `<div class="grid kpis">${kpi('Days without LTI', daysSince, `since ${fdate(s.hseStats.lastLti)}`)}${kpi('Safe man-hours', num(s.hseStats.manHoursSinceLti))}${kpi('Toolbox talks (YTD)', s.hseStats.toolboxTalks)}${kpi('Open actions', s.incidents.filter((i) => i.status === 'Open').length)}</div>
      <div class="grid cols-2 mt">
      ${card('Incidents by type', table([{ h: 'Type', f: (t) => t }, { h: 'Count', num: true, f: (t) => s.incidents.filter((i) => i.type === t).length }], types), { flush: true })}
      ${card('Quick log', `<div class="btn-row"><button class="btn primary" data-act="newIncident">Report incident / near miss</button><button class="btn" data-act="toolbox">Record toolbox talk</button></div><p class="muted small">Reporting near misses early is the best predictor of avoiding injuries. Every report is visible to the project manager and HSE officer.</p>`)}
      </div><div class="mt">` +
      card('Incident register', table([
        { h: 'Ref', f: (i) => i.id },
        { h: 'Date', f: (i) => fdate(i.date) },
        { h: 'Project', f: (i) => i.project },
        { h: 'Type', f: (i) => `<span class="badge ${/Lost|Medical/.test(i.type) ? 'b-bad' : i.type === 'Near miss' ? 'b-info' : 'b-warn'}">${i.type}</span>` },
        { h: 'What happened', f: (i) => esc(i.desc), cls: 'wrap' },
        { h: 'Action', f: (i) => esc(i.action), cls: 'wrap' },
        { h: 'Status', f: (i) => (i.status === 'Open' ? `<button class="btn sm" data-act="closeIncident" data-id="${i.id}">Close</button>` : badge('Closed')) },
      ], s.incidents.slice().sort((a, b) => b.date.localeCompare(a.date))), { flush: true }) + '</div>';
  },
};

Actions.newIr = (d = {}) => openModal('Inspection request', [
  { name: 'project', label: 'Project', type: 'select', options: projOptions(d.p, (p) => p.status === 'Active'), full: true },
  { name: 'activity', label: 'Activity to inspect', full: true },
  { name: 'location', label: 'Location / chainage', value: 'Ch ' },
  { name: 'date', label: 'Inspection date', type: 'date', value: addDays(today(), 1) },
], (x) => { S().inspections.unshift({ id: `IR-${x.project.slice(2)}-${++S().seq}`, ...x, status: 'Open' }); });
Actions.irResult = (d) => {
  const i = S().inspections.find((x) => x.id === d.id);
  if (d.v === 'Rejected') {
    openModal(`Rejected — ${i.id}`, [{ name: 'comment', label: "Consultant's comment", full: true }, { name: 'ncr', label: 'Raise NCR?', type: 'select', options: options([['yes', 'Yes'], ['no', 'No']], 'yes') }], (x) => {
      i.status = 'Rejected'; i.comment = x.comment;
      if (x.ncr === 'yes') S().ncrs.unshift({ id: nextId('NCR-' + i.project.slice(2)), project: i.project, date: today(), desc: `${i.activity} at ${i.location}: ${x.comment}`, raisedBy: 'Consultant', action: '', status: 'Open' });
    });
  } else { i.status = 'Approved'; commit(`${i.id} approved`); }
};
Actions.newTest = () => openModal('Test result', [
  { name: 'project', label: 'Project', type: 'select', options: projOptions('', (p) => p.status === 'Active'), full: true },
  { name: 'type', label: 'Test', type: 'select', options: options(['Field density – sub-base (% MDD)', 'Field density – road base (% MDD)', 'Core – asphalt thickness (mm)', 'Core – asphalt compaction (% Marshall)', 'Marshall stability (kN)', 'Bitumen content (%)', 'Concrete cube 28-day (MPa)'].map((t) => [t, t])), full: true },
  { name: 'location', label: 'Location / sample' },
  { name: 'result', label: 'Result', type: 'number', step: 'any' },
  { name: 'min', label: 'Minimum required', type: 'number', step: 'any' },
], (x) => { S().labTests.unshift({ id: nextId('LT'), date: today(), project: x.project, type: x.type, location: x.location, result: x.result, spec: '≥ ' + x.min, pass: x.result >= x.min }); });
Actions.newNcr = () => openModal('Non-conformance report', [
  { name: 'project', label: 'Project', type: 'select', options: projOptions('', (p) => p.status !== 'Tender'), full: true },
  { name: 'desc', label: 'What is non-conforming', type: 'textarea', full: true },
  { name: 'raisedBy', label: 'Raised by', type: 'select', options: options(['Internal QA', 'Consultant', 'Client'].map((x) => [x, x])) },
  { name: 'action', label: 'Proposed corrective action', full: true, required: false },
], (x) => { S().ncrs.unshift({ id: nextId('NCR-' + x.project.slice(2)), date: today(), ...x, status: 'Open' }); });
Actions.closeNcr = (d) => { const n = S().ncrs.find((x) => x.id === d.id); n.status = 'Closed'; commit(`${n.id} closed`); };
Actions.newIncident = (d = {}) => openModal('Report incident / near miss', [
  { name: 'project', label: 'Project', type: 'select', options: projOptions(d.p, (p) => p.status !== 'Tender'), full: true },
  { name: 'type', label: 'Type', type: 'select', options: options(['Near miss', 'First aid', 'Medical treatment', 'Lost time injury', 'Property damage', 'Environmental'].map((x) => [x, x])) },
  { name: 'date', label: 'Date', type: 'date', value: today() },
  { name: 'desc', label: 'What happened', type: 'textarea', full: true },
  { name: 'action', label: 'Immediate action taken', full: true, required: false },
], (x) => {
  S().incidents.unshift({ id: nextId('HSE'), ...x, status: 'Open' });
  if (x.type === 'Lost time injury') { S().hseStats.lastLti = x.date; S().hseStats.manHoursSinceLti = 0; }
});
Actions.closeIncident = (d) => { S().incidents.find((x) => x.id === d.id).status = 'Closed'; commit('Incident closed'); };
Actions.toolbox = () => openModal('Toolbox talk', [
  { name: 'topic', label: 'Topic', value: 'Working near live traffic', full: true },
  { name: 'attendees', label: 'Attendees', type: 'number', value: 40 },
], () => { S().hseStats.toolboxTalks += 1; });
