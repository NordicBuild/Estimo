import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react()
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: 'all',
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    optimizeDeps: {
      exclude: ['web-ifc']
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'three': ['three'],
            'pdfjs-dist': ['pdfjs-dist'],
            'xlsx': ['xlsx'],
            'html2pdf': ['html2pdf.js'],
            'recharts': ['recharts']
          }
        }
      }
    }
  };
});
