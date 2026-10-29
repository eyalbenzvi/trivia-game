import { poolFor } from '../data/questions';
import { kidCategoryNames } from '../data/categories';

export const QUESTIONS_PER_ROUND = 10;
export const STREAK_BONUS_FROM = 3;
// כוכבים לתשובה נכונה – אותו מספר בכל הרמות: כל אחד משחק ברמה שלו, ולכן האתגר שווה לכולם
export const STARS_BY_LEVEL = { easy: 10, medium: 10, hard: 10, expert: 10 };
export const starsPerCorrect = (difficulty) => STARS_BY_LEVEL[difficulty] ?? STARS_BY_LEVEL.medium;
// בונוס רצף = חצי מהכוכבים של תשובה, מהתשובה השלישית ברצף ואילך
export const streakBonus = (difficulty) => Math.round(starsPerCorrect(difficulty) / 2);
// שאלת הסיום של כל סבב ("שאלת אלוף" / "שאלת הפתעה") שווה 30 כוכבים
export const CHAMPION_STARS = 30;
// במרוץ: כוכבים קבועים לכל תשובה נכונה (בלי בונוס רצף), ובונוס על שיא חדש
export const RACE_STARS = 5;
export const RACE_RECORD_BONUS = 25;
// כמה טעויות אחרונות נשמרות ל"מחברת הטעויות"
export const REVIEW_MAX = 20;
// הרמה שממנה מגיעה שאלת הסיום: בינונית ומאתגרת – מהרמה שמעל; קלה ומומחה – מהרמה עצמה
export const championLevel = { easy: 'easy', medium: 'hard', hard: 'expert', expert: 'expert' };
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
    // שאלה יכולה לסמן בעצמה אם היא מתאימה לקטנים (kids), אחרת קובע הנושא
    kids = pool.filter((q) => q.kids === true || (q.kids !== false && kidCategoryNames.has(q.category)));
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
 */
export const buildRound = (pool, seen = [], count = QUESTIONS_PER_ROUND, { freshOnly = false } = {}) => {
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
  // קודם שאלות חדשות; רק כשכל המאגר נענה – שאלות שכבר נראו
  const fresh = pickSpread(pool.filter((q) => !seenSet.has(q.id)), count);
  // freshOnly: כשנשארו מעט שאלות חדשות – סבב קצר יותר, בלי לערבב שאלות שכבר נענו
  const rest = fresh.length < count && !(freshOnly && fresh.length) ? pickSpread(pool.filter((q) => seenSet.has(q.id)), count - fresh.length) : [];
  return shuffle([...fresh, ...rest]).map(shuffleOptions);
};

// "טריוויה לפי נושא": הרמה של השחקן, ואם צריך עוד שאלות בנושא – גם מהרמות הסמוכות (לא מהרמה הקלה, שבנויה לקטנים)
const TOPIC_LEVELS = { easy: ['easy'], medium: ['medium', 'hard'], hard: ['hard', 'medium', 'expert'], expert: ['expert', 'hard'] };
const topicQuestions = (bank, difficulty, category) =>
  (TOPIC_LEVELS[difficulty] || [difficulty]).map((level) => (level === 'easy' ? gamePool(bank, 'easy') : bank[level] || []).filter((q) => q.category === category));

/**
 * הנושאים שיש בהם מספיק שאלות לסבב, וכמה שאלות חדשות נשארו בכל אחד.
 * playable=false – השחקן כבר ענה כמעט על הכול בנושא (שאלות שנענו לא חוזרות).
 */
export const topicList = (bank, player, names) => {
  const seenSet = new Set(player.stats.seen || []);
  return names
    .map((name) => {
      const all = topicQuestions(bank, player.difficulty, name).flat();
      const fresh = all.filter((q) => !seenSet.has(q.id)).length;
      return { name, total: all.length, fresh, playable: fresh >= QUESTIONS_PER_ROUND };
    })
    .filter((t) => t.total >= QUESTIONS_PER_ROUND);
};

