import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const SHOWN = 3;

/**
 * "כדאי לזכור" – השאלות שטעינו בהן והתשובה הנכונה.
 * מציג 3 ראשונות, והשאר מאחורי "ועוד N". collapsed – הכול מקופל (למשל בסיכום המשפחתי).
 */
export default function MissedList({ missed = [], title = '💡 כדאי לזכור', collapsed = false, className = '' }) {
  const [open, setOpen] = useState(!collapsed);
  const [all, setAll] = useState(false);
  if (!missed.length) return null;
  const items = all ? missed : missed.slice(0, SHOWN);
  const more = missed.length - SHOWN;
  return (
    <section className={`rounded-3xl bg-slate-50 p-4 text-start ${className}`}>
      {collapsed ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-h-[48px] w-full items-center gap-2 text-xl font-bold text-slate-700" aria-expanded={open}>
          <span className="flex-1 text-start">
            {title} ({missed.length})
          </span>
          <ChevronDown size={22} className={`transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      ) : (
        <h2 className="mb-2 text-xl font-bold text-slate-700">{title}</h2>
      )}
      {open && (
        <>
          <ul className={`space-y-2 ${collapsed ? 'mt-3' : ''}`}>
            {items.map((m, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl bg-white p-3 text-sm sm:text-base">
                {(m.picture || m.icon) && (
                  <span className="text-3xl leading-none" aria-hidden="true">
                    {m.picture || m.icon}
                  </span>
                )}
                <div>
                  <div className="font-medium text-slate-600">{m.question}</div>
                  <div className="font-bold text-emerald-700">✓ {m.answer}</div>
                </div>
              </li>
            ))}
          </ul>
          {more > 0 && (
            <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 min-h-[48px] w-full rounded-2xl py-2 text-base font-bold text-sky-700 hover:bg-white" aria-expanded={all}>
              {all ? 'פחות ▴' : `ועוד ${more === 1 ? 'שאלה אחת' : `${more} שאלות`} ▾`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/** משפטי הקראה ל"כדאי לזכור" (שלוש הראשונות) */
export const missedSpeech = (missed = []) =>
  missed.length ? ['כדאי לזכור:', ...missed.slice(0, SHOWN).map((m) => `${m.question} התשובה הנכונה: ${m.answer}.`)] : [];
