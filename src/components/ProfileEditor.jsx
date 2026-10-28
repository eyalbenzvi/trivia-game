import { useEffect, useRef, useState } from 'react';
import { Camera, Check, RotateCcw, Trash2, Volume2 } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';
import { PARENT_CODE_LENGTH, checkParentCode, lockRemaining, recordAttempt } from '../utils/parentCode';
import { imageFileToAvatar, isCustomImage } from '../utils/image';
import Modal from './Modal';
import Avatar from './Avatar';
import { avatarKeys, avatars } from '../data/avatars';
import { themes } from '../data/themes';
import { difficultyInfo, levelForAge } from '../data/profiles';
import { smooth } from '../utils/motion';

const blank = {
  name: '',
  age: '',
  gender: null, // שחקן חדש בוחר בן או בת (בלי ברירת מחדל, כדי שלא יפנו לבת בלשון זכר)
  avatar: 'fox',
  theme: 'mint',
  difficulty: 'medium',
  autoRead: false,
  temporary: false,
};

// בטלפון/טאבלט אפשר להציע גם צילום ישר מהמצלמה
const canCapture = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

function Field({ label, children }) {
  return (
    <fieldset className="mb-5 min-w-0">
      <legend className="mb-2 text-base font-bold text-slate-700">{label}</legend>
      {children}
    </fieldset>
  );
}

// שדה שחסר בו משהו – אדום, גם כשהפוקוס עליו
const invalidField = 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-4 focus:ring-rose-100';

const chip = (active, invalid = false) =>
  `min-h-[2.75rem] rounded-2xl border-2 px-4 py-2 font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 ${
    active ? 'border-sky-500 bg-sky-50 text-sky-700' : invalid ? 'border-rose-500 bg-rose-50 text-slate-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
  }`;

function DifficultyPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="רמת קושי">
      {Object.entries(difficultyInfo).map(([key, d]) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={`${chip(active)} flex items-center gap-3 text-start`}
          >
            <span className="text-3xl leading-none" aria-hidden="true">
              {d.emoji}
            </span>
            <span className="flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-lg">{d.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${d.badge}`}>{d.ages}</span>
              </span>
              <span className="block text-sm font-medium text-slate-600">{d.description}</span>
            </span>
            {active && <Check size={22} strokeWidth={3} className="shrink-0 text-sky-600" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

/** אישור איפוס/מחיקה בקוד הורים בן 4 ספרות */
function ParentCodeConfirm({ text, actionLabel, onConfirm, onCancel }) {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // החלון כבר גלול למטה – מביאים את השדה והכפתורים לאמצע (גם בטלפון לרוחב)
  useEffect(() => {
    inputRef.current?.scrollIntoView({ block: 'center', behavior: smooth() });
  }, []);

  // החלון נסגר בזמן הבדיקה (למשל ב-Back) – לא מבצעים את הפעולה
  const alive = useRef(true);
  const busy = useRef(false);
  useEffect(() => () => {
    alive.current = false;
  }, []);

  const submit = async () => {
    if (busy.current) return; // בדיקה אחת בכל פעם (גם ב-Enter חוזר)
    const wait = lockRemaining();
    if (wait) {
      setError(`יותר מדי ניסיונות – נסו שוב בעוד ${Math.ceil(wait / 1000)} שניות`);
      return;
    }
    busy.current = true;
    setChecking(true);
    const ok = await checkParentCode(code);
    busy.current = false;
    if (!alive.current) return;
    setChecking(false);
    const left = recordAttempt(ok);
    if (ok) {
      onConfirm();
      return;
    }
    setCode('');
    setError(left ? `הקוד לא נכון · ${left === 1 ? 'נשאר ניסיון אחד' : `נשארו ${left} ניסיונות`}` : 'יותר מדי ניסיונות – נסו שוב בעוד דקה');
    inputRef.current?.focus();
  };

  return (
    <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-center">
      <p className="mb-3 font-bold text-rose-700">
        {text}
        <span className="mt-1 block text-sm font-medium text-rose-600">צריך קוד הורים · אפשר לבטל ב־20 השניות שאחרי</span>
      </p>
      <input
        ref={inputRef}
        autoFocus
        value={code}
        onChange={(e) => {
          setCode(e.target.value.replace(/\D/g, '').slice(0, PARENT_CODE_LENGTH));
          setError('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && code.length === PARENT_CODE_LENGTH) {
            e.preventDefault();
            submit();
          }
        }}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label="קוד הורים (4 ספרות)"
        placeholder="4 ספרות"
        // הספרות משמאל לימין, אבל ההנחיה בעברית
        dir={code ? 'ltr' : 'rtl'}
        className={`mx-auto mb-3 block h-16 w-48 rounded-2xl border-2 border-rose-300 px-4 text-center font-bold focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-100 ${
          code ? 'text-3xl tracking-[0.5em]' : 'text-lg tracking-normal'
        }`}
      />
      {error && (
        <p className="mb-3 text-sm font-bold text-rose-700" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-center gap-3">
        <button type="button" className="btn bg-rose-600 text-white hover:bg-rose-700" disabled={code.length !== PARENT_CODE_LENGTH || checking} onClick={submit}>
          {checking ? 'בודקים…' : actionLabel}
        </button>
        <button type="button" className="btn btn-white" onClick={onCancel}>
          ביטול
        </button>
      </div>
    </div>
  );
}

/** "בדיקת הקראה" – לשמוע איך נשמעת ההקראה, ולגלות אם חסר קול עברי במכשיר */
function SpeechCheck() {
  const { speak, supported, hasHebrewVoice, voicesLoaded } = useSpeech();
  const [tried, setTried] = useState(false);
  if (!supported) return <p className="mt-2 text-sm font-bold text-amber-700">הדפדפן הזה לא תומך בהקראה.</p>;
  return (
    <div className="mt-2">
      <button
        type="button"
        className="btn btn-white text-sky-700"
        onClick={() => {
          setTried(true);
          speak('שלום! ככה אני מקריא את השאלות והתשובות.', { rate: 0.9 });
        }}
      >
        <Volume2 size={20} />
        בדיקת הקראה
      </button>
      {tried && voicesLoaded && !hasHebrewVoice && (
        <p className="mt-2 text-sm font-bold text-amber-700">לא נמצא קול בעברית במכשיר, ולכן ייתכן שההקראה לא תעבוד. אפשר להתקין קול עברי בהגדרות המכשיר (נגישות ← הקראה).</p>
      )}
    </div>
  );
}

function AutoReadToggle({ checked, onChange }) {
  return (
    <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl bg-sky-50 p-4">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-7 w-7 shrink-0 accent-sky-700" />
      <span>
        <span className="block font-bold text-slate-700">הקראה אוטומטית 🔊</span>
        <span className="text-sm text-slate-600">כל שאלה ותשובה יוקראו בקול – מתאים למי שעוד לא קורא</span>
      </span>
    </label>
  );
}

/** יצירה ועריכה של פרופיל שחקן. player=null => שחקן חדש */
export default function ProfileEditor({ player, players = [], onSave, onClose, onDelete, onReset }) {
  const isNew = !player;
  // שחקן חדש מקבל דמות וצבע שעוד אף אחד לא משתמש בהם – כדי ששני שחקנים לא ייראו אותו דבר
  const [form, setForm] = useState(() => {
    if (!isNew) return { ...blank, ...player };
    const usedAvatars = new Set(players.map((p) => p.avatar));
    const usedThemes = new Set(players.map((p) => p.theme));
    const avatar = avatarKeys.find((k) => avatars[k]?.type !== 'image' && !usedAvatars.has(k)) || blank.avatar;
    const theme = Object.keys(themes).find((k) => !usedThemes.has(k)) || blank.theme;
    return { ...blank, avatar, theme };
  });
  const [genderError, setGenderError] = useState(false);
  const genderRef = useRef(null);
  const [confirm, setConfirm] = useState(null); // 'delete' | 'reset'
  const [photoError, setPhotoError] = useState('');
  const [nameError, setNameError] = useState(false);
  // שחקן חדש: רמת הקושי נבחרת לפי הגיל, עד שבוחרים רמה ביד
  const [diffTouched, setDiffTouched] = useState(!isNew);
  const [diffFromAge, setDiffFromAge] = useState(false);
  const nameRef = useRef(null);
  // התמונה שהועלתה נשמרת בצד, כדי שאפשר יהיה לחזור אליה אחרי בחירת דמות אחרת
  const [photo, setPhoto] = useState(() => (isCustomImage(player?.avatar) ? player.avatar : null));

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await imageFileToAvatar(file);
      setPhoto(dataUrl);
      setPhotoError('');
      setForm((f) => ({ ...f, avatar: dataUrl }));
    } catch {
      setPhotoError('לא הצלחנו לפתוח את התמונה. נסו תמונה אחרת (למשל צילום מסך או קובץ JPG).');
    }
  };
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const setAge = (raw) => {
    const age = raw.replace(/[^\d.]/g, '');
    const level = levelForAge(age);
    setForm((f) => {
      if (diffTouched || !level) return { ...f, age };
      return { ...f, age, difficulty: level, autoRead: level === 'easy' };
    });
    if (!diffTouched) setDiffFromAge(Boolean(level));
  };

  const pickDifficulty = (key) => {
    setDiffTouched(true);
    setDiffFromAge(false);
    setForm((f) => ({ ...f, difficulty: key, autoRead: key === 'easy' ? true : f.autoRead }));
  };

  const pickGender = (gender) => {
    set('gender', gender);
    setGenderError(false);
  };

  const submit = (e) => {
    e.preventDefault();
    // במקום כפתור מושבת בלי הסבר – בודקים הכול יחד, מסבירים מה חסר ומקפיצים לשדה הראשון
    const missingName = !form.name.trim();
    const missingGender = !form.gender;
    setNameError(missingName);
    setGenderError(missingGender);
    if (missingName || missingGender) {
      const target = missingName ? nameRef.current : genderRef.current?.querySelector('[role="radio"]');
      target?.scrollIntoView({ behavior: smooth(), block: 'center' });
      target?.focus({ preventScroll: true });
      return;
    }
    const { name, age, gender, avatar, theme, difficulty, autoRead, temporary } = form;
    onSave({ name: name.trim().slice(0, 20), age: String(age).trim().slice(0, 4), gender, avatar, theme, difficulty, autoRead, temporary });
  };

  const photoInput = (capture) => (
    <label className="btn btn-white h-12 min-w-0 flex-1 cursor-pointer whitespace-nowrap border-2 border-dashed border-sky-500 px-2 text-sky-800 focus-within:ring-4 focus-within:ring-sky-700">
      {capture ? <span aria-hidden="true">🤳</span> : <Camera size={22} aria-hidden="true" />}
      {capture ? 'לצלם עכשיו' : 'תמונה מהמכשיר'}
      <input type="file" accept="image/*" capture={capture ? 'user' : undefined} className="sr-only" onChange={onPhoto} />
    </label>
  );

  return (
    <Modal open onClose={onClose} label={isNew ? 'שחקן חדש' : 'עריכת פרופיל'} className="max-w-xl">
      <form onSubmit={submit} noValidate className="px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="mb-6 flex items-center gap-4 pl-12">
          <Avatar avatar={form.avatar} theme={form.theme} size="md" />
          <h2 className="text-2xl font-bold text-slate-700 sm:text-3xl">{isNew ? 'שחקן חדש' : `עריכת ${player.name}`}</h2>
        </div>

        <Field label="תמונה או דמות">
          <div className="mb-3 flex gap-2">
            {photoInput(false)}
            {canCapture && photoInput(true)}
          </div>
          {photoError && (
            <p className="mb-3 text-sm font-bold text-rose-700" role="alert">
              {photoError}
            </p>
          )}
          <div role="radiogroup" aria-label="תמונה או דמות">
            {photo && (
              <button
                type="button"
                role="radio"
                aria-checked={form.avatar === photo}
                onClick={() => set('avatar', photo)}
                className={`mb-3 flex items-center gap-3 rounded-2xl border-2 p-2 pl-4 font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 ${
                  form.avatar === photo ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Avatar avatar={photo} theme={form.theme} size="sm" decorative />
                התמונה שלי {form.avatar === photo && '✓'}
              </button>
            )}
            <div className="grid grid-cols-6 gap-1 sm:grid-cols-9 sm:gap-2">
              {avatarKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={form.avatar === key}
                  onClick={() => set('avatar', key)}
                  className={`justify-self-center rounded-full transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 ${
                    form.avatar === key ? 'scale-110 ring-4 ring-sky-500' : 'opacity-80 hover:opacity-100'
                  }`}
                  aria-label={avatars[key].label}
                >
                  <Avatar avatar={key} theme={form.theme} size="sm" decorative />
                </button>
              ))}
            </div>
          </div>
        </Field>

        <div className="mb-5 grid grid-cols-[1fr_6.5rem] gap-3">
          <label className="block">
            <span className="mb-2 block text-base font-bold text-slate-700">שם</span>
            <input
              ref={nameRef}
              value={form.name}
              onChange={(e) => {
                set('name', e.target.value);
                if (e.target.value.trim()) setNameError(false);
              }}
              maxLength={20}
              aria-invalid={nameError}
              aria-describedby={nameError ? 'name-error' : undefined}
              className={`w-full rounded-2xl border-2 px-4 py-3 text-xl font-bold focus:outline-none ${
                nameError ? invalidField : 'border-slate-200 focus:border-sky-500'
              }`}
              placeholder="איך קוראים לך?"
              autoFocus={isNew}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-base font-bold text-slate-700">גיל</span>
            <input
              value={form.age}
              onChange={(e) => setAge(e.target.value)}
              inputMode="decimal"
              maxLength={4}
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-xl font-bold focus:border-sky-500 focus:outline-none"
              placeholder="8"
            />
          </label>
          {nameError && (
            <p id="name-error" className="col-span-2 -mt-1 text-base font-bold text-rose-700" role="alert">
              צריך לכתוב שם 🙂
            </p>
          )}
        </div>

        <Field label="בן או בת?">
          <div
            className="flex gap-2"
            ref={genderRef}
            role="radiogroup"
            aria-label="בן או בת?"
            aria-invalid={genderError}
            aria-describedby={genderError ? 'gender-error' : undefined}
          >
            <button type="button" role="radio" aria-checked={form.gender === 'm'} className={chip(form.gender === 'm', genderError)} onClick={() => pickGender('m')}>
              👦 בן
            </button>
            <button type="button" role="radio" aria-checked={form.gender === 'f'} className={chip(form.gender === 'f', genderError)} onClick={() => pickGender('f')}>
              👧 בת
            </button>
          </div>
          {genderError && (
            <p id="gender-error" className="mt-2 text-sm font-bold text-rose-700" role="alert">
              בחרו בן או בת
            </p>
          )}
        </Field>

        <Field label="רמת קושי">
          <DifficultyPicker value={form.difficulty} onChange={pickDifficulty} />
          {diffFromAge && <p className="mt-2 text-sm font-bold text-sky-700">✨ בחרנו לפי הגיל – אפשר לשנות</p>}
        </Field>
        <div className="mb-5">
          <AutoReadToggle checked={form.autoRead} onChange={(v) => set('autoRead', v)} />
          {form.autoRead && <SpeechCheck />}
        </div>

        <Field label="צבע">
          <div className="grid grid-cols-7 justify-items-center gap-2" role="radiogroup" aria-label="צבע">
            {Object.entries(themes).map(([key, t]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={form.theme === key}
                onClick={() => set('theme', key)}
                className="flex flex-col items-center gap-1 rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${t.swatch} text-white shadow-pop-sm transition ${
                    form.theme === key ? 'scale-110 ring-4 ring-slate-700/40' : ''
                  }`}
                  aria-hidden="true"
                >
                  {form.theme === key && <Check size={22} strokeWidth={3} />}
                </span>
                <span className="text-xs font-bold text-slate-700">{t.label}</span>
              </button>
            ))}
          </div>
        </Field>

        {isNew && (
          <details className="group mb-5 rounded-2xl bg-slate-50">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 rounded-2xl px-4 font-bold text-slate-700">
              <span className="flex-1">עוד אפשרויות</span>
              <span className="transition group-open:rotate-180" aria-hidden="true">
                ▾
              </span>
            </summary>
            <label className="m-2 mt-0 flex cursor-pointer items-center gap-3 rounded-2xl bg-amber-50 p-4">
              <input
                type="checkbox"
                checked={form.temporary}
                onChange={(e) => set('temporary', e.target.checked)}
                className="h-7 w-7 shrink-0 accent-sky-700"
              />
              <span>
                <span className="block font-bold text-slate-700">שחקן אורח (זמני)</span>
                <span className="text-sm text-slate-600">הפרופיל יימחק כשסוגרים או מרעננים את הדף</span>
              </span>
            </label>
          </details>
        )}

        {/* כל אחד יכול לערוך; איפוס ומחיקה – רק עם קוד הורים */}
        {!isNew &&
          (confirm ? (
            <div className="pb-5 sm:pb-8">
              <ParentCodeConfirm
                text={confirm === 'delete' ? `למחוק את ${player.name}?` : `לאפס את כל הכוכבים והמדבקות של ${player.name}?`}
                actionLabel={confirm === 'delete' ? 'כן, למחוק' : 'כן, לאפס'}
                onConfirm={() => (confirm === 'delete' ? onDelete(player.id) : onReset(player.id))}
                onCancel={() => setConfirm(null)}
              />
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" className="btn btn-white flex-1 text-amber-800" onClick={() => setConfirm('reset')}>
                <RotateCcw size={20} />
                איפוס התקדמות
              </button>
              {!player.builtIn && (
                <button type="button" className="btn btn-white flex-1 text-rose-700" onClick={() => setConfirm('delete')}>
                  <Trash2 size={20} />
                  מחיקת שחקן
                </button>
              )}
            </div>
          ))}

        {/* כפתור השמירה נשאר דבוק לתחתית החלון – לא צריך לגלול אליו. בזמן אישור בקוד הורים הוא מוסתר, כדי שלא יסתיר את השדה */}
        {!confirm && (
          <div className="sticky bottom-0 -mx-5 mt-6 border-t border-slate-100 bg-white/95 px-5 pb-5 pt-3 backdrop-blur sm:-mx-8 sm:px-8 sm:pb-8 short:static short:py-2">
            <button type="submit" className="btn w-full bg-emerald-700 py-4 text-xl text-white hover:bg-emerald-800 short:py-2 short:text-lg">
              <Check size={24} strokeWidth={3} />
              {isNew ? 'יצירת שחקן' : 'שמירה'}
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
