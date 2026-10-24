// App shell: navigation, routing, event delegation.
const NAV = [
  ['Overview', [['dashboard', '◧', 'Dashboard'], ['approvals', '✓', 'Approvals']]],
  ['Delivery', [['projects', '▤', 'Projects & BOQ'], ['equipment', '⚙', 'Equipment']]],
  ['Supply chain', [['procurement', '⇄', 'Procurement'], ['warehouse', '▦', 'Warehouse']]],
  ['Commercial', [['crm', '☏', 'CRM'], ['sales', '✎', 'Sales & Billing']]],
  ['Finance', [['finance', '◔', 'Cash & Accounts'], ['vat', '%', 'VAT']]],
  ['People', [['hr', '☺', 'HR & Payroll']]],
  ['System', [['settings', '⚑', 'Settings']]],
];

function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/').map(decodeURIComponent);
  return { page: parts[0], args: parts.slice(1) };
}

function renderNav(active) {
  document.getElementById('nav').innerHTML = NAV.map(([group, links]) => `<div class="nav-group">${group}</div>` +
    links.map(([k, ico, label]) => `<a class="nav-link ${k === active ? 'active' : ''}" href="#/${k}"><span class="nav-ico">${ico}</span>${label}</a>`).join('')).join('');
}

function pendingApprovals() {
  const s = S();
  return s.requisitions.filter((r) => r.status === 'Pending').length
    + s.pos.filter((p) => p.approval === 'Pending').length
    + s.leaves.filter((l) => l.status === 'Pending').length
    + s.eqRequests.filter((r) => r.status === 'Pending').length;
}

function render() {
  const { page, args } = route();
  const p = Pages[page] || Pages.dashboard;
  renderNav(Pages[page] ? page : 'dashboard');
  const view = document.getElementById('view');
  const title = typeof p.title === 'function' ? p.title(args) : p.title;
  document.getElementById('page-title').textContent = title;
  document.title = `${title} · JRC ERP`;
  view.innerHTML = p.render(args);
  document.getElementById('approval-count').textContent = pendingApprovals();
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

Actions.toggleNav = () => document.getElementById('sidebar').classList.toggle('open');
Actions.resetDemo = () => {
  if (confirm('Reset all demo data to the original sample?')) { Store.reset(); commit('Demo data reset'); }
};

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
Store.load();
render();
