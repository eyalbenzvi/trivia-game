import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flame, Star, Volume2, VolumeX, X } from 'lucide-react';
import Avatar from './Avatar';
import Modal from './Modal';
import QuestionCard, { FeedbackPill, keyToOption } from './QuestionCard';
import FactModal from './FactModal';
import SoundToggle from './SoundToggle';
import MissionTrack from './MissionTrack';
import { useSpeech } from '../hooks/useSpeech';
import { getTheme } from '../data/themes';
import { g } from '../data/profiles';
import { PERFECT_MIN } from '../data/stickers';
import { categories, categoryByName } from '../data/categories';
import { MEDALS, medalsFor, teamMilestones } from '../data/missions';
import {
  QUESTIONS_PER_ROUND,
  STREAK_BONUS_FROM,
  buildSoloRound,
  buildTopicRound,
  buildTurns,
  gamePool,
  markSeen,
  shuffle,
  speechForQuestion,
  starsForAnswer,
  streakBonus,
  topicList,
  updateReview,
} from '../utils/game';
import { playClick, playCorrect, playMedal, playUnlock, playWrong } from '../utils/sound';
import { burstCorrect } from '../utils/confetti';

const cheers = ['כל הכבוד!', 'מעולה!', 'וואו, צדקת!', 'אלופים!', 'יש! בול!', 'מדהים!'];
const encouragements = ['לא נורא, ככה לומדים!', 'כמעט! בפעם הבאה זה יצליח', 'טעויות עוזרות לנו ללמוד 💪', 'לא נורא, ממשיכים!'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const FACT_DELAY_MS = 1500;
// אחרי תשובה נכונה, מי שקורא לבד ממשיך אוטומטית אחרי 6 שניות
// לכל שחקן במשימה המשפחתית עזרה אישית אחת – כדי שלא ינוצלו כולן ע"י הראשון בתור
export const LIFELINES_PER_PLAYER = 1;
// תשובה נכונה לשאלת הבוס מקדמת את הצוות בשני צעדים
export const BOSS_STEPS = 2;
const RECENT_GAMES = 3;

const emptyPlayerStats = () => ({ correct: 0, answered: 0, stars: 0, streak: 0, bestStreak: 0, rescues: 0 });

/**
 * מנוע המשחק. mode='solo' – שחקן אחד ו־10 שאלות מכל הנושאים.
 * mode='topic' – "טריוויה לפי נושא": השחקן בוחר נושא ומקבל 10 שאלות ממנו.
 * mode='team' – משימה משפחתית: השחקנים מתחלפים בכל שאלה וכולם מקדמים יעד משותף, ובסוף שאלת בוס לכולם.
 */
export default function Game({ mode = 'solo', players, bank, rounds = 10, mission, onUpdatePlayer, onFinish, onQuit, soundOn, onToggleSound }) {
  const team = mode === 'team';
  const byTopic = mode === 'topic';
  const solo = players[0];
  // במשחק לפי נושא בוחרים קודם נושא, ואז נבנה הסבב
  const [choices] = useState(() => (byTopic ? topicList(bank, solo, categories.map((c) => c.name)) : []));
  const [turns, setTurns] = useState(() =>
    team ? buildTurns(players, bank, rounds) : byTopic ? null : buildSoloRound(bank, solo).map((q) => ({ playerId: solo.id, question: q })),
  );
  const [focusCategory, setFocusCategory] = useState(null);
  const startStickers = useRef(Object.fromEntries(players.map((p) => [p.id, p.stickers])));
  const startStars = useRef(Object.fromEntries(players.map((p) => [p.id, p.stats.stars])));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState(team ? 'handoff' : turns ? 'question' : 'pick'); // pick | handoff | question
  const [selected, setSelected] = useState(null);
  const [removed, setRemoved] = useState([]); // תשובות שהוסרו בעזרת "חצי-חצי"
  const [feedback, setFeedback] = useState(null); // { correct, message, earned, streak, medal }
  const [notice, setNotice] = useState(null); // הודעה קצרה (למשל אחרי שימוש בעזרה)
  const [showFact, setShowFact] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [lifelines, setLifelines] = useState(() => Object.fromEntries(players.map((p) => [p.id, team ? LIFELINES_PER_PLAYER : 0])));
  const [session, setSession] = useState(() => ({
    correct: 0,
    stars: 0,
    streak: 0,
    bestStreak: 0,
    missed: [],
    bossCorrect: null,
    perPlayer: Object.fromEntries(players.map((p) => [p.id, emptyPlayerStats()])),
  }));
  const timer = useRef(null);
  const noticeTimer = useRef(null);
  const { speak, cancel, speaking, supported, hasHebrewVoice, voicesLoaded } = useSpeech();
  // הודעת "אין קול עברי" מוצגת בשאלה אחת בלבד (הראשונה שבה צריך הקראה) – כדי לא לדחוף את התשובות מטה בכל תור
  const [voiceNoticeAt, setVoiceNoticeAt] = useState(null);

  const list = turns || [];
  const turn = list[index];
  const question = turn?.question;
  const isBoss = Boolean(turn?.boss);
  const player = players.find((p) => p.id === turn?.playerId) || solo;
  const theme = getTheme(isBoss ? 'sky' : player.theme);
  const visual = !isBoss && player.difficulty === 'easy';
  const isLast = index === list.length - 1;
  // בשאלת הבוס מקריאים אם מישהו מהמשתתפים צריך הקראה
  const autoRead = isBoss ? players.some((p) => p.autoRead) : player.autoRead;
  const rate = visual || (isBoss && autoRead) ? 0.85 : 0.95;
  const playerTurns = useMemo(() => list.filter((t) => !t.boss).length, [list]);
  const milestones = team ? teamMilestones(playerTurns) : null;
  const playerStreak = team ? session.perPlayer[player.id]?.streak || 0 : session.streak;

  const readQuestion = useCallback(() => {
    if (!question) return;
    const visible = { ...question, options: question.options.filter((_, i) => !removed.includes(i)) };
    speak(speechForQuestion(visible), { rate });
  }, [speak, question, removed, rate]);

  const readFact = useCallback(() => {
    const opener = feedback?.correct ? 'תשובה נכונה!' : `התשובה הנכונה היא: ${question.options[question.correctIndex]}.`;
    speak([opener, 'הידעת?', question.explanation], { rate });
  }, [speak, question, feedback, rate]);

  const handoffText = isBoss
    ? 'שאלת הבוס! כל המשפחה עונה ביחד. תשובה נכונה מקדמת אותנו בשני צעדים.'
    : `${player.name}, תורך! ${g(player, 'לחץ', 'לחצי')} על הכפתור ${g(player, 'כשאתה מוכן', 'כשאת מוכנה')}.`;
  const readHandoff = useCallback(() => speak(handoffText, { rate: 0.9 }), [speak, handoffText]);

  const readChoices = useCallback(() => {
    speak(['באיזה נושא נשחק?', 'בחרו נושא מהרשימה, או לחצו על הקובייה ואני אבחר.'], { rate: 0.85 });
  }, [speak]);

  // הקראה אוטומטית של כל שאלה חדשה (ושל מסך המעבר) למי שהגדיר הקראה – למשל עידו
  useEffect(() => {
    if (phase === 'question' && autoRead) readQuestion();
    if (phase === 'handoff' && autoRead) readHandoff();
    if (phase === 'pick' && solo.autoRead) readChoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase]);

  // משחק משפחתי: אחרי "אני מוכן" (שאולי נלחץ אחרי גלילה) השאלה נפתחת מראש העמוד
  useEffect(() => {
    if (team && phase === 'question') window.scrollTo({ top: 0 });
  }, [team, phase, index]);

  useEffect(() => {
    if (voiceNoticeAt === null && autoRead && supported && voicesLoaded && !hasHebrewVoice) setVoiceNoticeAt(index);
  }, [voiceNoticeAt, autoRead, supported, voicesLoaded, hasHebrewVoice, index]);

  useEffect(() => {
    if (showFact && autoRead) readFact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFact]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(noticeTimer.current);
    },
    [],
  );

  const startRound = (category) => {
    playClick();
    cancel();
    setFocusCategory(category);
    setTurns(buildTopicRound(bank, solo, category).map((q) => ({ playerId: solo.id, question: q })));
    setPhase('question');
  };

  const showNotice = (text) => {
    clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  };

  const handleAnswer = useCallback(
    (i) => {
      if (selected !== null || !question || phase !== 'question' || removed.includes(i)) return;
      setSelected(i);
      setNotice(null);
      cancel();
      const correct = i === question.correctIndex;

      if (isBoss) {
        setSession((s) => ({ ...s, correct: s.correct + (correct ? BOSS_STEPS : 0), bossCorrect: correct }));
        const before = medalsFor(session.correct, playerTurns);
        const after = medalsFor(session.correct + (correct ? BOSS_STEPS : 0), playerTurns);
        const message = correct ? `כל המשפחה צדקה! 👾 עוד ${BOSS_STEPS} צעדים` : 'לא נורא – היה כיף לחשוב ביחד!';
        setFeedback({ correct, earned: 0, message, medal: after > before ? MEDALS[after - 1] : null });
        if (correct) {
          playCorrect();
          burstCorrect(3);
          if (after > before) setTimeout(playMedal, 400);
        } else playWrong();
        if (autoRead) speak(message, { rate });
        // כל המשפחה ענתה על שאלת הבוס – היא נרשמת בזיכרון של כל שחקן
        players.forEach((p) =>
          onUpdatePlayer(p.id, (cur) => ({ ...cur, stats: { ...cur.stats, seen: markSeen(gamePool(bank, cur.difficulty), cur.stats.seen, question.id) } })),
        );
        timer.current = setTimeout(() => setShowFact(true), FACT_DELAY_MS);
        return;
      }

      const pp = session.perPlayer[player.id];
      // הרצף האישי של השחקן קובע את הבונוס (גם במשחק המשפחתי – לא הרצף של מי שענה לפניו)
      const streakNow = correct ? (team ? pp.streak : session.streak) + 1 : 0;
      const flags = { bonus: question.bonus, champion: question.champion, review: question.review };
      const earned = starsForAnswer(correct, streakNow, player.difficulty, flags);
      // "המציל": תשובה נכונה כשהצוות היה מאחורי הקצב שנדרש ליעד
      const turnNo = list.slice(0, index).filter((t) => !t.boss).length;
      const behind = team && session.correct < (milestones.goal * turnNo) / playerTurns;
      const medalBefore = team ? medalsFor(session.correct, playerTurns) : 0;
      const medalAfter = team ? medalsFor(session.correct + (correct ? 1 : 0), playerTurns) : 0;

      setSession((s) => {
        const cur = s.perPlayer[player.id];
        return {
          ...s,
          correct: s.correct + (correct ? 1 : 0),
          stars: s.stars + earned,
          streak: correct ? s.streak + 1 : 0,
          bestStreak: Math.max(s.bestStreak, correct ? s.streak + 1 : 0),
          missed: correct ? s.missed : [...s.missed, { question: question.question, answer: question.options[question.correctIndex], icon: question.icon }],
          perPlayer: {
            ...s.perPlayer,
            [player.id]: {
              correct: cur.correct + (correct ? 1 : 0),
              answered: cur.answered + 1,
              stars: cur.stars + earned,
              streak: streakNow,
              bestStreak: Math.max(cur.bestStreak, streakNow),
              rescues: cur.rescues + (correct && behind ? 1 : 0),
            },
          },
        };
      });
      const message = correct ? pick(cheers) : pick(encouragements);
      setFeedback({ correct, earned, message, streak: streakNow, bonus: streakBonus(player.difficulty), medal: medalAfter > medalBefore ? MEDALS[medalAfter - 1] : null });

      if (correct) {
        playCorrect();
        burstCorrect(streakNow);
        if (medalAfter > medalBefore) setTimeout(playMedal, 400);
      } else {
        playWrong();
      }
      // משוב קולי למי שלא קורא
      if (autoRead) speak(message, { rate });

      // ההתקדמות נשמרת מיד אחרי כל תשובה, כך ששום כוכב לא הולך לאיבוד
      const pool = gamePool(bank, player.difficulty);
      onUpdatePlayer(player.id, (p) => ({
        ...p,
        stats: {
          ...p.stats,
          stars: p.stats.stars + earned,
          totalAnswered: p.stats.totalAnswered + 1,
          totalCorrect: p.stats.totalCorrect + (correct ? 1 : 0),
          bestStreak: Math.max(p.stats.bestStreak, streakNow),
          categoryCorrect: correct
            ? { ...p.stats.categoryCorrect, [question.category]: (p.stats.categoryCorrect[question.category] || 0) + 1 }
            : p.stats.categoryCorrect,
          seen: markSeen(pool, p.stats.seen, question.id),
          review: !correct || question.review ? updateReview(p.stats.review, question.id, correct) : p.stats.review || [],
          championCorrect: (p.stats.championCorrect || 0) + (correct && question.champion ? 1 : 0),
        },
      }));

      timer.current = setTimeout(() => setShowFact(true), FACT_DELAY_MS);
    },
    [selected, question, phase, removed, session, player, players, team, bank, cancel, onUpdatePlayer, isBoss, playerTurns, autoRead, speak, rate, list, index, milestones],
  );

  const applyLifeline = () => {
    if (!lifelines[player.id] || selected !== null || removed.length) return;
    playUnlock();
    const wrong = shuffle(question.options.map((_, i) => i).filter((i) => i !== question.correctIndex));
    // משאירים שתי תשובות: הנכונה ועוד אחת
    const out = wrong.slice(0, question.options.length - 2);
    setRemoved(out);
    setLifelines((l) => ({ ...l, [player.id]: l[player.id] - 1 }));
    const text = visual ? '🗣️ הורדנו תשובה! אפשר לבקש רמז מאבא או אמא' : '✂️ הורדנו תשובות לא נכונות!';
    showNotice(text);
    if (autoRead) speak(out.length === 1 ? 'הורדתי תשובה אחת. אפשר לבקש רמז מאבא או אמא' : 'הורדתי תשובות לא נכונות', { rate });
  };

  const next = useCallback(() => {
    cancel();
    playClick();
    if (isLast) {
      const total = playerTurns;
      players.forEach((p) => {
        const perfect = !team && total === QUESTIONS_PER_ROUND && session.correct >= (PERFECT_MIN[p.difficulty] ?? 10);
        onUpdatePlayer(p.id, (cur) => ({
          ...cur,
          stats: {
            ...cur.stats,
            gamesPlayed: cur.stats.gamesPlayed + 1,
            perfectGames: cur.stats.perfectGames + (perfect ? 1 : 0),
            // שלושת המשחקים האחרונים (לרמז "אולי לנסות רמה אחרת?")
            recent: team ? cur.stats.recent || [] : [...(cur.stats.recent || []), { c: session.correct, t: total, d: cur.difficulty }].slice(-RECENT_GAMES),
          },
        }));
      });
      onFinish({
        mode,
        mission,
        correct: session.correct,
        total,
        stars: session.stars,
        bestStreak: session.bestStreak,
        missed: session.missed,
        bossCorrect: session.bossCorrect,
        focusCategory,
        perPlayer: session.perPlayer,
        startStickers: startStickers.current,
        startStars: startStars.current,
      });
      return;
    }
    setShowFact(false);
    setFeedback(null);
    setNotice(null);
    setSelected(null);
    setRemoved([]);
    setIndex((n) => n + 1);
    if (team) setPhase('handoff');
  }, [cancel, isLast, players, team, session, playerTurns, onUpdatePlayer, onFinish, mode, mission, focusCategory]);

  // מקלדת: 1–4 או א–ד לבחירת תשובה (בלי Ctrl/Alt ובלי החזקת מקש)
  useEffect(() => {
    const onKey = (e) => {
      if (confirmQuit || showFact) return;
      if (phase === 'pick') {
        const n = keyToOption(e, choices.length);
        if (n >= 0 && choices[n]) startRound(choices[n].name);
        return;
      }
      if (phase !== 'question' || !question) return;
      const n = keyToOption(e, question.options.length);
      if (n >= 0) handleAnswer(n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleAnswer, question, showFact, confirmQuit, phase, choices]);

  const quitModal = (
    <Modal open={confirmQuit} onClose={() => setConfirmQuit(false)} label="יציאה מהמשחק" className="max-w-sm">
      <div className="p-7 text-center">
        <div className="mb-2 text-6xl">🤔</div>
        <h2 className="mb-2 text-2xl font-bold">לצאת מהמשחק?</h2>
        <p className="mb-6 text-slate-600">הכוכבים שכבר נאספו יישמרו.</p>
        <div className="flex justify-center gap-3">
          <button type="button" className="btn bg-rose-500 text-white hover:bg-rose-600" onClick={() => (cancel(), onQuit())}>
            כן, לצאת
          </button>
          <button type="button" className="btn bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => setConfirmQuit(false)} autoFocus>
            ממשיכים לשחק
          </button>
        </div>
      </div>
    </Modal>
  );

  // ---- טריוויה לפי נושא: בחירת הנושא ----
  if (phase === 'pick') {
    const soloTheme = getTheme(solo.theme);
    return (
      <main className="mx-auto w-full max-w-4xl px-3 pb-12 pt-3 sm:px-6 sm:pt-6">
        <header className="mb-3 flex items-center gap-2">
          <Avatar avatar={solo.avatar} theme={solo.theme} size="sm" />
          <h1 className={`min-w-0 flex-1 text-2xl font-bold leading-tight sm:text-3xl ${soloTheme.text}`}>באיזה נושא נשחק?</h1>
          {supported && solo.autoRead && (
            <button type="button" onClick={readChoices} className="icon-btn text-sky-600" aria-label="הקראה">
              <Volume2 size={22} />
            </button>
          )}
          <button type="button" className="icon-btn" onClick={() => (cancel(), onQuit())} aria-label="חזרה" title="חזרה">
            <X size={24} />
          </button>
        </header>
        <div className="mb-4 text-center">
          <button type="button" className="btn btn-white" onClick={() => choices.length && startRound(pick(choices).name)}>
            🎲 {g(solo, 'תבחר', 'תבחרי')} בשבילי
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {choices.map(({ name, fresh }) => {
            const meta = categoryByName[name] || { emoji: '❓', banner: 'from-sky-200 to-violet-200' };
            return (
              <button
                key={name}
                type="button"
                onClick={() => startRound(name)}
                className={`flex min-h-[7.5rem] flex-col items-center justify-center gap-1 rounded-3xl border-4 border-white bg-gradient-to-l ${meta.banner} px-2 py-3 text-center shadow-pop-sm transition hover:-translate-y-1 hover:shadow-pop focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-400`}
              >
                <span className="text-4xl leading-none drop-shadow sm:text-5xl" aria-hidden="true">
                  {meta.emoji}
                </span>
                <span className="min-w-0 text-lg font-bold leading-tight text-slate-800 [overflow-wrap:anywhere] sm:text-xl">{name}</span>
                <span className="text-xs font-bold text-slate-600 sm:text-sm">{fresh ? `${fresh.toLocaleString('he-IL')} שאלות חדשות` : 'כבר ענית על הכול'}</span>
              </button>
            );
          })}
        </div>
      </main>
    );
  }

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

  const nextTurn = list[index + 1];
  const nextLabel = team && !isLast ? (nextTurn?.boss ? 'לשאלת הבוס 👾' : `התור של ${players.find((p) => p.id === nextTurn?.playerId)?.name}`) : undefined;
  const leftForPlayer = lifelines[player.id] || 0;

  const tag = isBoss ? (
    <span className="whitespace-nowrap rounded-full bg-slate-800 px-3 py-1 text-sm font-bold text-white shadow-sm sm:text-base">👾 שאלת הבוס</span>
  ) : question.champion ? (
    <span className="whitespace-nowrap rounded-full bg-rose-500 px-3 py-1 text-sm font-bold text-white shadow-sm sm:text-base" title="שאלה מהרמה שמעל – שווה 30 כוכבים, וטעות לא עולה כלום">
      🌶️ שאלת אלוף<span className="hidden sm:inline"> – שווה 30 כוכבים!</span>
    </span>
  ) : question.bonus ? (
    <span className="whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-amber-950 shadow-sm sm:text-base">⭐ כפול כוכבים</span>
  ) : question.review ? (
    <span className="whitespace-nowrap rounded-full bg-teal-500 px-3 py-1 text-sm font-bold text-white shadow-sm sm:text-base">🔁 שאלת חזרה</span>
  ) : null;

  const counterTotal = team ? playerTurns : list.length;
  const counterText = isBoss ? 'שאלת בוס' : `שאלה ${index + 1} מתוך ${counterTotal}`;
  const counterShort = `${index + 1}/${counterTotal}`;
  const counterLabel = isBoss ? 'שאלת בוס' : counterText;
  // כוכבים ורצף – מוצגים בשורה הראשונה במסך רחב, ובשורת ההתקדמות בטלפון לאורך
  const scorePills = (
    <>
      <div
        className="flex items-center gap-1 rounded-2xl bg-amber-50 px-2 py-0.5 text-base font-black text-amber-500 sm:px-3 sm:py-2 sm:text-xl short:py-1 short:text-lg"
        title="כוכבים במשחק הזה"
      >
        <Star size={18} className="fill-amber-400 text-amber-400" />
        <span key={session.stars} className="inline-block animate-pop">
          {session.stars}
        </span>
      </div>
      {!isBoss && playerStreak >= 2 && (
        <div
          className="flex items-center gap-0.5 rounded-2xl bg-orange-50 px-2 py-0.5 text-base font-black text-orange-500 animate-pop sm:px-3 sm:py-2 sm:text-xl short:py-1 short:text-lg"
          title="רצף תשובות נכונות"
          aria-label={`רצף של ${playerStreak} תשובות נכונות`}
        >
          <Flame size={18} className="fill-orange-300" />
          {playerStreak}
        </div>
      )}
    </>
  );

  let status = null;
  if (feedback) {
    status = (
      <FeedbackPill tone={feedback.correct ? 'good' : 'bad'}>
        <span>
          {feedback.message}
          {feedback.correct && feedback.earned > 0 && (
            <>
              {' ⭐ '}
              {/* "+10" משמאל לימין – אחרת בעברית הוא מוצג "10+" */}
              <bdi dir="ltr">+{feedback.earned}</bdi>
            </>
          )}
        </span>
        {feedback.correct && feedback.streak >= STREAK_BONUS_FROM && <span>🔥 רצף {feedback.streak}!</span>}
        {feedback.correct && feedback.streak === STREAK_BONUS_FROM - 1 && <span>🔥 עוד אחת לבונוס!</span>}
        {feedback.medal && <span>{feedback.medal.emoji} מדליית {feedback.medal.label}!</span>}
      </FeedbackPill>
    );
  } else if (notice) {
    status = <FeedbackPill tone="info">{notice}</FeedbackPill>;
  }

  const lifelineTools =
    team && !isBoss && selected === null && !removed.length ? (
      leftForPlayer > 0 ? (
        <button
          type="button"
          onClick={applyLifeline}
          className="btn min-h-[48px] bg-violet-100 px-4 py-2 text-violet-700 ring-2 ring-violet-200 hover:bg-violet-200"
          title="מוריד תשובות שגויות"
        >
          {visual ? '🗣️ עזרה מאבא/אמא' : '✂️ חצי-חצי'}
        </button>
      ) : (
        <span className="text-sm font-bold text-slate-500">✂️ נגמרו העזרות</span>
      )
    ) : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-2 pb-16 pt-2 sm:px-6 sm:pt-4 compact:pt-1.5 short:pt-1.5">
      <header className="card mb-2 p-2 sm:mb-4 sm:p-4 compact:mb-1.5 compact:sm:mb-3 compact:sm:p-3 short:mb-1.5 short:p-1.5">
        {/* בטלפון לאורך: שורה ראשונה לשם (עד שתי שורות טקסט), ושורה שנייה למונה, להתקדמות ולכוכבים – כך שם ארוך לא נבלע */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {isBoss ? (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-800 text-3xl short:h-10 short:w-10 short:text-2xl" aria-hidden="true">
              👾
            </span>
          ) : (
            <Avatar avatar={player.avatar} theme={player.theme} size="sm" className="short:h-10 short:w-10 short:text-2xl" />
          )}
          <div className="min-w-0 flex-1">
            <div className={`line-clamp-2 break-words text-lg font-bold leading-tight ${theme.text}`}>{isBoss ? 'כולם ביחד!' : player.name}</div>
            <div className="hidden text-sm font-bold text-slate-500 sm:block short:block">{counterText}</div>
          </div>
          <div className="hidden items-center gap-1.5 sm:flex sm:gap-3 short:flex">{scorePills}</div>
          <SoundToggle enabled={soundOn} onToggle={onToggleSound} />
          <button type="button" className="icon-btn" onClick={() => setConfirmQuit(true)} aria-label="יציאה מהמשחק" title="יציאה">
            <X size={24} />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 compact:mt-1.5 short:mt-1">
          <span className="shrink-0 whitespace-nowrap text-sm font-black tabular-nums text-slate-500 sm:hidden short:hidden" aria-label={counterLabel}>
            {isBoss ? '👾' : <span dir="ltr">{counterShort}</span>}
          </span>
          <div className="min-w-0 flex-1">
            {team ? (
              <MissionTrack mission={mission} correct={session.correct} total={playerTurns} compact />
            ) : (
              <div className="flex gap-1" aria-hidden="true">
                {list.map((t, i) => (
                  <div
                    key={i}
                    className={`h-3 flex-1 rounded-full transition-all duration-500 ${
                      i < index || (i === index && selected !== null) ? theme.bar : i === index ? `${theme.bar} opacity-40` : t.question.champion ? 'bg-rose-200' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:hidden short:hidden">{scorePills}</div>
        </div>
      </header>

      {voiceNoticeAt === index && (
        <p className={`mb-3 flex items-center justify-center gap-2 rounded-2xl bg-amber-100 px-3 py-2 text-center text-sm font-medium text-amber-800 max-sm:text-xs compact:mb-2 compact:py-1 short:mb-1.5 short:py-1 short:text-xs`}>
          <VolumeX size={18} className="shrink-0" />
          {/* בטלפון – הודעה קצרה בשורה אחת, כדי לא לדחוף את התשובות אל מתחת למסך */}
          <span className="hidden sm:inline short:hidden">לא נמצא קול בעברית במכשיר הזה, ולכן ייתכן שההקראה לא תעבוד. אפשר להתקין קול עברי בהגדרות המכשיר.</span>
          <span className="sm:hidden short:inline">אין קול עברי במכשיר – ייתכן שלא תהיה הקראה</span>
        </p>
      )}

      {phase === 'handoff' ? (
        <section className="card flex flex-col items-center px-4 py-5 text-center animate-pop sm:px-6 sm:py-10 compact:py-4 short:py-3">
          {isBoss ? (
            <>
              <div className="text-7xl animate-wiggle sm:text-8xl compact:text-6xl short:text-5xl" aria-hidden="true">
                👾
              </div>
              <h2 className="mt-3 text-3xl font-bold text-slate-800 sm:text-5xl compact:mt-2 short:text-3xl">שאלת הבוס – כולם ביחד!</h2>
              <p className="mt-3 text-lg text-slate-600 compact:mt-2 short:mt-1">מתייעצים, וכל אחד יכול לענות. תשובה נכונה = עוד {BOSS_STEPS} צעדים במסלול!</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-slate-500">
                שאלה {index + 1} מתוך {playerTurns}
              </p>
              {/* במסך נמוך (טלפון לרוחב) התמונה קטנה ולצד השם – כדי שכפתור "אני מוכן" ייראה בלי לגלול */}
              <div className="flex flex-col items-center short:mt-1 short:flex-row short:gap-3">
                <Avatar
                  avatar={player.avatar}
                  theme={player.theme}
                  size="xl"
                  className="my-3 animate-wiggle sm:my-4 compact:my-2 compact:h-28 compact:w-28 compact:text-7xl short:my-0 short:h-16 short:w-16 short:text-4xl"
                />
                <h2 className={`max-w-full break-words text-4xl font-bold leading-tight sm:text-5xl short:text-3xl ${player.name.length > 12 ? 'compact:text-3xl' : ''} ${theme.text}`}>
                  התור של {player.name}!
                </h2>
              </div>
              <p className="mt-2 text-lg text-slate-500 short:mt-1">כל המשפחה מחזיקה אצבעות 🤞</p>
            </>
          )}
          <div className="mt-5 flex items-center gap-3 compact:mt-4 short:mt-2">
            <button
              type="button"
              onClick={() => {
                playClick();
                cancel();
                setPhase('question');
              }}
              className={`btn px-10 py-5 text-2xl text-white compact:py-4 short:py-3 ${isBoss ? 'bg-slate-800 hover:bg-slate-900' : theme.button}`}
              autoFocus
            >
              {isBoss ? 'מוכנים! 👾' : `✋ ${g(player, 'אני מוכן!', 'אני מוכנה!')}`}
            </button>
            {supported && autoRead && (
              <button type="button" onClick={readHandoff} className={`icon-btn h-14 w-14 text-sky-600 ${speaking ? 'animate-pulse' : ''}`} aria-label="הקראה">
                <Volume2 size={26} />
              </button>
            )}
          </div>
          <div className="mt-6 w-full max-w-md compact:mt-4 short:mt-2">
            <MissionTrack mission={mission} correct={session.correct} total={playerTurns} />
          </div>
          {!isBoss && (
            <p className="mt-3 rounded-full bg-violet-50 px-4 py-1.5 text-base font-bold text-violet-700">
              {leftForPlayer > 0 ? (visual ? '🗣️ יש לך עזרה מאבא/אמא' : '✂️ יש לך עזרה אחת') : '✂️ העזרה כבר נוצלה'}
            </p>
          )}
        </section>
      ) : (
        <QuestionCard
          key={`${index}-${question.id}`}
          question={question}
          selected={selected}
          removed={removed}
          onSelect={handleAnswer}
          onRead={readQuestion}
          onSpeakOption={autoRead && supported ? (text) => speak(text, { rate }) : undefined}
          speaking={speaking}
          speechSupported={supported}
          visual={visual}
          tag={tag}
          status={status}
          tools={lifelineTools}
        />
      )}

      {/* לעולם לא מציגים את "הידעת?" יחד עם חלון היציאה */}
      <FactModal
        open={showFact && !confirmQuit}
        question={question}
        correct={feedback?.correct}
        earned={feedback?.earned}
        onNext={next}
        isLast={isLast}
        nextLabel={nextLabel}
        onRead={readFact}
        speaking={speaking}
        speechSupported={supported}
      />

      {quitModal}
    </main>
  );
}
