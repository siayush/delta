import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from './keys'
import type { Environment } from '@shared/types'

export function useEnvironments(): UseQueryResult<Environment[], Error> {
  return useQuery({
    queryKey: queryKeys.environments,
    queryFn: () => api.environments.list()
  })
}

export function useCreateEnvironment(): UseMutationResult<
  Environment,
  Error,
  Omit<Environment, 'id' | 'createdAt'>
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<Environment, 'id' | 'createdAt'>) => api.environments.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.environments })
  })
}

export function useUpdateEnvironment(): UseMutationResult<
  Environment,
  Error,
  { id: string; patch: Partial<Environment> }
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Environment> }) =>
      api.environments.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.environments })
  })
}

export function useDeleteEnvironment(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.environments.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.environments })
  })
}
