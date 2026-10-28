import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, Star, Timer } from 'lucide-react';
import Avatar from './Avatar';
import Modal from './Modal';
import QuestionCard, { FeedbackPill, keyToOption } from './QuestionCard';
import SoundToggle from './SoundToggle';
import HomeButton from './HomeButton';
import { setLeaveGuard } from '../utils/nav';
import { useSpeech } from '../hooks/useSpeech';
import { getTheme } from '../data/themes';
import { g } from '../data/profiles';
import { RACE_RECORD_BONUS, RACE_STARS, buildRaceRound, gamePool, markSeen, speechForQuestion } from '../utils/game';
import { playClick, playCorrect, playThink, playWrong } from '../utils/sound';
import { burstCorrect } from '../utils/confetti';

export const TIMED_DURATIONS = [60, 90, 120];
// אייקון לכל אורך מרוץ – כדי שגם מי שלא קורא יבין
const DURATION_ICONS = { 60: '⚡', 90: '🐇', 120: '🐢' };
const defaultDuration = { easy: 120, medium: 90, hard: 90, expert: 60 };
// שניות שיורדות על טעות. ברמה הקלה – עונש עדין של 2 שניות (🐢)
const WRONG_PENALTY = { easy: 2, default: 3 };
const SHOW_CORRECT_MS = 700;
const SHOW_WRONG_MS = 1300;
// נגד "לחיצות אקראיות": אחרי 3 טעויות ברצף התשובות ננעלות ל־2 שניות
const WRONG_RUN_LOCK = 3;
const THINK_MS = 2000;
// למי שמקריאים לו – השעון עוצר בזמן ההקראה, אבל לא יותר מ־6 שניות לשאלה
const LISTEN_MAX_MS = 6000;
const LISTEN_START_MS = 1500;
// אם הדף היה מוסתר/קפוא – לא "מחייבים" את כל הזמן שעבר
const MAX_TICK_MS = 250;

