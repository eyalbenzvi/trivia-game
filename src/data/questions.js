// מאגר השאלות נטען מקבצי JSON (אחד לכל נושא) בתיקייה bank.
// כל קובץ נטען בנפרד ברקע, כך שהמסך הראשון נפתח מהר גם עם אלפי שאלות.
import { categoryByName } from './categories';

const files = import.meta.glob('./bank/*.json', { import: 'default' });

const LEVELS = ['easy', 'medium', 'hard', 'expert'];

// שאלה פגומה (בלי תשובות, correctIndex שגוי וכו') הייתה מפילה את המשחק – מדלגים עליה
const isValidQuestion = (q) =>
  q != null &&
  typeof q === 'object' &&
  typeof q.id === 'string' &&
  typeof q.question === 'string' &&
  LEVELS.includes(q.difficulty) &&
  Array.isArray(q.options) &&
  q.options.length >= 2 &&
  q.options.every((o) => typeof o === 'string') &&
  Number.isInteger(q.correctIndex) &&
  q.correctIndex >= 0 &&
  q.correctIndex < q.options.length &&
  (q.optionEmojis == null || (Array.isArray(q.optionEmojis) && q.optionEmojis.length === q.options.length));

let bankPromise = null;

/** טוען את כל השאלות ומחזיר אותן מחולקות לפי רמת קושי */
export const loadQuestionBank = () => {
  if (!bankPromise) {
    bankPromise = Promise.all(Object.values(files).map((load) => load()))
      .then((lists) => {
        const bank = { easy: [], medium: [], hard: [], expert: [] };
        const ids = new Set();
        lists
          .flatMap((list) => (Array.isArray(list) ? list : []))
          .forEach((q) => {
            if (!isValidQuestion(q) || ids.has(q.id)) return;
            ids.add(q.id);
            bank[q.difficulty].push(q);
          });
        return bank;
      })
      .catch((err) => {
        bankPromise = null;
        throw err;
      });
  }
  return bankPromise;
};

export const getCategoryMeta = (name) =>
  categoryByName[name] || { emoji: '❓', banner: 'from-sky-200 to-violet-200', chip: 'bg-sky-100 text-sky-800' };

// מאגר השאלות לרמה. אם אין שאלות ברמה (למשל רמה חדשה), יורדים לרמה הקרובה שיש בה שאלות
const fallbackOrder = { expert: ['expert', 'hard', 'medium'], hard: ['hard', 'medium'], medium: ['medium', 'hard'], easy: ['easy'] };
export const poolFor = (bank, difficulty) => {
  for (const level of fallbackOrder[difficulty] || ['medium']) if (bank[level]?.length) return bank[level];
  return [];
};
