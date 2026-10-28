import { useMemo, useState } from 'react';
import { Lock, Play, Star, Volume2 } from 'lucide-react';
import Avatar from './Avatar';
import HomeButton from './HomeButton';
import ActionBar from './ActionBar';
import { NextStickerCard } from './Summary';
import { useSpeech } from '../hooks/useSpeech';
import { getTheme } from '../data/themes';
import { TIERS, nextSticker, stickerCount, stickerDescription, stickersFor, stickerTitle } from '../data/stickers';
import { sparkleAt } from '../utils/confetti';
import { playClick } from '../utils/sound';

/**
 * מקבץ את המדבקות לכרטיסים: מדבקה רגילה = כרטיס אחד, מדבקת נושא = כרטיס אחד עם שלוש דרגות
 * (ארד / כסף / זהב) – הדרגה מוצגת כצבע הטבעת.
 */
const buildCards = (player) => {
  const owned = new Set(player.stickers);
  const cards = [];
  const groups = new Map();
  stickersFor(player).forEach((s) => {
    if (!s.group) {
      cards.push({ key: s.id, show: s, has: owned.has(s.id), tier: 0 });
      return;
    }
    if (!groups.has(s.group)) {
      const card = { key: s.group, tiers: [] };
      groups.set(s.group, card);
      cards.push(card);
    }
    groups.get(s.group).tiers.push(s);
  });
  return cards.map((c) => {
    if (!c.tiers) return c;
    const tiers = c.tiers.sort((a, b) => a.tier - b.tier);
    const got = tiers.filter((s) => owned.has(s.id));
    const top = got[got.length - 1];
    const nextTier = tiers.find((s) => !owned.has(s.id));
    return { key: c.key, show: nextTier || top, top, has: Boolean(top), tier: top?.tier || 0, done: !nextTier };
  });
};

// כמה מדבקות נעולות מוצגות כ"הבאות בתור" (השאר מקופלות)
const NEXT_SHOWN = 6;

