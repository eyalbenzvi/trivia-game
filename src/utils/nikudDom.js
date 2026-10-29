// ניקוד גלוי בכל האתר: כל טקסט עברי שמוצג בדף מקבל ניקוד מתוך מילוני הניקוד (utils/nikud.js).
// עובד על צמתי הטקסט עצמם (גם בחלונות, וגם כשהטקסט משתנה תוך כדי משחק), בלי לגעת בקוד של כל מסך.
// לא נוגעים בשדות קלט ובטקסט שהמשתמש כותב. כיבוי (לבדיקות): localStorage family-trivia:nikud = off
import { loadUiSay, onSayLoaded, vocalizeDisplay } from './nikud';

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'NOSCRIPT']);
const skipped = (node) => {
  for (let el = node.parentElement; el; el = el.parentElement) {
    if (SKIP.has(el.tagName) || el.isContentEditable || el.dataset?.noNikud !== undefined) return true;
  }
  return false;
};

// הטקסט המקורי של כל צומת, כדי להשלים את הניקוד כשנטען מילון נוסף (ולא להישאר עם ניקוד חלקי)
const original = new WeakMap();
const applied = new WeakMap();
const fix = (node) => {
  let text = node.nodeValue;
  if (!text || skipped(node)) return;
  if (applied.get(node) === text) text = original.get(node);
  else original.set(node, text);
  const next = vocalizeDisplay(text);
  applied.set(node, next);
  if (next !== node.nodeValue) node.nodeValue = next;
};

const scan = (root) => {
  if (root.nodeType === Node.TEXT_NODE) return fix(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) fix(n);
};

export const startNikudDom = () => {
  try {
    if (window.localStorage.getItem('family-trivia:nikud') === 'off') return;
  } catch {
    // אין גישה לאחסון – ממשיכים
  }
  loadUiSay();
  let queued = false;
  const pending = new Set();
  const flush = () => {
    queued = false;
    pending.forEach((n) => n.isConnected && scan(n));
    pending.clear();
  };
  const queue = (n) => {
    pending.add(n);
    if (!queued) {
      queued = true;
      requestAnimationFrame(flush);
    }
  };
  new MutationObserver((records) => {
    records.forEach((r) => {
      if (r.type === 'characterData') queue(r.target);
      else r.addedNodes.forEach(queue);
    });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  // מילון חדש נטען (למשל הניקוד של שאלות הנושא) – עוברים שוב על הדף
  onSayLoaded(() => queue(document.body));
  queue(document.body);
};
