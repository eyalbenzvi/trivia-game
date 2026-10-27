// מאגר השאלות נטען מקבצי JSON (אחד לכל נושא) בתיקייה bank.
// כל קובץ נטען בנפרד ברקע, כך שהמסך הראשון נפתח מהר גם עם אלפי שאלות.
import { categoryByName } from './categories';

const files = import.meta.glob('./bank/*.json', { import: 'default' });

let bankPromise = null;

/** טוען את כל השאלות ומחזיר אותן מחולקות לפי רמת קושי */
export const loadQuestionBank = () => {
  if (!bankPromise) {
    bankPromise = Promise.all(Object.values(files).map((load) => load()))
      .then((lists) => {
        const bank = { easy: [], medium: [], hard: [] };
        lists.flat().forEach((q) => bank[q.difficulty]?.push(q));
        return bank;
      })
      .catch((err) => {
        bankPromise = null; // לאפשר ניסיון חוזר אם הרשת נפלה
        throw err;
      });
  }
  return bankPromise;
};

export const getCategoryMeta = (name) =>
  categoryByName[name] || { emoji: '❓', banner: 'from-sky-200 to-violet-200', chip: 'bg-sky-100 text-sky-800' };
