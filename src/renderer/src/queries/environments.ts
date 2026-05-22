import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from './keys'
import type { Environment } from '@shared/types'

export function useEnvironments() {
  return useQuery({
    queryKey: queryKeys.environments,
    queryFn: () => api.environments.list()
  })
}

export function useCreateEnvironment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<Environment, 'id' | 'createdAt'>) => api.environments.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.environments })
  })
}

export function useUpdateEnvironment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Environment> }) =>
      api.environments.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.environments })
  })
}

export function useDeleteEnvironment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.environments.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.environments })
  })
}
