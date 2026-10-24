Pages.hr = {
  title: 'HR & Payroll',
  month: '2026-10',
  render(args) {
    const tab = args[0] || 'employees';
    return tabs('hr', [['employees', 'Employees'], ['timesheets', 'Timesheets & overtime'], ['leave', 'Leave'], ['payroll', 'Payroll & WPS'], ['eosb', 'End-of-service provision'], ['documents', 'Documents & expiry'], ['camps', 'Accommodation']], tab) + (this[tab] || this.employees).call(this);
  },
  employees() {
    const es = S().employees;
    const byDept = {};
    es.forEach((e) => { byDept[e.dept] = (byDept[e.dept] || 0) + 1; });
    return `<div class="grid kpis">${kpi('Headcount', es.length)}${kpi('Monthly fixed payroll', aed(short(es.reduce((a, e) => a + e.basic + e.housing + e.transport, 0))))}${Object.entries(byDept).slice(0, 4).map(([d, n]) => kpi(d, n)).join('')}</div><div class="mt">` +
      card('Employee register', table([
        { h: 'ID', f: (e) => e.id },
        { h: 'Name', f: (e) => `<span class="strong">${esc(e.name)}</span>` },
        { h: 'Designation', f: (e) => esc(e.role) },
        { h: 'Department', f: (e) => esc(e.dept) },
        { h: 'Assigned to', f: (e) => e.project || '<span class="muted">Head office</span>' },
        { h: 'Nationality', f: (e) => esc(e.nationality) },
        { h: 'Joined', f: (e) => fdate(e.joined) },
        { h: 'Basic', num: true, f: (e) => num(e.basic) },
        { h: 'Total package', num: true, f: (e) => num(e.basic + e.housing + e.transport) },
        { h: 'Leave bal.', num: true, f: (e) => `${num(e.leaveBalance)} d` },
        { h: '', f: (e) => `<button class="btn sm" data-act="editEmp" data-id="${e.id}">Edit</button>` },
      ], es), { flush: true, actions: '<button class="btn primary sm" data-act="editEmp">+ Employee</button>' }) + '</div>';
  },
  timesheets() {
    const es = S().employees;
    const tot = es.reduce((a, e) => { const p = Calc.pay(e); a.ot += p.t.ot + p.t.otHoliday; a.pay += p.otPay; return a; }, { ot: 0, pay: 0 });
    return `<div class="grid kpis">${kpi('Period', 'Oct 2026')}${kpi('Overtime hours', num(tot.ot))}${kpi('Overtime cost', aed(num(tot.pay)))}</div>
      <p class="muted small">Overtime: normal days at 125% of basic hourly rate, rest days / public holidays / night work at 150%. Hourly rate = basic ÷ 30 ÷ 8. Edit hours directly.</p>` +
      card('Monthly timesheet', table([
        { h: 'Employee', f: (e) => `${esc(e.name)} <span class="muted small">${esc(e.role)}</span>` },
        { h: 'Project', f: (e) => e.project || '—' },
        { h: 'Normal hrs', num: true, f: (e) => this.hrsInput(e, 'normal') },
        { h: 'OT 125%', num: true, f: (e) => this.hrsInput(e, 'ot') },
        { h: 'OT 150%', num: true, f: (e) => this.hrsInput(e, 'otHoliday') },
        { h: 'Unpaid days', num: true, f: (e) => this.hrsInput(e, 'unpaidDays') },
        { h: 'Hourly rate', num: true, f: (e) => num(Calc.hourly(e), 2) },
        { h: 'OT pay', num: true, f: (e) => num(Calc.pay(e).otPay, 2) },
      ], es), { flush: true });
  },
  hrsInput(e, k) {
    return `<input class="inline" style="width:80px;text-align:right" type="number" min="0" step="0.5" value="${S().timesheets[e.id][k]}" data-change="setHours" data-id="${e.id}" data-k="${k}">`;
  },
  leave() {
    return card('Leave requests', table([
      { h: 'Ref', f: (l) => l.id },
      { h: 'Employee', f: (l) => esc(emp(l.emp).name) },
      { h: 'Type', f: (l) => l.type },
      { h: 'From', f: (l) => fdate(l.from) },
      { h: 'To', f: (l) => fdate(l.to) },
      { h: 'Days', num: true, f: (l) => l.days },
      { h: 'Balance', num: true, f: (l) => `${num(emp(l.emp).leaveBalance)} d` },
      { h: 'Status', f: (l) => badge(l.status) },
      { h: '', f: (l) => (l.status === 'Pending' ? `<div class="btn-row"><button class="btn sm ok" data-act="decide" data-coll="leaves" data-field="status" data-id="${l.id}" data-v="Approved">Approve</button><button class="btn sm bad" data-act="decide" data-coll="leaves" data-field="status" data-id="${l.id}" data-v="Rejected">Reject</button></div>` : '') },
    ], S().leaves), { flush: true, actions: '<button class="btn primary sm" data-act="newLeave">+ Leave request</button>' }) +
      '<p class="muted small">Annual leave: 30 calendar days per year after one year of service (2 days per month in the first year). Approved annual leave deducts from the balance.</p>';
  },
  payroll() {
    const es = S().employees.filter((e) => e.status === 'Active');
    const rows = es.map((e) => ({ e, p: Calc.pay(e) }));
    const total = rows.reduce((a, r) => a + r.p.gross, 0);
    return `<div class="grid kpis">${kpi('Payroll month', 'October 2026')}${kpi('Employees paid', rows.length)}${kpi('Gross payroll', aed(num(total)))}${kpi('Payroll account', aed(num(S().bank.find((b) => b.id === 'BA-2').balance)))}</div><div class="mt">` +
      card('Payroll register', table([
        { h: 'Employee', f: (r) => esc(r.e.name) },
        { h: 'Basic', num: true, f: (r) => num(r.e.basic) },
        { h: 'Housing', num: true, f: (r) => num(r.e.housing) },
        { h: 'Transport', num: true, f: (r) => num(r.e.transport) },
        { h: 'Overtime', num: true, f: (r) => num(r.p.otPay, 2) },
        { h: 'Deductions', num: true, f: (r) => (r.p.deduction ? `(${num(r.p.deduction, 2)})` : '—') },
        { h: 'Net pay', num: true, f: (r) => `<b>${num(r.p.gross, 2)}</b>` },
        { h: 'IBAN', f: (r) => `<span class="small muted">${r.e.iban}</span>` },
      ], rows, { foot: `<tr class="total"><td>Total</td><td class="num">${num(rows.reduce((a, r) => a + r.e.basic, 0))}</td><td class="num">${num(rows.reduce((a, r) => a + r.e.housing, 0))}</td><td class="num">${num(rows.reduce((a, r) => a + r.e.transport, 0))}</td><td class="num">${num(rows.reduce((a, r) => a + r.p.otPay, 0), 2)}</td><td class="num">(${num(rows.reduce((a, r) => a + r.p.deduction, 0), 2)})</td><td class="num">${num(total, 2)}</td><td></td></tr>` }),
      { flush: true, actions: '<button class="btn sm" data-act="payrollCsv">Export payslips (CSV)</button><button class="btn sm" data-act="wps">Generate WPS SIF file</button>' + (S().payrollRuns.includes('2026-10') ? '<span class="badge b-ok">October posted</span>' : '<button class="btn primary sm" data-act="postPayroll">Post payroll to ledger</button>') }) +
      '</div><p class="muted small">The SIF export follows the common EDR/SCR record layout. Check field formats with your WPS agent bank before uploading.</p>';
  },
  eosb() {
    const rows = S().employees.map((e) => ({ e, x: Calc.eosb(e) }));
    const total = rows.reduce((a, r) => a + r.x.amount, 0);
    return `<div class="grid kpis">${kpi('Total EOSB provision', aed(num(total)), `as of ${fdate(today())}`)}${kpi('Monthly accrual (approx.)', aed(num(rows.reduce((a, r) => a + r.e.basic / 30 * (r.x.years >= 5 ? 30 : 21) / 12, 0))))}</div>
      <p class="muted small">Gratuity: 21 days' basic salary per year for the first five years, 30 days per year after that, capped at two years' total wage. Not payable under one year of service.</p>` +
      card('End-of-service gratuity provision', table([
        { h: 'Employee', f: (r) => esc(r.e.name) },
        { h: 'Joined', f: (r) => fdate(r.e.joined) },
        { h: 'Service (yrs)', num: true, f: (r) => r.x.years.toFixed(2) },
        { h: 'Basic', num: true, f: (r) => num(r.e.basic) },
        { h: 'Daily basic', num: true, f: (r) => num(r.e.basic / 30, 2) },
        { h: 'Accrued gratuity', num: true, f: (r) => `<b>${num(r.x.amount, 2)}</b>` },
      ], rows, { foot: `<tr class="total"><td colspan="5">Total</td><td class="num">${num(total, 2)}</td></tr>` }), { flush: true });
  },
};

