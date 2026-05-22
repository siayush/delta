import { useEffect, useState } from 'react'
import type { UpdaterEvent } from '@shared/ipc'
import { api } from '../lib/api'
import { Button } from './ui/Button'

export function UpdaterBanner() {
  const [event, setEvent] = useState<UpdaterEvent | null>(null)

  useEffect(() => {
    return api.updater.onEvent(setEvent)
  }, [])

  if (!event) return null

  if (event.type === 'downloaded') {
    return (
      <div className="bg-(--color-accent) text-(--color-accent-fg) text-[12px] px-4 h-8 flex items-center justify-between">
        <span>Update {event.version} is ready.</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-(--color-accent-fg) hover:bg-white/10"
          onClick={() => window.location.reload()}
        >
          Restart
        </Button>
      </div>
    )
  }

  if (event.type === 'available' || event.type === 'downloading') {
    return (
      <div className="bg-(--color-bg-elev) border-b border-(--color-border) text-[12px] px-4 h-8 flex items-center">
        {event.type === 'available'
          ? `Downloading update ${event.version}…`
          : `Downloading update… ${Math.round(event.percent)}%`}
      </div>
    )
  }

  return null
}
