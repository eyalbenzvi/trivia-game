import { useCallback, useEffect, useRef, useState } from 'react';

const initial = (fallback) => (typeof fallback === 'function' ? fallback() : fallback);

const read = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return initial(fallback);
    return JSON.parse(raw);
  } catch {
    return initial(fallback);
  }
};

/**
 * useState שנשמר ב-localStorage.
 * serialize מאפשר לסנן נתונים לפני השמירה (למשל שחקני אורח זמניים).
 * revive מתקן נתונים ישנים או פגומים בזמן הקריאה – אם הוא נכשל חוזרים לברירת המחדל.
 * merge (לא חובה) מחבר ערך שהגיע מלשונית אחרת עם הערך הנוכחי.
 * מחזיר [value, setValue, { saveFailed }].
 */
export function useLocalStorage(key, fallback, { serialize = (v) => v, revive = (v) => v, merge } = {}) {
  const safeRevive = useCallback(
    (v) => {
      try {
        return revive(v);
      } catch {
        return revive(initial(fallback));
      }
    },
    // revive ו-fallback אמורים להיות יציבים
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const [value, setValue] = useState(() => safeRevive(read(key, fallback)));
  const [saveFailed, setSaveFailed] = useState(false);
  const mergeRef = useRef(merge);
  mergeRef.current = merge;

  useEffect(() => {
    try {
      const raw = JSON.stringify(serialize(value));
      // לא כותבים שוב ערך זהה (למשל ערך שהגיע עכשיו מלשונית אחרת)
      if (window.localStorage.getItem(key) !== raw) window.localStorage.setItem(key, raw);
      setSaveFailed(false);
    } catch {
      // אחסון מלא או חסום (למשל גלישה בסתר) – המשחק ימשיך לעבוד, אבל בלי שמירה
      setSaveFailed(true);
    }
    // serialize אמור להיות פונקציה יציבה
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  // סנכרון בין לשוניות: כשלשונית אחרת שומרת, מעדכנים גם כאן (אחרת הכתיבה האחרונה מוחקת את הקודמת)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.storageArea !== window.localStorage || (e.key !== null && e.key !== key)) return;
      // נתונים שנמחקו בלשונית אחרת (למשל "איפוס" במסך התקלה) – לא הופכים כאן לברירת מחדל,
      // אחרת הלשונית הזאת הייתה שולחת לענן שחקנים ריקים ומוחקת לכל המשפחה
      if (e.newValue == null || e.key === null) return;
      let incoming;
      try {
        incoming = JSON.parse(e.newValue);
      } catch {
        return;
      }
      const next = safeRevive(incoming);
      setValue((prev) => (mergeRef.current ? mergeRef.current(next, prev) : next));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // fallback אמור להיות יציב
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, safeRevive]);

  return [value, setValue, { saveFailed }];
}
