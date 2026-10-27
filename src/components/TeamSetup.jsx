import { useState } from 'react';
import { ArrowRight, Check, Play } from 'lucide-react';
import Avatar from './Avatar';
import { getTheme } from '../data/themes';
import { difficultyInfo } from '../data/profiles';
import { missionList } from '../data/missions';
import { TEAM_LIFELINES } from './Game';

const roundOptions = [
  { value: 3, label: 'קצר' },
  { value: 4, label: 'רגיל' },
  { value: 6, label: 'ארוך' },
];

export default function TeamSetup({ players, initial, onStart, onBack }) {
  const [selected, setSelected] = useState(() => initial?.playerIds?.filter((id) => players.some((p) => p.id === id)) || players.map((p) => p.id));
  const [rounds, setRounds] = useState(initial?.rounds || 4);
  const [mission, setMission] = useState(initial?.mission || 'moon');

  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  // סדר התורות נשמר לפי סדר הכרטיסים במסך
  const ordered = players.filter((p) => selected.includes(p.id));
  const canStart = ordered.length >= 2;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-4 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="חזרה">
          <ArrowRight size={26} />
        </button>
        <h1 className="flex-1 text-3xl font-bold text-slate-700 sm:text-4xl">משימה משפחתית</h1>
      </header>

      <p className="card mb-6 p-5 text-lg leading-relaxed text-slate-600">
        כולם משחקים ביחד, בצוות אחד! בכל שאלה מגיע תורו של שחקן אחר, וכל אחד מקבל שאלה ברמה שמתאימה לו. כל תשובה נכונה מקדמת את
        כל הצוות אל היעד. יש לצוות גם {TEAM_LIFELINES} עזרות "חצי-חצי" ✂️ שמורידות תשובות שגויות.
      </p>

      <section className="mb-6">
        <h2 className="mb-3 text-xl font-bold text-slate-600">מי משתתף?</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {players.map((p) => {
            const on = selected.includes(p.id);
            const t = getTheme(p.theme);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={on}
                className={`relative flex flex-col items-center rounded-3xl border-4 bg-white p-4 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
                  on ? `${t.border} shadow-pop-sm` : 'border-transparent opacity-50 grayscale'
                }`}
              >
                {on && (
                  <span className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check size={20} strokeWidth={3} />
                  </span>
                )}
                <Avatar avatar={p.avatar} theme={p.theme} size="md" />
                <span className={`mt-2 text-xl font-bold ${t.text}`}>{p.name}</span>
                <span className="text-sm text-slate-500">
                  {difficultyInfo[p.difficulty]?.emoji} {difficultyInfo[p.difficulty]?.label}
                </span>
              </button>
            );
          })}
        </div>
        {!canStart && <p className="mt-2 text-center font-bold text-rose-500">צריך לפחות שני שחקנים</p>}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-xl font-bold text-slate-600">לאן יוצאים?</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {missionList.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMission(m.id)}
              aria-pressed={mission === m.id}
              className={`rounded-3xl border-4 bg-white p-4 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
                mission === m.id ? 'border-sky-400 shadow-pop-sm' : 'border-transparent hover:border-slate-200'
              }`}
            >
              <div className="text-4xl">
                {m.mover} {m.goal}
              </div>
              <div className="mt-1 text-lg font-bold text-slate-700">{m.name}</div>
              <div className="text-sm text-slate-500">{m.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-slate-600">כמה שאלות לכל שחקן?</h2>
        <div className="flex flex-wrap gap-3">
          {roundOptions.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRounds(r.value)}
              aria-pressed={rounds === r.value}
              className={`rounded-2xl border-4 bg-white px-5 py-3 font-bold transition ${
                rounds === r.value ? 'border-sky-400 text-sky-700' : 'border-transparent text-slate-600 hover:border-slate-200'
              }`}
            >
              {r.label} · {r.value} שאלות
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        disabled={!canStart}
        onClick={() => onStart({ playerIds: ordered.map((p) => p.id), rounds, mission })}
        className="btn w-full bg-gradient-to-l from-violet-500 to-sky-500 py-5 text-2xl text-white"
      >
        <Play size={26} className="fill-white" />
        יוצאים למשימה!
      </button>
    </main>
  );
}
