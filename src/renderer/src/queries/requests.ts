import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from './keys'
import { useDraftStore } from '../stores/drafts'
import { useRequestRuntime } from '../stores/requestRuntime'
import { useResponseStore } from '../stores/response'
import type { ApiRequest, HttpMethod } from '@shared/types'

export function useRequests(): UseQueryResult<ApiRequest[], Error> {
  return useQuery({
    queryKey: queryKeys.requests,
    queryFn: () => api.requests.list()
  })
}

export function useCreateRequest(): UseMutationResult<
  ApiRequest,
  Error,
  Partial<ApiRequest> & { name: string; method: HttpMethod }
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<ApiRequest> & { name: string; method: HttpMethod }) =>
      api.requests.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.requests })
  })
}

export function useUpdateRequest(): UseMutationResult<
  ApiRequest,
  Error,
  { id: string; patch: Partial<ApiRequest> },
  { prev: ApiRequest[] | undefined }
> {
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

export function useDeleteRequest(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.requests.delete(id),
    onSuccess: (_data, id) => {
      useDraftStore.getState().clear(id)
      useRequestRuntime.getState().clear(id)
      useResponseStore.getState().clearResponse(id)
      void qc.invalidateQueries({ queryKey: queryKeys.requests })
    }
  })
}
