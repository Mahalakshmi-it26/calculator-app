import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const rawPort = process.env.PORT;
const parsedPort = rawPort ? Number(rawPort) : undefined;
const port = parsedPort && Number.isFinite(parsedPort) ? parsedPort : undefined;

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src'),
    },
  },
  server: {
    host: true,
    ...(port ? { port, strictPort: true } : {}),
  },
  preview: {
    host: true,
    ...(port ? { port, strictPort: true } : {}),
  },
});
