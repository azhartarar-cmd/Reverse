# JRC ERP — desktop app

The desktop app wraps the web ERP in `../erp` with Electron, adding native menus, file dialogs and offline use. Data is stored on the computer (the app's data folder, see *Help → Open Data Folder*). Use *File → Save Backup…* regularly.

## Get the installers
Installers are built by GitHub Actions (`.github/workflows/desktop.yml`) on real macOS and Windows machines:

1. Open the repository on GitHub → **Actions** → **Desktop installers** → the latest successful run.
2. Download **JRC-ERP-macOS** (`.dmg`, one each for Apple Silicon `arm64` and Intel `x64`) or **JRC-ERP-Windows** (`JRC-ERP-Setup-x.y.z.exe`).
3. To publish a release, push a tag such as `v1.0.0`. The installers are attached to a draft release.

You can also run the workflow manually with **Run workflow**.

## Install
- **macOS:** open the `.dmg` and drag **JRC ERP** to Applications. The app is not code-signed yet, so the first time right-click the app → **Open** → **Open**. On recent macOS you may need *System Settings → Privacy & Security → Open Anyway*.
- **Windows:** run `JRC-ERP-Setup-x.y.z.exe`. SmartScreen may warn about an unknown publisher: click **More info → Run anyway**. You can choose the install folder; desktop and Start-menu shortcuts are created.

Signing removes these warnings. It needs an Apple Developer ID certificate (plus notarization) and a Windows code-signing certificate added as repository secrets (`CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`), with `CSC_IDENTITY_AUTO_DISCOVERY` and `"identity": null` removed.

## Develop
```bash
cd desktop
npm install
npm start            # copies ../erp into ./app and opens the app
npm run dist:mac     # on a Mac → dist/*.dmg
npm run dist:win     # on Windows → dist/*.exe
npm run dist:linux   # on Linux → dist/*.AppImage
```
`npm run sync` copies `../erp` into `./app` (ignored by git), so the desktop build always ships the current web app. Building a `.dmg` requires macOS, and building the Windows installer requires Windows (or Wine).

## Shortcuts (desktop menus)
⌘/Ctrl+K quick find · ⌘/Ctrl+1–9 jump to modules · ⌘/Ctrl+S save backup · ⌘/Ctrl+O restore backup · ⌘/Ctrl+P print · ⌘/Ctrl+Shift+L light/dark · ⌘/Ctrl+B collapse sidebar.
