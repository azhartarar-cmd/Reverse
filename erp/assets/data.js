// Seed data for the Jazallah Road Contracting demo. All names, figures and IDs are fictional.
window.buildSeed = function () {
  let s = 20261024;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const round = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
  const TODAY = '2026-10-24';

  const company = {
    name: 'Jazallah Road Contracting',
    legalName: 'Jazallah Road Contracting L.L.C.',
    trn: '100000000000003',
    address: 'Industrial Area, Abu Dhabi, United Arab Emirates',
    phone: '+971 2 000 0000',
    email: 'info@jazallah-roads.example',
    currency: 'AED',
    vatRate: 5,
    retentionPct: 10,
    advancePct: 10,
    molEstablishmentId: '0000000123456',
    bankRoutingCode: '000000000',
  };

  // BOQ template: [category, code, description, unit, baseQty, sellRate, costRate]
  const tpl = [
    ['Preliminaries', '1.01', 'Site establishment, mobilisation and demobilisation', 'LS', 1, 450000, 360000],
    ['Preliminaries', '1.02', 'Traffic management and temporary diversions', 'month', 12, 38000, 30500],
    ['Preliminaries', '1.03', 'Site offices, welfare and testing laboratory', 'month', 12, 22000, 17200],
    ['Earthworks', '2.01', 'Excavation of unsuitable material and disposal', 'm3', 28000, 18, 13],
    ['Earthworks', '2.02', 'Embankment fill from approved borrow, compacted', 'm3', 35000, 32, 24],
    ['Earthworks', '2.03', 'Subgrade preparation and compaction', 'm2', 60000, 4.5, 3.2],
    ['Subbase & Base', '3.01', 'Granular sub-base, 250 mm compacted', 'm2', 60000, 38, 29],
    ['Subbase & Base', '3.02', 'Aggregate road base, 200 mm compacted', 'm2', 58000, 42, 33],
    ['Asphalt', '4.01', 'Bituminous prime coat MC-70', 'm2', 56000, 3.2, 2.3],
    ['Asphalt', '4.02', 'Asphalt base course, 80 mm', 'm2', 56000, 68, 54],
    ['Asphalt', '4.03', 'Bituminous tack coat RC-70', 'm2', 56000, 1.8, 1.2],
    ['Asphalt', '4.04', 'Asphalt wearing course, 50 mm', 'm2', 56000, 52, 41],
    ['Kerbs & Paving', '5.01', 'Precast concrete kerb, type A, on concrete bed', 'lm', 9000, 85, 64],
    ['Kerbs & Paving', '5.02', 'Interlocking concrete pavers, 80 mm, footways', 'm2', 7000, 95, 72],
    ['Drainage', '6.01', 'uPVC storm water pipe 300 mm dia incl. bedding', 'lm', 3200, 310, 240],
    ['Drainage', '6.02', 'Road gully with connection to main', 'nr', 140, 2400, 1850],
    ['Drainage', '6.03', 'Precast manhole 1200 mm dia, avg 2.5 m deep', 'nr', 45, 9800, 7600],
    ['Road Furniture', '7.01', 'Thermoplastic road markings', 'm2', 4200, 48, 34],
    ['Road Furniture', '7.02', 'Traffic signs complete with posts and foundations', 'nr', 85, 1850, 1400],
    ['Road Furniture', '7.03', 'W-beam steel safety barrier', 'lm', 2400, 260, 195],
    ['Street Lighting', '8.01', '12 m lighting column with LED lantern and foundation', 'nr', 160, 7800, 6100],
    ['Street Lighting', '8.02', 'Cabling and ducts for street lighting', 'lm', 7500, 120, 88],
  ];
  // Share of overall programme progress achieved per trade (earlier trades lead).
  const lead = { Preliminaries: 1, Earthworks: 1.6, 'Subbase & Base': 1.35, Drainage: 1.3, Asphalt: 0.8, 'Kerbs & Paving': 0.9, 'Road Furniture': 0.35, 'Street Lighting': 0.6 };
  const windows = {
    Preliminaries: [0, 1], Earthworks: [0.02, 0.35], Drainage: [0.1, 0.5], 'Subbase & Base': [0.2, 0.55],
    'Kerbs & Paving': [0.4, 0.8], Asphalt: [0.45, 0.85], 'Street Lighting': [0.55, 0.92], 'Road Furniture': [0.75, 0.97],
  };

  const projDefs = [
    ['P-2401', 'Al Wathba Industrial Access Road', 'Al Wathba Industrial Estates LLC', 'Abu Dhabi', 0.85, '2025-11-01', '2026-12-31', 0.62, 'Active', 'Khalid Mansour'],
    ['P-2402', 'Mussafah Service Roads Rehabilitation – Phase 2', 'Capital Logistics Parks PJSC', 'Abu Dhabi', 0.45, '2026-02-15', '2027-03-31', 0.28, 'Active', 'Rajesh Nair'],
    ['P-2403', 'Desert Palm Villas – Internal Roads & Infrastructure', 'Desert Palm Real Estate Development', 'Al Ain', 0.6, '2026-05-01', '2027-06-30', 0.12, 'Active', 'Omar Haddad'],
    ['P-2404', 'Al Ain Truck Route Resurfacing', 'Eastern Region Municipal Works', 'Al Ain', 0.32, '2025-06-01', '2026-08-31', 1, 'Defects Liability', 'Khalid Mansour'],
    ['P-2405', 'Ruwais Port Link Road', 'Western Gateway Ports Co.', 'Al Dhafra', 1.15, '2027-01-15', '2028-06-30', 0, 'Tender', 'Rajesh Nair'],
  ];

  const projects = projDefs.map(([id, name, client, location, scale, start, end, progress, status, manager]) => {
    const boq = tpl.map(([cat, code, desc, unit, q, rate, cost], i) => {
      const qty = unit === 'LS' ? 1 : round(q * scale);
      const p = Math.min(1, progress * lead[cat]);
      const doneQty = unit === 'LS' ? round(p, 2) : round(qty * p);
      const variance = 0.94 + rnd() * 0.18;
      return { id: id + '-' + code, cat, code, desc, unit, qty, rate, costRate: cost, doneQty, actualCost: round(doneQty * cost * variance) };
    });
    const tasks = Object.keys(windows).map((cat) => {
      const lines = boq.filter((b) => b.cat === cat);
      const val = lines.reduce((a, b) => a + b.qty * b.rate, 0);
      const done = lines.reduce((a, b) => a + b.doneQty * b.rate, 0);
      return { cat, from: windows[cat][0], to: windows[cat][1], pct: val ? done / val : 0 };
    });
    return { id, name, client, location, start, end, status, manager, boq, tasks };
  });

  const reports = [
    { id: 'DR-1041', project: 'P-2401', date: '2026-10-23', author: 'Khalid Mansour', weather: 'Clear, 34°C', manpower: 86, equipment: 14, summary: 'Asphalt base course laid on Ch. 2+400 – 3+100 (eastbound). Gully installation continued on Ch. 1+800. Core samples taken for lab testing.' },
    { id: 'DR-1040', project: 'P-2401', date: '2026-10-22', author: 'Khalid Mansour', weather: 'Clear, 35°C', manpower: 82, equipment: 13, summary: 'Prime coat applied Ch. 2+400 – 3+100. Kerb laying 240 lm. Night traffic switch approved by client engineer.' },
    { id: 'DR-0612', project: 'P-2402', date: '2026-10-23', author: 'Rajesh Nair', weather: 'Hazy, 33°C', manpower: 54, equipment: 9, summary: 'Milling of existing surface on Street 14. Utility trial pits completed for DEWA crossing (no clashes found).' },
    { id: 'DR-0201', project: 'P-2403', date: '2026-10-22', author: 'Omar Haddad', weather: 'Clear, 36°C', manpower: 38, equipment: 7, summary: 'Bulk excavation in Cluster B. Survey set-out for storm water network sector 2.' },
  ];
  const rfis = [
    { id: 'RFI-118', project: 'P-2401', date: '2026-10-12', subject: 'Clash between lighting duct and storm pipe at Ch. 2+150', status: 'Open', due: '2026-10-26' },
    { id: 'RFI-117', project: 'P-2401', date: '2026-10-03', subject: 'Confirm asphalt mix design for heavy-vehicle lanes', status: 'Answered', due: '2026-10-10' },
    { id: 'RFI-031', project: 'P-2402', date: '2026-10-15', subject: 'Existing kerb retention vs replacement on Street 9', status: 'Open', due: '2026-10-29' },
    { id: 'RFI-007', project: 'P-2403', date: '2026-10-18', subject: 'Finished road levels at villa driveway interfaces', status: 'Open', due: '2026-11-01' },
  ];

  const suppliers = [
    { id: 'S-01', name: 'Hatta Quarry & Aggregates Co.', category: 'Aggregates', terms: '60 days', rating: 4.4 },
    { id: 'S-02', name: 'Gulf Bitumen Supplies FZE', category: 'Bitumen', terms: '45 days', rating: 4.1 },
    { id: 'S-03', name: 'Al Falah Precast Industries', category: 'Precast', terms: '60 days', rating: 4.6 },
    { id: 'S-04', name: 'Crescent Pipes & Fittings LLC', category: 'Pipes', terms: '30 days', rating: 3.9 },
    { id: 'S-05', name: 'Bright Line Road Marking Materials', category: 'Road furniture', terms: '30 days', rating: 4.2 },
    { id: 'S-06', name: 'Emirates Fuel Distribution', category: 'Fuel', terms: '15 days', rating: 4.0 },
    { id: 'S-07', name: 'Northern Steel Trading', category: 'Steel', terms: '45 days', rating: 3.8 },
  ];

  const items = [
    { id: 'I-01', code: 'AGG-20', name: 'Aggregate 20 mm', unit: 'ton', cost: 48, supplier: 'S-01', reorder: 400 },
    { id: 'I-02', code: 'AGG-10', name: 'Aggregate 10 mm', unit: 'ton', cost: 52, supplier: 'S-01', reorder: 300 },
    { id: 'I-03', code: 'RB-01', name: 'Road base material', unit: 'ton', cost: 38, supplier: 'S-01', reorder: 800 },
    { id: 'I-04', code: 'BIT-6070', name: 'Bitumen 60/70', unit: 'ton', cost: 1650, supplier: 'S-02', reorder: 40 },
    { id: 'I-05', code: 'MC-70', name: 'Prime coat MC-70', unit: 'drum', cost: 820, supplier: 'S-02', reorder: 30 },
    { id: 'I-06', code: 'KRB-A', name: 'Precast kerb type A', unit: 'nr', cost: 31, supplier: 'S-03', reorder: 1500 },
    { id: 'I-07', code: 'PAV-80', name: 'Interlock pavers 80 mm', unit: 'm2', cost: 34, supplier: 'S-03', reorder: 500 },
    { id: 'I-08', code: 'UPVC-300', name: 'uPVC pipe 300 mm (6 m)', unit: 'length', cost: 690, supplier: 'S-04', reorder: 60 },
    { id: 'I-09', code: 'TP-WHT', name: 'Thermoplastic paint, white', unit: 'kg', cost: 6.5, supplier: 'S-05', reorder: 2000 },
    { id: 'I-10', code: 'DSL', name: 'Diesel', unit: 'litre', cost: 3.1, supplier: 'S-06', reorder: 15000 },
    { id: 'I-11', code: 'RBR-12', name: 'Rebar 12 mm', unit: 'ton', cost: 2450, supplier: 'S-07', reorder: 10 },
    { id: 'I-12', code: 'CEM-OPC', name: 'Cement OPC 50 kg', unit: 'bag', cost: 17, supplier: 'S-03', reorder: 600 },
  ];
  const warehouses = [
    { id: 'W-01', name: 'Main Yard – Mussafah' },
    { id: 'W-02', name: 'Site Store – P-2401 Al Wathba' },
    { id: 'W-03', name: 'Site Store – P-2403 Desert Palm' },
  ];
  const stock = {
    'W-01': { 'I-01': 1250, 'I-02': 880, 'I-03': 2400, 'I-04': 62, 'I-05': 44, 'I-06': 3200, 'I-07': 1800, 'I-08': 120, 'I-09': 5200, 'I-10': 42000, 'I-11': 18, 'I-12': 1400 },
    'W-02': { 'I-01': 310, 'I-03': 640, 'I-04': 22, 'I-05': 12, 'I-06': 900, 'I-08': 40, 'I-10': 9000, 'I-12': 220 },
    'W-03': { 'I-01': 120, 'I-03': 380, 'I-06': 400, 'I-08': 25, 'I-10': 6000, 'I-12': 300 },
  };
  const stockTx = [
    { id: 'GRN-3301', date: '2026-10-20', type: 'Receipt', item: 'I-04', qty: 30, from: 'S-02', to: 'W-01', project: '', ref: 'PO-5512' },
    { id: 'GIN-7702', date: '2026-10-21', type: 'Issue', item: 'I-04', qty: 18, from: 'W-02', to: '', project: 'P-2401', ref: 'Asphalt plant batch' },
    { id: 'TRN-0410', date: '2026-10-21', type: 'Transfer', item: 'I-06', qty: 600, from: 'W-01', to: 'W-02', project: '', ref: 'Kerbs for Ch. 2+400' },
    { id: 'GIN-7703', date: '2026-10-22', type: 'Issue', item: 'I-10', qty: 4200, from: 'W-02', to: '', project: 'P-2401', ref: 'Fleet refuelling' },
    { id: 'GIN-7704', date: '2026-10-22', type: 'Issue', item: 'I-03', qty: 520, from: 'W-01', to: '', project: 'P-2402', ref: 'Road base Street 14' },
    { id: 'GIN-7705', date: '2026-10-23', type: 'Issue', item: 'I-10', qty: 1800, from: 'W-03', to: '', project: 'P-2403', ref: 'Fleet refuelling' },
    { id: 'GIN-7706', date: '2026-10-23', type: 'Issue', item: 'I-08', qty: 22, from: 'W-02', to: '', project: 'P-2401', ref: 'Storm line SL-4' },
  ];

  const requisitions = [
    { id: 'MR-2210', date: '2026-10-21', project: 'P-2401', by: 'Khalid Mansour', item: 'I-04', qty: 45, need: '2026-10-30', status: 'Pending', note: 'Wearing course Ch. 3+100 onwards' },
    { id: 'MR-2209', date: '2026-10-20', project: 'P-2402', by: 'Rajesh Nair', item: 'I-06', qty: 1800, need: '2026-11-05', status: 'Pending', note: 'Street 9 kerb replacement' },
    { id: 'MR-2208', date: '2026-10-18', project: 'P-2403', by: 'Omar Haddad', item: 'I-08', qty: 80, need: '2026-11-10', status: 'Approved', note: 'Storm network sector 2' },
    { id: 'MR-2207', date: '2026-10-15', project: 'P-2401', by: 'Khalid Mansour', item: 'I-09', qty: 3000, need: '2026-11-15', status: 'Ordered', note: 'Final markings' },
  ];
  const rfqs = [
    { id: 'RFQ-0904', req: 'MR-2208', item: 'I-08', qty: 80, status: 'Open', quotes: [
      { supplier: 'S-04', rate: 685, lead: 7, terms: '30 days' },
      { supplier: 'Gulf Polymer Pipes (new)', rate: 662, lead: 14, terms: 'Advance 30%' },
      { supplier: 'Sharjah Plastic Industries (new)', rate: 701, lead: 5, terms: '60 days' },
    ] },
  ];
  const pos = [
    { id: 'PO-5512', date: '2026-10-10', supplier: 'S-02', project: 'P-2401', item: 'I-04', qty: 30, rate: 1650, received: 30, status: 'Received', approval: 'Approved', paid: false },
    { id: 'PO-5513', date: '2026-10-16', supplier: 'S-05', project: 'P-2401', item: 'I-09', qty: 3000, rate: 6.4, received: 0, status: 'Open', approval: 'Approved', paid: false },
    { id: 'PO-5514', date: '2026-10-22', supplier: 'S-01', project: 'P-2402', item: 'I-03', qty: 1500, rate: 37.5, received: 0, status: 'Open', approval: 'Pending', paid: false },
    { id: 'PO-5498', date: '2026-08-12', supplier: 'S-03', project: 'P-2401', item: 'I-06', qty: 6000, rate: 30.5, received: 6000, status: 'Received', approval: 'Approved', paid: true },
    { id: 'PO-5501', date: '2026-08-28', supplier: 'S-06', project: 'P-2401', item: 'I-10', qty: 30000, rate: 3.05, received: 30000, status: 'Received', approval: 'Approved', paid: true },
    { id: 'PO-5506', date: '2026-09-19', supplier: 'S-01', project: 'P-2401', item: 'I-01', qty: 2200, rate: 47.5, received: 2200, status: 'Received', approval: 'Approved', paid: false },
  ];

  const quotations = [
    { id: 'QT-0388', client: 'Western Gateway Ports Co.', title: 'Ruwais Port Link Road – main works', date: '2026-10-05', status: 'Sent', revisions: [
      { rev: 0, date: '2026-09-14', value: 25900000, note: 'Initial tender submission' },
      { rev: 1, date: '2026-10-05', value: 24480000, note: 'Value engineering: subbase thickness 250→200 mm on service lanes' },
    ] },
    { id: 'QT-0391', client: 'Al Noor Logistics Park', title: 'Warehouse access roads and parking', date: '2026-10-19', status: 'Draft', revisions: [
      { rev: 0, date: '2026-10-19', value: 3150000, note: 'Draft for internal review' },
    ] },
    { id: 'QT-0372', client: 'Desert Palm Real Estate Development', title: 'Villas internal roads', date: '2026-03-10', status: 'Won', revisions: [
      { rev: 0, date: '2026-02-01', value: 13400000, note: '' },
      { rev: 1, date: '2026-03-10', value: 12660000, note: 'Negotiated' },
    ] },
    { id: 'QT-0365', client: 'Saadiyat Estates', title: 'Beachfront promenade paving', date: '2026-01-22', status: 'Lost', revisions: [
      { rev: 0, date: '2026-01-22', value: 5200000, note: 'Lost on price (-6%)' },
    ] },
  ];
  const variations = [
    { id: 'VO-01', project: 'P-2401', date: '2026-05-14', desc: 'Additional bus lay-by at Ch. 1+250', value: 386000, status: 'Approved' },
    { id: 'VO-02', project: 'P-2401', date: '2026-09-02', desc: 'Upgrade W-beam barrier to thrie-beam on bridge approaches', value: 214500, status: 'Submitted' },
    { id: 'VO-01', project: 'P-2402', date: '2026-07-21', desc: 'Relocation of telecom chambers on Street 14', value: 92800, status: 'Approved' },
    { id: 'VO-01', project: 'P-2404', date: '2025-12-04', desc: 'Additional speed humps near school zone', value: 48600, status: 'Approved' },
  ];

  const ipcs = [
    { id: 'IPC-2401-08', project: 'P-2401', no: 8, date: '2026-08-31', period: 'Aug 2026', prevCum: 5912000, cumWork: 6920000, status: 'Paid' },
    { id: 'IPC-2401-09', project: 'P-2401', no: 9, date: '2026-09-30', period: 'Sep 2026', prevCum: 6920000, cumWork: 8040000, status: 'Certified' },
    { id: 'IPC-2402-03', project: 'P-2402', no: 3, date: '2026-09-30', period: 'Sep 2026', prevCum: 1090000, cumWork: 1820000, status: 'Certified' },
    { id: 'IPC-2404-12', project: 'P-2404', no: 12, date: '2026-09-15', period: 'Final', prevCum: 5275000, cumWork: 5790000, status: 'Submitted' },
  ];
  const invoices = [
    { id: 'INV-26-0142', ipc: 'IPC-2401-08', client: 'Al Wathba Industrial Estates LLC', project: 'P-2401', date: '2026-08-31', due: '2026-09-30', net: 806400, paid: 806400 },
    { id: 'INV-26-0151', ipc: 'IPC-2401-09', client: 'Al Wathba Industrial Estates LLC', project: 'P-2401', date: '2026-09-30', due: '2026-10-30', net: 896000, paid: 0 },
    { id: 'INV-26-0152', ipc: 'IPC-2402-03', client: 'Capital Logistics Parks PJSC', project: 'P-2402', date: '2026-09-30', due: '2026-10-30', net: 584000, paid: 250000 },
    { id: 'INV-26-0118', ipc: '', client: 'Eastern Region Municipal Works', project: 'P-2404', date: '2026-07-15', due: '2026-08-14', net: 412000, paid: 0 },
    { id: 'INV-26-0097', ipc: '', client: 'Eastern Region Municipal Works', project: 'P-2404', date: '2026-05-31', due: '2026-06-30', net: 520000, paid: 520000 },
  ];

  const bank = [
    { id: 'BA-1', name: 'Main Operating Account', balance: 4185000 },
    { id: 'BA-2', name: 'Payroll Account (WPS)', balance: 642000 },
    { id: 'BA-3', name: 'Retention & Guarantees Account', balance: 1310000 },
  ];
  // Monthly cash (AED k): actuals Nov 25–Oct 26, forecast Nov 26–Apr 27
  const months = ['Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26', 'Nov 26', 'Dec 26', 'Jan 27', 'Feb 27', 'Mar 27', 'Apr 27'];
  const cashflow = months.map((m, i) => {
    const inflow = round(900 + i * 70 + rnd() * 400);
    const outflow = round(850 + i * 62 + rnd() * 350);
    return { month: m, inflow, outflow, forecast: i >= 12 };
  });
  const payables = [
    { id: 'BILL-8820', supplier: 'S-01', ref: 'PO-5506', date: '2026-09-25', due: '2026-11-24', amount: 109725 },
    { id: 'BILL-8841', supplier: 'S-02', ref: 'PO-5512', date: '2026-10-20', due: '2026-12-04', amount: 51975 },
    { id: 'BILL-8790', supplier: 'S-07', ref: 'Rebar Aug', date: '2026-08-20', due: '2026-10-04', amount: 46305 },
    { id: 'SUB-0312', supplier: 'Al Reem Lighting Subcontracting', ref: 'Sub. cert 4', date: '2026-10-10', due: '2026-11-09', amount: 218400 },
  ];
  // Other VAT-able purchases not driven by POs (subcontractors, rentals, services), per quarter.
  const otherPurchases = [
    { quarter: '2026-Q1', net: 2140000 }, { quarter: '2026-Q2', net: 2460000 },
    { quarter: '2026-Q3', net: 2880000 }, { quarter: '2026-Q4', net: 910000 },
  ];
  const otherSales = [
    { quarter: '2026-Q1', net: 2380000 }, { quarter: '2026-Q2', net: 2950000 },
    { quarter: '2026-Q3', net: 1760000 }, { quarter: '2026-Q4', net: 0 },
  ];

  const empDefs = [
    ['E-1001', 'Khalid Mansour', 'Project Manager', 'Projects', 'Jordan', '2016-03-01', 24000, 8000, 2000],
    ['E-1002', 'Rajesh Nair', 'Project Manager', 'Projects', 'India', '2018-07-15', 21000, 7000, 2000],
    ['E-1003', 'Omar Haddad', 'Site Engineer', 'Projects', 'Egypt', '2021-01-10', 12000, 4000, 1500],
    ['E-1004', 'Fatima Al Suwaidi', 'Finance Manager', 'Finance', 'UAE', '2019-04-01', 26000, 9000, 2500],
    ['E-1005', 'Liam O\'Connor', 'Quantity Surveyor', 'Commercial', 'Ireland', '2020-09-01', 16000, 5500, 1500],
    ['E-1006', 'Muhammad Asif', 'Foreman', 'Projects', 'Pakistan', '2014-02-20', 5200, 1800, 600],
    ['E-1007', 'Sanjeewa Perera', 'Paver Operator', 'Plant', 'Sri Lanka', '2017-11-05', 3800, 1200, 500],
    ['E-1008', 'Abdul Karim', 'Roller Operator', 'Plant', 'Bangladesh', '2022-03-14', 3200, 1000, 400],
    ['E-1009', 'Ramesh Thapa', 'Grader Operator', 'Plant', 'Nepal', '2019-06-01', 3600, 1100, 500],
    ['E-1010', 'Joseph Mwangi', 'Surveyor', 'Projects', 'Kenya', '2023-01-09', 6500, 2200, 800],
    ['E-1011', 'Aisha Rahman', 'HR & Payroll Officer', 'Admin', 'India', '2021-08-16', 9000, 3000, 1000],
    ['E-1012', 'Imran Qureshi', 'Storekeeper', 'Stores', 'Pakistan', '2020-05-04', 4200, 1400, 500],
    ['E-1013', 'Mark Dela Cruz', 'Procurement Officer', 'Procurement', 'Philippines', '2022-10-01', 8500, 2800, 900],
    ['E-1014', 'Sameer Khan', 'Labourer', 'Projects', 'India', '2024-04-15', 1500, 600, 300],
    ['E-1015', 'Bilal Hussain', 'Labourer', 'Projects', 'Pakistan', '2025-02-01', 1500, 600, 300],
    ['E-1016', 'Nabin Gurung', 'Asphalt Plant Operator', 'Plant', 'Nepal', '2018-12-10', 4500, 1500, 500],
  ];
  const site = { Projects: 'P-2401', Plant: 'P-2401', Stores: '', Admin: '', Finance: '', Commercial: '', Procurement: '' };
  const employees = empDefs.map(([id, name, role, dept, nationality, joined, basic, housing, transport], i) => ({
    id, name, role, dept, nationality, joined, basic, housing, transport,
    project: i === 1 ? 'P-2402' : i === 2 ? 'P-2403' : site[dept],
    labourCard: String(10000000000000 + i * 7919337),
    iban: 'AE07' + String(331234567890123456 + i * 1000003).padStart(19, '0'),
    leaveBalance: round(8 + rnd() * 22),
    status: 'Active',
  }));
  const timesheets = {};
  employees.forEach((e) => {
    const field = ['Projects', 'Plant', 'Stores'].includes(e.dept) && e.basic < 10000;
    timesheets[e.id] = {
      normal: 208,
      ot: field ? round(10 + rnd() * 36) : 0,
      otHoliday: field ? round(rnd() * 12) : 0,
      unpaidDays: e.id === 'E-1015' ? 2 : 0,
    };
  });
  const leaves = [
    { id: 'LV-0441', emp: 'E-1007', type: 'Annual', from: '2026-11-10', to: '2026-12-09', days: 30, status: 'Pending' },
    { id: 'LV-0442', emp: 'E-1003', type: 'Annual', from: '2026-12-20', to: '2026-12-31', days: 12, status: 'Pending' },
    { id: 'LV-0438', emp: 'E-1015', type: 'Unpaid', from: '2026-10-06', to: '2026-10-07', days: 2, status: 'Approved' },
    { id: 'LV-0437', emp: 'E-1009', type: 'Sick', from: '2026-10-02', to: '2026-10-03', days: 2, status: 'Approved' },
  ];

  const equipment = [
    ['EQ-01', 'Asphalt Paver – Vögele Super 1800', 'Paver', 'Own', 1450000, '2021-03-01', 10, 150000, 420],
    ['EQ-02', 'Tandem Roller 10 t', 'Roller', 'Own', 380000, '2022-06-01', 8, 40000, 160],
    ['EQ-03', 'Pneumatic Tyre Roller 24 t', 'Roller', 'Own', 420000, '2020-02-01', 8, 40000, 170],
    ['EQ-04', 'Motor Grader 140K', 'Grader', 'Own', 920000, '2019-09-01', 10, 90000, 290],
    ['EQ-05', 'Excavator 30 t', 'Excavator', 'Own', 610000, '2021-11-01', 10, 60000, 230],
    ['EQ-06', 'Cold Milling Machine 2 m', 'Milling', 'Subcontractor: Rapid Plant Hire', 0, '', 0, 0, 640],
    ['EQ-07', 'Tipper Truck 20 m³ (×4)', 'Truck', 'Own', 1240000, '2020-05-01', 8, 120000, 380],
    ['EQ-08', 'Water Tanker 5,000 gal', 'Tanker', 'Subcontractor: Al Ameen Transport', 0, '', 0, 0, 95],
    ['EQ-09', 'Asphalt Batch Plant 160 tph', 'Plant', 'Own', 3800000, '2018-01-01', 15, 400000, 0],
    ['EQ-10', 'Smooth Drum Roller 12 t', 'Roller', 'Subcontractor: Rapid Plant Hire', 0, '', 0, 0, 150],
  ].map(([id, name, type, owner, cost, bought, life, salvage, rate]) => ({ id, name, type, owner, cost, bought, life, salvage, rate }));
  const bookings = [
    { eq: 'EQ-01', project: 'P-2401', from: '2026-10-05', to: '2026-11-20' },
    { eq: 'EQ-02', project: 'P-2401', from: '2026-10-05', to: '2026-11-20' },
    { eq: 'EQ-03', project: 'P-2401', from: '2026-10-12', to: '2026-11-13' },
    { eq: 'EQ-04', project: 'P-2403', from: '2026-10-01', to: '2026-11-30' },
    { eq: 'EQ-05', project: 'P-2403', from: '2026-10-01', to: '2026-12-15' },
    { eq: 'EQ-06', project: 'P-2402', from: '2026-10-19', to: '2026-11-06' },
    { eq: 'EQ-07', project: 'P-2402', from: '2026-10-19', to: '2026-12-04' },
    { eq: 'EQ-08', project: 'P-2401', from: '2026-09-01', to: '2026-12-31' },
    { eq: 'EQ-09', project: 'P-2401', from: '2026-09-15', to: '2026-12-15' },
    { eq: 'EQ-01', project: 'P-2402', from: '2026-11-23', to: '2026-12-11' },
  ];
  const eqRequests = [
    { id: 'ER-071', project: 'P-2402', type: 'Roller', from: '2026-11-09', to: '2026-11-27', by: 'Rajesh Nair', status: 'Pending' },
    { id: 'ER-070', project: 'P-2403', type: 'Truck', from: '2026-11-02', to: '2026-11-30', by: 'Omar Haddad', status: 'Pending' },
  ];

  const leads = [
    { id: 'L-301', company: 'Al Noor Logistics Park', contact: 'Hamad Al Ketbi', value: 3150000, stage: 'Proposal', next: '2026-10-28', note: 'Site visit done; BOQ priced' },
    { id: 'L-302', company: 'Western Gateway Ports Co.', contact: 'Sara Lindqvist', value: 24480000, stage: 'Negotiation', next: '2026-10-30', note: 'Clarification meeting on Rev 1' },
    { id: 'L-303', company: 'Yas Business District', contact: 'Ahmed Fikri', value: 7800000, stage: 'Qualified', next: '2026-11-04', note: 'Pre-qualification docs submitted' },
    { id: 'L-304', company: 'Al Dhafra Solar Park (EPC)', contact: 'Priya Menon', value: 11200000, stage: 'Lead', next: '2026-11-12', note: 'Access & perimeter roads' },
  ];

  const users = [
    { name: 'Admin', email: 'admin@jazallah-roads.example', role: 'Administrator' },
    { name: 'Fatima Al Suwaidi', email: 'fatima@jazallah-roads.example', role: 'Finance' },
    { name: 'Khalid Mansour', email: 'khalid@jazallah-roads.example', role: 'Project Manager' },
    { name: 'Mark Dela Cruz', email: 'mark@jazallah-roads.example', role: 'Procurement' },
    { name: 'Aisha Rahman', email: 'aisha@jazallah-roads.example', role: 'HR' },
    { name: 'Imran Qureshi', email: 'imran@jazallah-roads.example', role: 'Storekeeper' },
  ];

  return {
    version: 1, today: TODAY, company, projects, reports, rfis, suppliers, items, warehouses, stock, stockTx,
    requisitions, rfqs, pos, quotations, variations, ipcs, invoices, bank, cashflow, payables, otherPurchases, otherSales,
    employees, timesheets, leaves, equipment, bookings, eqRequests, leads, users, seq: 100,
  };
};
