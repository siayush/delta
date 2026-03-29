import { useState, useEffect, useMemo } from 'react';
import JsonView from '@uiw/react-json-view';
import { vscodeTheme } from '@uiw/react-json-view/vscode';
import { githubLightTheme } from '@uiw/react-json-view/githubLight';
import { ApiResponse, Snapshot, Environment, ComparisonResult } from '../types';
import { computeDiff, diffSummary } from '../utils/jsonDiff';
import JsonDiffViewer from './JsonDiffViewer';
import SnapshotHistory from './SnapshotHistory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Bookmark, Tag, CheckCircle2, AlertTriangle, ArrowRight, Columns, AlignJustify } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  response, snapshots, baseline, environments,
  onSaveSnapshot, onDeleteSnapshot, onSetBaseline,
}) => {
  const [activeTab, setActiveTab] = useState('response');
  const [diffTarget, setDiffTarget] = useState<Snapshot | undefined>(undefined);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [saveAsBaseline, setSaveAsBaseline] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<'inline' | 'side-by-side'>('inline');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => { setDiffTarget(baseline); }, [baseline]);

  const comparison: ComparisonResult | null = useMemo(() => {
    if (!response || !diffTarget) return null;
    const snap = diffTarget.response;
    const statusChanged = snap.status !== response.status;
    const headersDiff = computeDiff(snap.headers, response.headers);
    const bodyDiff = computeDiff(snap.data, response.data);
    const all = [...headersDiff, ...bodyDiff];
    return { isMatch: !statusChanged && all.length === 0, statusChanged, headersDiff, bodyDiff, summary: diffSummary(all) };
  }, [response, diffTarget]);

  useEffect(() => {
    if (comparison && !comparison.isMatch && response) setActiveTab('diff');
  }, [comparison, response]);

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-emerald-500';
    if (status >= 300 && status < 400) return 'bg-amber-500';
    if (status >= 400 && status < 500) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatTime = (t: number) => t < 1000 ? `${t}ms` : `${(t / 1000).toFixed(2)}s`;

  const handleSave = () => {
    onSaveSnapshot(saveLabel || undefined, saveAsBaseline);
    setShowSaveForm(false);
    setSaveLabel('');
    setSaveAsBaseline(false);
  };

  if (!response) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <p className="text-sm">Send a request to see the response</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge className={cn('text-xs font-bold text-white', getStatusColor(response.status))}>
            {response.status} {response.statusText}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">{formatTime(response.responseTime)}</span>
          {comparison && diffTarget && (
            comparison.isMatch ? (
              <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-[11px] gap-1">
                <CheckCircle2 className="h-3 w-3" /> Match
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 text-[11px] gap-1">
                <AlertTriangle className="h-3 w-3" /> {comparison.summary.added}+ {comparison.summary.removed}- {comparison.summary.changed}~
              </Badge>
            )
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onSaveSnapshot(undefined, false)}>
            <Save className="h-3 w-3 mr-1" /> Save
          </Button>
          <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onSaveSnapshot(undefined, true)}>
            <Bookmark className="h-3 w-3 mr-1" /> Baseline
          </Button>
          {!showSaveForm ? (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowSaveForm(true)}>
              <Tag className="h-3 w-3 mr-1" /> Label
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Input value={saveLabel} onChange={e => setSaveLabel(e.target.value)} placeholder="Label" className="h-7 w-28 text-xs" autoFocus />
              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave}>Save</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowSaveForm(false)}>x</Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList variant="line" className="h-9 p-0 rounded-none border-b w-full justify-start px-4 shrink-0">
          <TabsTrigger value="response" className="text-xs px-3 h-9 rounded-none">Response</TabsTrigger>
          <TabsTrigger value="diff" className="text-xs px-3 h-9 rounded-none">
            Diff
            {comparison && !comparison.isMatch && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs px-3 h-9 rounded-none">
            History <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-[10px] px-1 rounded-full">{snapshots.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="response" className="m-0 p-4 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Response Body</h4>
              {typeof response.data === 'object' && response.data !== null ? (
                <div className="border rounded-lg overflow-hidden">
                  <JsonView
                    value={response.data}
                    style={{ ...(isDark ? vscodeTheme : githubLightTheme), padding: '12px', borderRadius: '0', fontSize: '13px' }}
                  />
                </div>
              ) : (
                <pre className="bg-muted text-foreground rounded-lg p-3 text-xs font-mono overflow-auto max-h-[400px] whitespace-pre-wrap break-words">{String(response.data)}</pre>
              )}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Response Headers</h4>
              <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                {Object.entries(response.headers).map(([key, value]) => (
                  <div key={key} className="flex px-3 py-1.5 text-xs">
                    <span className="font-semibold text-foreground min-w-[140px] shrink-0">{key}</span>
                    <span className="text-muted-foreground break-all">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="diff" className="m-0 p-4 space-y-3">
            <div className="flex items-center gap-3">
              {snapshots.length > 0 && (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">Compare against:</span>
                  <Select value={diffTarget?.id || 'none'} onValueChange={v => setDiffTarget(v === 'none' ? undefined : snapshots.find(s => s.id === v))}>
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue placeholder="Select snapshot" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} side="bottom" sideOffset={4}>
                      <SelectItem value="None" className="text-xs py-1.5 text-muted-foreground">
                        none
                      </SelectItem>
                      {snapshots.map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs py-1.5">
                          <span className="flex items-center gap-2">
                            {s.isBaseline && <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0 border-blue-400 text-blue-500">Baseline</Badge>}
                            <Badge className={cn('text-[10px] h-4 px-1.5 shrink-0 text-white', s.response.status >= 200 && s.response.status < 300 ? 'bg-emerald-500' : s.response.status >= 400 ? 'bg-red-500' : 'bg-amber-500')}>
                              {s.response.status}
                            </Badge>
                            <span className="truncate">{s.label || new Date(s.timestamp).toLocaleString()}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex border rounded-md overflow-hidden shrink-0">
                <button className={cn('px-2.5 py-1 text-[11px] font-medium transition-colors', diffViewMode === 'inline' ? 'bg-foreground text-background' : 'hover:bg-muted text-muted-foreground')} onClick={() => setDiffViewMode('inline')}>
                  <AlignJustify className="h-3.5 w-3.5" />
                </button>
                <button className={cn('px-2.5 py-1 text-[11px] font-medium transition-colors border-l', diffViewMode === 'side-by-side' ? 'bg-foreground text-background' : 'hover:bg-muted text-muted-foreground')} onClick={() => setDiffViewMode('side-by-side')}>
                  <Columns className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {comparison && diffTarget ? (
              comparison.isMatch ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                  <p className="text-sm text-muted-foreground">Responses are identical</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comparison.statusChanged && (
                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                      <span className="text-xs font-semibold text-muted-foreground">Status:</span>
                      <Badge className={cn('text-white text-[11px]', getStatusColor(diffTarget.response.status))}>{diffTarget.response.status}</Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge className={cn('text-white text-[11px]', getStatusColor(response.status))}>{response.status}</Badge>
                    </div>
                  )}
                  {comparison.headersDiff.length > 0 && (
                    <JsonDiffViewer nodes={comparison.headersDiff} title="Headers" oldData={diffTarget.response.headers} newData={response.headers} viewMode={diffViewMode} />
                  )}
                  {comparison.bodyDiff.length > 0 && (
                    <JsonDiffViewer nodes={comparison.bodyDiff} title="Response Body" oldData={diffTarget.response.data} newData={response.data} viewMode={diffViewMode} />
                  )}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <p className="text-sm text-muted-foreground">{snapshots.length === 0 ? 'Save a snapshot first to compare.' : 'Select a snapshot to compare.'}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="m-0">
            <SnapshotHistory
              snapshots={snapshots}
              environments={environments}
              onSetBaseline={onSetBaseline}
              onDeleteSnapshot={onDeleteSnapshot}
              onSelectForDiff={(snap) => { setDiffTarget(snap); setActiveTab('diff'); }}
              selectedDiffId={diffTarget?.id}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ResponseViewer;
