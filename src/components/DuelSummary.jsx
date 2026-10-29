import { useEffect, useRef, useState } from 'react';
import { Home, RotateCcw, Star, Volume2 } from 'lucide-react';
import Avatar from './Avatar';
import ActionBar from './ActionBar';
import MissedList from './MissedList';
import SpeakingBars from './SpeakingBars';
import { useSpeech } from '../hooks/useSpeech';
import { getTheme } from '../data/themes';
import { g } from '../data/profiles';
import { stickerById, stickerTitle } from '../data/stickers';
import { clearConfetti, summaryCelebrate } from '../utils/confetti';
import { playFanfare, playUnlock } from '../utils/sound';

const EMPTY = { correct: 0, answered: 0, stars: 0 };
const correctText = (c) => (c === 1 ? 'תשובה נכונה אחת' : `${c} תשובות נכונות`);
// כמה זמן הכפתורים נעולים אחרי שהמסך מופיע (לחיצה כפולה לא מתחילה משחק חוזר)
const LOCK_MS = 500;

/**
 * המאזן המצטבר בין שני השחקנים ("רעות 3 · אבא 1 · תיקו 1"), מתוך stats.duelRecord של השחקן הראשון.
 * מוצג רק מהאתגר השני ביניהם. בלי המילה "הפסד".
 */
const tallyOf = (A, B) => {
  const rec = A.stats?.duelRecord?.[B.id];
  if (!rec || rec.games < 2) return null;
  const bWins = Math.max(0, rec.games - rec.wins - rec.ties);
  const parts = [`${A.name} ${rec.wins}`, `${B.name} ${bWins}`];
  if (rec.ties) parts.push(`תיקו ${rec.ties}`);
  return { text: parts.join(' · '), games: rec.games };
};

/**
 * סיכום האתגר: חוגג את שני השחקנים. למנצח גביע (בלי בונוס כוכבים), ותיקו = שניהם ניצחו.
 * המילה "הפסד" לא מופיעה – מי שלא ניצח מקבל "איזה קרב!".
 */
