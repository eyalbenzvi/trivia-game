import { useEffect, useRef, useState } from 'react';
import { Flame, Home, RotateCcw, Shuffle, Star, Trophy, Volume2 } from 'lucide-react';
import Avatar from './Avatar';
import { useSpeech } from '../hooks/useSpeech';
import { getTheme } from '../data/themes';
import { activeDayStreak, difficultyInfo, g, rankFor } from '../data/profiles';
import { PERFECT_MIN, nextSticker, nextStickerSentence, stickerById, stickerTitle } from '../data/stickers';
import { nextLevel, prevLevel } from '../utils/game';
import { clearConfetti, sparkleAt, summaryCelebrate } from '../utils/confetti';
import { playFanfare, playUnlock } from '../utils/sound';
import { missedSpeech } from './MissedList';
import ActionBar from './ActionBar';
import NewStickers from './NewStickers';
import SpeakingBars from './SpeakingBars';

/** סיכום רגוע (בלי קונפטי, פחות סימני קריאה, פריסה צפופה יותר) – לנוער ולמבוגרים */
const isCalm = (player) => player.difficulty === 'expert' || parseFloat(player.age) >= 13;

const verdict = (correct, total, player, calm) => {
  const ratio = correct / total;
  // ברמות הגבוהות 9 מתוך 10 כבר נחשב "מושלם" (ומקבלים את מדבקת המושלם)
  if (ratio < 1 && total === 10 && correct >= (PERFECT_MIN[player.difficulty] ?? 10)) {
    return { emoji: '💎', title: calm ? 'משחק מושלם' : 'משחק מושלם!', text: `${correct} מתוך ${total} – ברמה הזאת זה כבר נחשב משחק מושלם.` };
  }
  if (calm) {
    if (ratio === 1) return { emoji: '🏆', title: `${total} מתוך ${total}`, text: 'משחק מושלם. כל הכבוד.' };
    if (ratio >= 0.7) return { emoji: '🌟', title: 'משחק מעולה', text: 'ידעת את רוב התשובות.' };
    if (ratio >= 0.4) return { emoji: '🙂', title: 'יפה מאוד', text: 'וגם למדת כמה דברים חדשים.' };
    return { emoji: '💡', title: 'סבב מאתגר', text: 'השאלות האלה היו קשות – בסבב הבא יהיו אחרות.' };
  }
  if (ratio === 1) return { emoji: '🏆', title: `מושלם! ${total} מתוך ${total}!`, text: g(player, 'אתה גאון אמיתי!', 'את גאונה אמיתית!') };
  if (ratio >= 0.7) return { emoji: '🌟', title: 'משחק מעולה!', text: 'ידעת המון תשובות – כל הכבוד!' };
  if (ratio >= 0.4) return { emoji: '😊', title: 'יפה מאוד!', text: 'למדת היום כמה דברים חדשים ומדהימים.' };
  return { emoji: '💪', title: 'איזה יופי של ניסיון!', text: 'כל משחק הופך אותנו לחכמים יותר. נשחק שוב?' };
};

// כמה מדבקות חדשות מוצגות בסיכום (השאר – "ועוד N")
const STICKERS_SHOWN = 3;
// כמה זמן כפתורי הסיכום נעולים אחרי שהמסך מופיע (כדי שלחיצה כפולה לא תתחיל משחק חדש)
const LOCK_MS = 500;

export const correctCountText = (n) => (n === 1 ? 'על שאלה אחת' : `על ${n} שאלות`);
/** משפט התוצאה להקראה – גם כשאין תשובות נכונות (בלי "אפס") */
export const resultSentence = (n) => (n ? `ענית נכון ${correctCountText(n)}.` : 'הפעם זה לא הצליח, אבל למדנו דברים חדשים!');

/** כרטיס "כמעט שם!" – המדבקה הבאה שהכי קרובה, עם פס התקדמות */
export function NextStickerCard({ player, next, className = '' }) {
  if (!next) return null;
  const theme = getTheme(player.theme);
  return (
    <section className={`flex items-center gap-3 rounded-3xl bg-gradient-to-l from-sky-50 to-violet-50 p-4 text-start ring-2 ring-violet-100 ${className}`}>
      <span
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-dashed border-violet-200 bg-gradient-to-br ${next.sticker.color} text-4xl opacity-80`}
        aria-hidden="true"
      >
        {next.sticker.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-bold text-violet-700">🎯 כמעט שם!</h3>
        <p className="text-base font-medium leading-snug text-slate-700">{nextStickerSentence(player, next)}</p>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={next.pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${next.pct}%` }} />
        </div>
        <div className="mt-1 text-sm font-bold text-slate-600">
          {next.current} מתוך {next.target}
        </div>
      </div>
    </section>
  );
}

