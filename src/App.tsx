import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { ApiRequest, ApiResponse, Folder, Snapshot, Environment } from './types';
import Sidebar from './components/Sidebar';
import RequestInterface from './components/RequestInterface';
import ResponseViewer from './components/ResponseViewer';
import EnvironmentManager from './components/EnvironmentManager';
import * as api from './services/api';

function App() {
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] = useState<ApiRequest | null>(null);
  const [currentResponse, setCurrentResponse] = useState<ApiResponse | null>(null);
  const [requestSnapshots, setRequestSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeEnvironment = environments.find(e => e.id === activeEnvironmentId) || null;
  const baseline = requestSnapshots.find(s => s.isBaseline);

  // Debounced save for request updates
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial data
  useEffect(() => {
    console.log('[App] Starting initial data load...');
    Promise.all([
      api.fetchRequests(),
      api.fetchFolders(),
      api.fetchEnvironments(),
    ])
      .then(([reqs, folds, envs]) => {
        console.log('[App] Data loaded:', { requests: reqs, folders: folds, environments: envs });
        setRequests(reqs);
        setFolders(folds);
        setEnvironments(envs);
      })
      .catch(err => {
        console.error('[App] Failed to load data:', err);
        setError('Failed to connect to server. Make sure the backend is running on port 3000.');
      })
      .finally(() => {
        console.log('[App] Loading complete');
        setLoading(false);
      });
  }, []);

  // Load snapshots when active request changes
  const loadSnapshots = useCallback(async (requestId: string) => {
    try {
      const snaps = await api.fetchSnapshots(requestId);
      setRequestSnapshots(snaps);
    } catch (err) {
      console.error('Failed to load snapshots:', err);
      setRequestSnapshots([]);
    }
  }, []);

  useEffect(() => {
    if (activeRequest) {
      loadSnapshots(activeRequest.id);
    } else {
      setRequestSnapshots([]);
    }
  }, [activeRequest?.id, loadSnapshots]);

  const createNewRequest = async () => {
    console.log('[App] createNewRequest called');
    try {
      const newRequest = await api.createRequest({
        name: 'New Request',
        method: 'GET',
        url: '',
        headers: {},
        queryParams: {},
        body: ''
      });
      console.log('[App] Request created:', newRequest);
      setRequests(prev => [newRequest, ...prev]);
      setActiveRequest(newRequest);
      setCurrentResponse(null);
    } catch (err) {
      console.error('[App] Failed to create request:', err);
    }
  };

  // Update request locally immediately, debounce the backend save
  const updateRequest = (updatedRequest: ApiRequest) => {
    setRequests(prev => prev.map(req => req.id === updatedRequest.id ? updatedRequest : req));
    setActiveRequest(updatedRequest);

    // Debounce backend save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.updateRequest(updatedRequest.id, updatedRequest);
      } catch (err) {
        console.error('Failed to save request:', err);
      }
    }, 500);
  };

  const deleteRequest = async (requestId: string) => {
    try {
      await api.deleteRequest(requestId);
      setRequests(prev => prev.filter(req => req.id !== requestId));
      if (activeRequest?.id === requestId) {
        setActiveRequest(null);
        setCurrentResponse(null);
        setRequestSnapshots([]);
      }
    } catch (err) {
      console.error('Failed to delete request:', err);
    }
  };

  const createFolder = async (name: string) => {
    try {
      const newFolder = await api.createFolder(name);
      setFolders(prev => [newFolder, ...prev]);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      await api.deleteFolder(folderId);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setRequests(prev => prev.map(req =>
        req.folderId === folderId ? { ...req, folderId: undefined } : req
      ));
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  const moveRequestToFolder = async (requestId: string, folderId?: string) => {
    try {
      const saved = await api.updateRequest(requestId, { folderId } as Partial<ApiRequest>);
      setRequests(prev => prev.map(req => req.id === requestId ? saved : req));
    } catch (err) {
      console.error('Failed to move request:', err);
    }
  };

  const saveSnapshot = async (label?: string, setAsBaseline?: boolean) => {
    console.log('[App] saveSnapshot called', { hasResponse: !!currentResponse, hasActiveRequest: !!activeRequest, label, setAsBaseline });
    if (!currentResponse || !activeRequest) {
      console.warn('[App] saveSnapshot bailed: currentResponse=', !!currentResponse, 'activeRequest=', !!activeRequest);
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
      if (setAsBaseline) {
        setRequestSnapshots(prev =>
          [snapshot, ...prev.map(s => ({ ...s, isBaseline: false }))]
        );
      } else {
        setRequestSnapshots(prev => [snapshot, ...prev]);
      }
    } catch (err) {
      console.error('Failed to save snapshot:', err);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    try {
      await api.deleteSnapshot(snapshotId);
      setRequestSnapshots(prev => prev.filter(s => s.id !== snapshotId));
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
    }
  };

  const handleSetBaseline = async (snapshotId: string) => {
    try {
      const updated = await api.setBaseline(snapshotId);
      setRequestSnapshots(prev =>
        prev.map(s => s.id === snapshotId ? updated : { ...s, isBaseline: false })
      );
    } catch (err) {
      console.error('Failed to set baseline:', err);
    }
  };

  const handleCreateEnvironment = async (env: Omit<Environment, 'id'>) => {
    try {
      const created = await api.createEnvironment(env);
      setEnvironments(prev => [...prev, created]);
    } catch (err) {
      console.error('Failed to create environment:', err);
    }
  };

  const handleUpdateEnvironment = async (id: string, env: Partial<Environment>) => {
    try {
      const updated = await api.updateEnvironment(id, env);
      setEnvironments(prev => prev.map(e => e.id === id ? updated : e));
    } catch (err) {
      console.error('Failed to update environment:', err);
    }
  };

  const handleDeleteEnvironment = async (id: string) => {
    try {
      await api.deleteEnvironment(id);
      setEnvironments(prev => prev.filter(e => e.id !== id));
      if (activeEnvironmentId === id) setActiveEnvironmentId(null);
    } catch (err) {
      console.error('Failed to delete environment:', err);
    }
  };

  console.log('[App] Render:', { loading, error, activeRequest: activeRequest?.id, requestCount: requests.length });

  if (loading) {
    return (
      <div className="app">
        <div className="app-header">
          <div className="app-header-left">
            <h1>API Snapshot</h1>
            <p>Regression testing tool for API developers</p>
          </div>
        </div>
        <div className="app-content">
          <div className="loading-screen">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="app-header">
          <div className="app-header-left">
            <h1>API Snapshot</h1>
            <p>Regression testing tool for API developers</p>
          </div>
        </div>
        <div className="app-content">
          <div className="loading-screen">
            <p style={{ color: '#dc3545' }}>{error}</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-header">
        <div className="app-header-left">
          <h1>API Snapshot</h1>
          <p>Regression testing tool for API developers</p>
        </div>
        <div className="app-header-right">
          <EnvironmentManager
            environments={environments}
            activeEnvironmentId={activeEnvironmentId}
            onSelectEnvironment={setActiveEnvironmentId}
            onCreateEnvironment={handleCreateEnvironment}
            onUpdateEnvironment={handleUpdateEnvironment}
            onDeleteEnvironment={handleDeleteEnvironment}
          />
        </div>
      </div>

      <div className="app-content">
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

        <div className="main-content">
          {activeRequest ? (
            <>
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
            </>
          ) : (
            <div className="welcome-screen">
              <h2>Welcome to API Snapshot</h2>
              <p>Create a new request or select an existing one from the sidebar to get started.</p>
              <button onClick={createNewRequest} className="btn btn-primary">
                Create New Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
