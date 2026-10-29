import { useEffect, useRef, useState } from 'react';
import { Check, Eye, Home, RotateCcw, Volume2 } from 'lucide-react';
import Avatar from './Avatar';
import Modal from './Modal';
import ActionBar from './ActionBar';
import HomeButton from './HomeButton';
import SpeakingBars from './SpeakingBars';
import { useSpeech } from '../hooks/useSpeech';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getTheme } from '../data/themes';
import { difficultyInfo, g } from '../data/profiles';
import { GROUPS, LEVELS, itemById, itemPool, pickItem } from '../data/items';
import { setLeaveGuard } from '../utils/nav';
import { celebrate, clearConfetti } from '../utils/confetti';
import { playClick, playFanfare, playUnlock } from '../utils/sound';

// "20 שאלות – מצב מנחה": משחק בעל-פה. השומר רואה פריט סודי, כולם שואלים שאלות כן/לא,
// והאפליקציה רק סופרת. בלי כוכבים, בלי היסטוריית שאלות ובלי ענן.
const MAX = 20;
// פריטים אחרונים שלא יחזרו מהר (רק המזהים, רק במכשיר)
const RECENT_MAX = 40;
const STORAGE_KEY = 'family-trivia:twenty';
const reviveStore = (v) => ({
  level: LEVELS.includes(v?.level) ? v.level : null,
  recent: Array.isArray(v?.recent) ? v.recent.filter((id) => typeof id === 'string' && itemById[id]).slice(-RECENT_MAX) : [],
});

const ANSWERS = {
  yes: { word: 'כן', emoji: '👍', btn: 'bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900', pill: 'bg-emerald-50 text-emerald-800' },
  no: { word: 'לא', emoji: '👎', btn: 'bg-rose-700 text-white hover:bg-rose-800 active:bg-rose-900', pill: 'bg-rose-50 text-rose-800' },
  sometimes: { word: 'לפעמים', emoji: '🤷', btn: 'bg-amber-300 text-amber-950 hover:bg-amber-400 active:bg-amber-500', pill: 'bg-amber-50 text-amber-900' },
};

const RULES_SPEECH = ['עשרים שאלות!', 'השומר רואה סוד, ורק הוא יודע מה זה.', 'כל השאר שואלים שאלות של כן או לא.', 'שאלה ראשונה טובה: חי, צומח או דומם?', 'יש עשרים שאלות כדי לגלות!'];

const primary = 'btn bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-900';
// שם הפריט בגדול: מילה ארוכה מקבלת גופן קטן יותר, ואף פעם לא נשברת באמצע (גם בטקסט מוגדל)
const noBreak = 'hyphens-none break-normal [overflow-wrap:normal]';
const longestWord = (name) => Math.max(...name.split(' ').map((w) => w.length));
const bigNameSize = (name) => {
  const n = longestWord(name);
  if (n >= 10) return 'text-3xl min-[400px]:text-4xl';
  if (n >= 7) return 'text-4xl min-[400px]:text-5xl';
  return 'text-5xl';
};
const leftText = (left) => (left === 1 ? 'נשארה שאלה אחת' : `נשארו ${left} שאלות`);

/** עיגול הפריט הסודי (אימוג'י) */
function ItemCircle({ item, className = '' }) {
  return (
    <span
      className={`mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-sky-100 leading-none shadow-soft animate-pop ${className}`}
      aria-hidden="true"
    >
      {item.emoji}
    </span>
  );
}

const GroupChip = ({ item }) => (
  <span className="mt-2 inline-flex rounded-full bg-teal-50 px-3 py-1 text-lg font-bold text-teal-800">
    {GROUPS[item.group].emoji} זה {GROUPS[item.group].label}
  </span>
);

