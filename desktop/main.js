// JRC ERP desktop shell: loads the bundled web app (app/index.html) in a locked-down window
// and adds native menus, window-state memory, safe external links and file dialogs.
const { app, BrowserWindow, Menu, shell, dialog, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

const isMac = process.platform === 'darwin';
const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');
let win;

function loadState() {
  try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch (e) { return { width: 1440, height: 900 }; }
}
function saveState() {
  if (!win || win.isDestroyed()) return;
  const b = win.getNormalBounds();
  try { fs.writeFileSync(stateFile(), JSON.stringify({ ...b, maximized: win.isMaximized() })); } catch (e) { /* ignore */ }
}

function createWindow() {
  const st = loadState();
  win = new BrowserWindow({
    x: st.x, y: st.y, width: st.width || 1440, height: st.height || 900, minWidth: 1024, minHeight: 680,
    title: 'JRC ERP', show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0e1218' : '#f5f6f8',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true },
  });
  if (st.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());
  win.on('close', saveState);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));

  // Anything that is not the bundled app (mailto:, https:) opens in the user's default program.
  const external = (url) => !url.startsWith('file:');
  win.webContents.setWindowOpenHandler(({ url }) => { if (external(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (external(url)) { e.preventDefault(); shell.openExternal(url); } });

  // Exports (CSV, XML, WPS SIF, JSON) go through a native "Save as" dialog that starts in Downloads.
  win.webContents.session.on('will-download', (e, item) => {
    item.setSaveDialogOptions({ defaultPath: path.join(app.getPath('downloads'), item.getFilename()) });
  });
}

// Renderer helpers: run code in the page (navigate, call actions) without exposing Node to it.
const run = (js) => win && win.webContents.executeJavaScript(js).catch(() => {});
const go = (route) => run(`location.hash = '#/${route}'`);

ipcMain.handle('backup:save', async (e, json) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save backup', defaultPath: path.join(app.getPath('documents'), `jrc-erp-backup-${new Date().toISOString().slice(0, 10)}.json`),
    filters: [{ name: 'JRC ERP backup', extensions: ['json'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, json);
  return filePath;
});
ipcMain.handle('backup:open', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, { title: 'Restore backup', properties: ['openFile'], filters: [{ name: 'JRC ERP backup', extensions: ['json'] }] });
  if (canceled || !filePaths[0]) return null;
  return fs.readFileSync(filePaths[0], 'utf8');
});

function guidePath() {
  const packaged = path.join(process.resourcesPath, 'JRC-ERP-How-It-Works.pdf');
  return fs.existsSync(packaged) ? packaged : path.join(__dirname, '..', 'docs', 'JRC-ERP-How-It-Works.pdf');
}

function buildMenu() {
  const nav = [
    ['Dashboard', 'dashboard', 'CmdOrCtrl+1'], ['Projects & BOQ', 'projects', 'CmdOrCtrl+2'], ['Procurement', 'procurement', 'CmdOrCtrl+3'],
    ['Warehouse', 'warehouse', 'CmdOrCtrl+4'], ['Sales & Billing', 'sales', 'CmdOrCtrl+5'], ['Cash & Accounts', 'finance', 'CmdOrCtrl+6'],
    ['Accounting', 'accounting', 'CmdOrCtrl+7'], ['HR & Payroll', 'hr', 'CmdOrCtrl+8'], ['Equipment', 'equipment', 'CmdOrCtrl+9'],
  ];
  const template = [
    ...(isMac ? [{ label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'services' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Quick Find…', accelerator: 'CmdOrCtrl+K', click: () => run('Palette.show()') },
        { type: 'separator' },
        { label: 'Save Backup…', accelerator: 'CmdOrCtrl+S', click: () => run('Actions.exportJson()') },
        { label: 'Restore Backup…', accelerator: 'CmdOrCtrl+O', click: () => run('Actions.desktopRestore()') },
        { type: 'separator' },
        { label: 'Print…', accelerator: 'CmdOrCtrl+P', click: () => win.webContents.print() },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Light / Dark Theme', accelerator: 'CmdOrCtrl+Shift+L', click: () => run('Actions.cycleTheme()') },
        { label: 'Collapse / Expand Sidebar', accelerator: 'CmdOrCtrl+B', click: () => run('Actions.toggleRail()') },
        { type: 'separator' },
        { role: 'reload' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }]),
      ],
    },
    {
      label: 'Go',
      submenu: [
        ...nav.map(([label, route, accelerator]) => ({ label, accelerator, click: () => go(route) })),
        { type: 'separator' },
        { label: 'Approvals', accelerator: 'CmdOrCtrl+Shift+A', click: () => go('approvals') },
        { label: 'Notifications', accelerator: 'CmdOrCtrl+Shift+N', click: () => go('notifications') },
        { label: 'Assistant', accelerator: 'CmdOrCtrl+Shift+F', click: () => go('assistant') },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => go('settings') },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'How JRC ERP Works (PDF)', click: () => shell.openPath(guidePath()) },
        { label: 'Keyboard Shortcuts', accelerator: 'Shift+/', click: () => run('Actions.shortcuts()') },
        { type: 'separator' },
        { label: 'Open Data Folder', click: () => shell.openPath(app.getPath('userData')) },
        ...(isMac ? [] : [{ type: 'separator' }, { role: 'about' }]),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.setAboutPanelOptions({ applicationName: 'JRC ERP', applicationVersion: app.getVersion(), copyright: '© 2026 Jazallah Road Contracting L.L.C.', credits: 'Construction ERP — projects, supply chain, billing, accounting, HR and plant.' });
  app.whenReady().then(() => {
    buildMenu();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (!isMac) app.quit(); });
}
