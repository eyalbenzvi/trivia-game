// קוד ההורים לאיפוס ולמחיקה של שחקן.
// הקוד עצמו לא נשמר בשום מקום (לא בקוד, לא באתר ולא בענן) – רק "טביעת אצבע" שלו:
// PBKDF2-SHA256 עם מלח ו־600,000 סבבים. בדיקה אחת לוקחת שבריר שנייה, אבל ניחוש של כל
// 10,000 האפשרויות מתוך קוד האתר דורש עבודה ממושכת – ובמשחק עצמו יש גם נעילה אחרי כמה טעויות.
// להחלפת הקוד: node -e "…pbkdf2Sync(code, salt, 600000, 32, 'sha256')…" עם מלח חדש, ולעדכן את שני הערכים.
const SALT_HEX = '553103fe698d3954b6114c05dbbde4d2';
const HASH_HEX = '7bf08c3052c2d38ee1a85b48d383a8363c6306ac96bfd297ed1622a5b7f69f57';
const ITERATIONS = 600000;

export const PARENT_CODE_LENGTH = 4;

const fromHex = (hex) => new Uint8Array(hex.match(/../g).map((b) => parseInt(b, 16)));
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** האם הקוד נכון (מחזיר Promise<boolean>) */
export const checkParentCode = async (code) => {
  if (!/^\d{4}$/.test(code) || !window.crypto?.subtle) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromHex(SALT_HEX), iterations: ITERATIONS, hash: 'SHA-256' }, key, 256);
  return toHex(bits) === HASH_HEX;
};

// נעילה אחרי טעויות חוזרות (נשמרת במכשיר, כדי שרענון הדף לא יאפס אותה)
const LOCK_KEY = 'family-trivia:parent-lock';
const MAX_TRIES = 3;
const LOCK_MS = 60 * 1000;

const readLock = () => {
  try {
    const v = JSON.parse(localStorage.getItem(LOCK_KEY) || '{}');
    return { fails: Number(v.fails) || 0, until: Number(v.until) || 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
};
const writeLock = (v) => {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(v));
  } catch {
    // אין גישה לאחסון – הנעילה תחזיק רק עד רענון
  }
};

/** כמה מילישניות נשארו לנעילה (0 = אפשר לנסות) */
export const lockRemaining = () => Math.max(0, readLock().until - Date.now());

/** רושם ניסיון: הצלחה מאפסת, טעות שלישית נועלת לדקה. מחזיר כמה ניסיונות נשארו */
export const recordAttempt = (ok) => {
  if (ok) {
    writeLock({ fails: 0, until: 0 });
    return MAX_TRIES;
  }
  const fails = readLock().fails + 1;
  if (fails >= MAX_TRIES) {
    writeLock({ fails: 0, until: Date.now() + LOCK_MS });
    return 0;
  }
  writeLock({ fails, until: 0 });
  return MAX_TRIES - fails;
};
