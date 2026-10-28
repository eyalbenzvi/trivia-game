import Avatar from './Avatar';
import { getTheme } from '../data/themes';

const EMPTY = { correct: 0, answered: 0 };

/** נקודות ההתקדמות: קודם התשובות הנכונות (ירוק), אחר כך שאלות שנענו (אפור), ואז מה שנשאר (ריק) */
function Pips({ correct, answered, rounds, size }) {
  return (
    <span className={`flex ${size === 'full' ? 'mt-1 gap-1' : 'mt-0.5 gap-[3px] sm:gap-1'}`} aria-hidden="true">
      {Array.from({ length: rounds }, (_, i) => (
        <span
          key={i}
          className={`rounded-full ${size === 'full' ? 'h-3 w-3' : 'h-2 w-2 sm:h-2.5 sm:w-2.5'} ${
            i < correct ? 'bg-emerald-600' : i < answered ? 'bg-slate-400' : 'bg-white ring-1 ring-inset ring-slate-400'
          }`}
        />
      ))}
    </span>
  );
}

/**
 * לוח התוצאות של האתגר: שני השחקנים זה מול זה, מי בתור, וכמה תשובות נכונות.
 * variant='bar' – בראש מסך השאלה; variant='full' – במסך "התור של…".
 * המספרים מוקראים לקורא מסך; הנקודות והתמונות רק לעין.
 */
export default function DuelScoreboard({ players, perPlayer, rounds, activeId, variant = 'bar' }) {
  const full = variant === 'full';
  const side = (p) => {
    const t = getTheme(p.theme);
    const s = perPlayer[p.id] || EMPTY;
    const active = p.id === activeId;
    const sr = `${p.name}: ${s.correct} נכונות מתוך ${s.answered}${active ? ', התור עכשיו' : ''}`;
    const colors = active ? `${t.border} ${t.soft} shadow-pop-sm` : 'border-transparent bg-slate-50';
    if (full) {
      return (
        <div key={p.id} className={`flex min-w-0 flex-col items-center rounded-3xl border-4 p-3 short:flex-row short:gap-2 short:p-1.5 ${colors}`}>
          <span className="sr-only">{sr}</span>
          <Avatar avatar={p.avatar} theme={p.theme} size="md" decorative className="short:hidden" />
          <Avatar avatar={p.avatar} theme={p.theme} size="xs" decorative className="hidden short:block" />
          <span className="flex min-w-0 flex-col items-center" aria-hidden="true">
            <span className={`mt-1 max-w-full truncate text-lg font-bold leading-tight short:mt-0 ${t.text}`}>{p.name}</span>
            <Pips correct={s.correct} answered={s.answered} rounds={rounds} size="full" />
          </span>
          <span key={s.correct} className={`mt-1 inline-block text-5xl font-black tabular-nums leading-none animate-pop short:mt-0 short:text-3xl ${t.text}`} aria-hidden="true">
            {s.correct}
          </span>
        </div>
      );
    }
    return (
      <div key={p.id} className={`flex min-w-0 items-center gap-1.5 rounded-2xl border-2 px-1.5 py-1 sm:gap-2 sm:px-3 sm:py-1.5 short:py-0.5 ${colors}`}>
        <span className="sr-only">{sr}</span>
        <Avatar avatar={p.avatar} theme={p.theme} size="xs" decorative />
        <span className="min-w-0 flex-1" aria-hidden="true">
          <span className={`block truncate text-sm font-bold leading-tight sm:text-base ${t.text}`}>{p.name}</span>
          <Pips correct={s.correct} answered={s.answered} rounds={rounds} />
        </span>
        <span key={s.correct} className={`inline-block shrink-0 text-2xl font-black tabular-nums leading-none animate-pop sm:text-3xl ${t.text}`} aria-hidden="true">
          {s.correct}
        </span>
      </div>
    );
  };

  if (full) {
    return (
      <div className="grid w-full max-w-md grid-cols-[1fr_auto_1fr] items-center gap-2" role="group" aria-label="התוצאה">
        {side(players[0])}
        <span className="text-3xl short:text-2xl" aria-hidden="true">
          🆚
        </span>
        {side(players[1])}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:gap-3" role="group" aria-label="לוח התוצאות">
      {players.map(side)}
    </div>
  );
}
