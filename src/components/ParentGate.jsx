import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Lock, LockOpen } from 'lucide-react';

// אחרי שהורה פתח את ההגדרות הן נשארות פתוחות כמה דקות (גם בפרופיל אחר), כדי לא לשאול שוב ושוב
const UNLOCK_MS = 5 * 60 * 1000;
let unlockedUntil = 0;
export const isParentUnlocked = () => Date.now() < unlockedUntil;

const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const newQuestion = () => {
  const a = rand(6, 9);
  const b = rand(6, 9);
  return { a, b, answer: a * b };
};

/**
 * "🔒 הגדרות הורים" – אזור מקופל שנפתח רק אחרי תשובה לתרגיל כפל.
 * מגן על פעולות שילדים לא אמורים לעשות לבד (איפוס, מחיקה, רמת קושי, הקראה).
 */
export default function ParentGate({ children, title = 'הגדרות הורים', subtitle = 'רמת קושי, הקראה, איפוס ומחיקה', className = 'mt-6' }) {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(isParentUnlocked);
  const [q, setQ] = useState(newQuestion);
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && !unlocked) inputRef.current?.focus();
  }, [open, unlocked]);

  const check = () => {
    if (Number(value) === q.answer) {
      unlockedUntil = Date.now() + UNLOCK_MS;
      setUnlocked(true);
      setWrong(false);
    } else {
      setWrong(true);
      setValue('');
      setQ(newQuestion());
      inputRef.current?.focus();
    }
  };

  return (
    <section className={`${className} rounded-3xl border-2 border-slate-200 bg-slate-50`} aria-label={title}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[3.5rem] w-full items-center gap-3 rounded-3xl px-4 py-3 text-start font-bold text-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-pop-sm">
          {unlocked ? <LockOpen size={18} /> : <Lock size={18} />}
        </span>
        <span className="flex-1">
          <span className="block text-lg">{title}</span>
          <span className="block text-sm font-medium text-slate-600">{subtitle}</span>
        </span>
        <ChevronDown size={22} className={`transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && !unlocked && (
        <div className="px-4 pb-4">
          <p className="mb-2 text-base font-bold text-slate-700">
            שאלה להורים: כמה זה <span dir="ltr" className="inline-block">{q.a} × {q.b}</span>?
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value.replace(/\D/g, '').slice(0, 3));
                setWrong(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  check();
                }
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              aria-label={`כמה זה ${q.a} כפול ${q.b}?`}
              aria-invalid={wrong}
              className="w-28 rounded-2xl border-2 border-slate-300 px-4 py-3 text-center text-xl font-bold focus:border-sky-400 focus:outline-none"
            />
            <button type="button" className="btn flex-1 bg-slate-700 text-white hover:bg-slate-800" onClick={check} disabled={!value}>
              פתיחה
            </button>
          </div>
          {wrong && (
            <p className="mt-2 text-sm font-bold text-rose-600" role="alert">
              לא נכון – הנה תרגיל חדש
            </p>
          )}
        </div>
      )}

      {open && unlocked && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}
