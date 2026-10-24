# JRC ERP — System Specification & Developer Handbook

> **Read this before changing anything.** It describes every feature in the app, the data model, how modules feed each other, the ledger posting rules, the conventions to follow, the known gaps, and the roadmap of features not built yet. A new session should be able to extend the app from this file without reverse-engineering the code.

- **Product:** construction ERP for **Jazallah Road Contracting L.L.C.** (UAE road contractor) and its sister company **Jazallah Plant Hire L.L.C.** (owns the fleet).
- **Origin:** an original build modelled on the module list of all-in-one construction ERPs (FirstBit's public features page was the checklist). No third-party code or branding was copied. Line-by-line coverage: `docs/feature-coverage.md`.
- **State (24 Oct 2026):** static front-end demo with 20 modules, data in browser `localStorage`, about 105 screens, all smoke-tested. Branch: `claude/exciting-franklin-kh9h0x`.
- **Sample data:** all fictional (companies, people, TRNs, IBANs, figures).

---

## 1. Run, test, rebuild

| Task | Command |
|---|---|
| Run | Open `erp/index.html` in a browser, or `python3 -m http.server -d erp 8000` |
| Smoke test (all routes, workflows, ledger reconciliation) | `node erp/tests/smoke.js <screenshot-dir>` (Playwright + Chromium) |
| Rebuild the diagram PDF | `node docs/build-pdf.js <preview-dir>` → `docs/JRC-ERP-How-It-Works.pdf` (source `docs/erp-overview.html`) |
| Reset data in the browser | Sidebar → *Reset demo data*, or Settings |

**A smoke test passes when:**
- `routes checked 105` is printed.
- No `PAGEERR`, `BADTEXT` (NaN/undefined/Infinity in the UI) or `EMPTY` lines.
- `LEDGER after workflows` shows `tb: 0` and `bankDiff: 0` for ALL/JRC/JPH, `ar == arLive`, and `apGL == apLive`.
- The `DIALOG Post 2026-10 payroll…` line is expected; it is a confirm prompt.

---

## 2. Architecture

```
erp/
  index.html            shell (sidebar, topbar with search, bell, approvals pill, user switcher) + script tags
  manifest.webmanifest, sw.js, icon.svg   installable "Site app" (service worker only on http/https)
  assets/
    styles.css          design tokens on :root, dark mode via prefers-color-scheme, components
    data.js             window.buildSeed(): base sample company
    data-ext.js         wraps buildSeed() and adds road/accounting/compliance seed data
    core.js             Store (load/migrate/save/reset), formatters, lookups, Calc, UI helpers, Chart
    ledger.js           Ledger: derives the double-entry general ledger from operational records
    pages/*.js          one file per module: Pages.<route> + Actions.<name>
    pages/ext.js        patches existing pages (HR, Sales, CRM, Finance, Taxes, Settings) + access control
    app.js              NAV, router, render(), commit(), event delegation, user switch
  tests/smoke.js        Playwright smoke test
docs/  ERP-SPEC.md (this), feature-coverage.md, erp-overview.html, build-pdf.js, JRC-ERP-How-It-Works.pdf
```

### Script load order (it matters)
`data.js → data-ext.js → core.js → ledger.js → dashboard → projects → projects-ext → supply → sales → finance → hr → equipment → admin → accounting → subcontracts → production → quality → contracts → assistant → ext.js → app.js`

- `ext.js` must load after the pages it patches.
- `app.js` loads last because it calls `Store.load()` and `render()`.
- `canSee`, `canApprove` and `currentUser` live in `ext.js` and are used by `app.js` and `dashboard.js` at runtime.

### Patterns (follow them)
- **Global state:** `S()` returns `Store.state`.
  - Mutate it directly, then call `commit(msg?)`, which saves, re-renders and toasts.
  - `openModal`'s submit handler calls `commit()` itself. Return `false` from the handler to keep the modal open, e.g. after a validation `alert`.
- **Routing:** the hash is `#/<page>/<arg0>/<arg1>`.
  - `Pages[page].render(args)` returns an HTML string.
  - `title` can be a string or a function of `args`.
  - Tabs use `tabs(base, [[key, label]], active)`, then `(this[tab] || this.default).call(this, args)`.
- **Events:** never attach listeners inside page HTML. Use event delegation.
  - Buttons: `data-act="name"` calls `Actions.name(dataset, el)`.
  - Inputs/selects: `data-change="name"` calls `Actions.name(value, dataset, el)`.
  - Exceptions: a few `onchange="location.hash=…"` selects and `onsubmit` on the assistant form.
- **Building blocks:** `card(title, body, {actions, flush})`, `kpi(label, value, sub)`, `table(cols, rows, {empty, foot})` with `cols = [{h, f: row => html, num, cls}]`, `badge(status)`, `bar(fraction)`, `options([[v, l]], sel)`, `projOptions(sel, filter)`, `openModal(title, fields, onSubmit, {submit, wide, html})`.
- **Formatting:**
  - `num(n, d)`, `aed(n)` (accepts a number or a pre-formatted string), `short(n)` (k/M), `pct(x)`.
  - Dates: `fdate(iso)`, `days(a, b)`, `daysTo(d)`, `addDays(d, n)`, `expiryBadge(d, warnDays)`.
  - Chainage: `ch(m)` → `"2+400"`, `parseCh("2+400")` → 2400.
- **Escaping:** always pass user or data text through `esc()` inside HTML.
- **IDs:** `nextId(prefix)` uses the global counter `S().seq`, so new IDs look like `PO-102`.
- **"Today" is fixed at `S().today = '2026-10-24'`**, not the system clock, so the demo stays consistent. Use `today()` everywhere. Switching to the real date means changing the seed and how `today()` is derived.
- **Charts:** `Chart.bars`, `Chart.line` (a series with a single point renders as a dot), `Chart.hbars`, `Chart.donut`, `Chart.legend`. All are inline SVG coloured with CSS variables `--c1..--c4`, `--bad`, etc.
- **Persistence & migration:** `Store.key = 'jrc-erp-v1'`. `Store.migrate()` runs on every load of saved data:
  - adds any top-level seed key missing from saved data;
  - backfills project fields (company, length, width, ldPerDay, forecastEnd);
  - backfills payables `paid`/`acc`, employee and equipment fields, lead `history`, item `cat`;
  - adds new seed items and bank accounts.
  - **When you add a field to an existing record type, add a default here.**

### Adding a module (checklist)
1. Create `assets/pages/<name>.js` with `Pages.<route> = { title, render(args) { … } }` and its `Actions`.
2. Add the `<script>` tag in `index.html` before `ext.js` / `app.js`.
3. Add a NAV entry in `app.js` (`[route, icon, label]` within a group).
4. Add the route to `ROLE_ACCESS` in `ext.js` for each role that should see it. Administrator is `'*'`.
5. If it owns new data, seed it in `data-ext.js`. `Store.migrate()` picks up new top-level keys automatically.
6. If it moves money or stock, add ledger postings in `Ledger.build()` (section 5) and keep the reconciliation rules.
7. If something can expire or needs action, add a rule to `Notify.list()` in `assistant.js`.
8. Optionally add keywords to the Assistant (`HELP`, `answer`, `search`).
9. Add the route and tabs to `tabsOf` in `erp/tests/smoke.js`, and run it.
10. Update this file and `docs/feature-coverage.md`.

---

## 3. Data model (`S()`)

The ID prefixes shown are those used by seed data and `nextId`.

| Collection | Shape (key fields) | Notes |
|---|---|---|
| `company` | name, legalName, trn, address, phone, email, currency, **vatRate 5**, **retentionPct 10**, **advancePct 10**, molEstablishmentId, bankRoutingCode | Defaults used by IPCs, VAT and WPS. Edited in Settings. |
| `companies` | `{id:'JRC'|'JPH', name, trn, role}` | Ledger entities |
| `projects` | id `P-24xx`, name, client, location, start, end, status (Tender / Active / Defects Liability / Completed), manager, company, **length** (m), **width** (m), **ldPerDay**, **forecastEnd**, **boq[]**, **tasks[]** | |
| `project.boq[]` | id, cat (trade), code `2.03`, desc, unit, qty, rate (sell), costRate (budget), doneQty, actualCost | The core of progress and cost control |
| `project.tasks[]` | cat, from, to (fractions of the programme), pct | Gantt rows. `pct` is recomputed by `Pages.projects.syncTasks(p)` from the BOQ. |
| `chainage[]` | id, project, layer, from, to (m), date, side | `layerMap` maps a layer to its BOQ code |
| `reports[]` `DR-` | project, date, author, weather, manpower, equipment, summary | Daily site reports |
| `rfis[]` | id, project, date, subject, status Open/Answered, due | |
| `documents[]` `DOC-` | project, type, ref, title, rev, date, status, file (name + size only) | |
| `suppliers[]` `S-0x` | name, category, terms ("30 days"), rating, currency | |
| `items[]` `I-xx` | code, name, unit, cost (standard cost), supplier, reorder, cat | Stock is valued at `cost` |
| `warehouses[]` | W-01 Main Yard, W-02 site store P-2401, W-03 site store P-2403 | |
| `stock` | `{ [warehouseId]: { [itemId]: qty } }` | `Calc.stockQty(item)` sums across warehouses |
| `stockTx[]` | id GRN-/GIN-/TRN-/PRD-, date, type Receipt/Issue/Transfer/Production, item, qty, from, to, project, ref | Issue and Production carry a project, so they become project material cost |
| `requisitions[]` `MR-` | project, by, item, qty, need, status Pending/Approved/Rejected/Ordered | |
| `rfqs[]` | req, item, qty, status Open/Closed, quotes[{supplier (id or free text), rate, lead, terms}], awarded | |
| `pos[]` `PO-` | supplier, project, item, qty, rate, currency, received, status Open/Partially received/Received, approval Pending/Approved/Rejected, paid | |
| `payables[]` BILL-/SUB- | supplier (id or name), ref, date, due, amount (**AED incl. VAT**), currency, fxAmount, reval, acc `2000`/`2050`, grn (bool), source `'subcert'`, expense (override account), paid, paidDate, bank | `openBills()` returns the unpaid ones |
| `quotations[]` `QT-` | client, title, date, status Draft/Sent/Won/Lost, revisions[{rev, date, value, note}] | |
| `variations[]` | id `VO-0n` (unique **per project**), project, desc, value, status Submitted/Approved/Rejected | Approved VOs feed the revised contract |
| `ipcs[]` `IPC-2401-09` | project, no, date, period, prevCum (seed fallback), cumWork, status Draft/Submitted/Certified/Paid | |
| `milestones[]` `MS-` | project, desc, pct, due, status Planned/Invoiced, invoice | |
| `invoices[]` `INV-26-` | ipc?, milestone?, client, project, date, due, **net** (excl. VAT), **paid** (net portion paid) | |
| `receipts[]` `RC-` | inv, date, amount (gross), bank | Created by *Record receipt*. Pre-existing `paid` amounts are treated as historical receipts by the ledger. |
| `clients[]` | name, trn, email, address | Used by e-invoices and email |
| `bank[]` | BA-1..3 (JRC), BA-4 (JPH), name, balance, entity | **Live balances.** The ledger reconciles to these. |
| `cashflow[]` | month, inflow, outflow (AED k), forecast | **Seeded series**, used by the dashboard and finance charts and as the source of migrated Jan–Jul ledger summaries |
| `otherSales[]`, `otherPurchases[]` | quarter, net | Extra VAT-able turnover/purchases used by the VAT page |
| `employees[]` `E-10xx` | name, role, dept, nationality, joined, basic, housing, transport, project, labourCard, iban, leaveBalance, status, passport/visa/eid/labourCard/licence expiry, camp, room, email | |
| `timesheets` | `{ [empId]: { normal, ot, otHoliday, unpaidDays } }` | Current month only |
| `leaves[]` `LV-` | emp, type, from, to, days, status | |
| `payrollRuns[]` | `'2026-01'…` | Months posted to the ledger |
| `camps[]` | name, rooms, capacity, occupied, costPerBed | |
| `equipment[]` `EQ-xx` | name, type, owner (`'Own'` or `'Subcontractor: X'`), entity JPH/JRC, cost, bought, life, salvage, rate (internal AED/h), meter, nextService, serviceHours | |
| `bookings[]` | eq, project, from, to | The resource calendar. Clash-checked. |
| `eqRequests[]` `ER-` | project, type, from, to, by, status | |
| `plantLogs[]` `PL-` | date, eq, project, hours, fuel, operator | |
| `mixDesigns[]` | MX-BC / MX-WC, name, thickness (m), density (t/m³), plantCost (AED/t), bom[{item, per (units per t)}] | |
| `prodOrders[]` `AP-` | date, mix, tons, project, status Planned/Produced, layArea (m²), cost | |
| `tickets[]` `DT-` | order, date, truck, tons, project, temp | |
| `inspections[]` `IR-` | project, date, activity, location, status Open/Approved/Rejected, comment | |
| `labTests[]` `LT-` | project, date, type, location, result, spec (text "≥ x"), pass | |
| `ncrs[]` `NCR-` | project, date, desc, raisedBy, action, status Open/Closed | |
| `incidents[]` `HSE-` | project, date, type, desc, action, status; `hseStats {lastLti, manHoursSinceLti, toolboxTalks}` | |
| `subcontracts[]` `SC-0n` | sub (name), project, scope, value, retPct, certs[{no, date, cumWork, backcharge, status Submitted/Approved/Paid}] | |
| `backcharges[]` `BC-` | sc, date, desc, amount, applied | |
| `bonds[]` `BG-` | type, project, bank, amount, issued, expiry, status Active/Released | |
| `permits[]` `NOC-` | project, authority, type, ref, issued, expiry, status | |
| `claims[]` `CLM-` | project, type, event, notified, daysClaimed/Granted, amountClaimed/Agreed, status | |
| `escalation[]` | project, item, unit, base, current, threshold %, qty | |
| `leads[]` `L-` | company, contact, value, stage Lead/Qualified/Proposal/Negotiation, next, note, history[{date, note}] | |
| `events[]` `EV-` | date, time, title, lead, type | CRM calendar |
| `coa[]` | code, name, type Asset/Liability/Equity/Revenue/Cost of sales/Expense | Chart of accounts |
| `journals[]` `JV-26-` | date, entity, memo, lines[{acc, dr, cr}] | **Manual journals only.** Everything else is derived. |
| `periodLock` | ISO date | Manual journals on or before this date are refused |
| `overheads` | {monthly, basis revenue/cost/equal} | |
| `currencies[]` | code, name, rate (AED per unit) | `fx(code)` |
| `users[]`, `currentUser` (email), `notifPrefs`, `readNotifs[]` | | Access and notifications |
| `seq` | int | ID counter |

---

## 4. Modules: what they do and how

Routes are shown as `#/route/tab`. Calculations live in `Calc.*` (core.js plus the module files).

### Dashboard `#/dashboard` (dashboard.js)
- **KPI tiles:**
  - active projects, revised contract, earned value, cost to date with gross margin
  - cash at bank, receivables with overdue, open payables, sales pipeline
  - asphalt produced in the last 7 days, open NCRs / failed tests, days without lost-time injury
  - delay (LD) exposure, permits/bonds expiring, plant deployed today
- **Charts and cards:** cash flow (seeded `cashflow`), budget vs actual cost per active project, project table, approvals count, low stock, open RFIs.

### Approvals `#/approvals` (dashboard.js)
- Lists pending requisitions, purchase orders (`approval`), leave and equipment requests, **filtered by `canApprove(collection)`**.
- `Actions.decide` sets the status. Approved annual leave also deducts from `leaveBalance`.
- The approval-rules table in Settings is **display only**: amount thresholds are not enforced yet (see roadmap).

### Projects & BOQ `#/projects`, `#/projects/<id>/<tab>` (projects.js, projects-ext.js)
- **`Calc.project(p)`:**

  | Measure | Formula |
  |---|---|
  | value | Σ qty × rate |
  | budget | Σ qty × costRate |
  | earned | Σ doneQty × rate |
  | earnedBudget | Σ doneQty × costRate |
  | actual | Σ actualCost |
  | vo | sum of Approved variations |
  | revised | value + vo |
  | progress | earned ÷ value |
  | EAC | actual + (budget − earnedBudget) |
  | forecastMargin | (revised − EAC) ÷ revised |
  | costVariance | earnedBudget − actual |

- **Tabs:**
  - **overview:** P&L by trade, budget-vs-actual bars, cost split donut, CPI.
  - **boq:** grouped by trade.
    - *Edit* changes qty, rates and doneQty, and adds actual cost.
    - *Apply markup* sets every sell rate to costRate × (1 + m).
    - *+ BOQ item*; *Export BOQ (CSV)*.
  - **gantt:** month header, today line, planned % vs actual % by trade (planned is linear across each task window).
  - **chainage:** SVG strip per layer, from `chainage` merged by `coverage()`.
    - *Record section* (`Actions.addChainage`) validates the range, then optionally adds (to − from) × width to `boq[layerMap[layer]].doneQty`. Half the width for a single carriageway. Road markings use 0.75 m²/m.
    - The asphalt base also moves prime coat 4.01; the wearing course also moves tack coat 4.03.
    - Then `syncTasks`.
  - **cashflow:** S-curve plan over the programme.
    - Cost = budget × S(i).
    - Income = revised × (1 − retention) × S(i − 1), i.e. a payment lag.
    - Peak funding is the most negative cumulative net.
    - Actual dots: actual cost, and certified income (max IPC cumWork × (1 − ret) + milestone invoices).
  - **reports:** daily reports and RFIs (add, mark answered).
  - **documents:** register; new document with an optional file (name/size stored); *New rev* supersedes; status changes.
  - **billing:** the project's VOs and IPCs.
- **New project** can copy rates from P-2401 with zero quantities.
- Status select: Tender / Active / Defects Liability / Completed.

### Site app `#/site` (assistant.js)
- A phone-first page:
  - project picker, progress, and whether today's daily report is done;
  - tiles that reuse the actions: `addReport`, `addChainage`, `newPlantLog`, `siteReq` (creates a Pending requisition), `newIr`, `newIncident`, `sitePhoto` (camera input → a `documents` entry, type "Site photo"), `addRfi`.
- Installable through `manifest.webmanifest` (start_url `#/site`) and `sw.js`.

### QA/QC & HSE `#/quality/{inspections|tests|ncr|hse}` (quality.js)
- **Inspection requests:** Open → Approved/Rejected. Rejecting asks for a comment and can raise an NCR.
- **Tests:** pass = result ≥ minimum.
- **NCRs:** close out.
- **HSE:** incidents by type, open/close.
  - Reporting a *Lost time injury* resets `hseStats.lastLti` and the safe man-hours.
  - Toolbox talks are counted.

### Asphalt Plant `#/production/{orders|tickets|mixes|yield}` (production.js)
- `Calc.mixCost(m)` = Σ per × item.cost + plantCost (AED per tonne).
- *Produce* (`Actions.produce`):
  - checks Main Yard stock for every BOM line;
  - deducts the materials and writes `stockTx` type **Production** with the project, which becomes project material cost in the ledger;
  - sets the order cost.
- *+ Ticket* is limited to the tonnes remaining on the order. Below 140 °C is highlighted.
- *Area laid* feeds the yield calculation.
- `Calc.order`:
  - delivered = Σ ticket tons;
  - waste = (tons − delivered) ÷ tons;
  - theoretical = layArea × thickness × density;
  - yieldVar = delivered ÷ theoretical − 1.
- *Edit BOM* changes the per-tonne quantities and the plant cost.

### Equipment `#/equipment/{fleet|calendar|requests|logs|maintenance|depreciation}` (equipment.js)
- **Fleet:**
  - "currently at" comes from `bookings` covering today;
  - utilisation = deployed ÷ total;
  - book value from `Calc.depreciation`.
- **Calendar:** 10 weeks from two weeks back. `bookEq` rejects overlapping bookings.
- **Requests:** lists free units of the requested type with no overlap and *Assign* creates a booking. If none is free, the hint is to hire.
- **Logs:**
  - `newPlantLog` saves hours and fuel;
  - fuel is issued as an Issue `stockTx` of diesel I-10 from the chosen store (stock is checked);
  - hours are added to `meter`;
  - reports show l/h per machine and plant cost per project (hours × rate).
- **Maintenance:** hours left = nextService − meter. *Service done* sets nextService = meter + serviceHours.
- **Depreciation:** straight line, (cost − salvage) ÷ life, accumulated to date, net book value. Applies to JPH-owned fleet.

### Procurement `#/procurement/{requisitions|rfq|orders|analysis|suppliers}` (supply.js)
- An approved requisition goes one of two ways:
  - **Send RFQ** (`reqToRfq`): seeds three indicative quotes around standard cost and sets the requisition to Ordered;
  - **Direct PO** (`reqToPo`).
- RFQ *Award*:
  - creates a new supplier if the quote came from free text;
  - closes the RFQ;
  - creates a PO with approval **Pending**.
- An approved PO gets *Receive (GRN)* (`receivePo`), which:
  - adds stock to the chosen warehouse and writes a Receipt `stockTx`;
  - updates `po.received` and status;
  - creates a **payable** with amount = qty × rate × 1.05 × fx(currency), plus `grn:true` and `fxAmount`.
- PO analysis: spend by supplier, project and item. Supplier register shows open POs and amount payable.

### Warehouse `#/warehouse/{stock|movements|consumption}` (supply.js)
- Stock matrix per warehouse, with value and reorder flags.
- `stockTx` modal handles Receipt, Issue (needs a project; checks availability) and Transfer (two different warehouses).
- Consumption = Issue + Production grouped by project and item, valued at standard cost.

### Subcontractors `#/subcontracts/{contracts|certs|backcharges}` (subcontracts.js)
- **`Calc.subcert(sc, c)`:**
  - thisWork = cumWork − previous certificate's cum (or `c.prevCum`);
  - retention = thisWork × retPct;
  - net = thisWork − retention − backcharge;
  - VAT 5%.
- *+ Certificate*:
  - cumulative must exceed the previous one and stay under 110% of the subcontract value;
  - deducts unapplied back-charges and marks them applied;
  - status Submitted.
- *Approve*: status Approved, and a payable `SUB-…` is created with `acc '2050'` and `source 'subcert'`.

### CRM `#/crm/{pipeline|calendar|history}` (sales.js + ext.js)
- **Pipeline:** advance a stage. At Negotiation, *Won* removes the lead and creates a Won quotation.
- *Log* (the ext.js version overrides sales.js) adds to `history` and updates the note and next date.
- **Calendar:** the current month grid from `events`.
- **History:** all interactions.

### Sales & Billing `#/sales/{quotations|variations|billing|milestones|invoices|soa}` (sales.js + ext.js)
- **Quotations:** revisions keep history; status select; *Proforma* invoices an advance of advancePct + VAT, display only.
- **VOs:** VO ids are unique **per project**, so look them up by project + id.
- **`Calc.ipc(ipc)`:**
  - previous cum comes from IPC no − 1 for the project, else `prevCum`;
  - thisWork = cum − prevCum;
  - retention and advance = thisWork × % each;
  - thisNet = net(cum) − net(prev), where net(w) = w × (1 − ret − adv);
  - VAT 5%, total.
- *New IPC from progress*: cumWork = round(earned + vo × progress). It must exceed the previous certificate.
- IPC status path: Draft → Submitted → **Certified**, which issues an invoice (net = thisNet, due in 30 days) → Paid when the invoice is fully received.
- **Milestones:** a project's milestones may total at most 100%. *Milestone reached* creates an invoice with net = revised × pct.
- **Invoices:**
  - `Calc.invoice`: vat = net × 5%; open = total − paid × 1.05; overdue days.
  - *Record receipt* adds paid, credits the bank account and pushes to `receipts`.
  - *View* prints; **e-invoice XML** in UBL 2.1 layout with TRNs; **Email** opens a mailto with the client email from `clients`.
- **Statement of account:** running balance from invoices (debit) and their receipts (credit).

### Contracts & Compliance `#/contracts/{bonds|permits|claims|escalation}` (contracts.js)
- **Bonds:** exposure, expiry badges, extend, release.
- **Permits:** expiry warnings from 30 days; renew or close.
- **`Calc.ld(p)`:**
  - late days = forecastEnd − end;
  - granted = Σ daysGranted on EOT claims;
  - net = late − granted;
  - exposure = min(10% of revised, net × ldPerDay).
- *Edit* sets forecastEnd and ldPerDay. Claims: record outcome as Agreed or Rejected.
- **`Calc.escalation`:** only the movement beyond ±threshold% of the base counts, × base × qty. Signed: positive is recoverable.

### Cash & Accounts `#/finance/{cash|receivables|payables|revenue|overheads|currency|close}` (finance.js + ext.js)
- **Cash:** bank tiles, seeded cash flow chart, forecast table with running closing cash.
- **Receivables:** ageing buckets per client; retention held by clients = Σ IPC cumWork × 10%.
- **Payables:** payment schedule from `openBills()`. *Pay* sets paid, paidDate and bank, deducts the bank balance, and marks the linked PO paid.
- **Revenue recognition:** cost-to-cost. % complete = actual ÷ EAC; revenue = revised × %; contract asset or liability = revenue − certified.
- **Overheads:** monthly × 10 months, allocated by earned, actual cost or equal share. Report only, no ledger posting.
- **Currency:**
  - rates are editable;
  - unrealised FX on open foreign bills = fxAmount × rate − (amount + reval);
  - *Post revaluation* sets `reval`, which the ledger posts.
- **Close:** checklist stored in `closeChecklist`. When complete, *Close October & lock period* sets `periodLock = '2026-10-31'`.

### Accounting `#/accounting/{tb|pnl|bs|gl/<acc>|journals|coa|projects}` (accounting.js + ledger.js)
- Company selector: `ALL` (consolidated), `JRC` or `JPH`.
- **Reports:**
  - trial balance with a balanced badge, CSV export;
  - P&L year to date (revenue / cost of sales / expenses);
  - balance sheet including current-year profit, with a "Balances" check;
  - general ledger with running balance and links to source records;
  - journal list filtered by source (latest 200);
  - chart of accounts (*+ Account*);
  - project P&L from project-tagged lines.
- **Manual journal:** up to 3 lines; signed amounts must sum to 0; refused at or before `periodLock`.
  - **Bank-account lines also change `S().bank`**, which keeps the reconciliation intact.

### Taxes `#/vat/<YYYY-Qn>`, `#/vat/ct` (finance.js + ext.js)
- **VAT return summary** (boxes 1, 8, 9, 11, 12–14):
  - output = Σ invoices in the quarter (net) + `otherSales`;
  - input = Σ received POs in the quarter + `otherPurchases`;
  - balances by quarter; CSV export.
- **Corporate tax:** consolidated YTD net profit → annualised → 9% above AED 375,000; set-aside per month. An estimate.

### HR & Payroll `#/hr/{employees|timesheets|leave|payroll|eosb|documents|camps}` (hr.js + ext.js)
- **Pay** (`Calc.pay`):
  - hourly = basic ÷ 30 ÷ 8;
  - OT pay = ot × h × 1.25 + otHoliday × h × 1.5;
  - deduction = (fixed ÷ 30) × unpaidDays;
  - gross = fixed + OT − deduction.
- **Gratuity** (`Calc.eosb`): 0 under 1 year; 21 days' basic a year for the first 5 years, 30 days after; capped at 24 × the monthly total package.
- **Payroll:** register, payslip CSV, WPS SIF (EDR lines + SCR; check the format with the bank).
  - *Post payroll to ledger* adds the month to `payrollRuns` and deducts BA-2.
- **Documents:** expiry badges for 5 document types; *Update*.
- **Camps:** occupancy and cost; room allocation.
- Leave requests need the end date ≥ start date. Approval goes through Approvals or the Leave tab.

### Notifications `#/notifications`, Assistant `#/assistant/<q>` (assistant.js)
- **`Notify.list()` alert rules:**
  - pending approvals; overdue invoices; overdue bills; low stock;
  - bonds ≤ 60 days; permits ≤ 30 days; employee documents ≤ 60 days;
  - RFIs due ≤ 3 days; open NCRs; failed tests in the last 7 days;
  - plant service due within 50 h; LD exposure; milestones due ≤ 7 days;
  - payroll not posted after the 20th.
- Unread = not in `readNotifs`, which drives the bell count. *Email digest* opens a mailto.
- **Assistant:** rule-based.
  - How-to `HELP` regexes;
  - keyword intents: cash, overdue, payable, stock/low, expiry, LD/delay, VAT, profit;
  - entity lookups: project id or name, employee, supplier;
  - fallback: substring search across 12 record types.
  - The topbar search submits to it.

### Settings `#/settings` (admin.js + ext.js)
- Company profile (edit); data backup (export, import, reset); users & roles (+ invite).
- Approval-rules table (display only), companies, notification preferences, role access matrix.

### Access control (ext.js)
- `ROLE_ACCESS` (Administrator `'*'`, Finance, Project Manager, Procurement, HR, Storekeeper, Site Engineer) decides `canSee(route)`, which filters the NAV and makes `render()` show "No access".
- `APPROVER` decides `canApprove(collection)`.
- The user switcher in the topbar sets `currentUser`. It is **simulated**: no authentication.

---

## 5. How modules intertwine

### 5.1 Event → effects
| Action | Writes | Downstream effects |
|---|---|---|
| Update BOQ doneQty (edit or chainage) | `project.boq`, tasks | Earned value, progress, Gantt, cost variance, EAC, next IPC amount, revenue recognition, LD context, dashboard |
| Record chainage section | `chainage` (+ BOQ) | As above, plus the chainage strip |
| Certify IPC | `ipcs.status`, new `invoices` | Receivables, SOA, VAT output, ledger (revenue, retention, advance, VAT, AR), notifications if overdue |
| Invoice milestone | `invoices`, `milestones` | Same as an invoice |
| Record receipt | `invoices.paid`, `receipts`, `bank` | Ledger (Dr bank / Cr AR), IPC → Paid, cash KPIs |
| Approve requisition → RFQ/PO → approve PO → GRN | `requisitions`, `rfqs`, `pos`, `stock`, `stockTx`, `payables` | Stock value, low-stock alert, payables ageing, ledger (Dr inventory, Dr VAT in, Cr AP), VAT input (through POs) |
| Issue stock / Production / fuel in plant log | `stock`, `stockTx` (project) | Consumption report, ledger (Dr 5000 per project, Cr inventory), project P&L |
| Pay bill | `payables.paid`, `bank`, `pos.paid` | Ledger (Dr AP, Cr bank) |
| Subcontract certificate approve | `certs.status`, `payables` (subcert) | Ledger (Dr 5100 per project, VAT in, Cr 2050, Cr 2060 retention) |
| Plant log | `plantLogs`, `equipment.meter`, maybe `stockTx` | Fuel l/h, service alerts, ledger intercompany hire (JRC 5300 per project ↔ JPH 4100) |
| Post payroll | `payrollRuns`, `bank` BA-2 | Ledger (5200 site / 6000 office, Cr 1020) |
| Edit timesheet | `timesheets` | Payroll, WPS file, October payroll amount |
| Approve VO | `variations` | Revised contract, IPC cumWork, LD cap |
| Approve leave | `leaves`, `leaveBalance` | |
| Book / assign equipment | `bookings`, `eqRequests` | Calendar, utilisation, "currently at" |
| Forecast completion / EOT granted | `projects.forecastEnd`, `claims` | LD exposure (dashboard, notifications) |
| Expiry dates (bonds, permits, staff documents) | | Notifications, Assistant answers |
| Manual journal | `journals`, maybe `bank` | Ledger reports |
| FX revaluation | `payables.reval` | Ledger (6400 vs AP); payment amount = amount + reval |
| Close checklist complete → lock | `periodLock` | Manual journals before the date are refused |

### 5.2 Ledger posting rules (`Ledger.build()`)
`Ledger.build()` **recomputes everything on every call** from current data, with no cache and no stored derived journals. Each journal is `{id, date, entity, memo, src, link, lines[{acc, dr, cr, project}], ic?, opening?}`. Lines are rounded to 2 decimals. A rounding residual of 0.005 or more goes to 6400. **Future dates are clamped to today.**

| Source | Entity | Debit | Credit |
|---|---|---|---|
| Invoice with IPC | JRC | 1100 net + VAT; 1150 retention; 2200 advance recovery | 4000 (net + ret + adv, project); 2100 VAT |
| Invoice without IPC (milestone / other) | JRC | 1100 | 4000 (project); 2100 |
| Historical paid amount (inv.paid − Σ receipts) | JRC | 1010 (dated due date or today) | 1100 |
| Receipt record | JRC | bank account of the receipt | 1100 |
| Bill (not subcert) | JRC | 1200 if grn, else `expense` or 5100 (acc 2050) or 5000 — net (project from PO); 1300 VAT | `acc` (2000/2050) gross |
| FX reval | JRC | 6400 | bill acc |
| Bill paid | JRC | bill acc (amount + reval) | bank account used |
| Subcontract certificate (Approved/Paid) | JRC | 5100 thisWork − backcharge (project); 1300 VAT | 2050 net + VAT; 2060 retention |
| Subcert Paid with no payable record | JRC | 2050 | 1010 |
| stockTx Issue / Production | JRC | 5000 (project) | 1200 (qty × standard cost) |
| Payroll run month | JRC | 5200 (Projects/Plant/Stores depts) / 6000 (others) | 1020 |
| Gratuity YTD | JRC | 6300 | 2300 (provision today − provision 31 Dec 2025) |
| Migrated Jan–Jul summaries (from `cashflow`) | JRC | 1010 (net cash); 5000 / 5100 / 5400 = 55 / 30 / 15% of outflow × 0.92 ÷ 1.05 | 4000 = inflow ÷ 1.05 |
| Monthly internal plant hire Jan–Sep (`ic`) | JRC / JPH | JRC 5300 · JPH 1700 | JRC 2700 · JPH 4100 (Σ own-fleet rate × 130 h) |
| Quarterly intercompany settlement (`ic`) | JRC / JPH | JRC 2700 · JPH 1040 | JRC 1010 · JPH 1700 |
| Plant log (own JPH fleet, `ic`) | JRC / JPH | JRC 5300 (project) · JPH 1700 | JRC 2700 · JPH 4100 (hours × rate) |
| Depreciation, each month-end ≤ today | JPH | 6100 | 1510 |
| Manual journals | as entered | | |
| **Opening 31 Dec 2025** (`opening:true`) | each | Bank accounts and (JRC) 1200 are **back-solved** = live balance − movements; JRC 2300 opening gratuity; JPH 1500 cost / 1510 opening accumulated depreciation | 3000 capital (JRC 5,000,000; JPH 1,000,000); 3100 retained earnings = balancing figure |

**Consolidation:** `Ledger.filter(J, 'ALL')` drops every journal flagged `ic`, which eliminates internal hire, its receivable/payable and the settlements in full.

**Invariants the smoke test checks:**
- the trial balance nets to 0 per entity and for the group;
- GL bank (1010–1040) = Σ `S().bank`;
- GL 1100 = Σ open invoice balances;
- GL 2000 + 2050 = Σ open bills (amount + reval).

**Rule:** any feature that changes `S().bank` or stock must leave a record that `Ledger.build()` turns into a journal (receipt, bill paid, payroll run, manual journal…). Otherwise the opening-balance back-solve silently absorbs the change and the P&L is wrong.

### 5.3 Known inconsistencies to fix (technical debt)
1. **The VAT page doesn't use the ledger.** It sums invoices, POs and `otherSales`/`otherPurchases`, so its figures differ from GL 2100/1300. It should be rebuilt on ledger postings by date.
2. **The dashboard and finance cash-flow charts use the seeded `cashflow` array**, not ledger bank movements.
3. **`project.boq.actualCost` is separate from ledger project costs.** Project cost control uses the BOQ actuals; Accounting → Project P&L uses ledger postings. They should converge: either post BOQ actual cost bookings to the ledger, or derive actuals from ledger lines by cost code.
4. **Labour isn't project-tagged in the ledger.** Payroll posts in total. It should allocate by timesheet project.
5. **Approval amount thresholds aren't enforced.** Only roles are checked.
6. **Overhead allocation is a report** with no journal.
7. **VAT on milestone and proforma follows the standard 5% only.** There is no zero-rated or exempt handling, and no reverse charge on imports (the EUR supplier bill is treated as standard-rated).
8. **Inventory uses standard cost**, not weighted average; GRN price variances go nowhere.
9. **No audit trail** of who changed what.
10. **`Store.key` is still `jrc-erp-v1`.** Migration is additive only; there are no versioned migrations.

---

## 6. Roadmap: features not built yet, and how they would fit

Grouped by priority. For each item, "Hooks" names the existing data and functions it should use.

### P0 — needed for live use
| Feature | Design notes / hooks |
|---|---|
| **Hosted backend + real auth** (Supabase is available in this environment) | One table per collection in section 3 (projects, boq_lines, chainage, stock_tx, …) and a `ledger_journals` table populated by DB functions mirroring section 5.2. Row-level security by role and company. Replace `Store` with an async data layer while keeping the `S()` shape so pages change little. Supabase Auth replaces `currentUser`; enforce `ROLE_ACCESS` and `APPROVER` server-side. |
| **Audit trail** | Append-only `audit_log` (user, time, entity, id, before/after), written by `commit()` or server triggers. Show a history panel on records. |
| **Real-date mode** | `today()` from the clock. Seeds become opt-in demo data. |
| **Data import** | CSV/Excel import for BOQs, employees, suppliers, items, opening trial balance. Opening balances then become real journals instead of back-solved ones. |
| **Ledger-based VAT and cash flow** | Fix debt items 1 and 2: VAT boxes from 2100/1300 postings by tax date; cash flow from bank-account lines plus a forecast of open AR/AP by due date. |
| **E-invoicing provider integration** | Send the UBL XML from `Actions.einvoice` to an accredited service provider, store the clearance status on the invoice, and block editing once issued. |
| **Email / push services** | Server-side email for invoices, approvals and digests (replacing mailto); web push for the Site app. |

### P1 — commercial & cost control
| Feature | Design notes / hooks |
|---|---|
| **Resource-based estimating / tender module** | Rate build-ups per BOQ item (labour crew h, plant h × `equipment.rate`, materials from `items` and `mixDesigns`, subcontract) → `costRate`; markup by section; tender comparison and bid/no-bid; converts to project (`newProject`). |
| **Cost codes / WBS** | Add `costCode` on BOQ lines; tag stock issues, plant logs, bills, timesheets and subcerts with a cost code so ledger lines carry project + cost code. Fixes debt item 3. |
| **Labour cost to projects** | Daily crew timesheets per project/cost code → payroll allocation journal (fixes debt item 4). |
| **Earned value SPI** | Planned value from the Gantt windows × budget; SPI/CPI trend charts per project. |
| **Budget revisions & forecasts** | Versioned budgets, cost-to-complete by trade, forecast sign-off each month. |
| **Final account & retention release** | At handover release 50% of retention (invoice against 1150); at DLP end release the rest; same for 2060 to subcontractors. Hooks: `ipcs`, `subcontracts`, project status. |
| **Subcontractor portal** | Subs submit certificates and documents; JRC approves (`newSubCert`/`approveSubCert`). |
| **Client portal** | Clients view IPCs, invoices, SOA and documents. |
| **Daywork sheets** | Labour/plant/material dayworks priced from the rate schedule → VO or IPC addition. |

### P1 — road operations
| Feature | Design notes / hooks |
|---|---|
| **Quantities by chainage for all items** | Generalise `layerMap` to a mapping table (layer → BOQ codes + factor) so drainage (per m), kerbs (per m both sides) and lighting (per column spacing) update from chainage too. |
| **Traffic management plans** | TM layouts per stage linked to `permits` (police / municipality); expiry alerts; incidents linked to TM stage. |
| **Weather & delay events** | Log delay events daily (weather, access, utilities) → EOT claim builder (`claims`), with LD recalculation. |
| **Survey & levels** | Upload level checks per chainage and layer; tolerance pass/fail feeds `labTests`/`inspections`. |
| **Material testing lab integration** | Import lab results (CSV) into `labTests`; failed result → automatic NCR and notification. |
| **Asphalt plant extensions** | Silo stock; burner fuel per tonne; truck cycle times; reject loads (temperature) → wastage; QC samples per ticket (Marshall) linked to `labTests`. |
| **Quarry / crusher (if owned)** | Production orders for aggregates (same pattern as `production.js`) → stock receipts at production cost. |

### P1 — plant & fleet
| Feature | Design notes / hooks |
|---|---|
| **Maintenance work orders & spare parts** | Work orders from service alerts (`maintenance` tab) consume spare-part items from stock → JPH cost; downtime blocks bookings. |
| **Fuel cards / telematics** | Import machine hours and fuel from telematics to replace manual `plantLogs`; anomaly alerts (l/h outside a band). |
| **Vehicle registration & insurance expiry** | Add registration and insurance expiry dates on `equipment` → notifications (same pattern as bonds). |
| **External hire billing** | JPH hires plant to third parties → JPH invoices (4100) with VAT. |
| **Fixed asset register beyond the fleet** | Office and IT assets, small tools, disposals, gain/loss on sale. |

### P2 — HR
| Feature | Design notes / hooks |
|---|---|
| **Final settlement** | On exit: gratuity (`Calc.eosb`), leave encashment, notice, air ticket → payroll and ledger (debit 2300). |
| **Leave salary & air-ticket accruals** | Monthly accrual journals. |
| **Visa / onboarding workflow** | Steps (offer → entry permit → medical → Emirates ID → labour card) with dates feeding the document-expiry fields. |
| **Emiratisation / labour reporting** | Counts by nationality and role. |
| **Recruitment, training, certifications** | Operator certifications with expiry (like `licenceExpiry`). |

### P2 — finance & admin
| Feature | Design notes / hooks |
|---|---|
| **Bank reconciliation & bank feeds** | Import statements; match against receipts and payments; unmatched → journals. |
| **Petty cash & expense claims** | Site cash floats, receipts photos, approval, posting to project costs. |
| **Credit control** | Automatic overdue reminders (`Notify`), payment promises, client credit limits. |
| **Guarantee facility limits** | Bank facility per bank vs Σ active `bonds`; headroom alerts. |
| **Insurance policies** | Contractor's all-risk, workmen's compensation, third-party, plant: expiry and claims (same pattern as permits). |
| **Budgets for overheads** | Departmental budgets vs ledger 6xxx actuals; allocate by journal (fixes debt item 6). |
| **Approval thresholds** | Enforce `approvalRules` by document amount in `canApprove` (fixes debt item 5); multi-step approvals. |
| **Report builder & scheduled reports** | Saved filters/exports; emailed weekly. |
| **Arabic / RTL UI** | i18n strings and `dir="rtl"`; bilingual invoices. |

### P3 — nice to have
- Drawing viewer with markups.
- BIM / GIS map view of the road with chainage overlays.
- An AI model behind the Assistant, keeping the current data-grounded answers as tools.
- Offline-first Site app with a sync queue.
- QR codes on delivery tickets and assets.

---

## 7. Conventions & guardrails for future changes
- **Don't restructure the app.** Keep plain HTML/CSS/JS with no build step until the backend move. Then the data layer swaps first and the pages keep the `S()` shape.
- **Match the existing style:** small page objects, delegated actions, `card`/`table`/`kpi` helpers, CSS variables, `esc()` for every interpolated string.
- **Money:** store AED numbers. Invoice `net` excludes VAT; payable `amount` includes VAT. VAT rate comes from `S().company.vatRate`.
- **Statuses are strings** shown through `badge()`. Add new ones to the `badge` map in `core.js`.
- **Don't store derived values** that can be recomputed (journals, totals, progress), except snapshots needed for history (e.g. `prodOrders.cost`).
- **Every bank or stock change must be ledger-visible** (section 5.2 rule). Run the smoke test after any change that touches money.
- **Keep all sample data fictional.** Don't use real client or authority names, or real people.
- Regulatory items (VAT boxes, WPS SIF layout, corporate tax, gratuity) are simplified illustrations and must say so in the UI.
- After changes: run `node erp/tests/smoke.js`, update this spec, `docs/feature-coverage.md` and, if flows change, `docs/erp-overview.html`, then `node docs/build-pdf.js`.

---

## 8. Change log
| Date | Change |
|---|---|
| 2026-10-24 | v1: 12 modules (projects/BOQ, procurement, warehouse, CRM, sales/billing, finance, VAT, HR/payroll, equipment, approvals, dashboard, settings) |
| 2026-10-24 | v2: accounting ledger (2 companies + consolidation), chainage, asphalt plant, QA/QC & HSE, plant logs/fuel/maintenance, subcontractors, bonds/permits/claims/LDs/escalation, documents, project cash flow, milestones, e-invoice XML, overhead allocation, multi-currency, corporate tax, notifications, assistant/search, roles, Site app (PWA), HR documents & camps; smoke test; this spec |
