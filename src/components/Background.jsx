// צורות צבעוניות שמרחפות ברקע
// בשוליים בלבד, חצי מחוץ למסך, ולא ברבע העליון – כדי שלא יתחרו בכותרת ובתמונות
const shapes = [
  { cls: 'top-[30%] -right-6 h-16 w-16 rounded-full bg-amber-200/70', delay: '0s' },
  { cls: 'top-[55%] -left-8 h-24 w-24 rounded-full bg-rose-200/60', delay: '1s' },
  { cls: 'bottom-24 -right-6 h-20 w-20 rounded-[2rem] rotate-12 bg-emerald-200/60', delay: '2s' },
  { cls: 'bottom-[30%] -left-4 h-10 w-10 rounded-full bg-violet-200/70', delay: '0.5s' },
];

export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {shapes.map((s) => (
        <div key={s.cls} className={`absolute animate-float ${s.cls}`} style={{ animationDelay: s.delay }} />
      ))}
      <div className="absolute -bottom-24 left-1/2 h-64 w-[140%] -translate-x-1/2 rounded-[50%] bg-emerald-100/60" />
    </div>
  );
}
