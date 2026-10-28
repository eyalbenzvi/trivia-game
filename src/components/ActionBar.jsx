/**
 * פס כפתורים קבוע בתחתית מסכי הסיכום – "שחק שוב" ו"דף הבית" תמיד זמינים בלי לגלול.
 * העמוד צריך ריפוד תחתון (pb-28) כדי שהפס לא יסתיר תוכן.
 */
export default function ActionBar({ children }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl gap-3">{children}</div>
    </div>
  );
}
