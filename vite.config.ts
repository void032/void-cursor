import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === 'demo') {
    return {
      plugins: [react()],
      build: { outDir: 'demo-dist' },
    }
  }

  return {
    plugins: [react()],
    publicDir: false,
    build: {
      lib: {
        entry: 'src/index.ts',
        formats: ['es'],
        fileName: 'void-cursor',
      },
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          'react-dom/client',
          'react/jsx-runtime',
        ],
        output: {
          banner: "'use client';",
          exports: 'named',
        },
      },
    },
  }
})
