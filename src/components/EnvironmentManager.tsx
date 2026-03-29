import { useState } from 'react';
import { Environment } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Settings2, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnvironmentManagerProps {
  environments: Environment[];
  activeEnvironmentId: string | null;
  onSelectEnvironment: (id: string | null) => void;
  onCreateEnvironment: (env: Omit<Environment, 'id'>) => void;
  onUpdateEnvironment: (id: string, env: Partial<Environment>) => void;
  onDeleteEnvironment: (id: string) => void;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#f97316', '#14b8a6', '#ec4899'];

const EnvironmentManager: React.FC<EnvironmentManagerProps> = ({
  environments, activeEnvironmentId, onSelectEnvironment,
  onCreateEnvironment, onUpdateEnvironment, onDeleteEnvironment,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [form, setForm] = useState({ name: '', baseUrl: '', color: COLORS[0], variables: '' });

  const activeEnv = environments.find(e => e.id === activeEnvironmentId);

  const openCreate = () => {
    setEditingEnv(null);
    setForm({ name: '', baseUrl: '', color: COLORS[environments.length % COLORS.length], variables: '' });
    setShowModal(true);
  };

  const openEdit = (env: Environment) => {
    setEditingEnv(env);
    setForm({ name: env.name, baseUrl: env.baseUrl, color: env.color, variables: Object.entries(env.variables).map(([k, v]) => `${k}=${v}`).join('\n') });
    setShowModal(true);
  };

  const parseVariables = (text: string): Record<string, string> => {
    const vars: Record<string, string> = {};
    text.split('\n').forEach(line => {
      const idx = line.indexOf('=');
      if (idx > 0) { const k = line.substring(0, idx).trim(); const v = line.substring(idx + 1).trim(); if (k) vars[k] = v; }
    });
    return vars;
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.baseUrl.trim()) return;
    const data = { name: form.name.trim(), baseUrl: form.baseUrl.trim(), color: form.color, variables: parseVariables(form.variables) };
    if (editingEnv) onUpdateEnvironment(editingEnv.id, data);
    else onCreateEnvironment(data);
    setShowModal(false);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        {activeEnv && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeEnv.color }} />}
        <Select value={activeEnvironmentId || 'none'} onValueChange={(v) => onSelectEnvironment(v === 'none' ? null : v)}>
          <SelectTrigger className="h-7 w-[140px] text-xs bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
            <SelectValue placeholder="No Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">No Environment</SelectItem>
            {environments.map(env => (
              <SelectItem key={env.id} value={env.id} className="text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: env.color }} />
                  {env.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button size="icon" variant="ghost" className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={openCreate}>
        <Settings2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEnv ? 'Edit Environment' : 'New Environment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Production" className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Base URL</label>
              <Input value={form.baseUrl} onChange={e => setForm({ ...form, baseUrl: e.target.value })} placeholder="e.g. https://api.example.com" className="mt-1 h-8 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Color</label>
              <div className="flex gap-2 mt-1">
                {COLORS.map(c => (
                  <button key={c} className={cn('w-6 h-6 rounded-full transition-transform hover:scale-110', form.color === c && 'ring-2 ring-offset-2 ring-foreground')} style={{ backgroundColor: c }} onClick={() => setForm({ ...form, color: c })} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Variables (KEY=VALUE, one per line)</label>
              <Textarea value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })} placeholder={"API_KEY=abc123\nVERSION=v2"} className="mt-1 text-xs font-mono" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>{editingEnv ? 'Update' : 'Create'}</Button>
          </DialogFooter>

          {environments.length > 0 && (
            <div className="border-t pt-4 mt-2">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">All Environments</h4>
              <div className="space-y-1.5">
                {environments.map(env => (
                  <div key={env.id} className="flex items-center gap-2 text-sm group">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: env.color }} />
                    <span className="font-medium text-xs">{env.name}</span>
                    <span className="text-xs text-muted-foreground font-mono truncate flex-1">{env.baseUrl}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => openEdit(env)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive" onClick={() => onDeleteEnvironment(env.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnvironmentManager;
