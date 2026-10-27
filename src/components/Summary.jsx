import { useEffect } from 'react';
import { Flame, RotateCcw, Star, Trophy, Users, Volume2 } from 'lucide-react';
import Avatar from './Avatar';
import { useSpeech } from '../hooks/useSpeech';
import { getTheme } from '../data/themes';
import { difficultyInfo, g, rankFor } from '../data/profiles';
import { nextSticker, nextStickerSentence, stickerById, stickerTitle } from '../data/stickers';
import { nextLevel, prevLevel } from '../utils/game';
import { celebrate, clearConfetti, starBurst } from '../utils/confetti';
import { playFanfare, playUnlock } from '../utils/sound';

const verdict = (correct, total, player) => {
  const ratio = correct / total;
  if (ratio === 1) return { emoji: '🏆', title: `מושלם! ${total} מתוך ${total}!`, text: g(player, 'אתה גאון אמיתי!', 'את גאונה אמיתית!') };
  if (ratio >= 0.7) return { emoji: '🌟', title: 'משחק מעולה!', text: 'ידעת המון תשובות – כל הכבוד!' };
  if (ratio >= 0.4) return { emoji: '😊', title: 'יפה מאוד!', text: 'למדת היום כמה דברים חדשים ומדהימים.' };
  return { emoji: '💪', title: 'איזה יופי של ניסיון!', text: 'כל משחק הופך אותנו לחכמים יותר. נשחק שוב?' };
};

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