/** סבב של שאלות מנושא אחד: שאלות חדשות בלבד – קודם מהרמה של השחקן, ואחר כך מהרמות הסמוכות */
export const buildTopicRound = (bank, player, category, count = QUESTIONS_PER_ROUND) => {
  const seenSet = new Set(player.stats.seen || []);
  const levels = topicQuestions(bank, player.difficulty, category);
  const fresh = levels.flatMap((qs) => shuffle(qs.filter((q) => !seenSet.has(q.id))));
  return shuffle(fresh.slice(0, count)).map(shuffleOptions);
};

/**
 * סבב מלא למשחק יחיד. השאלה האחרונה היא שאלת סיום ששווה 30 כוכבים:
 * בינונית ומאתגרת – "שאלת אלוף" מהרמה שמעל; קלה – "שאלת הפתעה"; מומחה – "שאלת אלוף" מהרמה עצמה.
 * שאלות שהשחקן כבר ענה עליהן לא חוזרות (גם לא שאלות שטעה בהן) עד שכל המאגר שלו נגמר.
 */
export const buildSoloRound = (bank, player) => {
  const pool = gamePool(bank, player.difficulty);
  const seen = player.stats.seen || [];
  const round = buildRound(pool, seen, QUESTIONS_PER_ROUND, { freshOnly: true });
  if (round.length !== QUESTIONS_PER_ROUND) return round;
  const level = championLevel[player.difficulty];
  if (!level) return round;
  const finalPool = gamePool(bank, level);
  if (finalPool === pool) {
    // אותה רמה: השאלה האחרונה בסבב הופכת לשאלת הסיום
    round[round.length - 1] = { ...round[round.length - 1], champion: true };
    return round;
  }
  const used = new Set(round.map((q) => q.id));
  const [q] = buildRound(finalPool.filter((x) => !used.has(x.id)), seen, 1);
  if (q) {
    // מוציאים שאלה רגילה אחת, ושאלת הסיום תמיד אחרונה – שיא הסבב
    round.pop();
    round.push({ ...q, champion: true });
  }
  return round;
};

// סדר הרמות מהקלה לקשה – לבחירת רמת שאלת הבוס
const LEVEL_ORDER = ['easy', 'medium', 'hard', 'expert'];
// שאלת הבוס לא קשה יותר ממאתגרת – כולם מתייעצים, והיא צריכה להיות פתירה ביחד
const BOSS_MAX_LEVEL = 'hard';

/**
 * הרמה של שאלת הבוס: הרמה הגבוהה ביותר שמשחקת בצוות (כדי לאתגר גם את החזק ביותר), אבל לכל היותר מאתגרת.
 * ילד ברמה הקלה (עוד לא קורא) מקבל שאלת תמונות – ראו buildBoss.
 */
export const bossLevel = (players) => {
  const top = Math.max(0, ...players.map((p) => LEVEL_ORDER.indexOf(p.difficulty)));
  return LEVEL_ORDER[Math.min(top, LEVEL_ORDER.indexOf(BOSS_MAX_LEVEL))];
};

/**
 * שאלת הבוס. כשמשחק ילד ברמה הקלה – שאלת תמונות (רק לרמה הקלה יש תשובות בתמונות),
 * אבל מהשאלות הקלות שמחוץ למאגר של הקטנים (נושאים "של גדולים" או שסומנו kids:false):
 * הקטן עדיין רואה תמונות ויכול לבחור, והגדולים צריכים באמת לחשוב.
 * אחרת – מהרמה של bossLevel.
 */
const buildBoss = (players, bank, used, seenByAll) => {
  const visual = players.some((p) => p.difficulty === 'easy');
  let source;
  let preferred;
  if (visual) {
    source = poolFor(bank, 'easy');
    const kidIds = new Set(gamePool(bank, 'easy').map((q) => q.id));
    preferred = source.filter((q) => !kidIds.has(q.id));
  } else {
    source = poolFor(bank, bossLevel(players));
    preferred = source;
  }
  const fresh = (list) => list.filter((q) => !used.has(q.id));
  const candidates = [preferred, source].map(fresh).find((list) => list.length) || source;
  const [boss] = buildRound(candidates, seenByAll, 1);
  if (!boss) return null;
  return visual ? { ...boss, bossVisual: true } : boss;
};

