import { type ReactElement, useEffect, useState } from 'react'
import { Bug, ExternalLink, FileText } from 'lucide-react'
import deltaLogo from '../assets/delta-logo.svg'
import { Button } from './ui/Button'
import { api } from '../lib/api'

const linkButtonClass =
  'inline-flex items-center justify-center rounded-md font-medium transition-colors cursor-pointer ' +
  'border border-(--color-border) bg-transparent hover:bg-(--color-bg-elev) ' +
  'h-7 px-2.5 text-[12px] gap-1 text-(--color-fg)'

const DEVELOPER_NAME = 'Ayush'
const DEVELOPER_URL = 'https://github.com/siayush'
const ISSUES_URL = 'https://github.com/siayush/delta/issues'

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
          <p className="text-[12px] text-(--color-fg-muted) mt-2">
            Built by{' '}
            <a
              href={DEVELOPER_URL}
              target="_blank"
              rel="noreferrer"
              className="text-(--color-fg) hover:underline"
            >
              {DEVELOPER_NAME}
            </a>
            .
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
        title="Source code"
        description="Browse the Delta repository on GitHub."
        control={
          <a
            href={DEVELOPER_URL + '/delta'}
            target="_blank"
            rel="noreferrer"
            className={linkButtonClass}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open repo
          </a>
        }
      />

      <Row
        title="Report an issue"
        description="Found a bug or have a feature request? File it on GitHub."
        control={
          <a href={ISSUES_URL} target="_blank" rel="noreferrer" className={linkButtonClass}>
            <Bug className="h-3.5 w-3.5" />
            File an issue
          </a>
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
