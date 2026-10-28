import { useState } from 'react';
import { ChevronLeft, Plus, Volume2, X } from 'lucide-react';
import Avatar from './Avatar';
import SoundToggle from './SoundToggle';
import { getTheme } from '../data/themes';
import { difficultyInfo } from '../data/profiles';
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
      <button type="button" className="btn mt-3 w-full bg-sky-700 text-lg text-white hover:bg-sky-800" onClick={onDismiss}>
        הבנתי, יאללה!
      </button>
    </section>
  );
}

const VOICE_NOTICE_KEY = 'family-trivia:voice-notice';
const readDismissed = () => {
  try {
    return window.localStorage.getItem(VOICE_NOTICE_KEY) === '1';
  } catch {
    return false;
  }
};

/** "לעידו ולנועה" / "לעידו, לנועה ולרעות" */
const toNames = (names) => (names.length === 1 ? `ל${names[0]}` : `${names.slice(0, -1).map((n) => `ל${n}`).join(', ')} ול${names[names.length - 1]}`);

/** אזהרה (פעם אחת, במסך הבית) כשמישהו משחק עם הקראה אבל אין במכשיר קול בעברית */
function VoiceNotice({ players }) {
  const { supported, voicesLoaded, hasHebrewVoice } = useSpeech();
  const [dismissed, setDismissed] = useState(readDismissed);
  const readers = players.filter((p) => p.autoRead).map((p) => p.name);
  if (dismissed || !readers.length || !supported || !voicesLoaded || hasHebrewVoice) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(VOICE_NOTICE_KEY, '1');
    } catch {
      // אחסון חסום – ההודעה תחזור רק בטעינה הבאה
    }
  };
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 pr-4 text-amber-900 animate-slide-up" role="status">
      <p className="flex-1">
        🔇 אין במכשיר הזה קול בעברית, אז ההקראה {toNames(readers)} אולי לא תעבוד. אפשר להתקין קול עברי בהגדרות המכשיר (נגישות ← הקראה).
      </p>
      <button type="button" className="btn btn-white shrink-0 px-4 py-2" onClick={dismiss}>
        הבנתי
      </button>
    </div>
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

/** תמונה אחת ב"מי משחק?" – לחיצה פותחת את הדף של השחקן */
function PlayerTile({ player, onOpen, index }) {
  const t = getTheme(player.theme);
  return (
    <button
      type="button"
      onClick={() => onOpen(player)}
      aria-label={player.name}
      className="group relative flex min-w-0 flex-col items-center gap-1 rounded-3xl p-1 text-center animate-slide-up focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <Avatar avatar={player.avatar} theme={player.theme} size="pick" decorative className="transition group-hover:scale-105 group-active:scale-95" />
      {/* שם ארוך נשבר לשורות (לא נחתך) – כל ילד מזהה את השם שלו */}
      <span className={`max-w-full break-words text-lg font-bold leading-tight ${t.text}`}>{player.name}</span>
      <span className="text-sm font-bold text-slate-700">⭐ {player.stats.stars.toLocaleString('he-IL')}</span>
      {player.temporary && (
        <span className="absolute right-0 top-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 shadow-pop-sm">אורח</span>
      )}
    </button>
  );
}

