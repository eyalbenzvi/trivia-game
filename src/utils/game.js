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
 * בניית סבב של 10 שאלות מתוך המאגר של רמת הקושי.
 * שאלות שהשחקן עוד לא ראה מקבלות עדיפות, וכל שאלה בסבב היא מנושא אחר –
 * כך כל משחק מגוון ושאלות לא חוזרות עד שכל המאגר נגמר.
 */
export const buildRound = (pool, seen = [], count = QUESTIONS_PER_ROUND) => {
  const seenSet = new Set(seen);
  const pickSpread = (questions, n) => {
    const byCategory = new Map();
    shuffle(questions).forEach((q) => {
      if (!byCategory.has(q.category)) byCategory.set(q.category, []);
      byCategory.get(q.category).push(q);
    });
    const picked = [];
    // סבבים: בכל סבב לוקחים שאלה אחת מכל נושא, בסדר נושאים אקראי
    while (picked.length < n && byCategory.size) {
      for (const cat of shuffle([...byCategory.keys()])) {
        if (picked.length >= n) break;
        const list = byCategory.get(cat);
        picked.push(list.pop());
        if (!list.length) byCategory.delete(cat);
      }
    }
    return picked;
  };
  const fresh = pickSpread(pool.filter((q) => !seenSet.has(q.id)), count);
  const rest = fresh.length < count ? pickSpread(pool.filter((q) => seenSet.has(q.id)), count - fresh.length) : [];
  return shuffle([...fresh, ...rest]).map(shuffleOptions);
};

// מזהי השאלות של כל מאגר (נשמר לכל מערך מאגר, כדי לא לבנות מחדש בכל תשובה)
const poolIdCache = new WeakMap();
const idsOf = (pool) => {
  let ids = poolIdCache.get(pool);
  if (!ids) poolIdCache.set(pool, (ids = new Set(pool.map((q) => q.id))));
  return ids;
};

/**
 * עדכון רשימת השאלות שנראו. כשכל המאגר של הרמה הנוכחית נראה – מתחילים מחדש רק אותו.
 * הרשימה כוללת גם שאלות מרמות אחרות (ושאלות שנמחקו), ולכן סופרים רק את מה ששייך למאגר.
 */
export const markSeen = (pool, seen, id) => {
  const ids = idsOf(pool);
  const next = seen.includes(id) ? seen : [...seen, id];
  const seenInPool = next.reduce((n, x) => n + (ids.has(x) ? 1 : 0), 0);
  return ids.size && seenInPool >= ids.size ? [...next.filter((x) => !ids.has(x)), id] : next;
};

export const starsForAnswer = (correct, streakAfter) =>
  correct ? STARS_PER_CORRECT + (streakAfter >= STREAK_BONUS_FROM ? STREAK_BONUS : 0) : 0;

/** משפט שמקריאים לשאלה: השאלה ואז התשובות ("... או ...") */
export const speechForQuestion = (q) => {
  const opts = q.options;
  const optionsText = opts.length > 1 ? `${opts.slice(0, -1).join(', ')}, או ${opts[opts.length - 1]}?` : opts[0];
  return [q.question, optionsText];
};
