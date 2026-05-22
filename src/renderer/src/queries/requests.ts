import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from './keys'
import type { ApiRequest, HttpMethod } from '@shared/types'

export function useRequests() {
  return useQuery({
    queryKey: queryKeys.requests,
    queryFn: () => api.requests.list()
  })
}

export function useCreateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<ApiRequest> & { name: string; method: HttpMethod }) =>
      api.requests.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.requests })
  })
}

export function useUpdateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ApiRequest> }) =>
      api.requests.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.requests })
      const prev = qc.getQueryData<ApiRequest[]>(queryKeys.requests)
      qc.setQueryData<ApiRequest[]>(queryKeys.requests, (old) =>
        old?.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r))
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.requests, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.requests })
  })
}

export function useDeleteRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.requests.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.requests })
  })
}
