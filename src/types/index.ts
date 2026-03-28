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
  id: string;
  requestId: string;
  environmentId?: string;
  label?: string;
  isBaseline: boolean;
  response: ApiResponse;
  timestamp: number;
}

export interface Folder {
  id: string;
  name: string;
  requests: string[];
}

export interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  variables: Record<string, string>;
  color: string;
}

export interface JsonDiffNode {
  path: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: any;
  newValue?: any;
  children?: JsonDiffNode[];
}

export interface ComparisonResult {
  isMatch: boolean;
  statusChanged: boolean;
  headersDiff: JsonDiffNode[];
  bodyDiff: JsonDiffNode[];
  summary: { added: number; removed: number; changed: number };
}

export interface TabType {
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: string;
}
