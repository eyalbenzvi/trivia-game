import { Music } from 'lucide-react';

/**
 * כפתור צלילים (אפקטים ומוזיקה). אייקון של תו מוזיקלי – כדי שלא יתבלבל עם כפתורי ההקראה 🔊.
 * השם קבוע ("צלילים"), והמצב נמסר ב-aria-pressed – כך קורא מסך לא אומר "כיבוי" כשהצלילים כבויים.
 * showLabel – מציג את המילה "צלילים" גם בטלפון (בכותרות המשחק היא מוצגת רק ממסך sm).
 */
export default function SoundToggle({ enabled, onToggle, showLabel = false }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`icon-btn w-auto gap-1.5 px-3 ${enabled ? '' : 'bg-slate-100 text-slate-600 ring-2 ring-slate-300'}`}
      aria-label="צלילים"
      aria-pressed={enabled}
      title="צלילים"
    >
      <span className="relative inline-flex" aria-hidden="true">
        <Music size={22} />
        {/* קו אלכסוני כשהצלילים כבויים */}
        {!enabled && <span className="absolute left-1/2 top-1/2 h-[3px] w-7 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-rose-600" />}
      </span>
      <span className={`text-sm font-bold ${showLabel ? '' : 'hidden sm:inline'}`} aria-hidden="true">
        צלילים
      </span>
    </button>
  );
}
