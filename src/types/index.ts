export interface ApiRequest {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: string;
  folderId?: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
  responseTime: number;
}

export interface Snapshot {
  requestId: string;
  response: any;
  timestamp: number;
}

export interface Folder {
  id: string;
  name: string;
  requests: string[];
}

export interface ComparisonResult {
  isMatch: boolean;
  diff?: string;
}

export interface TabType {
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: string;
}