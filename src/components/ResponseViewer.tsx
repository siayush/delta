import React, { useState, useEffect } from 'react';
import JsonView from '@uiw/react-json-view';
import { ApiResponse, Snapshot, ComparisonResult } from '../types';
import './ResponseViewer.css';

interface ResponseViewerProps {
  response: ApiResponse | null;
  snapshot: Snapshot | undefined;
  onSaveSnapshot: () => void;
  onClearSnapshot: () => void;
}

const ResponseViewer: React.FC<ResponseViewerProps> = ({
  response,
  snapshot,
  onSaveSnapshot,
  onClearSnapshot
}) => {
  const [activeTab, setActiveTab] = useState<'response' | 'diff'>('response');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    if (response && snapshot) {
      const result = compareResponses(snapshot.response.data, response.data);
      setComparisonResult(result);
      
      // Switch to diff tab if there's a mismatch
      if (!result.isMatch) {
        setActiveTab('diff');
      }
    } else {
      setComparisonResult(null);
      setActiveTab('response');
    }
  }, [response, snapshot]);

  const compareResponses = (snapshotData: any, currentData: any): ComparisonResult => {
    const snapshotStr = JSON.stringify(snapshotData, null, 2);
    const currentStr = JSON.stringify(currentData, null, 2);
    
    const isMatch = snapshotStr === currentStr;
    
    if (!isMatch) {
      const diff = generateDiff(snapshotStr, currentStr);
      return { isMatch: false, diff };
    }
    
    return { isMatch: true };
  };

  const generateDiff = (original: string, modified: string): string => {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    let diffHtml = '<div class="diff-container">';
    diffHtml += '<div class="diff-side"><h4>Snapshot (Expected)</h4><pre>';
    
    // Simple line-by-line comparison
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const modifiedLine = modifiedLines[i] || '';
      
      if (originalLine !== modifiedLine) {
        if (originalLine && !modifiedLine) {
          diffHtml += `<div class="diff-removed">${escapeHtml(originalLine)}</div>`;
        } else if (!originalLine && modifiedLine) {
          // This will be shown in the modified side
        } else {
          diffHtml += `<div class="diff-removed">${escapeHtml(originalLine)}</div>`;
        }
      } else {
        diffHtml += `<div class="diff-unchanged">${escapeHtml(originalLine)}</div>`;
      }
    }
    
    diffHtml += '</pre></div>';
    diffHtml += '<div class="diff-side"><h4>Current Response</h4><pre>';
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const modifiedLine = modifiedLines[i] || '';
      
      if (originalLine !== modifiedLine) {
        if (!originalLine && modifiedLine) {
          diffHtml += `<div class="diff-added">${escapeHtml(modifiedLine)}</div>`;
        } else if (originalLine && !modifiedLine) {
          // This was shown in the original side
        } else {
          diffHtml += `<div class="diff-added">${escapeHtml(modifiedLine)}</div>`;
        }
      } else {
        diffHtml += `<div class="diff-unchanged">${escapeHtml(modifiedLine)}</div>`;
      }
    }
    
    diffHtml += '</pre></div></div>';
    return diffHtml;
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return '#28a745';
    if (status >= 300 && status < 400) return '#ffc107';
    if (status >= 400 && status < 500) return '#fd7e14';
    if (status >= 500) return '#dc3545';
    return '#6c757d';
  };

  const formatResponseTime = (time: number): string => {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  if (!response) {
    return (
      <div className="response-viewer">
        <div className="response-placeholder">
          <h3>No Response</h3>
          <p>Send a request to see the response here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="response-viewer">
      <div className="response-header">
        <div className="response-status">
          <span 
            className="status-badge"
            style={{ backgroundColor: getStatusColor(response.status) }}
          >
            {response.status} {response.statusText}
          </span>
          <span className="response-time">
            {formatResponseTime(response.responseTime)}
          </span>
        </div>

        <div className="snapshot-controls">
          {snapshot && comparisonResult && (
            <div className="comparison-result">
              {comparisonResult.isMatch ? (
                <span className="match-indicator">✅ Match</span>
              ) : (
                <span className="mismatch-indicator">❌ Mismatch Detected</span>
              )}
            </div>
          )}

          {snapshot ? (
            <div className="snapshot-actions">
              <span className="snapshot-info">
                Snapshot saved {new Date(snapshot.timestamp).toLocaleString()}
              </span>
              <button onClick={onClearSnapshot} className="btn btn-sm btn-danger">
                Clear Snapshot
              </button>
            </div>
          ) : (
            <button 
              onClick={onSaveSnapshot} 
              className="btn btn-sm btn-success"
              disabled={response.status < 200 || response.status >= 300}
            >
              Set as Snapshot
            </button>
          )}
        </div>
      </div>

      <div className="response-tabs">
        <div className="tab-headers">
          <button
            className={`tab-header ${activeTab === 'response' ? 'active' : ''}`}
            onClick={() => setActiveTab('response')}
          >
            Response
          </button>
          {comparisonResult && !comparisonResult.isMatch && (
            <button
              className={`tab-header ${activeTab === 'diff' ? 'active' : ''}`}
              onClick={() => setActiveTab('diff')}
            >
              Diff
            </button>
          )}
        </div>

        <div className="tab-content">
          {activeTab === 'response' && (
            <div className="response-content">
              <div className="response-body">
                <h4>Response Body</h4>
                <div className="json-viewer">
                  <JsonView 
                    value={response.data} 
                    style={{
                      backgroundColor: '#f8f9fa',
                      padding: '16px',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div className="response-headers">
                <h4>Response Headers</h4>
                <div className="headers-list">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="header-item">
                      <span className="header-key">{key}:</span>
                      <span className="header-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'diff' && comparisonResult && comparisonResult.diff && (
            <div className="diff-viewer">
              <div 
                dangerouslySetInnerHTML={{ __html: comparisonResult.diff }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponseViewer;