import { Pencil, Play, Plus, Star, Timer, Trophy, Users, Volume2 } from 'lucide-react';
import Avatar from './Avatar';
import SoundToggle from './SoundToggle';
import { getTheme } from '../data/themes';
import { ageLabel, difficultyInfo } from '../data/profiles';
import { stickers } from '../data/stickers';

function ProfileCard({ player, onPlay, onTimed, onEdit, onStickers, index }) {
  const t = getTheme(player.theme);
  const diff = difficultyInfo[player.difficulty] || difficultyInfo.medium;
  return (
    <article
      className={`card group relative flex flex-col items-center overflow-hidden border-4 ${t.border} p-5 pt-6 text-center animate-slide-up`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${t.gradient} opacity-30`} aria-hidden="true" />
      <button
        type="button"
        onClick={() => onEdit(player)}
        className="icon-btn absolute left-3 top-3 z-10 h-10 w-10"
        aria-label={`עריכת הפרופיל של ${player.name}`}
        title="עריכה"
      >
        <Pencil size={18} />
      </button>
      {player.temporary && (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-500">
          אורח
        </span>
      )}

      <button
        type="button"
        onClick={() => onPlay(player)}
        className="relative flex flex-col items-center focus:outline-none"
        aria-label={`לשחק עם ${player.name}`}
      >
        <Avatar avatar={player.avatar} theme={player.theme} size="lg" className="transition group-hover:scale-105 group-hover:animate-wiggle" />
        <h2 className={`mt-3 text-3xl font-bold ${t.text}`}>{player.name}</h2>
        <p className="text-lg font-medium text-slate-500">{ageLabel(player)}</p>
      </button>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${diff.badge}`}>
          {diff.emoji} {diff.label}
        </span>
        {player.autoRead && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-700">
            <Volume2 size={14} /> הקראה
          </span>
        )}
      </div>

      <div className="mt-4 grid w-full grid-cols-2 gap-2">
        <div className="rounded-2xl bg-amber-50 py-2">
          <div className="flex items-center justify-center gap-1 text-2xl font-black text-amber-500">
            <Star size={22} className="fill-amber-400 text-amber-400" />
            {player.stats.stars}
          </div>
          <div className="text-xs font-bold text-amber-700/80">כוכבים</div>
        </div>
        <button
          type="button"
          onClick={() => onStickers(player)}
          className="rounded-2xl bg-violet-50 py-2 transition hover:bg-violet-100"
          aria-label={`חדר הפרסים של ${player.name}`}
        >
          <div className="flex items-center justify-center gap-1 text-2xl font-black text-violet-500">
            <Trophy size={20} />
            <span dir="ltr">{player.stickers.length}/{stickers.length}</span>
          </div>
          <div className="text-xs font-bold text-violet-700/80">מדבקות</div>
        </button>
      </div>

      <button type="button" onClick={() => onPlay(player)} className={`btn mt-4 w-full py-4 text-xl text-white ${t.button}`}>
        <Play size={24} className="fill-white" />
        יאללה, משחקים!
      </button>
      <button type="button" onClick={() => onTimed(player)} className={`btn btn-white mt-2 w-full ${t.text}`}>
        <Timer size={20} />
        מרוץ נגד השעון
      </button>
    </article>
  );
}

export default function ProfileSelect({ players, onPlay, onTimed, onTeam, onEdit, onAdd, onStickers, soundOn, onToggleSound }) {
  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex-1 text-center">
          <div className="mb-2 inline-flex animate-float text-6xl" aria-hidden="true">
            🧠✨
          </div>
          <h1 className="bg-gradient-to-l from-rose-500 via-amber-500 to-sky-500 bg-clip-text text-4xl font-bold text-transparent sm:text-6xl">
            טריוויה משפחתית
          </h1>
          <p className="mt-3 text-lg font-medium text-slate-600 sm:text-xl">מי משחק עכשיו? בחרו שחקן ובואו נגלה דברים מדהימים!</p>
        </div>
        <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
          <SoundToggle enabled={soundOn} onToggle={onToggleSound} />
        </div>
      </header>

      {players.length >= 2 && (
        <button
          type="button"
          onClick={onTeam}
          className="group mb-8 flex w-full items-center gap-4 rounded-3xl bg-gradient-to-l from-violet-500 via-sky-500 to-emerald-400 p-5 text-start text-white shadow-pop transition hover:-translate-y-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 sm:p-6"
        >
          <span className="flex -space-x-4 space-x-reverse" aria-hidden="true">
            {players.slice(0, 3).map((p) => (
              <Avatar key={p.id} avatar={p.avatar} theme={p.theme} size="sm" className="border-2 border-white" />
            ))}
          </span>
          <span className="flex-1">
            <span className="block text-2xl font-bold sm:text-3xl">משחק משפחתי 🚀</span>
            <span className="block text-base font-medium opacity-90 sm:text-lg">כולם בצוות אחד, כל שאלה מגיע תור של מישהו אחר</span>
          </span>
          <Users size={36} className="hidden shrink-0 sm:block" />
        </button>
      )}

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="בחירת שחקן">
        {players.map((p, i) => (
          <ProfileCard key={p.id} player={p} index={i} onPlay={onPlay} onTimed={onTimed} onEdit={onEdit} onStickers={onStickers} />
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-[18rem] flex-col items-center justify-center gap-3 rounded-3xl border-4 border-dashed border-slate-300 bg-white/50 p-6 text-slate-500 transition hover:-translate-y-1 hover:border-sky-400 hover:bg-white/80 hover:text-sky-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-pop-sm">
            <Plus size={40} />
          </span>
          <span className="text-2xl font-bold">שחקן חדש</span>
          <span className="text-sm">חבר, בן דוד או אורח</span>
        </button>
      </section>
    </main>
  );
}
