import { useState } from 'react';
import { Snapshot, Environment } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Trash2, GitCompare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SnapshotHistoryProps {
  snapshots: Snapshot[];
  environments: Environment[];
  onSetBaseline: (id: string) => void;
  onDeleteSnapshot: (id: string) => void;
  onSelectForDiff: (snapshot: Snapshot) => void;
  selectedDiffId?: string;
}

const SnapshotHistory: React.FC<SnapshotHistoryProps> = ({
  snapshots, environments, onSetBaseline, onDeleteSnapshot, onSelectForDiff, selectedDiffId,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getEnv = (envId?: string) => environments.find(e => e.id === envId);
  const formatDate = (ts: number) => new Date(ts).toLocaleString();

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-emerald-500';
    if (status >= 300 && status < 400) return 'bg-amber-500';
    if (status >= 400 && status < 500) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <p className="text-sm text-muted-foreground">No snapshots yet. Send a request and save a snapshot to start tracking.</p>
      </div>
    );
  }

  const sorted = [...snapshots].sort((a, b) => {
    if (a.isBaseline && !b.isBaseline) return -1;
    if (!a.isBaseline && b.isBaseline) return 1;
    return b.timestamp - a.timestamp;
  });

  return (
    <div className="space-y-1 p-3">
      {sorted.map(snap => {
        const env = getEnv(snap.environmentId);
        const isExpanded = expandedId === snap.id;

        return (
          <div
            key={snap.id}
            className={cn(
              'rounded-lg border transition-colors',
              snap.isBaseline && 'border-blue-400/50 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/30',
              selectedDiffId === snap.id && 'border-orange-400/50 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/30',
              !snap.isBaseline && selectedDiffId !== snap.id && 'hover:bg-muted/50'
            )}
          >
            <div
              className="flex items-center justify-between px-3 py-2 cursor-pointer gap-2"
              onClick={() => setExpandedId(isExpanded ? null : snap.id)}
            >
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <button
                  className={cn('text-sm transition-colors', snap.isBaseline ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-400')}
                  onClick={(e) => { e.stopPropagation(); onSetBaseline(snap.id); }}
                  title={snap.isBaseline ? 'Current baseline' : 'Set as baseline'}
                >
                  <Star className={cn('h-4 w-4', snap.isBaseline && 'fill-current')} />
                </button>
                <Badge className={cn('text-[10px] px-1.5 py-0 text-white', getStatusColor(snap.response.status))}>
                  {snap.response.status}
                </Badge>
                {env && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1" style={{ borderColor: env.color, color: env.color }}>
                    {env.name}
                  </Badge>
                )}
                {snap.label && <span className="text-xs italic text-muted-foreground truncate">{snap.label}</span>}
                {snap.isBaseline && <Badge className="text-[10px] h-4 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50">Baseline</Badge>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-muted-foreground">{formatDate(snap.timestamp)}</span>
                <span className="text-[10px] text-muted-foreground/60 font-mono">{snap.response.responseTime}ms</span>
              </div>
            </div>

            {isExpanded && (
              <div className="flex gap-1.5 px-3 pb-2 border-t pt-2">
                <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => onSelectForDiff(snap)}>
                  <GitCompare className="h-3 w-3 mr-1" /> Compare
                </Button>
                {!snap.isBaseline && (
                  <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => onSetBaseline(snap.id)}>
                    <Star className="h-3 w-3 mr-1" /> Set Baseline
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-6 text-[11px] text-destructive hover:text-destructive" onClick={() => onDeleteSnapshot(snap.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SnapshotHistory;
