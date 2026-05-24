import { useState, type ReactElement } from 'react'
import { FileCode2, X } from 'lucide-react'
import { Button } from './ui/Button'
import { api } from '../lib/api'
import type { ParsedCurl } from '@shared/types'

interface Props {
  onClose: () => void
  onImport: (parsed: ParsedCurl) => void
}

export function ImportCurlModal({ onClose, onImport }: Props): ReactElement {
  const [curl, setCurl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleImport = async (): Promise<void> => {
    const trimmed = curl.trim()
    if (!trimmed) {
      setError('Paste a cURL command first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const parsed = await api.app.parseCurl(trimmed)
      onImport(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse cURL.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-[640px] max-w-[92vw] rounded-xl border border-(--color-border) bg-(--color-bg-elev) shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-(--color-border) flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-(--color-fg-muted)" />
            <h3 className="font-semibold text-[14px]">Import cURL</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[12.5px] text-(--color-fg-muted)">
            Paste a cURL command (e.g. copied from your browser&apos;s devtools).
          </p>
          <textarea
            value={curl}
            onChange={(e) => {
              setCurl(e.target.value)
              if (error) setError(null)
            }}
            placeholder={`curl 'https://api.example.com/v1/items' \\\n  -H 'Authorization: Bearer …' \\\n  -H 'Content-Type: application/json' \\\n  --data-raw '{"id":1}'`}
            spellCheck={false}
            autoFocus
            className="w-full h-56 resize-none rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-[12px] font-mono outline-none placeholder:text-(--color-fg-subtle) focus:border-(--color-accent)"
          />
          {error && (
            <div className="text-[12px] text-(--color-danger) font-mono break-words">{error}</div>
          )}
        </div>
        <div className="p-3 border-t border-(--color-border) flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleImport} disabled={busy}>
            {busy ? 'Parsing…' : 'Import'}
          </Button>
        </div>
      </div>
    </div>
  )
}
