import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from './keys'

export function useFolders() {
  return useQuery({
    queryKey: queryKeys.folders,
    queryFn: () => api.folders.list()
  })
}

export function useCreateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.folders.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.folders })
  })
}

export function useDeleteFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.folders.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.folders })
      qc.invalidateQueries({ queryKey: queryKeys.requests })
    }
  })
}
