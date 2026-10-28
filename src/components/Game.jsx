import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Flame, Star, Volume2 } from 'lucide-react';
import Avatar from './Avatar';
import Modal from './Modal';
import QuestionCard, { FeedbackPill, keyToOption } from './QuestionCard';
import FactModal from './FactModal';
import SpeakingBars from './SpeakingBars';
import ActionBar from './ActionBar';
import SoundToggle from './SoundToggle';
import HomeButton from './HomeButton';
import { setLeaveGuard } from '../utils/nav';
import { GAME_MODES } from '../utils/modes';
import DuelScoreboard from './DuelScoreboard';
import MissionTrack from './MissionTrack';
import { useSpeech } from '../hooks/useSpeech';
import { getTheme } from '../data/themes';
import { g } from '../data/profiles';
import { PERFECT_MIN, TIERS } from '../data/stickers';
import { TOPIC_GROUPS, categories, categoryByName, categoryBySlug } from '../data/categories';
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
import { burstCorrect, clearConfetti } from '../utils/confetti';

const cheers = ['כל הכבוד!', 'מעולה!', 'וואו, צדקת!', 'אלופים!', 'יש! בול!', 'מדהים!'];
// עידוד אחרי טעות – לקטנים מילים פשוטות, לגדולים משהו פחות "ילדותי"
const encouragementsFor = (p) =>
  p.difficulty === 'easy' || p.difficulty === 'medium'
    ? ['לא נורא! ממשיכים 💪', 'לא נורא, ככה לומדים!', 'טעויות עוזרות ללמוד 💪']
    : [g(p, 'כמעט! עכשיו אתה יודע', 'כמעט! עכשיו את יודעת'), 'עובדה חדשה בכיס 🧠', 'טוב לדעת – ממשיכים!'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// כמה זמן רואים את התשובה לפני "הידעת?" – אחרי טעות קצת יותר, כדי להספיק לראות מה נכון
const FACT_DELAY = { correct: 900, wrong: 1500 };
// תשובה נכונה לשאלת הבוס מקדמת את הצוות בשני צעדים
export const BOSS_STEPS = 2;
const RECENT_GAMES = 3;

const emptyPlayerStats = () => ({ correct: 0, answered: 0, stars: 0, streak: 0, bestStreak: 0, rescues: 0 });

/**
 * מנוע המשחק. mode='solo' – שחקן אחד ו־10 שאלות מכל הנושאים.
 * mode='topic' – "טריוויה לפי נושא": השחקן בוחר נושא ומקבל 10 שאלות ממנו.
 * mode='team' – משימה משפחתית: השחקנים מתחלפים בכל שאלה וכולם מקדמים יעד משותף, ובסוף שאלת בוס לכולם.
 * mode='duel' – אתגר: שני שחקנים בתורות, כל אחד ברמה שלו, עם לוח תוצאות (בלי בוס ובלי מסלול).
 * ההבדלים בין המצבים מוגדרים כדגלים ב-GAME_MODES (utils/modes.js).
 */
// התקדמות למדבקת הנושא הבאה: 5 נקודות ומדליה (במקום מספרים כמו 3/5 – גם מי שלא קורא מבין)
function TopicProgress({ n, bar }) {
  if (!n) return null;
  const next = TIERS.find((t) => n < t.target);
  if (!next) return <span aria-hidden="true">🥇</span>;
  const filled = Math.round((5 * n) / next.target);
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < filled ? bar : 'bg-slate-200'}`} />
      ))}
      <span className="ms-0.5 text-base leading-none">{next.medal}</span>
    </span>
  );
}

const topicAria = (name, n) => {
  if (!n) return undefined;
  const next = TIERS.find((t) => n < t.target);
  return next ? `${name}, ${n} מתוך ${next.target} למדליית ${next.label}` : `${name}, יש מדליית זהב`;
};

export default function Game({ mode = 'solo', players, bank, rounds = 10, mission, initialCategory, onUpdatePlayer, onFinish, onQuit, soundOn, onToggleSound }) {
  const cfg = GAME_MODES[mode] || GAME_MODES.solo;
  // תורות בין כמה שחקנים (משחק משפחתי ואתגר)
  const turnBased = cfg.turnBased;
  const byTopic = mode === 'topic';
  const solo = players[0];
  // במשחק לפי נושא בוחרים קודם נושא, ואז נבנה הסבב
  const [choices] = useState(() => (byTopic ? topicList(bank, solo, categories.map((c) => c.name)) : []));
  // "עוד סבב באותו נושא" מהסיכום – מתחילים ישר, אם נשארו בנושא מספיק שאלות חדשות
  const [startCategory] = useState(() => (byTopic && choices.some((c) => c.name === initialCategory && c.playable) ? initialCategory : null));
  const [turns, setTurns] = useState(() => {
    if (turnBased) return buildTurns(players, bank, rounds, { boss: cfg.boss });
    if (byTopic) return startCategory ? buildTopicRound(bank, solo, startCategory).map((q) => ({ playerId: solo.id, question: q })) : null;
    return buildSoloRound(bank, solo).map((q) => ({ playerId: solo.id, question: q }));
  });
  const [focusCategory, setFocusCategory] = useState(startCategory);
  const startStickers = useRef(Object.fromEntries(players.map((p) => [p.id, p.stickers])));
  const startStars = useRef(Object.fromEntries(players.map((p) => [p.id, p.stats.stars])));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState(turnBased ? 'handoff' : turns ? 'question' : 'pick'); // pick | handoff | question
  const [selected, setSelected] = useState(null);
  const [removed, setRemoved] = useState([]); // תשובות שהוסרו בעזרת "חצי-חצי"
  const [feedback, setFeedback] = useState(null); // { correct, message, earned, streak, medal }
  const [notice, setNotice] = useState(null); // הודעה קצרה (למשל אחרי שימוש בעזרה)
  const [showFact, setShowFact] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  // מי שעוד לא קורא בוחר נושא בשני שלבים: לחיצה משמיעה את שם הנושא, ו"משחקים!" מתחיל
  const [pending, setPending] = useState(null);
  // הכרזה לקורא מסך (אזור חי קבוע)
  const [live, setLive] = useState('');
  const headingRef = useRef(null);
  const readyRef = useRef(null);
  const [lifelines, setLifelines] = useState(() => Object.fromEntries(players.map((p) => [p.id, cfg.lifelines])));
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
  const { speak, cancel, speaking, supported } = useSpeech();

  const list = turns || [];
  const turn = list[index];
  const question = turn?.question;
  const isBoss = Boolean(turn?.boss);
  const player = players.find((p) => p.id === turn?.playerId) || solo;
  const theme = getTheme(isBoss ? 'sky' : player.theme);
  // תשובות בתמונות: לשחקן ברמה הקלה, ולשאלת בוס בתמונות כשמשחק ילד ברמה הקלה
  const visual = isBoss ? Boolean(question?.bossVisual) : player.difficulty === 'easy';
  const isLast = index === list.length - 1;
  // בשאלת הבוס מקריאים אם מישהו מהמשתתפים צריך הקראה
  const autoRead = isBoss ? players.some((p) => p.autoRead) : player.autoRead;
  const rate = visual || (isBoss && autoRead) ? 0.85 : 0.95;
  const playerTurns = useMemo(() => list.filter((t) => !t.boss).length, [list]);
  const milestones = cfg.mission ? teamMilestones(playerTurns) : null;
  const playerStreak = turnBased ? session.perPlayer[player.id]?.streak || 0 : session.streak;
  // אתגר: מספר השאלה של השחקן הנוכחי מתוך השאלות שלו, והיריב
  const ownNo = list.slice(0, index + 1).filter((t) => t.playerId === player.id).length;
  const ownTotal = list.filter((t) => t.playerId === player.id).length;
  const other = cfg.scoreboard ? players.find((p) => p.id !== player.id) : null;

  const readQuestion = useCallback(() => {
    if (!question) return;
    const visible = { ...question, options: question.options.filter((_, i) => !removed.includes(i)) };
    speak(speechForQuestion(visible), { rate });
  }, [speak, question, removed, rate]);

  const readFact = useCallback(() => {
    const opener = feedback?.correct ? 'תשובה נכונה!' : `התשובה הנכונה היא: ${question.options[question.correctIndex]}.`;
    speak([opener, 'הידעת?', question.explanation], { rate });
  }, [speak, question, feedback, rate]);

  const yourTurn = `${player.name}, תורך! ${g(player, 'לחץ', 'לחצי')} על הכפתור ${g(player, 'כשאתה מוכן', 'כשאת מוכנה')}.`;
  // באתגר: בתור הראשון מציגים את האתגר, ובשאלה האחרונה של כל שחקן – "שאלה אחרונה!" (התוצאה מוקראת רק בסוף)
  const handoffText = isBoss
    ? 'שאלת הבוס! כל המשפחה עונה ביחד. תשובה נכונה מקדמת אותנו בשני צעדים.'
    : cfg.scoreboard && index === 0
      ? ['אתגר!', `${players[0].name} מול ${players[1].name}. ${ownTotal} שאלות לכל אחד.`, yourTurn]
      : cfg.scoreboard && ownNo === ownTotal
        ? ['שאלה אחרונה!', yourTurn]
        : yourTurn;
  const readHandoff = useCallback(() => speak(handoffText, { rate: 0.9 }), [speak, handoffText]);

  const readChoices = useCallback(() => {
    speak(['באיזה נושא נשחק?', `${g(solo, 'בחר', 'בחרי')} נושא – ${g(solo, 'לחץ', 'לחצי')} על נושא כדי לשמוע אותו, ואז על משחקים`], { rate: 0.85 });
  }, [speak, solo]);

  // הקראה אוטומטית של כל שאלה חדשה (ושל מסך המעבר) למי שהגדיר הקראה – למשל עידו
  useEffect(() => {
    if (phase === 'question' && autoRead) readQuestion();
    if (phase === 'handoff' && autoRead) readHandoff();
    if (phase === 'pick' && solo.autoRead) readChoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase]);

  // משחק משפחתי: אחרי "אני מוכן" (שאולי נלחץ אחרי גלילה) השאלה נפתחת מראש העמוד
  useEffect(() => {
    if (turnBased && phase === 'question') window.scrollTo({ top: 0 });
  }, [turnBased, phase, index]);

  // אחרי תשובה ואחרי "המשך" הפוקוס עובר לכותרת השאלה החדשה – כדי שלא ייפול לגוף העמוד.
  // במסך המעבר – לכפתור "אני מוכן" (autoFocus לא עובד כשהמסך עוד מסומן inert מתחת ל"הידעת?" שנסגר)
  useEffect(() => {
    if (phase === 'question' && !showFact) requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    if (phase === 'handoff') requestAnimationFrame(() => readyRef.current?.focus({ preventScroll: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase]);

  // כותרת הלשונית: מספר השאלה ושם השחקן (אחרי האפקט של App שקובע את שם המסך)
  useEffect(() => {
    if (phase !== 'question' || !turns) return undefined;
    const total = turnBased ? playerTurns : turns.length;
    const title = isBoss
      ? 'שאלת הבוס · טריוויה משפחתית'
      : cfg.scoreboard
        ? `שאלה ${ownNo} מתוך ${ownTotal} · ${player.name} – אתגר`
        : `שאלה ${index + 1} מתוך ${total} · ${player.name} – טריוויה משפחתית`;
    const id = setTimeout(() => {
      document.title = title;
    }, 0);
    return () => clearTimeout(id);
  }, [phase, index, turns, turnBased, cfg, ownNo, ownTotal, playerTurns, isBoss, player.name]);

  useEffect(() => {
    if (showFact && autoRead) readFact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFact]);

  // באמצע משחק, Back בטלפון (או כפתור הבית) שואל לפני שיוצאים
  useEffect(() => (phase === 'pick' ? undefined : setLeaveGuard(() => setConfirmQuit(true))), [phase]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(noticeTimer.current);
    },
    [],
  );

  const startRound = (category) => {
    clearConfetti();
    playClick();
    cancel();
    setPending(null);
    setFocusCategory(category);
    setTurns(buildTopicRound(bank, solo, category).map((q) => ({ playerId: solo.id, question: q })));
    setPhase('question');
    if (solo.autoRead) speak(`בחרת: ${category}`, { rate: 0.9 });
  };

  const showNotice = (text) => {
    clearTimeout(noticeTimer.current);
    setNotice(text);
    setLive(text);
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
        setLive(correct ? `נכון! עוד ${BOSS_STEPS} צעדים במסלול` : `לא נכון. התשובה הנכונה: ${question.options[question.correctIndex]}`);
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
        timer.current = setTimeout(() => setShowFact(true), correct ? FACT_DELAY.correct : FACT_DELAY.wrong);
        return;
      }

      const pp = session.perPlayer[player.id];
      // הרצף האישי של השחקן קובע את הבונוס (גם במשחק המשפחתי – לא הרצף של מי שענה לפניו)
      const streakNow = correct ? (turnBased ? pp.streak : session.streak) + 1 : 0;
      const flags = { champion: question.champion };
      const earned = starsForAnswer(correct, streakNow, player.difficulty, flags);
      // "המציל": תשובה נכונה כשהצוות היה מאחורי הקצב שנדרש ליעד
      const turnNo = list.slice(0, index).filter((t) => !t.boss).length;
      const behind = cfg.mission && session.correct < (milestones.goal * turnNo) / playerTurns;
      const medalBefore = cfg.mission ? medalsFor(session.correct, playerTurns) : 0;
      const medalAfter = cfg.mission ? medalsFor(session.correct + (correct ? 1 : 0), playerTurns) : 0;

      setSession((s) => {
        const cur = s.perPlayer[player.id];
        return {
          ...s,
          correct: s.correct + (correct ? 1 : 0),
          stars: s.stars + earned,
          streak: correct ? s.streak + 1 : 0,
          bestStreak: Math.max(s.bestStreak, correct ? s.streak + 1 : 0),
          missed: correct ? s.missed : [...s.missed, { question: question.question, answer: question.options[question.correctIndex], icon: question.icon, picture: question.optionEmojis?.[question.correctIndex] }],
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
      const message = correct ? pick(cheers) : pick(encouragementsFor(player));
      // באתגר – גם התוצאה אחרי התשובה, לקורא מסך
      const scoreText = cfg.scoreboard
        ? `. ${players.map((p) => `${p.name} ${(session.perPlayer[p.id]?.correct || 0) + (correct && p.id === player.id ? 1 : 0)}`).join(', ')}`
        : '';
      setLive((correct ? (earned > 0 ? `נכון! +${earned} כוכבים` : 'נכון!') : `לא נכון. התשובה הנכונה: ${question.options[question.correctIndex]}`) + scoreText);
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
          // "מחברת הטעויות" – לעיון בלבד, השאלה לא חוזרת למשחק
          review: correct ? p.stats.review || [] : updateReview(p.stats.review, question.id, false),
          championCorrect: (p.stats.championCorrect || 0) + (correct && question.champion ? 1 : 0),
        },
      }));

      timer.current = setTimeout(() => setShowFact(true), correct ? FACT_DELAY.correct : FACT_DELAY.wrong);
    },
    [selected, question, phase, removed, session, player, players, turnBased, cfg, bank, cancel, onUpdatePlayer, isBoss, playerTurns, autoRead, speak, rate, list, index, milestones],
  );

  const applyLifeline = () => {
    if (!lifelines[player.id] || selected !== null || removed.length) return;
    playUnlock();
    const wrong = shuffle(question.options.map((_, i) => i).filter((i) => i !== question.correctIndex));
    // משאירים שתי תשובות: הנכונה ועוד אחת
    const out = wrong.slice(0, question.options.length - 2);
    setRemoved(out);
    setLifelines((l) => ({ ...l, [player.id]: l[player.id] - 1 }));
    // באתגר לא מציעים רמז מאבא/אמא – ההורה יכול להיות היריב
    const text = visual ? (cfg.parentHelp ? '🗣️ הורדנו תשובה! אפשר לבקש רמז מאבא או אמא' : '✂️ הורדנו תשובה אחת!') : '✂️ הורדנו תשובות לא נכונות!';
    showNotice(text);
    if (autoRead) speak(out.length === 1 ? (cfg.parentHelp ? 'הורדתי תשובה אחת. אפשר לבקש רמז מאבא או אמא' : 'הורדתי תשובה אחת.') : 'הורדתי תשובות לא נכונות', { rate });
  };

  const next = useCallback(() => {
    // קונפטי של התשובה הקודמת לא ממשיך לרדת על השאלה הבאה
    clearConfetti();
    cancel();
    playClick();
    if (isLast) {
      const total = playerTurns;
      players.forEach((p) => {
        const perfect = !turnBased && total === QUESTIONS_PER_ROUND && session.correct >= (PERFECT_MIN[p.difficulty] ?? 10);
        onUpdatePlayer(p.id, (cur) => ({
          ...cur,
          stats: {
            ...cur.stats,
            gamesPlayed: cur.stats.gamesPlayed + 1,
            perfectGames: cur.stats.perfectGames + (perfect ? 1 : 0),
            // שלושת המשחקים האחרונים (לרמז "אולי לנסות רמה אחרת?")
            recent: turnBased ? cur.stats.recent || [] : [...(cur.stats.recent || []), { c: session.correct, t: total, d: cur.difficulty }].slice(-RECENT_GAMES),
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
    setLive('');
    setSelected(null);
    setRemoved([]);
    setIndex((n) => n + 1);
    if (turnBased) setPhase('handoff');
  }, [cancel, isLast, players, turnBased, session, playerTurns, onUpdatePlayer, onFinish, mode, mission, focusCategory]);

  // מקלדת: 1–4 או א–ד לבחירת תשובה (בלי Ctrl/Alt ובלי החזקת מקש)
  useEffect(() => {
    const onKey = (e) => {
      if (confirmQuit || showFact) return;
      if (phase === 'pick') {
        const n = keyToOption(e, choices.length);
        if (n >= 0 && choices[n]?.playable) startRound(choices[n].name);
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

  // בחלון היציאה – הפעולה הבטוחה ("ממשיכים") ראשונה ובולטת; היציאה משנית
  const quitModal = (
    <Modal open={confirmQuit} onClose={() => setConfirmQuit(false)} label="יציאה מהמשחק" className="max-w-sm">
      <div className="flex flex-col items-center p-7 text-center">
        {isBoss ? (
          <div className="mb-3 flex h-28 w-28 items-center justify-center rounded-full bg-slate-800 text-7xl" aria-hidden="true">
            👾
          </div>
        ) : (
          <Avatar avatar={player.avatar} theme={player.theme} size="lg" decorative className="mb-3" />
        )}
        <h2 className="mb-2 text-2xl font-bold">לחזור לדף הבית?</h2>
        <p className="mb-6 text-slate-600">הכוכבים שכבר נאספו יישמרו.</p>
        <div className="flex w-full flex-col gap-3">
          <button type="button" className={`btn w-full py-4 text-xl text-white ${isBoss ? 'bg-slate-800 hover:bg-slate-900' : theme.button}`} onClick={() => setConfirmQuit(false)} autoFocus>
            ממשיכים לשחק
          </button>
          <button type="button" className="btn btn-white w-full text-slate-700" onClick={() => (cancel(), onQuit())}>
            לדף הבית
          </button>
        </div>
      </div>
    </Modal>
  );

  // ---- טריוויה לפי נושא: בחירת הנושא ----
  const playableChoices = choices.filter((c) => c.playable);
  if (phase === 'pick') {
    const soloTheme = getTheme(solo.theme);
    const preReader = solo.autoRead;
    const choiceByName = Object.fromEntries(choices.map((c) => [c.name, c]));
    // הנושאים בקבוצות (טבע, עולם, תרבות, פנאי) – בסדר קבוע, כדי שנושא אהוב תמיד יימצא באותו מקום
    const groups = TOPIC_GROUPS.map((grp) => ({
      ...grp,
      items: grp.topics.map((slug) => choiceByName[categoryBySlug[slug]?.name]).filter(Boolean),
    })).filter((grp) => grp.items.length);
    const choose = (name) => {
      if (!preReader) return startRound(name);
      if (pending === name) return startRound(name);
      playClick();
      setPending(name);
      if (supported) speak(name, { rate: 0.9 });
    };
    const surprise = () => {
      if (!playableChoices.length) return;
      const name = pick(playableChoices).name;
      if (!preReader) return startRound(name);
      playClick();
      setPending(name);
      if (supported) speak(`בחרתי: ${name}`, { rate: 0.9 });
    };
    return (
      <main className={`mx-auto w-full max-w-4xl px-3 pt-3 sm:px-6 sm:pt-6 ${pending ? 'pb-28' : 'pb-12'}`}>
        <header className="mb-3 flex items-center gap-2">
          <Avatar avatar={solo.avatar} theme={solo.theme} size="sm" />
          <h1 className={`min-w-0 flex-1 text-2xl font-bold leading-tight sm:text-3xl ${soloTheme.text}`}>באיזה נושא נשחק?</h1>
          {supported && preReader && (
            <button type="button" onClick={readChoices} className="icon-btn text-sky-700" aria-label="הקראה">
              <Volume2 size={22} />
            </button>
          )}
          <HomeButton onClick={() => (cancel(), onQuit())} />
        </header>
        <button type="button" className={`btn w-full py-4 text-xl text-white ${soloTheme.button}`} onClick={surprise} disabled={!playableChoices.length}>
          🎲 נושא בהפתעה
        </button>
        {groups.map((grp) => (
          <section key={grp.id} aria-labelledby={`topic-group-${grp.id}`}>
            <h2 id={`topic-group-${grp.id}`} className="mb-2 mt-5 text-xl font-bold text-slate-700">
              {grp.label}
            </h2>
            <div className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {grp.items.map(({ name, playable }) => {
                const meta = categoryByName[name] || { emoji: '❓', banner: 'from-sky-200 to-violet-200' };
                const n = solo.stats.categoryCorrect?.[name] || 0;
                const chosen = pending === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => choose(name)}
                    disabled={!playable}
                    aria-label={playable ? topicAria(name, n) : undefined}
                    aria-pressed={preReader && playable ? chosen : undefined}
                    className={`relative flex h-full min-h-[7.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-3xl border-4 border-white bg-white px-2 py-3 text-center shadow-pop-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 ${
                      playable ? 'hover:-translate-y-1 hover:shadow-pop' : 'cursor-default opacity-50 grayscale'
                    } ${chosen ? `ring-4 ring-offset-2 ${soloTheme.ring}` : ''}`}
                  >
                    {chosen && (
                      <span className="absolute -top-2 -end-2 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white ring-4 ring-white animate-pop" aria-hidden="true">
                        <Check size={20} strokeWidth={3.5} />
                      </span>
                    )}
                    <span className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${meta.banner} text-4xl leading-none`} aria-hidden="true">
                      {meta.emoji}
                    </span>
                    <span className="min-w-0 text-lg font-bold leading-tight text-slate-800 [overflow-wrap:anywhere]">{name}</span>
                    {playable ? <TopicProgress n={n} bar={soloTheme.bar} /> : <span className="text-xs font-bold text-slate-700 sm:text-sm">סיימת את הנושא 🏆</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {pending && (
          <ActionBar>
            <button type="button" className={`btn flex-1 py-4 text-2xl text-white ${soloTheme.button}`} onClick={() => startRound(pending)}>
              ▶ משחקים!
            </button>
          </ActionBar>
        )}
      </main>
    );
  }

  if (!question) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-6xl">🤷</div>
        <p className="text-xl font-bold text-slate-600">לא נמצאו שאלות לרמה הזאת</p>
        <button type="button" className="btn btn-white" onClick={onQuit}>
          דף הבית
        </button>
      </main>
    );
  }

  const nextTurn = list[index + 1];
  const nextLabel = turnBased && !isLast ? (nextTurn?.boss ? 'לשאלת הבוס 👾' : `התור של ${players.find((p) => p.id === nextTurn?.playerId)?.name}`) : undefined;
  const leftForPlayer = lifelines[player.id] || 0;
  const readyClass = `text-white ${theme.button}`;

  const tag = isBoss ? (
    <span className="whitespace-nowrap rounded-full bg-slate-800 px-3 py-1 text-sm font-bold text-white shadow-sm sm:text-base">👾 שאלת הבוס</span>
  ) : question.champion ? (
    <span
      className="whitespace-nowrap rounded-full bg-rose-600 px-3 py-1 text-sm font-bold text-white shadow-sm sm:text-base"
      title={player.difficulty === 'easy' ? 'שאלת הסיום – שווה 30 כוכבים' : player.difficulty === 'expert' ? 'שאלה קשה במיוחד – שווה 30 כוכבים, וטעות לא עולה כלום' : 'שאלה מהרמה שמעל – שווה 30 כוכבים, וטעות לא עולה כלום'}
    >
      {player.difficulty === 'easy' ? '🎁 שאלת הפתעה' : '🌶️ שאלת אלוף'}
      <span className="hidden sm:inline"> – שווה 30 כוכבים!</span>
    </span>
  ) : null;

  const counterTotal = turnBased ? playerTurns : list.length;
  // באתגר – מספר השאלה של השחקן מתוך 5 השאלות שלו
  const counterText = isBoss ? 'שאלת בוס' : cfg.scoreboard ? `שאלה ${ownNo} מתוך ${ownTotal}` : `שאלה ${index + 1} מתוך ${counterTotal}`;
  const counterShort = `${index + 1}/${counterTotal}`;
  const answeredCount = index + (selected !== null ? 1 : 0);
  const lastTurn = list[list.length - 1];
  // כוכבים ורצף – מוצגים בשורה הראשונה במסך רחב, ובשורת ההתקדמות בטלפון לאורך
  const scorePills = (
    <>
      <div
        className="flex items-center gap-1 rounded-2xl bg-amber-50 px-2 py-0.5 text-base font-black text-amber-700 sm:px-3 sm:py-2 sm:text-xl short:py-1 short:text-lg"
        title="כוכבים במשחק הזה"
      >
        <Star size={18} className="fill-amber-400 text-amber-400" aria-hidden="true" />
        <span key={session.stars} className="inline-block animate-pop" aria-hidden="true">
          {session.stars}
        </span>
        <span className="sr-only">{session.stars} כוכבים במשחק הזה</span>
      </div>
      {!isBoss && playerStreak >= 2 && (
        <div
          className="flex items-center gap-0.5 rounded-2xl bg-orange-50 px-2 py-0.5 text-base font-black text-orange-700 animate-pop sm:px-3 sm:py-2 sm:text-xl short:py-1 short:text-lg"
          title="רצף תשובות נכונות"
        >
          <Flame size={18} className="fill-orange-300" aria-hidden="true" />
          <span aria-hidden="true">{playerStreak}</span>
          <span className="sr-only">רצף של {playerStreak} תשובות נכונות</span>
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
    turnBased && !isBoss && selected === null && !removed.length ? (
      leftForPlayer > 0 ? (
        <button
          type="button"
          onClick={applyLifeline}
          className="btn min-h-[48px] bg-violet-100 px-4 py-2 text-violet-700 ring-2 ring-violet-200 hover:bg-violet-200"
          title="מוריד תשובות שגויות"
        >
          {visual ? (cfg.parentHelp ? '🗣️ עזרה מאבא/אמא' : '✂️ עזרה') : '✂️ חצי-חצי'}
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
          <HomeButton onClick={() => setConfirmQuit(true)} />
        </div>
        <div className="mt-2 flex items-center gap-2 compact:mt-1.5 short:mt-1">
          {/* במשחק המשפחתי המספר של מסלול המשימה הוא המונה היחיד */}
          {!turnBased && (
            <span className="shrink-0 whitespace-nowrap text-sm font-black tabular-nums text-slate-500 sm:hidden short:hidden">
              <span aria-hidden="true" dir="ltr">
                {counterShort}
              </span>
              <span className="sr-only">{counterText}</span>
            </span>
          )}
          <div className="min-w-0 flex-1">
            {cfg.mission ? (
              <MissionTrack mission={mission} correct={session.correct} total={playerTurns} compact />
            ) : cfg.scoreboard ? (
              <DuelScoreboard players={players} perPlayer={session.perPlayer} rounds={ownTotal} activeId={player.id} />
            ) : (
              <div className="flex items-center gap-1">
                <div
                  className="flex min-w-0 flex-1 gap-1"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={list.length}
                  aria-valuenow={answeredCount}
                  aria-label="התקדמות במשחק"
                >
                  {list.map((t, i) => (
                    <div
                      key={i}
                      className={`h-3 flex-1 rounded-full transition-all duration-500 ${
                        i < index || (i === index && selected !== null) ? theme.bar : i === index ? `${theme.bar} opacity-40` : t.question.champion ? 'bg-rose-200' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                {/* השאלה האחרונה היא שאלת הפתעה / אלוף */}
                {lastTurn?.question.champion && (
                  <span className="shrink-0 text-base leading-none" aria-hidden="true">
                    {player.difficulty === 'easy' ? '🎁' : '🌶️'}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* באתגר לוח התוצאות תופס את כל השורה בטלפון; הכוכבים מוצגים בשורה הראשונה במסך רחב */}
          {!cfg.scoreboard && <div className="flex items-center gap-1.5 sm:hidden short:hidden">{scorePills}</div>}
        </div>
      </header>

      {phase === 'handoff' ? (
        // שאלת הבוס מקבלת "זירה" כהה משלה – רגע מיוחד בסוף המשימה
        <section
          className={`flex flex-col items-center px-4 py-5 text-center animate-pop sm:px-6 sm:py-10 compact:py-4 short:py-3 ${
            isBoss ? 'rounded-3xl bg-gradient-to-br from-slate-900 to-violet-900 text-white shadow-soft' : 'card'
          }`}
        >
          {isBoss ? (
            <>
              <div className="text-7xl animate-drop-shake sm:text-8xl compact:text-6xl short:text-5xl" aria-hidden="true">
                👾
              </div>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-5xl compact:mt-2 short:text-3xl">שאלת הבוס – כולם ביחד!</h2>
              <p className="mt-3 text-lg text-violet-100 compact:mt-2 short:mt-1">מתייעצים, וכל אחד יכול לענות. תשובה נכונה = עוד {BOSS_STEPS} צעדים במסלול!</p>
            </>
          ) : (
            <>
              {cfg.scoreboard && index === 0 && (
                <p className="rounded-full bg-orange-100 px-4 py-1.5 text-base font-bold text-orange-900">⚔️ אתגר · {ownTotal} שאלות לכל אחד · כל אחד ברמה שלו</p>
              )}
              {cfg.scoreboard && index > 0 && ownNo === ownTotal && (
                <p className="rounded-full bg-amber-100 px-4 py-1.5 text-base font-bold text-amber-900">🏁 השאלה האחרונה!</p>
              )}
              {/* במסך נמוך (טלפון לרוחב) התמונה קטנה ולצד השם – כדי שכפתור "אני מוכן" ייראה בלי לגלול */}
              <div className="flex flex-col items-center short:mt-1 short:flex-row short:gap-3">
                <Avatar
                  avatar={player.avatar}
                  theme={player.theme}
                  size="xl"
                  decorative
                  className="my-3 animate-wiggle sm:my-4 compact:my-2 compact:h-28 compact:w-28 compact:text-7xl short:my-0 short:h-16 short:w-16 short:text-4xl"
                />
                <h2 className={`max-w-full break-words text-4xl font-bold leading-tight sm:text-5xl short:text-3xl ${player.name.length > 12 ? 'compact:text-3xl' : ''} ${theme.text}`}>
                  התור של {player.name}!
                </h2>
              </div>
              <p className="mt-2 text-lg text-slate-500 short:mt-1">
                {other ? `${other.name} ${g(other, 'מחזיק', 'מחזיקה')} לך אצבעות 🤞` : 'כל המשפחה מחזיקה אצבעות 🤞'}
              </p>
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
              ref={readyRef}
              className={`btn px-10 py-5 text-2xl compact:py-4 short:py-3 ${
                isBoss ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : readyClass
              }`}
              autoFocus
            >
              {isBoss ? 'מוכנים לקרב! 👾' : `✋ ${g(player, 'אני מוכן!', 'אני מוכנה!')}`}
            </button>
            {supported && autoRead && (
              <button type="button" onClick={readHandoff} className="icon-btn h-14 w-14 text-sky-700" aria-label={speaking ? 'מקריא…' : 'הקראה'}>
                {speaking ? <SpeakingBars /> : <Volume2 size={26} />}
              </button>
            )}
          </div>
          <div className={`mt-6 w-full max-w-md compact:mt-4 short:mt-2 ${isBoss ? 'rounded-2xl bg-white p-3 text-slate-800' : ''}`}>
            {cfg.scoreboard ? (
              <DuelScoreboard players={players} perPlayer={session.perPlayer} rounds={ownTotal} activeId={player.id} variant="full" />
            ) : (
              <MissionTrack mission={mission} correct={session.correct} total={playerTurns} />
            )}
          </div>
          {!isBoss && (
            <p className="mt-3 rounded-full bg-violet-50 px-4 py-1.5 text-base font-bold text-violet-700">
              {leftForPlayer > 0 ? (visual && cfg.parentHelp ? '🗣️ יש לך עזרה מאבא/אמא' : '✂️ יש לך עזרה אחת') : '✂️ העזרה כבר נוצלה'}
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
          headingRef={headingRef}
        />
      )}

      {/* לעולם לא מציגים את "הידעת?" יחד עם חלון היציאה */}
      <FactModal
        open={showFact && !confirmQuit}
        question={question}
        visual={visual}
        correct={feedback?.correct}
        earned={feedback?.earned}
        chosen={selected != null ? question.options[selected] : null}
        onNext={next}
        isLast={isLast}
        nextLabel={nextLabel}
        onRead={readFact}
        speaking={speaking}
        speechSupported={supported}
      />

      {/* הכרזות לקורא מסך: נכון/לא נכון, עזרה שהופעלה */}
      <p className="sr-only" aria-live="polite">
        {live}
      </p>

      {quitModal}
    </main>
  );
}
