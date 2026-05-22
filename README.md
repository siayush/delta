# Delta — Desktop

API diff client, packaged as a cross-platform Electron desktop app.

- React 19 + Vite renderer
- TanStack Router (file-based) and TanStack Query
- Zustand for UI and ephemeral runtime state
- Tailwind v4 styling
- Main process owns persistence (`better-sqlite3`) and HTTP execution (`net` module)
- Strict `contextIsolation`, sandboxed renderer, no `nodeIntegration`
- `electron-log` for structured logging, `electron-updater` for auto-update
- `electron-builder` for macOS / Windows / Linux production builds

## Project structure

```
src/
├── shared/                    Types + IPC channel contracts used by main, preload, renderer
│   ├── types.ts
│   └── ipc.ts
├── main/                      Electron main process (Node)
│   ├── index.ts               app lifecycle, single-instance lock, CSP
│   ├── window.ts              BrowserWindow + security defaults
│   ├── logger.ts              electron-log setup
│   ├── updater.ts             electron-updater + renderer event bridge
│   ├── db/
│   │   ├── index.ts           SQLite singleton (WAL, pragmas)
│   │   ├── migrations.ts      versioned schema migrations
│   │   └── repositories/      requests / folders / snapshots / environments
│   └── ipc/
│       ├── registry.ts        registerHandler() — logging + sanitized errors
│       ├── requests.ts ...    per-domain handlers
│       └── http.ts            executes HTTP via Electron net module
├── preload/
│   ├── index.ts               contextBridge.exposeInMainWorld('delta', api)
│   └── index.d.ts             declares window.delta for the renderer
└── renderer/
    ├── index.html             strict CSP meta, mounts /src/main.tsx
    └── src/
        ├── main.tsx           React root: QueryClientProvider + RouterProvider
        ├── styles.css         tailwind import + theme tokens
        ├── routes/            TanStack Router file-based routes
        │   ├── __root.tsx
        │   ├── index.tsx
        │   ├── requests.$requestId.tsx
        │   └── folders.$folderId.tsx
        ├── components/        UI (Layout, Sidebar, RequestEditor, ResponseViewer …)
        ├── queries/           TanStack Query hooks per domain
        ├── stores/            Zustand stores (UI theme, response cache)
        └── lib/               api wrapper, env resolver, JSON diff, utils
```

## Architecture

### Process boundary

The renderer never imports Node, Electron, or `better-sqlite3`. All side-effects go through the typed IPC bridge:

- **Main process** owns the database, file system, and outbound HTTP.
- **Preload** exposes a narrow, typed `window.delta` surface via `contextBridge` — see [src/preload/index.ts](src/preload/index.ts).
- **Renderer** consumes that surface via TanStack Query hooks under [src/renderer/src/queries](src/renderer/src/queries) — see for example [requests.ts](src/renderer/src/queries/requests.ts).

### IPC contract

Channel names and argument/return shapes are declared once in [src/shared/ipc.ts](src/shared/ipc.ts) and reused by main, preload, and renderer. Every handler is registered through `registerHandler()` in [src/main/ipc/registry.ts](src/main/ipc/registry.ts), which:

- Logs every call with timing.
- Converts thrown errors to a stable `Error(message)` so the renderer never sees raw stack frames.

### Persistence

`better-sqlite3` opens `app.getPath('userData')/delta.sqlite` in WAL mode with foreign keys on. Versioned migrations live in [src/main/db/migrations.ts](src/main/db/migrations.ts) and run on startup, tracked in a `_migrations` table.

### HTTP execution

Outbound requests run from the main process using Electron's `net` module (not the renderer's `fetch`), which sidesteps the renderer's CSP, the same-origin policy, and ad-blocking extensions. See [src/main/ipc/http.ts](src/main/ipc/http.ts).

### Security defaults

[src/main/window.ts](src/main/window.ts):

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`
- `setWindowOpenHandler` denies in-app windows, opens externally
- `will-navigate` is intercepted to block drive-by navigations

[src/main/index.ts](src/main/index.ts) attaches a strict `Content-Security-Policy` response header to all renderer requests.

## Getting started

```bash
npm install
npm run dev          # electron-vite with HMR
```

The TanStack Router Vite plugin generates `src/renderer/src/routeTree.gen.ts` on first dev/build — it is not committed; it regenerates as routes change.

## Building for production

```bash
npm run build         # type-checks + bundles main/preload/renderer into ./out
npm run build:mac     # produces .dmg / .zip in ./dist
npm run build:win     # produces NSIS installer
npm run build:linux   # produces AppImage / .deb
npm run build:unpack  # build + unpacked directory (for inspecting the bundle)
```

`better-sqlite3` is a native module — `electron-builder install-app-deps` runs after `npm install` and rebuilds it against the bundled Electron headers.

## Auto-update

`electron-updater` is initialized in [src/main/updater.ts](src/main/updater.ts) and starts a check 5 seconds after launch in packaged builds. Update events stream to the renderer over `IpcChannel.UpdaterEvent` and surface in [UpdaterBanner.tsx](src/renderer/src/components/UpdaterBanner.tsx). Configure the publish channel in [electron-builder.yml](electron-builder.yml) and [dev-app-update.yml](dev-app-update.yml).

## Logging

Logs go to:

- macOS: `~/Library/Logs/Delta/main.log`
- Windows: `%USERPROFILE%\AppData\Roaming\Delta\logs\main.log`
- Linux: `~/.config/Delta/logs/main.log`

Open the current log file from the renderer with `window.delta.app.openLogs()`.

## Type-safe IPC at a glance

```ts
// src/shared/ipc.ts — single source of truth
export const IpcChannel = {
  RequestsList: 'requests:list',
  // ...
}

// src/main/ipc/requests.ts — handler
registerHandler(IpcChannel.RequestsList, () => requestsRepo.list())

// src/preload/index.ts — bridge
list: (): Promise<ApiRequest[]> => ipcRenderer.invoke(IpcChannel.RequestsList)

// src/renderer/src/queries/requests.ts — consumer
useQuery({ queryKey: queryKeys.requests, queryFn: () => api.requests.list() })
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev mode with HMR for the renderer and watch-rebuild for main/preload |
| `npm run typecheck` | TypeScript checks for both Node and web project references |
| `npm run lint` | ESLint over the repo |
| `npm run format` | Prettier over the repo |
| `npm run build` | Full production bundle (`./out`) |
| `npm run build:{mac,win,linux}` | Packaged distributable in `./dist` |
| `npm run start` | Preview the packaged renderer (no installer) |
