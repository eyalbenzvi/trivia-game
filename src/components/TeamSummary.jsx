import { useEffect } from 'react';
import { Home, RotateCcw, Star } from 'lucide-react';
import Avatar from './Avatar';
import MissionTrack from './MissionTrack';
import { getTheme } from '../data/themes';
import { stickerById } from '../data/stickers';
import { celebrate, starBurst } from '../utils/confetti';
import { playFanfare } from '../utils/sound';

export default function TeamSummary({ players, result, onPlayAgain, onHome }) {
  const success = result.correct >= result.goal;
  const { mission } = result;

  useEffect(() => {
    playFanfare();
    if (success) celebrate(3000);
    else starBurst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6">
      <div className="card overflow-hidden text-center animate-slide-up">
        <div className={`bg-gradient-to-br ${mission.color} px-6 pb-8 pt-8 text-white`}>
          <div className="text-7xl animate-pop" aria-hidden="true">
            {success ? mission.goal : mission.mover}
          </div>
          <h1 className="mt-2 text-4xl font-bold drop-shadow sm:text-5xl">{success ? mission.success : mission.fail}</h1>
          <p className="mt-2 text-xl font-medium opacity-95">
            {success ? 'עבודת צוות מושלמת – כל הכבוד לכולם!' : 'היה מעולה! בפעם הבאה נגיע עד הסוף.'}
          </p>
        </div>

        <div className="px-5 pb-8 pt-6 sm:px-8">
          <MissionTrack mission={mission} correct={result.correct} goal={result.goal} />

          <div className="mt-4 flex justify-center gap-3">
            <div className="rounded-3xl bg-emerald-50 px-5 py-3">
              <div className="text-3xl font-black text-emerald-500">
                {result.correct}/{result.total}
              </div>
              <div className="text-sm font-bold text-emerald-700">תשובות נכונות</div>
            </div>
            <div className="rounded-3xl bg-amber-50 px-5 py-3">
              <div className="flex items-center justify-center gap-1 text-3xl font-black text-amber-500">
                <Star size={26} className="fill-amber-400 text-amber-400" />
                {result.stars}
              </div>
              <div className="text-sm font-bold text-amber-700">כוכבים לצוות</div>
            </div>
          </div>

          <h2 className="mb-3 mt-7 text-2xl font-bold text-slate-700">מה כל אחד תרם</h2>
          <ul className="space-y-3">
            {players.map((p, i) => {
              const stats = result.perPlayer[p.id] || { correct: 0, answered: 0, stars: 0 };
              const fresh = p.stickers.filter((id) => !(result.startStickers[p.id] || []).includes(id)).map((id) => stickerById[id]).filter(Boolean);
              const t = getTheme(p.theme);
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 rounded-3xl border-2 ${t.border} ${t.soft} p-3 text-start animate-slide-up`}
                  style={{ animationDelay: `${300 + i * 150}ms` }}
                >
                  <Avatar avatar={p.avatar} theme={p.theme} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className={`text-xl font-bold ${t.text}`}>{p.name}</div>
                    <div className="text-sm font-medium text-slate-500">
                      {stats.correct} נכונות מתוך {stats.answered}
                    </div>
                  </div>
                  {fresh.length > 0 && (
                    <div className="flex gap-1" title="מדבקות חדשות">
                      {fresh.map((s) => (
                        <span key={s.id} className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${s.color} text-2xl animate-pop`}>
                          {s.emoji}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xl font-black text-amber-500">
                    <Star size={20} className="fill-amber-400 text-amber-400" />
                    {stats.stars}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={onPlayAgain} className="btn bg-gradient-to-l from-violet-500 to-sky-500 py-4 text-xl text-white">
              <RotateCcw size={24} />
              עוד משימה
            </button>
            <button type="button" onClick={onHome} className="btn btn-white py-4 text-xl">
              <Home size={24} />
              למסך הבית
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
