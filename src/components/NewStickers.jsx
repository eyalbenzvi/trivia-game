import { stickerTitle } from '../data/stickers';

/**
 * מדבקות חדשות בסיכום: כמה מדבקות גדולות (big) והשאר "+N מדבקות".
 * כל הבלוק הוא כפתור שפותח את חדר הפרסים.
 * total – כמה מדבקות חדשות יש בסך הכול (גם כאלה שמוצגות במקום אחר, למשל המדבקה הראשונה בראש הסיכום)
 */
export default function NewStickers({ stickers, total = stickers.length, big = 1, onOpen, className = '' }) {
  if (!stickers.length) return null;
  const shown = stickers.slice(0, big);
  const rest = stickers.length - shown.length;
  const Tag = onOpen ? 'button' : 'div';
  return (
    <Tag
      {...(onOpen ? { type: 'button', onClick: onOpen, 'aria-label': `פתיחת חדר הפרסים – ${total === 1 ? 'מדבקה חדשה אחת' : `${total} מדבקות חדשות`}` } : {})}
      className={`flex w-full flex-wrap items-center justify-center gap-4 rounded-3xl bg-gradient-to-br from-violet-50 to-pink-50 p-4 ring-2 ring-violet-100 ${
        onOpen ? 'transition hover:ring-violet-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-700' : ''
      } ${className}`}
    >
      {shown.map((s, i) => (
        <span key={s.id} className="flex w-28 flex-col items-center animate-pop" style={{ animationDelay: `${900 + i * 200}ms` }}>
          <span
            className={`flex h-24 w-24 rotate-[-6deg] items-center justify-center rounded-full border-4 border-white bg-gradient-to-br ${s.color} text-5xl shadow-pop`}
            aria-hidden="true"
          >
            {s.emoji}
          </span>
          <span className="mt-2 font-bold leading-tight text-slate-700">{stickerTitle(s)}</span>
        </span>
      ))}
      {rest > 0 && (
        <span className="rounded-full bg-white px-4 py-2 text-lg font-black text-violet-700 shadow-pop-sm">+{rest} מדבקות</span>
      )}
      {onOpen && <span className="basis-full text-base font-bold text-violet-700">🏆 לחדר הפרסים ←</span>}
    </Tag>
  );
}
