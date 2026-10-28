import { poolFor } from '../data/questions';
import { kidCategoryNames } from '../data/categories';

export const QUESTIONS_PER_ROUND = 10;
export const STREAK_BONUS_FROM = 3;
// כוכבים לתשובה נכונה לפי רמה – שאלות קשות שוות יותר, כדי שההשוואה בין האחים תהיה הוגנת
export const STARS_BY_LEVEL = { easy: 10, medium: 12, hard: 15, expert: 15 };
export const starsPerCorrect = (difficulty) => STARS_BY_LEVEL[difficulty] ?? STARS_BY_LEVEL.medium;
// בונוס רצף = חצי מהכוכבים של תשובה (5 / 6 / 8 / 8), מהתשובה השלישית ברצף ואילך
export const streakBonus = (difficulty) => Math.round(starsPerCorrect(difficulty) / 2);
// "שאלת אלוף" (מהרמה שמעל) שווה 30 כוכבים, "שאלת חזרה" נותנת עוד 5
export const CHAMPION_STARS = 30;
export const REVIEW_BONUS = 5;
export const REVIEW_MAX = 20;
export const BONUS_TOPIC_QUESTIONS = 3;
// הרמה שממנה מגיעה "שאלת אלוף"
export const championLevel = { medium: 'hard', hard: 'expert' };
export const nextLevel = { easy: 'medium', medium: 'hard', hard: 'expert' };
export const prevLevel = { medium: 'easy', hard: 'medium', expert: 'hard' };

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const kidPoolCache = new WeakMap();
// מתחת למספר הזה מעדיפים את כל המאגר (למשל אם נושאי הילדים עוד לא נטענו)
const MIN_KID_POOL = 200;

/**
 * מאגר השאלות למשחק לפי רמה. ברמה הקלה (גילאי 5–6) – רק נושאים שמתאימים לילדים קטנים.
 * התוצאה נשמרת, כך שאותו מערך חוזר בכל פעם (markSeen נשען על זה).
 */
