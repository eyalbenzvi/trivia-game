import { useEffect } from 'react';
import { Home, RotateCcw, Star } from 'lucide-react';
import Avatar from './Avatar';
import { getTheme } from '../data/themes';
import { g } from '../data/profiles';
import { stickerById } from '../data/stickers';
import { celebrate, starBurst } from '../utils/confetti';
import { playFanfare } from '../utils/sound';

export default function TimedSummary({ player, result, onPlayAgain, onHome }) {
  const theme = getTheme(player.theme);
  const fresh = player.stickers.filter((id) => !(result.startStickers[player.id] || []).includes(id)).map((id) => stickerById[id]).filter(Boolean);

  useEffect(() => {
    playFanfare();
    if (result.newRecord) celebrate(3000);
    else starBurst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6">
      <div className="card overflow-hidden text-center animate-slide-up">
        <div className={`bg-gradient-to-br ${theme.gradient} px-6 pb-8 pt-8 text-white`}>
          <Avatar avatar={player.avatar} theme={player.theme} size="md" className="mx-auto border-4 border-white" />
          <h1 className="mt-3 text-3xl font-bold drop-shadow sm:text-4xl">{result.newRecord ? 'שיא חדש! 🏆' : 'הזמן נגמר! ⏱️'}</h1>
          <div className="mt-2 text-7xl font-black drop-shadow animate-pop">{result.correct}</div>
          <p className="text-xl font-medium opacity-95">תשובות נכונות ב־{result.duration} שניות</p>
        </div>

        <div className="px-5 pb-8 pt-6 sm:px-8">
          <div className="grid grid-cols-3 gap-3">
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
            <p className="mt-3 font-medium text-slate-500">
              השיא הקודם הוא {result.prevBest} – {result.prevBest - result.correct <= 2 ? 'ממש קרוב!' : `${g(player, 'נסה', 'נסי')} לשבור אותו!`}
            </p>
          )}

          {fresh.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {fresh.map((s) => (
                <div key={s.id} className="flex flex-col items-center animate-pop">
                  <span className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br ${s.color} text-4xl shadow-pop`}>
                    {s.emoji}
                  </span>
                  <span className="mt-1 text-sm font-bold text-slate-700">{s.name}</span>
                </div>
              ))}
            </div>
          )}

          {result.missed.length > 0 && (
            <section className="mt-6 rounded-3xl bg-slate-50 p-4 text-start">
              <h2 className="mb-2 text-xl font-bold text-slate-700">💡 כדאי לזכור</h2>
              <ul className="space-y-2">
                {result.missed.slice(-5).map((m) => (
                  <li key={m.question} className="rounded-2xl bg-white p-3 text-sm">
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
