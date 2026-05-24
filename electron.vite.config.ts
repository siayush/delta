import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared')
      }
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        external: ['better-sqlite3']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    build: {
      sourcemap: false
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    worker: {
      format: 'es'
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id): string | undefined {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('/react/') || id.includes('/react-dom/')) return 'react'
            if (id.includes('/@tanstack/')) return 'tanstack'
            if (id.includes('/@codemirror/') || id.includes('/@uiw/')) return 'editor'
            if (
              id.includes('/@pierre/') ||
              id.includes('/shiki/') ||
              id.includes('/@shikijs/') ||
              id.includes('/oniguruma')
            ) {
              return 'diff-viewer'
            }
            return undefined
          }
        }
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
