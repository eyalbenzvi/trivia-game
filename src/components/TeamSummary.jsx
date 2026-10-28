import { useEffect } from 'react';
import { Home, RotateCcw, Star, Volume2 } from 'lucide-react';
import Avatar from './Avatar';
import MissionTrack from './MissionTrack';
import { useSpeech } from '../hooks/useSpeech';
import { getTheme } from '../data/themes';
import { g } from '../data/profiles';
import { MEDALS, medalsFor, missionHeadline, teamMilestones } from '../data/missions';
import { stickerById, stickerTitle } from '../data/stickers';
import { celebrate, clearConfetti, starBurst } from '../utils/confetti';
import { playFanfare, playMedal } from '../utils/sound';
import HomeButton from './HomeButton';

/**
 * תואר חיובי לכל שחקן לפי הרגע הכי טוב שלו – בלי השוואת מספרים בין האחים.
 * כל תואר ניתן לשחקן אחד, וכל שחקן מקבל תואר (יש תארים שתמיד מתאימים).
 */
const titleDefs = (mission) => [
  { emoji: '🎯', m: 'הצלף', f: 'הצלפית', line: (p) => g(p, 'הכי מדויק בצוות', 'הכי מדויקת בצוות'), ok: (s) => s.correct > 0, score: (s) => s.correct / Math.max(1, s.answered) },
  { emoji: '🔥', m: 'מצית הרצף', f: 'מציתת הרצף', line: () => 'הרצף הכי ארוך במשימה', ok: (s) => s.bestStreak >= 2, score: (s) => s.bestStreak },
  { emoji: '🦸', m: 'המציל', f: 'המצילה', line: (p) => g(p, 'ענה נכון בדיוק כשהצוות היה צריך', 'ענתה נכון בדיוק כשהצוות היה צריך'), ok: (s) => s.rescues > 0, score: (s) => s.rescues },
  { emoji: mission.mover, m: 'מנוע הצוות', f: 'מנוע הצוות', line: (p) => `${g(p, 'עזר', 'עזרה')} ${mission.toMover} להתקדם`, ok: (s) => s.correct > 0, score: (s) => s.correct },
  { emoji: '💡', m: 'הלומד', f: 'הלומדת', line: (p) => g(p, 'למד הכי הרבה עובדות חדשות', 'למדה הכי הרבה עובדות חדשות'), ok: (s) => s.answered > s.correct, score: (s) => s.answered - s.correct },
  { emoji: '💪', m: 'לב הצוות', f: 'לב הצוות', line: (p) => g(p, 'השתתף במשימה בכל הכוח', 'השתתפה במשימה בכל הכוח'), ok: () => true, score: () => 0 },
  { emoji: '🤝', m: 'רוח הצוות', f: 'רוח הצוות', line: () => 'בלי זה אין צוות!', ok: () => true, score: () => 0 },
  { emoji: '📣', m: 'המעודד הראשי', f: 'המעודדת הראשית', line: (p) => g(p, 'עודד את כולם עד הסוף', 'עודדה את כולם עד הסוף'), ok: () => true, score: () => 0 },
];

const assignTitles = (players, perPlayer, mission) => {
  const defs = titleDefs(mission);
  const result = {};
  const left = new Set(players.map((p) => p.id));
  const statsOf = (id) => perPlayer[id] || { correct: 0, answered: 0, bestStreak: 0, rescues: 0 };
  defs.forEach((d) => {
    let best = null;
    players.forEach((p) => {
      if (!left.has(p.id) || !d.ok(statsOf(p.id))) return;
      if (!best || d.score(statsOf(p.id)) > d.score(statsOf(best.id))) best = p;
    });
    if (best) {
      result[best.id] = d;
      left.delete(best.id);
    }
  });
  // משפחה גדולה במיוחד – חוזרים על התארים הכלליים
  [...left].forEach((id, i) => {
    result[id] = defs[defs.length - 3 + (i % 3)];
  });
  return result;
};

