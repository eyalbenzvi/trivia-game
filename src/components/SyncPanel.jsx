import { useState } from 'react';
import { Cloud, CloudOff, Copy, Check, Loader2 } from 'lucide-react';
import ParentGate from './ParentGate';
import { CODE_LENGTH, familyExists, formatCode, newFamilyCode, normalizeCode } from '../sync/cloud';

const statusText = {
  connecting: { icon: Loader2, text: 'מתחבר…', className: 'text-sky-700', spin: true },
  on: { icon: Cloud, text: 'מסונכרן – ההתקדמות נשמרת בענן', className: 'text-emerald-700' },
  error: { icon: CloudOff, text: 'אין חיבור לענן כרגע – ההתקדמות נשמרת במכשיר ותסונכרן כשהחיבור יחזור', className: 'text-amber-700' },
};

/**
 * "סנכרון בין מכשירים" – בהגדרות ההורים במסך הבית.
 * מכשיר ראשון יוצר קוד משפחה; בשאר המכשירים מקלידים את אותו קוד, ומאז כולם רואים את אותה התקדמות.
 */
export default function SyncPanel({ sync }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!sync.available) return null;

  const join = async () => {
    const code = normalizeCode(input);
    if (code.length !== CODE_LENGTH) {
      setError(`הקוד צריך להיות ${CODE_LENGTH} תווים`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (await familyExists(code)) {
        sync.connect(code);
        setInput('');
      } else setError('לא נמצאה משפחה עם הקוד הזה – כדאי לבדוק שוב');
    } catch {
      setError('אין חיבור לאינטרנט – נסו שוב');
    }
    setBusy(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatCode(sync.code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // אין גישה ללוח – אפשר להעתיק ידנית
    }
  };

  const st = statusText[sync.status];

  return (
    <ParentGate title="סנכרון בין מכשירים" subtitle="משחקים בכמה טלפונים עם אותה התקדמות" className="mt-8">
      {sync.code ? (
        <div className="space-y-3">
          {st && (
            <p className={`flex items-center gap-2 font-bold ${st.className}`} role="status">
              <st.icon size={20} className={st.spin ? 'animate-spin' : ''} aria-hidden="true" />
              {st.text}
            </p>
          )}
          <div>
            <p className="mb-1 text-base font-medium text-slate-700">קוד המשפחה – מקלידים אותו בכל מכשיר נוסף:</p>
            <div className="flex items-center gap-2">
              <bdi dir="ltr" className="flex-1 select-all rounded-2xl bg-white px-4 py-3 text-center font-mono text-xl font-bold tracking-wider text-slate-800 shadow-pop-sm">
                {formatCode(sync.code)}
              </bdi>
              <button type="button" onClick={copy} className="btn btn-white text-sky-700" aria-label="העתקת הקוד">
                {copied ? <Check size={22} /> : <Copy size={22} />}
              </button>
            </div>
          </div>
          <button type="button" onClick={sync.disconnect} className="btn btn-white w-full text-rose-600">
            ניתוק המכשיר הזה מהסנכרון
          </button>
          <p className="text-sm text-slate-600">אחרי ניתוק, ההתקדמות נשארת גם במכשיר וגם בענן.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-base text-slate-700">כרגע ההתקדמות נשמרת רק במכשיר הזה.</p>
          <button type="button" onClick={() => sync.connect(newFamilyCode())} className="btn w-full bg-sky-600 text-white hover:bg-sky-700">
            <Cloud size={22} />
            מכשיר ראשון: יצירת קוד משפחה
          </button>
          <div>
            <label htmlFor="family-code" className="mb-1 block text-base font-bold text-slate-700">
              כבר יש לכם קוד? הקלידו אותו:
            </label>
            <div className="flex gap-2">
              <input
                id="family-code"
                dir="ltr"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && join()}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                placeholder="xxxx-xxxx-xxxx"
                className="min-w-0 flex-1 rounded-2xl border-2 border-slate-300 px-4 py-3 text-center font-mono text-lg font-bold focus:border-sky-400 focus:outline-none"
              />
              <button type="button" onClick={join} disabled={busy || !input.trim()} className="btn bg-slate-700 text-white hover:bg-slate-800">
                {busy ? <Loader2 size={22} className="animate-spin" /> : 'חיבור'}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm font-bold text-rose-600" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </ParentGate>
  );
}
