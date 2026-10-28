import { useRef, useState } from 'react';
import { Camera, Check, RotateCcw, Trash2 } from 'lucide-react';
import { imageFileToAvatar, isCustomImage } from '../utils/image';
import Modal from './Modal';
import Avatar from './Avatar';
import { avatarKeys, avatars } from '../data/avatars';
import { themes } from '../data/themes';
import { difficultyInfo, levelForAge } from '../data/profiles';

const blank = {
  name: '',
  age: '',
  gender: 'm',
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
    <div className="mb-5">
      <div className="mb-2 text-base font-bold text-slate-600">{label}</div>
      {children}
    </div>
  );
}

const chip = (active) =>
  `min-h-[2.75rem] rounded-2xl border-2 px-4 py-2 font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
    active ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
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

function AutoReadToggle({ checked, onChange }) {
  return (
    <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl bg-sky-50 p-4">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-6 w-6 shrink-0 accent-sky-500" />
      <span>
        <span className="block font-bold text-slate-700">הקראה אוטומטית 🔊</span>
        <span className="text-sm text-slate-600">כל שאלה ותשובה יוקראו בקול – מתאים למי שעוד לא קורא</span>
      </span>
    </label>
  );
}

/** יצירה ועריכה של פרופיל שחקן. player=null => שחקן חדש */
export default function ProfileEditor({ player, onSave, onClose, onDelete, onReset }) {
  const isNew = !player;
  const [form, setForm] = useState(() => ({ ...blank, ...(player || {}) }));
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

  const valid = form.name.trim().length > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) {
      // במקום כפתור מושבת בלי הסבר – מסבירים מה חסר ומקפיצים לשדה
      setNameError(true);
      nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nameRef.current?.focus({ preventScroll: true });
      return;
    }
    const { name, age, gender, avatar, theme, difficulty, autoRead, temporary } = form;
    onSave({ name: name.trim().slice(0, 20), age: String(age).trim().slice(0, 4), gender, avatar, theme, difficulty, autoRead, temporary });
  };

  const photoInput = (capture) => (
    <label
      className={`btn btn-white min-h-[3rem] flex-1 cursor-pointer whitespace-nowrap px-3 border-2 border-dashed border-sky-400 text-sky-700 focus-within:ring-4 focus-within:ring-sky-300`}
    >
      {capture ? <span aria-hidden="true">🤳</span> : <Camera size={22} aria-hidden="true" />}
      {capture ? 'לצלם עכשיו' : 'תמונה מהמכשיר'}
      <input type="file" accept="image/*" capture={capture ? 'user' : undefined} className="sr-only" onChange={onPhoto} />
    </label>
  );

  const levelSettings = (
    <>
      <Field label="רמת קושי">
        <DifficultyPicker value={form.difficulty} onChange={pickDifficulty} />
        {diffFromAge && <p className="mt-2 text-sm font-bold text-sky-700">✨ בחרנו לפי הגיל – אפשר לשנות</p>}
      </Field>
      <AutoReadToggle checked={form.autoRead} onChange={(v) => set('autoRead', v)} />
    </>
  );

  return (
    <Modal open onClose={onClose} label={isNew ? 'שחקן חדש' : 'עריכת פרופיל'} className="max-w-xl">
      <form onSubmit={submit} noValidate className="px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="mb-6 flex items-center gap-4 pl-12">
          <Avatar avatar={form.avatar} theme={form.theme} size="md" />
          <h2 className="text-2xl font-bold text-slate-700 sm:text-3xl">{isNew ? 'שחקן חדש' : `עריכת ${player.name}`}</h2>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <label className="col-span-2 block">
            <span className="mb-2 block text-base font-bold text-slate-600">שם</span>
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
              className={`w-full rounded-2xl border-2 px-4 py-3 text-xl font-bold focus:border-sky-400 focus:outline-none ${
                nameError ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
              }`}
              placeholder="איך קוראים לך?"
              autoFocus={isNew}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-base font-bold text-slate-600">גיל</span>
            <input
              value={form.age}
              onChange={(e) => setAge(e.target.value)}
              inputMode="decimal"
              maxLength={4}
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-xl font-bold focus:border-sky-400 focus:outline-none"
              placeholder="8"
            />
          </label>
          {nameError && (
            <p id="name-error" className="col-span-3 -mt-1 text-base font-bold text-rose-600" role="alert">
              צריך לכתוב שם 🙂
            </p>
          )}
        </div>

        {isNew && (
          <label className="mb-5 flex cursor-pointer items-center gap-3 rounded-2xl bg-amber-50 p-4">
            <input
              type="checkbox"
              checked={form.temporary}
              onChange={(e) => set('temporary', e.target.checked)}
              className="h-6 w-6 shrink-0 accent-amber-500"
            />
            <span>
              <span className="block font-bold text-slate-700">שחקן אורח (זמני)</span>
              <span className="text-sm text-slate-600">הפרופיל יימחק כשסוגרים או מרעננים את הדף</span>
            </span>
          </label>
        )}

        <Field label="בן או בת?">
          <div className="flex gap-2">
            <button type="button" className={chip(form.gender === 'm')} aria-pressed={form.gender === 'm'} onClick={() => set('gender', 'm')}>
              👦 בן
            </button>
            <button type="button" className={chip(form.gender === 'f')} aria-pressed={form.gender === 'f'} onClick={() => set('gender', 'f')}>
              👧 בת
            </button>
          </div>
        </Field>

        <Field label="תמונה או דמות">
          <div className="mb-3 flex flex-wrap gap-2">
            {photoInput(false)}
            {canCapture && photoInput(true)}
          </div>
          {photo && (
            <button
              type="button"
              onClick={() => set('avatar', photo)}
              className={`mb-3 flex items-center gap-3 rounded-2xl border-2 p-2 pl-4 font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
                form.avatar === photo ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600'
              }`}
              aria-pressed={form.avatar === photo}
            >
              <Avatar avatar={photo} theme={form.theme} size="sm" />
              התמונה שלי {form.avatar === photo && '✓'}
            </button>
          )}
          {photoError && <p className="mb-3 text-sm font-bold text-rose-600">{photoError}</p>}
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
            {avatarKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => set('avatar', key)}
                className={`justify-self-center rounded-full p-0.5 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
                  form.avatar === key ? 'scale-110 ring-4 ring-sky-400' : 'opacity-80 hover:opacity-100'
                }`}
                aria-label={avatars[key].label}
                aria-pressed={form.avatar === key}
              >
                <Avatar avatar={key} theme={form.theme} size="sm" />
              </button>
            ))}
          </div>
        </Field>

        <Field label="צבע">
          <div className="flex flex-wrap gap-3">
            {Object.entries(themes).map(([key, t]) => (
              <button
                key={key}
                type="button"
                onClick={() => set('theme', key)}
                className={`flex h-12 w-12 items-center justify-center rounded-full ${t.swatch} text-white shadow-pop-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
                  form.theme === key ? 'scale-110 ring-4 ring-slate-700/30' : ''
                }`}
                aria-label={t.label}
                aria-pressed={form.theme === key}
              >
                {form.theme === key && <Check size={24} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </Field>

        {/* כל אחד יכול לערוך – בלי שאלת הורים */}
        {isNew ? (
          levelSettings
        ) : (
          <div className="mt-6">
            {levelSettings}
            {confirm ? (
              <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-center">
                <p className="mb-3 font-bold text-rose-700">
                  {confirm === 'delete' ? `למחוק את ${player.name}? אי אפשר לבטל את זה.` : `לאפס את כל הכוכבים והמדבקות של ${player.name}?`}
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    className="btn bg-rose-500 text-white hover:bg-rose-600"
                    onClick={() => (confirm === 'delete' ? onDelete(player.id) : (onReset(player.id), setConfirm(null)))}
                  >
                    כן, {confirm === 'delete' ? 'למחוק' : 'לאפס'}
                  </button>
                  <button type="button" className="btn btn-white" onClick={() => setConfirm(null)}>
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn btn-white flex-1 text-amber-700" onClick={() => setConfirm('reset')}>
                  <RotateCcw size={20} />
                  איפוס התקדמות
                </button>
                {!player.builtIn && (
                  <button type="button" className="btn btn-white flex-1 text-rose-600" onClick={() => setConfirm('delete')}>
                    <Trash2 size={20} />
                    מחיקת שחקן
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* כפתור השמירה נשאר דבוק לתחתית החלון – לא צריך לגלול אליו */}
        <div className="sticky bottom-0 -mx-5 mt-6 border-t border-slate-100 bg-white/95 px-5 pb-5 pt-3 backdrop-blur sm:-mx-8 sm:px-8 sm:pb-8">
          <button type="submit" className="btn w-full bg-emerald-500 py-4 text-xl text-white hover:bg-emerald-600">
            <Check size={24} strokeWidth={3} />
            {isNew ? 'יצירת שחקן' : 'שמירה'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