export default function TeamSummary({ players, result, onPlayAgain, onHome }) {
  const { mission } = result;
  const medals = medalsFor(result.correct, result.total);
  const headline = missionHeadline(mission, medals);
  const m = teamMilestones(result.total);
  const titles = assignTitles(players, result.perPlayer, mission);
  const { speak, speaking, supported } = useSpeech();
  const anyAutoRead = players.some((p) => p.autoRead);

  const readSummary = () =>
    speak(
      [
        headline,
        medals ? `קיבלנו ${medals === 1 ? 'מדליה אחת' : `${medals} מדליות`}!` : 'היה מעולה, ובפעם הבאה נגיע רחוק יותר.',
        ...players.map((p) => `${p.name}: ${g(p, titles[p.id].m, titles[p.id].f)}`),
      ],
      { rate: 0.9 },
    );

  useEffect(() => {
    playFanfare();
    let stop = null;
    if (medals >= 2) stop = celebrate(3000);
    else starBurst();
    const t = medals ? setTimeout(playMedal, 900) : null;
    if (anyAutoRead) readSummary();
    return () => {
      clearTimeout(t);
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
        <div className={`relative bg-gradient-to-br ${mission.color} px-6 pb-8 pt-8 text-white`}>
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
          <div className="pointer-events-none mx-auto w-fit text-7xl animate-pop" aria-hidden="true">
            {medals >= 2 ? mission.goal : mission.mover}
          </div>
          <h1 className="mt-2 text-3xl font-bold drop-shadow sm:text-5xl">{headline}</h1>
          <p className="mt-2 text-xl font-medium opacity-95">
            {medals >= 2 ? 'עבודת צוות מושלמת – כל הכבוד לכולם!' : medals === 1 ? 'התחלה יפה – בפעם הבאה נגיע עוד יותר רחוק!' : 'היה כיף לשחק ביחד!'}
          </p>
        </div>

        <div className="px-5 pb-8 pt-6 sm:px-8">
          <MissionTrack mission={mission} correct={result.correct} total={result.total} />

          {/* מדליות: ארד 50%, כסף 70% (היעד), זהב 90% */}
          <div className="mt-5 flex justify-center gap-2 min-[360px]:gap-3" aria-label={`${medals} מדליות`}>
            {MEDALS.map((md, i) => {
              const got = i < medals;
              const need = [m.bronze, m.silver, m.gold][i];
              return (
                <div
                  key={md.id}
                  className={`flex w-24 min-w-0 flex-col items-center rounded-3xl p-3 ${got ? 'bg-amber-50 animate-pop' : 'bg-slate-50'}`}
                  style={got ? { animationDelay: `${600 + i * 250}ms` } : undefined}
                >
                  <span className={`text-5xl ${got ? '' : 'opacity-30 grayscale'}`} aria-hidden="true">
                    {md.emoji}
                  </span>
                  <span className={`mt-1 text-sm font-bold ${got ? 'text-amber-800' : 'text-slate-500'}`}>{got ? md.label : `${need} נכונות`}</span>
                </div>
              );
            })}
          </div>

          {result.bossCorrect != null && (
            <p className="mt-4 font-bold text-slate-600">{result.bossCorrect ? '👾 ניצחנו את שאלת הבוס!' : '👾 שאלת הבוס הייתה קשוחה הפעם'}</p>
          )}
          <p className="mt-2 flex items-center justify-center gap-1 text-slate-600">
            <Star size={18} className="fill-amber-400 text-amber-400" />
            {result.stars} כוכבים נאספו במשימה
          </p>

          <h2 className="mb-3 mt-7 text-2xl font-bold text-slate-700">הצוות שלנו</h2>
          <ul className="space-y-3">
            {players.map((p, i) => {
              const fresh = p.stickers.filter((id) => !(result.startStickers[p.id] || []).includes(id)).map((id) => stickerById[id]).filter(Boolean);
              const t = getTheme(p.theme);
              const title = titles[p.id];
              return (
                <li
                  key={p.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-3xl border-2 ${t.border} ${t.soft} p-3 text-start animate-slide-up`}
                  style={{ animationDelay: `${300 + i * 150}ms` }}
                >
                  <Avatar avatar={p.avatar} theme={p.theme} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className={`break-words text-xl font-bold leading-tight ${t.text}`}>{p.name}</div>
                    <div className="font-bold text-slate-700">
                      {title.emoji} {g(p, title.m, title.f)}
                    </div>
                    <div className="text-sm text-slate-600">{title.line(p)}</div>
                  </div>
                  {fresh.length > 0 && (
                    // בטלפון צר המדבקות יורדות לשורה משלהן, כדי לא לדחוק שם ארוך
                    <div className="ms-auto flex shrink-0 flex-wrap justify-end gap-1 max-[420px]:basis-full" title="מדבקות חדשות">
                      {fresh.slice(0, 3).map((s) => (
                        <span
                          key={s.id}
                          title={stickerTitle(s)}
                          className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${s.color} text-2xl animate-pop`}
                        >
                          {s.emoji}
                        </span>
                      ))}
                      {fresh.length > 3 && (
                        <span className="self-center text-sm font-bold text-slate-600" dir="ltr">
                          +{fresh.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={onPlayAgain} className="btn bg-gradient-to-l from-violet-500 to-sky-500 py-4 text-xl text-white">
              <RotateCcw size={24} />
              עוד משימה
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
