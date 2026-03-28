# Plan: Full API Response Comparison Tool with MongoDB Backend

## Context

Delta ("API Snapshot") is a browser-based API regression testing tool built with React 19 + TypeScript. It currently stores everything in localStorage with a single-snapshot-per-request model and a basic line-by-line text diff. The goal is to transform it into a full-featured API comparison tool with:
- An Express/MongoDB backend replacing localStorage
- Multiple snapshots per request with baseline marking
- Structural JSON diff (field-level, not line-level)
- Environment support (dev/staging/prod)

---

## Step 1: Backend Setup (Express + MongoDB)

### New directory: `server/`

```
server/
├── index.ts            — Express app entry, MongoDB connection, CORS
├── models/
│   ├── Request.ts      — Mongoose model for ApiRequest
│   ├── Folder.ts       — Mongoose model for Folder
│   ├── Snapshot.ts     — Mongoose model for Snapshot (multiple per request)
│   └── Environment.ts  — Mongoose model for Environment
├── routes/
│   ├── requests.ts     — CRUD /api/requests
│   ├── folders.ts      — CRUD /api/folders
│   ├── snapshots.ts    — CRUD /api/snapshots, baseline toggle
│   └── environments.ts — CRUD /api/environments
├── tsconfig.json       — Server-specific TS config
└── package.json        — Server dependencies
```

### Dependencies (server/package.json)
- `express`, `mongoose`, `cors`, `dotenv`
- `typescript`, `ts-node`, `nodemon` (dev)
- `@types/express`, `@types/cors` (dev)

### MongoDB Collections & Schemas

**requests**: `{ _id, name, method, url, headers, queryParams, body, folderId? }`
**folders**: `{ _id, name }`
**snapshots**: `{ _id, requestId, environmentId?, label?, isBaseline, response: { status, statusText, data, headers, responseTime }, timestamp }`
**environments**: `{ _id, name, baseUrl, variables: Record<string,string>, color }`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/requests | List all requests |
| POST | /api/requests | Create request |
| PUT | /api/requests/:id | Update request |
| DELETE | /api/requests/:id | Delete request + its snapshots |
| GET | /api/folders | List all folders |
| POST | /api/folders | Create folder |
| PUT | /api/folders/:id | Update folder |
| DELETE | /api/folders/:id | Delete folder, unset folderId on its requests |
| GET | /api/snapshots?requestId=X | List snapshots for a request |
| POST | /api/snapshots | Save new snapshot |
| DELETE | /api/snapshots/:id | Delete one snapshot |
| PUT | /api/snapshots/:id/baseline | Toggle baseline (clears previous baseline for that request) |
| GET | /api/environments | List all environments |
| POST | /api/environments | Create environment |
| PUT | /api/environments/:id | Update environment |
| DELETE | /api/environments/:id | Delete environment |

### Server entry (`server/index.ts`)
- Connect to MongoDB via `mongoose.connect(process.env.MONGODB_URI)`
- CORS allowing `http://localhost:3000`
- JSON body parsing
- Mount routes under `/api`
- Listen on port 3001

---

## Step 2: Frontend API Service Layer

### New file: `src/services/api.ts`

A centralized service that replaces all localStorage calls with HTTP requests to the backend. Functions:

```
// Requests
fetchRequests(): Promise<ApiRequest[]>
createRequest(req): Promise<ApiRequest>
updateRequest(id, req): Promise<ApiRequest>
deleteRequest(id): Promise<void>

// Folders
fetchFolders(): Promise<Folder[]>
createFolder(name): Promise<Folder>
updateFolder(id, name): Promise<Folder>
deleteFolder(id): Promise<void>

// Snapshots
fetchSnapshots(requestId): Promise<Snapshot[]>
saveSnapshot(snapshot): Promise<Snapshot>
deleteSnapshot(id): Promise<void>
setBaseline(id): Promise<void>

// Environments
fetchEnvironments(): Promise<Environment[]>
createEnvironment(env): Promise<Environment>
updateEnvironment(id, env): Promise<Environment>
deleteEnvironment(id): Promise<void>
```

Uses axios with `baseURL: 'http://localhost:3001/api'`.

---

## Step 3: Type Updates

### Modify: `src/types/index.ts`

