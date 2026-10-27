import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // נתיבים יחסיים – כך האתר עובד ב-GitHub Pages תחת /trivia-game/
  base: './',
  plugins: [react()],
  // מאגר השאלות נבנה כ-JSON.parse("...") – מהיר יותר לפענוח מאובייקט JS ענק
  json: { stringify: true },
  server: { host: true, port: 5173 },
  // מספר גרסה (תאריך ושעת הבנייה, שעון ישראל) – מוצג בתחתית מסך הבית
  define: {
    __APP_VERSION__: JSON.stringify(
      new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    ),
  },
});
