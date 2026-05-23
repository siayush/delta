# Codebase Optimization Review

Read-only review findings for Electron performance, app architecture, startup speed, memory usage, and developer experience.

## Top Findings

| Priority | Opportunity | Evidence |
|---|---|---|
| P0 | Autosave can lose or revert edits on navigation because unmount cleanup saves stale `local`. | `src/renderer/src/components/RequestEditor.tsx:44-70` |
| P1 | Updater/window lifecycle captures the first window only; recreated macOS windows may miss updater events. | `src/main/index.ts:62-66`, `src/main/updater.ts:6-8` |
| P1 | Diff code and highlighter load before first paint. Lazy-load diff tab and defer `preloadHighlighter` to idle. | `src/renderer/src/main.tsx:5-13`, `src/renderer/src/components/ResponseViewer.tsx:13` |
| P1 | HTTP responses are fully buffered, UTF-8 decoded, JSON parsed, and returned over IPC with no size cap. | `src/main/ipc/http.ts:29-50`, `src/main/ipc/http.ts:79-98` |
| P1 | Request and snapshot lists load full bodies. Add summary-list IPC plus fetch-by-id for selected items. | `src/main/db/repositories/requests.ts:34-38`, `src/main/db/repositories/snapshots.ts:15-34` |
| P1 | Large response/diff rendering is unbounded and can create huge DOM/memory pressure. | `src/renderer/src/components/ResponseViewer.tsx:158-173`, `src/renderer/src/components/JsonDiffView.tsx:15-55` |
| P2 | DB init/migrations happen before creating the window, delaying visible startup on slow disk. | `src/main/index.ts:60-62`, `src/main/db/index.ts:18-22` |
| P2 | IPC contracts drift: `HttpCancel` exists in schemas/preload but is missing from `IpcContract`. | `src/shared/ipc.ts:30-31`, `src/shared/ipc.ts:42-80`, `src/shared/ipc-schemas.ts:92-95` |
| P2 | Global CSP header hook is over-scoped and may affect default-session requests beyond the app shell. | `src/main/index.ts:47-54`, `src/main/ipc/http.ts:59-63` |
| P2 | `shell.openExternal` accepts arbitrary schemes from navigations/popups. Add protocol allowlist. | `src/main/window.ts:39-51` |
| P2 | "Restart" after update only reloads the renderer, not `quitAndInstall()`. | `src/main/updater.ts:11-13`, `src/renderer/src/components/UpdaterBanner.tsx:15-24` |
| P3 | DX/release gaps: no tests/CI script, and builder references missing `build/**` resources/placeholders. | `package.json:9-22`, `electron-builder.yml:3-4`, `electron-builder.yml:24`, `electron-builder.yml:40-42` |

## Implementation Order

1. Fix low-risk correctness: autosave flush, updater window getter, updater install IPC, `HttpCancel` contract.
2. Improve startup: lazy-load diff view, idle highlighter preload, consider showing shell before DB readiness.
3. Reduce memory: response size limits, metadata-only list IPC, lazy snapshot bodies, response store cleanup/LRU.
4. Harden architecture/DX: explicit update DTOs, URL/timeout validation, tests/CI, real packaging resources.