```typescript
// NEW
export interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  variables: Record<string, string>;
  color: string;
}

// MODIFIED - Snapshot gains id, baseline flag, environment ref, label
export interface Snapshot {
  id: string;              // MongoDB _id
  requestId: string;
  environmentId?: string;
  label?: string;
  isBaseline: boolean;
  response: ApiResponse;   // typed instead of `any`
  timestamp: number;
}

// NEW - structured diff node
export interface JsonDiffNode {
  path: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: any;
  newValue?: any;
  children?: JsonDiffNode[];
}

// MODIFIED - structured comparison result
export interface ComparisonResult {
  isMatch: boolean;
  statusChanged: boolean;
  headersDiff: JsonDiffNode[];
  bodyDiff: JsonDiffNode[];
  summary: { added: number; removed: number; changed: number };
}
```

`ApiRequest`, `ApiResponse`, `Folder`, `TabType` stay unchanged.

---

## Step 4: Rewire App.tsx — Replace localStorage with API calls

### Modify: `src/App.tsx`

Key changes:
- Remove all `localStorage.getItem/setItem` logic
- Add `useEffect` that calls `api.fetchRequests()`, `api.fetchFolders()`, `api.fetchEnvironments()` on mount
- Add `environments` state and `activeEnvironmentId` state
- `saveSnapshot` becomes async, calls `api.saveSnapshot()`, no longer replaces
- `getSnapshots(requestId)` returns array from API (loaded on request select)
- `setBaseline(snapshotId)` calls `api.setBaseline()`
- Add loading state for initial data fetch
- Pass `environments`, `activeEnvironment`, snapshot-related callbacks down to children

### New state in App.tsx:
```
environments: Environment[]
activeEnvironmentId: string | null
requestSnapshots: Snapshot[]  // snapshots for active request, loaded on select
```

---

## Step 5: Environment Support

### New file: `src/components/EnvironmentManager.tsx`
### New file: `src/components/EnvironmentManager.css`

Rendered in the app header area (next to the title). Contains:
- A dropdown selector showing the active environment (with color dot)
- "Manage Environments" button that opens a modal
- Modal with CRUD for environments: name, base URL, variables (key-value editor), color picker

### New file: `src/utils/environmentResolver.ts`

```typescript
resolveUrl(url: string, env: Environment | null): string
```
- If URL starts with `/`, prepend `env.baseUrl`
- Replace `{{variable}}` placeholders with `env.variables[variable]`
- If no active environment, return URL as-is

### Modify: `src/components/RequestInterface.tsx`
- Accept `activeEnvironment` prop
- Call `resolveUrl()` before sending the request (in `sendRequest`)
- Show resolved URL preview below the URL input when environment is active
- Tag the snapshot with `environmentId` when saving

---

## Step 6: Multiple Snapshots + Baseline

### New file: `src/components/SnapshotHistory.tsx`
### New file: `src/components/SnapshotHistory.css`

A panel/tab inside ResponseViewer showing:
- Chronological list of snapshots for the active request
- Each entry: timestamp, environment name+color, label, status code, baseline star icon
- Baseline snapshot pinned to top with distinct styling
- Actions per snapshot: "Set Baseline" (star toggle), "Delete", "Add/Edit Label", "Compare" (select for diff)
- Click a snapshot to preview its response

### Modify: `src/components/ResponseViewer.tsx`

- New props: `snapshots: Snapshot[]`, `baseline: Snapshot | undefined`, `onSaveSnapshot(label?, setAsBaseline?)`, `onDeleteSnapshot(id)`, `onSetBaseline(id)`
- Add "History" tab alongside "Response" and "Diff"
- Auto-compare current response against baseline (not just "the one snapshot")
- Diff tab gets a dropdown to select which snapshot to compare against (defaults to baseline)
- "Save Snapshot" button shows inline options: optional label text input + "Set as baseline" checkbox
- Remove old `compareResponses()` and `generateDiff()` — replaced by new diff system

---

## Step 7: Structural JSON Diff

### New file: `src/utils/jsonDiff.ts`

Recursive diff algorithm (~100 lines):
- `computeDiff(oldVal, newVal, path = ''): JsonDiffNode[]`
- Handles primitives (type/value changes), objects (added/removed/changed keys), arrays (by index)
- Returns flat list of `JsonDiffNode` entries
- `diffSummary(nodes): { added, removed, changed }` helper

Also compares status codes and headers, not just body.

### New file: `src/components/JsonDiffViewer.tsx`
### New file: `src/components/JsonDiffViewer.css`

React component rendering `JsonDiffNode[]` as a tree:
- Color-coded: green (added), red (removed), amber (changed)
- Shows JSON path, old value (struck), new value (highlighted)
- Collapsible at object/array levels
- Filter buttons: "All changes", "Added only", "Removed only", "Changed only"
- Three sections: Status diff, Headers diff, Body diff

