import type { Environment } from '@shared/types'

export function resolveVariables(input: string, env: Environment | null): string {
  if (!env || !input) return input
  return input.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, name) => {
    return env.variables[name] ?? `{{${name}}}`
  })
}

export function applyEnvironment(url: string, env: Environment | null): string {
  if (!env) return url
  const expanded = resolveVariables(url, env)
  if (!env.baseUrl) return expanded
  if (/^https?:\/\//i.test(expanded)) return expanded
  const base = env.baseUrl.replace(/\/$/, '')
  const path = expanded.startsWith('/') ? expanded : `/${expanded}`
  return `${base}${path}`
}