/** רמז עדין לשינוי רמה אחרי 3 משחקים ברצף קלים מדי / קשים מדי. רק מציעים – לא משנים לבד */
const levelHint = (player) => {
  const recent = (player.stats.recent || []).filter((r) => r && r.t > 0 && (!r.d || r.d === player.difficulty));
  if (recent.length < 3) return null;
  if (recent.every((r) => r.c / r.t >= 0.9) && nextLevel[player.difficulty]) {
    const to = nextLevel[player.difficulty];
    return { to, text: `נראה שזה קל לך מדי – לנסות ${difficultyInfo[to].title}? 🦉` };
  }
  if (recent.every((r) => r.c / r.t <= 0.3) && prevLevel[player.difficulty]) {
    const to = prevLevel[player.difficulty];
    return { to, text: `${g(player, 'רוצה', 'רוצה')} רמה קצת יותר נוחה? אפשר לנסות ${difficultyInfo[to].title} 🙂` };
  }
  return null;
};

const tileCols = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' };

export default function Summary({ player, result, onPlayAgain, onOtherTopic, topicDone = false, onSwitchPlayer, onStickers, onSetDifficulty }) {
  const theme = getTheme(player.theme);
  const missed = result.missed || [];
  const newStickers = player.stickers.filter((id) => !(result.startStickers[player.id] || []).includes(id)).map((id) => stickerById[id]).filter(Boolean);
  const calm = isCalm(player);
  const v = verdict(result.correct, result.total, player, calm);
  const dayStreak = activeDayStreak(player.stats);
  // "כדאי לזכור": שאלה אחת בלבד, והשאר במחברת הטעויות שבחדר הפרסים
  const remember = missed[0];
  const [ready, setReady] = useState(false);
  const locked = (fn) => (...args) => (ready ? fn?.(...args) : undefined);
  const next = nextSticker(player);
  const startStars = result.startStars?.[player.id];
  // עלייה בדרגה (לפי סך הכוכבים) במשחק הזה
  const rankUp = startStars != null && rankFor(player).min > rankFor({ ...player, stats: { ...player.stats, stars: startStars } }).min ? rankFor(player) : null;
  const hint = levelHint(player);
  const [levelChanged, setLevelChanged] = useState(null);
  const topic = result.mode === 'topic' ? result.focusCategory : null;
  // משבצות התוצאה: כוכבים רק אם יש, רצף רק מ־2; מספר העמודות לפי מספר המשבצות
  const showStars = result.stars > 0;
  const showStreak = result.bestStreak >= 2;
  const tiles = 1 + (showStars ? 1 : 0) + (showStreak ? 1 : 0);
  const { speak, speaking, supported } = useSpeech();
  const heroSticker = newStickers[0];
  const heroRef = useRef(null);

  const readSummary = () =>
    speak(
      [
        v.title,
        resultSentence(result.correct),
        ...newStickers.slice(0, STICKERS_SHOWN).map((s) => `וקיבלת מדבקה חדשה: ${stickerTitle(s, player)}!`),
        newStickers.length > STICKERS_SHOWN ? `ועוד ${newStickers.length - STICKERS_SHOWN} מדבקות בחדר הפרסים.` : '',
        rankUp ? `עלית דרגה! עכשיו ${g(player, 'אתה', 'את')} ${rankUp.title}.` : '',
        dayStreak >= 2 ? `${dayStreak} ימים ברצף!` : '',
        next && !newStickers.length ? `${nextStickerSentence(player, next)}!` : '',
        ...missedSpeech(missed.slice(0, 1)),
      ].filter(Boolean),
      { rate: 0.9 },
    );

  useEffect(() => {
    const unlock = setTimeout(() => setReady(true), LOCK_MS);
    // לנוער ולמבוגרים – בלי תרועה ובלי קונפטי
    if (!calm) playFanfare();
    // חגיגה קצרה מהצדדים (מאחורי הכרטיס) רק במשחק טוב; אחרת – בלי קונפטי
    const stop = !calm && result.correct / result.total >= 0.5 ? summaryCelebrate(1500) : null;
    if (player.autoRead) readSummary();
    let t;
    if (newStickers.length) {
      // המדבקה החדשה "נוחתת" בראש הסיכום – צליל וניצוצות עליה
      t = setTimeout(() => {
        playUnlock();
        sparkleAt(heroRef.current);
      }, 600);
    }
    return () => {
      clearTimeout(unlock);
      clearTimeout(t);
      stop?.();
      clearConfetti();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-3">
      <div className="card relative z-10 overflow-hidden text-center animate-slide-up">
        <div className={`relative bg-gradient-to-br ${theme.gradient} px-6 text-slate-900 ${calm ? 'pb-14 pt-6' : 'pb-16 pt-8'}`}>
          {supported && (
            <button
              type="button"
              onClick={readSummary}
              className="icon-btn absolute left-3 top-3 z-10 h-12 w-12 bg-white/90 text-sky-700"
              aria-label={speaking ? 'מקריא…' : 'הקראת הסיכום'}
            >
              {speaking ? <SpeakingBars /> : <Volume2 size={24} />}
            </button>
          )}
          {heroSticker ? (
            // מדבקה חדשה – היא הגיבורה של הסיכום
            <div className="mb-3 flex flex-col items-center">
              <span
                ref={heroRef}
                className={`flex rotate-[-6deg] items-center justify-center rounded-full border-4 border-white bg-gradient-to-br ${heroSticker.color} shadow-pop animate-pop ${
                  calm ? 'h-20 w-20 text-5xl' : 'h-32 w-32 text-7xl'
                }`}
                style={{ animationDelay: '600ms' }}
                aria-hidden="true"
              >
                {heroSticker.emoji}
              </span>
              <p className="mt-3 rounded-full bg-white/90 px-4 py-1 text-lg font-bold text-violet-800 animate-pop" style={{ animationDelay: '600ms' }}>
                🎁 מדבקה חדשה: {stickerTitle(heroSticker, player)}
              </p>
            </div>
          ) : (
            <div className={`pointer-events-none mx-auto mb-2 w-fit animate-pop ${calm ? 'text-5xl' : 'text-7xl'}`} aria-hidden="true">
              {v.emoji}
            </div>
          )}
          <h1 className={`font-bold ${calm ? 'text-3xl sm:text-4xl' : 'text-3xl min-[360px]:text-4xl sm:text-5xl'}`}>{v.title}</h1>
          <p className={`mt-2 font-medium ${calm ? 'text-lg' : 'text-xl'}`}>{v.text}</p>
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <Avatar avatar={player.avatar} theme={player.theme} size="lg" className="border-4 border-white" />
          </div>
        </div>

        <div className="px-5 pb-8 pt-16 sm:px-8">
          <h2 className={`break-words text-2xl font-bold ${theme.text}`}>{player.name}</h2>

          {rankUp && (
            <p className="mx-auto mt-3 w-fit rounded-full bg-gradient-to-l from-amber-200 to-yellow-100 px-5 py-2 text-lg font-bold text-amber-800 animate-pop">
              עלית דרגה! 🎓 {rankUp.emoji} {rankUp.title}
            </p>
          )}

          {result.correct === 0 ? (
            // בלי תשובות נכונות – מראים את המאמץ, לא "0"
            <div className="mt-5 rounded-3xl bg-sky-50 px-4 py-4 animate-pop" style={{ animationDelay: '150ms' }}>
              <div className="text-2xl font-black text-sky-700">ענית על {result.total} שאלות</div>
              <div className="mt-1 text-base font-bold text-sky-800">כל שאלה מלמדת משהו חדש</div>
            </div>
          ) : (
            <div className={`mt-5 grid gap-1.5 min-[360px]:gap-2 sm:gap-3 ${tileCols[tiles]}`}>
              <div className="flex flex-col justify-center rounded-3xl bg-emerald-50 px-1.5 py-3 animate-pop min-[360px]:px-3 sm:p-4" style={{ animationDelay: '150ms' }}>
                <div className="text-2xl font-black text-emerald-700 min-[360px]:text-3xl sm:text-4xl" dir="ltr">
                  {result.correct}/{result.total}
                </div>
                <div className="mt-1 text-sm font-bold leading-tight text-emerald-800">תשובות נכונות</div>
              </div>
              {showStars && (
                <div className="flex flex-col justify-center rounded-3xl bg-amber-50 px-1.5 py-3 animate-pop min-[360px]:px-3 sm:p-4" style={{ animationDelay: '300ms' }}>
                  <div className="flex items-center justify-center gap-1 text-2xl font-black text-amber-700 min-[360px]:text-3xl sm:text-4xl">
                    <Star size={28} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                    {result.stars}
                  </div>
                  <div className="mt-1 text-sm font-bold leading-tight text-amber-800">כוכבים</div>
                </div>
              )}
              {showStreak && (
                <div className="flex flex-col justify-center rounded-3xl bg-orange-50 px-1.5 py-3 animate-pop min-[360px]:px-3 sm:p-4" style={{ animationDelay: '450ms' }}>
                  <div className="flex items-center justify-center gap-1 text-2xl font-black text-orange-700 min-[360px]:text-3xl sm:text-4xl">
                    <Flame size={28} className="fill-orange-300" aria-hidden="true" />
                    {result.bestStreak}
                  </div>
                  <div className="mt-1 text-sm font-bold leading-tight text-orange-800">הרצף הכי ארוך</div>
                </div>
              )}
            </div>
          )}

          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-slate-700">
            <span>
              סך הכול: <span className="font-bold text-amber-800">{player.stats.stars} ⭐</span>
            </span>
            {dayStreak >= 2 && (
              <span className="rounded-full bg-orange-50 px-3 py-1 font-bold text-orange-800 ring-1 ring-orange-200">
                🔥 {dayStreak} ימים ברצף{calm ? '' : '!'}
              </span>
            )}
          </p>

          {/* מדבקה ראשונה למעלה, עוד שתיים כאן – והשאר "ועוד N" */}
          <NewStickers stickers={newStickers.slice(1)} player={player} total={newStickers.length} big={STICKERS_SHOWN - 1} onOpen={locked(onStickers)} className="mt-6" />

          {/* "כמעט שם" רק כשלא התקבלה מדבקה חדשה – כדי שהסיכום לא יהיה עמוס */}
          {!newStickers.length && <NextStickerCard player={player} next={next} className="mt-6" />}

          {remember && (
            <section className="mt-6 rounded-3xl bg-slate-50 p-4 text-start">
              <h2 className="mb-2 text-xl font-bold text-slate-700">💡 כדאי לזכור</h2>
              <div className="flex items-start gap-3 rounded-2xl bg-white p-3 text-sm sm:text-base">
                {(remember.picture || remember.icon) && (
                  <span className="text-3xl leading-none" aria-hidden="true">
                    {remember.picture || remember.icon}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="font-medium text-slate-600">{remember.question}</div>
                  <div className="font-bold text-emerald-700">✓ {remember.answer}</div>
                </div>
              </div>
              {missed.length > 1 && (
                <button type="button" onClick={locked(onStickers)} className="mt-2 min-h-[48px] w-full rounded-2xl py-2 text-base font-bold text-sky-700 hover:bg-white">
                  ועוד {missed.length - 1 === 1 ? 'שאלה אחת' : `${missed.length - 1} שאלות`} במחברת הטעויות ←
                </button>
              )}
            </section>
          )}

          {(hint || levelChanged) && (
            <div className="mt-6 rounded-3xl bg-amber-50 p-4 text-amber-800">
              {hint && <p className="font-bold">{hint.text}</p>}
              {levelChanged ? (
                <p className="mt-2 font-bold text-emerald-700">✓ עברנו ל{difficultyInfo[levelChanged].title}</p>
              ) : onSetDifficulty ? (
                <button
                  type="button"
                  className="btn btn-white mt-3 text-amber-700"
                  onClick={locked(() => {
                    onSetDifficulty(hint.to);
                    setLevelChanged(hint.to);
                  })}
                >
                  {difficultyInfo[hint.to].emoji} כן, בואו ננסה
                </button>
              ) : (
                <p className="mt-1 text-sm">אפשר לשנות את הרמה בעריכת השחקן ✏️</p>
              )}
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={locked(onStickers)} className="btn btn-white text-violet-600">
              <Trophy size={22} />
              חדר הפרסים שלי
            </button>
            {topic && onOtherTopic && (
              <button type="button" onClick={locked(onOtherTopic)} className="btn btn-white text-sky-700">
                <Shuffle size={22} />
                נושא אחר
              </button>
            )}
          </div>
        </div>
      </div>

      <ActionBar>
        {/* נושא שנגמרו בו השאלות החדשות – מציעים נושא אחר במקום "עוד סבב" */}
        <button
          type="button"
          onClick={locked(topic && topicDone ? onOtherTopic : onPlayAgain)}
          aria-disabled={!ready}
          className={`btn flex-1 py-3 text-lg text-white ${theme.button}`}
        >
          <RotateCcw size={22} />
          {topic ? (topicDone ? 'לבחירת נושא אחר' : `עוד סבב בנושא ${topic}`) : `${g(player, 'שחק', 'שחקי')} שוב`}
        </button>
        <button type="button" onClick={locked(onSwitchPlayer)} aria-disabled={!ready} className="btn btn-white">
          <Home size={22} />
          דף הבית
        </button>
      </ActionBar>
    </main>
  );
}
