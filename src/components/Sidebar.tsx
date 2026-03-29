import { useState } from 'react';
import { ApiRequest, Folder } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, FolderPlus, Trash2, ChevronRight, ChevronDown, Check, X, FolderOpen } from 'lucide-react';
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

const METHOD_TEXT_COLORS: Record<string, string> = {
  GET: 'text-emerald-600 dark:text-emerald-400',
  POST: 'text-blue-600 dark:text-blue-400',
  PUT: 'text-amber-600 dark:text-amber-400',
  DELETE: 'text-red-600 dark:text-red-400',
  PATCH: 'text-violet-600 dark:text-violet-400',
  HEAD: 'text-gray-500 dark:text-gray-400',
  OPTIONS: 'text-cyan-600 dark:text-cyan-400',
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
        'group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all text-sm',
        activeRequest?.id === request.id
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
      )}
      onClick={() => onRequestSelect(request)}
    >
      <span className={cn('text-[10px] font-bold shrink-0 uppercase font-mono w-8', METHOD_TEXT_COLORS[request.method] || 'text-gray-400')}>
        {request.method}
      </span>
      <span className="truncate flex-1 text-[13px]">{request.name}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0 text-sidebar-foreground/40 hover:text-red-400 hover:bg-transparent"
        onClick={(e) => { e.stopPropagation(); onDeleteRequest(request.id); }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground border-r border-border flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Collections</h3>
        <div className="flex gap-1.5">
          <Button size="sm" className="flex-1 h-7 text-xs bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground" onClick={onNewRequest}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Request
          </Button>
          <Button size="sm" className="flex-1 h-7 text-xs bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground border-0" onClick={() => setShowNewFolderInput(true)}>
            <FolderPlus className="h-3.5 w-3.5 mr-1" /> Folder
          </Button>
        </div>
      </div>

      {showNewFolderInput && (
        <div className="px-3 pb-3 flex items-center gap-1.5">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="h-7 text-xs bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <Button size="icon" className="h-7 w-7 shrink-0 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground" onClick={handleCreateFolder}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" className="h-7 w-7 shrink-0 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground border-0" onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="mx-4 border-t border-sidebar-border" />

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {folders.map(folder => {
            const isExpanded = expandedFolders.has(folder.id);
            const folderRequests = getRequestsInFolder(folder.id);
            return (
              <div key={folder.id}>
                <div
                  className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-sidebar-accent/50 transition-colors"
                  onClick={() => toggleFolder(folder.id)}
                >
                  {isExpanded
                    ? <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/50 shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/50 shrink-0" />
                  }
                  <FolderOpen className="h-3.5 w-3.5 text-sidebar-foreground/50 shrink-0" />
                  <span className="text-[13px] font-medium flex-1 truncate text-sidebar-foreground/90">{folder.name}</span>
                  <span className="text-[10px] text-sidebar-foreground/40 tabular-nums">{folderRequests.length}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 text-sidebar-foreground/40 hover:text-red-400 hover:bg-transparent"
                    onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {isExpanded && (
                  <div className="ml-5 space-y-0.5 mt-0.5">
                    {folderRequests.map(req => <RequestItem key={req.id} request={req} />)}
                    {folderRequests.length === 0 && (
                      <p className="text-[11px] text-sidebar-foreground/30 px-2.5 py-2 italic">No requests</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {getRequestsWithoutFolder().length > 0 && (
            <>
              {folders.length > 0 && (
                <div className="px-2.5 pt-4 pb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">Requests</span>
                </div>
              )}
              {getRequestsWithoutFolder().map(req => <RequestItem key={req.id} request={req} />)}
            </>
          )}

          {requests.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center px-4">
              <p className="text-xs text-sidebar-foreground/40 mb-3">No requests yet</p>
              <Button size="sm" className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground" onClick={onNewRequest}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Create your first request
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Sidebar;
