import { useEffect } from 'react';
import { Flame, RotateCcw, Star, Trophy, Users } from 'lucide-react';
import Avatar from './Avatar';
import { getTheme } from '../data/themes';
import { g } from '../data/profiles';
import { stickerById } from '../data/stickers';
import { celebrate, starBurst } from '../utils/confetti';
import { playFanfare, playUnlock } from '../utils/sound';

const verdict = (correct, total, player) => {
  const ratio = correct / total;
  if (ratio === 1) return { emoji: '🏆', title: `מושלם! ${total} מתוך ${total}!`, text: g(player, 'אתה גאון אמיתי!', 'את גאונה אמיתית!') };
  if (ratio >= 0.7) return { emoji: '🌟', title: 'משחק מעולה!', text: 'ידעת המון תשובות – כל הכבוד!' };
  if (ratio >= 0.4) return { emoji: '😊', title: 'יפה מאוד!', text: 'למדת היום כמה דברים חדשים ומדהימים.' };
  return { emoji: '💪', title: 'איזה יופי של ניסיון!', text: 'כל משחק הופך אותנו לחכמים יותר. נשחק שוב?' };
};

export default function Summary({ player, result, onPlayAgain, onSwitchPlayer, onStickers }) {
  const theme = getTheme(player.theme);
  const newStickers = player.stickers.filter((id) => !(result.startStickers[player.id] || []).includes(id)).map((id) => stickerById[id]).filter(Boolean);
  const v = verdict(result.correct, result.total, player);

  useEffect(() => {
    playFanfare();
    if (result.correct / result.total >= 0.5) celebrate(2500);
    else starBurst();
    if (newStickers.length) {
      const t = setTimeout(() => {
        playUnlock();
        starBurst();
      }, 1200);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6">
      <div className="card overflow-hidden text-center animate-slide-up">
        <div className={`relative bg-gradient-to-br ${theme.gradient} px-6 pb-16 pt-8 text-white`}>
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

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-3xl bg-emerald-50 p-4 animate-pop" style={{ animationDelay: '150ms' }}>
              <div className="text-4xl font-black text-emerald-500">
                {result.correct}/{result.total}
              </div>
              <div className="mt-1 text-sm font-bold text-emerald-700">תשובות נכונות</div>
            </div>
            <div className="rounded-3xl bg-amber-50 p-4 animate-pop" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-center gap-1 text-4xl font-black text-amber-500">
                <Star size={30} className="fill-amber-400 text-amber-400" />
                {result.stars}
              </div>
              <div className="mt-1 text-sm font-bold text-amber-700">כוכבים</div>
            </div>
            <div className="rounded-3xl bg-orange-50 p-4 animate-pop" style={{ animationDelay: '450ms' }}>
              <div className="flex items-center justify-center gap-1 text-4xl font-black text-orange-500">
                <Flame size={30} className="fill-orange-300" />
                {result.bestStreak}
              </div>
              <div className="mt-1 text-sm font-bold text-orange-700">הרצף הכי ארוך</div>
            </div>
          </div>

          <p className="mt-4 text-slate-500">
            סך הכול בחשבון: <span className="font-bold text-amber-500">{player.stats.stars} ⭐</span>
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
                    <div className="mt-2 font-bold text-slate-700">{s.name}</div>
                  </div>
                ))}
              </div>
            </section>
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
