import { Home } from 'lucide-react';

/** כפתור "דף הבית" – באותו מקום ובאותו מראה בכל מסכי המשחק */
export default function HomeButton({ onClick, className = '' }) {
  return (
    <button type="button" className={`icon-btn ${className}`} onClick={onClick} aria-label="חזרה לדף הבית" title="דף הבית">
      <Home size={24} />
    </button>
  );
}
