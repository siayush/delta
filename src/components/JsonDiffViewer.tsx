import React, { useState, useMemo } from 'react';
import { JsonDiffNode } from '../types';
import './JsonDiffViewer.css';

interface JsonDiffViewerProps {
  nodes: JsonDiffNode[];
  title?: string;
  oldData?: any;
  newData?: any;
  viewMode?: 'inline' | 'side-by-side';
}

type FilterType = 'all' | 'added' | 'removed' | 'changed';

const JsonDiffViewer: React.FC<JsonDiffViewerProps> = ({ nodes, title, oldData, newData, viewMode = 'inline' }) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filtered = filter === 'all' ? nodes : nodes.filter(n => n.type === filter);

  // Build annotated lines for side-by-side view
  const sideBySideLines = useMemo(() => {
    if (!oldData && !newData) return { oldLines: [], newLines: [] };

    const oldStr = typeof oldData === 'string' ? oldData : JSON.stringify(oldData, null, 2) || '';
    const newStr = typeof newData === 'string' ? newData : JSON.stringify(newData, null, 2) || '';
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');

    // Build a set of changed paths for quick lookup
    const changedPaths = new Set(nodes.map(n => n.path));

    // Simple line-by-line annotation
    const maxLen = Math.max(oldLines.length, newLines.length);
    const annotatedOld: Array<{ text: string; type: 'unchanged' | 'removed' | 'changed' }> = [];
    const annotatedNew: Array<{ text: string; type: 'unchanged' | 'added' | 'changed' }> = [];

    for (let i = 0; i < maxLen; i++) {
      const ol = i < oldLines.length ? oldLines[i] : '';
      const nl = i < newLines.length ? newLines[i] : '';

      if (i >= oldLines.length) {
        annotatedOld.push({ text: '', type: 'unchanged' });
        annotatedNew.push({ text: nl, type: 'added' });
      } else if (i >= newLines.length) {
        annotatedOld.push({ text: ol, type: 'removed' });
        annotatedNew.push({ text: '', type: 'unchanged' });
      } else if (ol !== nl) {
        annotatedOld.push({ text: ol, type: 'changed' });
        annotatedNew.push({ text: nl, type: 'changed' });
      } else {
        annotatedOld.push({ text: ol, type: 'unchanged' });
        annotatedNew.push({ text: nl, type: 'unchanged' });
      }
    }

    return { oldLines: annotatedOld, newLines: annotatedNew };
  }, [oldData, newData, nodes]);

  const toggleCollapse = (path: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const formatValue = (val: any): string => {
    if (val === undefined) return 'undefined';
    if (val === null) return 'null';
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  const isComplex = (val: any): boolean => {
    return val !== null && typeof val === 'object';
  };

  if (nodes.length === 0) {
    return null;
  }

  const renderInlineView = () => (
    <div className="json-diff-nodes">
      {filtered.map((node, idx) => (
        <div key={`${node.path}-${idx}`} className={`diff-node diff-node-${node.type}`}>
          <div className="diff-node-header" onClick={() => toggleCollapse(node.path)}>
            <span className={`diff-type-badge badge-${node.type}`}>
              {node.type === 'added' ? '+' : node.type === 'removed' ? '-' : '~'}
            </span>
            <span className="diff-path">{node.path}</span>
            {(isComplex(node.oldValue) || isComplex(node.newValue)) && (
              <span className="diff-collapse-icon">
                {collapsed.has(node.path) ? '...' : ''}
              </span>
            )}
          </div>
          {!collapsed.has(node.path) && (
            <div className="diff-node-body">
              {node.type === 'changed' && (
                <>
                  <div className="diff-value diff-old-value">
                    <span className="diff-value-label">-</span>
                    <pre>{formatValue(node.oldValue)}</pre>
                  </div>
                  <div className="diff-value diff-new-value">
                    <span className="diff-value-label">+</span>
                    <pre>{formatValue(node.newValue)}</pre>
                  </div>
                </>
              )}
              {node.type === 'added' && (
                <div className="diff-value diff-new-value">
                  <span className="diff-value-label">+</span>
                  <pre>{formatValue(node.newValue)}</pre>
                </div>
              )}
              {node.type === 'removed' && (
                <div className="diff-value diff-old-value">
                  <span className="diff-value-label">-</span>
                  <pre>{formatValue(node.oldValue)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderSideBySideView = () => {
    const { oldLines, newLines } = sideBySideLines;
    const maxLen = Math.max(oldLines.length, newLines.length);

    return (
      <div className="diff-side-by-side">
        <div className="diff-sbs-header">
          <div className="diff-sbs-col-header diff-sbs-col-old">Snapshot (Expected)</div>
          <div className="diff-sbs-col-header diff-sbs-col-new">Current Response</div>
        </div>
        <div className="diff-sbs-body">
          {Array.from({ length: maxLen }).map((_, i) => {
            const ol = oldLines[i] || { text: '', type: 'unchanged' as const };
            const nl = newLines[i] || { text: '', type: 'unchanged' as const };
            return (
              <div key={i} className="diff-sbs-line">
                <div className="diff-sbs-num">{i < oldLines.length ? i + 1 : ''}</div>
                <div className={`diff-sbs-cell diff-sbs-cell-old sbs-${ol.type}`}>
                  <pre>{ol.text}</pre>
                </div>
                <div className="diff-sbs-num">{i < newLines.length ? i + 1 : ''}</div>
                <div className={`diff-sbs-cell diff-sbs-cell-new sbs-${nl.type}`}>
                  <pre>{nl.text}</pre>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="json-diff-viewer">
      {title && <h4 className="json-diff-title">{title}</h4>}
      <div className="json-diff-toolbar">
        <div className="json-diff-filters">
          <button
            className={`diff-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({nodes.length})
          </button>
          <button
            className={`diff-filter-btn filter-added ${filter === 'added' ? 'active' : ''}`}
            onClick={() => setFilter('added')}
          >
            Added ({nodes.filter(n => n.type === 'added').length})
          </button>
          <button
            className={`diff-filter-btn filter-removed ${filter === 'removed' ? 'active' : ''}`}
            onClick={() => setFilter('removed')}
          >
            Removed ({nodes.filter(n => n.type === 'removed').length})
          </button>
          <button
            className={`diff-filter-btn filter-changed ${filter === 'changed' ? 'active' : ''}`}
            onClick={() => setFilter('changed')}
          >
            Changed ({nodes.filter(n => n.type === 'changed').length})
          </button>
        </div>
      </div>

      {viewMode === 'inline' ? renderInlineView() : renderSideBySideView()}
    </div>
  );
};

export default JsonDiffViewer;
