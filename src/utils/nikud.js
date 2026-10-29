// ניקוד להקראה: מנוע הדיבור של הטלפון מנחש תנועות והטעמה בטקסט לא מנוקד (ספר/סֵפֶר/סַפָּר),
// ולכן לפני ההקראה מחליפים את הטקסט בגרסה מנוקדת שהוכנה מראש (scripts/speech).
// על המסך הטקסט נשאר בלי ניקוד – הניקוד משמש רק להקראה.
//
// המילונים: לכל קובץ שאלות קובץ ניקוד משלו (say/<קובץ>.json) שנטען כשהשאלה מוצגת,
// ומילון אחד לטקסטים של המשחק עצמו (sayUi.json). בכל מילון: קטע משפט → קטע מנוקד, ומילה → מילה מנוקדת.

import { SPLIT, segmentsOf } from './sayText';

const segments = new Map(); // קטע → קטע מנוקד
const words = new Map(); // מילה → מילה מנוקדת
const loaded = new Set();
const pending = new Map();

export const registerSay = (dict) => {
  if (!dict) return;
  Object.entries(dict.s || {}).forEach(([k, v]) => segments.set(k, v));
  Object.entries(dict.w || {}).forEach(([k, v]) => {
    if (!words.has(k)) words.set(k, v);
  });
};

// טעינת המילונים (בדפדפן בלבד)
const bankSay = import.meta.glob('../data/say/*.json', { import: 'default' });
const load = (key, loader) => {
  if (loaded.has(key)) return Promise.resolve();
  if (!pending.has(key)) {
    pending.set(
      key,
      loader()
        .then((dict) => {
          registerSay(dict);
          loaded.add(key);
        })
        .catch(() => {})
        .finally(() => pending.delete(key)),
    );
  }
  return pending.get(key);
};

/** מילון הטקסטים של המשחק – נטען פעם אחת */
export const loadUiSay = () => load('ui', () => import('../data/sayUi.json').then((m) => m.default));

// הקלטות מראש לשאלות של עידו (הרמה הקלה): טקסט → שם קובץ ב-public/audio/ido (scripts/speech/record.py)
const clips = new Map();
const loadClips = () =>
  load('clips', () =>
    import('../data/idoAudio.json').then((m) => {
      Object.entries(m.default || {}).forEach(([k, v]) => clips.set(k, v));
      return null;
    }),
  );
const clipUrl = (name) => `${import.meta.env.BASE_URL}audio/ido/${name}.ogg`;

/** הקלטה מוכנה לטקסט (אחרי toSpeech), אם יש */
export const clipFor = (text) => {
  const name = clips.get(text);
  return name ? clipUrl(name) : null;
};

/**
 * חלוקת טקסט להקלטות: הטקסט כולו, או רשימת תשובות ("א, ב, או ג?") שלכל אחת מהן יש הקלטה.
 * מחזיר רשימת כתובות, או null אם אין הקלטה מלאה.
 */
export const clipsFor = (text) => {
  const whole = clipFor(text);
  if (whole) return [whole];
  if (!clips.size || !text.includes(',')) return null;
  const out = [];
  for (const seg of text.split(/\s*,\s*/)) {
    const part = seg.replace(/[?!.]$/, '').trim();
    const or = part.match(/^או (.+)$/);
    const url = clipFor(or ? or[1] : part);
    if (!url) return null;
    if (or) out.push(clipFor('או'));
    out.push(url);
  }
  return out.every(Boolean) ? out : null;
};

/** הניקוד של שאלה (לפי הקובץ שממנו היא באה) – נטען ברקע כשהשאלה מוצגת. לשאלות של עידו – גם ההקלטות */
export const prefetchSay = (question) => {
  loadUiSay();
  if (question?.difficulty === 'easy' && question.kids !== false) loadClips();
  const loader = question?.src && bankSay[`../data/say/${question.src}.json`];
  return loader ? load(question.src, loader) : Promise.resolve();
};

/** יש מילון שעוד נטען */
export const sayPending = () => pending.size > 0;

/** מחכה (עד זמן מוגבל) לטעינות שבדרך, כדי שההקראה הראשונה כבר תהיה מנוקדת */
export const waitForSay = (ms = 700) =>
  pending.size ? Promise.race([Promise.all([...pending.values()]), new Promise((r) => setTimeout(r, ms))]) : Promise.resolve();

const vocalizeWord = (word) => {
  const m = word.match(/^([^א-ת]*)([א-ת][א-ת'"׳״־-]*)([^א-ת]*)$/);
  if (!m) return word;
  const hit = words.get(m[2]);
  return hit ? `${m[1]}${hit}${m[3]}` : word;
};

const vocalizeSegment = (seg) => {
  if (SPLIT.test(seg)) return seg;
  const hit = segments.get(seg);
  if (hit) return hit;
  // "או X" / "וX" בסוף רשימת תשובות – מנקדים את X
  const or = seg.match(/^או (.+)$/);
  if (or && segments.has(or[1])) return `אוֹ ${segments.get(or[1])}`;
  return seg.split(/(\s+)/).map((w) => (/\s/.test(w) ? w : vocalizeWord(w))).join('');
};

/** טקסט (אחרי toSpeech) → טקסט מנוקד להקראה */
export const vocalize = (text) => {
  if (!segments.size && !words.size) return text;
  return segmentsOf(text)
    .map(vocalizeSegment)
    .reduce((out, s) => (SPLIT.test(s) ? out + s : out ? `${out} ${s}` : s), '');
};
