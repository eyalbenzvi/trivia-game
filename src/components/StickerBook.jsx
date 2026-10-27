import { useState } from 'react';
import { ArrowRight, Lock, Play, Star } from 'lucide-react';
import Avatar from './Avatar';
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

export default function StickerBook({ player, onBack, onPlay }) {
  const theme = getTheme(player.theme);
  const { stats } = player;
  const accuracy = stats.totalAnswered ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;
  const cards = buildCards(player);
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

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4 sm:px-6">
      <header className="mb-5 flex items-center gap-3">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="חזרה">
          <ArrowRight size={26} />
        </button>
        <Avatar avatar={player.avatar} theme={player.theme} size="sm" />
        <h1 className={`min-w-0 flex-1 break-words text-2xl font-bold leading-tight sm:text-4xl ${theme.text}`}>🏆 הפרסים של {player.name}</h1>
      </header>

      <section className="card mb-5 grid grid-cols-2 gap-3 p-4 text-center sm:grid-cols-4">
        {[
          { label: 'כוכבים', value: stats.stars, icon: <Star size={22} className="fill-amber-400 text-amber-400" />, cls: 'text-amber-500' },
          { label: 'משחקים', value: stats.gamesPlayed, icon: '🎮', cls: 'text-sky-500' },
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

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" aria-label="מדבקות">
        {cards.map((card, i) => {
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
              className={`card flex flex-col items-center p-3 text-center animate-slide-up focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 sm:p-4 ${card.has ? '' : 'bg-white/60'}`}
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
