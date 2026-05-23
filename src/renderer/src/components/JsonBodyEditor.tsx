import { type ReactElement, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { EditorView } from '@codemirror/view'

interface Props {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}

export function JsonBodyEditor({ value, onChange, placeholder }: Props): ReactElement {
  const extensions = useMemo(
    () => [
      json(),
      EditorView.lineWrapping,
      EditorView.theme({
        // Blend with the app's panel instead of painting one-dark's #282c34.
        // StyleModule scoping ties with one-dark's `&` selector, so !important
        // is needed to win.
        '&': { fontSize: '12.5px', backgroundColor: 'transparent !important' },
        '.cm-scroller': { backgroundColor: 'transparent !important' },
        '.cm-gutters': {
          backgroundColor: 'transparent !important',
          borderRight: '1px solid var(--color-border)',
          color: 'var(--color-fg-subtle)'
        },
        '.cm-lineNumbers .cm-gutterElement': {
          padding: '0 8px 0 6px',
          minWidth: '24px'
        },
        '.cm-foldGutter .cm-gutterElement': { padding: '0 2px', cursor: 'pointer' },
        '.cm-activeLine': { backgroundColor: 'transparent !important' },
        '.cm-activeLineGutter': {
          backgroundColor: 'transparent !important',
          color: 'var(--color-fg-muted)'
        },
        '.cm-content': {
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          padding: '8px 0'
        },
        '&.cm-editor.cm-focused': { outline: 'none' }
      })
    ],
    []
  )

  return (
    <div className="rounded-md border border-(--color-border) bg-(--color-bg-elev) overflow-hidden focus-within:border-(--color-accent)">
      <CodeMirror
        value={value}
        onChange={onChange}
        height="176px"
        theme="dark"
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: false,
          highlightActiveLineGutter: false
        }}
        extensions={extensions}
      />
    </div>
  )
}
