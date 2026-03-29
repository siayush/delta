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
import { Import, Loader2, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  const methodColor = localRequest.method === 'GET' ? 'text-emerald-500' : localRequest.method === 'POST' ? 'text-amber-500' : localRequest.method === 'DELETE' ? 'text-red-500' : localRequest.method === 'PUT' ? 'text-blue-500' : 'text-violet-500';

  const headerCount = Object.keys(localRequest.headers).filter(k => k.trim()).length;
  const paramCount = Object.keys(localRequest.queryParams).filter(k => k.trim()).length;
  const hasBody = localRequest.body.trim().length > 0;

  return (
    <div>
      {/* Request name — minimal inline like Postman tab title */}
      <div className="px-4 pt-3 pb-1">
        <Input
          value={localRequest.name}
          onChange={(e) => updateLocalRequest({ name: e.target.value })}
          className="border-0 shadow-none px-0 h-6 text-sm font-medium bg-transparent focus-visible:ring-0 text-foreground/80 w-auto"
          placeholder="Untitled Request"
        />
      </div>

      {/* URL bar — single unified row like Postman */}
      <div className="flex items-center gap-0 px-4 pb-3">
        <div className="flex items-center flex-1 h-9 border rounded-lg overflow-hidden bg-background focus-within:ring-1 focus-within:ring-ring">
          <Select value={localRequest.method} onValueChange={(v) => updateLocalRequest({ method: v as ApiRequest['method'] })}>
            <SelectTrigger className={cn('w-[100px] h-9 rounded-none border-0 border-r shadow-none text-xs font-bold focus:ring-0', methodColor)}>
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
            onKeyDown={(e) => { if (e.key === 'Enter') sendRequest(); }}
            className="flex-1 h-9 rounded-none border-0 shadow-none font-mono text-xs focus-visible:ring-0 px-3"
            placeholder="Enter URL or paste text"
          />
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          <Button className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg" onClick={sendRequest} disabled={isLoading || !localRequest.url.trim()}>
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center h-9 w-8 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCurlImport(true)}>
                <Import className="h-3.5 w-3.5 mr-2" /> Import cURL
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Resolved URL preview — compact inline */}
      {activeEnvironment && localRequest.url && (
        <div className="px-4 pb-2 -mt-1 flex items-center gap-2 text-[11px]">
          <Badge variant="outline" className="text-[10px] h-4 px-1.5" style={{ borderColor: activeEnvironment.color, color: activeEnvironment.color }}>
            {activeEnvironment.name}
          </Badge>
          <span className="font-mono text-muted-foreground truncate">{resolveUrl(buildUrl(), activeEnvironment)}</span>
        </div>
      )}

      {/* Tabs — clean underline style like Postman */}
      <Tabs defaultValue="params">
        <div className="border-b px-4">
          <TabsList variant="line" className="h-9 p-0">
            <TabsTrigger value="params" className="text-xs px-3 h-9 rounded-none">
              Params {paramCount > 0 && <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-[10px] px-1 rounded-full">{paramCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="headers" className="text-xs px-3 h-9 rounded-none">
              Headers {headerCount > 0 && <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-[10px] px-1 rounded-full">{headerCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="body" className="text-xs px-3 h-9 rounded-none">
              Body {hasBody && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="max-h-[200px] overflow-y-auto">
          <TabsContent value="params" className="m-0 px-4 py-3">
            <KeyValueEditor title="Query Params" data={localRequest.queryParams} onChange={(q) => updateLocalRequest({ queryParams: q })} />
          </TabsContent>
          <TabsContent value="headers" className="m-0 px-4 py-3">
            <KeyValueEditor title="Headers" data={localRequest.headers} onChange={(h) => updateLocalRequest({ headers: h })} />
          </TabsContent>
          <TabsContent value="body" className="m-0 px-4 py-3">
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
  title: string;
  data: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
}

const KeyValueEditor: React.FC<KVProps> = ({ title, data, onChange }) => {
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
    <div>
      <h4 className="text-sm font-medium text-muted-foreground mb-2">{title}</h4>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-xs font-medium text-muted-foreground text-center px-3 py-1.5 w-1/2">Key</th>
              <th className="text-xs font-medium text-muted-foreground text-center px-3 py-1.5 w-1/2">Value</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => (
              <tr key={pair.id} className="border-b last:border-b-0 group">
                <td className="px-1 py-0.5 border-r">
                  <Input value={pair.key} onChange={(e) => updatePair(pair.id, e.target.value, pair.value)} placeholder="Key" className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 rounded-none bg-transparent" />
                </td>
                <td className="px-1 py-0.5">
                  <Input value={pair.value} onChange={(e) => updatePair(pair.id, pair.key, e.target.value)} placeholder="Value" className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 rounded-none bg-transparent" />
                </td>
                <td className="px-1 py-0.5 text-center">
                  {(pair.key.trim() || pair.value.trim()) && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePair(pair.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequestInterface;
