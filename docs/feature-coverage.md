# JRC ERP — feature coverage check

Checked on 24 Oct 2026 against the module list on FirstBit's public features page, plus the road-contracting gaps found in review. Every row was opened and exercised in the app by an automated browser test: 105 screens, plus the workflows in the last section.

**Status key:** ✅ built and working · ◐ built in demo form (limit noted) · — not software (vendor service)

## 1. FirstBit module list → where it is in JRC ERP

| Area | Feature | JRC ERP location | Status |
|---|---|---|---|
| Project cost control | Estimating from BOQ | Projects → BOQ & progress (add items, markup repricing, CSV export) | ✅ |
| | Cost allocation | Cash & Accounts → Overhead allocation (by revenue, cost or equal share); project-tagged ledger postings | ✅ |
| | Project P&L | Projects → Cost control; Accounting → Project P&L (from ledger) | ✅ |
| | Cost graphs | Project budget-vs-actual by trade, cost split donut, dashboard chart | ✅ |
| Project management | Gantt chart | Projects → Schedule (planned vs actual per activity) | ✅ |
| | Project-level cash flow | Projects → Cash flow plan (S-curve, peak funding, actual vs plan) | ✅ |
| | RFIs | Projects → Site reports & RFIs | ✅ |
| | Progress reports | Daily site reports (desktop and Site app) | ✅ |
| Procurement | Requisitions | Procurement → Requisitions (+ approval) | ✅ |
| | Consolidated PO analysis | Procurement → PO analysis (by supplier, project, item) | ✅ |
| | Supplier comparison / RFQ responses | Procurement → RFQs & supplier comparison → Award | ✅ |
| Finance | Cash flow dashboard | Cash & Accounts → Cash flow (actual + forecast) | ✅ |
| | Payment schedules | Cash & Accounts → Payables & payment schedule | ✅ |
| | Phased revenue recognition | Cash & Accounts → Revenue recognition (cost-to-cost, contract asset/liability) | ✅ |
| | Project cash flow planning | Projects → Cash flow plan | ✅ |
| Accounting | Month-end closing | Cash & Accounts → Month-end close checklist + period lock | ✅ |
| | Multi-company | Accounting → company selector (JRC, JPH, consolidated with intercompany eliminated) | ✅ |
| | Multi-currency | POs in any currency, FX rates, unrealised FX revaluation (Cash & Accounts → Multi-currency) | ✅ |
| | E-invoicing | Invoice → Download e-invoice (UBL 2.1 XML with TRNs and VAT) | ◐ File only; not sent through an accredited e-invoicing provider |
| | Financial statements | Accounting → Trial balance, P&L, Balance sheet, General ledger, Journals | ✅ |
| Taxes | VAT returns / liabilities | Taxes → quarterly VAT return summary, CSV | ✅ |
| | Tax account balances / statements | Taxes → balances by quarter; GL accounts 1300 / 2100 | ✅ |
| | Corporate tax (added) | Taxes → Corporate tax estimate (9% above AED 375k) | ◐ Estimate only |
| HR & payroll | Timesheets & overtime | HR → Timesheets (125% / 150%) | ✅ |
| | End-of-service provisions | HR → End-of-service provision | ✅ |
| | Leave management | HR → Leave (+ approvals, balances) | ✅ |
| | WPS payroll files | HR → Payroll & WPS → SIF file | ◐ Check layout with your agent bank |
| Warehouse | Receipt / dispatch notes | GRN from PO; issues and transfers | ✅ |
| | Multi-warehousing | 3 stores, transfers between them | ✅ |
| | Consumption reports | Warehouse → Consumption by project (incl. asphalt plant) | ✅ |
| Equipment | Equipment requisitions | Equipment → Requests (availability check, assign) | ✅ |
| | Resource calendars | Equipment → Resource calendar (clash-checked) | ✅ |
| | Subcontractor equipment tracking | Hired plant in the fleet register | ✅ |
| | Depreciation | Equipment → Depreciation; posted monthly to the ledger | ✅ |
| Production | Production & transfer orders | Asphalt Plant → Production orders; delivery tickets to site | ✅ |
| | Standard BOM | Asphalt Plant → Mix designs (editable BOM) | ✅ |
| | Costing | Cost per tonne by mix; order cost; yield and wastage | ✅ |
| CRM | Leads pipeline | CRM → Pipeline | ✅ |
| | Event calendar | CRM → Event calendar | ✅ |
| | Documents & interaction history | CRM → Interaction history; project document control | ✅ |
| Sales | Quotations with revisions | Sales → Quotations | ✅ |
| | Variation orders | Sales → Variation orders | ✅ |
| | Progressive billing | Sales → Progress billing (IPC) | ✅ |
| | Milestone billing | Sales → Milestone billing | ✅ |
| | Project statement of account | Sales → Statement of account | ✅ |
| | Proforma invoices | Quotation → Proforma | ✅ |
| Admin & security | Admin console | Settings | ✅ |
| | Access control | Role access matrix; menu and pages limited by role; approvals by role | ◐ Simulated user switch; no real logins |
| | Electronic approvals | Approvals inbox, approval rules | ✅ |
| | Notifications | 🔔 Notifications (13 alert types), email digest, preferences | ◐ Email opens your mail app; no push server |
| | Mobile app | Site app (installable web app, offline shell) | ◐ Web app, not a store app |
| | Email sending | Email invoice to client, email alert digest | ◐ Uses your email app (mailto) |
| | Backups | Settings → Export / Import backup | ✅ |
| | Updates | — | — Vendor service |
| Onboarding & support | Account manager, training, hotline, customisation | — | — Vendor services |
| | AI assistant | ✦ Assistant: answers questions from ERP data and how-to topics, plus global search | ◐ Rule-based, no AI model |

