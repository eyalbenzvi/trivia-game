// מסלול המשימה המשותפת: הדמות מתקדמת עם כל תשובה נכונה עד ליעד
export default function MissionTrack({ mission, correct, goal, compact = false }) {
  const pct = Math.min(100, Math.round((correct / goal) * 100));
  return (
    <div className={compact ? 'mt-2' : 'w-full'} aria-label={`${correct} מתוך ${goal} תשובות נכונות ליעד`}>
      <div className={`relative flex items-center ${compact ? 'h-7' : 'h-14'}`}>
        <span className={compact ? 'text-lg' : 'text-4xl'} aria-hidden="true">
          {mission.start}
        </span>
        <div className={`relative mx-2 flex-1 rounded-full bg-slate-200 ${compact ? 'h-3' : 'h-5'}`}>
          <div
            className={`absolute inset-y-0 right-0 rounded-full bg-gradient-to-l ${mission.color} transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
          <span
            className={`absolute top-1/2 -translate-y-1/2 translate-x-1/2 transition-all duration-700 ${compact ? 'text-xl' : 'text-4xl'}`}
            style={{ right: `${pct}%` }}
            aria-hidden="true"
          >
            {mission.mover}
          </span>
        </div>
        <span className={compact ? 'text-lg' : 'text-4xl'} aria-hidden="true">
          {mission.goal}
        </span>
      </div>
      {!compact && (
        <p className="mt-1 text-center text-sm font-bold text-slate-500">
          {Math.min(correct, goal)} מתוך {goal} תשובות נכונות
        </p>
      )}
    </div>
  );
}
