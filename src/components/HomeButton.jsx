import { Home } from 'lucide-react';

/** כפתור "דף הבית" – באותו מקום ובאותו מראה בכל מסכי המשחק. מתחת לאייקון כתוב "בית", כדי שיהיה ברור מה הוא עושה */
export default function HomeButton({ onClick, className = '' }) {
  return (
    <button type="button" className={`icon-btn h-auto min-h-[2.75rem] flex-col gap-0 px-1 py-1 sm:h-auto sm:min-h-[3rem] ${className}`} onClick={onClick} aria-label="חזרה לדף הבית" title="דף הבית">
      <Home size={20} aria-hidden="true" />
      <span className="text-[0.7rem] font-bold leading-none" aria-hidden="true">
        בית
      </span>
    </button>
  );
}
