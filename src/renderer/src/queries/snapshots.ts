import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from './keys'
import type { Snapshot } from '@shared/types'

export function useSnapshots(requestId: string | null) {
  return useQuery({
    queryKey: queryKeys.snapshots(requestId ?? ''),
    queryFn: () => (requestId ? api.snapshots.list(requestId) : Promise.resolve([])),
    enabled: !!requestId
  })
}

export function useCreateSnapshot(requestId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<Snapshot, 'id' | 'createdAt'>) => api.snapshots.create(input),
    onSuccess: () => {
      if (requestId) qc.invalidateQueries({ queryKey: queryKeys.snapshots(requestId) })
    }
  })
}

export function useDeleteSnapshot(requestId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.snapshots.delete(id),
    onSuccess: () => {
      if (requestId) qc.invalidateQueries({ queryKey: queryKeys.snapshots(requestId) })
    }
  })
}

export function useSetBaseline(requestId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.snapshots.setBaseline(id),
    onSuccess: () => {
      if (requestId) qc.invalidateQueries({ queryKey: queryKeys.snapshots(requestId) })
    }
  })
}
