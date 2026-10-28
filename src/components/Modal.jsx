import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// חלונות פתוחים, האחרון הוא העליון. כל מה שמתחת לחלון העליון (המסך וחלונות קודמים) מסומן inert.
// חלון שהמשתמש פתח (שאפשר לסגור) תמיד מעל חלון שנפתח לבד (כמו "הידעת?"), כמו ב-z-index שלהם
const stack = [];
const levelOf = (overlay) => Number(overlay.dataset.level);
const focusInside = (overlay) => (overlay.querySelector(FOCUSABLE) || overlay.firstElementChild)?.focus();
const syncInert = () => {
  document.getElementById('root')?.toggleAttribute('inert', stack.length > 0);
  stack.forEach((overlay, i) => overlay.toggleAttribute('inert', i < stack.length - 1));
};

export default function Modal({ open, onClose, children, label, className = '', dismissible = true }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  // onClose שמוגדר בתוך הקומפוננטה משתנה בכל ציור – לא רוצים שזה יפעיל מחדש את האפקט
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    const prevFocus = document.activeElement;
    const at = stack.findIndex((o) => levelOf(o) > levelOf(overlay));
    stack.splice(at < 0 ? stack.length : at, 0, overlay);
    syncInert();

    // פוקוס ראשוני בתוך החלון העליון (אם רכיב בפנים לא לקח אותו כבר עם autoFocus)
    const top = stack[stack.length - 1];
    if (!top.contains(document.activeElement)) focusInside(top);

    const onKey = (e) => {
      if (stack[stack.length - 1] !== overlay) return; // רק החלון העליון מגיב
      if (e.key === 'Escape') {
        // לא לתת למקשי המשחק להגיב לאותה לחיצה
        e.stopPropagation();
        if (dismissible && onCloseRef.current) {
          e.preventDefault();
          onCloseRef.current();
        }
        return;
      }
      if (e.key !== 'Tab') return;
      // מלכודת פוקוס: Tab מסתובב בתוך החלון בלבד
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (!items.length) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = panel.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);

    return () => {
      document.removeEventListener('keydown', onKey, true);
      const i = stack.indexOf(overlay);
      if (i >= 0) stack.splice(i, 1);
      overlay.removeAttribute('inert');
      syncInert();
      // מחזירים את הפוקוס למקום שבו היה לפני הפתיחה (אם לא עבר בינתיים למקום אחר)
      const active = document.activeElement;
      if (!active || active === document.body || panel.contains(active)) {
        const below = stack[stack.length - 1];
        if (prevFocus?.isConnected && (!below || below.contains(prevFocus))) prevFocus.focus?.();
        else if (below) focusInside(below);
      }
    };
  }, [open, dismissible]);

  if (!open) return null;
  return createPortal(
    <div
      ref={overlayRef}
      dir="rtl"
      lang="he"
      data-level={dismissible ? 1 : 0}
      className={`fixed inset-0 ${dismissible ? 'z-[60]' : 'z-50'} flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-sm animate-fade-in sm:items-center sm:p-6 short:items-center short:p-2`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={dismissible ? onClose : undefined}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`modal-panel relative w-full ${/\bmax-w-/.test(className) ? '' : 'max-w-lg'} overflow-y-auto rounded-[2rem] bg-white shadow-2xl animate-slide-up focus:outline-none ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {dismissible && onClose && (
          <button type="button" onClick={onClose} className="icon-btn absolute left-3 top-3 z-10 h-12 w-12" aria-label="סגירה">
            <X size={22} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
