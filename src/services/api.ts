import axios from 'axios';
import { ApiRequest, ApiResponse, Folder, Snapshot, Environment } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Log all requests and responses
client.interceptors.request.use(config => {
  return config;
});

client.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    console.error(`[API] !! Error:`, error.message, error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// Ensure headers/queryParams are never undefined
function normalizeRequest(req: any): ApiRequest {
  return {
    ...req,
    headers: req.headers || {},
    queryParams: req.queryParams || {},
    body: req.body ?? '',
  };
}

// Requests
export async function fetchRequests(): Promise<ApiRequest[]> {
  const { data } = await client.get('/requests');
  return data.map(normalizeRequest);
}

export async function createRequest(req: Partial<ApiRequest>): Promise<ApiRequest> {
  const { data } = await client.post('/requests', req);
  return normalizeRequest(data);
}

export async function updateRequest(id: string, req: Partial<ApiRequest>): Promise<ApiRequest> {
  const { data } = await client.put(`/requests/${id}`, req);
  return normalizeRequest(data);
}

export async function deleteRequest(id: string): Promise<void> {
  await client.delete(`/requests/${id}`);
}

// Folders
export async function fetchFolders(): Promise<Folder[]> {
  const { data } = await client.get('/folders');
  return data;
}

export async function createFolder(name: string): Promise<Folder> {
  const { data } = await client.post('/folders', { name });
  return data;
}

export async function updateFolder(id: string, name: string): Promise<Folder> {
  const { data } = await client.put(`/folders/${id}`, { name });
  return data;
}

export async function deleteFolder(id: string): Promise<void> {
  await client.delete(`/folders/${id}`);
}

// Snapshots
export async function fetchSnapshots(requestId: string): Promise<Snapshot[]> {
  const { data } = await client.get('/snapshots', { params: { requestId } });
  return data;
}

export async function saveSnapshot(snapshot: {
  requestId: string;
  environmentId?: string;
  label?: string;
  isBaseline: boolean;
  response: ApiResponse;
}): Promise<Snapshot> {
  const { data } = await client.post('/snapshots', snapshot);
  return data;
}

export async function deleteSnapshot(id: string): Promise<void> {
  await client.delete(`/snapshots/${id}`);
}

export async function setBaseline(id: string): Promise<Snapshot> {
  const { data } = await client.put(`/snapshots/${id}/baseline`);
  return data;
}

// Environments
export async function fetchEnvironments(): Promise<Environment[]> {
  const { data } = await client.get('/environments');
  return data;
}

export async function createEnvironment(env: Omit<Environment, 'id'>): Promise<Environment> {
  const { data } = await client.post('/environments', env);
  return data;
}

export async function updateEnvironment(id: string, env: Partial<Environment>): Promise<Environment> {
  const { data } = await client.put(`/environments/${id}`, env);
  return data;
}

export async function deleteEnvironment(id: string): Promise<void> {
  await client.delete(`/environments/${id}`);
}
