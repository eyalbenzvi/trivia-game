// הקלטות מוכנות להקראה: לכל קטע שהאתר מקריא (אחרי toSpeech) יכול להיות קובץ ב-public/audio/clips/<מפתח>.ogg,
// שהוקלט מראש בקול אחד (scripts/speech). הרשימה של המפתחות הקיימים (src/data/clips.json) נטענת ברקע;
// קטע בלי הקלטה (למשל שם של שחקן שהוסיפו) מוקרא בקול של המכשיר.
import { clipKey } from './clipKey';
import { toSpeech } from './speechText';

const keys = new Set();
let loading = null;

/** טעינת רשימת ההקלטות (פעם אחת) */
export const loadClips = () => {
  if (!loading) {
    loading = import('../data/clips.json')
      .then((m) => (m.default || []).forEach((k) => keys.add(k)))
      .catch(() => {});
  }
  return loading;
};

/** כתובת ההקלטה של קטע (אחרי toSpeech), או null אם אין */
export const clipFor = (text) => (keys.has(clipKey(text)) ? `${import.meta.env.BASE_URL}audio/clips/${clipKey(text)}.ogg` : null);

export const hasClips = () => keys.size > 0;

const warmed = new Set();
/** טעינה מוקדמת של הקלטות (למשל של השאלה הבאה) – כדי שההקראה תתחיל מיד */
export const prefetchClips = (texts) => {
  if (typeof document === 'undefined') return;
  texts.forEach((t) => {
    const url = clipFor(t);
    if (!url || warmed.has(url)) return;
    warmed.add(url);
    const a = new Audio();
    a.preload = 'auto';
    a.src = url;
  });
};

/** טעינה מוקדמת של כל ההקלטות של שאלה: השאלה, התשובות, "הידעת?" וההסבר */
export const prefetchQuestionClips = (q) => {
  if (!q || !keys.size) return;
  const o = q.options || [];
  prefetchClips([q.question, ...o, ...o.map((x) => `או ${x}?`), 'תשובה נכונה!', 'התשובה הנכונה היא:', 'הידעת?', q.explanation].filter(Boolean).map(toSpeech));
};
