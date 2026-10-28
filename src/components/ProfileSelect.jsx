import { BookOpen, ChevronLeft, Pencil, Play, Plus, Star, Timer, Users, Volume2, X } from 'lucide-react';
import Avatar from './Avatar';
import SoundToggle from './SoundToggle';
import { getTheme } from '../data/themes';
import { ageLabel, difficultyInfo, g, rankFor } from '../data/profiles';
import { nextStickerSentence, stickerCount } from '../data/stickers';
import { nextSticker } from '../data/nextSticker';
import { useSpeech } from '../hooks/useSpeech';

const ONBOARDING_TEXT = [
  'ברוכים הבאים! לחצו על התמונה שלכם כדי לשחק.',
  'אוספים כוכבים ומדבקות.',
  'משחק משפחתי – כולם יחד.',
  'מרוץ – כמה שיותר תשובות בזמן קצוב.',
];

/** כרטיס ברוכים הבאים – מופיע רק בפעם הראשונה */
function Onboarding({ onDismiss, canSpeak }) {
  const { speak, supported } = useSpeech();
  return (
    <section className="card relative mb-5 border-4 border-sky-200 p-4 sm:p-5 animate-slide-up" aria-label="ברוכים הבאים">
      <div className="flex items-start gap-3">
        <span className="text-4xl leading-none" aria-hidden="true">
          👋
        </span>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-700 sm:text-2xl">ברוכים הבאים!</h2>
          <p className="mt-1 text-base font-medium text-slate-700">לחצו על התמונה שלכם כדי לשחק.</p>
          <ul className="mt-2 space-y-1 text-base text-slate-700">
            <li>⭐ אוספים כוכבים ומדבקות</li>
            <li>🚀 משחק משפחתי – כולם יחד</li>
            <li>⏱️ מרוץ – כמה שיותר תשובות בזמן קצוב</li>
          </ul>
        </div>
        {canSpeak && supported && (
          <button type="button" className="icon-btn bg-sky-100 text-sky-700" onClick={() => speak(ONBOARDING_TEXT)} aria-label="הקראה" title="הקראה">
            <Volume2 size={22} />
          </button>
        )}
      </div>
      <button type="button" className="btn mt-3 w-full bg-sky-500 text-lg text-white hover:bg-sky-600" onClick={onDismiss}>
        הבנתי, יאללה!
      </button>
    </section>
  );
}

function SaveFailedBanner({ onDismiss }) {
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 pr-4 text-amber-900 animate-slide-up" role="status">
      <span className="text-2xl" aria-hidden="true">
        ⚠️
      </span>
      <p className="flex-1">
        <span className="block font-bold">ההתקדמות לא נשמרת במכשיר הזה</span>
        <span className="block text-sm">אפשר לשחק, אבל הכוכבים והמדבקות יימחקו כשסוגרים את הדף (אולי גלישה בסתר או אחסון מלא).</span>
      </p>
      <button type="button" className="icon-btn shrink-0" onClick={onDismiss} aria-label="סגירת ההודעה">
        <X size={20} />
      </button>
    </div>
  );
}

