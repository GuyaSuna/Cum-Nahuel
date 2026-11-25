import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  return { plugins: [react(), tailwindcss()], base: command === 'serve' ? '/' : env.VITE_BASE_PATH || '/cumple-playa/' };
});
