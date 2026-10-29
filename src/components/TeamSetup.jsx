import { useState } from 'react';
import { Check, Play } from 'lucide-react';
import Avatar from './Avatar';
import HomeButton from './HomeButton';
import { getTheme } from '../data/themes';
import { g } from '../data/profiles';
import { missionList, missionPoints, missions, teamMilestones } from '../data/missions';
import { estimateMinutes } from '../utils/game';
import { Mover } from './MissionTrack';
import { DUEL_ROUNDS } from '../utils/modes';

const roundOptions = [
  { value: 3, label: 'קצר' },
  { value: 4, label: 'רגיל' },
  { value: 6, label: 'ארוך' },
];

const modeBase =
  'flex min-h-[4rem] flex-col items-center justify-center rounded-2xl px-2 py-2 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 short:min-h-[3rem] short:flex-row short:gap-2';
const modeIdle = 'border-2 border-slate-200 bg-white text-slate-700';

/**
 * הגדרות המשחק המשפחתי, ובראשן בורר "🤝 ביחד / ⚔️ אתגר".
 * האתגר זמין רק כשנבחרו בדיוק 2 שחקנים. הבחירה לא נשמרת – המסך תמיד נפתח על "ביחד",
 * והגדרות האתגר לא נוגעות בהגדרות השמורות של המשחק המשפחתי.
 */
