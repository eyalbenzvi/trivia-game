import { MEDALS, teamMilestones } from '../data/missions';

/**
 * מסלול המשימה המשותפת: הדמות מתקדמת עם כל תשובה נכונה.
 * לאורך המסלול שלוש מדליות (50% / 70% / 90%) – כך יש מתח עד השאלה האחרונה.
 * היעד של המשימה (🌕) מצויר בנקודת הכסף – שם "מגיעים"; מה שאחריו הוא אזור בונוס עד הזהב 🥇.
 */
export default function MissionTrack({ mission, correct, total, compact = false }) {
  const m = teamMilestones(total);
  const marks = [m.bronze, m.silver, m.gold];
  const shown = Math.min(correct, total);
  const pct = total ? Math.min(100, Math.round((shown / total) * 100)) : 0;
  const label =
    correct < m.silver
      ? `השגתם ${shown} מתוך ${m.silver} תשובות שצריך כדי להגיע ${mission.reach} ${mission.goal}`
      : correct < m.gold
        ? `הגעתם ${mission.reach}! עוד ${m.gold - correct} ל${mission.goldLabel} 🥇`
        : `${mission.goldLabel}! 🥇`;

  return (
    <div className="w-full" role="img" aria-label={label}>
      <div className={`relative flex items-center ${compact ? 'h-7' : 'h-16 pb-5'}`}>
        <span className={compact ? 'text-lg' : 'text-3xl min-[360px]:text-4xl'} aria-hidden="true">
          {mission.start}
        </span>
        {/* padding-inline – כדי שהדמות לא תשב על אימוג'י ההתחלה */}
        <div className={`relative flex-1 ${compact ? 'mx-1 px-3' : 'mx-1 px-4 min-[360px]:mx-2 min-[360px]:px-5'}`}>
          <div className={`relative rounded-full bg-slate-200 ${compact ? 'h-3' : 'h-5'}`}>
            <div
              className={`absolute inset-y-0 right-0 rounded-full bg-gradient-to-l ${mission.color} transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
            {marks.map((n, i) => {
              const at = `${Math.min(100, (n / total) * 100)}%`;
              const got = correct >= n;
              return (
                <span key={MEDALS[i].id} className="absolute top-1/2 -translate-y-1/2 translate-x-1/2" style={{ right: at }} aria-hidden="true">
                  <span className={`block rounded-full ${compact ? 'h-3 w-1' : 'h-5 w-1.5'} ${got ? 'bg-white/90' : 'bg-slate-400/70'}`} />
                  {!compact && (
                    <span className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 leading-none ${i === 1 ? 'text-2xl' : 'text-xl'} ${got ? '' : 'opacity-50'}`}>
                      {i === 1 ? mission.goal : MEDALS[i].emoji}
                    </span>
                  )}
                </span>
              );
            })}
            <span
              className={`absolute top-1/2 z-10 -translate-y-1/2 translate-x-1/2 transition-all duration-700 ${compact ? 'text-xl' : 'text-4xl'}`}
              style={{ right: `${pct}%` }}
              aria-hidden="true"
            >
              {mission.mover}
            </span>
          </div>
        </div>
        <span className={compact ? 'text-lg' : 'text-3xl min-[360px]:text-4xl'} aria-hidden="true">
          🥇
        </span>
        {compact && (
          // מספר אחד בכל מקום: עד היעד – x מתוך היעד; אחרי היעד – x מתוך הזהב
          <span className="ms-1.5 whitespace-nowrap text-sm font-black text-slate-500 tabular-nums" aria-hidden="true">
            {correct < m.silver ? `${shown}/${m.silver} ${mission.goal}` : correct < m.gold ? `${shown}/${m.gold} 🥇` : '🥇'}
          </span>
        )}
      </div>
      {!compact && <p className="mt-1 text-center text-sm font-bold text-slate-600">{label}</p>}
    </div>
  );
}
