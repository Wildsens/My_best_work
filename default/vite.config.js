import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Вказуємо Vite відкривати саме ваш default.html при старті
    open: '/default.html'
  }
});
