# Notes MD — P2P Markdown Vault

Local-first markdown reader with P2P sync. No central server storage. Your data stays on your devices.

## Architecture

```
Server (your machine)          Netlify (signaling only)         Mobile
├─ Creates .md files    ───►   ├─ Device discovery    ◄───►   ├─ IndexedDB
├─ Sync daemon                ├─ WebRTC handshake            ├─ Read offline
└─ Watches for changes        └─ NO file storage             └─ P2P sync
```

## How It Works

1. **Server** runs a sync daemon that watches your markdown files
2. **Netlify Functions** only handle device discovery and WebRTC signaling (zero data storage)
3. **Mobile app** stores files in IndexedDB, works fully offline
4. **P2P sync** happens directly between devices via WebRTC when both are online

## Quick Start

### 1. Deploy Netlify Functions

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --build
```

### 2. Start Server Sync Daemon

```bash
cd server-sync
npm install simple-peer wrtc node-fetch

# Set env vars
export SIGNAL_URL=https://your-site.netlify.app/.netlify/functions
export VAULT_PATH=/path/to/your/markdown/files
export VAULT_ID=positioning-research

node daemon.js
```

### 3. Install Mobile App

Download APK from [releases](https://github.com/venkatesh3007/notes-md/releases).

Open app → press **Sync Now** → files sync directly from your server to your phone via P2P.

## Development

```bash
# Mobile app
cd app
npm install
npm run dev        # Web dev
npx cap open android  # Android Studio

# Server sync
cd server-sync
npm install
node daemon.js
```

## Security

- No files stored on Netlify
- No central database
- Direct device-to-device encryption via WebRTC
- Your server, your data

## Files

- `app/` — Mobile app (Capacitor + React)
- `netlify/functions/` — Signaling coordinator (3 functions)
- `server-sync/` — Server sync daemon
