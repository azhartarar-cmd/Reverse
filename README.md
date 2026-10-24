# Reverse

Workspace set up with [REA (Reverse Engineer Anything)](https://github.com/morluto/rea) v6.7.0.

- `.mcp.json` — registers the REA MCP server (`npx -y rea-agents@6.7.0 mcp`) for Claude Code.
- `.claude/skills/reverse-engineer-anything/` — the matching REA skill (version 42).
- `.claude/settings.json` — auto-approves the project `rea` MCP server.

Check health: `npx -y rea-agents@6.7.0 doctor --client claude_code --json`

Native binary analysis needs a provider (Ghidra via `GHIDRA_INSTALL_DIR`, Hopper, or IDA).
Static JavaScript/Electron, .NET, Go, Rust, PE/ELF and other built-in analyzers work without one.

## JRC ERP — Jazallah Road Contracting (static demo)

`erp/` is a front-end-only construction ERP for a road contractor. It is an original build modelled on the module set of all-in-one construction ERPs. There is no backend: data is seeded from `erp/assets/data.js` and saved in the browser (`localStorage`). Use **Settings → Export/Import backup** to move data between browsers and **Reset demo data** to start over.

**Run:** open `erp/index.html` in a browser, or serve it with `npx serve erp` or `python3 -m http.server -d erp`.

**Desktop app:** installers for macOS (`.dmg`) and Windows (`.exe`) are built by GitHub Actions. Open *Actions → Desktop installers* and download the artifacts. See `desktop/README.md` for install steps and how to build locally.

**Tips:** Ctrl/⌘ K opens the command palette (go anywhere, run actions, find records); `?` lists keyboard shortcuts; the sun/moon button switches light, dark or system theme.

| Module | What it does |
|---|---|
| Dashboard / Approvals / Notifications | Company and site KPIs, role-filtered approvals inbox, 13 alert types with email digest |
| Assistant | Ask questions about your data ("overdue invoices", "P-2401", "expiring visas"), how-to answers, search across all records (rule-based) |
| Projects & BOQ | BOQ estimating with markup, cost control, Gantt, **chainage progress by layer** (updates BOQ), **project cash-flow S-curve**, site reports, RFIs, **document control** |
| Site app | Phone screens for site staff: daily report, completed sections, plant hours & fuel, material request, inspection, incident, photo; installable web app |
| QA/QC & HSE | Inspection requests, lab/field tests, NCRs, incidents, near misses, toolbox talks, days without LTI |
| Asphalt Plant | Mix designs (BOMs) with cost per tonne, production orders consuming stock, delivery tickets, yield and wastage |
| Equipment | Fleet, booking calendar, requests, **daily logs & fuel**, **service schedule**, depreciation |
| Procurement / Warehouse | Requisition → RFQ comparison → PO (any currency) → GRN; multi-warehouse stock, transfers, consumption |
| Subcontractors | Subcontracts, payment certificates with retention and back-charges, payables |
| CRM / Sales & Billing | Pipeline, event calendar, interaction history; quotations, VOs, IPCs, **milestone billing**, tax invoices, **e-invoice XML**, email to client, statements |
| Contracts & Compliance | Bonds and guarantees, permits and NOCs (expiry alerts), claims and EOT, LD exposure, price escalation |
| Cash & Accounts | Cash forecast, AR/AP ageing, revenue recognition, overhead allocation, multi-currency revaluation, month-end close and period lock |
| Accounting | Double-entry ledger generated from all modules, two companies (JRC + JPH plant hire) and consolidated group, TB, P&L, balance sheet, GL, journals, project P&L |
| Taxes | Quarterly UAE VAT return summary, corporate tax estimate |
| HR & Payroll | Timesheets, leave, payroll posting, WPS SIF, gratuity, **document expiry** (visa, Emirates ID, labour card, licences), labour camps |
| Settings | Company, companies, users and role access matrix (switch user top-right), approval rules, notifications, backups |

See `docs/feature-coverage.md` for a line-by-line check against FirstBit's published module list, and `docs/JRC-ERP-How-It-Works.pdf` for diagrams.

The code is plain HTML, CSS and JS with no build step. `assets/core.js` holds the store, calculations and UI helpers. `assets/ledger.js` builds the general ledger. Each module lives in `assets/pages/*.js`.

All company details, people and figures are fictional samples. The WPS file layout and VAT figures are illustrations: check them with your bank and tax agent before relying on them.
