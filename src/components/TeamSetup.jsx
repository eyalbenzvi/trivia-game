import { useState } from 'react';
import { Check, Play } from 'lucide-react';
import Avatar from './Avatar';
import HomeButton from './HomeButton';
import { getTheme } from '../data/themes';
import { difficultyInfo } from '../data/profiles';
import { missionList, missions, teamMilestones } from '../data/missions';
import { estimateMinutes } from '../utils/game';

const roundOptions = [
  { value: 3, label: 'קצר' },
  { value: 4, label: 'רגיל' },
  { value: 6, label: 'ארוך' },
];

export default function TeamSetup({ players, initial, onStart, onBack }) {
  const [selected, setSelected] = useState(() => {
    const saved = (initial?.playerIds || []).filter((id) => players.some((p) => p.id === id));
    // אם כל השחקנים השמורים נמחקו – מתחילים עם כולם
    return saved.length ? saved : players.map((p) => p.id);
  });
  const [rounds, setRounds] = useState(initial?.rounds || 4);
  const [mission, setMission] = useState(missions[initial?.mission] ? initial.mission : 'moon');

  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  // סדר התורות נשמר לפי סדר הכרטיסים במסך
  const ordered = players.filter((p) => selected.includes(p.id));
  const canStart = ordered.length >= 2;
  const total = ordered.length * rounds;
  const goal = teamMilestones(Math.max(total, 1));
  const m = missions[mission];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-4 pt-4 sm:px-6">
      <header className="mb-3 flex items-center gap-3">
        <h1 className="flex-1 text-3xl font-bold text-slate-700 sm:text-4xl">משחק משפחתי 🚀</h1>
        <HomeButton onClick={onBack} />
      </header>

      <p className="mb-5 text-lg font-medium leading-snug text-slate-600">משחקים יחד – כל תשובה נכונה מקרבת את כולם ליעד 🚀</p>

      <section className="mb-5">
        <h2 className="mb-2 text-xl font-bold text-slate-600">מי משתתף?</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {players.map((p) => {
            const on = selected.includes(p.id);
            const t = getTheme(p.theme);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={on}
                className={`relative flex flex-col items-center rounded-3xl border-4 bg-white px-1 py-2 transition min-[360px]:px-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 sm:p-4 ${
                  on ? `${t.border} shadow-pop-sm` : 'border-transparent opacity-50 grayscale'
                }`}
              >
                {on && (
                  <span className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white sm:left-2 sm:top-2 sm:h-8 sm:w-8">
                    <Check size={18} strokeWidth={3} />
                  </span>
                )}
                <Avatar avatar={p.avatar} theme={p.theme} size="md" />
                <span className={`mt-1 max-w-full break-words text-center font-bold leading-tight ${p.name.length > 9 ? 'text-sm min-[360px]:text-base sm:text-lg' : 'text-lg sm:text-xl'} ${t.text}`}>
                  {p.name}
                </span>
                <span className="text-sm text-slate-600">
                  {difficultyInfo[p.difficulty]?.emoji} {difficultyInfo[p.difficulty]?.label}
                </span>
              </button>
            );
          })}
        </div>
        {!canStart && <p className="mt-2 text-center font-bold text-rose-600">צריך לפחות שני שחקנים</p>}
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-xl font-bold text-slate-600">לאן יוצאים?</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {missionList.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setMission(x.id)}
              aria-pressed={mission === x.id}
              className={`rounded-3xl border-4 bg-white p-2 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 sm:p-4 ${
                mission === x.id ? 'border-sky-400 shadow-pop-sm' : 'border-transparent hover:border-slate-200'
              }`}
            >
              <div className="text-3xl sm:text-4xl" aria-hidden="true">
                {x.mover}
                {x.goal}
              </div>
              <div className="mt-1 text-base font-bold leading-tight text-slate-700 sm:text-lg">{x.name}</div>
              <div className="hidden text-sm text-slate-600 sm:block">{x.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-4">
        <h2 className="mb-2 text-xl font-bold text-slate-600">כמה שאלות לכל שחקן?</h2>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {roundOptions.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRounds(r.value)}
              aria-pressed={rounds === r.value}
              className={`rounded-2xl border-4 bg-white px-4 py-3 font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 sm:px-5 ${
                rounds === r.value ? 'border-sky-400 text-sky-700' : 'border-transparent text-slate-600 hover:border-slate-200'
              }`}
            >
              {r.label} · {r.value}
            </button>
          ))}
        </div>
        {canStart && (
          <p className="mt-2 text-base font-bold text-slate-600">
            סה״כ {total} שאלות + שאלת בוס 👾 · בערך {estimateMinutes(total + 1)} דקות
          </p>
        )}
      </section>

      <ul className="mb-4 space-y-1 rounded-3xl bg-white/70 p-3 text-base font-medium text-slate-700">
        {canStart && (
          <>
            <li>
              🎯 המטרה: {goal.silver} תשובות נכונות {m.goal}
            </li>
            <li>
              🏅 מדליות: 🥉 {goal.bronze} · 🥈 {goal.silver} · 🥇 {goal.gold}
            </li>
          </>
        )}
        <li>✂️ לכל שחקן עזרה אחת שמורידה תשובות לא נכונות</li>
      </ul>

      {/* כפתור ההתחלה תמיד נראה בתחתית המסך */}
      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-white via-white/95 to-white/0 px-4 pb-4 pt-4 sm:-mx-6 sm:px-6">
        <button
          type="button"
          disabled={!canStart}
          onClick={() => onStart({ playerIds: ordered.map((p) => p.id), rounds, mission })}
          className="btn w-full bg-gradient-to-l from-violet-500 to-sky-500 py-5 text-2xl text-white"
        >
          <Play size={26} className="fill-white" />
          יוצאים למשימה!
        </button>
      </div>
    </main>
  );
}
