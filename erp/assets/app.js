// App shell: navigation, routing, access control, event delegation.
const NAV = [
  ['Overview', [['dashboard', 'dashboard', 'Dashboard'], ['approvals', 'check', 'Approvals'], ['notifications', 'bell', 'Notifications'], ['assistant', 'sparkle', 'Assistant']]],
  ['Delivery', [['projects', 'folder', 'Projects & BOQ'], ['site', 'phone', 'Site app'], ['quality', 'shield', 'QA/QC & HSE'], ['production', 'factory', 'Asphalt Plant'], ['equipment', 'truck', 'Equipment']]],
  ['Supply chain', [['procurement', 'swap', 'Procurement'], ['warehouse', 'box', 'Warehouse'], ['subcontracts', 'hammer', 'Subcontractors']]],
  ['Commercial', [['crm', 'users', 'CRM'], ['sales', 'receipt', 'Sales & Billing'], ['contracts', 'scale', 'Contracts & Compliance']]],
  ['Finance', [['finance', 'wallet', 'Cash & Accounts'], ['accounting', 'book', 'Accounting'], ['vat', 'percent', 'Taxes']]],
  ['People', [['hr', 'user', 'HR & Payroll']]],
  ['System', [['settings', 'settings', 'Settings']]],
];

function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/').map(decodeURIComponent);
  return { page: parts[0], args: parts.slice(1) };
}

function renderNav(active) {
  const closed = new Set(UI.prefs.closed);
  const counts = { approvals: pendingApprovals(), notifications: Notify.unread().length };
  document.getElementById('nav').innerHTML = NAV.map(([group, links]) => {
    const vis = links.filter(([k]) => canSee(k));
    if (!vis.length) return '';
    const isClosed = closed.has(group) && !vis.some(([k]) => k === active);
    return `<button class="nav-group ${isClosed ? 'closed' : ''}" data-act="toggleGroup" data-g="${group}" aria-expanded="${!isClosed}">${group}${icon('chevron', 12)}</button>
      <div class="nav-items ${isClosed ? 'closed' : ''}">${vis.map(([k, ic, label]) => `<a class="nav-link ${k === active ? 'active' : ''}" href="#/${k}" title="${label}">${icon(ic)}<span>${label}</span>${counts[k] ? `<b class="count">${counts[k]}</b>` : ''}</a>`).join('')}</div>`;
  }).join('');
}
const groupOf = (k) => (NAV.find(([, l]) => l.some(([x]) => x === k)) || [''])[0];

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
    document.getElementById('crumb').textContent = '';
    view.innerHTML = `<div class="card empty">${icon('shield', 32)}<div>Your role (${esc(currentUser().role)}) cannot open this module.</div><a class="btn primary" href="#/${first[0]}">Go to ${first[2]}</a></div>`;
  } else {
    renderNav(key);
    const title = typeof p.title === 'function' ? p.title(args) : p.title;
    document.getElementById('page-title').textContent = title;
    document.getElementById('crumb').textContent = groupOf(key);
    document.title = `${title} · JRC ERP`;
    view.innerHTML = p.render(args);
  }
  document.getElementById('approval-count').textContent = pendingApprovals();
  const unread = Notify.unread().length;
  const bell = document.getElementById('bell-count');
  bell.textContent = unread > 99 ? '99+' : unread;
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
UI.load();
if (window.jrcDesktop) document.body.classList.add('desktop');
render();
