import { useCallback, useEffect, useState } from 'react';
import { loadQuestionBank } from '../data/questions';

// מתחילים לטעון כשהדפדפן פנוי (או בנגיעה הראשונה), כדי לא להאט את פתיחת המסך הראשון
const whenIdle = (fn) => {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cleanup();
    fn();
  };
  const idle = window.requestIdleCallback ? window.requestIdleCallback(run, { timeout: 1500 }) : null;
  const timer = idle == null ? setTimeout(run, 300) : null;
  window.addEventListener('pointerdown', run, true);
  window.addEventListener('keydown', run, true);
  function cleanup() {
    if (idle != null) window.cancelIdleCallback?.(idle);
    clearTimeout(timer);
    window.removeEventListener('pointerdown', run, true);
    window.removeEventListener('keydown', run, true);
  }
  return () => {
    done = true;
    cleanup();
  };
};

export function useQuestionBank() {
  const [bank, setBank] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const stop = whenIdle(() =>
      loadQuestionBank()
        .then((b) => alive && setBank(b))
        .catch(() => alive && setError(true)),
    );
    return () => {
      alive = false;
      stop();
    };
  }, []);

  // דפדפנים זוכרים import() שנכשל ולא מנסים שוב את אותה כתובת – רק טעינה מחדש של הדף עוזרת
  const retry = useCallback(() => window.location.reload(), []);

  return { bank, error, retry };
}
