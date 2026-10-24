# CLAUDE.md

This repo holds **JRC ERP**, a construction ERP for Jazallah Road Contracting (UAE road contractor), built as a static HTML/CSS/JS app in `erp/`.

**Before changing the ERP, read `docs/ERP-SPEC.md`.** It documents every module, the data model, how modules feed each other, the ledger posting rules, known technical debt and the roadmap. Do not reverse-engineer or rebuild the app; extend it.

Key rules (details in the spec):
- No build step. Script order in `erp/index.html` matters (`ext.js` and `app.js` load last).
- State lives in `S()`. Mutate it, then call `commit()`. Use the `data-act` / `data-change` delegation with `Actions.*`. Pages are `Pages.<route>.render(args)`.
- "Today" is the fixed demo date `S().today`, so always use `today()`.
- Any change to bank balances or stock must leave a record that `Ledger.build()` turns into a journal.
- When adding fields, add defaults in `Store.migrate()`. When adding modules, follow the spec's checklist (NAV, `ROLE_ACCESS`, notifications, smoke test).
- After changes, run `node erp/tests/smoke.js <dir>`. It must show 105+ routes, no PAGEERR/BADTEXT/EMPTY, and the ledger reconciled (tb 0, bankDiff 0, AR/AP match).
- Keep sample data fictional. Keep spec, `docs/feature-coverage.md` and the guide PDF (`node docs/build-pdf.js <dir>`) up to date.

The `.claude/skills/reverse-engineer-anything` skill and `.mcp.json` (REA) are unrelated tooling and are not needed for ERP work.