Actions.setHours = (v, d) => { S().timesheets[d.id][d.k] = Math.max(0, Number(v) || 0); commit(); };
Actions.editEmp = (d) => {
  const e = d.id ? emp(d.id) : { name: '', role: '', dept: 'Projects', nationality: '', joined: today(), basic: 0, housing: 0, transport: 0, project: '' };
  openModal(d.id ? `Edit ${e.name}` : 'New employee', [
    { name: 'name', label: 'Full name', value: e.name },
    { name: 'role', label: 'Designation', value: e.role },
    { name: 'dept', label: 'Department', type: 'select', options: options(['Projects', 'Plant', 'Stores', 'Finance', 'Commercial', 'Procurement', 'Admin'].map((x) => [x, x]), e.dept) },
    { name: 'project', label: 'Assigned project', type: 'select', options: '<option value="">Head office</option>' + projOptions(e.project) },
    { name: 'nationality', label: 'Nationality', value: e.nationality },
    { name: 'joined', label: 'Joining date', type: 'date', value: e.joined },
    { name: 'basic', label: 'Basic salary (AED)', type: 'number', value: e.basic },
    { name: 'housing', label: 'Housing allowance', type: 'number', value: e.housing },
    { name: 'transport', label: 'Transport allowance', type: 'number', value: e.transport },
    { name: 'iban', label: 'IBAN', value: e.iban || 'AE', full: true },
  ], (x) => {
    if (d.id) Object.assign(e, x);
    else {
      const id = 'E-' + (1000 + S().employees.length + 1);
      S().employees.push({ id, ...x, labourCard: String(10000000000000 + Date.now() % 1e9), leaveBalance: 0, status: 'Active' });
      S().timesheets[id] = { normal: 208, ot: 0, otHoliday: 0, unpaidDays: 0 };
    }
  });
};
Actions.newLeave = () => openModal('Leave request', [
  { name: 'emp', label: 'Employee', type: 'select', options: options(S().employees.map((e) => [e.id, e.name])) },
  { name: 'type', label: 'Type', type: 'select', options: options(['Annual', 'Sick', 'Unpaid', 'Compassionate', 'Hajj'].map((x) => [x, x])) },
  { name: 'from', label: 'From', type: 'date', value: addDays(today(), 14) },
  { name: 'to', label: 'To', type: 'date', value: addDays(today(), 27) },
], (x) => {
  if (x.to < x.from) { alert('End date is before start date.'); return false; }
  S().leaves.unshift({ id: nextId('LV'), ...x, days: days(x.from, x.to) + 1, status: 'Pending' });
});
Actions.wps = () => {
  const s = S();
  const c = s.company;
  const [y, m] = Pages.hr.month.split('-');
  const start = `${y}-${m}-01`;
  const end = new Date(+y, +m, 0).toISOString().slice(0, 10);
  const es = s.employees.filter((e) => e.status === 'Active');
  const lines = es.map((e) => {
    const p = Calc.pay(e);
    const fixed = (p.fixed - p.deduction).toFixed(2);
    return ['EDR', e.labourCard, c.bankRoutingCode, e.iban, start, end, 30 - p.t.unpaidDays, fixed, p.otPay.toFixed(2), p.t.unpaidDays].join(',');
  });
  const total = es.reduce((a, e) => a + Calc.pay(e).gross, 0).toFixed(2);
  const now = new Date();
  lines.push(['SCR', c.molEstablishmentId, c.bankRoutingCode, today(), String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0'), m + y, es.length, total, 'AED', 'JRC-PAYROLL'].join(','));
  download(`${c.molEstablishmentId}${y.slice(2)}${m}${String(now.getDate()).padStart(2, '0')}.SIF`, lines.join('\r\n'));
  toast('WPS SIF file generated');
};
Actions.payrollCsv = () => {
  const rows = [['Employee ID', 'Name', 'Basic', 'Housing', 'Transport', 'OT hours 125%', 'OT hours 150%', 'OT pay', 'Deductions', 'Net pay', 'IBAN']]
    .concat(S().employees.map((e) => { const p = Calc.pay(e); return [e.id, e.name, e.basic, e.housing, e.transport, p.t.ot, p.t.otHoliday, p.otPay.toFixed(2), p.deduction.toFixed(2), p.gross.toFixed(2), e.iban]; }));
  download('payroll-2026-10.csv', toCSV(rows), 'text/csv');
};
