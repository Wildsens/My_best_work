import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/My_best_work/', // use '/' if you have a custom domain or a username.github.io repo
});