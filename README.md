# Notes.md

An Obsidian alternative with remote vault sync. Access your markdown vaults from anywhere via a mobile app with one-tap sync.

## Architecture

```
┌─────────────┐      HTTP API      ┌─────────────┐
│  Mobile App │  ◄──────────────►  │   Server    │
│  (Capacitor)│                    │  (Node.js)  │
│             │   ┌──────────┐     │             │
│  ┌───────┐  │   │  Vaults  │     │  ┌────────┐ │
│  │ Local │  │   │ (folders)│     │  │position│ │
│  │ Cache │◄─┘   │          │     │  │-system │ │
│  └───────┘      │ reasoning│     │  │reasoning│ │
│                 │/2026-04  │     │  └────────┘ │
└─────────────────┴──────────┴─────┴─────────────┘
```

## Quick Start

### Server (this machine)

```bash
cd server
npm install
npm start
```

Server runs on port 3000. Vaults are served from `server/vaults/`.

The `positioning-research` vault is auto-linked to your positioning system's reasoning folder.

### Web App

```bash
cd app
npm install
npm run dev      # development
npm run build    # production build → dist/
```

### Mobile App (APK)

Built automatically via GitHub Actions on every push to `main`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vaults` | List all vaults |
| GET | `/api/vaults/:name/files` | List files in vault |
| GET | `/api/vaults/:name/files/:path` | Read file |
| PUT | `/api/vaults/:name/files/:path` | Write file |
| POST | `/api/vaults/:name/sync` | Full vault sync |

## Mobile App Features

- **Vault browser** — Browse all files in any vault
- **Markdown editor** — Edit with live preview (split mode)
- **One-tap sync** — Pull all vault content for offline access
- **Offline-first** — Works without connection, syncs when available
- **Server settings** — Configure your own server URL

## Installing the APK

### Option 1: GitHub Actions (Recommended)
1. Go to **GitHub repo → Actions → Build & Deploy**
2. Download the `android-apk` artifact
3. Transfer to phone and install

### Option 2: Build Locally
Requires Android SDK + Java 17:
```bash
cd app
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 3: Web App
Just open the server URL in your mobile browser. Works the same.

## Adding a Vault

Vaults are just folders. To add one:

```bash
# Symlink any folder as a vault
ln -s /path/to/your/notes /path/to/server/vaults/my-notes
```

Or edit `server/index.js` and add to the vaults directory.

## Configuration

### Server URL (Mobile App)
1. Open app → Settings ⚙
2. Enter your server URL (e.g., `http://your-server:3000`)
3. Save

### Default Server
The app defaults to `http://localhost:3000`. For remote access, change in Settings.

## Tech Stack

- **Server**: Node.js + Express
- **Web/Mobile**: React + Vite + Capacitor
- **Sync**: REST API + localStorage cache
- **CI/CD**: GitHub Actions

## Project Structure

```
notes-md/
├── .github/workflows/    # GitHub Actions (build.yml)
├── app/                  # React + Capacitor app
│   ├── src/
│   │   ├── pages/        # VaultList, FileBrowser, Editor, Settings
│   │   ├── hooks/        # useApi, useLocalStore
│   │   └── App.jsx
│   ├── capacitor.config.json
│   └── package.json
├── server/               # Node.js API server
│   ├── index.js
│   └── package.json
└── README.md
```

## Development

### Run Server
```bash
cd server
npm install
npm start          # Port 3000
```

### Run App (Dev Mode)
```bash
cd app
npm install
npm run dev        # Port 5173
```

### Build for Production
```bash
cd app
npm run build      # Output: dist/
```

## License

MIT
