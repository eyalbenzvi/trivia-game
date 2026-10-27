import { questionBank } from '../data/questions';

export const QUESTIONS_PER_ROUND = 10;
export const STARS_PER_CORRECT = 10;
export const STREAK_BONUS = 5; // בונוס לכל תשובה נכונה מהשלישית ברצף ואילך
export const STREAK_BONUS_FROM = 3;

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** ערבוב סדר התשובות תוך שמירה על התשובה הנכונה והאימוג'ים */
const shuffleOptions = (q) => {
  const order = shuffle(q.options.map((_, i) => i));
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    optionEmojis: q.optionEmojis ? order.map((i) => q.optionEmojis[i]) : undefined,
    correctIndex: order.indexOf(q.correctIndex),
  };
};

/**
 * בניית סבב של 10 שאלות. שאלות שהשחקן עוד לא ראה מקבלות עדיפות,
 * כך שהמאגר "מתגלגל" ולא חוזרות כל הזמן אותן שאלות.
 */
export const buildRound = (difficulty, seen = [], count = QUESTIONS_PER_ROUND) => {
  const pool = questionBank[difficulty] || questionBank.medium;
  const seenSet = new Set(seen);
  const fresh = shuffle(pool.filter((q) => !seenSet.has(q.id)));
  const old = shuffle(pool.filter((q) => seenSet.has(q.id)));
  return [...fresh, ...old].slice(0, Math.min(count, pool.length)).map(shuffleOptions);
};

/** עדכון רשימת השאלות שנראו. כשכל המאגר נראה – מתחילים מחדש */
export const markSeen = (difficulty, seen, id) => {
  const pool = questionBank[difficulty] || [];
  const next = seen.includes(id) ? seen : [...seen, id];
  return next.length >= pool.length ? [id] : next;
};

export const starsForAnswer = (correct, streakAfter) =>
  correct ? STARS_PER_CORRECT + (streakAfter >= STREAK_BONUS_FROM ? STREAK_BONUS : 0) : 0;

/** משפט שמקריאים לשאלה: השאלה ואז התשובות ("... או ...") */
export const speechForQuestion = (q) => {
  const opts = q.options;
  const optionsText = opts.length > 1 ? `${opts.slice(0, -1).join(', ')}, או ${opts[opts.length - 1]}?` : opts[0];
  return [q.question, optionsText];
};
