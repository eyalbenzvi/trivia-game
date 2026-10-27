import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// אחרי פרסום גרסה חדשה הקבצים הישנים נמחקים, ודף שנשמר במטמון מבקש קבצים שכבר אינם –
// טוענים את הדף מחדש (לכל היותר פעם ב-10 שניות, כדי לא להיתקע בלולאה)
window.addEventListener('vite:preloadError', () => {
  const KEY = 'family-trivia-preload-reload';
  try {
    if (Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 10000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return;
  }
  window.location.reload();
});

// הדפדפן עלול להציג גרסה ישנה מהמטמון. בכל פתיחה בודקים מול האתר אם יש גרסה חדשה יותר,
// ואם כן – טוענים מחדש פעם אחת (לכל היותר פעם בדקה, כדי לא להיתקע בלולאה)
const checkForNewVersion = async () => {
  const KEY = 'family-trivia-version-reload';
  try {
    const current = document.querySelector('script[type="module"][src*="assets/index-"]')?.getAttribute('src');
    if (!current) return; // מצב פיתוח
    const res = await fetch(`./?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const latest = (await res.text()).match(/src="([^"]*assets\/index-[^"]+\.js)"/)?.[1];
    if (!latest || new URL(latest, window.location.href).href === new URL(current, window.location.href).href) return;
    if (Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 60000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  } catch {
    // אין רשת או אין גישה לאחסון – ממשיכים עם הגרסה הקיימת
  }
};
checkForNewVersion();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
