// General ledger: journals are derived from operational records (invoices, bills, payroll, stock, plant hire…)
// plus manual journals. Opening balances are back-solved so bank and stock agree with the live figures.
const Ledger = {
  yearStart: '2026-01-01',
  bankAcc: { 'BA-1': '1010', 'BA-2': '1020', 'BA-3': '1030', 'BA-4': '1040' },
  siteDepts: ['Projects', 'Plant', 'Stores'],

  acc(code) { return S().coa.find((a) => a.code === code) || { code, name: code, type: 'Asset' }; },
  monthEnds(to) {
    const out = [];
    for (let m = 0; m < 12; m++) {
      const d = new Date(Date.UTC(2026, m + 1, 0)).toISOString().slice(0, 10);
      if (d <= to) out.push(d);
    }
    return out;
  },

  build() {
    const s = S(), J = [];
    const vr = s.company.vatRate / 100;
    const r2 = (n) => Math.round(n * 100) / 100;
    const push = (j) => {
      j.lines = j.lines.filter((l) => r2(l.dr || 0) || r2(l.cr || 0)).map((l) => ({ acc: l.acc, dr: r2(l.dr || 0), cr: r2(l.cr || 0), project: l.project || '' }));
      const d = j.lines.reduce((a, l) => a + l.dr - l.cr, 0);
      if (Math.abs(d) >= 0.005) j.lines.push({ acc: '6400', dr: d < 0 ? r2(-d) : 0, cr: d > 0 ? r2(d) : 0, project: '' }); // rounding
      if (j.date > today()) j.date = today(); // nothing is posted into the future
      J.push(j);
    };
    const ys = this.yearStart;

    // Sales invoices and receipts
    s.invoices.filter((i) => i.date >= ys).forEach((inv) => {
      const ipc = s.ipcs.find((x) => x.id === inv.ipc);
      const vat = inv.net * vr;
      const lines = [{ acc: '1100', dr: inv.net + vat }, { acc: '2100', cr: vat }];
      if (ipc) {
        const c = Calc.ipc(ipc);
        lines.push({ acc: '1150', dr: c.retention }, { acc: '2200', dr: c.advance }, { acc: '4000', cr: inv.net + c.retention + c.advance, project: inv.project });
      } else lines.push({ acc: '4000', cr: inv.net, project: inv.project });
      push({ id: inv.id, date: inv.date, entity: 'JRC', memo: `Tax invoice to ${inv.client}`, src: 'Sales', link: '#/sales/invoices', lines });
      const rec = s.receipts.filter((r) => r.inv === inv.id);
      const recNet = rec.reduce((a, r) => a + r.amount / (1 + vr), 0);
      const earlier = inv.paid - recNet;
      if (earlier > 0.5) push({ id: 'RC-' + inv.id.slice(4), date: inv.due < today() ? inv.due : today(), entity: 'JRC', memo: `Receipt from ${inv.client}`, src: 'Receipts', link: '#/sales/invoices', lines: [{ acc: '1010', dr: earlier * (1 + vr) }, { acc: '1100', cr: earlier * (1 + vr) }] });
      rec.forEach((r) => push({ id: r.id, date: r.date, entity: 'JRC', memo: `Receipt from ${inv.client}`, src: 'Receipts', link: '#/sales/invoices', lines: [{ acc: this.bankAcc[r.bank] || '1010', dr: r.amount }, { acc: '1100', cr: r.amount }] }));
    });

    // Supplier & subcontractor bills and payments
    s.payables.filter((b) => b.date >= ys).forEach((b) => {
      if (b.source !== 'subcert') {
        const net = b.amount / (1 + vr), vat = b.amount - net;
        const debit = b.grn ? '1200' : b.expense || (b.acc === '2050' ? '5100' : '5000');
        const po = s.pos.find((p) => p.id === b.ref);
        push({ id: b.id, date: b.date, entity: 'JRC', memo: `Bill ${b.ref} – ${supplierName(b.supplier)}`, src: 'Purchases', link: '#/finance/payables', lines: [{ acc: debit, dr: net, project: po?.project }, { acc: '1300', dr: vat }, { acc: b.acc || '2000', cr: b.amount }] });
      }
      if (b.reval) push({ id: 'FX-' + b.id, date: b.revalDate || today(), entity: 'JRC', memo: `FX revaluation ${b.id} (${b.currency})`, src: 'FX', link: '#/finance/currency', lines: [{ acc: '6400', dr: b.reval }, { acc: b.acc || '2000', cr: b.reval }] });
      if (b.paid) {
        const amt = b.amount + (b.reval || 0);
        push({ id: 'PY-' + b.id, date: b.paidDate || today(), entity: 'JRC', memo: `Payment to ${supplierName(b.supplier)}`, src: 'Payments', link: '#/finance/payables', lines: [{ acc: b.acc || '2000', dr: amt }, { acc: this.bankAcc[b.bank] || '1010', cr: amt }] });
      }
    });

    // Subcontractor certificates (approved or paid)
    s.subcontracts.forEach((sc) => sc.certs.filter((c) => ['Approved', 'Paid'].includes(c.status) && c.date >= ys).forEach((c) => {
      const x = Calc.subcert(sc, c);
      push({ id: `${sc.id}-C${c.no}`, date: c.date, entity: 'JRC', memo: `${sc.sub} certificate ${c.no}`, src: 'Subcontracts', link: '#/subcontracts', lines: [
        { acc: '5100', dr: x.thisWork - x.backcharge, project: sc.project }, { acc: '1300', dr: x.vat }, { acc: '2050', cr: x.net + x.vat }, { acc: '2060', cr: x.retention }] });
      const bill = s.payables.find((b) => b.source === 'subcert' && b.ref === `${sc.id} cert ${c.no}`);
      if (c.status === 'Paid' && !bill) push({ id: `PY-${sc.id}-C${c.no}`, date: addDays(c.date, 30) < today() ? addDays(c.date, 30) : today(), entity: 'JRC', memo: `Payment to ${sc.sub}`, src: 'Payments', link: '#/subcontracts', lines: [{ acc: '2050', dr: x.net + x.vat }, { acc: '1010', cr: x.net + x.vat }] });
    }));

    // Stock issued to projects (incl. asphalt plant consumption)
    s.stockTx.filter((t) => ['Issue', 'Production'].includes(t.type) && t.date >= ys).forEach((t) => {
      const v = t.qty * item(t.item).cost;
      push({ id: t.id, date: t.date, entity: 'JRC', memo: `${t.type === 'Production' ? 'Asphalt plant' : 'Issue'}: ${num(t.qty)} ${item(t.item).unit} ${item(t.item).name}`, src: 'Inventory', link: '#/warehouse/movements', lines: [{ acc: '5000', dr: v, project: t.project }, { acc: '1200', cr: v }] });
    });

    // Payroll runs
    s.payrollRuns.forEach((m) => {
      const [y, mo] = m.split('-').map(Number);
      const date = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
      let site = 0, office = 0;
      s.employees.forEach((e) => { if (e.joined > date) return; const g = m === '2026-10' ? Calc.pay(e).gross : e.basic + e.housing + e.transport + Calc.pay(e).otPay * 0.9; if (this.siteDepts.includes(e.dept)) site += g; else office += g; });
      push({ id: 'PR-' + m, date, entity: 'JRC', memo: `Payroll ${m} (WPS)`, src: 'Payroll', link: '#/hr/payroll', lines: [{ acc: '5200', dr: site }, { acc: '6000', dr: office }, { acc: '1020', cr: site + office }] });
    });
    const eosbYtd = s.employees.reduce((a, e) => a + Calc.eosb(e).amount - Calc.eosb(e, '2025-12-31').amount, 0);
    push({ id: 'EOSB-YTD', date: today(), entity: 'JRC', memo: 'End-of-service provision – year to date', src: 'Payroll', link: '#/hr/eosb', lines: [{ acc: '6300', dr: eosbYtd }, { acc: '2300', cr: eosbYtd }] });

    // Jan–Jul 2026 activity migrated from the previous system as monthly summaries
    const hist = s.cashflow.filter((m) => /^(Jan|Feb|Mar|Apr|May|Jun|Jul) 26$/.test(m.month));
    hist.forEach((m, i) => {
      const date = new Date(Date.UTC(2026, i + 1, 0)).toISOString().slice(0, 10);
      const rev = m.inflow * 1000 / (1 + vr), vOut = rev * vr;
      const cost = m.outflow * 1000 * 0.92 / (1 + vr), vIn = cost * vr;
      push({ id: 'MIG-' + date.slice(0, 7), date, entity: 'JRC', memo: `Migrated summary ${m.month}: certified revenue and direct costs`, src: 'Migrated', link: '#/accounting/journals', lines: [
        { acc: '1010', dr: rev + vOut - cost - vIn - (vOut - vIn) }, { acc: '4000', cr: rev }, { acc: '5000', dr: cost * 0.55 }, { acc: '5100', dr: cost * 0.3 }, { acc: '5400', dr: cost * 0.15 }] });
    });
    // Internal plant hire for months before daily logs started (Jan–Sep), with quarterly settlement
    const hireRate = s.equipment.filter((e) => e.entity === 'JPH' && e.rate).reduce((a, e) => a + e.rate, 0);
    this.monthEnds('2026-09-30').forEach((d) => {
      const amt = hireRate * 130;
      push({ id: 'IC-' + d.slice(0, 7), date: d, entity: 'JRC', ic: true, memo: `Plant hire from JPH ${d.slice(0, 7)} (monthly summary)`, src: 'Plant hire', link: '#/equipment/logs', lines: [{ acc: '5300', dr: amt }, { acc: '2700', cr: amt }] });
      push({ id: 'IC-' + d.slice(0, 7) + '-JPH', date: d, entity: 'JPH', ic: true, memo: `Plant hire to JRC ${d.slice(0, 7)} (monthly summary)`, src: 'Plant hire', link: '#/equipment/logs', lines: [{ acc: '1700', dr: amt }, { acc: '4100', cr: amt }] });
      if (['03', '06', '09'].includes(d.slice(5, 7))) {
        push({ id: 'ICS-' + d.slice(0, 7), date: d, entity: 'JRC', ic: true, memo: 'Settlement of plant hire to JPH', src: 'Plant hire', link: '#/accounting/journals', lines: [{ acc: '2700', dr: amt * 3 }, { acc: '1010', cr: amt * 3 }] });
        push({ id: 'ICS-' + d.slice(0, 7) + '-JPH', date: d, entity: 'JPH', ic: true, memo: 'Plant hire received from JRC', src: 'Plant hire', link: '#/accounting/journals', lines: [{ acc: '1040', dr: amt * 3 }, { acc: '1700', cr: amt * 3 }] });
      }
    });

    // Depreciation (plant-hire company owns the fleet)
    const own = s.equipment.filter((e) => e.cost);
    this.monthEnds(today()).forEach((d) => {
      const amt = own.reduce((a, e) => a + Calc.depreciation(e, d).acc - Calc.depreciation(e, addDays(d, -new Date(d).getUTCDate())).acc, 0);
      push({ id: 'DEP-' + d.slice(0, 7), date: d, entity: 'JPH', memo: `Depreciation ${d.slice(0, 7)}`, src: 'Depreciation', link: '#/equipment/depreciation', lines: [{ acc: '6100', dr: amt }, { acc: '1510', cr: amt }] });
    });

    // Internal plant hire JPH → JRC (intercompany, eliminated on consolidation)
    s.plantLogs.filter((l) => l.date >= ys).forEach((l) => {
      const e = s.equipment.find((x) => x.id === l.eq);
      if (!e || e.entity !== 'JPH' || !e.rate) return;
      const amt = l.hours * e.rate;
      push({ id: l.id, date: l.date, entity: 'JRC', ic: true, memo: `Plant hire ${e.id} ${l.hours} h`, src: 'Plant hire', link: '#/equipment/logs', lines: [{ acc: '5300', dr: amt, project: l.project }, { acc: '2700', cr: amt }] });
      push({ id: l.id + '-JPH', date: l.date, entity: 'JPH', ic: true, memo: `Plant hire to JRC ${e.id} ${l.hours} h`, src: 'Plant hire', link: '#/equipment/logs', lines: [{ acc: '1700', dr: amt }, { acc: '4100', cr: amt }] });
    });

    // Manual journals
    s.journals.forEach((j) => push({ ...j, src: 'Manual', link: '#/accounting/journals', lines: j.lines.map((l) => ({ ...l })) }));

    // Opening balances, back-solved per entity
    const mov = {};
    J.forEach((j) => j.lines.forEach((l) => { const k = j.entity + '|' + l.acc; mov[k] = (mov[k] || 0) + l.dr - l.cr; }));
    const m = (e, a) => mov[e + '|' + a] || 0;
    const stockVal = s.items.reduce((a, i) => a + Calc.stockQty(i.id) * i.cost, 0);
    const eosbOpen = s.employees.reduce((a, e) => a + Calc.eosb(e, '2025-12-31').amount, 0);
    const openJ = (entity, lines, capital) => {
      const net = lines.reduce((a, l) => a + (l.dr || 0) - (l.cr || 0), 0) - capital;
      lines.push({ acc: '3000', cr: capital }, { acc: '3100', dr: net < 0 ? -net : 0, cr: net > 0 ? net : 0 });
      push({ id: 'OB-' + entity, date: '2025-12-31', entity, opening: true, memo: 'Opening balances 1 Jan 2026', src: 'Opening', link: '#/accounting/tb', lines });
    };
    const bankLines = (entity) => s.bank.filter((b) => b.entity === entity).map((b) => { const a = this.bankAcc[b.id]; const v = b.balance - m(entity, a); return v >= 0 ? { acc: a, dr: v } : { acc: a, cr: -v }; });
    openJ('JRC', [...bankLines('JRC'), { acc: '1200', dr: stockVal - m('JRC', '1200') }, { acc: '2300', cr: eosbOpen }], 5000000);
    openJ('JPH', [...bankLines('JPH'), { acc: '1500', dr: own.reduce((a, e) => a + e.cost, 0) }, { acc: '1510', cr: own.reduce((a, e) => a + Calc.depreciation(e, '2025-12-31').acc, 0) }], 1000000);
    return J.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  },

  // entity: 'JRC' | 'JPH' | 'ALL' (consolidated, intercompany eliminated)
  // Group view: intercompany journals keep only their real cash legs (bank to bank between the two companies);
  // the internal hire revenue/cost and the intercompany receivable/payable are eliminated.
  filter(J, entity) {
    if (entity !== 'ALL') return J.filter((j) => j.entity === entity);
    const banks = new Set(Object.values(this.bankAcc));
    return J.map((j) => (j.ic ? { ...j, lines: j.lines.filter((l) => banks.has(l.acc)) } : j)).filter((j) => j.lines.length);
  },
  balances(entity, { from = '0000', to = '9999', opening = true } = {}) {
    const out = {};
    this.filter(this.build(), entity).forEach((j) => {
      if (j.date > to || j.date < from) return;
      if (!opening && j.opening) return;
      j.lines.forEach((l) => { const o = out[l.acc] || (out[l.acc] = { dr: 0, cr: 0 }); o.dr += l.dr; o.cr += l.cr; });
    });
    return out;
  },
  pnl(entity, from, to) {
    const b = this.balances(entity, { from, to, opening: false });
    const rows = S().coa.filter((a) => ['Revenue', 'Cost of sales', 'Expense'].includes(a.type)).map((a) => ({ ...a, amt: a.type === 'Revenue' ? (b[a.code]?.cr || 0) - (b[a.code]?.dr || 0) : (b[a.code]?.dr || 0) - (b[a.code]?.cr || 0) }));
    const sum = (t) => rows.filter((r) => r.type === t).reduce((a, r) => a + r.amt, 0);
    const revenue = sum('Revenue'), cos = sum('Cost of sales'), opex = sum('Expense');
    return { rows, revenue, cos, gross: revenue - cos, opex, net: revenue - cos - opex };
  },
};