/**
 * רשימת התורות למשחק משפחתי: כל שחקן בתורו מקבל שאלה ברמה שלו.
 * אף שאלה לא חוזרת פעמיים באותו משחק (גם כששני שחקנים באותה רמה).
 * בסוף – "שאלת בוס" משותפת לכל המשפחה (ראו buildBoss).
 * boss=false – בלי שאלת בוס (באתגר של שני שחקנים).
 */
export const buildTurns = (players, bank, rounds, { boss: withBoss = true } = {}) => {
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
  if (!withBoss || !turns.length) return turns;
  const seenByAll = players.flatMap((p) => p.stats.seen || []);
  const boss = buildBoss(players, bank, used, seenByAll);
  if (boss) turns.push({ boss: true, question: boss });
  return turns;
};

/**
 * שאלה חדשה (שהשחקן מעולם לא ראה) מהרמה שמתחת – אחרי כמה טעויות ברצף במשחק יחיד.
 * exclude – מזהי השאלות שכבר בסבב. מחזיר null אם אין רמה מתחת או שאין בה שאלה חדשה.
 */
export const easierFreshQuestion = (bank, player, exclude = []) => {
  const lower = prevLevel[player.difficulty];
  if (!lower) return null;
  const seenSet = new Set([...(player.stats.seen || []), ...exclude]);
  const fresh = gamePool(bank, lower).filter((q) => !seenSet.has(q.id));
  const [q] = buildRound(fresh, [], 1);
  return q || null;
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

/** עדכון "מחברת הטעויות": טעות מוסיפה את השאלה (לעיון בלבד – שאלות שנענו לא חוזרות למשחק) */
export const updateReview = (review = [], id, correct) => {
  const without = review.filter((x) => x !== id);
  return correct ? without : [...without, id].slice(-REVIEW_MAX);
};

/**
 * "בחרת: X" במחברת הטעויות: { [questionId]: התשובה שנבחרה }.
 * טעות רושמת את הבחירה, תשובה נכונה מוחקת אותה, ונשארים רק מזהים שעדיין במחברת (review).
 */
export const updateReviewPicks = (picks = {}, review = [], id, chosen, correct) => {
  const keep = new Set(review);
  const next = {};
  Object.entries(picks || {}).forEach(([k, v]) => {
    if (keep.has(k) && k !== id) next[k] = v;
  });
  if (!correct && keep.has(id)) next[id] = chosen;
  return next;
};

/**
 * כמה כוכבים שווה תשובה. streakAfter – הרצף של השחקן אחרי התשובה.
 * champion – שאלת הסיום (30 כוכבים).
 */
export const starsForAnswer = (correct, streakAfter, difficulty, { champion } = {}) => {
  if (!correct) return 0;
  if (champion) return CHAMPION_STARS;
  return starsPerCorrect(difficulty) + (streakAfter >= STREAK_BONUS_FROM ? streakBonus(difficulty) : 0);
};

// מרוץ: שאלות קצרות שמתאימות לקצב מהיר (בלי "למה/איך" ובלי שאלות ארוכות)
const isQuick = (q) => q.question.length < 80 && !/^(למה|איך|מדוע)/.test(q.question.trim());

/**
 * שאלות למרוץ: קודם שאלות קצרות חדשות, אחריהן שאלות חדשות אחרות.
 * שאלות שכבר נענו – רק כשאין בכלל שאלות חדשות ברמה.
 */
export const buildRaceRound = (pool, seen = [], count = 150) => {
  const seenSet = new Set(seen);
  const fresh = pool.filter((q) => !seenSet.has(q.id));
  if (!fresh.length) return buildRound(pool, [], count);
  const quick = buildRound(fresh.filter(isQuick), [], count);
  const others = quick.length < count ? buildRound(fresh.filter((q) => !isQuick(q)), [], count - quick.length) : [];
  return [...quick, ...others];
};

/** משפט שמקריאים לשאלה: השאלה ואז התשובות ("... או ...") */
export const speechForQuestion = (q) => {
  const opts = q.options;
  const optionsText = opts.length > 1 ? `${opts.slice(0, -1).join(', ')}, או ${opts[opts.length - 1]}?` : opts[0];
  return [q.question, optionsText];
};

// שעון לכמה זמן לוקח משחק משפחתי (בערך 40 שניות לשאלה)
export const estimateMinutes = (questions) => Math.max(1, Math.round((questions * 40) / 60));
