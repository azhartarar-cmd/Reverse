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

| Module | What it does |
|---|---|
| Dashboard / Approvals | Company KPIs, cash flow chart, budget vs actual, one inbox to approve requisitions, POs, leave and equipment requests |
| Projects & BOQ | BOQ estimating with markup, progress by quantity, cost control (EAC, CPI, P&L by trade), Gantt with planned vs actual, daily site reports, RFIs |
| Procurement | Requisitions → RFQ supplier comparison → award → PO approval → goods received note (updates stock and payables), spend analysis |
| Warehouse | Multi-warehouse stock, receipts, issues and transfers, consumption by project, reorder alerts |
| CRM | Opportunity pipeline (Lead → Negotiation → Won) |
| Sales & Billing | Quotations with revisions, proforma, variation orders, IPCs from BOQ progress (retention, advance recovery, VAT), tax invoices, receipts, statement of account |
| Cash & Accounts | Bank balances, cash forecast, aged receivables, payment schedule, cost-to-cost revenue recognition, month-end checklist |
| VAT | Quarterly UAE VAT return summary (output, input and payable), CSV export |
| HR & Payroll | Employees, timesheets with 125%/150% overtime, leave, payroll register, WPS SIF export, end-of-service gratuity provision |
| Equipment | Fleet register (own and hired), weekly resource calendar with clash check, site requests, straight-line depreciation |

The code is plain HTML, CSS and JS with no build step. `assets/core.js` holds the store, calculations and UI helpers. Each module lives in `assets/pages/*.js`.

All company details, people and figures are fictional samples. The WPS file layout and VAT figures are illustrations: check them with your bank and tax agent before relying on them.
