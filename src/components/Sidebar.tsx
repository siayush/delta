import React, { useState } from 'react';
import { ApiRequest, Folder } from '../types';
import './Sidebar.css';

interface SidebarProps {
  requests: ApiRequest[];
  folders: Folder[];
  activeRequest: ApiRequest | null;
  onRequestSelect: (request: ApiRequest) => void;
  onNewRequest: () => void;
  onDeleteRequest: (requestId: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveRequest: (requestId: string, folderId?: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  requests,
  folders,
  activeRequest,
  onRequestSelect,
  onNewRequest,
  onDeleteRequest,
  onCreateFolder,
  onDeleteFolder,
  onMoveRequest
}) => {
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderInput(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getRequestsInFolder = (folderId: string) => {
    return requests.filter(req => req.folderId === folderId);
  };

  const getRequestsWithoutFolder = () => {
    return requests.filter(req => !req.folderId);
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: '#28a745',
      POST: '#007bff',
      PUT: '#ffc107',
      DELETE: '#dc3545',
      PATCH: '#6f42c1',
      HEAD: '#6c757d',
      OPTIONS: '#17a2b8'
    };
    return colors[method] || '#6c757d';
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Collections</h3>
        <div className="sidebar-actions">
          <button onClick={onNewRequest} className="btn btn-sm btn-primary" title="New Request">
            + Request
          </button>
          <button 
            onClick={() => setShowNewFolderInput(true)} 
            className="btn btn-sm btn-secondary"
            title="New Folder"
          >
            + Folder
          </button>
        </div>
      </div>

      {showNewFolderInput && (
        <div className="new-folder-input">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <div className="input-actions">
            <button onClick={handleCreateFolder} className="btn btn-xs btn-success">✓</button>
            <button 
              onClick={() => {
                setShowNewFolderInput(false);
                setNewFolderName('');
              }} 
              className="btn btn-xs btn-danger"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="sidebar-content">
        {/* Folders */}
        {folders.map(folder => (
          <div key={folder.id} className="folder">
            <div className="folder-header" onClick={() => toggleFolder(folder.id)}>
              <span className={`folder-icon ${expandedFolders.has(folder.id) ? 'expanded' : ''}`}>
                📁
              </span>
              <span className="folder-name">{folder.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(folder.id);
                }}
                className="btn btn-xs btn-danger folder-delete"
                title="Delete folder"
              >
                🗑️
              </button>
            </div>
            
            {expandedFolders.has(folder.id) && (
              <div className="folder-requests">
                {getRequestsInFolder(folder.id).map(request => (
                  <div
                    key={request.id}
                    className={`request-item ${activeRequest?.id === request.id ? 'active' : ''}`}
                    onClick={() => onRequestSelect(request)}
                  >
                    <span 
                      className="method-badge"
                      style={{ backgroundColor: getMethodColor(request.method) }}
                    >
                      {request.method}
                    </span>
                    <span className="request-name">{request.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRequest(request.id);
                      }}
                      className="btn btn-xs btn-danger request-delete"
                      title="Delete request"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Requests without folder */}
        {getRequestsWithoutFolder().length > 0 && (
          <div className="ungrouped-requests">
            <div className="section-header">Requests</div>
            {getRequestsWithoutFolder().map(request => (
              <div
                key={request.id}
                className={`request-item ${activeRequest?.id === request.id ? 'active' : ''}`}
                onClick={() => onRequestSelect(request)}
              >
                <span 
                  className="method-badge"
                  style={{ backgroundColor: getMethodColor(request.method) }}
                >
                  {request.method}
                </span>
                <span className="request-name">{request.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRequest(request.id);
                  }}
                  className="btn btn-xs btn-danger request-delete"
                  title="Delete request"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {requests.length === 0 && (
          <div className="empty-state">
            <p>No requests yet</p>
            <button onClick={onNewRequest} className="btn btn-primary">
              Create your first request
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;