/** פס "מי משחק?" לטלפון – תמונות גדולות, נגיעה מתחילה משחק. גם מי שלא קורא מוצא את עצמו */
function PlayerStrip({ players, onPlay }) {
  return (
    <section className="mb-5 sm:hidden" aria-label="מי משחק? נגיעה בתמונה מתחילה משחק">
      <div className="grid grid-cols-3 gap-2">
        {players.map((p) => {
          const t = getTheme(p.theme);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPlay(p)}
              className="flex flex-col items-center gap-1 rounded-3xl bg-white/70 px-1 py-2 shadow-pop-sm transition active:translate-y-0.5 active:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700"
              aria-label={`לשחק עם ${p.name}`}
            >
              <span className="relative">
                <Avatar avatar={p.avatar} theme={p.theme} size="strip" />
                <span className={`absolute -bottom-0.5 -left-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-pop-sm ${t.text}`} aria-hidden="true">
                  <Play size={14} className="fill-current" />
                </span>
              </span>
              {/* שם ארוך נשבר לשורות (לא נחתך) – כל ילד מזהה את השם שלו */}
              <span className={`max-w-full break-words text-center font-bold leading-tight ${p.name.length > 9 ? 'text-base' : 'text-lg'} ${t.text}`}>{p.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function NextSticker({ player, theme }) {
  const next = nextSticker(player);
  if (!next) {
    if (player.stats.gamesPlayed > 0) return null;
    return (
      <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700">
        🎈 המדבקה הראשונה מחכה במשחק הראשון!
      </p>
    );
  }
  const { sticker, ratio } = next;
  return (
    <div className="mt-2 rounded-2xl bg-slate-50 px-3 py-1.5 text-start" title={sticker.description}>
      <p className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <span className="text-xl leading-none" aria-hidden="true">
          {sticker.emoji}
        </span>
        <span className="flex-1">
          🎯 {nextStickerSentence(player, next)}
        </span>
      </p>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}

const tile =
  'flex min-h-[4rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700';

function ProfileCard({ player, onPlay, onTimed, onTopic, onEdit, onStickers, index }) {
  const t = getTheme(player.theme);
  const diff = difficultyInfo[player.difficulty] || difficultyInfo.medium;
  const rank = rankFor(player);
  const sub = [ageLabel(player), `${diff.emoji} ${diff.label}`].filter(Boolean).join(' · ');
  return (
    <article
      className={`card relative flex flex-col overflow-hidden border-4 ${t.border} p-3 animate-slide-up sm:p-5`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${t.gradient} opacity-30 sm:h-24`} aria-hidden="true" />
      {player.temporary && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-600">אורח</span>
      )}

      <div className="relative flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPlay(player)}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-3xl text-start focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 sm:flex-col sm:text-center"
          aria-label={`לשחק עם ${player.name}`}
        >
          <Avatar avatar={player.avatar} theme={player.theme} size="card" className="transition group-hover:scale-105" />
          <span className="min-w-0 sm:w-full">
            <h2 className={`break-words font-bold leading-tight sm:mt-2 sm:text-3xl ${player.name.length > 12 ? 'text-xl' : 'text-2xl'} ${t.text}`}>{player.name}</h2>
            <span className="block text-sm font-medium text-slate-600 sm:text-base">{sub}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onPlay(player)}
          className={`btn shrink-0 px-3 py-3 text-lg text-white min-[400px]:px-4 sm:hidden ${t.button}`}
          aria-label={`לשחק עם ${player.name}`}
        >
          <Play size={22} className="fill-white" />
          {/* במסך צר מאוד – רק האייקון, כדי להשאיר מקום לשם */}
          <span className="hidden min-[400px]:inline">משחקים</span>
        </button>
      </div>

      <div className="relative mt-2 flex flex-wrap items-center gap-1.5 sm:justify-center">
        <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-sm font-bold text-slate-700" title="דרגה לפי הכוכבים">
          {rank.emoji} {rank.title}
        </span>
        {player.autoRead && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-sm font-bold text-sky-800">
            <Volume2 size={14} aria-hidden="true" /> הקראה
          </span>
        )}
      </div>

      <NextSticker player={player} theme={t} />

      <div className="mt-3 grid grid-cols-[1fr_1.35fr_3.25rem] gap-1.5 sm:gap-2">
        <div className={`${tile} bg-amber-50`}>
          <span className="flex items-center gap-1 text-xl font-black text-amber-600">
            <Star size={18} className="fill-amber-400 text-amber-400" aria-hidden="true" />
            {player.stats.stars.toLocaleString('he-IL')}
          </span>
          <span className="text-sm font-bold text-amber-800">כוכבים</span>
        </div>
        <button
          type="button"
          onClick={() => onStickers(player)}
          className={`${tile} relative bg-violet-50 hover:bg-violet-100`}
          aria-label={`חדר הפרסים של ${player.name}: ${stickerCount(player).owned} מדבקות`}
        >
          <span className="text-sm font-bold text-violet-800">🏆 חדר הפרסים</span>
          <span className="text-base font-black text-violet-600">
            {stickerCount(player).owned === 1 ? 'מדבקה אחת' : `${stickerCount(player).owned} מדבקות`}
          </span>
          <ChevronLeft size={18} className="absolute left-1 top-1/2 -translate-y-1/2 text-violet-400" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onEdit(player)}
          className={`${tile} bg-slate-100 hover:bg-slate-200`}
          aria-label={`עריכת הפרופיל של ${player.name}`}
          title="עריכה"
        >
          <Pencil size={18} className="text-slate-600" aria-hidden="true" />
          <span className="text-xs font-bold text-slate-700">עריכה</span>
        </button>
      </div>

      {/* סוגי משחק נוספים */}
      <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:mt-2 sm:gap-2">
        <button
          type="button"
          onClick={() => onTopic(player)}
          className={`${tile} flex-row gap-1.5 bg-emerald-50 hover:bg-emerald-100`}
          aria-label={`טריוויה לפי נושא עם ${player.name}`}
        >
          <BookOpen size={20} className="shrink-0 text-emerald-600" aria-hidden="true" />
          <span className="text-sm font-bold leading-tight text-emerald-800">לפי נושא</span>
        </button>
        <button
          type="button"
          onClick={() => onTimed(player)}
          className={`${tile} flex-row gap-1.5 bg-rose-50 hover:bg-rose-100`}
          aria-label={`מרוץ נגד השעון עם ${player.name}`}
        >
          <Timer size={20} className="shrink-0 text-rose-500" aria-hidden="true" />
          <span className="text-sm font-bold leading-tight text-rose-800">מרוץ נגד השעון</span>
        </button>
      </div>

      <button type="button" onClick={() => onPlay(player)} className={`btn mt-4 hidden w-full py-4 text-xl text-white sm:flex ${t.button}`}>
        <Play size={24} className="fill-white" />
        יאללה, משחקים!
      </button>
    </article>
  );
}

/** שיאי המשפחה במרוץ נגד השעון – לכל שחקן לפי הרמה שלו (הרמות לא ניתנות להשוואה) */
function FamilyRecords({ players }) {
  const rows = players
    .map((p) => ({ p, best: Object.entries(p.stats.timedBest || {}).filter(([, n]) => n > 0).sort(([a], [b]) => Number(a) - Number(b)) }))
    .filter((r) => r.best.length);
  if (!rows.length) return null;
  return (
    <details className="card group mt-6 p-4 sm:p-5">
      <summary className="flex min-h-[2.75rem] cursor-pointer list-none items-center gap-2 rounded-2xl text-xl font-bold text-slate-700">
        <span aria-hidden="true">🏆</span>
        <span className="flex-1">שיאי המשפחה במרוץ</span>
        <ChevronLeft size={20} className="-rotate-90 text-slate-500 transition group-open:rotate-90" aria-hidden="true" />
      </summary>
      <ul className="mt-3 space-y-2">
        {rows.map(({ p, best }) => {
          const diff = difficultyInfo[p.difficulty] || difficultyInfo.medium;
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-2">
              <Avatar avatar={p.avatar} theme={p.theme} size="sm" />
              <span className="font-bold text-slate-700">{p.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${diff.badge}`}>
                {diff.emoji} {diff.label}
              </span>
              <span className="ms-auto flex flex-wrap gap-1.5">
                {best.map(([sec, n]) => (
                  <span key={sec} className="rounded-full bg-white px-2.5 py-1 text-sm font-bold text-slate-700 shadow-pop-sm">
                    ⏱️ {sec} שנ׳: {n}
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export default function ProfileSelect({
  players,
  onPlay,
  onTimed,
  onTopic,
  onTeam,
  onEdit,
  onAdd,
  onStickers,
  soundOn,
  onToggleSound,
  showOnboarding,
  onDismissOnboarding,
  saveFailed,
  onDismissSaveFailed,
}) {
  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
      <header className="mb-5 flex items-start gap-3 sm:mb-8">
        <div className="flex-1 text-center">
          <div className="mb-1 inline-flex animate-float text-4xl sm:mb-2 sm:text-6xl" aria-hidden="true">
            🧠✨
          </div>
          <h1 className="bg-gradient-to-l from-rose-500 via-amber-500 to-sky-500 bg-clip-text text-4xl font-bold text-transparent sm:text-6xl">
            טריוויה משפחתית
          </h1>
          <p className="mt-2 text-lg font-bold text-slate-700 sm:mt-3 sm:text-xl">
            מי משחק עכשיו?<span className="hidden font-medium sm:inline"> בחרו שחקן ובואו נגלה דברים מדהימים!</span>
          </p>
        </div>
        <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
          <SoundToggle enabled={soundOn} onToggle={onToggleSound} showLabel />
        </div>
      </header>

      {saveFailed && <SaveFailedBanner onDismiss={onDismissSaveFailed} />}
      {showOnboarding && players.length > 0 && <Onboarding onDismiss={onDismissOnboarding} canSpeak={players.some((p) => p.autoRead)} />}

      {players.length > 0 && <PlayerStrip players={players} onPlay={onPlay} />}

      {players.length >= 2 && (
        <button
          type="button"
          onClick={onTeam}
          className="group mb-6 flex w-full items-center gap-3 rounded-3xl bg-gradient-to-l from-violet-600 via-sky-600 to-emerald-600 p-4 text-start text-white shadow-pop transition hover:-translate-y-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 sm:mb-8 sm:gap-4 sm:p-6"
        >
          {/* ערימת תמונות: חפיפה בעזרת שוליים לוגיים (ms) כדי שלא יגלשו על הטקסט בכיוון ימין-לשמאל */}
          <span className="flex shrink-0" aria-hidden="true">
            {players.slice(0, 3).map((p, i) => (
              <Avatar key={p.id} avatar={p.avatar} theme={p.theme} size="sm" className={`border-2 border-white ${i ? '-ms-5' : ''}`} />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-bold min-[360px]:text-2xl sm:text-3xl">
              <span className="whitespace-nowrap">משחק משפחתי 🚀</span>
            </span>
            <span className="block text-base font-medium sm:text-lg">כולם בצוות אחד – כל אחד בתורו</span>
          </span>
          <Users size={36} className="hidden shrink-0 sm:block" aria-hidden="true" />
        </button>
      )}

      {players.length === 0 && (
        <p className="mb-6 rounded-3xl bg-white/80 p-6 text-center text-xl font-bold text-slate-700">עוד אין שחקנים – בואו ניצור את הראשון! 👇</p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3" aria-label="השחקנים">
        {players.map((p, i) => (
          <ProfileCard key={p.id} player={p} index={i} onPlay={onPlay} onTimed={onTimed} onTopic={onTopic} onEdit={onEdit} onStickers={onStickers} />
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-[5rem] items-center justify-center gap-3 rounded-3xl border-4 border-dashed border-slate-300 bg-white/50 p-4 text-slate-600 transition hover:-translate-y-1 hover:border-sky-400 hover:bg-white/80 hover:text-sky-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 sm:min-h-[18rem] sm:flex-col sm:p-6"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-pop-sm sm:h-20 sm:w-20">
            <Plus size={28} className="sm:hidden" />
            <Plus size={40} className="hidden sm:block" />
          </span>
          <span className="text-start sm:text-center">
            <span className="block text-2xl font-bold">שחקן חדש</span>
            <span className="block text-sm">חבר, בן דוד או אורח</span>
          </span>
        </button>
      </section>

      <FamilyRecords players={players} />
      <p className="mt-8 text-center text-xs text-slate-500" dir="rtl">
        גרסה <bdi dir="ltr">{__APP_VERSION__}</bdi>
      </p>
    </main>
  );
}
