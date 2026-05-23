# Delta — Optimization Review

Grouped by area, prioritized by impact within each section, with concrete file/line references.

## Startup speed

1. **DB init blocks window creation.** `src/main/index.ts:60-62` runs `initDb()` → `registerAllIpc()` → `createMainWindow()` serially. The window doesn't need the DB before `ready-to-show`. Reorder to `createMainWindow()` first, then `initDb()` + IPC in parallel; renderer only invokes once it has rendered. Saves the WAL/pragma/migration cost from your time-to-first-paint.
2. **Renderer ships as one 544 KB chunk** (`out/renderer/assets/index-*.js`). No `build.rollupOptions.output.manualChunks` in `electron.vite.config.ts:29-37`. `@pierre/diffs` brings Shiki + Oniguruma WASM — almost certainly the bulk. Split it: lazy-load `JsonDiffView` and call `preloadHighlighter` only when the Diff tab is first opened, not at `main.tsx:9`. Today every cold start pays for Shiki even if the user never diffs.
3. **Updater fires on a fixed 5 s timer** (`src/main/updater.ts:43-47`). Fine, but `autoUpdater.logger = logger` runs synchronously before the window opens. Move all updater wiring inside the `setTimeout` so it's off the startup path entirely.
4. **`preloadHighlighter` runs at module top level** (`main.tsx:10`). Move it behind `requestIdleCallback` so it doesn't compete with the initial paint.

## Bundle / memory

5. **`useResponseStore` grows unbounded** (`stores/response.ts`). Every send adds a full response (body included) keyed by request id and nothing ever evicts. In a long session with large JSON, this leaks. Add an LRU cap (e.g. last 20 responses) or evict on request unmount.
6. **Output validation on every IPC call** (`src/main/ipc/registry.ts:34-38`). Zod-parsing the result of `snapshots:list` re-walks every snapshot's full response body. Output schema is great for catching drift in dev; in production it's pure cost. Gate the output `safeParse` behind `is.dev`.
7. **Snapshot list returns full bodies** (`db/repositories/snapshots.ts:28-34`). The Snapshots tab only renders status/size/label/timestamp (`ResponseViewer.tsx:233-300`), but you JSON-parse every full response on each list. Project to metadata columns for the list, fetch full `response` only when diffing.
8. **HTTP response double-parses** (`src/main/ipc/http.ts:38-51` → `tryJson` in main → IPC structured clone → zod `z.unknown()`). Worth measuring: for large JSON, sending raw text + content-type and parsing once in the renderer is cheaper.

## Architecture / IPC

9. **`requests.update` rewrites every column on every keystroke.** `RequestEditor.tsx:44-60` debounces 400 ms then full-record-updates; `repositories/requests.ts:80-110` SELECTs then UPDATEs all columns. With typed fields like `url` and `body`, a partial UPDATE keyed off `patch` keys would halve the work and avoid the `SELECT` round-trip.
10. **Updater wiring is window-coupled via closure** (`updater.ts:11`). Works, but if you ever support multiple windows or detached panels, swap to an event emitter that windows subscribe to. Minor.
11. **No central error contract.** Handlers throw `new Error(message)` (`registry.ts:43-45`) which strips type info. Consider a `Result<T>` envelope for expected failures (timeouts, HTTP errors) vs. exceptions for programmer errors.
12. **CSP injected on every response globally** (`index.ts:47-54`). Scope `onHeadersReceived` to the renderer's session/origin so devtool/extension requests aren't perturbed.

## Renderer perf / memory

13. **`Layout.tsx:55-67` has no dep array** — keydown listener re-binds on every render. Add `[]` deps and stable callbacks.
14. **`Layout.tsx:161-163` (OpenMenu)** re-sorts the whole `requests` array on every render. `useMemo` it.
15. **`Sidebar.tsx:61-73`** allocates new sorted/filtered arrays per render for unfiled + each folder. With a few hundred requests this churns. Memoize by `(requests, folders, sortMode, q)`.
16. **`JsonDiffView` re-parses on every prop change** (`JsonDiffView.tsx:15-22`). `parseDiffFromFile` over large JSON is expensive; you already memo it — good. But `before`/`after` are reference-unstable from `ResponseViewer.tsx:46-89` (object spreads inside `useMemo`). Memoize the diff inputs upstream too.
17. **`KeyValueEditor` (`RequestEditor.tsx:241-317`)** rebuilds the entries object on every change and reorders keys; typing into an empty row triggers `add()` from `onFocus` *and* the next `onChange` — easy to introduce duplicate-key bugs. Use a stable array model `[{id, key, value}]` instead of `Record<string,string>`.

## Electron / window

18. **`backgroundThrottling`** isn't set in `window.ts:23-30`. For an API client where a request can complete while the window is occluded, set `backgroundThrottling: false` — otherwise long requests can stall.
19. **No `setPermissionRequestHandler`** in `session.defaultSession`. Add one that denies notifications/geolocation/midi by default; cheap hardening.
20. **`will-navigate` swallows the URL even in dev** if `ELECTRON_RENDERER_URL` is unset (`window.ts:46-52`). Minor edge case.
21. **`asarUnpack: 'resources/**'`** in `electron-builder.yml:13` unpacks everything — only `better-sqlite3` native needs unpacking. Trimming this reduces installer size.

## Developer experience

22. **No tests.** Add `vitest` + tests for `jsonDiff.ts`, `environment.ts`, and the zod schemas. These three files have the highest defect potential and are pure functions — fastest tests to write.
23. **`tsconfig.web.json` doesn't enable `noUncheckedIndexedAccess`.** Would catch latent bugs at `snapshots[0]`, `displayRows[idx]`, `matches.find(...)?.params['requestId' as never]` (Sidebar/Layout). The `as never` is a code smell coming from missing types — `useRouterState`'s typed params would fix it.
24. **`react-hooks/exhaustive-deps` is suppressed** at `RequestEditor.tsx:69`. The unmount-flush captures stale `local`. Use a `latestLocalRef` and read from it in the cleanup.
25. **Renderer console messages re-logged via `console.warn`** (`window.ts:63-68`). Forward them into `electron-log` instead so they end up in the same log file the user opens via "Open logs."
26. **No `prettier-plugin-tailwindcss`.** Class strings are getting long; auto-ordering would help review diffs.
27. **`npm run dev` doesn't watch the preload** unless electron-vite picks it up automatically — verify; otherwise add a watch entry. Not blocking.
28. **`postinstall` rebuilds native modules every install** (`package.json:18`). Speeds drop on CI; add a cached rebuild step or pin `better-sqlite3` to a prebuilt binary version.

## Top 5 to do first

1. Split the renderer bundle and lazy-load `@pierre/diffs` (biggest startup win).
2. Cap `useResponseStore` size (silent memory leak).
3. Project snapshot list to metadata + gate IPC output validation to dev (biggest IPC win as snapshot count grows).
4. Memoize Sidebar/Layout sort+filter, fix `Layout.tsx:55` missing deps.
5. Add vitest with tests for `jsonDiff`, `environment`, and zod schemas.
