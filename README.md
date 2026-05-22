<p align="center">
  <img src="resources/icon.png" alt="Delta" width="160" height="160" />
</p>

<h1 align="center">Delta</h1>

<p align="center">API diff client for macOS, Windows, and Linux.</p>

## What it does

Delta is a desktop API client built around comparing responses.

- Send HTTP requests and organize them into folders.
- Switch between environments (dev, staging, prod) with variable substitution.
- Snapshot any response and diff future runs against it.
- Side-by-side JSON diffs that ignore key order and highlight added, removed, and changed fields.
- Works offline — requests, folders, environments, and snapshots are stored locally.

Use it to verify that an API behaves the same after a refactor, across environments, or between versions.

## Run from source

```bash
npm install
npm run dev
```

## Build

```bash
npm run build:mac     # .dmg / .zip
npm run build:win     # NSIS installer
npm run build:linux   # AppImage / .deb
```
