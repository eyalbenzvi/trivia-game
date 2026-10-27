import { Check, Volume2, X } from 'lucide-react';
import { getCategoryMeta } from '../data/questions';

const optionStyles = [
  'bg-sky-100 border-sky-300 text-sky-900 hover:bg-sky-200',
  'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200',
  'bg-violet-100 border-violet-300 text-violet-900 hover:bg-violet-200',
  'bg-pink-100 border-pink-300 text-pink-900 hover:bg-pink-200',
];
const badgeStyles = ['bg-sky-400', 'bg-amber-400', 'bg-violet-400', 'bg-pink-400'];
export const OPTION_LETTERS = ['א', 'ב', 'ג', 'ד'];

function OptionButton({ text, emoji, index, state, locked, onSelect, onSpeak, visual }) {
  const stateClass =
    state === 'correct'
      ? 'bg-emerald-400 border-emerald-500 text-white ring-4 ring-emerald-200 scale-[1.03] animate-celebrate'
      : state === 'wrong'
        ? 'bg-rose-200 border-rose-400 text-rose-900 animate-shake'
        : state === 'dim'
          ? `${optionStyles[index]} opacity-45`
          : state === 'removed'
            ? 'bg-slate-100 border-slate-200 text-slate-500 opacity-60 line-through scale-95'
            : state === 'frozen'
              ? `${optionStyles[index]} opacity-70`
              : `${optionStyles[index]} hover:-translate-y-1 hover:shadow-pop active:translate-y-0.5 active:shadow-none`;

  return (
    // כפתור ההקראה יושב ליד התשובה (לא עליה) – כדי שילד לא יבחר תשובה בטעות כשהוא רוצה לשמוע אותה
    <div className={onSpeak ? `flex items-center gap-2 ${visual ? 'sm:flex-col sm:items-stretch' : ''}` : ''}>
      <button
        type="button"
        onClick={() => onSelect(index)}
        disabled={locked || state === 'removed' || state === 'frozen'}
        aria-label={text}
        title={`מקש ${index + 1} / ${OPTION_LETTERS[index]}`}
        className={`relative flex w-full min-w-0 flex-1 items-center rounded-3xl border-4 shadow-pop-sm transition duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 disabled:cursor-default ${
          visual
            ? 'min-h-[7.5rem] gap-4 px-4 py-2 text-start [@media(min-height:740px)_and_(max-width:639px)]:min-h-[9rem] sm:min-h-[16rem] sm:flex-col sm:justify-center sm:gap-3 sm:px-3 sm:py-3 sm:text-center'
            : 'min-h-[3.5rem] gap-3 px-3 py-2.5 text-start sm:min-h-[5rem] sm:gap-4 sm:px-4 sm:py-4'
        } ${stateClass}`}
      >
        {visual ? (
          <>
            <span className="shrink-0 text-7xl leading-none drop-shadow-sm sm:text-8xl" aria-hidden="true">
              {state === 'removed' ? '✂️' : emoji}
            </span>
            <span className="text-2xl font-bold leading-tight sm:text-3xl">{text}</span>
          </>
        ) : (
          <>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-black sm:h-11 sm:w-11 sm:rounded-2xl sm:text-xl text-white ${
                state === 'correct' ? 'bg-emerald-600' : state === 'wrong' ? 'bg-rose-500' : state === 'removed' ? 'bg-slate-300' : badgeStyles[index]
              }`}
              aria-hidden="true"
            >
              {state === 'correct' ? (
                <Check size={26} strokeWidth={3.5} />
              ) : state === 'wrong' ? (
                <X size={26} strokeWidth={3.5} />
              ) : state === 'removed' ? (
                '✂️'
              ) : (
                OPTION_LETTERS[index]
              )}
            </span>
            <span className="text-lg font-bold leading-snug sm:text-2xl">{text}</span>
          </>
        )}
        {visual && (state === 'correct' || state === 'wrong') && (
          <span
            className={`absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-white animate-pop sm:left-auto sm:right-3 sm:top-3 sm:h-10 sm:w-10 ${
              state === 'correct' ? 'bg-emerald-600' : 'bg-rose-500'
            }`}
          >
            {state === 'correct' ? <Check size={24} strokeWidth={3.5} /> : <X size={24} strokeWidth={3.5} />}
          </span>
        )}
      </button>
      {onSpeak && (
        <button
          type="button"
          onClick={() => onSpeak(text)}
          disabled={locked || state === 'removed'}
          className={`flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full bg-white text-sky-600 shadow-pop-sm ring-2 ring-sky-100 transition hover:bg-sky-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 sm:h-12 sm:w-12 ${
            locked || state === 'removed' ? 'invisible' : ''
          }`}
          aria-label={`הקראת התשובה ${text}`}
        >
          <Volume2 size={22} />
        </button>
      )}
    </div>
  );
}

/**
 * כרטיס שאלה.
 * tag – תגית על הבאנר (סבב בונוס / שאלת אלוף / שאלת חזרה).
 * status – מוצג במקום כפתור ההקראה (משוב אחרי תשובה, "רגע, חושבים"), כך שהוא לא מסתיר תשובות או כפתורים.
 * tools – שורה מעל התשובות (למשל "חצי-חצי").
 * frozen – התשובות נעולות לרגע בלי לחשוף את התשובה.
 */
export default function QuestionCard({
  question,
  selected,
  removed = [],
  onSelect,
  onRead,
  onSpeakOption,
  speaking,
  speechSupported,
  visual,
  tag,
  status,
  tools,
  frozen = false,
}) {
  const meta = getCategoryMeta(question.category);
  const locked = selected !== null;

  const stateFor = (i) => {
    if (!locked) return removed.includes(i) ? 'removed' : frozen ? 'frozen' : 'idle';
    if (i === question.correctIndex) return 'correct';
    if (i === selected) return 'wrong';
    return 'dim';
  };

  return (
    <div className="card overflow-hidden border-4 border-white animate-slide-up">
      {/* בבאנר מוצג אייקון הנושא בלבד – איור השאלה מופיע רק אחרי שעונים, כדי שלא יסגיר את התשובה */}
      <div className={`relative flex items-center justify-between gap-2 bg-gradient-to-l ${meta.banner} px-4 py-2 sm:px-7 sm:py-4`}>
        <span className="text-4xl drop-shadow-md sm:text-6xl" aria-hidden="true">
          {meta.emoji}
        </span>
        {tag}
        <span className={`rounded-full px-3 py-1 text-sm font-bold shadow-sm sm:px-4 sm:py-1.5 sm:text-base ${meta.chip}`}>{question.category}</span>
      </div>

      <div className="p-3 sm:p-8">
        <div className="mb-3 flex flex-col items-center gap-2 text-center sm:mb-6 sm:gap-4">
          <h2 className={`font-bold leading-snug text-slate-800 ${visual ? 'text-2xl sm:text-4xl' : question.question.length > 70 ? 'text-lg sm:text-2xl' : 'text-xl sm:text-3xl'}`}>
            {question.question}
          </h2>
          <div className={`flex w-full items-center justify-center ${visual ? 'min-h-[3.25rem] sm:min-h-[4rem]' : 'min-h-[2.75rem] sm:min-h-[3.5rem]'}`}>
            {status ||
              (speechSupported && (
                <button
                  type="button"
                  onClick={onRead}
                  className={`btn bg-sky-500 text-white hover:bg-sky-600 ${speaking ? 'animate-pulse' : ''} ${visual ? 'px-6 py-3 text-lg sm:px-7 sm:py-4 sm:text-xl' : 'px-4 py-2 text-base sm:px-5 sm:py-3'}`}
                >
                  <Volume2 size={visual ? 26 : 20} />
                  הקראת השאלה
                </button>
              ))}
          </div>
        </div>

        {tools && <div className="mb-3 flex justify-center sm:mb-4">{tools}</div>}

        <div className={`grid gap-2 sm:gap-4 ${visual ? 'grid-cols-1 sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
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

/** הודעת משוב קצרה בתוך הכרטיס (במקום "טוסט" צף שמסתיר תשובות) */
export function FeedbackPill({ tone = 'good', children }) {
  const cls =
    tone === 'good'
      ? 'bg-emerald-500 text-white'
      : tone === 'think'
        ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-200'
        : tone === 'info'
          ? 'bg-sky-100 text-sky-800 ring-2 ring-sky-200'
          : 'bg-white text-rose-500 ring-2 ring-rose-200';
  return (
    <div role="status" className={`inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 rounded-full px-5 py-2 text-center text-lg font-bold shadow-pop-sm animate-pop sm:text-2xl ${cls}`}>
      {children}
    </div>
  );
}

/** "שאלה מקשי המקלדת": 1–4 או א–ד. מחזיר אינדקס או -1 */
export const keyToOption = (e, count) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return -1;
  const t = e.target;
  if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return -1;
  const n = Number(e.key);
  if (Number.isInteger(n) && n >= 1 && n <= count) return n - 1;
  const li = OPTION_LETTERS.indexOf(e.key);
  return li >= 0 && li < count ? li : -1;
};
