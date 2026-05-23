import { type ReactElement, useEffect, useState } from 'react'
import { FileText, Gauge } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import deltaLogo from '../assets/delta-logo.svg'
import { Button } from './ui/Button'
import { api } from '../lib/api'

export function SettingsPage(): ReactElement {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-7">
        <h2 className="text-[11px] font-semibold tracking-wider uppercase text-(--color-fg-muted) mb-3">
          About
        </h2>
        <AboutSection />
      </div>
    </div>
  )
}

function AboutSection(): ReactElement {
  const [version, setVersion] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    void api.app.getVersion().then((v) => {
      if (!cancelled) setVersion(v)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-bg-elev) divide-y divide-(--color-border)">
      <div className="p-5 flex items-start gap-4">
        <img src={deltaLogo} alt="Delta" className="h-12 w-12" draggable={false} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-[15px] font-semibold">Delta</h3>
            <span className="text-[11px] font-mono text-(--color-fg-muted)">
              {version ? `v${version}` : '…'}
            </span>
          </div>
          <p className="text-[12.5px] text-(--color-fg-muted) mt-1">
            A lightweight API client for building requests, capturing response snapshots, and
            diffing future responses against them.
          </p>
        </div>
      </div>

      <Row
        title="Logs"
        description="Open the local folder where Delta writes its diagnostic logs."
        control={
          <Button variant="outline" size="sm" onClick={() => void api.app.openLogs()}>
            <FileText className="h-3.5 w-3.5" />
            Open folder
          </Button>
        }
      />

      <Row
        title="Benchmark"
        description="Measure how fast Delta sends requests, parses responses, and renders diffs."
        control={
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/benchmark' })}>
            <Gauge className="h-3.5 w-3.5" />
            Open
          </Button>
        }
      />
    </div>
  )
}

interface RowProps {
  title: string
  description: string
  control: ReactElement
}

function Row({ title, description, control }: RowProps): ReactElement {
  return (
    <div className="p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium">{title}</div>
        <div className="text-[12px] text-(--color-fg-muted) mt-0.5">{description}</div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}
