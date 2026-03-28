import { Environment } from '../types';

export function resolveUrl(url: string, env: Environment | null): string {
  if (!env) return url;

  let resolved = url;

  // If URL starts with /, prepend baseUrl
  if (resolved.startsWith('/')) {
    resolved = env.baseUrl.replace(/\/+$/, '') + resolved;
  }

  // Replace {{variable}} placeholders
  resolved = resolved.replace(/\{\{(\w+)\}\}/g, (_match, varName) => {
    if (varName === 'baseUrl') return env.baseUrl;
    return env.variables[varName] ?? `{{${varName}}}`;
  });

  return resolved;
}
