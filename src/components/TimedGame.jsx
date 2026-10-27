import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, Star, Timer, X } from 'lucide-react';
import Avatar from './Avatar';
import QuestionCard from './QuestionCard';
import SoundToggle from './SoundToggle';
import { poolFor } from '../data/questions';
import { useSpeech } from '../hooks/useSpeech';
import { getTheme } from '../data/themes';
import { buildRound, markSeen, speechForQuestion, starsForAnswer } from '../utils/game';
import { playClick, playCorrect, playWrong } from '../utils/sound';
import { burstCorrect } from '../utils/confetti';

export const TIMED_DURATIONS = [60, 90, 120];
const defaultDuration = { easy: 120, medium: 90, hard: 90, expert: 60 };
const WRONG_PENALTY = 3; // שניות שיורדות על טעות (לא ברמה הקלה)
const SHOW_CORRECT_MS = 700;
const SHOW_WRONG_MS = 1600;

/** מרוץ נגד השעון: כמה שיותר תשובות נכונות בזמן קצוב */
export default function TimedGame({ player, bank, onUpdatePlayer, onFinish, onQuit, soundOn, onToggleSound }) {
  const theme = getTheme(player.theme);
  const visual = player.difficulty === 'easy';
  const pool = poolFor(bank, player.difficulty);
  const penalty = visual ? 0 : WRONG_PENALTY;
  const [questions] = useState(() => buildRound(pool, player.stats.seen, 150));
  const [duration, setDuration] = useState(defaultDuration[player.difficulty] || 90);
  const [phase, setPhase] = useState('setup'); // setup | countdown | question | feedback | done
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0); // מילישניות
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [flash, setFlash] = useState(null); // הודעת "-3" קטנה
  const [session, setSession] = useState({ correct: 0, answered: 0, stars: 0, streak: 0, bestStreak: 0, missed: [] });
  const startStickers = useRef(player.stickers);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const { speak, cancel, supported, speaking } = useSpeech();
  const rate = visual ? 0.9 : 1;

  const question = questions[index % questions.length];

  const finish = useCallback(() => {
    cancel();
    setPhase('done');
    const s = sessionRef.current;
    const prevBest = player.stats.timedBest?.[duration] || 0;
    onUpdatePlayer(player.id, (p) => ({
      ...p,
      stats: {
        ...p.stats,
        gamesPlayed: p.stats.gamesPlayed + 1,
        timedBest: { ...p.stats.timedBest, [duration]: Math.max(p.stats.timedBest?.[duration] || 0, s.correct) },
      },
    }));
    onFinish({ mode: 'timed', duration, ...s, prevBest, newRecord: s.correct > prevBest, startStickers: { [player.id]: startStickers.current } });
  }, [cancel, duration, onFinish, onUpdatePlayer, player.id, player.stats.timedBest]);

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

  // השעון רץ רק בזמן שאלה – בזמן הצגת התשובה הנכונה הוא עוצר
  useEffect(() => {
    if (phase !== 'question') return undefined;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      setTimeLeft((t) => Math.max(0, t - delta));
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === 'question' && timeLeft <= 0) finish();
  }, [timeLeft, phase, finish]);

  useEffect(() => {
    if (phase === 'question' && player.autoRead && question) speak(speechForQuestion(question), { rate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase === 'question']);

  const handleAnswer = (i) => {
    if (phase !== 'question' || selected !== null) return;
    cancel();
    setSelected(i);
    setPhase('feedback');
    const correct = i === question.correctIndex;
    const streak = correct ? session.streak + 1 : 0;
    const earned = starsForAnswer(correct, streak);
    setSession((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      answered: s.answered + 1,
      stars: s.stars + earned,
      streak,
      bestStreak: Math.max(s.bestStreak, streak),
      missed: correct ? s.missed : [...s.missed, { question: question.question, answer: question.options[question.correctIndex] }],
    }));
    if (correct) {
      playCorrect();
      burstCorrect(streak);
    } else {
      playWrong();
      if (penalty) {
        setTimeLeft((t) => Math.max(0, t - penalty * 1000));
        setFlash(`-${penalty}`);
      }
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
    setTimeout(
      () => {
        setFlash(null);
        setSelected(null);
        setIndex((n) => n + 1);
        setPhase('question');
      },
      correct ? SHOW_CORRECT_MS : SHOW_WRONG_MS,
    );
  };

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
              כמה שיותר תשובות נכונות לפני שהזמן נגמר!
              {penalty ? ` על כל טעות יורדות ${penalty} שניות.` : ''}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              {TIMED_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  aria-pressed={duration === d}
                  className={`rounded-2xl border-4 px-4 py-3 text-lg font-bold transition ${
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

  return (
    <main className="mx-auto w-full max-w-4xl px-2 pb-10 pt-2 sm:px-6 sm:pt-4">
      <header className="card mb-2 flex items-center gap-2 p-2 sm:mb-4 sm:gap-3 sm:p-4">
        <Avatar avatar={player.avatar} theme={player.theme} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`flex items-center gap-1 text-2xl font-black tabular-nums ${seconds <= 10 ? 'animate-pulse text-rose-500' : theme.text}`}>
              <Timer size={22} />
              {seconds}
              {flash && <span className="ms-1 text-lg text-rose-500 animate-pop">{flash}</span>}
            </span>
            <span className="text-sm font-bold text-slate-500">✅ {session.correct}</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-[width] duration-100 ${seconds <= 10 ? 'bg-rose-400' : theme.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-2xl bg-amber-50 px-2 py-2 text-xl font-black text-amber-500 sm:px-3">
          <Star size={22} className="fill-amber-400 text-amber-400" />
          {session.stars}
        </div>
        {session.streak >= 2 && (
          <div className="hidden items-center gap-1 rounded-2xl bg-orange-50 px-3 py-2 text-xl font-black text-orange-500 sm:flex">
            <Flame size={22} className="fill-orange-300" />
            {session.streak}
          </div>
        )}
        <SoundToggle enabled={soundOn} onToggle={onToggleSound} />
        <button type="button" className="icon-btn" onClick={finish} aria-label="סיום המרוץ" title="סיום">
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
      />
    </main>
  );
}
