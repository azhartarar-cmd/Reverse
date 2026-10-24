// Renders erp-overview.html to JRC-ERP-How-It-Works.pdf. Usage: node docs/build-pdf.js <preview-png-dir>
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1123, height: 794 } });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, 'erp-overview.html') + '', { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  const pages = await pg.$$('.page');
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${process.argv[2]}/p${i + 1}.png` });
  await pg.emulateMedia({ media: 'print' });
  await pg.pdf({ path: require('path').resolve(__dirname, 'JRC-ERP-How-It-Works.pdf'), format: 'A4', landscape: true, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
  console.log(pages.length, 'pages', errs.length ? errs : 'no errors');
  await b.close();
})();