Replaces `dangerouslySetInnerHTML` approach entirely.

### Modify: `src/components/ResponseViewer.tsx`
- Import `computeDiff` from `jsonDiff.ts`
- Import `JsonDiffViewer` component
- Render `<JsonDiffViewer nodes={bodyDiff} />` in the Diff tab

---

## Implementation Order

1. **Backend** (Step 1) — get the Express server + MongoDB running with all CRUD endpoints
2. **Types** (Step 3) — update type definitions for new data model
3. **API service** (Step 2) — create `src/services/api.ts`
4. **Rewire App.tsx** (Step 4) — swap localStorage for API calls, add loading states
5. **Snapshot history + baseline** (Step 6) — SnapshotHistory component, multi-snapshot UI, baseline toggle
6. **JSON diff** (Step 7) — jsonDiff utility + JsonDiffViewer component, replace old diff
7. **Environments** (Step 5) — EnvironmentManager, URL resolver, wire into RequestInterface

---

## Files to Create

| File | Purpose |
|------|---------|
| `server/index.ts` | Express app entry point |
| `server/models/Request.ts` | Mongoose Request model |
| `server/models/Folder.ts` | Mongoose Folder model |
| `server/models/Snapshot.ts` | Mongoose Snapshot model |
| `server/models/Environment.ts` | Mongoose Environment model |
| `server/routes/requests.ts` | Request CRUD routes |
| `server/routes/folders.ts` | Folder CRUD routes |
| `server/routes/snapshots.ts` | Snapshot CRUD + baseline routes |
| `server/routes/environments.ts` | Environment CRUD routes |
| `server/package.json` | Server dependencies |
| `server/tsconfig.json` | Server TS config |
| `server/.env` | MongoDB URI |
| `src/services/api.ts` | Frontend API service layer |
| `src/utils/jsonDiff.ts` | Structural JSON diff algorithm |
| `src/utils/environmentResolver.ts` | URL template resolver |
| `src/components/SnapshotHistory.tsx` | Snapshot list + baseline UI |
| `src/components/SnapshotHistory.css` | Snapshot history styles |
| `src/components/JsonDiffViewer.tsx` | Structured diff tree viewer |
| `src/components/JsonDiffViewer.css` | Diff viewer styles |
| `src/components/EnvironmentManager.tsx` | Environment CRUD + selector |
| `src/components/EnvironmentManager.css` | Environment manager styles |

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add Environment, JsonDiffNode; modify Snapshot, ComparisonResult |
| `src/App.tsx` | Replace localStorage with API calls, add environments + snapshots state |
| `src/components/ResponseViewer.tsx` | New props, History tab, baseline comparison, JsonDiffViewer |
| `src/components/RequestInterface.tsx` | Accept environment prop, resolve URLs, show resolved preview |
| `src/components/Sidebar.tsx` | Minor — show environment badge on requests (optional) |
| `src/App.css` | Styles for environment selector in header |
| `package.json` | No changes (axios already present for frontend) |

## New Dependencies

| Package | Where | Purpose |
|---------|-------|---------|
| `express` | server | HTTP framework |
| `mongoose` | server | MongoDB ODM |
| `cors` | server | Cross-origin requests |
| `dotenv` | server | Environment variables |
| `typescript` | server (dev) | TypeScript compilation |
| `ts-node` | server (dev) | Run TS directly |
| `nodemon` | server (dev) | Auto-restart on changes |

No new frontend dependencies — axios is already available, and the JSON diff is hand-written.

---

## Verification Plan

1. **Backend**: Start MongoDB, run `npm run dev` in `server/`. Test each endpoint with cURL:
   - Create/list/update/delete requests, folders, environments
   - Save multiple snapshots, toggle baselines, verify only one baseline per request
2. **Frontend data flow**: Start Vite dev server. Create a request, send it, verify data persists in MongoDB (not localStorage). Refresh page — data should reload from API.
3. **Snapshot history**: Save multiple snapshots for one request. Verify the History tab shows all of them. Mark one as baseline, verify star toggles. Delete a snapshot, verify it disappears.
4. **JSON diff**: Save a baseline, then modify the API to return different data (or use a mock API). Verify the Diff tab shows structural differences with correct paths, color coding, and summary counts.
5. **Environments**: Create dev/staging/prod environments. Set a request URL to `/api/users`. Switch environments, verify the resolved URL preview updates. Send requests from different environments, verify snapshots are tagged with the environment.
6. **Build**: Run `npm run build` to verify TypeScript compilation passes.
