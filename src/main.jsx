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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