/** מרוץ נגד השעון: כמה שיותר תשובות נכונות בזמן קצוב */
export default function TimedGame({ player, bank, onUpdatePlayer, onFinish, onQuit, soundOn, onToggleSound }) {
  const theme = getTheme(player.theme);
  const visual = player.difficulty === 'easy';
  const pool = gamePool(bank, player.difficulty);
  const penalty = visual ? WRONG_PENALTY.easy : WRONG_PENALTY.default;
  // במרוץ – שאלות קצרות שמתאימות לקצב מהיר
  const [questions] = useState(() => buildRaceRound(pool, player.stats.seen, 150));
  const [duration, setDuration] = useState(defaultDuration[player.difficulty] || 90);
  const [phase, setPhase] = useState('setup'); // setup | countdown | question | feedback | done
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0); // מילישניות
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [lastCorrect, setLastCorrect] = useState(true);
  const [flash, setFlash] = useState(null); // הודעת "-3" קטנה
  const [thinking, setThinking] = useState(false); // נעילה קצרה אחרי כמה טעויות ברצף
  const [listening, setListening] = useState(false); // השעון עוצר בזמן הקראת השאלה
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [session, setSession] = useState({ correct: 0, answered: 0, stars: 0, streak: 0, bestStreak: 0, wrongRun: 0, missed: [] });
  const startStickers = useRef(player.stickers);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const feedbackTimer = useRef(null);
  const thinkTimer = useRef(null);
  const heardRef = useRef(false);
  const { speak, cancel, supported, speaking } = useSpeech();
  const rate = visual ? 0.9 : 1;

  const question = questions[index % questions.length];

  useEffect(
    () => () => {
      clearTimeout(feedbackTimer.current);
      clearTimeout(thinkTimer.current);
    },
    [],
  );

  // reason: 'time' – הזמן נגמר, 'quit' – השחקן עצר באמצע.
  // רק מרוץ שהגיע לסוף נספר כמשחק וקובע שיא; מרוץ שנעצר מראה מה הספקת (והכוכבים שנאספו נשמרים)
  const finish = useCallback(
    (reason = 'time') => {
      cancel();
      clearTimeout(feedbackTimer.current);
      clearTimeout(thinkTimer.current);
      setPhase('done');
      const s = sessionRef.current;
      const completed = reason === 'time';
      if (!completed && s.answered === 0) {
        onQuit();
        return;
      }
      const prevBest = player.stats.timedBest?.[duration] || 0;
      const hadRecord = player.stats.timedBest?.[duration] != null && prevBest > 0;
      const newRecord = completed && s.correct > prevBest;
      // שיא חדש (שובר שיא קודם) – בונוס כוכבים
      const recordBonus = newRecord && hadRecord ? RACE_RECORD_BONUS : 0;
      if (completed) {
        onUpdatePlayer(player.id, (p) => ({
          ...p,
          stats: {
            ...p.stats,
            stars: p.stats.stars + recordBonus,
            gamesPlayed: p.stats.gamesPlayed + 1,
            timedBest: { ...p.stats.timedBest, [duration]: Math.max(p.stats.timedBest?.[duration] || 0, s.correct) },
          },
        }));
      }
      onFinish({
        mode: 'timed',
        reason,
        duration,
        ...s,
        stars: s.stars + recordBonus,
        recordBonus,
        prevBest,
        newRecord,
        firstRecord: completed && !hadRecord && s.correct > 0,
        startStickers: { [player.id]: startStickers.current },
        startStars: { [player.id]: player.stats.stars - s.stars },
      });
    },
    [cancel, duration, onFinish, onQuit, onUpdatePlayer, player.id, player.stats.timedBest, player.stats.stars],
  );

  // באמצע מרוץ, Back בטלפון (או כפתור הבית) שואל לפני שיוצאים
  const racing = phase === 'question' || phase === 'feedback';
  useEffect(() => (racing ? setLeaveGuard(() => setConfirmQuit(true)) : undefined), [racing]);

  // מסך הפתיחה מוקרא למי שמקריאים לו (למשל עידו)
  useEffect(() => {
    if (phase === 'setup' && player.autoRead) {
      speak(['מרוץ נגד השעון!', 'עונים על כמה שיותר שאלות לפני שהזמן נגמר.', 'בחרו זמן, ולחצו על מתחילים.'], { rate: 0.9 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ספירה לאחור 3-2-1
  useEffect(() => {
    if (phase !== 'countdown') return undefined;
    if (countdown === 0) {
      setTimeLeft(duration * 1000);
      setPhase('question');
      return undefined;
    }
    playClick();
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdown, duration]);

  // השעון רץ בזמן שאלה ובזמן הצגת טעות (כדי שלא ישתלם ללחוץ באקראי).
  // הוא עוצר אחרי תשובה נכונה, בזמן הקראת השאלה, כשחלון העצירה פתוח וכשהדף מוסתר.
  const clockRuns = !confirmQuit && ((phase === 'question' && !listening) || (phase === 'feedback' && !lastCorrect));
  useEffect(() => {
    if (!clockRuns) return undefined;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - last, MAX_TICK_MS);
      last = now;
      if (!document.hidden) setTimeLeft((t) => Math.max(0, t - delta));
    }, 100);
    const onVis = () => {
      last = performance.now();
      if (document.hidden) cancel();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [clockRuns, cancel]);

  useEffect(() => {
    if ((phase === 'question' || phase === 'feedback') && timeLeft <= 0) finish('time');
  }, [timeLeft, phase, finish]);

  // הקראה אוטומטית של כל שאלה – והשעון מחכה עד שההקראה נגמרת
  useEffect(() => {
    if (phase !== 'question' || !player.autoRead || !question) return;
    if (supported) {
      heardRef.current = false;
      setListening(true);
    }
    speak(speechForQuestion(question), { rate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase === 'question']);

  useEffect(() => {
    if (!listening) return;
    if (speaking) heardRef.current = true;
    else if (heardRef.current) setListening(false);
  }, [speaking, listening]);

  useEffect(() => {
    if (!listening) return undefined;
    // אם ההקראה לא התחילה (אין קול) – לא מחכים; ובכל מקרה לא יותר מ־6 שניות
    const t1 = setTimeout(() => !heardRef.current && setListening(false), LISTEN_START_MS);
    const t2 = setTimeout(() => setListening(false), LISTEN_MAX_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [listening, index]);

  const handleAnswer = (i) => {
    if (phase !== 'question' || selected !== null || thinking || confirmQuit) return;
    cancel();
    setListening(false);
    setSelected(i);
    setPhase('feedback');
    const correct = i === question.correctIndex;
    setLastCorrect(correct);
    const streak = correct ? session.streak + 1 : 0;
    const wrongRun = correct ? 0 : session.wrongRun + 1;
    // במרוץ כל תשובה נכונה שווה מספר קבוע של כוכבים (בלי בונוס רצף) – הפרס הגדול הוא השיא
    const earned = correct ? RACE_STARS : 0;
    setSession((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      answered: s.answered + 1,
      stars: s.stars + earned,
      streak,
      bestStreak: Math.max(s.bestStreak, streak),
      wrongRun: wrongRun >= WRONG_RUN_LOCK ? 0 : wrongRun,
      missed: correct ? s.missed : [...s.missed, { question: question.question, answer: question.options[question.correctIndex], icon: question.icon, picture: question.optionEmojis?.[question.correctIndex] }],
    }));
    if (correct) {
      playCorrect();
      burstCorrect(streak, { small: true });
    } else {
      playWrong();
      setTimeLeft((t) => Math.max(0, t - penalty * 1000));
      setFlash(visual ? `-${penalty} 🐢` : `-${penalty}`);
    }
    onUpdatePlayer(player.id, (p) => ({
      ...p,
      stats: {
        ...p.stats,
        stars: p.stats.stars + earned,
        totalAnswered: p.stats.totalAnswered + 1,
        totalCorrect: p.stats.totalCorrect + (correct ? 1 : 0),
        bestStreak: Math.max(p.stats.bestStreak, streak),
        categoryCorrect: correct
          ? { ...p.stats.categoryCorrect, [question.category]: (p.stats.categoryCorrect[question.category] || 0) + 1 }
          : p.stats.categoryCorrect,
        seen: markSeen(pool, p.stats.seen, question.id),
      },
    }));
    feedbackTimer.current = setTimeout(
      () => {
        setFlash(null);
        setSelected(null);
        setIndex((n) => n + 1);
        setPhase('question');
        if (wrongRun >= WRONG_RUN_LOCK) {
          // "רגע, חושבים!" – התשובות נעולות לרגע (השעון ממשיך)
          setThinking(true);
          playThink();
          thinkTimer.current = setTimeout(() => setThinking(false), THINK_MS);
        }
      },
      correct ? SHOW_CORRECT_MS : SHOW_WRONG_MS,
    );
  };

  // מקלדת: 1–4 או א–ד (בלי Ctrl/Alt ובלי החזקת מקש)
  const answerRef = useRef(handleAnswer);
  answerRef.current = handleAnswer;
  useEffect(() => {
    if (phase !== 'question') return undefined;
    const onKey = (e) => {
      const n = keyToOption(e, question?.options.length || 0);
      if (n >= 0) answerRef.current(n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, question]);

  const seconds = Math.ceil(timeLeft / 1000);
  const pct = duration ? (timeLeft / (duration * 1000)) * 100 : 0;
  const best = player.stats.timedBest?.[duration] || 0;

  if (phase === 'setup' || phase === 'countdown') {
    return (
      <main className="mx-auto flex min-h-[85vh] w-full max-w-xl flex-col items-center justify-center px-4 py-3 text-center short:max-w-2xl short:py-2">
        {phase === 'setup' ? (
          <div className="card relative w-full p-6 animate-pop sm:p-8 compact:p-5 short:p-4">
            <HomeButton onClick={onQuit} className="absolute left-3 top-3" />
            {/* במסך נמוך התמונה קטנה ולצד הכותרת – כדי שכפתור "מתחילים!" ייראה בלי לגלול */}
            <div className="flex flex-col items-center short:flex-row short:justify-center short:gap-3">
              <Avatar avatar={player.avatar} theme={player.theme} size="lg" className="mx-auto compact:h-20 compact:w-20 compact:text-5xl short:mx-0 short:h-14 short:w-14 short:text-4xl" />
              <h1 className={`mt-4 text-3xl font-bold sm:text-4xl compact:mt-3 short:mt-0 short:text-2xl ${theme.text}`}>מרוץ נגד השעון ⏱️</h1>
            </div>
            <p className="mt-3 text-lg leading-relaxed text-slate-600 short:mt-2 short:text-base short:leading-snug">
              כמה שיותר תשובות נכונות לפני שהזמן נגמר! על כל טעות יורדות {penalty} שניות{visual ? ' 🐢' : ''}.
              {player.autoRead ? ' השעון מחכה בזמן שמקריאים את השאלה 🔊' : ''}
            </p>
            <div className="mt-5 flex justify-center gap-2 compact:mt-4 short:mt-2">
              {TIMED_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  aria-pressed={duration === d}
                  className={`rounded-2xl border-4 px-4 py-3 text-lg font-bold transition short:py-1.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
                    duration === d ? `${theme.border} ${theme.soft} ${theme.text}` : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  <span aria-hidden="true">{DURATION_ICONS[d]} </span>
                  {d} שניות
                </button>
              ))}
            </div>
            <p className="mt-4 font-bold text-amber-600 compact:mt-3 short:mt-2">{best ? `השיא שלך: ${best} תשובות נכונות 🏆` : 'עוד אין שיא – זה הזמן לקבוע אחד!'}</p>
            <div className="mt-6 flex gap-3 compact:mt-4 short:mt-3">
              <button
                type="button"
                className={`btn flex-1 py-4 text-xl text-white short:py-2.5 ${theme.button}`}
                onClick={() => {
                  setCountdown(3);
                  setPhase('countdown');
                }}
              >
                <Timer size={24} />
                מתחילים!
              </button>
              <button type="button" className="btn btn-white" onClick={onQuit}>
                דף הבית
              </button>
            </div>
          </div>
        ) : (
          <div key={countdown} className={`text-[9rem] font-black leading-none short:text-[6rem] ${theme.text} animate-pop`}>
            {countdown || 'יאללה!'}
          </div>
        )}
      </main>
    );
  }

  if (phase === 'done' || !question) return null;

  const status = thinking ? (
    <FeedbackPill tone="think">רגע, חושבים! 🤔</FeedbackPill>
  ) : listening ? (
    <FeedbackPill tone="info">🔊 מקשיבים… השעון מחכה</FeedbackPill>
  ) : phase === 'feedback' ? (
    <FeedbackPill tone={lastCorrect ? 'good' : 'bad'}>
      {lastCorrect ? (
        <>
          <span>✓ יש!</span>
          {session.streak >= 3 && <span>🔥 רצף {session.streak}!</span>}
        </>
      ) : (
        'לא נורא, ממשיכים!'
      )}
    </FeedbackPill>
  ) : null;

  // תשובות נכונות, כוכבים ורצף – בשורה של השעון במסך רחב, ובשורה נפרדת בטלפון לאורך
  const counters = (
    <>
      <span className="whitespace-nowrap rounded-2xl bg-emerald-50 px-2 py-0.5 text-base font-black text-emerald-600 sm:py-1 sm:text-lg" aria-label={`${session.correct} תשובות נכונות`}>
        ✅ {session.correct}
      </span>
      <span className="flex items-center gap-1 rounded-2xl bg-amber-50 px-2 py-0.5 text-base font-black text-amber-500 sm:py-1 sm:text-lg" aria-label={`${session.stars} כוכבים`}>
        <Star size={18} className="fill-amber-400 text-amber-400" />
        {session.stars}
      </span>
      {session.streak >= 2 && (
        <span
          className="flex items-center gap-0.5 rounded-2xl bg-orange-50 px-2 py-0.5 text-base font-black text-orange-500 sm:py-1 sm:text-lg"
          aria-label={`רצף של ${session.streak} תשובות נכונות`}
        >
          <Flame size={18} className="fill-orange-300" />
          {session.streak}
        </span>
      )}
    </>
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-2 pb-10 pt-2 sm:px-6 sm:pt-4">
      <header className="card relative z-20 mb-2 p-2 sm:mb-4 sm:p-4 compact:sm:mb-3 compact:sm:p-3 short:mb-1.5 short:p-1.5">
        {/* שורה ראשונה: השעון (הכי חשוב). בטלפון לאורך המונים והכוכבים יורדים לשורת פס הזמן, כדי שלא יידחקו */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Avatar avatar={player.avatar} theme={player.theme} size="sm" className="short:h-10 short:w-10 short:text-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`relative flex shrink-0 items-center gap-1 text-2xl font-black tabular-nums ${seconds <= 10 && !listening ? 'animate-pulse text-rose-500' : theme.text}`}
              >
                <Timer size={22} />
                {seconds}
                {listening && (
                  <span className="text-lg" title="השעון מחכה להקראה" aria-label="השעון מחכה להקראה">
                    ⏸️
                  </span>
                )}
                {flash && (
                  // "-3" ליד השעון, מוצג משמאל לימין, בלי לתפוס מקום בשורה (לא מזיז את שאר הכותרת)
                  <span
                    dir="ltr"
                    className={`pointer-events-none absolute right-full top-1/2 z-10 mr-1.5 -translate-y-1/2 whitespace-nowrap rounded-full px-2.5 text-xl font-black shadow-pop-sm animate-pop ${visual ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-600'}`}
                  >
                    {flash}
                  </span>
                )}
              </span>
              <span className="ms-auto hidden items-center gap-1.5 sm:flex short:flex">{counters}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-[width] duration-100 ${seconds <= 10 ? 'bg-rose-400' : theme.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
          <SoundToggle enabled={soundOn} onToggle={onToggleSound} />
          <HomeButton onClick={() => setConfirmQuit(true)} />
        </div>
        <div className="mt-1.5 flex items-center justify-end gap-1.5 sm:hidden compact:mt-1 short:hidden">{counters}</div>
      </header>

      <QuestionCard
        key={index}
        question={question}
        selected={selected}
        onSelect={handleAnswer}
        onRead={() => speak(speechForQuestion(question), { rate })}
        onSpeakOption={player.autoRead && supported ? (text) => speak(text, { rate }) : undefined}
        speaking={speaking}
        speechSupported={supported}
        visual={visual}
        status={status}
        frozen={thinking}
      />

      <Modal open={confirmQuit} onClose={() => setConfirmQuit(false)} label="סיום המרוץ" className="max-w-sm">
        <div className="p-7 text-center">
          <div className="mb-2 text-6xl">⏸️</div>
          <h2 className="mb-2 text-2xl font-bold">לעצור את המרוץ?</h2>
          <p className="mb-6 text-slate-600">השעון מחכה בינתיים. אם עוצרים – נראה מה הספקת עד עכשיו.</p>
          <div className="flex justify-center gap-3">
            <button type="button" className="btn bg-rose-500 text-white hover:bg-rose-600" onClick={() => (setConfirmQuit(false), finish('quit'))}>
              כן, לעצור
            </button>
            <button type="button" className="btn bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => setConfirmQuit(false)} autoFocus>
              {g(player, 'ממשיך לרוץ', 'ממשיכה לרוץ')}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
