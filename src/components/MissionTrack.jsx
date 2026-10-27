import { MEDALS, teamMilestones } from '../data/missions';

/**
 * מסלול המשימה המשותפת: הדמות מתקדמת עם כל תשובה נכונה.
 * לאורך המסלול שלוש מדליות (50% / 70% / 90%) – כך יש מתח עד השאלה האחרונה.
 */
export default function MissionTrack({ mission, correct, total, compact = false }) {
  const m = teamMilestones(total);
  const marks = [m.bronze, m.silver, m.gold];
  const shown = Math.min(correct, total);
  const pct = total ? Math.min(100, Math.round((shown / total) * 100)) : 0;
  const next = marks.findIndex((n) => correct < n);
  const label =
    correct < m.silver
      ? `השגתם ${shown} מתוך ${m.silver} תשובות שצריך כדי להגיע ${mission.reach} ${mission.goal}`
      : correct < m.gold
        ? `הגעתם ${mission.reach}! עוד ${m.gold - correct} ל${mission.goldLabel} 🥇`
        : `${mission.goldLabel}! 🥇`;

  return (
    <div className={compact ? 'mt-1.5' : 'w-full'} role="img" aria-label={label}>
      <div className={`relative flex items-center ${compact ? 'h-7' : 'h-16 pb-5'}`}>
        <span className={compact ? 'text-lg' : 'text-4xl'} aria-hidden="true">
          {mission.start}
        </span>
        {/* padding-inline – כדי שהדמות לא תשב על אימוג'י ההתחלה */}
        <div className={`relative flex-1 ${compact ? 'mx-1 px-3' : 'mx-2 px-5'}`}>
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
                    <span className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 text-xl leading-none ${got ? '' : 'opacity-50'}`}>
                      {MEDALS[i].emoji}
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
        <span className={compact ? 'text-lg' : 'text-4xl'} aria-hidden="true">
          {mission.goal}
        </span>
        {compact && (
          <span className="ms-1.5 whitespace-nowrap text-sm font-black text-slate-500 tabular-nums" aria-hidden="true">
            {next >= 0 ? `${shown}/${marks[next]} ${MEDALS[next].emoji}` : '🥇'}
          </span>
        )}
      </div>
      {!compact && <p className="mt-1 text-center text-sm font-bold text-slate-600">{label}</p>}
    </div>
  );
}
