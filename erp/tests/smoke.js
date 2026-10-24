// Smoke test: opens every route/tab, runs key workflows, checks the ledger reconciles.
// Usage: node erp/tests/smoke.js <screenshot-dir>   (needs Playwright + Chromium)
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = [];
  pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message + ' @ ' + (e.stack||'').split('\n')[1]));
  pg.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  pg.on('dialog', (d) => { errs.push('DIALOG ' + d.message().slice(0,150)); d.accept(); });
  await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  const go = async (r) => { await pg.evaluate((r) => { location.hash = '#/' + r; }, r); await pg.waitForTimeout(60); };
  const tabsOf = { projects: [], 'projects/P-2401': ['overview','boq','chainage','cashflow','gantt','reports','documents','billing'], 'projects/P-2403': ['chainage','cashflow','documents'],
    procurement: ['requisitions','rfq','orders','analysis','suppliers'], warehouse: ['stock','movements','consumption'], subcontracts: ['contracts','certs','backcharges'],
    production: ['orders','tickets','mixes','yield'], quality: ['inspections','tests','ncr','hse'], contracts: ['bonds','permits','claims','escalation'],
    crm: ['pipeline','calendar','history'], sales: ['quotations','variations','billing','milestones','invoices','soa'],
    finance: ['cash','receivables','payables','revenue','overheads','currency','close'], accounting: ['tb','pnl','bs','gl','journals','coa','projects'],
    vat: ['2026-Q1','2026-Q3','2026-Q4','ct'], hr: ['employees','timesheets','leave','payroll','eosb','documents','camps'],
    equipment: ['fleet','calendar','requests','logs','maintenance','depreciation'], dashboard: [], approvals: [], notifications: [], assistant: ['overdue invoices','P-2401','bitumen stock','expiring documents','how do I run wps','LD exposure','cash','zzzz','Khalid'], site: [], settings: [] };
  let n = 0;
  for (const [base, ts] of Object.entries(tabsOf)) {
    for (const t of ['', ...ts]) {
      const r = t ? `${base}/${encodeURIComponent(t)}` : base; await go(r); n++;
      const txt = await pg.evaluate(() => document.getElementById('view').innerText);
      if (/NaN|undefined|Infinity|\[object/.test(txt)) errs.push(`BADTEXT ${r}: ` + (txt.match(/.{0,50}(NaN|undefined|Infinity|\[object).{0,20}/) || [])[0]);
      if (txt.length < 30) errs.push('EMPTY ' + r);
    }
  }
  console.log('routes checked', n);
  // ledger checks
  const chk = await pg.evaluate(() => {
    const res = {};
    for (const e of ['ALL','JRC','JPH']) {
      const b = Ledger.balances(e, { to: today() });
      const tot = Object.values(b).reduce((a, x) => a + x.dr - x.cr, 0);
      const p = Ledger.pnl(e, Ledger.yearStart, today());
      const bal = (c) => (b[c]?.dr||0)-(b[c]?.cr||0);
      const bank = S().bank.filter(x => e==='ALL' || x.entity===e).reduce((a,x)=>a+x.balance,0);
      const glBank = ['1010','1020','1030','1040'].reduce((a,c)=>a+bal(c),0);
      res[e] = { tbDiff: Math.round(tot*100)/100, revenue: Math.round(p.revenue), net: Math.round(p.net), bankDiff: Math.round(glBank-bank), ar: Math.round(bal('1100')) };
    }
    res.arLive = Math.round(S().invoices.reduce((a,i)=>a+Calc.invoice(i).open,0));
    return res;
  });
  console.log('LEDGER', JSON.stringify(chk));
  // workflows
  await go('projects/P-2401/chainage');
  const before = await pg.evaluate(() => project('P-2401').boq.find(b=>b.code==='4.04').doneQty);
  await pg.click('button[data-act="addChainage"]');
  await pg.selectOption('.modal select[name=layer]', 'Wearing course');
  await pg.fill('.modal input[name=from]', '1+800'); await pg.fill('.modal input[name=to]', '2+300');
  await pg.click('.modal button.primary');
  const after = await pg.evaluate(() => project('P-2401').boq.find(b=>b.code==='4.04').doneQty);
  console.log('chainage BOQ wearing', before, '->', after);
  await go('production');
  const bit0 = await pg.evaluate(() => S().stock['W-01']['I-04']);
  await pg.click('button[data-act="produce"]');
  const bit1 = await pg.evaluate(() => S().stock['W-01']['I-04']);
  console.log('produce bitumen', bit0, '->', bit1);
  await go('subcontracts/certs');
  await pg.click('button[data-act="approveSubCert"]');
  console.log('sub payable', await pg.evaluate(() => S().payables.find(p=>p.ref==='SC-03 cert 2')?.amount));
  await go('equipment/logs'); await pg.click('button[data-act="newPlantLog"]'); await pg.fill('.modal input[name=fuel]', '120'); await pg.click('.modal button.primary');
  await go('sales/milestones'); await pg.click('button[data-act="invoiceMilestone"]');
  await go('sales/invoices'); await pg.click('button[data-act="printInvoice"] >> nth=0');
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('.modal button[data-act="einvoice"]')]);
  const fs = require('fs'); const xml = fs.readFileSync(await dl.path(), 'utf8'); console.log('einvoice', dl.suggestedFilename(), xml.length, /<cbc:PayableAmount/.test(xml));
  await pg.click('.modal [data-close]');
  await go('hr/payroll'); await pg.click('button[data-act="postPayroll"]');
  await go('finance/currency'); if (await pg.$('button[data-act="revalue"]')) await pg.click('button[data-act="revalue"]');
  await go('finance/payables'); await pg.click('button[data-act="payBill"] >> nth=0'); await pg.click('.modal button.primary');
  await go('sales/invoices'); await pg.click('button[data-act="receipt"] >> nth=0'); await pg.click('.modal button.primary');
  await go('accounting/journals'); await pg.click('button[data-act="newJournal"]');
  await pg.selectOption('.modal select[name=a1]', '6200'); await pg.fill('.modal input[name=v1]', '1000'); await pg.selectOption('.modal select[name=a2]', '1010'); await pg.fill('.modal input[name=v2]', '-1000'); await pg.click('.modal button.primary');
  const chk2 = await pg.evaluate(() => { const r={}; for (const e of ['ALL','JRC','JPH']) { const b = Ledger.balances(e,{to:today()}); const bal=(c)=>(b[c]?.dr||0)-(b[c]?.cr||0); r[e]={tb: Math.round(Object.values(b).reduce((a,x)=>a+x.dr-x.cr,0)*100)/100, bankDiff: Math.round(['1010','1020','1030','1040'].reduce((a,c)=>a+bal(c),0) - S().bank.filter(x=>e==='ALL'||x.entity===e).reduce((a,x)=>a+x.balance,0)), ar: Math.round(bal('1100'))}; } r.bankPerAccount = Object.entries(Ledger.bankAcc).map(([id,c])=>{const b=Ledger.balances(S().bank.find(x=>x.id===id).entity,{to:today()});const g=Ledger.balances('ALL',{to:today()});const live=S().bank.find(x=>x.id===id).balance;return Math.round(((b[c]?.dr||0)-(b[c]?.cr||0))-live)+'/'+Math.round(((g[c]?.dr||0)-(g[c]?.cr||0))-live)}).join(' '); r.arLive=Math.round(S().invoices.reduce((a,i)=>a+Calc.invoice(i).open,0)); r.apLive=Math.round(openBills().reduce((a,b)=>a+b.amount+(b.reval||0),0)); const b=Ledger.balances('JRC',{to:today()}); r.apGL=Math.round(-(((b['2000']?.dr||0)-(b['2000']?.cr||0))+((b['2050']?.dr||0)-(b['2050']?.cr||0)))); return r; });
  console.log('LEDGER after workflows', JSON.stringify(chk2));
  await go('accounting/bs'); await pg.screenshot({ path: `${out}/n_bs.png`, fullPage: true });
  console.log('BS badge', await pg.evaluate(() => document.querySelector('#view').innerText.includes('Balances')));
  // role switch
  await pg.selectOption('#user-switch', 'omar@jazallah-roads.example'); await pg.waitForTimeout(60);
  const nav = await pg.evaluate(() => [...document.querySelectorAll('.nav-link')].map(a=>a.textContent.trim()));
  await go('accounting'); const blocked = await pg.evaluate(() => document.getElementById('page-title').textContent);
  console.log('site engineer nav', nav.join(' | '), '| accounting ->', blocked);
  await pg.selectOption('#user-switch', 'admin@jazallah-roads.example');
  // migration: reload with saved state
  await pg.reload(); await pg.waitForTimeout(100);
  // screenshots
  for (const r of ['dashboard','projects/P-2401/chainage','projects/P-2401/cashflow','production/yield','contracts/claims','accounting/pnl','notifications','crm/calendar','hr/documents','quality/hse']) { await go(r); await pg.screenshot({ path: `${out}/n_${r.replace(/\//g,'_')}.png`, fullPage: true }); }
  await pg.setViewportSize({ width: 390, height: 844 }); await go('site'); await pg.waitForTimeout(400);
  console.log('mobile scrollWidth', await pg.evaluate(() => document.documentElement.scrollWidth));
  await pg.screenshot({ path: `${out}/n_mobile_site.png` });
  console.log(errs.length ? errs.join('\n') : 'NO ERRORS');
  await b.close();
})();
