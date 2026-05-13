import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = env.API_PORT || env.VITE_API_PORT || '8787'
  const devApiOrigin = `http://localhost:${apiPort}`

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
    define: {
      'import.meta.env.VITE_DEV_API_ORIGIN': JSON.stringify(
        mode === 'development' ? devApiOrigin : '',
      ),
    },
    server: {
      proxy: {
        '/api': {
          target: devApiOrigin,
          changeOrigin: true,
        },
      },
    },
  }
})
