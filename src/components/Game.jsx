import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flame, Star, VolumeX, X } from 'lucide-react';
import Avatar from './Avatar';
import Modal from './Modal';
import QuestionCard from './QuestionCard';
import FactModal from './FactModal';
import SoundToggle from './SoundToggle';
import { useSpeech } from '../hooks/useSpeech';
import { getTheme } from '../data/themes';
import { g } from '../data/profiles';
import { buildRound, markSeen, speechForQuestion, starsForAnswer } from '../utils/game';
import { playClick, playCorrect, playWrong } from '../utils/sound';
import { burstCorrect } from '../utils/confetti';

const cheers = ['כל הכבוד!', 'מעולה!', 'וואו, צדקת!', 'אלופים!', 'יש! בול!', 'מדהים!'];
const encouragements = ['לא נורא, ככה לומדים!', 'כמעט! בפעם הבאה זה יצליח', 'טעויות עוזרות לנו ללמוד 💪', 'לא נורא, ממשיכים!'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const FACT_DELAY_MS = 1500;

export default function Game({ player, onUpdatePlayer, onFinish, onQuit, soundOn, onToggleSound }) {
  const theme = getTheme(player.theme);
  const visual = player.difficulty === 'easy';
  // הסבב נבנה פעם אחת בתחילת המשחק
  const [round] = useState(() => buildRound(player.difficulty, player.stats.seen));
  const startStickers = useRef(player.stickers);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null); // { correct, message, earned }
  const [showFact, setShowFact] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [session, setSession] = useState({ correct: 0, stars: 0, streak: 0, bestStreak: 0 });
  const timer = useRef(null);
  const { speak, cancel, speaking, supported, hasHebrewVoice, voicesLoaded } = useSpeech({ rate: visual ? 0.85 : 0.95 });

  const question = round[index];
  const isLast = index === round.length - 1;

  const readQuestion = useCallback(() => speak(speechForQuestion(question)), [speak, question]);
  const readFact = useCallback(() => {
    const opener = feedback?.correct ? 'צדקת!' : `התשובה הנכונה היא: ${question.options[question.correctIndex]}.`;
    speak([opener, 'הידעת?', question.explanation]);
  }, [speak, question, feedback]);

  // הקראה אוטומטית של כל שאלה חדשה (לעידו)
  useEffect(() => {
    if (player.autoRead) readQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, player.autoRead]);

  // הקראה אוטומטית של "הידעת?"
  useEffect(() => {
    if (showFact && player.autoRead) readFact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFact]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleAnswer = useCallback(
    (i) => {
      if (selected !== null || !question) return;
      setSelected(i);
      cancel();
      const correct = i === question.correctIndex;
      const streak = correct ? session.streak + 1 : 0;
      const earned = starsForAnswer(correct, streak);

      setSession((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        stars: s.stars + earned,
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
      }));
      setFeedback({ correct, earned, message: correct ? pick(cheers) : pick(encouragements) });

      if (correct) {
        playCorrect();
        burstCorrect(streak);
      } else {
        playWrong();
      }

      // ההתקדמות נשמרת מיד אחרי כל תשובה, כך ששום כוכב לא הולך לאיבוד
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
          seen: markSeen(p.difficulty, p.stats.seen, question.id),
        },
      }));

      timer.current = setTimeout(() => setShowFact(true), FACT_DELAY_MS);
    },
    [selected, question, session.streak, cancel, onUpdatePlayer, player.id],
  );

  const next = useCallback(() => {
    cancel();
    playClick();
    if (isLast) {
      const perfect = session.correct === round.length;
      onUpdatePlayer(player.id, (p) => ({
        ...p,
        stats: { ...p.stats, gamesPlayed: p.stats.gamesPlayed + 1, perfectGames: p.stats.perfectGames + (perfect ? 1 : 0) },
      }));
      onFinish({
        correct: session.correct,
        total: round.length,
        stars: session.stars,
        bestStreak: session.bestStreak,
        startStickers: startStickers.current,
      });
      return;
    }
    setShowFact(false);
    setFeedback(null);
    setSelected(null);
    setIndex((n) => n + 1);
  }, [cancel, isLast, session, round.length, onUpdatePlayer, player.id, onFinish]);

  // מקלדת: 1-4 לבחירת תשובה, Enter להמשך
  useEffect(() => {
    const onKey = (e) => {
      if (confirmQuit) return;
      if (showFact && e.key === 'Enter') return; // כפתור ההמשך כבר בפוקוס
      const n = Number(e.key);
      if (!showFact && n >= 1 && n <= question.options.length) handleAnswer(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleAnswer, question, showFact, confirmQuit]);

  const progress = useMemo(() => round.map((_, i) => i), [round]);

  if (!question) return null;

  return (
    <main className="mx-auto w-full max-w-4xl px-3 pb-10 pt-4 sm:px-6">
      {/* כותרת המשחק */}
      <header className="card mb-4 flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
        <Avatar avatar={player.avatar} theme={player.theme} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`truncate text-lg font-bold ${theme.text}`}>{player.name}</span>
            <span className="whitespace-nowrap text-sm font-bold text-slate-500">
              <span className="hidden sm:inline">שאלה </span>
              {index + 1} מתוך {round.length}
            </span>
          </div>
          <div className="mt-2 flex gap-1" aria-hidden="true">
            {progress.map((i) => (
              <div
                key={i}
                className={`h-3 flex-1 rounded-full transition-all duration-500 ${
                  i < index || (i === index && selected !== null) ? theme.bar : i === index ? `${theme.bar} opacity-40` : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-2xl bg-amber-50 px-2 py-2 text-xl sm:px-3 font-black text-amber-500" title="כוכבים במשחק הזה">
          <Star size={22} className="fill-amber-400 text-amber-400" />
          <span key={session.stars} className="inline-block animate-pop">
            {session.stars}
          </span>
        </div>
        {session.streak >= 2 && (
          <div
            className="hidden items-center gap-1 rounded-2xl bg-orange-50 px-3 py-2 text-xl font-black text-orange-500 animate-pop sm:flex"
            title="רצף תשובות נכונות"
          >
            <Flame size={22} className="fill-orange-300" />
            {session.streak}
          </div>
        )}
        <SoundToggle enabled={soundOn} onToggle={onToggleSound} />
        <button type="button" className="icon-btn" onClick={() => setConfirmQuit(true)} aria-label="יציאה מהמשחק" title="יציאה">
          <X size={24} />
        </button>
      </header>

      {player.autoRead && supported && voicesLoaded && !hasHebrewVoice && (
        <p className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-800">
          <VolumeX size={18} />
          לא נמצא קול בעברית במכשיר הזה, ולכן ייתכן שההקראה לא תעבוד. אפשר להתקין קול עברי בהגדרות המכשיר.
        </p>
      )}

      <QuestionCard
        key={question.id}
        question={question}
        selected={selected}
        onSelect={handleAnswer}
        onRead={readQuestion}
        onSpeakOption={player.autoRead && supported ? (text) => speak(text) : undefined}
        speaking={speaking}
        speechSupported={supported}
        visual={visual}
      />

      {feedback && (
        <div
          className={`mx-auto mt-4 w-fit rounded-full px-6 py-3 text-center text-2xl font-bold shadow-pop-sm animate-pop ${
            feedback.correct ? 'bg-emerald-500 text-white' : 'bg-white text-rose-500'
          }`}
          role="status"
        >
          {feedback.correct ? `${feedback.message} ⭐ +${feedback.earned}` : feedback.message}
          {feedback.correct && session.streak >= 3 && <span className="ms-2">🔥 בונוס רצף!</span>}
        </div>
      )}

      <FactModal
        open={showFact}
        question={question}
        correct={feedback?.correct}
        earned={feedback?.earned}
        onNext={next}
        isLast={isLast}
        onRead={readFact}
        speaking={speaking}
        speechSupported={supported}
      />

      <Modal open={confirmQuit} onClose={() => setConfirmQuit(false)} label="יציאה מהמשחק" className="max-w-sm">
        <div className="p-7 text-center">
          <div className="mb-2 text-6xl">🤔</div>
          <h2 className="mb-2 text-2xl font-bold">לצאת מהמשחק?</h2>
          <p className="mb-6 text-slate-600">הכוכבים שכבר נאספו יישמרו.</p>
          <div className="flex justify-center gap-3">
            <button type="button" className="btn bg-rose-500 text-white hover:bg-rose-600" onClick={() => (cancel(), onQuit())}>
              כן, לצאת
            </button>
            <button type="button" className="btn bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => setConfirmQuit(false)}>
              {g(player, 'ממשיך', 'ממשיכה')} לשחק
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
