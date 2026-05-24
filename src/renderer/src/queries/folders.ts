import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from './keys'
import type { Folder } from '@shared/types'

export function useFolders(): UseQueryResult<Folder[], Error> {
  return useQuery({
    queryKey: queryKeys.folders,
    queryFn: () => api.folders.list()
  })
}

export function useCreateFolder(): UseMutationResult<Folder, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.folders.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.folders })
  })
}

export function useDeleteFolder(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.folders.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.folders })
      qc.invalidateQueries({ queryKey: queryKeys.requests })
    }
  })
}
