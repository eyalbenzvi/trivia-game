import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // נתיבים יחסיים – כך האתר עובד ב-GitHub Pages תחת /trivia-game/
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
});
