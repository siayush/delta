import { JsonDiffNode } from '../types';

export function computeDiff(oldVal: any, newVal: any, path: string = ''): JsonDiffNode[] {
  // Both null/undefined
  if (oldVal === newVal) return [];

  // One is null/undefined
  if (oldVal == null && newVal != null) {
    return [{ path: path || '(root)', type: 'added', newValue: newVal }];
  }
  if (oldVal != null && newVal == null) {
    return [{ path: path || '(root)', type: 'removed', oldValue: oldVal }];
  }

  // Different types
  if (typeof oldVal !== typeof newVal) {
    return [{ path: path || '(root)', type: 'changed', oldValue: oldVal, newValue: newVal }];
  }

  // Primitives
  if (typeof oldVal !== 'object') {
    if (oldVal !== newVal) {
      return [{ path: path || '(root)', type: 'changed', oldValue: oldVal, newValue: newVal }];
    }
    return [];
  }

  // Arrays
  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
    const nodes: JsonDiffNode[] = [];
    const maxLen = Math.max(oldVal.length, newVal.length);

    for (let i = 0; i < maxLen; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;
      if (i >= oldVal.length) {
        nodes.push({ path: itemPath, type: 'added', newValue: newVal[i] });
      } else if (i >= newVal.length) {
        nodes.push({ path: itemPath, type: 'removed', oldValue: oldVal[i] });
      } else {
        nodes.push(...computeDiff(oldVal[i], newVal[i], itemPath));
      }
    }
    return nodes;
  }

  // One array, one object
  if (Array.isArray(oldVal) !== Array.isArray(newVal)) {
    return [{ path: path || '(root)', type: 'changed', oldValue: oldVal, newValue: newVal }];
  }

  // Objects
  const nodes: JsonDiffNode[] = [];
  const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);

  for (const key of allKeys) {
    const keyPath = path ? `${path}.${key}` : key;
    if (!(key in oldVal)) {
      nodes.push({ path: keyPath, type: 'added', newValue: newVal[key] });
    } else if (!(key in newVal)) {
      nodes.push({ path: keyPath, type: 'removed', oldValue: oldVal[key] });
    } else {
      nodes.push(...computeDiff(oldVal[key], newVal[key], keyPath));
    }
  }

  return nodes;
}

export function diffSummary(nodes: JsonDiffNode[]): { added: number; removed: number; changed: number } {
  return {
    added: nodes.filter(n => n.type === 'added').length,
    removed: nodes.filter(n => n.type === 'removed').length,
    changed: nodes.filter(n => n.type === 'changed').length,
  };
}
