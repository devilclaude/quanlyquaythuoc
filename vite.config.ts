import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: 'src/client',
  plugins: [
    react(),
    // T-030 — vỏ PWA. `manifest: false`: "Xong khi" chỉ yêu cầu cache vỏ app +
    // danh mục tra cứu, không yêu cầu cài đặt được như app gốc (chưa có icon
    // thiết kế) — không dựng thêm phần đó khi chưa ai cần (CLAUDE.md).
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        // Trang tự claim client ngay khi kích hoạt, không đợi mọi tab đóng —
        // để chỉ báo trạng thái (T-030) đúng ngay từ lần tải đầu, không cần
        // reload thủ công.
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Danh mục tra cứu (hàng hoá, giá) — ARCHITECTURE.md §11: KHÔNG
            // cache tồn kho như thể nó đúng. NetworkFirst luôn ưu tiên dữ
            // liệu mới nhất, chỉ rơi về cache khi mất mạng; chỉ báo trạng
            // thái (T-030) tự nói rõ đang offline nên người dùng biết số có
            // thể là gần đúng.
            urlPattern: /\/api\/hang-hoa(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'danh-muc-tra-cuu',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  preview: {
    port: 4173,
  },
  test: {
    root: '.',
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
