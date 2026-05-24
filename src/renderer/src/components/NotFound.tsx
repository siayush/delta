import { type ReactElement } from 'react'
import { Search } from 'lucide-react'
import { Button } from './ui/Button'

interface Props {
  message: string
  onHome: () => void
}

export function NotFound({ message, onHome }: Props): ReactElement {
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="h-12 w-12 rounded-xl bg-(--color-bg-elev) flex items-center justify-center mb-4 border border-(--color-border)">
        <Search className="h-5 w-5 text-(--color-fg-muted)" />
      </div>
      <h2 className="text-[15px] font-semibold mb-1.5">{message}</h2>
      <p className="text-[13px] text-(--color-fg-muted) mb-5">
        It doesn&apos;t exist, or has been deleted.
      </p>
      <Button onClick={onHome}>Go home</Button>
    </div>
  )
}
