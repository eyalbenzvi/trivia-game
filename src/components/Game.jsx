import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flame, Scissors, Star, VolumeX, X } from 'lucide-react';
import Avatar from './Avatar';
import Modal from './Modal';
import QuestionCard from './QuestionCard';
import FactModal from './FactModal';
import SoundToggle from './SoundToggle';
import MissionTrack from './MissionTrack';
import { poolFor } from '../data/questions';
import { useSpeech } from '../hooks/useSpeech';
import { getTheme } from '../data/themes';
import { g } from '../data/profiles';
import { buildRound, markSeen, shuffle, speechForQuestion, starsForAnswer } from '../utils/game';
import { playClick, playCorrect, playUnlock, playWrong } from '../utils/sound';
import { burstCorrect } from '../utils/confetti';

const cheers = ['כל הכבוד!', 'מעולה!', 'וואו, צדקת!', 'אלופים!', 'יש! בול!', 'מדהים!'];
const encouragements = ['לא נורא, ככה לומדים!', 'כמעט! בפעם הבאה זה יצליח', 'טעויות עוזרות לנו ללמוד 💪', 'לא נורא, ממשיכים!'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const FACT_DELAY_MS = 1500;
export const TEAM_LIFELINES = 3;

/** בניית רשימת התורות: במשחק משפחתי כל שחקן בתורו מקבל שאלה ברמה שלו */
const buildTurns = (players, bank, rounds) => {
  const lists = players.map((p) => buildRound(poolFor(bank, p.difficulty), p.stats.seen, rounds));
  const turns = [];
  for (let r = 0; r < rounds; r += 1) {
    players.forEach((p, i) => {
      if (lists[i][r]) turns.push({ playerId: p.id, question: lists[i][r] });
    });
  }
  return turns;
};

/**
 * מנוע המשחק. mode='solo' – שחקן אחד ו־10 שאלות.
 * mode='team' – משימה משפחתית: השחקנים מתחלפים בכל שאלה וכולם מקדמים יעד משותף.
 */
export default function Game({ mode = 'solo', players, bank, rounds = 10, mission, onUpdatePlayer, onFinish, onQuit, soundOn, onToggleSound }) {
  const team = mode === 'team';
  // התורות נבנים פעם אחת בתחילת המשחק
  const [turns] = useState(() => buildTurns(players, bank, team ? rounds : 10));
  const startStickers = useRef(Object.fromEntries(players.map((p) => [p.id, p.stickers])));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState(team ? 'handoff' : 'question'); // handoff | question
  const [selected, setSelected] = useState(null);
  const [removed, setRemoved] = useState([]); // תשובות שהוסרו בעזרת "חצי-חצי"
  const [feedback, setFeedback] = useState(null); // { correct, message, earned }
  const [showFact, setShowFact] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [lifelines, setLifelines] = useState(team ? TEAM_LIFELINES : 0);
  const [session, setSession] = useState(() => ({
    correct: 0,
    stars: 0,
    streak: 0,
    bestStreak: 0,
    perPlayer: Object.fromEntries(players.map((p) => [p.id, { correct: 0, answered: 0, stars: 0, streak: 0 }])),
  }));
  const timer = useRef(null);
  const { speak, cancel, speaking, supported, hasHebrewVoice, voicesLoaded } = useSpeech();

  const turn = turns[index];
  const question = turn?.question;
  const player = players.find((p) => p.id === turn?.playerId) || players[0];
  const theme = getTheme(player.theme);
  const visual = player.difficulty === 'easy';
  const isLast = index === turns.length - 1;
  const rate = visual ? 0.85 : 0.95;
  const goal = team ? Math.ceil(turns.length * 0.6) : 0;

  const readQuestion = useCallback(() => {
    if (!question) return;
    const visible = { ...question, options: question.options.filter((_, i) => !removed.includes(i)) };
    speak(speechForQuestion(visible), { rate });
  }, [speak, question, removed, rate]);

  const readFact = useCallback(() => {
    const opener = feedback?.correct ? 'תשובה נכונה!' : `התשובה הנכונה היא: ${question.options[question.correctIndex]}.`;
    speak([opener, 'הידעת?', question.explanation], { rate });
  }, [speak, question, feedback, rate]);

  // הקראה אוטומטית של כל שאלה חדשה למי שהגדיר הקראה (למשל עידו)
  useEffect(() => {
    if (phase === 'question' && player.autoRead) readQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase]);

  useEffect(() => {
    if (showFact && player.autoRead) readFact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFact]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleAnswer = useCallback(
    (i) => {
      if (selected !== null || !question || phase !== 'question' || removed.includes(i)) return;
      setSelected(i);
      cancel();
      const correct = i === question.correctIndex;
      const streak = correct ? session.streak + 1 : 0;
      const playerStreak = correct ? session.perPlayer[player.id].streak + 1 : 0;
      const earned = starsForAnswer(correct, streak);

      setSession((s) => {
        const pp = s.perPlayer[player.id];
        return {
          correct: s.correct + (correct ? 1 : 0),
          stars: s.stars + earned,
          streak,
          bestStreak: Math.max(s.bestStreak, streak),
          perPlayer: {
            ...s.perPlayer,
            [player.id]: { correct: pp.correct + (correct ? 1 : 0), answered: pp.answered + 1, stars: pp.stars + earned, streak: playerStreak },
          },
        };
      });
      setFeedback({ correct, earned, message: correct ? pick(cheers) : pick(encouragements) });

      if (correct) {
        playCorrect();
        burstCorrect(streak);
      } else {
        playWrong();
      }

      // ההתקדמות נשמרת מיד אחרי כל תשובה, כך ששום כוכב לא הולך לאיבוד
      const pool = poolFor(bank, player.difficulty);
      onUpdatePlayer(player.id, (p) => ({
        ...p,
        stats: {
          ...p.stats,
          stars: p.stats.stars + earned,
          totalAnswered: p.stats.totalAnswered + 1,
          totalCorrect: p.stats.totalCorrect + (correct ? 1 : 0),
          bestStreak: Math.max(p.stats.bestStreak, team ? playerStreak : streak),
          categoryCorrect: correct
            ? { ...p.stats.categoryCorrect, [question.category]: (p.stats.categoryCorrect[question.category] || 0) + 1 }
            : p.stats.categoryCorrect,
          seen: markSeen(pool, p.stats.seen, question.id),
        },
      }));

      timer.current = setTimeout(() => setShowFact(true), FACT_DELAY_MS);
    },
    [selected, question, phase, removed, session, player, team, bank, cancel, onUpdatePlayer],
  );

  const applyLifeline = () => {
    if (!lifelines || selected !== null || removed.length) return;
    playUnlock();
    const wrong = shuffle(question.options.map((_, i) => i).filter((i) => i !== question.correctIndex));
    // משאירים שתי תשובות: הנכונה ועוד אחת
    setRemoved(wrong.slice(0, question.options.length - 2));
    setLifelines((n) => n - 1);
  };

  const next = useCallback(() => {
    cancel();
    playClick();
    if (isLast) {
      players.forEach((p) => {
        const perfect = !team && session.correct === turns.length;
        onUpdatePlayer(p.id, (cur) => ({
          ...cur,
          stats: { ...cur.stats, gamesPlayed: cur.stats.gamesPlayed + 1, perfectGames: cur.stats.perfectGames + (perfect ? 1 : 0) },
        }));
      });
      onFinish({
        mode,
        mission,
        goal,
        correct: session.correct,
        total: turns.length,
        stars: session.stars,
        bestStreak: session.bestStreak,
        perPlayer: session.perPlayer,
        startStickers: startStickers.current,
      });
      return;
    }
    setShowFact(false);
    setFeedback(null);
    setSelected(null);
    setRemoved([]);
    setIndex((n) => n + 1);
    if (team) setPhase('handoff');
  }, [cancel, isLast, players, team, session, turns.length, onUpdatePlayer, onFinish, mode, mission, goal]);

  // מקלדת: 1-4 לבחירת תשובה
  useEffect(() => {
    const onKey = (e) => {
      if (confirmQuit || showFact || phase !== 'question' || !question) return;
      const n = Number(e.key);
      if (n >= 1 && n <= question.options.length) handleAnswer(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleAnswer, question, showFact, confirmQuit, phase]);

  const progress = useMemo(() => turns.map((_, i) => i), [turns]);

  if (!question) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-6xl">🤷</div>
        <p className="text-xl font-bold text-slate-600">לא נמצאו שאלות לרמה הזאת</p>
        <button type="button" className="btn btn-white" onClick={onQuit}>
          חזרה
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-2 pb-24 pt-2 sm:px-6 sm:pt-4">
      <header className="card mb-2 flex items-center gap-2 p-2 sm:mb-4 sm:gap-3 sm:p-4">
        <Avatar avatar={player.avatar} theme={player.theme} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`truncate text-lg font-bold ${theme.text}`}>
              {player.name}
            </span>
            <span className="whitespace-nowrap text-sm font-bold text-slate-500">
              <span className="hidden sm:inline">שאלה </span>
              {index + 1} מתוך {turns.length}
            </span>
          </div>
          {team ? (
            <MissionTrack mission={mission} correct={session.correct} goal={goal} compact />
          ) : (
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
          )}
        </div>
        <div className="flex items-center gap-1 rounded-2xl bg-amber-50 px-2 py-2 text-xl font-black text-amber-500 sm:px-3" title="כוכבים במשחק הזה">
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

      {phase === 'handoff' ? (
        <section className="card flex flex-col items-center px-6 py-10 text-center animate-pop">
          <p className="text-lg font-bold text-slate-500">
            שאלה {index + 1} מתוך {turns.length}
          </p>
          <Avatar avatar={player.avatar} theme={player.theme} size="xl" className="my-5 animate-wiggle" />
          <h2 className={`text-4xl font-bold sm:text-5xl ${theme.text}`}>התור של {player.name}!</h2>
          <p className="mt-3 text-lg text-slate-500">
            כל המשפחה מחזיקה אצבעות 🤞
          </p>
          <button
            type="button"
            onClick={() => {
              playClick();
              setPhase('question');
            }}
            className={`btn mt-8 px-12 py-5 text-2xl text-white ${theme.button}`}
            autoFocus
          >
            {g(player, 'אני מוכן!', 'אני מוכנה!')}
          </button>
        </section>
      ) : (
        <>
          <QuestionCard
            key={`${index}-${question.id}`}
            question={question}
            selected={selected}
            removed={removed}
            onSelect={handleAnswer}
            onRead={readQuestion}
            onSpeakOption={player.autoRead && supported ? (text) => speak(text, { rate }) : undefined}
            speaking={speaking}
            speechSupported={supported}
            visual={visual}
          />

          {team && selected === null && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={applyLifeline}
                disabled={!lifelines || removed.length > 0}
                className="btn bg-white text-violet-600 hover:bg-violet-50"
                title="מוריד תשובות שגויות ומשאיר שתיים"
              >
                <Scissors size={20} />
                חצי-חצי
                <span className="rounded-full bg-violet-100 px-2 text-sm">{lifelines}</span>
              </button>
            </div>
          )}
        </>
      )}

      {feedback && (
        <div
          className={`fixed inset-x-0 bottom-4 z-40 mx-auto w-fit max-w-[92vw] rounded-full px-5 py-3 text-center text-lg font-bold shadow-soft animate-pop sm:text-2xl ${
            feedback.correct ? 'bg-emerald-500 text-white' : 'bg-white text-rose-500 ring-2 ring-rose-200'
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
        nextLabel={team && !isLast ? `התור של ${players.find((p) => p.id === turns[index + 1]?.playerId)?.name}` : undefined}
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
              ממשיכים לשחק
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
