// App shell: navigation, routing, access control, event delegation.
const NAV = [
  ['Overview', [['dashboard', '◧', 'Dashboard'], ['approvals', '✓', 'Approvals'], ['notifications', '🔔', 'Notifications'], ['assistant', '✦', 'Assistant']]],
  ['Delivery', [['projects', '▤', 'Projects & BOQ'], ['site', '📱', 'Site app'], ['quality', '◎', 'QA/QC & HSE'], ['production', '▣', 'Asphalt Plant'], ['equipment', '⚙', 'Equipment']]],
  ['Supply chain', [['procurement', '⇄', 'Procurement'], ['warehouse', '▦', 'Warehouse'], ['subcontracts', '⚒', 'Subcontractors']]],
  ['Commercial', [['crm', '☏', 'CRM'], ['sales', '✎', 'Sales & Billing'], ['contracts', '§', 'Contracts & Compliance']]],
  ['Finance', [['finance', '◔', 'Cash & Accounts'], ['accounting', '≡', 'Accounting'], ['vat', '%', 'Taxes']]],
  ['People', [['hr', '☺', 'HR & Payroll']]],
  ['System', [['settings', '⚑', 'Settings']]],
];

function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/').map(decodeURIComponent);
  return { page: parts[0], args: parts.slice(1) };
}

function renderNav(active) {
  document.getElementById('nav').innerHTML = NAV.map(([group, links]) => {
    const vis = links.filter(([k]) => canSee(k));
    return vis.length ? `<div class="nav-group">${group}</div>` + vis.map(([k, ico, label]) => `<a class="nav-link ${k === active ? 'active' : ''}" href="#/${k}"><span class="nav-ico">${ico}</span>${label}</a>`).join('') : '';
  }).join('');
}

function pendingApprovals() {
  const s = S();
  return (canApprove('requisitions') ? s.requisitions.filter((r) => r.status === 'Pending').length : 0)
    + (canApprove('pos') ? s.pos.filter((p) => p.approval === 'Pending').length : 0)
    + (canApprove('leaves') ? s.leaves.filter((l) => l.status === 'Pending').length : 0)
    + (canApprove('eqRequests') ? s.eqRequests.filter((r) => r.status === 'Pending').length : 0);
}

function renderUser() {
  const u = currentUser();
  document.getElementById('user-switch').innerHTML = options(S().users.map((x) => [x.email, `${x.name} · ${x.role}`]), u.email);
  document.getElementById('avatar').textContent = u.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function render() {
  const { page, args } = route();
  let p = Pages[page] || Pages.dashboard;
  let key = Pages[page] ? page : 'dashboard';
  const view = document.getElementById('view');
  renderUser();
  if (!canSee(key)) {
    const first = NAV.flatMap(([, l]) => l).find(([k]) => canSee(k));
    renderNav('');
    document.getElementById('page-title').textContent = 'No access';
    view.innerHTML = `<div class="card empty">Your role (${esc(currentUser().role)}) cannot open this module.<div class="mt"><a class="btn primary" href="#/${first[0]}">Go to ${first[2]}</a></div></div>`;
  } else {
    renderNav(key);
    const title = typeof p.title === 'function' ? p.title(args) : p.title;
    document.getElementById('page-title').textContent = title;
    document.title = `${title} · JRC ERP`;
    view.innerHTML = p.render(args);
  }
  document.getElementById('approval-count').textContent = pendingApprovals();
  const unread = Notify.unread().length;
  const bell = document.getElementById('bell-count');
  bell.textContent = unread;
  bell.style.display = unread ? '' : 'none';
  document.getElementById('sidebar').classList.remove('open');
}

function commit(msg) {
  Store.save();
  render();
  if (msg) toast(msg);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = Actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el); }
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const fn = Actions[el.dataset.change];
  if (fn) fn(el.value, el.dataset, el);
});
document.getElementById('search').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = e.target.q.value.trim();
  if (q) location.hash = '#/assistant/' + encodeURIComponent(q);
});

Actions.toggleNav = () => document.getElementById('sidebar').classList.toggle('open');
Actions.switchUser = (v) => { S().currentUser = v; commit(`Signed in as ${currentUser().name}`); };
Actions.resetDemo = () => {
  if (confirm('Reset all demo data to the original sample?')) { Store.reset(); commit('Demo data reset'); }
};

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
Store.load();
render();
