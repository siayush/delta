import { useState, useEffect, useCallback, useRef } from "react";
import {
  ApiRequest,
  ApiResponse,
  Folder,
  Snapshot,
  Environment,
} from "./types";
import Sidebar from "./components/Sidebar";
import RequestInterface from "./components/RequestInterface";
import ResponseViewer from "./components/ResponseViewer";
import EnvironmentManager from "./components/EnvironmentManager";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, Moon, Sun } from "lucide-react";
import * as api from "./services/api";

function App() {
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(
    null,
  );
  const [activeRequest, setActiveRequest] = useState<ApiRequest | null>(null);
  const [currentResponse, setCurrentResponse] = useState<ApiResponse | null>(
    null,
  );
  const [requestSnapshots, setRequestSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("api-snapshot-theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("api-snapshot-theme", dark ? "dark" : "light");
  }, [dark]);

  const activeEnvironment =
    environments.find((e) => e.id === activeEnvironmentId) || null;
  const baseline = requestSnapshots.find((s) => s.isBaseline);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      api.fetchRequests(),
      api.fetchFolders(),
      api.fetchEnvironments(),
    ])
      .then(([reqs, folds, envs]) => {
        setRequests(reqs);
        setFolders(folds);
        setEnvironments(envs);
      })
      .catch((err) => {
        console.error("[App] Failed to load data:", err);
        setError(
          "Failed to connect to server. Make sure the backend is running on port 3000.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const loadSnapshots = useCallback(async (requestId: string) => {
    try {
      const snaps = await api.fetchSnapshots(requestId);
      setRequestSnapshots(snaps);
    } catch (err) {
      console.error("Failed to load snapshots:", err);
      setRequestSnapshots([]);
    }
  }, []);

  useEffect(() => {
    if (activeRequest) loadSnapshots(activeRequest.id);
    else setRequestSnapshots([]);
  }, [activeRequest?.id, loadSnapshots]);

  const createNewRequest = async () => {
    try {
      const newRequest = await api.createRequest({
        name: "New Request",
        method: "GET",
        url: "",
        headers: {},
        queryParams: {},
        body: "",
      });
      setRequests((prev) => [newRequest, ...prev]);
      setActiveRequest(newRequest);
      setCurrentResponse(null);
    } catch (err) {
      console.error("[App] Failed to create request:", err);
    }
  };

  const updateRequest = (updatedRequest: ApiRequest) => {
    setRequests((prev) =>
      prev.map((req) => (req.id === updatedRequest.id ? updatedRequest : req)),
    );
    setActiveRequest(updatedRequest);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.updateRequest(updatedRequest.id, updatedRequest);
      } catch (err) {
        console.error("Failed to save request:", err);
      }
    }, 500);
  };

  const deleteRequest = async (requestId: string) => {
    try {
      await api.deleteRequest(requestId);
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      if (activeRequest?.id === requestId) {
        setActiveRequest(null);
        setCurrentResponse(null);
        setRequestSnapshots([]);
      }
    } catch (err) {
      console.error("Failed to delete request:", err);
    }
  };

  const createFolder = async (name: string) => {
    try {
      const f = await api.createFolder(name);
      setFolders((prev) => [f, ...prev]);
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      await api.deleteFolder(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setRequests((prev) =>
        prev.map((req) =>
          req.folderId === folderId ? { ...req, folderId: undefined } : req,
        ),
      );
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
  };

  const moveRequestToFolder = async (requestId: string, folderId?: string) => {
    try {
      const saved = await api.updateRequest(requestId, {
        folderId,
      } as Partial<ApiRequest>);
      setRequests((prev) =>
        prev.map((req) => (req.id === requestId ? saved : req)),
      );
    } catch (err) {
      console.error("Failed to move request:", err);
    }
  };

  const saveSnapshot = async (label?: string, setAsBaseline?: boolean) => {
    if (!currentResponse || !activeRequest) {
      console.warn("[App] saveSnapshot bailed");
      return;
    }
    try {
      const snapshot = await api.saveSnapshot({
        requestId: activeRequest.id,
        environmentId: activeEnvironmentId || undefined,
        label,
        isBaseline: setAsBaseline || false,
        response: currentResponse,
      });
      if (setAsBaseline)
        setRequestSnapshots((prev) => [
          snapshot,
          ...prev.map((s) => ({ ...s, isBaseline: false })),
        ]);
      else setRequestSnapshots((prev) => [snapshot, ...prev]);
    } catch (err) {
      console.error("Failed to save snapshot:", err);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    try {
      await api.deleteSnapshot(snapshotId);
      setRequestSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
    } catch (err) {
      console.error("Failed to delete snapshot:", err);
    }
  };

  const handleSetBaseline = async (snapshotId: string) => {
    try {
      const updated = await api.setBaseline(snapshotId);
      setRequestSnapshots((prev) =>
        prev.map((s) =>
          s.id === snapshotId ? updated : { ...s, isBaseline: false },
        ),
      );
    } catch (err) {
      console.error("Failed to set baseline:", err);
    }
  };

  const handleCreateEnvironment = async (env: Omit<Environment, "id">) => {
    try {
      const c = await api.createEnvironment(env);
      setEnvironments((prev) => [...prev, c]);
    } catch (err) {
      console.error("Failed to create environment:", err);
    }
  };

  const handleUpdateEnvironment = async (
    id: string,
    env: Partial<Environment>,
  ) => {
    try {
      const u = await api.updateEnvironment(id, env);
      setEnvironments((prev) => prev.map((e) => (e.id === id ? u : e)));
    } catch (err) {
      console.error("Failed to update environment:", err);
    }
  };

  const handleDeleteEnvironment = async (id: string) => {
    try {
      await api.deleteEnvironment(id);
      setEnvironments((prev) => prev.filter((e) => e.id !== id));
      if (activeEnvironmentId === id) setActiveEnvironmentId(null);
    } catch (err) {
      console.error("Failed to delete environment:", err);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-[oklch(0.17_0.01_280)] text-white px-6 py-4">
          <h1 className="text-xl font-bold tracking-tight">API Snapshot</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-[oklch(0.17_0.01_280)] text-white px-6 py-4">
          <h1 className="text-xl font-bold tracking-tight">API Snapshot</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-destructive font-medium">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      <header className="bg-[oklch(0.17_0.01_280)] text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#FF6C37]" /> API Snapshot
          </h1>
          <p className="text-xs text-white/60">
            Regression testing for API developers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EnvironmentManager
            environments={environments}
            activeEnvironmentId={activeEnvironmentId}
            onSelectEnvironment={setActiveEnvironmentId}
            onCreateEnvironment={handleCreateEnvironment}
            onUpdateEnvironment={handleUpdateEnvironment}
            onDeleteEnvironment={handleDeleteEnvironment}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark((d) => !d)}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          requests={requests}
          folders={folders}
          activeRequest={activeRequest}
          onRequestSelect={(req) => {
            setActiveRequest(req);
            setCurrentResponse(null);
          }}
          onNewRequest={createNewRequest}
          onDeleteRequest={deleteRequest}
          onCreateFolder={createFolder}
          onDeleteFolder={deleteFolder}
          onMoveRequest={moveRequestToFolder}
        />

        <main className="flex-1 flex flex-col overflow-hidden m-2 ml-0">
          {activeRequest ? (
            <div className="flex flex-col flex-1 bg-card rounded-lg border shadow-sm overflow-hidden">
              <RequestInterface
                request={activeRequest}
                onRequestUpdate={updateRequest}
                onResponseReceived={setCurrentResponse}
                activeEnvironment={activeEnvironment}
              />
              <ResponseViewer
                response={currentResponse}
                snapshots={requestSnapshots}
                baseline={baseline}
                environments={environments}
                onSaveSnapshot={saveSnapshot}
                onDeleteSnapshot={handleDeleteSnapshot}
                onSetBaseline={handleSetBaseline}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-lg border shadow-sm">
              <Zap className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Welcome to API Snapshot
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Create a new request or select one from the sidebar.
              </p>
              <Button onClick={createNewRequest}>Create New Request</Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
