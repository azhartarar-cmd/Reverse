# Reverse

Workspace set up with [REA (Reverse Engineer Anything)](https://github.com/morluto/rea) v6.7.0.

- `.mcp.json` — registers the REA MCP server (`npx -y rea-agents@6.7.0 mcp`) for Claude Code.
- `.claude/skills/reverse-engineer-anything/` — the matching REA skill (version 42).
- `.claude/settings.json` — auto-approves the project `rea` MCP server.

Check health: `npx -y rea-agents@6.7.0 doctor --client claude_code --json`

Native binary analysis needs a provider (Ghidra via `GHIDRA_INSTALL_DIR`, Hopper, or IDA).
Static JavaScript/Electron, .NET, Go, Rust, PE/ELF and other built-in analyzers work without one.
