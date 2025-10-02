import React, { useState, useEffect } from 'react';
import './App.css';
import { ApiRequest, Folder, Snapshot } from './types';
import Sidebar from './components/Sidebar';
import RequestInterface from './components/RequestInterface';
import ResponseViewer from './components/ResponseViewer';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [activeRequest, setActiveRequest] = useState<ApiRequest | null>(null);
  const [currentResponse, setCurrentResponse] = useState<any>(null);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedRequests = localStorage.getItem('api-snapshot-requests');
    const savedFolders = localStorage.getItem('api-snapshot-folders');
    const savedSnapshots = localStorage.getItem('api-snapshot-snapshots');

    if (savedRequests) {
      setRequests(JSON.parse(savedRequests));
    }
    if (savedFolders) {
      setFolders(JSON.parse(savedFolders));
    }
    if (savedSnapshots) {
      setSnapshots(JSON.parse(savedSnapshots));
    }
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('api-snapshot-requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('api-snapshot-folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('api-snapshot-snapshots', JSON.stringify(snapshots));
  }, [snapshots]);

  const createNewRequest = () => {
    const newRequest: ApiRequest = {
      id: uuidv4(),
      name: 'New Request',
      method: 'GET',
      url: '',
      headers: {},
      queryParams: {},
      body: ''
    };
    setRequests([...requests, newRequest]);
    setActiveRequest(newRequest);
  };

  const updateRequest = (updatedRequest: ApiRequest) => {
    setRequests(requests.map(req => 
      req.id === updatedRequest.id ? updatedRequest : req
    ));
    setActiveRequest(updatedRequest);
  };

  const deleteRequest = (requestId: string) => {
    setRequests(requests.filter(req => req.id !== requestId));
    if (activeRequest?.id === requestId) {
      setActiveRequest(null);
      setCurrentResponse(null);
    }
    // Also remove associated snapshots
    setSnapshots(snapshots.filter(snap => snap.requestId !== requestId));
  };

  const createFolder = (name: string) => {
    const newFolder: Folder = {
      id: uuidv4(),
      name,
      requests: []
    };
    setFolders([...folders, newFolder]);
  };

  const deleteFolder = (folderId: string) => {
    setFolders(folders.filter(folder => folder.id !== folderId));
    // Remove folder reference from requests
    setRequests(requests.map(req => 
      req.folderId === folderId ? { ...req, folderId: undefined } : req
    ));
  };

  const moveRequestToFolder = (requestId: string, folderId?: string) => {
    setRequests(requests.map(req => 
      req.id === requestId ? { ...req, folderId } : req
    ));
  };

  const saveSnapshot = (requestId: string, response: any) => {
    const newSnapshot: Snapshot = {
      requestId,
      response,
      timestamp: Date.now()
    };
    setSnapshots(snapshots.filter(snap => snap.requestId !== requestId).concat(newSnapshot));
  };

  const clearSnapshot = (requestId: string) => {
    setSnapshots(snapshots.filter(snap => snap.requestId !== requestId));
  };

  const getSnapshot = (requestId: string): Snapshot | undefined => {
    return snapshots.find(snap => snap.requestId === requestId);
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>API Snapshot</h1>
        <p>Regression testing tool for API developers</p>
      </div>
      
      <div className="app-content">
        <Sidebar
          requests={requests}
          folders={folders}
          activeRequest={activeRequest}
          onRequestSelect={setActiveRequest}
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
              />
              
              <ResponseViewer
                response={currentResponse}
                snapshot={getSnapshot(activeRequest.id)}
                onSaveSnapshot={() => currentResponse && saveSnapshot(activeRequest.id, currentResponse)}
                onClearSnapshot={() => clearSnapshot(activeRequest.id)}
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