export default function TwentyQuestions({ players, onHome }) {
  const [store, setStore] = useLocalStorage(STORAGE_KEY, null, { revive: reviveStore });
  // רמת הפריטים: מה שנבחר בפעם הקודמת; בפעם הראשונה – "קלים" אם יש במשפחה מי שמשחק ברמה הקלה
  const level = store.level || (players.some((p) => p.difficulty === 'easy') ? 'kids' : 'all');
  const setLevel = (l) => setStore((s) => ({ ...s, level: l }));
  const [phase, setPhase] = useState('setup'); // setup | pass | secret | play | end
  const [keeperId, setKeeperId] = useState(null);
  const [item, setItem] = useState(null);
  const [asked, setAsked] = useState(0);
  // התשובה האחרונה – רק להצגה ולביטול לחיצה בטעות (בלי היסטוריה)
  const [last, setLast] = useState(null);
  const [outcome, setOutcome] = useState(null); // found | gaveUp | out
  const [revealed, setRevealed] = useState(false);
  const [confirm, setConfirm] = useState(null); // found | gaveUp | quit
  const [peek, setPeek] = useState(0); // 0 סגור · 1 "רק השומר!" · 2 הסוד גלוי
  const [replay, setReplay] = useState(false);
  const [live, setLive] = useState('');
  const headingRef = useRef(null);
  const { speak, cancel, speaking, supported } = useSpeech();

  const keeper = players.find((p) => p.id === keeperId) || null;
  // בלי שומר: פנייה ניטרלית (לרבים)
  const kg = (m, f, none) => (keeper ? g(keeper, m, f) : none);
  const anyAutoRead = players.some((p) => p.autoRead);
  // "השומר בוחר בעצמו": אין פריט מהרשימה, אין מסך סוד ואין הצצה
  const selfPick = level === 'self';
  const foundAt = Math.min(asked + 1, MAX);

  // באמצע משחק – Back בטלפון וכפתור הבית שואלים קודם
  // Back כשהסוד מוצג בהצצה – קודם מסתירים אותו
  const peekRef = useRef(peek);
  peekRef.current = peek;
  useEffect(
    () => (['pass', 'secret', 'play'].includes(phase) ? setLeaveGuard(() => (peekRef.current ? setPeek(0) : setConfirm('quit'))) : undefined),
    [phase],
  );

  // בכל מסך חדש הפוקוס עובר לכותרת שלו
  useEffect(() => {
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    window.scrollTo({ top: 0 });
  }, [phase]);

  // שומר שמשחק עם הקראה שומע מה לעשות (בלי הסוד עצמו – כולם שומעים)
  useEffect(() => {
    if (phase === 'pass' && keeper?.autoRead) {
      speak(
        `${keeper.name}, ${g(keeper, 'קח', 'קחי')} את הטלפון, ואל ${g(keeper, 'תראה', 'תראי')} לאף אחד. ${g(keeper, 'לחץ', 'לחצי')} על הכפתור הגדול כדי לראות את הסוד.`,
        { rate: 0.9 },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // המסך לא נכבה באמצע סיבוב (רוב הזמן מדברים ולא נוגעים בטלפון)
  useEffect(() => {
    if (phase !== 'play' || !navigator.wakeLock?.request) return undefined;
    let lock = null;
    let done = false;
    navigator.wakeLock
      .request('screen')
      .then((l) => {
        if (done) l.release().catch(() => {});
        else lock = l;
      })
      .catch(() => {});
    return () => {
      done = true;
      lock?.release().catch(() => {});
    };
  }, [phase]);

  // סיום: "גילינו!" – חגיגה, והסוד מוקרא
  useEffect(() => {
    if (phase !== 'end') return undefined;
    let stop = null;
    if (outcome === 'found') {
      playFanfare();
      stop = celebrate(2000, { small: true });
      if (anyAutoRead) speak(item ? ['גילינו!', `זה היה: ${item.name}!`, `אחרי ${foundAt} שאלות.`] : ['גילינו!', `אחרי ${foundAt} שאלות.`, 'מה זה היה? השומר מגלה!'], { rate: 0.9 });
    } else if (!item && anyAutoRead) speak('מה זה היה? השומר מגלה!', { rate: 0.9 });
    return () => {
      stop?.();
      clearConfetti();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const goHome = () => {
    cancel();
    onHome();
  };

  // תחילת סיבוב בלי מסך סוד (השומר בוחר בעצמו) – ישר למונה
  const resetRound = () => {
    setAsked(0);
    setLast(null);
    setOutcome(null);
    setRevealed(false);
    setPhase('play');
  };

  const start = () => {
    playClick();
    cancel();
    if (selfPick) {
      setItem(null);
      resetRound();
      return;
    }
    setItem(pickItem(level, store.recent));
    setPhase('pass');
  };

  const chooseKeeper = (p) => {
    playClick();
    if (keeperId === p.id) return setKeeperId(null);
    setKeeperId(p.id);
    // שומר קטן מקבל פריטים קלים (אלא אם בחרו שהשומר בוחר בעצמו)
    if (p.difficulty === 'easy' && level !== 'self') setLevel('kids');
    if (p.autoRead) speak(`${p.name} ${g(p, 'הוא', 'היא')} השומר!`, { rate: 0.9 });
    return undefined;
  };

  const readSecret = () => speak(['הסוד:', item.name, `זה ${GROUPS[item.group].label}.`], { rate: 0.85, volume: 0.5 });

  const beginPlay = () => {
    playClick();
    cancel();
    setStore((s) => ({ ...s, recent: [...s.recent.filter((id) => id !== item.id), item.id].slice(-RECENT_MAX) }));
    resetRound();
  };

  const answer = (key) => {
    if (asked >= MAX) return;
    const n = asked + 1;
    const left = MAX - n;
    const a = ANSWERS[key];
    playClick();
    setAsked(n);
    setLast(key);
    setLive(`${a.word}. ${left ? leftText(left) : 'נגמרו השאלות'}`);
    if (anyAutoRead) {
      const extra = n === 15 ? 'נשארו חמש שאלות' : n === 18 ? 'נשארו שתי שאלות' : n === 19 ? 'שאלה אחרונה!' : n === MAX ? 'נגמרו השאלות!' : '';
      speak([`${a.word}!`, extra].filter(Boolean), { rate: 0.9 });
    }
  };

  const undo = () => {
    if (!asked || !last) return;
    playClick();
    setAsked((n) => n - 1);
    setLast(null);
    setLive(`בוטל. ${leftText(MAX - asked + 1)}`);
  };

  const finish = (result) => {
    cancel();
    setConfirm(null);
    setPeek(0);
    setOutcome(result);
    setRevealed(result === 'found' && Boolean(item));
    setPhase('end');
  };

  const reveal = () => {
    playUnlock();
    setRevealed(true);
    if (anyAutoRead) speak(`זה היה: ${item.name}!`, { rate: 0.9 });
  };

  const again = () => {
    playClick();
    cancel();
    setItem(null);
    setReplay(true);
    setPhase('setup');
  };

  const liveRegion = (
    <p className="sr-only" aria-live="polite">
      {live}
    </p>
  );

  // ---- חלונות אישור (הפעולה הבטוחה ראשונה) ----
  const confirmCopy = {
    found: { title: 'ניחשתם נכון? 🎉', text: 'השומר מאשר?', safe: 'עוד לא', go: '🎉 כן, גילינו!', safeFirst: false },
    gaveUp: { title: 'לוותר ולגלות את הסוד?', text: 'אפשר גם להמשיך לנחש 💪', safe: 'ממשיכים לנחש', go: '🏳️ כן, לגלות', safeFirst: true },
    quit: { title: 'לעצור את המשחק?', text: 'הסוד יישאר סוד 🤫', safe: 'ממשיכים לשחק', go: 'לדף הבית', safeFirst: true },
  }[confirm];
  const onConfirm = () => (confirm === 'quit' ? goHome() : finish(confirm));
  const confirmModal = (
    <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} label={confirmCopy?.title || ''} className="max-w-sm">
      {confirmCopy && (
        <div className="flex flex-col items-center p-7 text-center">
          <h2 className="mb-2 text-2xl font-bold">{confirmCopy.title}</h2>
          <p className="mb-6 text-slate-600">{confirmCopy.text}</p>
          <div className="flex w-full flex-col gap-3">
            {confirmCopy.safeFirst ? (
              <>
                <button type="button" className={`${primary} w-full py-4 text-xl`} onClick={() => setConfirm(null)} autoFocus>
                  {confirmCopy.safe}
                </button>
                <button type="button" className="btn btn-white w-full text-slate-700" onClick={onConfirm}>
                  {confirmCopy.go}
                </button>
              </>
            ) : (
              <>
                <button type="button" className={`${primary} w-full py-4 text-xl`} onClick={onConfirm} autoFocus>
                  {confirmCopy.go}
                </button>
                <button type="button" className="btn btn-white w-full text-slate-700" onClick={() => setConfirm(null)}>
                  {confirmCopy.safe}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );

  // ---- הגדרות ----
  if (phase === 'setup') {
    const levelOptions = [
      { value: 'kids', label: `🐣 קלים · ${itemPool('kids').length}`, hint: 'פריטים שגם הקטנים מכירים' },
      { value: 'all', label: `🦊 כל הפריטים · ${itemPool('all').length}`, hint: 'חיות, פירות, כלי רכב, חפצים ועוד' },
      { value: 'hard', label: `🦉 מאתגר · ${itemPool('hard').length}`, hint: 'לנוער ולמבוגרים: מקצועות, מקומות, אתרים מפורסמים וחפצים מסובכים' },
      { value: 'self', label: '🧠 השומר בוחר בעצמו', hint: 'השומר חושב על משהו בראש – שום דבר לא מוצג במסך' },
    ];
    const levelHint = levelOptions.find((o) => o.value === level)?.hint;
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-4 pt-4 sm:px-6">
        <header className="mb-3 flex items-center gap-3">
          <h1 ref={headingRef} tabIndex={-1} className="flex flex-1 flex-wrap items-center gap-x-2 text-3xl font-bold text-slate-700 focus:outline-none sm:text-4xl">
            20 שאלות{' '}
            <span className="shrink-0" aria-hidden="true">
              🎙️
            </span>
          </h1>
          {supported && (
            <button type="button" className="icon-btn text-sky-700" onClick={() => speak(RULES_SPEECH, { rate: 0.9 })} aria-label={speaking ? 'מקריא…' : 'הקראת ההוראות'}>
              {speaking ? <SpeakingBars /> : <Volume2 size={22} />}
            </button>
          )}
          <HomeButton onClick={goHome} />
        </header>

        <p className="mb-5 text-lg font-medium leading-snug text-slate-600">
          {selfPick ? 'השומר חושב על משהו סודי.' : 'השומר רואה פריט סודי.'} כל השאר שואלים שאלות של כן או לא – ויש 20 שאלות לגלות מה זה!
        </p>

        {players.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-2 text-xl font-bold text-slate-600">
              {replay ? 'מי השומר הבא?' : 'מי השומר?'} <span className="text-base font-medium text-slate-600">(אפשר לדלג)</span>
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 short:grid-cols-5">
              {players.map((p) => {
                const on = keeperId === p.id;
                const t = getTheme(p.theme);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => chooseKeeper(p)}
                    aria-pressed={on}
                    className={`relative flex flex-col items-center rounded-3xl border-4 bg-white px-1 py-2 transition min-[360px]:px-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 sm:p-4 ${
                      on ? `${t.border} shadow-pop-sm` : 'border-transparent hover:border-slate-200'
                    }`}
                  >
                    {on && (
                      <span className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white sm:left-2 sm:top-2 sm:h-8 sm:w-8" aria-hidden="true">
                        <Check size={18} strokeWidth={3} />
                      </span>
                    )}
                    <Avatar avatar={p.avatar} theme={p.theme} size="md" decorative />
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
          </section>
        )}

        <section className="mb-4">
          <h2 id="twenty-level-title" className="mb-2 text-xl font-bold text-slate-600">
            אילו פריטים?
          </h2>
          <div className="flex flex-wrap gap-2 sm:gap-3" role="radiogroup" aria-labelledby="twenty-level-title">
            {levelOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={level === o.value}
                onClick={() => setLevel(o.value)}
                className={`rounded-2xl border-4 bg-white px-4 py-3 font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 sm:px-5 ${
                  level === o.value ? 'border-teal-500 text-teal-800' : 'border-transparent text-slate-600 hover:border-slate-200'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {levelHint && <p className="mt-2 text-base font-medium leading-snug text-slate-600">{levelHint}</p>}
        </section>

        <ul className="mb-4 space-y-1 rounded-3xl bg-white/70 p-3 text-base font-medium text-slate-700">
          <li>{selfPick ? '🧠 השומר חושב על משהו ולא מספר לאף אחד' : '🤫 רק השומר רואה את הסוד'}</li>
          <li>🙋 כולם שואלים בקול: כן או לא?</li>
          <li>🐾🌱🧱 שאלה ראשונה טובה: חי, צומח או דומם?</li>
          <li>🔢 יש 20 שאלות לגלות!</li>
        </ul>

        <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-white via-white/95 to-white/0 px-4 pb-4 pt-4 sm:-mx-6 sm:px-6">
          <button type="button" onClick={start} className={`${primary} w-full py-5 text-2xl`}>
            {selfPick ? '🧠 השומר חשב על משהו? מתחילים!' : '🤫 לשומר: לגלות את הסוד'}
          </button>
        </div>
      </main>
    );
  }

  // כותרת קטנה למסכי המשחק (השומר, הצצה, דף הבית)
  const gameHeader = (
    <header className="mb-3 flex items-center gap-2 short:mb-1">
      {keeper ? (
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Avatar avatar={keeper.avatar} theme={keeper.theme} size="xs" decorative />
          <span className={`min-w-0 break-words text-base font-bold leading-tight ${getTheme(keeper.theme).text}`}>השומר: {keeper.name}</span>
        </span>
      ) : (
        <span className="flex-1 text-base font-bold text-slate-700">🤫 השומר</span>
      )}
      {phase === 'play' && item && (
        <button
          type="button"
          className="icon-btn h-auto min-h-[2.75rem] w-auto flex-col gap-0 px-2 py-1 text-slate-700 sm:h-auto sm:min-h-[3rem] sm:w-auto"
          onClick={() => setPeek(1)}
          aria-label="הצצה בסוד – רק לשומר"
          title="הצצה לשומר"
        >
          <Eye size={20} aria-hidden="true" />
          <span className="text-[0.7rem] font-bold leading-none" aria-hidden="true">
            הצצה
          </span>
        </button>
      )}
      <HomeButton onClick={() => setConfirm('quit')} />
    </header>
  );

  // ---- העברת הטלפון לשומר (הסוד עוד לא במסך) ----
  if (phase === 'pass') {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 pb-8 pt-3">
        {gameHeader}
        <section className="card mx-auto mt-6 flex max-w-md flex-col items-center p-6 text-center animate-pop short:mt-2 short:flex-row short:gap-4 short:p-4 short:text-start">
          {keeper ? (
            <span className="relative shrink-0">
              <Avatar avatar={keeper.avatar} theme={keeper.theme} size="xl" decorative className="short:h-28 short:w-28" />
              <span className="absolute -bottom-1 -end-1 text-4xl" aria-hidden="true">
                🤫
              </span>
            </span>
          ) : (
            <div className="text-8xl animate-wiggle short:text-6xl" aria-hidden="true">
              🙈
            </div>
          )}
          <div className="min-w-0">
            <h2 ref={headingRef} tabIndex={-1} className="mt-3 text-3xl font-bold text-slate-800 focus:outline-none short:mt-0">
              {keeper ? `${keeper.name}, ${g(keeper, 'קח', 'קחי')} את הטלפון` : 'השומר לוקח את הטלפון'}
            </h2>
            <p className="mt-2 text-lg font-medium text-slate-700">כל השאר – עיניים למטה! 🙈</p>
            <button
              type="button"
              className={`${primary} mt-5 w-full py-5 text-2xl short:mt-3 short:py-3`}
              onClick={() => {
                playClick();
                cancel();
                setPhase('secret');
              }}
            >
              👀 להראות לי את הסוד
            </button>
            <button type="button" className="btn btn-white mt-2 w-full" onClick={() => (cancel(), setPhase('setup'))}>
              חזרה
            </button>
          </div>
        </section>
        {confirmModal}
      </main>
    );
  }

  // ---- הסוד – רק לשומר ----
  if (phase === 'secret') {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 pb-8 pt-3">
        {gameHeader}
        <section className="card mx-auto mt-4 max-w-md p-6 text-center short:mt-1 short:flex short:max-w-3xl short:items-center short:gap-5 short:p-3">
          <div className="short:shrink-0">
            <span className="inline-flex rounded-full bg-slate-800 px-4 py-1 text-base font-bold text-white">🤫 סוד! רק לשומר</span>
            <ItemCircle item={item} className="mt-4 h-44 w-44 text-[6.5rem] short:mt-2 short:h-28 short:w-28 short:text-7xl" key={item.id} />
          </div>
          <div className="short:min-w-0 short:flex-1">
            <h2 ref={headingRef} tabIndex={-1} className={`mt-3 font-bold text-slate-800 focus:outline-none short:mt-0 short:text-3xl ${bigNameSize(item.name)} ${noBreak}`}>
              {item.name}
            </h2>
            <GroupChip item={item} />
            {supported && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 short:mt-2">
                <button type="button" className="btn bg-sky-100 text-sky-800 hover:bg-sky-200" onClick={readSecret}>
                  {speaking ? <SpeakingBars /> : <span aria-hidden="true">🔊</span>} להקריא לי
                </button>
                <p className="text-sm font-medium text-slate-600">{kg('הצמד', 'הצמידי', 'הצמידו')} את הטלפון לאוזן 👂</p>
              </div>
            )}
            <button
              type="button"
              className="btn btn-white mt-2 w-full"
              onClick={() => {
                playClick();
                cancel();
                setItem(pickItem(level, store.recent, item.id));
              }}
            >
              🎲 {kg('לא מכיר?', 'לא מכירה?', 'לא מכירים?')} פריט אחר
            </button>
            <button type="button" className={`${primary} mt-4 w-full py-5 text-2xl short:mt-2 short:py-3 short:text-xl`} onClick={beginPlay}>
              ✅ זכרתי! מסתירים ומתחילים
            </button>
          </div>
        </section>
        {confirmModal}
      </main>
    );
  }

  // ---- המשחק: מונה וכפתורי כן / לא / לפעמים ----
  if (phase === 'play') {
    const out = asked >= MAX;
    const lastAnswer = last ? ANSWERS[last] : null;
    return (
      <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-3 short:pt-1">
        {gameHeader}
        <h2 ref={headingRef} tabIndex={-1} className="sr-only">
          20 שאלות – שאלה {Math.min(asked + 1, MAX)} מתוך {MAX}
        </h2>
        <div className="short:grid short:grid-cols-[auto_1fr] short:items-center short:gap-6">
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-slate-600 short:text-base">שאלה מספר</span>
            <div
              className={`mt-1 flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white shadow-soft ring-8 compact:h-32 compact:w-32 sm:h-44 sm:w-44 short:h-24 short:w-24 short:ring-4 ${
                asked === MAX - 1 ? 'ring-amber-300' : 'ring-teal-100'
              }`}
            >
              <span key={asked} className="inline-block text-7xl font-black tabular-nums leading-none text-teal-800 animate-pop compact:text-6xl sm:text-8xl short:text-5xl" aria-hidden="true">
                {Math.min(asked + 1, MAX)}
              </span>
              <span className="text-base font-bold text-slate-600 short:text-sm" aria-hidden="true">
                מתוך 20
              </span>
              <span className="sr-only">
                שאלה {Math.min(asked + 1, MAX)} מתוך {MAX}
              </span>
            </div>
            {/* שורה אחת של 20 נקודות – חוסך גובה, כדי שכפתורי כן/לא לא ייכנסו מתחת לפס התחתון (גם בטקסט מוגדל) */}
            <div className="mt-3 grid w-full max-w-sm grid-cols-[repeat(20,minmax(0,1fr))] gap-1 short:hidden" aria-hidden="true">
              {Array.from({ length: MAX }, (_, i) => (
                <span key={i} className={`h-2.5 rounded-full ${i < asked ? 'bg-teal-600' : i === asked ? 'bg-teal-300' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>

          <div>
            <div className="mt-2 flex min-h-[2.75rem] flex-wrap items-center justify-center gap-x-2 short:mt-0">
              {lastAnswer && (
                <>
                  <span key={asked} className={`whitespace-nowrap rounded-full px-3 py-1 text-lg font-bold animate-pop ${lastAnswer.pill}`}>
                    התשובה: {lastAnswer.word} {lastAnswer.emoji}
                  </span>
                  <button type="button" onClick={undo} aria-label="טעות? ביטול התשובה האחרונה" className="min-h-[44px] whitespace-nowrap px-2 text-base font-bold text-slate-600 underline">
                    ↩ ביטול
                  </button>
                </>
              )}
              {asked >= 15 && asked < MAX - 1 && <span className="rounded-full bg-amber-100 px-3 py-1 text-base font-bold text-amber-900">נשארו עוד {MAX - asked} שאלות</span>}
              {asked === MAX - 1 && <span className="rounded-full bg-amber-100 px-3 py-1 text-base font-bold text-amber-900">🏁 שאלה אחרונה!</span>}
            </div>

            {out ? (
              <div className="card mt-2 p-4 text-center animate-pop">
                <h3 className="text-2xl font-bold text-slate-800">😮 נגמרו 20 השאלות!</h3>
                <p className="mt-1 text-lg font-medium text-slate-700">ניחשתם בשאלה האחרונה?</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row short:flex-row">
                  <button type="button" className={`${primary} flex-1 py-4 text-xl`} onClick={() => finish('found')}>
                    🎉 כן, גילינו!
                  </button>
                  <button type="button" className="btn btn-white flex-1 py-4 text-xl" onClick={() => finish('out')}>
                    🥁 לא – לחשוף את הסוד
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-2 text-center text-lg font-bold text-slate-700 short:mt-0">{kg(`${keeper?.name} עונה ולוחץ:`, `${keeper?.name} עונה ולוחצת:`, 'השומר עונה ולוחץ:')}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-4">
                  {Object.entries(ANSWERS).map(([key, a]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => answer(key)}
                      aria-label={a.word}
                      className={`btn min-h-[6rem] flex-col gap-1 px-1 text-xl sm:min-h-[8rem] sm:text-2xl short:min-h-[4.5rem] short:flex-row short:text-lg ${a.btn}`}
                    >
                      <span className="text-4xl leading-none sm:text-5xl short:text-3xl" aria-hidden="true">
                        {a.emoji}
                      </span>
                      <span aria-hidden="true">{a.word}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-center text-sm font-medium text-slate-600 short:mt-2">ניחשתם נכון? לוחצים „גילינו!" למטה</p>
              </>
            )}
          </div>
        </div>

        <ActionBar>
          <button type="button" className={`${primary} flex-1 py-3 text-xl`} onClick={() => setConfirm('found')}>
            🎉 גילינו!
          </button>
          <button type="button" className="btn btn-white" onClick={() => setConfirm('gaveUp')}>
            🏳️ ויתרנו
          </button>
        </ActionBar>

        {/* הצצה לשומר: שני שלבים, כדי שמנחש סקרן לא יגלה בלחיצה אחת */}
        <Modal open={peek > 0} onClose={() => setPeek(0)} label="הסוד של השומר" className="max-w-sm">
          {peek === 1 ? (
            <div className="flex flex-col items-center p-7 text-center">
              <div className="text-7xl" aria-hidden="true">
                🙈
              </div>
              <h2 className="mt-2 text-2xl font-bold">רק השומר מסתכל!</h2>
              <div className="mt-6 flex w-full flex-col gap-3">
                <button type="button" className={`${primary} w-full py-4 text-xl`} onClick={() => setPeek(2)}>
                  👀 להראות
                </button>
                <button type="button" className="btn btn-white w-full text-slate-700" onClick={() => setPeek(0)} autoFocus>
                  ביטול
                </button>
              </div>
            </div>
          ) : peek === 2 ? (
            <div className="flex flex-col items-center p-7 text-center">
              <ItemCircle item={item} className="h-32 w-32 text-7xl" />
              <h2 className={`mt-3 font-bold ${longestWord(item.name) >= 9 ? 'text-3xl' : 'text-4xl'} ${noBreak}`}>{item.name}</h2>
              <GroupChip item={item} />
              <button type="button" className="btn mt-6 w-full bg-slate-800 py-4 text-xl text-white hover:bg-slate-900" onClick={() => setPeek(0)} autoFocus>
                🙈 להסתיר
              </button>
            </div>
          ) : null}
        </Modal>

        {liveRegion}
        {confirmModal}
      </main>
    );
  }

  // ---- סיום וחשיפה ----
  const found = outcome === 'found';
  const title = found ? 'גילינו! 🎉' : outcome === 'gaveUp' ? 'ויתרנו? אין בעיה!' : 'נגמרו 20 השאלות!';
  let sub;
  if (found) sub = foundAt === 1 ? 'כבר בשאלה הראשונה! 🤯' : `גילינו אחרי ${foundAt} שאלות!`;
  else if (outcome === 'gaveUp') sub = revealed || !item ? 'בפעם הבאה נגלה! 💪' : 'רוצים לדעת מה זה היה?';
  else sub = keeper ? `${keeper.name} ${g(keeper, 'שמר', 'שמרה')} על הסוד עד הסוף! 🤫` : 'השומר שמר על הסוד עד הסוף! 🤫';
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-3">
      <div className="card relative z-10 overflow-hidden text-center animate-slide-up">
        <div className={`relative px-5 pb-6 pt-8 text-slate-900 short:pb-3 short:pt-4 ${found ? 'bg-gradient-to-br from-teal-200 to-sky-200' : 'bg-gradient-to-br from-slate-100 to-sky-100'}`}>
          {supported && revealed && (
            <button
              type="button"
              onClick={() => speak(`זה היה: ${item.name}!`, { rate: 0.9 })}
              className="icon-btn absolute left-3 top-3 z-10 h-12 w-12 bg-white/90 text-sky-700"
              aria-label={speaking ? 'מקריא…' : 'הקראה'}
            >
              {speaking ? <SpeakingBars /> : <Volume2 size={24} />}
            </button>
          )}
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold focus:outline-none min-[360px]:text-4xl short:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-xl font-medium">{sub}</p>
          {found && foundAt <= 10 && <p className="mx-auto mt-2 w-fit rounded-full bg-white/90 px-4 py-1 text-base font-bold text-teal-800">⚡ מהר מאוד!</p>}
        </div>
        <div className="flex flex-col items-center px-5 pb-8 pt-6 short:flex-row short:justify-center short:gap-5 short:pb-4 short:pt-4">
          {revealed ? (
            <>
              <ItemCircle item={item} className="h-40 w-40 text-8xl short:mx-0 short:h-24 short:w-24 short:text-6xl" />
              <div>
                <p className={`mt-3 font-bold text-slate-800 short:mt-0 ${longestWord(item.name) >= 9 ? 'text-3xl' : 'text-4xl'} ${noBreak}`}>זה היה: {item.name}</p>
                <GroupChip item={item} />
              </div>
            </>
          ) : !item ? (
            // השומר בחר בעצמו: אין מה להציג – השומר אומר בקול
            <>
              <span className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-white text-7xl shadow-soft animate-wiggle short:mx-0 short:h-24 short:w-24 short:text-6xl" aria-hidden="true">
                ❓
              </span>
              <div>
                <p className="mt-4 text-3xl font-bold text-slate-800 short:mt-0">🥁 מה זה היה? השומר מגלה!</p>
                <p className="mt-2 text-lg font-medium text-slate-700">
                  {keeper ? `${keeper.name}, ${g(keeper, 'ספר', 'ספרי')} לכולם בקול 🗣️` : 'השומר מספר לכולם בקול 🗣️'}
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-white text-8xl shadow-soft animate-wiggle short:mx-0 short:h-24 short:w-24 short:text-6xl" aria-hidden="true">
                ❓
              </span>
              <button type="button" className={`${primary} mt-5 py-4 text-2xl short:mt-0`} onClick={reveal}>
                🥁 מה זה היה?
              </button>
            </>
          )}
        </div>
      </div>
      <ActionBar>
        <button type="button" onClick={again} className={`${primary} flex-1 whitespace-nowrap px-3 py-3 text-lg`}>
          <RotateCcw size={22} />
          עוד סיבוב
        </button>
        <button type="button" onClick={goHome} className="btn btn-white whitespace-nowrap px-3">
          <Home size={22} />
          דף הבית
        </button>
      </ActionBar>
      {liveRegion}
    </main>
  );
}
