import { ArrowRight, Lock, Play, Star } from 'lucide-react';
import Avatar from './Avatar';
import { getTheme } from '../data/themes';
import { stickers } from '../data/stickers';

export default function StickerBook({ player, onBack, onPlay }) {
  const theme = getTheme(player.theme);
  const owned = new Set(player.stickers);
  const { stats } = player;
  const accuracy = stats.totalAnswered ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="חזרה">
          <ArrowRight size={26} />
        </button>
        <Avatar avatar={player.avatar} theme={player.theme} size="sm" />
        <h1 className={`flex-1 text-3xl font-bold sm:text-4xl ${theme.text}`}>חדר הפרסים של {player.name}</h1>
      </header>

      <section className="card mb-6 grid grid-cols-2 gap-3 p-4 text-center sm:grid-cols-4">
        {[
          { label: 'כוכבים', value: stats.stars, icon: <Star size={22} className="fill-amber-400 text-amber-400" />, cls: 'text-amber-500' },
          { label: 'משחקים', value: stats.gamesPlayed, icon: '🎮', cls: 'text-sky-500' },
          { label: 'הצלחה', value: `${accuracy}%`, icon: '🎯', cls: 'text-emerald-500' },
          { label: 'מדבקות', value: `${owned.size}/${stickers.length}`, icon: '🏅', cls: 'text-violet-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-slate-50 p-3">
            <div className={`flex items-center justify-center gap-1 text-3xl font-black ${s.cls}`}>
              {s.icon}
              {s.value}
            </div>
            <div className="text-sm font-bold text-slate-500">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-label="מדבקות">
        {stickers.map((s, i) => {
          const has = owned.has(s.id);
          const { current, target } = s.progress(stats);
          const pct = Math.min(100, Math.round((current / target) * 100));
          return (
            <article
              key={s.id}
              className={`card flex flex-col items-center p-4 text-center animate-slide-up ${has ? '' : 'bg-white/60'}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div
                className={`relative flex h-24 w-24 items-center justify-center rounded-full border-4 text-5xl transition ${
                  has
                    ? `border-white bg-gradient-to-br ${s.color} shadow-pop hover:rotate-6 hover:scale-110`
                    : 'border-dashed border-slate-300 bg-slate-100 grayscale'
                }`}
                style={has ? { transform: `rotate(${(i % 3) * 5 - 5}deg)` } : undefined}
              >
                <span className={has ? '' : 'opacity-25'}>{s.emoji}</span>
                {!has && <Lock size={28} className="absolute text-slate-400" />}
              </div>
              <h2 className={`mt-3 text-lg font-bold ${has ? 'text-slate-800' : 'text-slate-500'}`}>{s.name}</h2>
              <p className="text-sm text-slate-500">{s.description}</p>
              {!has && (
                <div className="mt-2 w-full">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-400">
                    {Math.min(current, target)} מתוך {target}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <div className="mt-8 text-center">
        <button type="button" onClick={onPlay} className={`btn px-10 py-4 text-xl text-white ${theme.button}`}>
          <Play size={24} className="fill-white" />
          למשחק חדש
        </button>
      </div>
    </main>
  );
}
