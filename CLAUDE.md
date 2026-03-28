# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `npm run dev` — starts Vite on http://localhost:3000 (auto-opens browser)
- **Build**: `npm run build` — runs `tsc && vite build`, output in `build/`
- **Preview**: `npm run preview` — serves the production build locally

No test runner or linter is currently configured.

## Architecture

Delta (branded "API Snapshot") is a browser-based API regression testing tool. It lets users build HTTP requests, save response snapshots, and diff current responses against saved snapshots to detect regressions.

**Stack**: React 19 + TypeScript, Vite, Axios for HTTP, plain CSS.

**No backend** — all persistence is via localStorage with keys: `api-snapshot-requests`, `api-snapshot-folders`, `api-snapshot-snapshots`.

### Component tree

```
App.tsx              — global state (requests, folders, snapshots), localStorage sync
├── Sidebar          — folder/request tree, create/delete/move operations
├── RequestInterface — URL bar, method selector, tabbed editor (headers/params/body), cURL import, sends requests via Axios
└── ResponseViewer   — response display (@uiw/react-json-view), snapshot save/clear, line-by-line diff comparison
```

State lives in `App.tsx` and flows down via props (no external state library).

### Key types (`src/types/index.ts`)

- `ApiRequest` — method, url, headers, queryParams, body, optional folderId
- `ApiResponse` — status, data, headers, responseTime
- `Snapshot` — requestId, response, timestamp (one snapshot per request)
- `Folder` — id, name, request ID list

### Utilities

- `src/utils/curlParser.ts` — parses cURL commands into `ApiRequest` objects (handles -X, -H, -d, auth flags, quoted strings)
