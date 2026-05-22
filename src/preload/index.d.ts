import type { DeltaApi } from './index'

declare global {
  interface Window {
    delta: DeltaApi
  }
}

export {}
