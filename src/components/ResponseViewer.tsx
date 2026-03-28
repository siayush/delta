import React, { useState, useEffect, useMemo } from 'react';
import JsonView from '@uiw/react-json-view';
import { ApiResponse, Snapshot, Environment, ComparisonResult } from '../types';
import { computeDiff, diffSummary } from '../utils/jsonDiff';
import JsonDiffViewer from './JsonDiffViewer';
import SnapshotHistory from './SnapshotHistory';
import './ResponseViewer.css';

interface ResponseViewerProps {
  response: ApiResponse | null;
  snapshots: Snapshot[];
  baseline: Snapshot | undefined;
  environments: Environment[];
  onSaveSnapshot: (label?: string, setAsBaseline?: boolean) => void;
  onDeleteSnapshot: (id: string) => void;
  onSetBaseline: (id: string) => void;
}

const ResponseViewer: React.FC<ResponseViewerProps> = ({
  response,
  snapshots,
  baseline,
  environments,
  onSaveSnapshot,
  onDeleteSnapshot,
  onSetBaseline,
}) => {
  const [activeTab, setActiveTab] = useState<'response' | 'diff' | 'history'>('response');
  const [diffTarget, setDiffTarget] = useState<Snapshot | undefined>(undefined);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [saveAsBaseline, setSaveAsBaseline] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<'inline' | 'side-by-side'>('inline');

  // Default diff target is the baseline
  useEffect(() => {
    setDiffTarget(baseline);
  }, [baseline]);

  // Compute comparison
  const comparison: ComparisonResult | null = useMemo(() => {
    if (!response || !diffTarget) return null;

    const snapshotData = diffTarget.response;
    const statusChanged = snapshotData.status !== response.status;
    const headersDiff = computeDiff(snapshotData.headers, response.headers);
    const bodyDiff = computeDiff(snapshotData.data, response.data);
    const allDiffs = [...headersDiff, ...bodyDiff];
    const isMatch = !statusChanged && allDiffs.length === 0;

    return {
      isMatch,
      statusChanged,
      headersDiff,
      bodyDiff,
      summary: diffSummary(allDiffs),
    };
  }, [response, diffTarget]);

  // Auto-switch to diff tab on mismatch
  useEffect(() => {
    if (comparison && !comparison.isMatch && response) {
      setActiveTab('diff');
    }
  }, [comparison, response]);

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

  const handleSave = () => {
    onSaveSnapshot(saveLabel || undefined, saveAsBaseline);
    setShowSaveForm(false);
    setSaveLabel('');
    setSaveAsBaseline(false);
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
          {comparison && diffTarget && (
            <div className="comparison-result">
              {comparison.isMatch ? (
                <span className="match-indicator">Match</span>
              ) : (
                <span className="mismatch-indicator">
                  Mismatch ({comparison.summary.added} added, {comparison.summary.removed} removed, {comparison.summary.changed} changed)
                </span>
              )}
            </div>
          )}

          <div className="save-snapshot-controls">
            <button
              onClick={() => onSaveSnapshot(undefined, false)}
              className="btn btn-sm btn-success"
            >
              Save Snapshot
            </button>
            <button
              onClick={() => onSaveSnapshot(undefined, true)}
              className="btn btn-sm btn-primary"
              title="Save and mark as baseline for comparison"
            >
              Save as Baseline
            </button>
            {!showSaveForm ? (
              <button
                onClick={() => setShowSaveForm(true)}
                className="btn btn-sm btn-secondary"
                title="Save with a custom label"
              >
                + Label
              </button>
            ) : (
              <div className="save-snapshot-form">
                <input
                  type="text"
                  value={saveLabel}
                  onChange={e => setSaveLabel(e.target.value)}
                  placeholder="Label"
                  className="save-label-input"
                  autoFocus
                />
                <button onClick={handleSave} className="btn btn-sm btn-success">Save</button>
                <button onClick={() => setShowSaveForm(false)} className="btn btn-sm btn-secondary">x</button>
              </div>
            )}
          </div>
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
          <button
            className={`tab-header ${activeTab === 'diff' ? 'active' : ''}`}
            onClick={() => setActiveTab('diff')}
          >
            Diff
            {comparison && !comparison.isMatch && (
              <span className="diff-badge">!</span>
            )}
          </button>
          <button
            className={`tab-header ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History ({snapshots.length})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'response' && (
            <div className="response-content">
              <div className="response-body">
                <h4>Response Body</h4>
                {typeof response.data === 'object' && response.data !== null ? (
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
                ) : (
                  <pre className="raw-response">{String(response.data)}</pre>
                )}
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

          {activeTab === 'diff' && (
            <div className="diff-tab-content">
              {snapshots.length > 0 && (
                <div className="diff-target-selector">
                  <label>Compare against:</label>
                  <select
                    value={diffTarget?.id || ''}
                    onChange={e => {
                      const snap = snapshots.find(s => s.id === e.target.value);
                      setDiffTarget(snap);
                    }}
                  >
                    <option value="">Select a snapshot</option>
                    {snapshots.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.isBaseline ? '[Baseline] ' : ''}
                        {s.label || new Date(s.timestamp).toLocaleString()}
                        {' - '}
                        {s.response.status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="diff-view-mode-toggle">
                <button
                  className={`diff-view-btn ${diffViewMode === 'inline' ? 'active' : ''}`}
                  onClick={() => setDiffViewMode('inline')}
                >
                  Inline
                </button>
                <button
                  className={`diff-view-btn ${diffViewMode === 'side-by-side' ? 'active' : ''}`}
                  onClick={() => setDiffViewMode('side-by-side')}
                >
                  Side by Side
                </button>
              </div>

              {comparison && diffTarget ? (
                comparison.isMatch ? (
                  <div className="diff-match-message">
                    <p>Responses are identical.</p>
                  </div>
                ) : (
                  <div className="diff-sections">
                    {comparison.statusChanged && (
                      <div className="diff-section">
                        <h4>Status Code</h4>
                        <div className="status-diff">
                          <span className="status-old" style={{ backgroundColor: getStatusColor(diffTarget.response.status) }}>
                            {diffTarget.response.status} {diffTarget.response.statusText}
                          </span>
                          <span className="status-arrow">&rarr;</span>
                          <span className="status-new" style={{ backgroundColor: getStatusColor(response.status) }}>
                            {response.status} {response.statusText}
                          </span>
                        </div>
                      </div>
                    )}

                    {comparison.headersDiff.length > 0 && (
                      <JsonDiffViewer
                        nodes={comparison.headersDiff}
                        title="Headers"
                        oldData={diffTarget.response.headers}
                        newData={response.headers}
                        viewMode={diffViewMode}
                      />
                    )}

                    {comparison.bodyDiff.length > 0 && (
                      <JsonDiffViewer
                        nodes={comparison.bodyDiff}
                        title="Response Body"
                        oldData={diffTarget.response.data}
                        newData={response.data}
                        viewMode={diffViewMode}
                      />
                    )}
                  </div>
                )
              ) : (
                <div className="diff-no-target">
                  <p>
                    {snapshots.length === 0
                      ? 'No snapshots to compare against. Save a snapshot first.'
                      : 'Select a snapshot above to compare.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <SnapshotHistory
              snapshots={snapshots}
              environments={environments}
              onSetBaseline={onSetBaseline}
              onDeleteSnapshot={onDeleteSnapshot}
              onSelectForDiff={(snap) => {
                setDiffTarget(snap);
                setActiveTab('diff');
              }}
              selectedDiffId={diffTarget?.id}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponseViewer;
