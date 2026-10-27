import { Check, Volume2, X } from 'lucide-react';
import { getCategoryMeta } from '../data/questions';

const optionStyles = [
  'bg-sky-100 border-sky-300 text-sky-900 hover:bg-sky-200',
  'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200',
  'bg-violet-100 border-violet-300 text-violet-900 hover:bg-violet-200',
  'bg-pink-100 border-pink-300 text-pink-900 hover:bg-pink-200',
];
const badgeStyles = ['bg-sky-400', 'bg-amber-400', 'bg-violet-400', 'bg-pink-400'];
const letters = ['א', 'ב', 'ג', 'ד'];

function OptionButton({ text, emoji, index, state, locked, onSelect, onSpeak, visual }) {
  const stateClass =
    state === 'correct'
      ? 'bg-emerald-400 border-emerald-500 text-white ring-4 ring-emerald-200 scale-[1.03] animate-celebrate'
      : state === 'wrong'
        ? 'bg-rose-200 border-rose-400 text-rose-900 animate-shake'
        : state === 'dim'
          ? `${optionStyles[index]} opacity-45`
          : state === 'removed'
            ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-40 line-through scale-95'
          : `${optionStyles[index]} hover:-translate-y-1 hover:shadow-pop active:translate-y-0.5 active:shadow-none`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onSelect(index)}
        disabled={locked || state === 'removed'}
        aria-label={text}
        className={`flex w-full items-center rounded-3xl border-4 shadow-pop-sm transition duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 disabled:cursor-default ${
          visual ? 'min-h-[7.5rem] flex-col justify-center gap-1 px-1 py-3 sm:min-h-[12rem] sm:gap-3 sm:px-3' : 'min-h-[3.5rem] gap-3 px-3 py-2.5 text-start sm:min-h-[5rem] sm:gap-4 sm:px-4 sm:py-4'
        } ${stateClass}`}
      >
        {visual ? (
          <>
            <span className="text-5xl leading-none drop-shadow-sm sm:text-7xl" aria-hidden="true">
              {emoji}
            </span>
            <span className="text-lg font-bold leading-tight sm:text-3xl">{text}</span>
          </>
        ) : (
          <>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-black sm:h-11 sm:w-11 sm:rounded-2xl sm:text-xl text-white ${
                state === 'correct' ? 'bg-emerald-600' : state === 'wrong' ? 'bg-rose-500' : badgeStyles[index]
              }`}
              aria-hidden="true"
            >
              {state === 'correct' ? <Check size={26} strokeWidth={3.5} /> : state === 'wrong' ? <X size={26} strokeWidth={3.5} /> : letters[index]}
            </span>
            <span className="text-lg font-bold leading-snug sm:text-2xl">{text}</span>
          </>
        )}
        {visual && (state === 'correct' || state === 'wrong') && (
          <span
            className={`absolute right-1.5 top-1.5 flex h-8 w-8 sm:right-3 sm:top-3 sm:h-10 sm:w-10 items-center justify-center rounded-full text-white animate-pop ${
              state === 'correct' ? 'bg-emerald-600' : 'bg-rose-500'
            }`}
          >
            {state === 'correct' ? <Check size={24} strokeWidth={3.5} /> : <X size={24} strokeWidth={3.5} />}
          </span>
        )}
      </button>
      {onSpeak && !locked && state !== 'removed' && (
        <button
          type="button"
          onClick={() => onSpeak(text)}
          className="absolute left-1 top-1 flex h-8 w-8 items-center sm:left-2 sm:top-2 sm:h-10 sm:w-10 justify-center rounded-full bg-white/80 text-slate-600 shadow transition hover:bg-white hover:text-sky-600"
          aria-label={`הקראת התשובה ${text}`}
        >
          <Volume2 size={20} />
        </button>
      )}
    </div>
  );
}

export default function QuestionCard({ question, selected, removed = [], onSelect, onRead, onSpeakOption, speaking, speechSupported, visual }) {
  const meta = getCategoryMeta(question.category);
  const locked = selected !== null;

  const stateFor = (i) => {
    if (!locked) return removed.includes(i) ? 'removed' : 'idle';
    if (i === question.correctIndex) return 'correct';
    if (i === selected) return 'wrong';
    return 'dim';
  };

  return (
    <div className="card overflow-hidden border-4 border-white animate-slide-up">
      {/* בבאנר מוצג אייקון הנושא בלבד – איור השאלה מופיע רק אחרי שעונים, כדי שלא יסגיר את התשובה */}
      <div className={`relative flex items-center justify-between gap-3 bg-gradient-to-l ${meta.banner} px-4 py-2 sm:px-7 sm:py-4`}>
        <span className="text-4xl drop-shadow-md sm:text-6xl" aria-hidden="true">
          {meta.emoji}
        </span>
        <span className={`rounded-full px-3 py-1 text-sm font-bold shadow-sm sm:px-4 sm:py-1.5 sm:text-base ${meta.chip}`}>{question.category}</span>
        <span className="absolute bottom-1 left-24 hidden text-2xl opacity-60 sm:block" aria-hidden="true">
          ✨
        </span>
      </div>

      <div className="p-3 sm:p-8">
        <div className="mb-4 flex flex-col items-center gap-3 text-center sm:mb-6 sm:gap-4">
          <h2 className={`font-bold leading-snug text-slate-800 ${visual ? 'text-2xl sm:text-4xl' : question.question.length > 70 ? 'text-lg sm:text-2xl' : 'text-xl sm:text-3xl'}`}>
            {question.question}
          </h2>
          {speechSupported && (
            <button
              type="button"
              onClick={onRead}
              className={`btn bg-sky-500 text-white hover:bg-sky-600 ${speaking ? 'animate-pulse' : ''} ${visual ? 'px-6 py-3 text-lg sm:px-7 sm:py-4 sm:text-xl' : 'px-4 py-2 text-base sm:px-5 sm:py-3'}`}
            >
              <Volume2 size={visual ? 26 : 20} />
              הקראת השאלה
            </button>
          )}
        </div>

        <div className={`grid gap-2 sm:gap-4 ${visual ? 'grid-cols-3' : 'sm:grid-cols-2'}`}>
          {question.options.map((opt, i) => (
            <OptionButton
              key={`${question.id}-${opt}`}
              text={opt}
              emoji={question.optionEmojis?.[i]}
              index={i}
              state={stateFor(i)}
              locked={locked}
              onSelect={onSelect}
              onSpeak={onSpeakOption}
              visual={visual}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