export default function ProfileSelect({
  players,
  onOpen,
  onTeam,
  onTwenty,
  onAdd,
  soundOn,
  onToggleSound,
  showOnboarding,
  onDismissOnboarding,
  saveFailed,
  onDismissSaveFailed,
}) {
  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6 short:pt-2">
      <header className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:mb-8 short:mb-3">
        <span aria-hidden="true" />
        <div className="text-center">
          <div className="mb-1 inline-flex animate-float text-4xl sm:mb-2 sm:text-6xl short:hidden" aria-hidden="true">
            🧠✨
          </div>
          <h1 className="bg-gradient-to-l from-rose-600 to-violet-700 bg-clip-text text-4xl font-bold text-transparent sm:text-6xl short:text-3xl">
            טריוויה משפחתית
          </h1>
          <p className="mt-2 text-lg font-bold text-slate-700 sm:mt-3 sm:text-xl short:mt-0">מי משחק עכשיו?</p>
        </div>
        <div className="justify-self-end self-start">
          <SoundToggle enabled={soundOn} onToggle={onToggleSound} />
        </div>
      </header>

      {saveFailed && <SaveFailedBanner onDismiss={onDismissSaveFailed} />}
      <VoiceNotice players={players} />
      {showOnboarding && players.length > 0 && <Onboarding onDismiss={onDismissOnboarding} canSpeak={players.some((p) => p.autoRead)} />}

      {players.length === 0 && (
        <p className="mb-6 rounded-3xl bg-white/80 p-6 text-center text-xl font-bold text-slate-700">עוד אין שחקנים – בואו ניצור את הראשון! 👇</p>
      )}

      <section aria-label="מי משחק?" className="mx-auto grid max-w-4xl grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-3">
        {players.map((p, i) => (
          <PlayerTile key={p.id} player={p} index={i} onOpen={onOpen} />
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="group flex min-w-0 flex-col items-center gap-1 rounded-3xl p-1 text-center text-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700"
        >
          <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-dashed border-slate-400 bg-white transition group-hover:scale-105 group-hover:border-sky-600 group-hover:text-sky-700 md:h-32 md:w-32 short:h-20 short:w-20">
            <Plus size={40} aria-hidden="true" />
          </span>
          <span className="text-lg font-bold leading-tight">שחקן חדש</span>
        </button>
      </section>

      {players.length >= 2 && (
        <button
          type="button"
          onClick={onTeam}
          className="group mx-auto mt-6 flex w-full max-w-4xl items-center gap-3 rounded-3xl bg-gradient-to-l from-violet-700 to-indigo-600 p-4 text-start text-white shadow-pop transition hover:-translate-y-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 focus-visible:ring-offset-2 sm:gap-4 sm:p-5"
        >
          <span className="min-w-0 flex-1">
            <span className={`block text-xl font-bold sm:text-3xl ${players.length > 3 ? 'min-[420px]:text-2xl' : 'min-[360px]:text-2xl'}`}>
              משחק משפחתי{' '}
              <span className="inline-block shrink-0" aria-hidden="true">
                🚀
              </span>
            </span>
            <span className="block text-base font-medium sm:text-lg">כולם בצוות אחד – כל אחד בתורו</span>
          </span>
          {/* ערימת תמונות: חפיפה בעזרת שוליים לוגיים (ms) כדי שלא יגלשו על הטקסט בכיוון ימין-לשמאל */}
          <span className="flex shrink-0 items-center" aria-hidden="true">
            {players.slice(0, 5).map((p, i) => (
              <Avatar key={p.id} avatar={p.avatar} theme={p.theme} size="sm" decorative className={`border-2 border-white ${i ? '-ms-6 min-[420px]:-ms-5' : ''} ${i >= 3 ? 'hidden min-[420px]:block' : ''}`} />
            ))}
            {/* בטלפון צר מוצגות 3 תמונות, ברחב – עד 5; השאר כ"+N" */}
            {players.length > 3 && (
              <span dir="ltr" className={`relative -ms-4 h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-indigo-900 text-sm font-bold ${players.length > 5 ? 'flex' : 'flex min-[420px]:hidden'}`}>
                <span className="min-[420px]:hidden">+{players.length - 3}</span>
                {players.length > 5 && <span className="hidden min-[420px]:inline">+{players.length - 5}</span>}
              </span>
            )}
          </span>
        </button>
      )}

      {/* משחק נוסף (בעל-פה) – כפתור משני אחד בלבד. כשיתווסף עוד משחק, השורה תהפוך ל"משחקים נוספים" */}
      <button
        type="button"
        onClick={onTwenty}
        className={`group mx-auto flex w-full max-w-4xl items-center gap-3 rounded-3xl border-2 border-teal-200 bg-white/90 p-3 text-start shadow-pop-sm transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 focus-visible:ring-offset-2 sm:p-4 short:p-2 ${
          players.length >= 2 ? 'mt-3' : 'mt-6'
        }`}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-100 text-3xl" aria-hidden="true">
          🎙️
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold text-slate-800 sm:text-xl">20 שאלות</span>
          <span className="block text-sm font-medium text-slate-600 sm:text-base">חי, צומח או דומם? משחק ניחושים בקול</span>
        </span>
        <ChevronLeft size={22} className="shrink-0 text-slate-500" aria-hidden="true" />
      </button>

      <FamilyRecords players={players} />
      <p className="mt-8 text-center text-xs text-slate-500" dir="rtl">
        גרסה <bdi dir="ltr">{__APP_VERSION__}</bdi>
      </p>
    </main>
  );
}