export default function DuelSummary({ players, result, onPlayAgain, onHome }) {
  const [A, B] = players;
  const sOf = (p) => result.perPlayer[p.id] || EMPTY;
  const ca = sOf(A).correct;
  const cb = sOf(B).correct;
  const tie = ca === cb;
  const W = ca > cb ? A : B;
  const L = W === A ? B : A;
  const bothF = A.gender === 'f' && B.gender === 'f';
  const isWinner = (p) => tie || p.id === W.id;
  const { speak, speaking, supported } = useSpeech();
  const headingRef = useRef(null);
  const tally = tallyOf(A, B);
  const [ready, setReady] = useState(false);
  const locked = (fn) => () => (ready ? fn?.() : undefined);

  // מדבקות חדשות; "קרב ראשון" תמיד ראשונה – זה הרגע שלה (גם אם באותו משחק התקבלה גם "צעד ראשון")
  const freshOf = (p) =>
    p.stickers
      .filter((id) => !(result.startStickers[p.id] || []).includes(id))
      .sort((a, b) => (b === 'first-duel') - (a === 'first-duel'))
      .map((id) => stickerById[id])
      .filter(Boolean);
  const anyFresh = players.some((p) => freshOf(p).length > 0);

  const title = tie ? `תיקו – ${bothF ? 'שתיכן ניצחתן' : 'שניכם ניצחתם'}!` : `${W.name} ${g(W, 'ניצח', 'ניצחה')}!`;
  let sub;
  // "היה ממש צמוד" רק כשבאמת היה צמוד: הפרש של תשובה אחת, ולפחות 3 תשובות נכונות ביחד (לא 0–1)
  if (!tie) sub = Math.abs(ca - cb) <= 1 && ca + cb >= 3 ? `${L.name} – היה ממש צמוד! 💪` : `${L.name} – איזה קרב! 💪`;
  else if (ca === 0) sub = `${bothF ? 'למדתן' : 'למדתם'} ${sOf(A).answered + sOf(B).answered} עובדות חדשות ביחד 💡`;
  else sub = `${ca === 1 ? 'תשובה נכונה אחת' : `${ca} תשובות נכונות`} ${bothF ? 'לכל אחת' : 'לכל אחד'} – ${bothF ? 'אלופות' : 'אלופים'}!`;

  const readSummary = () =>
    speak(
      [
        title,
        ...(tie ? [sub] : [`${A.name}: ${correctText(ca)}. ${B.name}: ${correctText(cb)}.`, sub.replace(' 💪', '')]),
        tally ? `המאזן שלכם: ${tally.text.replaceAll(' · ', ', ')}.` : '',
        ...players.flatMap((p) => freshOf(p).map((s) => `${p.name} ${g(p, 'קיבל', 'קיבלה')} מדבקה חדשה: ${stickerTitle(s, p)}!`)),
      ].filter(Boolean),
      { rate: 0.9 },
    );

  useEffect(() => {
    const unlock = setTimeout(() => setReady(true), LOCK_MS);
    playFanfare();
    // חוגגים תמיד – שני השחקנים ראויים לחגיגה
    const stop = summaryCelebrate(1500);
    const t = anyFresh ? setTimeout(playUnlock, 600) : null;
    if (players.some((p) => p.autoRead)) readSummary();
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    return () => {
      clearTimeout(unlock);
      clearTimeout(t);
      stop?.();
      clearConfetti();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-3">
      <div className="card relative z-10 overflow-hidden text-center animate-slide-up">
        <div className="relative bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200 px-5 pb-6 pt-8 text-slate-900 short:pb-3 short:pt-4">
          {supported && (
            <button
              type="button"
              onClick={readSummary}
              className="icon-btn absolute left-3 top-3 z-10 h-12 w-12 bg-white/90 text-sky-700"
              aria-label={speaking ? 'מקריא…' : 'הקראת הסיכום'}
            >
              {speaking ? <SpeakingBars /> : <Volume2 size={24} />}
            </button>
          )}
          <div className={`pointer-events-none mx-auto w-fit animate-pop ${tie ? 'text-6xl short:text-4xl' : 'text-7xl short:text-5xl'}`} aria-hidden="true">
            {tie ? '🏆🏆' : '🏆'}
          </div>
          <h1 ref={headingRef} tabIndex={-1} className="mt-2 break-words text-3xl font-bold focus:outline-none min-[360px]:text-4xl sm:text-5xl short:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-xl font-medium">{sub}</p>
          {tally && (
            <p className="mx-auto mt-3 w-fit max-w-full rounded-full bg-white/80 px-4 py-1 text-base font-bold text-slate-700">
              <span className="sr-only">המאזן שלכם אחרי {tally.games} אתגרים: </span>
              <span aria-hidden="true">⚔️ המאזן: </span>
              <bdi>{tally.text}</bdi>
            </p>
          )}
        </div>

        <div className="px-4 pb-8 pt-6 sm:px-8">
          <ul className="grid grid-cols-2 gap-3">
            {players.map((p, i) => {
              const t = getTheme(p.theme);
              const s = sOf(p);
              const win = isWinner(p);
              const fresh = freshOf(p);
              const line = tie ? `🏆 ${g(p, 'אלוף', 'אלופה')}` : win ? `🏆 ${g(p, 'המנצח', 'המנצחת')}` : `⚔️ ${g(p, 'לוחם אמיץ', 'לוחמת אמיצה')}`;
              return (
                <li
                  key={p.id}
                  className={`relative flex min-w-0 flex-col items-center rounded-3xl border-4 p-3 pt-4 animate-slide-up ${win ? 'border-amber-400 bg-amber-50' : `${t.border} ${t.soft}`}`}
                  style={{ animationDelay: `${300 + i * 150}ms` }}
                >
                  {win && (
                    <span
                      className="absolute -top-3 -end-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-3xl shadow-pop-sm ring-4 ring-white animate-pop"
                      style={{ animationDelay: '500ms' }}
                      aria-hidden="true"
                    >
                      🏆
                    </span>
                  )}
                  <Avatar avatar={p.avatar} theme={p.theme} size="md" decorative className="short:hidden" />
                  <div className={`mt-2 max-w-full break-words text-xl font-bold leading-tight short:mt-0 ${t.text}`}>{p.name}</div>
                  <div className="text-base font-bold text-slate-700">{line}</div>
                  {!tie && !win && <div className="text-sm text-slate-600">{g(p, 'נלחם', 'נלחמה')} עד השאלה האחרונה</div>}
                  {s.correct > 0 ? (
                    <>
                      <div className="mt-2 text-4xl font-black text-slate-800">
                        <bdi dir="ltr">
                          {s.correct}/{s.answered}
                        </bdi>
                      </div>
                      <div className="text-sm font-bold text-slate-600">תשובות נכונות</div>
                    </>
                  ) : (
                    <div className="mt-2 text-lg font-bold text-sky-800">💡 {s.answered} עובדות חדשות</div>
                  )}
                  {s.stars > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-base font-black text-amber-700 shadow-sm">
                      <Star size={18} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                      <span aria-hidden="true">
                        <bdi dir="ltr">+{s.stars}</bdi>
                      </span>
                      <span className="sr-only">{s.stars} כוכבים</span>
                    </div>
                  )}
                  {fresh.length > 0 && (
                    // הכרטיס צר בטלפון – המדבקה מעל השם שלה, ולא בשורה אחת
                    <div className="mt-2 flex w-full flex-col items-center gap-1">
                      <span className="flex w-full max-w-[11rem] flex-col items-center gap-1 rounded-2xl bg-white px-2 py-1.5 text-center text-sm font-bold leading-tight text-slate-700 shadow-sm animate-pop sm:flex-row sm:text-start">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${fresh[0].color} text-base`} aria-hidden="true">
                          {fresh[0].emoji}
                        </span>
                        <span>
                          🎁 מדבקה חדשה:
                          <br />
                          {stickerTitle(fresh[0], p)}
                        </span>
                      </span>
                      {fresh.length > 1 && <span className="text-sm font-bold text-slate-600">ועוד {fresh.length - 1}</span>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <MissedList missed={result.missed || []} title="💡 מה למדנו היום" collapsed className="mt-6" />
        </div>
      </div>

      <ActionBar>
        <button type="button" onClick={locked(onPlayAgain)} aria-disabled={!ready} className="btn flex-1 bg-gradient-to-l from-orange-700 to-rose-700 py-3 text-lg text-white">
          <RotateCcw size={22} />
          ⚔️ משחק חוזר
        </button>
        <button type="button" onClick={locked(onHome)} aria-disabled={!ready} className="btn btn-white">
          <Home size={22} />
          דף הבית
        </button>
      </ActionBar>
    </main>
  );
}
