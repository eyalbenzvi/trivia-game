import { useState } from 'react';
import { Check, RotateCcw, Trash2 } from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import { avatarKeys, avatars } from '../data/avatars';
import { themes } from '../data/themes';
import { difficultyInfo } from '../data/profiles';

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

function Field({ label, children }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-base font-bold text-slate-600">{label}</div>
      {children}
    </div>
  );
}

const chip = (active) =>
  `rounded-2xl border-2 px-4 py-2 font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
    active ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
  }`;

/** יצירה ועריכה של פרופיל שחקן. player=null => שחקן חדש */
export default function ProfileEditor({ player, onSave, onClose, onDelete, onReset }) {
  const isNew = !player;
  const [form, setForm] = useState(() => ({ ...blank, ...(player || {}) }));
  const [confirm, setConfirm] = useState(null); // 'delete' | 'reset'
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const valid = form.name.trim().length > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    const { name, age, gender, avatar, theme, difficulty, autoRead, temporary } = form;
    onSave({ name: name.trim().slice(0, 20), age: String(age).trim().slice(0, 4), gender, avatar, theme, difficulty, autoRead, temporary });
  };

  return (
    <Modal open onClose={onClose} label={isNew ? 'שחקן חדש' : 'עריכת פרופיל'} className="max-w-xl">
      <form onSubmit={submit} className="p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          <Avatar avatar={form.avatar} theme={form.theme} size="md" />
          <h2 className="text-3xl font-bold text-slate-700">{isNew ? 'שחקן חדש' : `עריכת ${player.name}`}</h2>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <label className="col-span-2 block">
            <span className="mb-2 block text-base font-bold text-slate-600">שם</span>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={20}
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-xl font-bold focus:border-sky-400 focus:outline-none"
              placeholder="איך קוראים לך?"
              autoFocus={isNew}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-base font-bold text-slate-600">גיל</span>
            <input
              value={form.age}
              onChange={(e) => set('age', e.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal"
              maxLength={4}
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-xl font-bold focus:border-sky-400 focus:outline-none"
              placeholder="8"
            />
          </label>
        </div>

        <Field label="בן או בת?">
          <div className="flex gap-2">
            <button type="button" className={chip(form.gender === 'm')} onClick={() => set('gender', 'm')}>
              👦 בן
            </button>
            <button type="button" className={chip(form.gender === 'f')} onClick={() => set('gender', 'f')}>
              👧 בת
            </button>
          </div>
        </Field>

        <Field label="דמות">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
            {avatarKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => set('avatar', key)}
                className={`rounded-full p-0.5 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
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

        <Field label="רמת קושי">
          <div className="grid gap-2 sm:grid-cols-3">
            {Object.entries(difficultyInfo).map(([key, d]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  set('difficulty', key);
                  if (key === 'easy') set('autoRead', true);
                }}
                className={`${chip(form.difficulty === key)} text-start`}
                aria-pressed={form.difficulty === key}
              >
                <div className="text-lg">
                  {d.emoji} {d.title}
                </div>
                <div className="text-xs font-medium text-slate-500">{d.description}</div>
              </button>
            ))}
          </div>
        </Field>

        <label className="mb-3 flex cursor-pointer items-center gap-3 rounded-2xl bg-sky-50 p-4">
          <input
            type="checkbox"
            checked={form.autoRead}
            onChange={(e) => set('autoRead', e.target.checked)}
            className="h-6 w-6 accent-sky-500"
          />
          <span>
            <span className="block font-bold text-slate-700">הקראה אוטומטית 🔊</span>
            <span className="text-sm text-slate-500">כל שאלה ותשובה יוקראו בקול – מתאים למי שעוד לא קורא</span>
          </span>
        </label>

        {isNew && (
          <label className="mb-3 flex cursor-pointer items-center gap-3 rounded-2xl bg-amber-50 p-4">
            <input
              type="checkbox"
              checked={form.temporary}
              onChange={(e) => set('temporary', e.target.checked)}
              className="h-6 w-6 accent-amber-500"
            />
            <span>
              <span className="block font-bold text-slate-700">שחקן אורח (זמני)</span>
              <span className="text-sm text-slate-500">הפרופיל יימחק כשסוגרים או מרעננים את הדף</span>
            </span>
          </label>
        )}

        {confirm ? (
          <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-center">
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
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!valid} className="btn flex-1 bg-emerald-500 py-4 text-xl text-white hover:bg-emerald-600">
              <Check size={24} strokeWidth={3} />
              {isNew ? 'יצירת שחקן' : 'שמירה'}
            </button>
            {!isNew && (
              <button type="button" className="btn btn-white text-amber-600" onClick={() => setConfirm('reset')} title="איפוס התקדמות">
                <RotateCcw size={20} />
                איפוס
              </button>
            )}
            {!isNew && !player.builtIn && (
              <button type="button" className="btn btn-white text-rose-600" onClick={() => setConfirm('delete')} title="מחיקה">
                <Trash2 size={20} />
                מחיקה
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
