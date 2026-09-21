import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  preview: {
    port: 4173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Pustaka besar dipisah agar unduhan awal lebih ringan dan
        // pembaruan aplikasi tidak membatalkan cache seluruh vendor.
        manualChunks(id) {
          // Pembantu pemuat modul milik Vite dipakai entri; bila jatuh ke chunk PDF/grafik, chunk besar itu
          // ikut diunduh saat aplikasi dibuka walau belum dipakai.
          if (id.includes('vite/preload-helper') || id.includes('vite/modulepreload-polyfill')) return 'react';
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('jspdf') || id.includes('html-to-image') || id.includes('html2canvas')) return 'pdf';
          // Hanya dimuat saat tombol unduh Excel diklik
          if (id.includes('exceljs')) return 'excel';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
          return 'vendor';
        },
      },
    },
  },
});
