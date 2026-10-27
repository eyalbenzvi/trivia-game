import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, children, label, className = '', dismissible = true }) {
  useEffect(() => {
    if (!open || !dismissible) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, dismissible]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-sm animate-fade-in sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={dismissible ? onClose : undefined}
    >
      <div
        className={`relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white shadow-2xl animate-slide-up ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {dismissible && onClose && (
          <button type="button" onClick={onClose} className="icon-btn absolute left-3 top-3 z-10 h-10 w-10" aria-label="סגירה">
            <X size={22} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