export default function Summary({ player, result, onPlayAgain, onSwitchPlayer, onStickers, onSetDifficulty }) {
  const theme = getTheme(player.theme);
  const newStickers = player.stickers.filter((id) => !(result.startStickers[player.id] || []).includes(id)).map((id) => stickerById[id]).filter(Boolean);
  const v = verdict(result.correct, result.total, player);
  const next = nextSticker(player);
  const startStars = result.startStars?.[player.id];
  // עלייה בדרגה (לפי סך הכוכבים) במשחק הזה
  const rankUp = startStars != null && rankFor(player).min > rankFor({ ...player, stats: { ...player.stats, stars: startStars } }).min ? rankFor(player) : null;
  const hint = levelHint(player);
  const missed = (result.missed || []).slice(0, 3);
  const { speak, speaking, supported } = useSpeech();

  const readSummary = () =>
    speak(
      [
        v.title,
        resultSentence(result.correct),
        ...newStickers.map((s) => `וקיבלת מדבקה חדשה: ${stickerTitle(s)}!`),
        rankUp ? `עלית דרגה! עכשיו ${g(player, 'אתה', 'את')} ${rankUp.title}.` : '',
        next ? `${nextStickerSentence(player, next)}!` : '',
      ].filter(Boolean),
      { rate: 0.9 },
    );

  useEffect(() => {
    playFanfare();
    const stop = result.correct / result.total >= 0.5 ? celebrate(2500) : (starBurst(), null);
    if (player.autoRead) readSummary();
    let t;
    if (newStickers.length) {
      t = setTimeout(() => {
        playUnlock();
        starBurst();
      }, 1200);
    }
    return () => {
      clearTimeout(t);
      stop?.();
      clearConfetti();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6">
      <div className="card overflow-hidden text-center animate-slide-up">
        <div className={`relative bg-gradient-to-br ${theme.gradient} px-6 pb-16 pt-8 text-white`}>
          {supported && (
            <button
              type="button"
              onClick={readSummary}
              className={`icon-btn absolute left-3 top-3 h-12 w-12 bg-white/90 text-sky-600 ${speaking ? 'animate-pulse' : ''}`}
              aria-label="הקראת הסיכום"
            >
              <Volume2 size={24} />
            </button>
          )}
          <div className="mb-2 text-7xl animate-pop" aria-hidden="true">
            {v.emoji}
          </div>
          <h1 className="text-4xl font-bold drop-shadow sm:text-5xl">{v.title}</h1>
          <p className="mt-2 text-xl font-medium opacity-95">{v.text}</p>
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <Avatar avatar={player.avatar} theme={player.theme} size="lg" className="border-4 border-white" />
          </div>
        </div>

        <div className="px-5 pb-8 pt-16 sm:px-8">
          <h2 className={`text-2xl font-bold ${theme.text}`}>{player.name}</h2>

          {rankUp && (
            <p className="mx-auto mt-3 w-fit rounded-full bg-gradient-to-l from-amber-200 to-yellow-100 px-5 py-2 text-lg font-bold text-amber-800 animate-pop">
              עלית דרגה! 🎓 {rankUp.emoji} {rankUp.title}
            </p>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-3xl bg-emerald-50 p-3 animate-pop sm:p-4" style={{ animationDelay: '150ms' }}>
              <div className="text-3xl font-black text-emerald-500 sm:text-4xl" dir="ltr">
                {result.correct}/{result.total}
              </div>
              <div className="mt-1 text-sm font-bold text-emerald-700">תשובות נכונות</div>
            </div>
            <div className="rounded-3xl bg-amber-50 p-3 animate-pop sm:p-4" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-center gap-1 text-3xl font-black text-amber-500 sm:text-4xl">
                <Star size={28} className="fill-amber-400 text-amber-400" />
                {result.stars}
              </div>
              <div className="mt-1 text-sm font-bold text-amber-700">כוכבים</div>
            </div>
            <div className="rounded-3xl bg-orange-50 p-3 animate-pop sm:p-4" style={{ animationDelay: '450ms' }}>
              <div className="flex items-center justify-center gap-1 text-3xl font-black text-orange-500 sm:text-4xl">
                <Flame size={28} className="fill-orange-300" />
                {result.bestStreak}
              </div>
              <div className="mt-1 text-sm font-bold text-orange-700">הרצף הכי ארוך</div>
            </div>
          </div>

          <p className="mt-4 text-slate-600">
            סך הכול בחשבון: <span className="font-bold text-amber-600">{player.stats.stars} ⭐</span>
          </p>

          {newStickers.length > 0 && (
            <section className="mt-6 rounded-3xl bg-gradient-to-br from-violet-50 to-pink-50 p-5">
              <h3 className="mb-4 text-2xl font-bold text-violet-600">🎁 מדבקות חדשות!</h3>
              <div className="flex flex-wrap justify-center gap-4">
                {newStickers.map((s, i) => (
                  <div key={s.id} className="flex w-28 flex-col items-center animate-pop" style={{ animationDelay: `${1200 + i * 200}ms` }}>
                    <div
                      className={`flex h-24 w-24 rotate-[-6deg] items-center justify-center rounded-full border-4 border-white bg-gradient-to-br ${s.color} text-5xl shadow-pop`}
                    >
                      {s.emoji}
                    </div>
                    <div className="mt-2 font-bold leading-tight text-slate-700">{stickerTitle(s)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <NextStickerCard player={player} next={next} className="mt-6" />

          {missed.length > 0 && (
            <section className="mt-6 rounded-3xl bg-slate-50 p-4 text-start">
              <h2 className="mb-2 text-xl font-bold text-slate-700">💡 כדאי לזכור</h2>
              <ul className="space-y-2">
                {missed.map((m, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-2xl bg-white p-3 text-sm sm:text-base">
                    {m.icon && (
                      <span className="text-3xl leading-none" aria-hidden="true">
                        {m.icon}
                      </span>
                    )}
                    <div>
                      <div className="font-medium text-slate-600">{m.question}</div>
                      <div className="font-bold text-emerald-600">✓ {m.answer}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hint && (
            <div className="mt-6 rounded-3xl bg-amber-50 p-4 text-amber-800">
              <p className="font-bold">{hint.text}</p>
              {onSetDifficulty ? (
                <button type="button" className="btn btn-white mt-3 text-amber-700" onClick={() => onSetDifficulty(hint.to)}>
                  {difficultyInfo[hint.to].emoji} כן, בואו ננסה
                </button>
              ) : (
                <p className="mt-1 text-sm">אפשר לשנות את הרמה בעריכת השחקן ✏️</p>
              )}
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={onPlayAgain} className={`btn py-4 text-xl text-white sm:col-span-2 ${theme.button}`}>
              <RotateCcw size={24} />
              {g(player, 'שחק', 'שחקי')} שוב
            </button>
            <button type="button" onClick={onStickers} className="btn btn-white text-violet-600">
              <Trophy size={22} />
              חדר הפרסים שלי
            </button>
            <button type="button" onClick={onSwitchPlayer} className="btn btn-white">
              <Users size={22} />
              החלפת שחקן
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
