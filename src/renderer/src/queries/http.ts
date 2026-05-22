import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { SendRequestInput } from '@shared/types'

export function useSendRequest() {
  return useMutation({
    mutationFn: (input: SendRequestInput) => api.http.send(input)
  })
}
