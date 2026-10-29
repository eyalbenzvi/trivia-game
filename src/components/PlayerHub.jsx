import { useEffect, useState } from 'react';
import { Play, Volume2 } from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import { getTheme } from '../data/themes';
import { ageLabel, difficultyInfo, g, rankFor } from '../data/profiles';
import { nextStickerSentence, stickerCount } from '../data/stickers';
import { nextSticker } from '../data/nextSticker';
import { useSpeech } from '../hooks/useSpeech';

/** המדבקה הבאה בדרך – שורה קטנה עם פס התקדמות */
function NextSticker({ player, theme }) {
  const next = nextSticker(player);
  if (!next) {
    if (player.stats.gamesPlayed > 0) return null;
    return <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700 short:mt-2">🎈 המדבקה הראשונה מחכה במשחק הראשון!</p>;
  }
  const { sticker, ratio } = next;
  return (
    <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-1.5 text-start short:mt-2" title={sticker.description}>
      <p className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <span className="text-xl leading-none" aria-hidden="true">
          {sticker.emoji}
        </span>
        <span className="flex-1">🎯 {nextStickerSentence(player, next)}</span>
      </p>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
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

/**
 * הודעה קטנה כשאין במכשיר קול בעברית – רק למי שזה נוגע לו (הקראה אוטומטית או רמה קלה).
 * נסגרת בלחיצה ולא חוזרת במכשיר הזה.
 */
function VoiceChip({ player }) {
  const { supported, voicesLoaded, hasHebrewVoice } = useSpeech();
  const [dismissed, setDismissed] = useState(readDismissed);
  const relevant = player.autoRead || player.difficulty === 'easy';
  if (dismissed || !relevant || !supported || !voicesLoaded || hasHebrewVoice) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(VOICE_NOTICE_KEY, '1');
    } catch {
      // אחסון חסום – ההודעה תחזור רק בפתיחה הבאה
    }
  };
  return (
    <p className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-1.5 text-start text-sm font-medium text-amber-900 short:mt-2" role="status">
      <span className="flex-1">🔇 אין כאן קול בעברית, אז ההקראה אולי לא תעבוד. אפשר להוסיף קול בהגדרות המכשיר.</span>
      <button type="button" className="min-h-[2.75rem] shrink-0 rounded-xl px-2 font-bold text-amber-900 underline" onClick={dismiss}>
        הבנתי
      </button>
    </p>
  );
}

/** תאריך מקומי YYYY-MM-DD */
const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** רצף ימים – רק אם עדיין חי (שיחקו היום או אתמול) */
const liveStreak = (stats) => {
  const n = Number(stats?.dayStreak) || 0;
  if (n < 2 || typeof stats.lastPlayDay !== 'string') return 0;
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return [localDay(now), localDay(yesterday)].includes(stats.lastPlayDay) ? n : 0;
};

/** שם ארוך במילה אחת – גופן קטן יותר, ושבירה רק כשאין ברירה (לא אות בודדת בשורה) */
const nameSize = (name) => {
  const longest = Math.max(...String(name).split(/\s+/).map((w) => w.length));
  return longest > 12 ? 'text-xl short:text-lg' : longest > 8 ? 'text-2xl short:text-xl' : 'text-3xl short:text-2xl';
};

const hubPrompt = (p) => `${p.name}! ${g(p, 'מוכן', 'מוכנה')} לשחק? ${g(p, 'לחץ', 'לחצי')} על הכפתור הגדול`;

/**
 * "הדף של השחקן" – חלון (בטלפון: גיליון מלמטה) שנפתח בלחיצה על תמונה במסך הבית.
 * כפתור גדול אחד למשחק, ומתחתיו שאר האפשרויות. כל פעולה סוגרת את החלון ואז מבצעת.
 */
export default function PlayerHub({ player, onClose, onPlay, onTopic, onTimed, onStickers, onEdit }) {
  const t = getTheme(player.theme);
  const diff = difficultyInfo[player.difficulty] || difficultyInfo.medium;
  const rank = rankFor(player);
  const sub = [ageLabel(player), `${diff.emoji} ${diff.label}`, `${rank.emoji} ${rank.title}`].filter(Boolean).join(' · ');
  const { owned } = stickerCount(player);
  const streak = liveStreak(player.stats);
  const { speak, cancel, supported } = useSpeech();

  // מי שמשחק עם הקראה שומע מה לעשות כבר כשהחלון נפתח
  useEffect(() => {
    if (player.autoRead) speak(hubPrompt(player));
    return () => cancel();
    // רק בפתיחה
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = (fn) => () => {
    onClose();
    fn(player);
  };
  const secondary = `btn btn-white min-h-[3.5rem] border-2 px-2 text-base leading-tight ${t.border}`;

  return (
    <Modal open onClose={onClose} label={player.name} className="max-w-md short:max-w-2xl">
      <div className="px-5 pb-5 pt-6 text-center sm:px-7 sm:pb-7 short:px-4 short:pb-3 short:pt-3">
        {supported && (
          <button type="button" className="icon-btn absolute right-3 top-3 z-10 h-12 w-12 bg-sky-100 text-sky-800" onClick={() => speak(hubPrompt(player))} aria-label="הקראה" title="הקראה">
            <Volume2 size={22} />
          </button>
        )}
        {/* בטלפון לרוחב: התמונה ליד השם, כדי שכל הכפתורים ייכנסו בלי גלילה */}
        <div className="short:flex short:items-center short:gap-3 short:pe-12 short:ps-12 short:text-start">
          <Avatar avatar={player.avatar} theme={player.theme} size="lg" decorative className="mx-auto short:mx-0 short:h-16 short:w-16" />
          <div className="min-w-0">
            <h2 className={`mt-2 hyphens-none font-bold leading-tight [overflow-wrap:anywhere] short:mt-0 ${nameSize(player.name)} ${t.text}`}>{player.name}</h2>
            <p className="mt-1 text-base font-medium text-slate-600 short:mt-0">{sub}</p>
            {player.temporary && <p className="mt-1 text-sm font-bold text-slate-600 short:mt-0">אורח</p>}
            {streak >= 2 && (
              <p className="mt-1 inline-block rounded-full bg-orange-100 px-3 py-0.5 text-sm font-bold text-orange-800 short:mt-0">🔥 {streak} ימים ברצף</p>
            )}
          </div>
        </div>

        <NextSticker player={player} theme={t} />
        <VoiceChip player={player} />

        <button type="button" autoFocus onClick={act(onPlay)} className={`btn mt-4 w-full py-5 text-2xl text-white short:mt-3 short:py-3 ${t.button}`}>
          <Play size={28} className="fill-white" aria-hidden="true" />
          משחקים!
        </button>

        <div className="mt-2 grid grid-cols-2 gap-2 short:grid-cols-4">
          <button type="button" onClick={act(onTopic)} className={secondary}>
            📚 לפי נושא
          </button>
          <button type="button" onClick={act(onTimed)} className={secondary}>
            ⏱️ מרוץ
          </button>
          <button type="button" onClick={act(onStickers)} className={secondary}>
            🏆 חדר הפרסים · {owned === 1 ? 'מדבקה אחת' : `${owned} מדבקות`}
          </button>
          <button type="button" onClick={act(onEdit)} className={secondary}>
            ✏️ עריכה
          </button>
        </div>
      </div>
    </Modal>
  );
}
