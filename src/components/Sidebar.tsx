import { useState } from 'react';
import { ApiRequest, Folder } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, FolderPlus, Trash2, ChevronRight, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500',
  POST: 'bg-blue-500',
  PUT: 'bg-amber-500',
  DELETE: 'bg-red-500',
  PATCH: 'bg-violet-500',
  HEAD: 'bg-gray-500',
  OPTIONS: 'bg-cyan-500',
};

const Sidebar: React.FC<SidebarProps> = ({
  requests,
  folders,
  activeRequest,
  onRequestSelect,
  onNewRequest,
  onDeleteRequest,
  onCreateFolder,
  onDeleteFolder,
  onMoveRequest: _onMoveRequest,
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
    const next = new Set(expandedFolders);
    if (next.has(folderId)) next.delete(folderId);
    else next.add(folderId);
    setExpandedFolders(next);
  };

  const getRequestsInFolder = (folderId: string) => requests.filter(req => req.folderId === folderId);
  const getRequestsWithoutFolder = () => requests.filter(req => !req.folderId);

  const RequestItem = ({ request }: { request: ApiRequest }) => (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors text-sm',
        activeRequest?.id === request.id
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
      )}
      onClick={() => onRequestSelect(request)}
    >
      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded text-white shrink-0 uppercase', METHOD_COLORS[request.method] || 'bg-gray-500')}>
        {request.method}
      </span>
      <span className="truncate flex-1 text-xs">{request.name}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onDeleteRequest(request.id); }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );

  return (
    <div className="w-72 bg-card border-r flex flex-col shrink-0">
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Collections</h3>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" className="flex-1 h-7 text-xs" onClick={onNewRequest}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Request
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setShowNewFolderInput(true)}>
            <FolderPlus className="h-3.5 w-3.5 mr-1" /> Folder
          </Button>
        </div>
      </div>

      {showNewFolderInput && (
        <div className="p-3 border-b flex items-center gap-1.5">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <Button size="icon" className="h-7 w-7 shrink-0" onClick={handleCreateFolder}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {folders.map(folder => (
            <div key={folder.id}>
              <div
                className="group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted transition-colors"
                onClick={() => toggleFolder(folder.id)}
              >
                {expandedFolders.has(folder.id) ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="text-xs font-medium flex-1 truncate">{folder.name}</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1">{getRequestsInFolder(folder.id).length}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {expandedFolders.has(folder.id) && (
                <div className="ml-4 space-y-0.5">
                  {getRequestsInFolder(folder.id).map(req => <RequestItem key={req.id} request={req} />)}
                </div>
              )}
            </div>
          ))}

          {getRequestsWithoutFolder().length > 0 && (
            <>
              {folders.length > 0 && <div className="px-2 pt-3 pb-1"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Requests</span></div>}
              {getRequestsWithoutFolder().map(req => <RequestItem key={req.id} request={req} />)}
            </>
          )}

          {requests.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="text-xs text-muted-foreground mb-3">No requests yet</p>
              <Button size="sm" onClick={onNewRequest}>Create your first request</Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Sidebar;