export const gamePool = (bank, difficulty) => {
  const pool = poolFor(bank, difficulty);
  if (difficulty !== 'easy') return pool;
  let kids = kidPoolCache.get(pool);
  if (!kids) {
    kids = pool.filter((q) => kidCategoryNames.has(q.category));
    if (kids.length < MIN_KID_POOL) kids = pool;
    kidPoolCache.set(pool, kids);
  }
  return kids;
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
 * בניית סבב של שאלות מתוך המאגר של רמת הקושי.
 * שאלות שהשחקן עוד לא ראה מקבלות עדיפות, וכל שאלה בסבב היא מנושא אחר –
 * כך כל משחק מגוון ושאלות לא חוזרות עד שכל המאגר נגמר.
 * focusCategory – "סבב בונוס": 3 שאלות מהנושא שנבחר (מסומנות bonus) ועוד שאלות מנושאים אחרים.
 */
export const buildRound = (pool, seen = [], count = QUESTIONS_PER_ROUND, { focusCategory } = {}) => {
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
  // בסבב בונוס לוקחים רק שאלות שעוד לא נענו בנושא; אם אין מספיק – שאר הסבב משלים מנושאים אחרים
  const focused = focusCategory
    ? shuffle(pool.filter((q) => q.category === focusCategory && !seenSet.has(q.id)))
        .slice(0, Math.min(BONUS_TOPIC_QUESTIONS, count))
        .map((q) => ({ ...q, bonus: true }))
    : [];
  const others = focusCategory ? pool.filter((q) => q.category !== focusCategory) : pool;
  const need = count - focused.length;
  const fresh = pickSpread(others.filter((q) => !seenSet.has(q.id)), need);
  // כשאין מספיק שאלות חדשות – קודם שאלות חדשות נוספות מנושא הבונוס, ורק אז שאלות שכבר נענו
  const taken = new Set([...focused, ...fresh].map((q) => q.id));
  const unseenLeft = pool.filter((q) => !seenSet.has(q.id) && !taken.has(q.id));
  const extra = fresh.length < need ? shuffle(unseenLeft).slice(0, need - fresh.length) : [];
  const short = need - fresh.length - extra.length;
  const rest = short > 0 ? pickSpread(others.filter((q) => seenSet.has(q.id)), short) : [];
  return shuffle([...focused, ...fresh, ...extra, ...rest]).map(shuffleOptions);
};

/** 3 נושאים אקראיים לבחירת "סבב בונוס" (רק נושאים שיש בהם מספיק שאלות שהשחקן עוד לא ענה עליהן) */
export const topicChoices = (pool, n = 3, seen = []) => {
  const seenSet = new Set(seen);
  const counts = new Map();
  pool.forEach((q) => !seenSet.has(q.id) && counts.set(q.category, (counts.get(q.category) || 0) + 1));
  return shuffle([...counts.keys()].filter((c) => counts.get(c) >= BONUS_TOPIC_QUESTIONS * 2)).slice(0, n);
};

// "טריוויה לפי נושא": הרמה של השחקן, ואם צריך עוד שאלות בנושא – גם מהרמות הסמוכות (לא מהרמה הקלה, שבנויה לקטנים)
const TOPIC_LEVELS = { easy: ['easy'], medium: ['medium', 'hard'], hard: ['hard', 'medium', 'expert'], expert: ['expert', 'hard'] };
const topicQuestions = (bank, difficulty, category) =>
  (TOPIC_LEVELS[difficulty] || [difficulty]).map((level) => (level === 'easy' ? gamePool(bank, 'easy') : bank[level] || []).filter((q) => q.category === category));

/** הנושאים שאפשר לשחק בהם (לפחות סבב אחד), וכמה שאלות חדשות נשארו בכל נושא */
export const topicList = (bank, player, names) => {
  const seenSet = new Set(player.stats.seen || []);
  return names
    .map((name) => {
      const all = topicQuestions(bank, player.difficulty, name).flat();
      return { name, total: all.length, fresh: all.filter((q) => !seenSet.has(q.id)).length };
    })
    .filter((t) => t.total >= QUESTIONS_PER_ROUND);
};

/** סבב של שאלות מנושא אחד: קודם שאלות חדשות מהרמה של השחקן, אחר כך מהרמות הסמוכות, ורק בסוף שאלות שכבר נענו */
export const buildTopicRound = (bank, player, category, count = QUESTIONS_PER_ROUND) => {
  const seenSet = new Set(player.stats.seen || []);
  const levels = topicQuestions(bank, player.difficulty, category);
  const fresh = levels.flatMap((qs) => shuffle(qs.filter((q) => !seenSet.has(q.id))));
  const seen = levels.flatMap((qs) => shuffle(qs.filter((q) => seenSet.has(q.id))));
  return shuffle([...fresh, ...seen].slice(0, count)).map(shuffleOptions);
};

/**
 * סבב מלא למשחק יחיד: סבב בונוס לפי הנושא שנבחר ו"שאלת אלוף" מהרמה שמעל כשאלה האחרונה.
 * שאלות שהשחקן כבר ענה עליהן לא חוזרות (גם לא שאלות שטעה בהן) עד שכל המאגר שלו נגמר.
 */
export const buildSoloRound = (bank, player, { focusCategory } = {}) => {
  const pool = gamePool(bank, player.difficulty);
  const seen = player.stats.seen || [];
  const round = buildRound(pool, seen, QUESTIONS_PER_ROUND, { focusCategory });
  const used = new Set(round.map((q) => q.id));

  // שאלת אלוף – השאלה האחרונה מגיעה מהרמה שמעל
  const up = championLevel[player.difficulty];
  if (up && round.length === QUESTIONS_PER_ROUND) {
    const upPool = gamePool(bank, up);
    if (upPool !== pool && upPool.length) {
      const [q] = buildRound(upPool.filter((x) => !used.has(x.id)), seen, 1);
      const slot = round.findIndex((x) => !x.bonus && !x.review);
      if (q && slot >= 0) {
        // מוציאים שאלה רגילה אחת, ושאלת האלוף תמיד אחרונה – שיא הסבב
        round.splice(slot, 1);
        round.push({ ...q, champion: true });
      }
    }
  }
  return round;
};

/**
 * רשימת התורות למשחק משפחתי: כל שחקן בתורו מקבל שאלה ברמה שלו.
 * אף שאלה לא חוזרת פעמיים באותו משחק (גם כששני שחקנים באותה רמה).
 * בסוף – "שאלת בוס" משותפת לכל המשפחה (רמה בינונית, נושאים שמתאימים גם לקטנים).
 */
export const buildTurns = (players, bank, rounds) => {
  const used = new Set();
  const lists = players.map((p) => {
    const full = gamePool(bank, p.difficulty);
    const pool = full.filter((q) => !used.has(q.id));
    const list = buildRound(pool.length >= rounds ? pool : full, p.stats.seen, rounds);
    list.forEach((q) => used.add(q.id));
    return list;
  });
  const turns = [];
  for (let r = 0; r < rounds; r += 1) {
    players.forEach((p, i) => {
      if (lists[i][r]) turns.push({ playerId: p.id, question: lists[i][r] });
    });
  }
  const medium = poolFor(bank, 'medium');
  const bossPool = medium.filter((q) => kidCategoryNames.has(q.category) && !used.has(q.id));
  const seenByAll = players.flatMap((p) => p.stats.seen || []);
  const [boss] = buildRound(bossPool.length ? bossPool : medium, seenByAll, 1);
  if (boss && turns.length) turns.push({ boss: true, question: boss });
  return turns;
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

/** עדכון רשימת "שאלות חזרה": טעות מוסיפה, תשובה נכונה לשאלת חזרה מוציאה */
export const updateReview = (review = [], id, correct) => {
  const without = review.filter((x) => x !== id);
  return correct ? without : [...without, id].slice(-REVIEW_MAX);
};

/**
 * כמה כוכבים שווה תשובה. streakAfter – הרצף של השחקן אחרי התשובה.
 * flags: bonus (סבב בונוס ×2), champion (שאלת אלוף – 30), review (+5)
 */
export const starsForAnswer = (correct, streakAfter, difficulty, { bonus, champion, review } = {}) => {
  if (!correct) return 0;
  if (champion) return CHAMPION_STARS;
  const base = starsPerCorrect(difficulty) + (streakAfter >= STREAK_BONUS_FROM ? streakBonus(difficulty) : 0);
  return base * (bonus ? 2 : 1) + (review ? REVIEW_BONUS : 0);
};

/** משפט שמקריאים לשאלה: השאלה ואז התשובות ("... או ...") */
export const speechForQuestion = (q) => {
  const opts = q.options;
  const optionsText = opts.length > 1 ? `${opts.slice(0, -1).join(', ')}, או ${opts[opts.length - 1]}?` : opts[0];
  return [q.question, optionsText];
};

// שעון לכמה זמן לוקח משחק משפחתי (בערך 40 שניות לשאלה)
export const estimateMinutes = (questions) => Math.max(1, Math.round((questions * 40) / 60));