export default function TeamSetup({ players, initial, onStart, onStartDuel, onBack }) {
  const [mode, setMode] = useState('team');
  const [hint, setHint] = useState('');
  const [selected, setSelected] = useState(() => {
    const saved = (initial?.playerIds || []).filter((id) => players.some((p) => p.id === id));
    // אם כל השחקנים השמורים נמחקו – מתחילים עם כולם
    return saved.length ? saved : players.map((p) => p.id);
  });
  const [rounds, setRounds] = useState(initial?.rounds || 4);
  const [mission, setMission] = useState(missions[initial?.mission] ? initial.mission : 'moon');

  const toggle = (id) => {
    setHint('');
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };
  const chooseDuel = () => {
    if (!duelBlocked) return setMode('duel');
    const extra = n - 2;
    return setHint(n < 2 ? '⚔️ לאתגר בוחרים בדיוק 2 שחקנים' : `⚔️ לאתגר משחקים בדיוק 2 – הורידו ${extra === 1 ? 'שחקן אחד' : `${extra} שחקנים`}`);
  };
  const chooseTeam = () => {
    setHint('');
    setMode('team');
  };
  // סדר התורות נשמר לפי סדר הכרטיסים במסך
  const ordered = players.filter((p) => selected.includes(p.id));
  const n = ordered.length;
  const isDuel = mode === 'duel';
  const duelOk = n === 2;
  // האתגר לא זמין רק כשעוד לא בחרו בו (מי שכבר באתגר נשאר בו, וכפתור ההתחלה מסביר)
  const duelBlocked = !isDuel && !duelOk;
  const canStart = isDuel ? duelOk : n >= 2;
  const total = ordered.length * rounds;
  // המדליות נספרות בצעדים – כולל שני הצעדים של שאלת הבוס (כמו במשחק עצמו)
  const goal = teamMilestones(missionPoints(Math.max(total, 1)));
  const m = missions[mission];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-4 pt-4 sm:px-6">
      <header className="mb-3 flex items-center gap-3">
        <h1 className="flex flex-1 flex-wrap items-center gap-x-2 text-3xl font-bold text-slate-700 sm:text-4xl">
          {isDuel ? 'אתגר' : 'משחק משפחתי'}{' '}
          <span className="shrink-0" aria-hidden="true">
            {isDuel ? '⚔️' : '🚀'}
          </span>
        </h1>
        <HomeButton onClick={onBack} />
      </header>

      <p className="mb-5 text-lg font-medium leading-snug text-slate-600">
        {isDuel ? 'שניים, זה מול זה – כל אחד ברמה שלו. מי יענה נכון על יותר?' : 'משחקים יחד – כל תשובה נכונה מקרבת את כולם ליעד 🚀'}
      </p>

      <section className="mb-5">
        <h2 id="team-mode-title" className="mb-2 text-xl font-bold text-slate-600">
          איך משחקים?
        </h2>
        <div className="grid grid-cols-2 gap-2 rounded-3xl bg-white/70 p-1.5 sm:gap-3" role="radiogroup" aria-labelledby="team-mode-title">
          <button
            type="button"
            role="radio"
            aria-checked={!isDuel}
            onClick={chooseTeam}
            className={`${modeBase} ${!isDuel ? 'bg-gradient-to-l from-violet-700 to-indigo-600 text-white shadow-pop-sm' : modeIdle}`}
          >
            <span className="text-xl font-bold">🤝 ביחד</span>
            <span className="text-sm font-medium">כולם בצוות אחד</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isDuel}
            aria-disabled={duelBlocked || undefined}
            aria-describedby={hint ? 'team-mode-hint' : undefined}
            onClick={chooseDuel}
            className={`${modeBase} ${
              isDuel ? 'bg-gradient-to-l from-orange-700 to-rose-700 text-white shadow-pop-sm' : duelBlocked ? 'border-2 border-dashed border-slate-300 bg-slate-100 text-slate-600' : modeIdle
            }`}
          >
            <span className="text-xl font-bold">⚔️ אתגר</span>
            <span className="text-sm font-medium">{duelBlocked ? 'רק כששניים משתתפים' : 'שניים, זה מול זה'}</span>
          </button>
        </div>
        <p id="team-mode-hint" role="status" className="mt-2 text-base font-bold text-amber-900 empty:hidden">
          {hint}
        </p>
      </section>

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
                  on ? `${t.border} shadow-pop-sm` : 'border-dashed border-slate-300'
                }`}
              >
                {on && (
                  <span className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white sm:left-2 sm:top-2 sm:h-8 sm:w-8" aria-hidden="true">
                    <Check size={18} strokeWidth={3} />
                  </span>
                )}
                <Avatar avatar={p.avatar} theme={p.theme} size="md" />
                <span className={`mt-1 max-w-full break-words text-center font-bold leading-tight ${p.name.length > 9 ? 'text-sm min-[360px]:text-base sm:text-lg' : 'text-lg sm:text-xl'} ${t.text}`}>
                  {p.name}
                </span>
                {!on && <span className="text-sm font-bold text-slate-600">{g(p, 'לא משתתף', 'לא משתתפת')}</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* במשחק המשפחתי: יעד המשימה ומספר השאלות (באתגר – תמיד 5 לכל אחד) */}
      {!isDuel && (
        <>
          <section className="mb-5">
            <h2 id="team-mission-title" className="mb-2 text-xl font-bold text-slate-600">
              לאן יוצאים?
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-labelledby="team-mission-title">
              {missionList.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setMission(x.id)}
                  role="radio"
                  aria-checked={mission === x.id}
                  className={`rounded-3xl border-4 bg-white p-2 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 sm:p-4 ${
                    mission === x.id ? 'border-sky-400 shadow-pop-sm' : 'border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="text-3xl sm:text-4xl" aria-hidden="true">
                    <Mover mission={x} />
                    {x.goal}
                  </div>
                  <div className="mt-1 text-base font-bold leading-tight text-slate-700 sm:text-lg">{x.name}</div>
                  <div className="hidden text-sm text-slate-600 sm:block">{x.description}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="mb-4">
            <h2 id="team-rounds-title" className="mb-2 text-xl font-bold text-slate-600">
              כמה שאלות לכל שחקן?
            </h2>
            <div className="flex flex-wrap gap-2 sm:gap-3" role="radiogroup" aria-labelledby="team-rounds-title">
              {roundOptions.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRounds(r.value)}
                  role="radio"
                  aria-checked={rounds === r.value}
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
                  🎯 המטרה: {goal.silver} תשובות נכונות {m.goal} (בוס 👾 = 2)
                </li>
                <li>
                  🏅 מדליות: 🥉 {goal.bronze} · 🥈 {goal.silver} · 🥇 {goal.gold}
                </li>
              </>
            )}
            <li>✂️ לכל שחקן עזרה אחת שמורידה תשובות לא נכונות</li>
          </ul>
        </>
      )}

      {isDuel && (
        <ul className="mb-4 space-y-1 rounded-3xl bg-white/70 p-3 text-base font-medium text-slate-700 animate-fade-in">
          {duelOk && (
            <li className="font-bold">
              {ordered[0].name} 🆚 {ordered[1].name} · {ordered[0].name} {g(ordered[0], 'מתחיל', 'מתחילה')}
            </li>
          )}
          <li>⚔️ {DUEL_ROUNDS} שאלות לכל אחד, כל אחד ברמה שלו</li>
          <li>✂️ לכל שחקן עזרה אחת</li>
          <li>🏆 מי שעונה נכון על יותר – מנצח. תיקו? שניכם מנצחים!</li>
          <li>⏱️ בערך {estimateMinutes(DUEL_ROUNDS * 2)} דקות</li>
        </ul>
      )}

      {/* כפתור ההתחלה תמיד נראה בתחתית המסך */}
      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-white via-white/95 to-white/0 px-4 pb-4 pt-4 sm:-mx-6 sm:px-6">
        {isDuel ? (
          <button
            type="button"
            disabled={!canStart}
            onClick={() => onStartDuel({ playerIds: ordered.map((p) => p.id) })}
            className="btn w-full bg-gradient-to-l from-orange-700 to-rose-700 py-5 text-2xl text-white disabled:bg-none"
          >
            {canStart ? '⚔️ מתחילים אתגר!' : 'לאתגר בוחרים בדיוק 2 שחקנים'}
          </button>
        ) : (
          <button
            type="button"
            disabled={!canStart}
            onClick={() => onStart({ playerIds: ordered.map((p) => p.id), rounds, mission })}
            className="btn w-full bg-gradient-to-l from-violet-700 to-indigo-600 py-5 text-2xl text-white disabled:bg-none"
          >
            {canStart ? (
              <>
                <Play size={26} className="fill-white" />
                יוצאים למשימה!
              </>
            ) : (
              'בחרו לפחות 2 שחקנים'
            )}
          </button>
        )}
      </div>
    </main>
  );
}
