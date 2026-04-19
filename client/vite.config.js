import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, path.resolve(__dirname), '')
  // Vercel 빌드 시: 대시보드에 VITE_API_URL이 있어도 무시 → 항상 같은 도메인 /api
  // → vercel.json rewrite로 Cloudtype 백엔드로 전달 (프리뷰·커스텀 도메인 모두 CORS 없이 동작)
  const viteApiUrl = process.env.VERCEL === '1' ? '' : (loaded.VITE_API_URL || '')
  // 로컬: 기본 3000 고정(strictPort). 3000이 이미 쓰이면 실패 → 다른 Vite 끄거나 client/.env 에 VITE_DEV_PORT=3001
  const devPort = Number(loaded.VITE_DEV_PORT) || 3000
  // 로컬에서 Vercel과 동일 상품/API: VITE_API_URL 비운 채로 아래만 설정 → /api 를 Cloudtype으로 프록시
  const devApiProxy = (loaded.VITE_DEV_API_PROXY_TARGET || '').trim().replace(/\/+$/, '')
  const apiProxyTarget = devApiProxy || 'http://localhost:5000'

  return {
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(viteApiUrl),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: devPort,
      strictPort: true,
      host: true, // 모바일에서 같은 Wi-Fi로 접속 가능 (실행 시 표시되는 Network 주소 사용)
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: apiProxyTarget.startsWith('https:'),
        },
      },
    },
  }
})
