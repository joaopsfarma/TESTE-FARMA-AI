import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({command, mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Usa /PAINEL-LOGISTICA/ apenas no build do GitHub Actions (produção).
    // No modo dev (Google AI Studio), usa a raiz '/' para não quebrar o preview.
    base: command === 'build' ? '/PAINEL-LOGISTICA/' : '/', 
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
