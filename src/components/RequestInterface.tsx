import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ApiRequest, ApiResponse, Environment } from '../types';
import { curlToApiRequest } from '../utils/curlParser';
import { resolveUrl } from '../utils/environmentResolver';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Import, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RequestInterfaceProps {
  request: ApiRequest;
  onRequestUpdate: (request: ApiRequest) => void;
  onResponseReceived: (response: ApiResponse | null) => void;
  activeEnvironment: Environment | null;
}

const RequestInterface: React.FC<RequestInterfaceProps> = ({
  request,
  onRequestUpdate,
  onResponseReceived,
  activeEnvironment,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [localRequest, setLocalRequest] = useState<ApiRequest>(request);
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [curlCommand, setCurlCommand] = useState('');

  useEffect(() => { setLocalRequest(request); }, [request]);

  const updateLocalRequest = (updates: Partial<ApiRequest>) => {
    const updated = { ...localRequest, ...updates };
    setLocalRequest(updated);
    onRequestUpdate(updated);
  };

  const buildUrl = () => {
    let url = localRequest.url;
    const params = new URLSearchParams();
    Object.entries(localRequest.queryParams).forEach(([key, value]) => {
      if (key.trim() && value.trim()) params.append(key, value);
    });
    const qs = params.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    return url;
  };

  const sendRequest = async () => {
    if (!localRequest.url.trim()) return;
    setIsLoading(true);
    const startTime = Date.now();
    try {
      const resolvedUrl = resolveUrl(buildUrl(), activeEnvironment);
      const config: any = { method: localRequest.method, url: resolvedUrl, headers: {}, timeout: 30000 };
      Object.entries(localRequest.headers).forEach(([key, value]) => {
        if (key.trim() && value.trim()) config.headers[key] = value;
      });
      if (['POST', 'PUT', 'PATCH'].includes(localRequest.method) && localRequest.body.trim()) {
        try { config.data = JSON.parse(localRequest.body); config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json'; }
        catch { config.data = localRequest.body; config.headers['Content-Type'] = config.headers['Content-Type'] || 'text/plain'; }
      }
      const response = await axios(config);
      onResponseReceived({ status: response.status, statusText: response.statusText, data: response.data, headers: response.headers as Record<string, string>, responseTime: Date.now() - startTime });
    } catch (error: any) {
      const endTime = Date.now();
      if (error.response) {
        onResponseReceived({ status: error.response.status, statusText: error.response.statusText, data: error.response.data, headers: error.response.headers as Record<string, string>, responseTime: endTime - startTime });
      } else {
        onResponseReceived({ status: 0, statusText: error.message || 'Network Error', data: { error: error.message || 'Request failed' }, headers: {}, responseTime: endTime - startTime });
      }
    } finally { setIsLoading(false); }
  };

  const handleCurlImport = () => {
    if (!curlCommand.trim()) return;
    try {
      const imported = curlToApiRequest(curlCommand, localRequest.name);
      const updated = { ...localRequest, ...imported };
      setLocalRequest(updated);
      onRequestUpdate(updated);
      setCurlCommand('');
      setShowCurlImport(false);
    } catch { alert('Failed to parse cURL command.'); }
  };

  return (
    <div className="border-b">
      {/* Request name */}
      <div className="px-4 py-2 border-b bg-muted/30">
        <Input
          value={localRequest.name}
          onChange={(e) => updateLocalRequest({ name: e.target.value })}
          className="border-0 shadow-none px-0 h-7 text-sm font-semibold bg-transparent focus-visible:ring-0"
          placeholder="Request name"
        />
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <Select value={localRequest.method} onValueChange={(v) => updateLocalRequest({ method: v as ApiRequest['method'] })}>
          <SelectTrigger className={cn('w-[110px] h-8 text-xs font-bold', localRequest.method === 'GET' ? 'text-emerald-600' : localRequest.method === 'POST' ? 'text-blue-600' : localRequest.method === 'DELETE' ? 'text-red-600' : 'text-amber-600')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => (
              <SelectItem key={m} value={m} className="text-xs font-semibold">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={localRequest.url}
          onChange={(e) => updateLocalRequest({ url: e.target.value })}
          className="flex-1 h-8 font-mono text-xs"
          placeholder="Enter request URL"
        />

        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={sendRequest} disabled={isLoading || !localRequest.url.trim()}>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1" /> Send</>}
        </Button>

        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowCurlImport(true)}>
          <Import className="h-3.5 w-3.5 mr-1" /> cURL
        </Button>
      </div>

      {/* Resolved URL preview */}
      {activeEnvironment && localRequest.url && (
        <div className="px-4 py-1 border-b bg-blue-50 dark:bg-blue-950/30 flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-[10px] h-4" style={{ borderColor: activeEnvironment.color, color: activeEnvironment.color }}>
            {activeEnvironment.name}
          </Badge>
          <span className="font-mono text-muted-foreground truncate">{resolveUrl(buildUrl(), activeEnvironment)}</span>
        </div>
      )}

      {/* Tabs: Headers, Params, Body */}
      <Tabs defaultValue="headers" className="border-b">
        <TabsList className="h-8 bg-muted/50 rounded-none border-b w-full justify-start px-4">
          <TabsTrigger value="headers" className="text-xs h-7 data-[state=active]:shadow-none">
            Headers {Object.keys(localRequest.headers).length > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">{Object.keys(localRequest.headers).length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="params" className="text-xs h-7 data-[state=active]:shadow-none">
            Params {Object.keys(localRequest.queryParams).length > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">{Object.keys(localRequest.queryParams).length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="body" className="text-xs h-7 data-[state=active]:shadow-none">Body</TabsTrigger>
        </TabsList>

        <div className="max-h-[200px] overflow-y-auto">
          <TabsContent value="headers" className="m-0 p-3">
            <KeyValueEditor data={localRequest.headers} onChange={(h) => updateLocalRequest({ headers: h })} keyPlaceholder="Header name" valuePlaceholder="Header value" />
          </TabsContent>
          <TabsContent value="params" className="m-0 p-3">
            <KeyValueEditor data={localRequest.queryParams} onChange={(q) => updateLocalRequest({ queryParams: q })} keyPlaceholder="Param name" valuePlaceholder="Param value" />
          </TabsContent>
          <TabsContent value="body" className="m-0 p-3">
            <Textarea
              value={localRequest.body}
              onChange={(e) => updateLocalRequest({ body: e.target.value })}
              className="font-mono text-xs min-h-[120px] resize-y"
              placeholder="Request body (JSON, XML, text...)"
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* cURL Import Dialog */}
      <Dialog open={showCurlImport} onOpenChange={setShowCurlImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from cURL</DialogTitle>
          </DialogHeader>
          <Textarea
            value={curlCommand}
            onChange={(e) => setCurlCommand(e.target.value)}
            className="font-mono text-xs min-h-[120px]"
            placeholder={`curl -X POST https://api.example.com/data -H 'Content-Type: application/json' -d '{"key": "value"}'`}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCurlCommand(''); setShowCurlImport(false); }}>Cancel</Button>
            <Button onClick={handleCurlImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* Key-Value pair editor */
interface KVProps {
  data: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
}

const KeyValueEditor: React.FC<KVProps> = ({ data, onChange, keyPlaceholder, valuePlaceholder }) => {
  const [pairs, setPairs] = useState<Array<{ key: string; value: string; id: string }>>(() => {
    const p = Object.entries(data).map(([key, value], i) => ({ key, value, id: `${i}-${key}` }));
    p.push({ key: '', value: '', id: `new-${Date.now()}` });
    return p;
  });
  const internalUpdate = useRef(false);

  useEffect(() => {
    if (internalUpdate.current) { internalUpdate.current = false; return; }
    const p = Object.entries(data).map(([key, value], i) => ({ key, value, id: `${i}-${key}` }));
    p.push({ key: '', value: '', id: `new-${Date.now()}` });
    setPairs(p);
  }, [data]);

  const updatePair = (id: string, key: string, value: string) => {
    const newPairs = pairs.map(p => p.id === id ? { ...p, key, value } : p);
    const last = newPairs[newPairs.length - 1];
    if (last.key.trim() || last.value.trim()) newPairs.push({ key: '', value: '', id: `new-${Date.now()}` });
    setPairs(newPairs);
    internalUpdate.current = true;
    const newData: Record<string, string> = {};
    newPairs.forEach(p => { if (p.key.trim() && p.value.trim()) newData[p.key] = p.value; });
    onChange(newData);
  };

  const removePair = (id: string) => {
    let newPairs = pairs.filter(p => p.id !== id);
    if (newPairs.length === 0 || newPairs[newPairs.length - 1].key.trim() || newPairs[newPairs.length - 1].value.trim()) {
      newPairs.push({ key: '', value: '', id: `new-${Date.now()}` });
    }
    setPairs(newPairs);
    internalUpdate.current = true;
    const newData: Record<string, string> = {};
    newPairs.forEach(p => { if (p.key.trim() && p.value.trim()) newData[p.key] = p.value; });
    onChange(newData);
  };

  return (
    <div className="space-y-1.5">
      {pairs.map((pair) => (
        <div key={pair.id} className="flex items-center gap-1.5">
          <Input value={pair.key} onChange={(e) => updatePair(pair.id, e.target.value, pair.value)} placeholder={keyPlaceholder} className="h-7 text-xs flex-1" />
          <Input value={pair.value} onChange={(e) => updatePair(pair.id, pair.key, e.target.value)} placeholder={valuePlaceholder} className="h-7 text-xs flex-1" />
          {(pair.key.trim() || pair.value.trim()) && (
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removePair(pair.id)}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

export default RequestInterface;
