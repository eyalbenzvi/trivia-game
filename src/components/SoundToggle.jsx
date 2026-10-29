import { Music } from 'lucide-react';

/**
 * כפתור צלילים (אפקטים ומוזיקה). אייקון של תו מוזיקלי – כדי שלא יתבלבל עם כפתורי ההקראה 🔊.
 * השם קבוע ("צלילים"), והמצב נמסר ב-aria-pressed – כך קורא מסך לא אומר "כיבוי" כשהצלילים כבויים.
 * המילה "צלילים" כתובה תמיד מתחת לאייקון (קטנה), כדי שגם בטלפון יהיה ברור מה הכפתור עושה.
 */
export default function SoundToggle({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`icon-btn h-auto min-h-[2.75rem] w-auto flex-col gap-0 px-1.5 py-1 sm:h-auto sm:min-h-[3rem] sm:w-auto ${enabled ? '' : 'bg-slate-100 text-slate-600 ring-2 ring-slate-300'}`}
      aria-label="צלילים"
      aria-pressed={enabled}
      title="צלילים"
    >
      <span className="relative inline-flex" aria-hidden="true">
        <Music size={20} />
        {/* קו אלכסוני כשהצלילים כבויים */}
        {!enabled && <span className="absolute left-1/2 top-1/2 h-[3px] w-7 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-rose-600" />}
      </span>
      <span className="text-[0.7rem] font-bold leading-none" aria-hidden="true">
        צלילים
      </span>
    </button>
  );
}
