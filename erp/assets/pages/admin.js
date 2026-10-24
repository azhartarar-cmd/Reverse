Pages.settings = {
  title: 'Settings',
  render() {
    const s = S();
    const c = s.company;
    s.approvalRules = s.approvalRules || [
      { doc: 'Material requisition', limit: 50000, approver: 'Project Manager' },
      { doc: 'Material requisition', limit: Infinity, approver: 'Administrator' },
      { doc: 'Purchase order', limit: 100000, approver: 'Procurement' },
      { doc: 'Purchase order', limit: Infinity, approver: 'Finance' },
      { doc: 'Leave request', limit: Infinity, approver: 'HR' },
      { doc: 'Equipment request', limit: Infinity, approver: 'Project Manager' },
    ];
    const perms = {
      Administrator: 'All modules', Finance: 'Finance, VAT, Sales & Billing, Approvals', 'Project Manager': 'Projects, Equipment, Requisitions, Site reports',
      Procurement: 'Procurement, Warehouse (read)', HR: 'HR & Payroll', Storekeeper: 'Warehouse',
    };
    return `<div class="grid cols-2">
      ${card('Company profile', `<div style="line-height:1.9">
        <div><span class="muted">Trading name</span><br><b>${esc(c.name)}</b></div>
        <div><span class="muted">Legal name</span><br>${esc(c.legalName)}</div>
        <div><span class="muted">TRN</span><br>${esc(c.trn)}</div>
        <div><span class="muted">Address</span><br>${esc(c.address)}</div>
        <div><span class="muted">Contract defaults</span><br>VAT ${c.vatRate}% · Retention ${c.retentionPct}% · Advance recovery ${c.advancePct}%</div></div>`,
      { actions: '<button class="btn sm" data-act="editCompany">Edit</button>' })}
      ${card('Data', `<p class="muted">This demo stores everything in your browser. Export a backup or reset to the sample data.</p>
        <div class="btn-row"><button class="btn" data-act="exportJson">Export backup (JSON)</button><label class="btn">Import backup<input type="file" accept="application/json" style="display:none" data-change="importJson"></label><button class="btn bad" data-act="resetDemo">Reset demo data</button></div>`)}
    </div>
    <div class="grid cols-2 mt">
      ${card('Users & roles', table([
        { h: 'Name', f: (u) => esc(u.name) },
        { h: 'Email', f: (u) => esc(u.email) },
        { h: 'Role', f: (u) => `<span class="badge b-info">${esc(u.role)}</span>` },
        { h: 'Access', f: (u) => `<span class="small muted">${perms[u.role] || ''}</span>`, cls: 'wrap' },
      ], s.users), { flush: true, actions: '<button class="btn primary sm" data-act="addUser">+ User</button>' })}
      ${card('Approval workflow', table([
        { h: 'Document', f: (r) => r.doc },
        { h: 'Up to (AED)', num: true, f: (r) => (r.limit === Infinity || r.limit === null ? 'Any amount' : num(r.limit)) },
        { h: 'Approver role', f: (r) => r.approver },
      ], s.approvalRules), { flush: true })}
    </div>`;
  },
};
Actions.editCompany = () => {
  const c = S().company;
  openModal('Company profile', [
    { name: 'name', label: 'Trading name', value: c.name },
    { name: 'legalName', label: 'Legal name', value: c.legalName },
    { name: 'trn', label: 'Tax registration number (TRN)', value: c.trn },
    { name: 'phone', label: 'Phone', value: c.phone },
    { name: 'address', label: 'Address', value: c.address, full: true },
    { name: 'retentionPct', label: 'Retention %', type: 'number', step: 'any', value: c.retentionPct },
    { name: 'advancePct', label: 'Advance recovery %', type: 'number', step: 'any', value: c.advancePct },
    { name: 'molEstablishmentId', label: 'MOHRE establishment ID (WPS)', value: c.molEstablishmentId },
    { name: 'bankRoutingCode', label: 'WPS agent routing code', value: c.bankRoutingCode },
  ], (x) => Object.assign(c, x));
};
Actions.addUser = () => openModal('Invite user', [
  { name: 'name', label: 'Name' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'role', label: 'Role', type: 'select', options: options(['Administrator', 'Finance', 'Project Manager', 'Procurement', 'HR', 'Storekeeper'].map((r) => [r, r])) },
], (x) => { S().users.push(x); });
Actions.exportJson = () => download(`jrc-erp-backup-${today()}.json`, JSON.stringify(S(), null, 2), 'application/json');
Actions.importJson = (v, d, el) => {
  const f = el.files[0];
  if (!f) return;
  f.text().then((t) => {
    try {
      const data = JSON.parse(t);
      if (!data.projects || !data.company) throw new Error('not a JRC backup');
      Store.state = data;
      commit('Backup imported');
    } catch (e) { alert('Could not import: ' + e.message); }
  });
};
