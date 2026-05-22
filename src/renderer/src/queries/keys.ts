export const queryKeys = {
  requests: ['requests'] as const,
  folders: ['folders'] as const,
  environments: ['environments'] as const,
  snapshots: (requestId: string) => ['snapshots', requestId] as const
}
