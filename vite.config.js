import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()]
  // Рядок server: { open: '/default.html' } більше НЕ потрібен, Vite знайде index.html сам!
});
