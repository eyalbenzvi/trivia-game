import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, Star, Timer, X } from 'lucide-react';
import Avatar from './Avatar';
import Modal from './Modal';
import QuestionCard, { FeedbackPill, keyToOption } from './QuestionCard';
import SoundToggle from './SoundToggle';
import { useSpeech } from '../hooks/useSpeech';
import { getTheme } from '../data/themes';
import { g } from '../data/profiles';
import { STREAK_BONUS_FROM, buildRound, gamePool, markSeen, speechForQuestion, starsForAnswer } from '../utils/game';
import { playClick, playCorrect, playThink, playWrong } from '../utils/sound';
import { burstCorrect } from '../utils/confetti';

export const TIMED_DURATIONS = [60, 90, 120];
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
  const [questions] = useState(() => buildRound(pool, player.stats.seen, 150));
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

  // reason: 'time' – הזמן נגמר, 'quit' – השחקן עצר. מרוץ נספר רק אם הגיע לאפס או שהיו בו תשובות
  const finish = useCallback(
    (reason = 'time') => {
      cancel();
      clearTimeout(feedbackTimer.current);
      clearTimeout(thinkTimer.current);
      setPhase('done');
      const s = sessionRef.current;
      const counts = reason === 'time' || s.answered > 0;
      if (!counts) {
        onQuit();
        return;
      }
      const prevBest = player.stats.timedBest?.[duration] || 0;
      const hadRecord = player.stats.timedBest?.[duration] != null && prevBest > 0;
      onUpdatePlayer(player.id, (p) => ({
        ...p,
        stats: {
          ...p.stats,
          gamesPlayed: p.stats.gamesPlayed + 1,
          timedBest: { ...p.stats.timedBest, [duration]: Math.max(p.stats.timedBest?.[duration] || 0, s.correct) },
        },
      }));
      onFinish({
        mode: 'timed',
        reason,
        duration,
        ...s,
        prevBest,
        newRecord: s.correct > prevBest,
        firstRecord: !hadRecord && s.correct > 0,
        startStickers: { [player.id]: startStickers.current },
        startStars: { [player.id]: player.stats.stars - s.stars },
      });
    },
    [cancel, duration, onFinish, onQuit, onUpdatePlayer, player.id, player.stats.timedBest, player.stats.stars],
  );

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
    const earned = starsForAnswer(correct, streak, player.difficulty);
    setSession((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      answered: s.answered + 1,
      stars: s.stars + earned,
      streak,
      bestStreak: Math.max(s.bestStreak, streak),
      wrongRun: wrongRun >= WRONG_RUN_LOCK ? 0 : wrongRun,
      missed: correct ? s.missed : [...s.missed, { question: question.question, answer: question.options[question.correctIndex], icon: question.icon }],
    }));
    if (correct) {
      playCorrect();
      burstCorrect(streak);
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
      <main className="mx-auto flex min-h-[85vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
        {phase === 'setup' ? (
          <div className="card w-full p-6 animate-pop sm:p-8">
            <Avatar avatar={player.avatar} theme={player.theme} size="lg" className="mx-auto" />
            <h1 className={`mt-4 text-3xl font-bold sm:text-4xl ${theme.text}`}>מרוץ נגד השעון ⏱️</h1>
            <p className="mt-3 text-lg leading-relaxed text-slate-600">
              כמה שיותר תשובות נכונות לפני שהזמן נגמר! על כל טעות יורדות {penalty} שניות{visual ? ' 🐢' : ''}.
              {player.autoRead ? ' השעון מחכה בזמן שמקריאים את השאלה 🔊' : ''}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              {TIMED_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  aria-pressed={duration === d}
                  className={`rounded-2xl border-4 px-4 py-3 text-lg font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
                    duration === d ? `${theme.border} ${theme.soft} ${theme.text}` : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {d} שניות
                </button>
              ))}
            </div>
            <p className="mt-4 font-bold text-amber-600">{best ? `השיא שלך: ${best} תשובות נכונות 🏆` : 'עוד אין שיא – זה הזמן לקבוע אחד!'}</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className={`btn flex-1 py-4 text-xl text-white ${theme.button}`}
                onClick={() => {
                  setCountdown(3);
                  setPhase('countdown');
                }}
              >
                <Timer size={24} />
                מתחילים!
              </button>
              <button type="button" className="btn btn-white" onClick={onQuit}>
                חזרה
              </button>
            </div>
          </div>
        ) : (
          <div key={countdown} className={`text-[9rem] font-black leading-none ${theme.text} animate-pop`}>
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
          {session.streak >= STREAK_BONUS_FROM && <span>🔥 רצף {session.streak}!</span>}
          {session.streak === STREAK_BONUS_FROM - 1 && <span>🔥 עוד אחת לבונוס!</span>}
        </>
      ) : (
        'לא נורא, ממשיכים!'
      )}
    </FeedbackPill>
  ) : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-2 pb-10 pt-2 sm:px-6 sm:pt-4">
      <header className="card relative z-20 mb-2 flex items-center gap-1.5 p-2 sm:mb-4 sm:gap-3 sm:p-4">
        <Avatar avatar={player.avatar} theme={player.theme} size="sm" />
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`flex items-center gap-1 text-2xl font-black tabular-nums ${seconds <= 10 && !listening ? 'animate-pulse text-rose-500' : theme.text}`}>
              <Timer size={22} />
              {seconds}
              {listening && (
                <span className="text-lg" title="השעון מחכה להקראה" aria-label="השעון מחכה להקראה">
                  ⏸️
                </span>
              )}
            </span>
            <span className="text-sm font-bold text-slate-500">✅ {session.correct}</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-[width] duration-100 ${seconds <= 10 ? 'bg-rose-400' : theme.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {flash && (
            // "-3" מוצג משמאל לימין, גדול ובמרכז מעל פס הזמן
            <span
              dir="ltr"
              className={`pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full px-3 text-2xl font-black shadow-pop-sm animate-pop ${visual ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-600'}`}
            >
              {flash}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-2xl bg-amber-50 px-2 py-1.5 text-lg font-black text-amber-500 sm:px-3 sm:py-2 sm:text-xl">
          <Star size={20} className="fill-amber-400 text-amber-400" />
          {session.stars}
        </div>
        {session.streak >= 2 && (
          <div
            className="flex items-center gap-0.5 rounded-2xl bg-orange-50 px-2 py-1.5 text-lg font-black text-orange-500 sm:px-3 sm:py-2 sm:text-xl"
            aria-label={`רצף של ${session.streak} תשובות נכונות`}
          >
            <Flame size={20} className="fill-orange-300" />
            {session.streak}
          </div>
        )}
        <SoundToggle enabled={soundOn} onToggle={onToggleSound} />
        <button type="button" className="icon-btn" onClick={() => setConfirmQuit(true)} aria-label="עצירת המרוץ" title="עצירה">
          <X size={24} />
        </button>
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

      <Modal open={confirmQuit} onClose={() => setConfirmQuit(false)} label="עצירת המרוץ" className="max-w-sm">
        <div className="p-7 text-center">
          <div className="mb-2 text-6xl">⏸️</div>
          <h2 className="mb-2 text-2xl font-bold">לעצור את המרוץ?</h2>
          <p className="mb-6 text-slate-600">השעון מחכה בינתיים.</p>
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