export default function StickerBook({ player, bank, onBack, onPlay }) {
  const theme = getTheme(player.theme);
  const { stats } = player;
  const accuracy = stats.totalAnswered ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;
  const cards = buildCards(player);
  // קודם מה שכבר יש, אחר כך 6 המדבקות הכי קרובות, ושאר המדבקות הנעולות מקופלות
  const ratio = (card) => {
    const { current, target } = card.show.progress(stats, player.difficulty);
    return target ? current / target : 0;
  };
  const ownedCards = cards.filter((c) => c.has);
  const locked = cards.filter((c) => !c.has).sort((a, b) => ratio(b) - ratio(a));
  const nextCards = locked.slice(0, NEXT_SHOWN);
  const restCards = locked.slice(NEXT_SHOWN);
  // "מחברת הטעויות": השאלות האחרונות שטעיתי בהן, עם התשובה וההסבר (לעיון – הן לא חוזרות למשחק)
  const notebook = useMemo(() => {
    if (!bank) return [];
    const byId = new Map(Object.values(bank).flat().map((q) => [q.id, q]));
    return (stats.review || []).map((id) => byId.get(id)).filter(Boolean).reverse();
  }, [bank, stats.review]);
  const { owned, total } = stickerCount(player);
  const next = nextSticker(player);
  const { speak, supported } = useSpeech();
  const [wiggle, setWiggle] = useState(null);

  const tap = (card, el) => {
    playClick();
    setWiggle(card.key);
    setTimeout(() => setWiggle((w) => (w === card.key ? null : w)), 700);
    if (card.has) sparkleAt(el);
    if (player.autoRead && supported) {
      const s = card.top || card.show;
      const status = card.has ? (card.done || !card.top ? '' : ` הדרגה הבאה: ${stickerDescription(card.show, player.difficulty)}.`) : ' עוד לא קיבלת אותה.';
      speak(`${stickerTitle(s)}. ${stickerDescription(s, player.difficulty)}.${status}`, { rate: 0.9 });
    }
  };

  const renderCard = (card, i) => {
          const s = card.show;
          const face = card.top || s;
          const tierInfo = card.tier ? TIERS[card.tier - 1] : null;
          const { current, target } = s.progress(stats, player.difficulty);
          const pct = Math.min(100, Math.round((current / target) * 100));
          const showProgress = s.group ? !card.done : !card.has;
          return (
            <button
              type="button"
              key={card.key}
              onClick={(e) => tap(card, e.currentTarget.querySelector('[data-face]'))}
              className={`card flex flex-col items-center p-3 text-center animate-slide-up focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700 sm:p-4 ${card.has ? '' : 'bg-white/60'}`}
              style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}
              aria-label={`${stickerTitle(face)}: ${stickerDescription(face, player.difficulty)}${card.has ? '' : ' (נעולה)'}`}
            >
              <div
                data-face
                className={`relative flex h-24 w-24 items-center justify-center rounded-full border-4 text-5xl transition ${
                  card.has ? `border-white bg-gradient-to-br ${face.color} shadow-pop` : 'border-dashed border-slate-300 bg-slate-100 grayscale'
                } ${tierInfo ? `ring-4 ${tierInfo.ring}` : ''} ${wiggle === card.key ? 'animate-wiggle' : ''}`}
                style={card.has && wiggle !== card.key ? { transform: `rotate(${(i % 3) * 5 - 5}deg)` } : undefined}
              >
                <span className={card.has ? '' : 'opacity-25'}>{face.emoji}</span>
                {!card.has && <Lock size={28} className="absolute text-slate-400" />}
                {tierInfo && <span className="absolute -bottom-2 -left-1 text-2xl" aria-hidden="true">{tierInfo.medal}</span>}
              </div>
              <span className={`mt-3 text-lg font-bold leading-tight ${card.has ? 'text-slate-800' : 'text-slate-600'}`}>{face.name}</span>
              {tierInfo && <span className={`mt-1 rounded-full px-2 text-xs font-bold ${tierInfo.badge}`}>{tierInfo.label}</span>}
              <span className="mt-1 text-sm text-slate-600">{stickerDescription(s, player.difficulty)}</span>
              {showProgress && (
                <div className="mt-2 w-full">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-600">
                    {s.group && card.has ? `ל${TIERS[s.tier - 1].label}: ` : ''}
                    {Math.min(current, target)} מתוך {target}
                  </div>
                </div>
              )}
            </button>
          );
        };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6">
      <header className="mb-5 flex items-center gap-3">
        <Avatar avatar={player.avatar} theme={player.theme} size="sm" />
        <h1 className={`min-w-0 flex-1 break-words text-2xl font-bold leading-tight sm:text-4xl ${theme.text}`}>🏆 הפרסים של {player.name}</h1>
        <HomeButton onClick={onBack} />
      </header>

      <section className="card mb-5 grid grid-cols-2 gap-3 p-4 text-center sm:grid-cols-4">
        {[
          { label: 'כוכבים', value: stats.stars, icon: <Star size={22} className="fill-amber-400 text-amber-400" />, cls: 'text-amber-500' },
          { label: stats.gamesPlayed === 1 ? 'משחק' : 'משחקים', value: stats.gamesPlayed, icon: '🎮', cls: 'text-sky-500' },
          { label: 'הצלחה', value: `${accuracy}%`, icon: '🎯', cls: 'text-emerald-500' },
          { label: 'מדבקות', value: `${owned}/${total}`, icon: '🏅', cls: 'text-violet-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-slate-50 p-3">
            <div className={`flex items-center justify-center gap-1 text-3xl font-black ${s.cls}`} dir="ltr">
              {s.icon}
              {s.value}
            </div>
            <div className="text-sm font-bold text-slate-600">{s.label}</div>
          </div>
        ))}
      </section>

      <NextStickerCard player={player} next={next} className="mb-5" />

      {ownedCards.length > 0 && (
        <>
          <h2 className="mb-3 text-xl font-bold text-slate-700">המדבקות שלי ({ownedCards.length})</h2>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" aria-label="המדבקות שלי">
            {ownedCards.map(renderCard)}
          </section>
        </>
      )}

      {nextCards.length > 0 && (
        <>
          <h2 className="mb-3 mt-6 text-xl font-bold text-slate-700">🎯 הבאות בתור</h2>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" aria-label="המדבקות הבאות">
            {nextCards.map(renderCard)}
          </section>
        </>
      )}

      {restCards.length > 0 && (
        <details className="mt-6 rounded-3xl bg-white/70 p-3">
          <summary className="cursor-pointer list-none py-2 text-center text-lg font-bold text-sky-700">עוד {restCards.length} מדבקות לגלות ▾</summary>
          <section className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" aria-label="עוד מדבקות">
            {restCards.map(renderCard)}
          </section>
        </details>
      )}

      {notebook.length > 0 && (
        <details className="mt-6 rounded-3xl bg-slate-50 p-3">
          <summary className="cursor-pointer list-none py-2 text-center text-lg font-bold text-slate-700">💡 מחברת טעויות ({notebook.length}) ▾</summary>
          <ul className="mt-2 space-y-2">
            {notebook.map((q) => (
              <li key={q.id} className="flex items-start gap-3 rounded-2xl bg-white p-3 text-start">
                <span className="text-3xl leading-none" aria-hidden="true">
                  {q.optionEmojis?.[q.correctIndex] || q.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-600">{q.question}</div>
                  <div className="font-bold text-emerald-700">✓ {q.options[q.correctIndex]}</div>
                  <div className="mt-1 text-sm text-slate-600">{q.explanation}</div>
                </div>
                {player.autoRead && supported && (
                  <button
                    type="button"
                    className="icon-btn h-11 w-11 shrink-0 text-sky-600"
                    onClick={() => speak([q.question, `התשובה: ${q.options[q.correctIndex]}.`, q.explanation], { rate: 0.9 })}
                    aria-label="הקראה"
                  >
                    <Volume2 size={20} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      <ActionBar>
        <button type="button" onClick={onPlay} className={`btn flex-1 py-3 text-lg text-white ${theme.button}`}>
          <Play size={22} className="fill-white" />
          למשחק חדש
        </button>
      </ActionBar>
    </main>
  );
}
