// Copies the web app (../erp) into ./app so the desktop build always ships the current ERP.
const fs = require('fs');
const path = require('path');
const src = path.resolve(__dirname, '../../erp');
const dst = path.resolve(__dirname, '../app');
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true, filter: (p) => !/[\\/]tests([\\/]|$)/.test(p) });
console.log(`Synced ${src} -> ${dst}`);
