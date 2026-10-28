import { useEffect } from 'react';
import { Home, RotateCcw, Star, Volume2 } from 'lucide-react';
import Avatar from './Avatar';
import { NextStickerCard, resultSentence } from './Summary';
import { useSpeech } from '../hooks/useSpeech';
import { getTheme } from '../data/themes';
import { g } from '../data/profiles';
import { nextSticker, nextStickerSentence, stickerById, stickerTitle } from '../data/stickers';
import { celebrate, clearConfetti, starBurst } from '../utils/confetti';
import { playFanfare } from '../utils/sound';
import HomeButton from './HomeButton';

export default function TimedSummary({ player, result, onPlayAgain, onHome }) {
  const theme = getTheme(player.theme);
  const fresh = player.stickers.filter((id) => !(result.startStickers[player.id] || []).includes(id)).map((id) => stickerById[id]).filter(Boolean);
  const next = nextSticker(player);
  const { speak, speaking, supported } = useSpeech();
  // שיא ראשון – חגיגה קטנה; שבירת שיא אמיתי – חגיגה גדולה
  const title = result.firstRecord
    ? 'קבעת שיא ראשון! 🎯'
    : result.newRecord
      ? 'שיא חדש! 🏆'
      : result.reason === 'quit'
        ? 'המרוץ נעצר ⏸️'
        : 'הזמן נגמר! ⏱️';

  const readSummary = () =>
    speak(
      [
        title,
        resultSentence(result.correct),
        ...fresh.map((s) => `וקיבלת מדבקה חדשה: ${stickerTitle(s)}!`),
        next ? `${nextStickerSentence(player, next)}!` : '',
      ].filter(Boolean),
      { rate: 0.9 },
    );

  useEffect(() => {
    playFanfare();
    let stop = null;
    if (result.firstRecord) stop = celebrate(1200, { small: true });
    else if (result.newRecord) stop = celebrate(3000);
    else starBurst();
    if (player.autoRead) readSummary();
    return () => {
      stop?.();
      clearConfetti();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-12 pt-3">
      <div className="mb-2 flex justify-end">
        <HomeButton onClick={onHome} />
      </div>
      <div className="card overflow-hidden text-center animate-slide-up">
        <div className={`relative bg-gradient-to-br ${theme.gradient} px-6 pb-8 pt-8 text-white`}>
          {supported && (
            <button
              type="button"
              onClick={readSummary}
              className={`icon-btn absolute left-3 top-3 z-10 bg-white/90 text-sky-600 ${speaking ? 'animate-pulse' : ''}`}
              aria-label="הקראת הסיכום"
            >
              <Volume2 size={24} />
            </button>
          )}
          <Avatar avatar={player.avatar} theme={player.theme} size="md" className="mx-auto border-4 border-white" />
          <h1 className="mt-3 text-3xl font-bold drop-shadow sm:text-4xl">{title}</h1>
          <div className="mt-2 text-7xl font-black drop-shadow animate-pop">{result.correct}</div>
          <p className="text-xl font-medium opacity-95">תשובות נכונות ב־{result.duration} שניות</p>
        </div>

        <div className="px-5 pb-8 pt-6 sm:px-8">
          <div className="grid grid-cols-3 gap-1.5 min-[360px]:gap-3">
            <div className="rounded-3xl bg-sky-50 p-3">
              <div className="text-3xl font-black text-sky-500">{result.answered}</div>
              <div className="text-sm font-bold text-sky-700">שאלות</div>
            </div>
            <div className="rounded-3xl bg-amber-50 p-3">
              <div className="flex items-center justify-center gap-1 text-3xl font-black text-amber-500">
                <Star size={24} className="fill-amber-400 text-amber-400" />
                {result.stars}
              </div>
              <div className="text-sm font-bold text-amber-700">כוכבים</div>
            </div>
            <div className="rounded-3xl bg-violet-50 p-3">
              <div className="text-3xl font-black text-violet-500">{Math.max(result.prevBest, result.correct)}</div>
              <div className="text-sm font-bold text-violet-700">השיא</div>
            </div>
          </div>
          {!result.newRecord && result.prevBest > 0 && (
            <p className="mt-3 font-medium text-slate-600">
              השיא הקודם הוא {result.prevBest} – {result.prevBest - result.correct <= 2 ? 'ממש קרוב!' : `${g(player, 'נסה', 'נסי')} לשבור אותו!`}
            </p>
          )}

          {fresh.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {fresh.map((s) => (
                <div key={s.id} className="flex w-24 flex-col items-center animate-pop">
                  <span className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br ${s.color} text-4xl shadow-pop`}>
                    {s.emoji}
                  </span>
                  <span className="mt-1 text-sm font-bold leading-tight text-slate-700">{stickerTitle(s)}</span>
                </div>
              ))}
            </div>
          )}

          <NextStickerCard player={player} next={next} className="mt-6" />

          {result.missed.length > 0 && (
            <section className="mt-6 rounded-3xl bg-slate-50 p-4 text-start">
              <h2 className="mb-2 text-xl font-bold text-slate-700">💡 כדאי לזכור</h2>
              <ul className="space-y-2">
                {result.missed.slice(-5).map((m, i) => (
                  <li key={i} className="rounded-2xl bg-white p-3 text-sm">
                    <div className="font-medium text-slate-600">{m.question}</div>
                    <div className="font-bold text-emerald-600">✓ {m.answer}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={onPlayAgain} className={`btn py-4 text-xl text-white ${theme.button}`}>
              <RotateCcw size={24} />
              עוד מרוץ
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
