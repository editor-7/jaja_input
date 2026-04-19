import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, path.resolve(__dirname), '')
  // Vercel 빌드 시: 대시보드에 VITE_API_URL이 있어도 무시 → 항상 같은 도메인 /api
  // → vercel.json rewrite로 Cloudtype 백엔드로 전달 (프리뷰·커스텀 도메인 모두 CORS 없이 동작)
  const viteApiUrl = process.env.VERCEL === '1' ? '' : (loaded.VITE_API_URL || '')

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
      port: 3000,
      host: true, // 모바일에서 같은 Wi-Fi로 접속 가능 (실행 시 표시되는 Network 주소 사용)
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  }
})
