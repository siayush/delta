import { useState, useMemo } from 'react';
import { JsonDiffNode } from '../types';
import { cn } from '@/lib/utils';

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

  const sideBySideLines = useMemo(() => {
    if (!oldData && !newData) return { oldLines: [] as any[], newLines: [] as any[] };
    const oldStr = typeof oldData === 'string' ? oldData : JSON.stringify(oldData, null, 2) || '';
    const newStr = typeof newData === 'string' ? newData : JSON.stringify(newData, null, 2) || '';
    const oldL = oldStr.split('\n');
    const newL = newStr.split('\n');
    const maxLen = Math.max(oldL.length, newL.length);
    const aOld: Array<{ text: string; type: string }> = [];
    const aNew: Array<{ text: string; type: string }> = [];
    for (let i = 0; i < maxLen; i++) {
      const ol = i < oldL.length ? oldL[i] : '';
      const nl = i < newL.length ? newL[i] : '';
      if (i >= oldL.length) { aOld.push({ text: '', type: 'unchanged' }); aNew.push({ text: nl, type: 'added' }); }
      else if (i >= newL.length) { aOld.push({ text: ol, type: 'removed' }); aNew.push({ text: '', type: 'unchanged' }); }
      else if (ol !== nl) { aOld.push({ text: ol, type: 'changed' }); aNew.push({ text: nl, type: 'changed' }); }
      else { aOld.push({ text: ol, type: 'unchanged' }); aNew.push({ text: nl, type: 'unchanged' }); }
    }
    return { oldLines: aOld, newLines: aNew };
  }, [oldData, newData]);

  const toggleCollapse = (path: string) => {
    setCollapsed(prev => { const n = new Set(prev); if (n.has(path)) n.delete(path); else n.add(path); return n; });
  };

  const formatValue = (val: any): string => {
    if (val === undefined) return 'undefined';
    if (val === null) return 'null';
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  if (nodes.length === 0) return null;

  const counts = { added: nodes.filter(n => n.type === 'added').length, removed: nodes.filter(n => n.type === 'removed').length, changed: nodes.filter(n => n.type === 'changed').length };

  const renderInline = () => (
    <div className="max-h-[500px] overflow-y-auto">
      {filtered.map((node, idx) => (
        <div key={`${node.path}-${idx}`} className="border-b border-border/50 last:border-0">
          <div className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleCollapse(node.path)}>
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded text-white', node.type === 'added' ? 'bg-emerald-500' : node.type === 'removed' ? 'bg-red-500' : 'bg-amber-500')}>
              {node.type === 'added' ? '+' : node.type === 'removed' ? '-' : '~'}
            </span>
            <span className="font-mono text-xs text-foreground">{node.path}</span>
          </div>
          {!collapsed.has(node.path) && (
            <div className="pl-9 pr-3 pb-2 space-y-1">
              {(node.type === 'changed' || node.type === 'removed') && (
                <div className="flex gap-2 bg-red-50 dark:bg-red-950/40 rounded px-2 py-1">
                  <span className="text-red-500 dark:text-red-400 font-mono text-xs font-bold shrink-0">-</span>
                  <pre className="text-xs font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap break-all m-0">{formatValue(node.oldValue)}</pre>
                </div>
              )}
              {(node.type === 'changed' || node.type === 'added') && (
                <div className="flex gap-2 bg-emerald-50 dark:bg-emerald-950/40 rounded px-2 py-1">
                  <span className="text-emerald-500 dark:text-emerald-400 font-mono text-xs font-bold shrink-0">+</span>
                  <pre className="text-xs font-mono text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap break-all m-0">{formatValue(node.newValue)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderSideBySide = () => {
    const { oldLines, newLines } = sideBySideLines;
    const maxLen = Math.max(oldLines.length, newLines.length);
    return (
      <div className="max-h-[500px] overflow-auto">
        <div className="flex sticky top-0 z-10 border-b-2 border-border">
          <div className="flex-1 px-3 py-1.5 text-[11px] font-bold bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-r-2 border-border pl-10">Snapshot (Expected)</div>
          <div className="flex-1 px-3 py-1.5 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 pl-10">Current Response</div>
        </div>
        <div className="font-mono text-xs leading-6">
          {Array.from({ length: maxLen }).map((_, i) => {
            const ol = oldLines[i] || { text: '', type: 'unchanged' };
            const nl = newLines[i] || { text: '', type: 'unchanged' };
            return (
              <div key={i} className="flex">
                <span className="w-8 shrink-0 text-right pr-2 text-muted-foreground/50 text-[10px] leading-6 bg-muted/30 select-none border-r">{i < oldLines.length ? i + 1 : ''}</span>
                <div className={cn('flex-1 px-2 border-r-2 border-border text-foreground',
                  ol.type === 'removed' ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' :
                  ol.type === 'changed' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300' : '')}>
                  <pre className="m-0 whitespace-pre">{ol.text}</pre>
                </div>
                <span className="w-8 shrink-0 text-right pr-2 text-muted-foreground/50 text-[10px] leading-6 bg-muted/30 select-none border-r">{i < newLines.length ? i + 1 : ''}</span>
                <div className={cn('flex-1 px-2 text-foreground',
                  nl.type === 'added' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' :
                  nl.type === 'changed' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300' : '')}>
                  <pre className="m-0 whitespace-pre">{nl.text}</pre>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {title && <div className="px-3 py-2 bg-muted/50 border-b text-xs font-semibold text-muted-foreground">{title}</div>}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 border-b">
        {(['all', 'added', 'removed', 'changed'] as FilterType[]).map(f => (
          <button
            key={f}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-medium transition-colors border',
              filter === f
                ? f === 'added' ? 'bg-emerald-500 text-white border-emerald-500'
                  : f === 'removed' ? 'bg-red-500 text-white border-red-500'
                  : f === 'changed' ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            )}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? `All (${nodes.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f]})`}
          </button>
        ))}
      </div>

      {viewMode === 'inline' ? renderInline() : renderSideBySide()}
    </div>
  );
};

export default JsonDiffViewer;
