import React, { useState } from 'react';
import { Snapshot, Environment } from '../types';
import './SnapshotHistory.css';

interface SnapshotHistoryProps {
  snapshots: Snapshot[];
  environments: Environment[];
  onSetBaseline: (id: string) => void;
  onDeleteSnapshot: (id: string) => void;
  onSelectForDiff: (snapshot: Snapshot) => void;
  selectedDiffId?: string;
}

const SnapshotHistory: React.FC<SnapshotHistoryProps> = ({
  snapshots,
  environments,
  onSetBaseline,
  onDeleteSnapshot,
  onSelectForDiff,
  selectedDiffId,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getEnv = (envId?: string) => environments.find(e => e.id === envId);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString();
  };

  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return '#28a745';
    if (status >= 300 && status < 400) return '#ffc107';
    if (status >= 400 && status < 500) return '#fd7e14';
    if (status >= 500) return '#dc3545';
    return '#6c757d';
  };

  if (snapshots.length === 0) {
    return (
      <div className="snapshot-history-empty">
        <p>No snapshots saved yet. Send a request and save a snapshot to start tracking changes.</p>
      </div>
    );
  }

  // Baseline first, then by timestamp desc
  const sorted = [...snapshots].sort((a, b) => {
    if (a.isBaseline && !b.isBaseline) return -1;
    if (!a.isBaseline && b.isBaseline) return 1;
    return b.timestamp - a.timestamp;
  });

  return (
    <div className="snapshot-history">
      {sorted.map(snap => {
        const env = getEnv(snap.environmentId);
        const isExpanded = expandedId === snap.id;

        return (
          <div
            key={snap.id}
            className={`snapshot-item ${snap.isBaseline ? 'is-baseline' : ''} ${selectedDiffId === snap.id ? 'selected-for-diff' : ''}`}
          >
            <div className="snapshot-item-header" onClick={() => setExpandedId(isExpanded ? null : snap.id)}>
              <div className="snapshot-item-left">
                <button
                  className={`baseline-star ${snap.isBaseline ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onSetBaseline(snap.id); }}
                  title={snap.isBaseline ? 'Current baseline' : 'Set as baseline'}
                >
                  {snap.isBaseline ? '\u2605' : '\u2606'}
                </button>
                <span
                  className="snapshot-status"
                  style={{ backgroundColor: getStatusColor(snap.response.status) }}
                >
                  {snap.response.status}
                </span>
                {env && (
                  <span className="snapshot-env" style={{ borderColor: env.color, color: env.color }}>
                    {env.name}
                  </span>
                )}
                {snap.label && <span className="snapshot-label">{snap.label}</span>}
              </div>
              <div className="snapshot-item-right">
                <span className="snapshot-time">{formatDate(snap.timestamp)}</span>
                <span className="snapshot-response-time">{snap.response.responseTime}ms</span>
              </div>
            </div>

            {isExpanded && (
              <div className="snapshot-item-actions">
                <button
                  className="btn btn-xs btn-primary"
                  onClick={() => onSelectForDiff(snap)}
                >
                  {selectedDiffId === snap.id ? 'Selected for Diff' : 'Compare'}
                </button>
                {!snap.isBaseline && (
                  <button
                    className="btn btn-xs btn-secondary"
                    onClick={() => onSetBaseline(snap.id)}
                  >
                    Set as Baseline
                  </button>
                )}
                <button
                  className="btn btn-xs btn-danger"
                  onClick={() => onDeleteSnapshot(snap.id)}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SnapshotHistory;
