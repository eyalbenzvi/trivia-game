import { useEffect, useState } from 'react';

const read = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return typeof fallback === 'function' ? fallback() : fallback;
    return JSON.parse(raw);
  } catch {
    return typeof fallback === 'function' ? fallback() : fallback;
  }
};

/**
 * useState שנשמר ב-localStorage.
 * serialize מאפשר לסנן נתונים לפני השמירה (למשל שחקני אורח זמניים).
 */
export function useLocalStorage(key, fallback, { serialize = (v) => v, revive = (v) => v } = {}) {
  const [value, setValue] = useState(() => revive(read(key, fallback)));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(serialize(value)));
    } catch {
      // אחסון מלא או חסום (למשל גלישה בסתר) – המשחק ימשיך לעבוד בלי שמירה
    }
    // serialize אמור להיות פונקציה יציבה
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  return [value, setValue];
}