## 2. Road-contracting features added

| Feature | Where |
|---|---|
| Progress by chainage and layer, auto-updating BOQ | Projects → Chainage |
| Asphalt plant production, delivery tickets, temperature, yield | Asphalt Plant |
| Inspection requests, lab and field tests, NCRs | QA/QC & HSE |
| HSE incidents, near misses, toolbox talks, days without LTI | QA/QC & HSE → HSE |
| Daily plant hours and fuel (fuel issued from stock), service schedule | Equipment → Daily logs & fuel, Maintenance |
| Subcontracts, subcontractor certificates, retention, back-charges | Subcontractors |
| Bonds and guarantees with expiry | Contracts & Compliance → Bonds |
| Permits and NOCs with expiry | Contracts & Compliance → Permits |
| Claims, extensions of time, LD exposure | Contracts & Compliance → Claims, EOT & LDs |
| Material price escalation | Contracts & Compliance → Price escalation |
| Drawings, submittals, transmittals, revisions, file attach | Projects → Documents |
| Visa, Emirates ID, passport, labour card, licence expiry | HR → Documents & expiry |
| Labour camps and room allocation | HR → Accommodation |
| General ledger with double entry from all modules | Accounting |

## 3. Workflows tested end to end

- Requisition → approval → RFQ → award → PO approval → GRN → stock up and supplier bill created
- BOQ progress → IPC → submit → certify → tax invoice → receipt → bank up and receivables down
- Record a chainage section → BOQ done quantity rises (e.g. wearing course 23,610 → 30,610 m²)
- Asphalt production order → raw materials consumed from Main Yard (bitumen 62 → 37 t)
- Subcontractor certificate → approve → payable with retention and back-charge deducted
- Plant log with fuel → diesel issued from site store, hour meter advanced
- Milestone reached → invoice; invoice → e-invoice XML download
- Post October payroll, revalue foreign-currency bill, pay a bill, record a receipt, post a manual journal
- After all of the above, for JRC, JPH and the group: trial balance difference 0.00; balance sheet balances; GL bank = live bank balances; GL receivables = invoice sub-ledger; GL payables = open bills
- Switch to Site Engineer: menu reduced to that role's modules, Accounting shows "No access"
- Phone width (390 px): no horizontal scrolling

## 4. Still needed for live use

1. Hosted database with real logins, so access control is enforced on a server and staff share live data
2. Connection to an accredited e-invoicing provider, plus real email and push notification services
3. Your real data: projects and BOQs, staff, suppliers, plant, opening balances
4. Accountant review of the chart of accounts, VAT mapping and corporate tax treatment
