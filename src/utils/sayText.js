// פונקציות טקסט משותפות לניקוד ההקראה – גם בדפדפן וגם בסקריפטים שמכינים את המילונים (בלי תלות ב-Vite)

// פיצול לקטעים לפי סימני פיסוק – אותו פיצול בהכנת המילונים ובזמן ההקראה
export const SPLIT = /([,.!?;:…])/;
export const segmentsOf = (text) =>
  String(text || '')
    .split(SPLIT)
    .map((s) => (SPLIT.test(s) ? s : s.trim()))
    .filter((s) => s !== '');

// הסרת ניקוד וטעמים (לבדיקה שהטקסט המנוקד תואם למקור)
export const stripNikud = (s) => String(s || '').replace(/[\u0591-\u05C7|]/g, '');

