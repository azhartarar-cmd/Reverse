// Extends the base seed with road-contracting, accounting and compliance data. All names, refs and figures are fictional.
(function () {
  const base = window.buildSeed;
  window.buildSeed = function () {
    const s = base();
    const T = s.today;
    const add = (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

    // ---------- companies, currencies, clients ----------
    s.companies = [
      { id: 'JRC', name: 'Jazallah Road Contracting L.L.C.', trn: s.company.trn, role: 'Main contractor' },
      { id: 'JPH', name: 'Jazallah Plant Hire L.L.C.', trn: '100000000000017', role: 'Owns the fleet, hires plant to JRC' },
    ];
    s.currencies = [
      { code: 'AED', name: 'UAE dirham', rate: 1 },
      { code: 'USD', name: 'US dollar', rate: 3.6725 },
      { code: 'EUR', name: 'Euro', rate: 4.02 },
      { code: 'GBP', name: 'Pound sterling', rate: 4.68 },
      { code: 'SAR', name: 'Saudi riyal', rate: 0.979 },
    ];
    s.clients = [
      { name: 'Al Wathba Industrial Estates LLC', trn: '100000000000101', email: 'accounts@alwathba-estates.example', address: 'Al Wathba, Abu Dhabi' },
      { name: 'Capital Logistics Parks PJSC', trn: '100000000000202', email: 'ap@capital-logistics.example', address: 'Mussafah, Abu Dhabi' },
      { name: 'Desert Palm Real Estate Development', trn: '100000000000303', email: 'finance@desertpalm.example', address: 'Al Ain' },
      { name: 'Eastern Region Municipal Works', trn: '100000000000404', email: 'payments@erm-works.example', address: 'Al Ain' },
      { name: 'Western Gateway Ports Co.', trn: '100000000000505', email: 'tenders@wg-ports.example', address: 'Ruwais' },
    ];

    const pext = {
      'P-2401': { length: 6200, width: 14, ldPerDay: 18000, forecastEnd: '2027-01-28' },
      'P-2402': { length: 3400, width: 11, ldPerDay: 9000, forecastEnd: '2027-03-31' },
      'P-2403': { length: 4100, width: 8, ldPerDay: 12000, forecastEnd: '2027-07-15' },
      'P-2404': { length: 2600, width: 10, ldPerDay: 6500, forecastEnd: '2026-08-31' },
      'P-2405': { length: 8800, width: 14, ldPerDay: 25000, forecastEnd: '2028-06-30' },
    };
    s.projects.forEach((p) => Object.assign(p, { company: 'JRC' }, pext[p.id]));

    s.bank.forEach((b) => { b.entity = 'JRC'; });
    s.bank.push({ id: 'BA-4', name: 'Plant Hire – Operating Account', balance: 1240000, entity: 'JPH' });
    s.payables.forEach((b) => Object.assign(b, { paid: false, acc: b.id.startsWith('SUB') ? '2050' : '2000', currency: 'AED' }));
    s.receipts = [];
    s.items.forEach((i) => { i.cat = 'Material'; });
    s.items.push(
      { id: 'I-13', code: 'SND-05', name: 'Crusher sand 0–5 mm', unit: 'ton', cost: 35, supplier: 'S-01', reorder: 400, cat: 'Material' },
      { id: 'I-14', code: 'FLR', name: 'Mineral filler', unit: 'ton', cost: 160, supplier: 'S-01', reorder: 40, cat: 'Material' },
    );
    Object.assign(s.stock['W-01'], { 'I-13': 1450, 'I-14': 95 });

    s.suppliers.push({ id: 'S-08', name: 'EuroPave Spares GmbH', category: 'Plant spares', terms: '30 days', rating: 4.3, currency: 'EUR' });
    s.suppliers.forEach((x) => { if (!x.currency) x.currency = 'AED'; });
    s.pos.forEach((p) => { p.currency = 'AED'; });
    s.payables.push({ id: 'BILL-8852', supplier: 'S-08', ref: 'Screed plates & augers', date: '2026-10-08', due: '2026-11-07', amount: Math.round(18400 * 1.05 * 3.98), currency: 'EUR', fxAmount: Math.round(18400 * 1.05), fxRate: 3.98, acc: '2000', paid: false, expense: '5300' });

    // ---------- equipment (fleet owned by the plant-hire company) ----------
    s.equipment.forEach((e) => { e.entity = e.owner === 'Own' ? 'JPH' : 'JRC'; e.serviceHours = e.owner === 'Own' ? 250 : 0; });
    const eh = { 'EQ-01': [6120, 6050], 'EQ-02': [4210, 4400], 'EQ-03': [7350, 7500], 'EQ-04': [9810, 9750], 'EQ-05': [5540, 5750], 'EQ-07': [12040, 12250], 'EQ-09': [8810, 9000] };
    s.equipment.forEach((e) => { if (eh[e.id]) { e.meter = eh[e.id][0]; e.nextService = eh[e.id][1]; } });

    // ---------- employees: documents, camp ----------
    const docs = [
      [210, 95, 400, 95], [520, 410, 30, 410], [90, 46, 300, 46], [1200, 600, 700, 600], [800, 210, 210, 210],
      [330, 18, 150, 18], [400, 120, 120, 120], [60, 260, 260, 260], [700, 355, 355, 355], [1000, 520, 52, 520],
      [640, 300, 300, 300], [150, 75, 75, 75], [880, 440, 440, 440], [500, -6, 210, -6], [900, 330, 330, 330], [260, 170, 170, 170],
    ];
    s.employees.forEach((e, i) => {
      const [pp, visa, eid, lc] = docs[i];
      e.passportExpiry = add(T, pp); e.visaExpiry = e.nationality === 'UAE' ? '' : add(T, visa);
      e.eidExpiry = add(T, eid); e.labourCardExpiry = e.nationality === 'UAE' ? '' : add(T, lc);
      e.licenceExpiry = /Operator|Foreman/.test(e.role) ? add(T, 40 + i * 37) : '';
      e.camp = e.basic < 7000 ? 'CMP-1' : '';
      e.room = e.basic < 7000 ? 'C-' + (101 + (i % 6)) : '';
      e.email = e.name.toLowerCase().split(' ')[0].replace(/[^a-z]/g, '') + '@jazallah-roads.example';
    });
    s.camps = [
      { id: 'CMP-1', name: 'Mussafah Labour Camp – Block C', rooms: 40, capacity: 320, occupied: 274, costPerBed: 450 },
      { id: 'CMP-2', name: 'Al Ain Site Camp (P-2403)', rooms: 12, capacity: 96, occupied: 58, costPerBed: 520 },
    ];
    s.payrollRuns = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];

    // ---------- chainage progress (metres from Ch 0+000) ----------
    const layers = ['Earthworks', 'Sub-base', 'Road base', 'Asphalt base', 'Wearing course', 'Road markings'];
    const runs = {
      'P-2401': [[0, 5900], [0, 5200], [0, 4600], [0, 3100], [0, 1800], [0, 600]],
      'P-2402': [[0, 1600], [0, 1100], [0, 900], [0, 400], [0, 0], [0, 0]],
      'P-2403': [[0, 900], [0, 300], [0, 0], [0, 0], [0, 0], [0, 0]],
      'P-2404': [[0, 2600], [0, 2600], [0, 2600], [0, 2600], [0, 2600], [0, 2600]],
    };
    s.chainage = [];
    Object.entries(runs).forEach(([pid, rs]) => rs.forEach(([a, b], i) => {
      if (b <= a) return;
      // split into a couple of recorded sections so the log reads realistically
      const mid = Math.round((a + (b - a) * 0.55) / 100) * 100;
      [[a, mid], [mid, b]].forEach(([f, t], k) => { if (t > f) s.chainage.push({ id: `CH-${pid.slice(2)}-${i}${k}`, project: pid, layer: layers[i], from: f, to: t, date: add(T, -(60 - i * 8 - k * 20)), side: 'Both' }); });
    }));
    s.layerMap = { Earthworks: '2.03', 'Sub-base': '3.01', 'Road base': '3.02', 'Asphalt base': '4.02', 'Wearing course': '4.04', 'Road markings': '7.01' };

    // ---------- asphalt plant (production) ----------
    s.mixDesigns = [
      { id: 'MX-BC', name: 'Asphalt base course 0/37.5', thickness: 0.08, density: 2.36, plantCost: 26, bom: [{ item: 'I-01', per: 0.43 }, { item: 'I-02', per: 0.24 }, { item: 'I-13', per: 0.25 }, { item: 'I-14', per: 0.038 }, { item: 'I-04', per: 0.042 }] },
      { id: 'MX-WC', name: 'Wearing course 0/19', thickness: 0.05, density: 2.38, plantCost: 28, bom: [{ item: 'I-01', per: 0.30 }, { item: 'I-02', per: 0.33 }, { item: 'I-13', per: 0.28 }, { item: 'I-14', per: 0.038 }, { item: 'I-04', per: 0.052 }] },
    ];
    s.prodOrders = [
      { id: 'AP-0911', date: add(T, -6), mix: 'MX-BC', tons: 640, project: 'P-2401', status: 'Produced', layArea: 3350, cost: 0 },
      { id: 'AP-0912', date: add(T, -4), mix: 'MX-BC', tons: 590, project: 'P-2401', status: 'Produced', layArea: 3080, cost: 0 },
      { id: 'AP-0913', date: add(T, -2), mix: 'MX-WC', tons: 420, project: 'P-2401', status: 'Produced', layArea: 3460, cost: 0 },
      { id: 'AP-0914', date: add(T, -1), mix: 'MX-BC', tons: 260, project: 'P-2402', status: 'Produced', layArea: 1360, cost: 0 },
      { id: 'AP-0915', date: add(T, 1), mix: 'MX-WC', tons: 480, project: 'P-2401', status: 'Planned', layArea: 0, cost: 0 },
    ];
    s.prodOrders.forEach((o) => {
      const m = s.mixDesigns.find((x) => x.id === o.mix);
      o.cost = Math.round(o.tons * (m.bom.reduce((a, b) => a + b.per * s.items.find((i) => i.id === b.item).cost, 0) + m.plantCost));
    });
    s.tickets = [];
    const trucks = ['AD-4 51203', 'AD-4 51207', 'AD-4 51211', 'AD-4 51219'];
    s.prodOrders.filter((o) => o.status === 'Produced').forEach((o, k) => {
      let left = o.tons * (0.985 - k * 0.004), n = 0;
      while (left > 1) { const t = Math.min(left, 38 + ((n * 7) % 5)); s.tickets.push({ id: `DT-${o.id.slice(3)}-${String(++n).padStart(2, '0')}`, order: o.id, date: o.date, truck: trucks[n % 4], tons: Math.round(t * 10) / 10, project: o.project, temp: 152 + ((n * 3) % 12) }); left -= t; }
    });

    // ---------- QA/QC & HSE ----------
    s.inspections = [
      { id: 'IR-2401-412', project: 'P-2401', date: add(T, -1), activity: 'Asphalt base course – level & thickness', location: 'Ch 2+400 – 3+100 EB', status: 'Approved' },
      { id: 'IR-2401-413', project: 'P-2401', date: T, activity: 'Kerb alignment & bedding', location: 'Ch 1+800 – 2+200', status: 'Open' },
      { id: 'IR-2402-088', project: 'P-2402', date: add(T, -2), activity: 'Road base compaction', location: 'Street 14, Ch 0+400 – 0+900', status: 'Rejected', comment: 'Two density tests below 100% MDD – re-roll and retest' },
      { id: 'IR-2403-021', project: 'P-2403', date: add(T, -3), activity: 'Storm pipe bedding & jointing', location: 'Sector 2, MH 4 – MH 7', status: 'Approved' },
    ];
    s.labTests = [
      { id: 'LT-7781', project: 'P-2401', date: add(T, -1), type: 'Core – asphalt thickness (mm)', location: 'Ch 2+650 EB', result: 81, spec: '≥ 76', pass: true },
      { id: 'LT-7782', project: 'P-2401', date: add(T, -1), type: 'Core – asphalt compaction (% Marshall)', location: 'Ch 2+650 EB', result: 98.4, spec: '≥ 97', pass: true },
      { id: 'LT-7779', project: 'P-2402', date: add(T, -2), type: 'Field density – road base (% MDD)', location: 'Ch 0+550', result: 98.7, spec: '≥ 100', pass: false },
      { id: 'LT-7780', project: 'P-2402', date: add(T, -2), type: 'Field density – road base (% MDD)', location: 'Ch 0+780', result: 99.2, spec: '≥ 100', pass: false },
      { id: 'LT-7770', project: 'P-2401', date: add(T, -5), type: 'Marshall stability (kN)', location: 'Plant sample AP-0911', result: 11.8, spec: '≥ 8', pass: true },
      { id: 'LT-7765', project: 'P-2403', date: add(T, -6), type: 'Field density – sub-base (% MDD)', location: 'Cluster B, Ch 0+200', result: 100.6, spec: '≥ 100', pass: true },
    ];
    s.ncrs = [
      { id: 'NCR-2402-007', project: 'P-2402', date: add(T, -2), desc: 'Road base density below specification at Ch 0+550 and 0+780', raisedBy: 'Consultant', action: 'Scarify, re-water and re-compact; retest', status: 'Open' },
      { id: 'NCR-2401-019', project: 'P-2401', date: add(T, -21), desc: 'Kerb line deviation > 10 mm at Ch 1+150', raisedBy: 'Internal QA', action: 'Re-lay 24 lm of kerb', status: 'Closed' },
    ];
    s.incidents = [
      { id: 'HSE-0091', project: 'P-2401', date: add(T, -9), type: 'Near miss', desc: 'Tipper reversed without banksman near paver', action: 'Toolbox talk on reversing; banksman assigned per shift', status: 'Closed' },
      { id: 'HSE-0092', project: 'P-2402', date: add(T, -3), type: 'First aid', desc: 'Minor burn to hand from hot bitumen sprayer nozzle', action: 'Heat-resistant gloves issued; sprayer guard checked', status: 'Closed' },
      { id: 'HSE-0093', project: 'P-2401', date: add(T, -1), type: 'Property damage', desc: 'Traffic cone line struck by public vehicle at night diversion', action: 'Add flashing arrow board; review TM layout with police', status: 'Open' },
    ];
    s.hseStats = { lastLti: '2026-02-11', manHoursSinceLti: 412000, toolboxTalks: 186 };

    // ---------- plant daily logs ----------
    const ops = { 'EQ-01': 'E-1007', 'EQ-02': 'E-1008', 'EQ-03': 'E-1008', 'EQ-04': 'E-1009', 'EQ-05': 'E-1006', 'EQ-07': 'E-1006', 'EQ-09': 'E-1016' };
    const fuelRate = { 'EQ-01': 14, 'EQ-02': 7, 'EQ-03': 8, 'EQ-04': 16, 'EQ-05': 19, 'EQ-06': 24, 'EQ-07': 26, 'EQ-08': 9, 'EQ-09': 42, 'EQ-10': 8 };
    s.plantLogs = [];
    for (let d = -6; d <= -1; d++) {
      const date = add(T, d);
      s.bookings.filter((b) => b.from <= date && b.to >= date).forEach((b, k) => {
        const hours = 8 + ((d * -3 + k) % 4);
        s.plantLogs.push({ id: `PL-${String(s.plantLogs.length + 1).padStart(4, '0')}`, date, eq: b.eq, project: b.project, hours, fuel: Math.round(hours * fuelRate[b.eq] * (0.92 + ((k + d * -1) % 3) * 0.06)), operator: ops[b.eq] || '', note: '' });
      });
    }

    // ---------- subcontractors ----------
    s.subcontracts = [
      { id: 'SC-01', sub: 'Al Reem Lighting Subcontracting', project: 'P-2401', scope: 'Street lighting supply & install', value: 1180000, retPct: 10, certs: [
        { no: 3, date: '2026-08-31', cumWork: 412000, backcharge: 0, status: 'Paid' },
        { no: 4, date: '2026-09-30', cumWork: 620000, backcharge: 0, status: 'Approved' },
      ] },
      { id: 'SC-02', sub: 'Precise Line Markings LLC', project: 'P-2401', scope: 'Thermoplastic markings & studs', value: 214000, retPct: 10, certs: [
        { no: 1, date: '2026-09-30', cumWork: 38000, backcharge: 0, status: 'Approved' },
      ] },
      { id: 'SC-03', sub: 'GulfShore Utilities Diversion', project: 'P-2402', scope: 'Utility trial pits, ducts & chamber relocation', value: 486000, retPct: 10, certs: [
        { no: 2, date: '2026-09-30', cumWork: 268000, backcharge: 6500, status: 'Submitted' },
      ] },
    ];
    // replace the old lump-sum subcontract bill with bills raised from approved certificates
    s.payables = s.payables.filter((b) => b.id !== 'SUB-0312');
    s.payables.push(
      { id: 'SUB-0331', supplier: 'Al Reem Lighting Subcontracting', ref: 'SC-01 cert 4', date: '2026-09-30', due: '2026-10-30', amount: 196560, acc: '2050', paid: false, currency: 'AED', source: 'subcert' },
      { id: 'SUB-0332', supplier: 'Precise Line Markings LLC', ref: 'SC-02 cert 1', date: '2026-09-30', due: '2026-10-30', amount: 35910, acc: '2050', paid: false, currency: 'AED', source: 'subcert' },
    );
    s.backcharges = [{ id: 'BC-014', sc: 'SC-03', date: '2026-09-22', desc: 'JRC excavator and operator used for 2 days to clear their spoil', amount: 6500 }];

    // ---------- contracts & compliance ----------
    s.bonds = [
      { id: 'BG-1101', type: 'Performance bond', project: 'P-2401', bank: 'Bank A', amount: 1840000, issued: '2025-10-20', expiry: '2027-12-31', status: 'Active' },
      { id: 'BG-1102', type: 'Advance payment guarantee', project: 'P-2401', bank: 'Bank A', amount: 1840000, issued: '2025-10-20', expiry: add(T, 38), status: 'Active' },
      { id: 'BG-1140', type: 'Performance bond', project: 'P-2402', bank: 'Bank B', amount: 940000, issued: '2026-02-01', expiry: '2028-03-31', status: 'Active' },
      { id: 'BG-1151', type: 'Performance bond', project: 'P-2403', bank: 'Bank B', amount: 1266000, issued: '2026-04-15', expiry: '2028-06-30', status: 'Active' },
      { id: 'BG-1090', type: 'Retention bond', project: 'P-2404', bank: 'Bank A', amount: 290000, issued: '2026-09-01', expiry: '2027-08-31', status: 'Active' },
      { id: 'BG-1160', type: 'Tender bond', project: 'P-2405', bank: 'Bank A', amount: 490000, issued: '2026-09-10', expiry: add(T, 52), status: 'Active' },
    ];
    s.permits = [
      { id: 'NOC-3321', project: 'P-2401', authority: 'Municipality – Roads Directorate', type: 'Road works permit', ref: 'RW/2025/1188', issued: '2025-10-25', expiry: '2026-12-31', status: 'Active' },
      { id: 'NOC-3402', project: 'P-2401', authority: 'Police – Traffic Department', type: 'Night traffic diversion', ref: 'TD/26/552', issued: '2026-09-15', expiry: add(T, 12), status: 'Active' },
      { id: 'NOC-3410', project: 'P-2402', authority: 'Electricity & Water Authority', type: 'Excavation near HV cables', ref: 'EW/26/7731', issued: '2026-07-01', expiry: add(T, 45), status: 'Active' },
      { id: 'NOC-3415', project: 'P-2402', authority: 'Telecom operator', type: 'Chamber relocation', ref: 'TC/26/091', issued: '2026-07-20', expiry: '2027-01-20', status: 'Active' },
      { id: 'NOC-3420', project: 'P-2403', authority: 'Municipality – Planning', type: 'Infrastructure NOC', ref: 'PL/26/3302', issued: '2026-04-28', expiry: '2027-04-28', status: 'Active' },
      { id: 'NOC-3430', project: 'P-2403', authority: 'Civil Defence', type: 'Hot works (bitumen heating)', ref: 'CD/26/118', issued: '2026-08-01', expiry: add(T, -3), status: 'Active' },
    ];
    s.claims = [
      { id: 'CLM-2401-01', project: 'P-2401', type: 'Extension of time', event: 'Late utility diversion by third party (Ch 1+200 – 1+900)', notified: '2026-04-02', daysClaimed: 45, daysGranted: 0, amountClaimed: 610000, amountAgreed: 0, status: 'Under review' },
      { id: 'CLM-2402-01', project: 'P-2402', type: 'Cost claim', event: 'Unforeseen rock at Street 9 excavation', notified: '2026-06-18', daysClaimed: 0, daysGranted: 0, amountClaimed: 148000, amountAgreed: 120000, status: 'Agreed' },
      { id: 'CLM-2404-01', project: 'P-2404', type: 'Extension of time', event: 'Client-instructed school-zone works', notified: '2026-01-10', daysClaimed: 21, daysGranted: 14, amountClaimed: 0, amountAgreed: 0, status: 'Agreed' },
    ];
    s.escalation = [
      { project: 'P-2401', item: 'Bitumen 60/70', unit: 'ton', base: 1480, current: 1650, threshold: 5, qty: 1450 },
      { project: 'P-2401', item: 'Diesel', unit: 'litre', base: 2.85, current: 3.10, threshold: 5, qty: 410000 },
      { project: 'P-2401', item: 'Rebar 12 mm', unit: 'ton', base: 2520, current: 2450, threshold: 5, qty: 42 },
      { project: 'P-2402', item: 'Bitumen 60/70', unit: 'ton', base: 1590, current: 1650, threshold: 5, qty: 260 },
    ];

    // ---------- documents ----------
    s.documents = [
      { id: 'DOC-0412', project: 'P-2401', type: 'Drawing', ref: 'AWR-DR-RD-1004', title: 'Plan & profile Ch 2+000 – 3+500', rev: 'C', date: '2026-09-28', status: 'Approved', file: '' },
      { id: 'DOC-0413', project: 'P-2401', type: 'Drawing', ref: 'AWR-DR-DR-2010', title: 'Storm water network sheet 3', rev: 'B', date: '2026-10-10', status: 'Approved with comments', file: '' },
      { id: 'DOC-0420', project: 'P-2401', type: 'Method statement', ref: 'AWR-MS-014', title: 'Asphalt paving at night with live traffic', rev: '1', date: '2026-10-15', status: 'For approval', file: '' },
      { id: 'DOC-0421', project: 'P-2401', type: 'Letter', ref: 'JRC-AWR-L-233', title: 'Notice of delay – utility diversion', rev: '0', date: '2026-04-02', status: 'Info', file: '' },
      { id: 'DOC-0422', project: 'P-2401', type: 'Material submittal', ref: 'AWR-MAT-031', title: 'W-beam barrier and fittings', rev: '0', date: '2026-10-18', status: 'For approval', file: '' },
      { id: 'DOC-0201', project: 'P-2402', type: 'Drawing', ref: 'MSR-DR-RD-0301', title: 'Street 9 & 14 rehabilitation layout', rev: 'D', date: '2026-08-02', status: 'Approved', file: '' },
      { id: 'DOC-0099', project: 'P-2403', type: 'Transmittal', ref: 'DPV-TR-045', title: 'Shop drawings package – sector 2 drainage', rev: '0', date: '2026-10-16', status: 'For approval', file: '' },
    ];

    // ---------- sales: milestones; CRM: events & history ----------
    s.milestones = [
      { id: 'MS-2403-01', project: 'P-2403', desc: 'Mobilisation and site establishment', pct: 5, due: '2026-05-31', status: 'Invoiced', invoice: 'INV-26-0109' },
      { id: 'MS-2403-02', project: 'P-2403', desc: 'Cluster A – earthworks and sub-base complete', pct: 10, due: '2026-10-31', status: 'Planned' },
      { id: 'MS-2403-03', project: 'P-2403', desc: 'Cluster A – asphalt and kerbs complete', pct: 15, due: '2027-01-31', status: 'Planned' },
      { id: 'MS-2403-04', project: 'P-2403', desc: 'Sector 2 storm network commissioned', pct: 12, due: '2027-03-31', status: 'Planned' },
    ];
    s.invoices.push({ id: 'INV-26-0109', ipc: '', client: 'Desert Palm Real Estate Development', project: 'P-2403', date: '2026-05-31', due: '2026-06-30', net: 640000, paid: 640000, milestone: 'MS-2403-01' });
    s.leads.forEach((l) => { l.history = [{ date: add(T, -14), note: 'First meeting – scope and timeline discussed' }]; });
    s.leads[1].history.push({ date: add(T, -6), note: 'Client asked to re-price service lanes with 200 mm sub-base' });
    s.events = [
      { id: 'EV-1', date: add(T, 4), time: '10:00', title: 'Clarification meeting – Ruwais Port Link', lead: 'L-302', type: 'Meeting' },
      { id: 'EV-2', date: add(T, 6), time: '08:30', title: 'Site visit – Yas Business District', lead: 'L-303', type: 'Site visit' },
      { id: 'EV-3', date: add(T, 11), time: '14:00', title: 'Tender submission deadline – Al Dhafra Solar Park access', lead: 'L-304', type: 'Tender deadline' },
      { id: 'EV-4', date: add(T, 2), time: '11:00', title: 'Proposal presentation – Al Noor Logistics Park', lead: 'L-301', type: 'Meeting' },
      { id: 'EV-5', date: add(T, -3), time: '09:00', title: 'Call – Western Gateway procurement team', lead: 'L-302', type: 'Call' },
    ];

    // ---------- accounting ----------
    s.coa = [
      ['1010', 'Bank – Main Operating', 'Asset'], ['1020', 'Bank – Payroll (WPS)', 'Asset'], ['1030', 'Bank – Retention & Guarantees', 'Asset'], ['1040', 'Bank – Plant Hire Operating', 'Asset'],
      ['1100', 'Accounts receivable', 'Asset'], ['1150', 'Retention receivable', 'Asset'], ['1200', 'Inventory', 'Asset'], ['1300', 'VAT input recoverable', 'Asset'],
      ['1500', 'Plant & equipment – cost', 'Asset'], ['1510', 'Accumulated depreciation', 'Asset'], ['1700', 'Intercompany receivable', 'Asset'],
      ['2000', 'Accounts payable – suppliers', 'Liability'], ['2050', 'Accounts payable – subcontractors', 'Liability'], ['2060', 'Retention payable to subcontractors', 'Liability'],
      ['2100', 'VAT output payable', 'Liability'], ['2200', 'Advance payments from clients', 'Liability'], ['2300', 'End-of-service provision', 'Liability'], ['2700', 'Intercompany payable', 'Liability'],
      ['3000', 'Share capital', 'Equity'], ['3100', 'Retained earnings', 'Equity'],
      ['4000', 'Contract revenue', 'Revenue'], ['4100', 'Plant hire revenue', 'Revenue'],
      ['5000', 'Materials cost', 'Cost of sales'], ['5100', 'Subcontract cost', 'Cost of sales'], ['5200', 'Site labour cost', 'Cost of sales'], ['5300', 'Plant & equipment cost', 'Cost of sales'], ['5400', 'Site overheads', 'Cost of sales'],
      ['6000', 'Staff salaries – office', 'Expense'], ['6100', 'Depreciation', 'Expense'], ['6200', 'Office & admin expenses', 'Expense'], ['6300', 'End-of-service expense', 'Expense'], ['6400', 'Exchange gain / loss', 'Expense'],
    ].map(([code, name, type]) => ({ code, name, type }));
    s.journals = [
      { id: 'JV-26-0141', date: '2026-09-30', entity: 'JRC', memo: 'Head office rent Q3', lines: [{ acc: '6200', dr: 165000, cr: 0 }, { acc: '1010', dr: 0, cr: 165000 }], seed: true },
      { id: 'JV-26-0142', date: '2026-09-30', entity: 'JRC', memo: 'Site camp & welfare costs Q3', lines: [{ acc: '5400', dr: 286000, cr: 0 }, { acc: '1010', dr: 0, cr: 286000 }], seed: true },
      { id: 'JV-26-0150', date: '2026-10-15', entity: 'JPH', memo: 'Paver and roller servicing', lines: [{ acc: '5300', dr: 48200, cr: 0 }, { acc: '1040', dr: 0, cr: 48200 }], seed: true },
    ];
    s.periodLock = '2026-09-30';
    s.overheads = { monthly: 385000, basis: 'revenue' };

    // ---------- access, notifications ----------
    s.users.push({ name: 'Omar Haddad', email: 'omar@jazallah-roads.example', role: 'Site Engineer' });
    s.currentUser = 'admin@jazallah-roads.example';
    s.notifPrefs = { email: true, inApp: true, mobile: false, digest: 'Daily 07:00' };
    s.readNotifs = [];
    return s;
  };
})();
