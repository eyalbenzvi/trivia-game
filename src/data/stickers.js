import { categories, categoryByName } from './categories';
import { g } from './profiles';

// מדבקות ותגים. כל מדבקה מגדירה progress(stats, difficulty) שמחזירה {current, target}.
// חלק מהיעדים תלויים ברמת הקושי – כדי שזה יהיה הוגן בין עידו (קל) לרעות (מאתגר).
// חשוב: מזהי מדבקות קיימים לא משתנים, כדי שהתקדמות שמורה תישאר תקפה.

const LEVEL_SUFFIX = { easy: 'ברמה קלה', medium: 'ברמה בינונית', hard: 'ברמה מאתגרת', expert: 'ברמת מומחה' };
const byLevel = (map, difficulty) => map[difficulty] ?? map.medium;
const count = (n, one, many) => (n === 1 ? one : `${n} ${many}`);

const s = (id, name, emoji, color, progress, extra = {}) => ({
  id,
  name,
  emoji,
  color,
  progress,
  // תיאור קבוע, או פונקציה של הרמה (describe)
  describe: () => extra.description,
  // מה עוד צריך לעשות (לכרטיס "כמעט שם")
  hint: (remaining) => `עוד ${remaining}`,
  ...extra,
  // תיאור כללי (לרמה בינונית) למי שלא מעביר רמה
  description: extra.description ?? extra.describe?.('medium'),
});

// בכמה נושאים שונים השחקן כבר ענה נכון
const topicsCount = (st) => Object.keys(st.categoryCorrect || {}).filter((name) => categoryByName[name] && st.categoryCorrect[name] > 0).length;
const cat = (name) => (st) => st.categoryCorrect?.[name] || 0;

// ---- מדבקות נושא: לכל נושא מדבקה אחת בשלוש דרגות (ארד / כסף / זהב) ----
export const TIERS = [
  { tier: 1, label: 'ארד', target: 5, suffix: '', ring: 'ring-orange-300', badge: 'bg-orange-100 text-orange-800', medal: '🥉' },
  { tier: 2, label: 'כסף', target: 15, suffix: '-silver', ring: 'ring-slate-300', badge: 'bg-slate-200 text-slate-700', medal: '🥈' },
  { tier: 3, label: 'זהב', target: 40, suffix: '-gold', ring: 'ring-yellow-400', badge: 'bg-yellow-100 text-yellow-800', medal: '🥇' },
];

// slug של הנושא -> מזהה המדבקה (המזהים הישנים נשמרו), שם, אימוג'י וצבע
const topicStickers = {
  animals: ['animals', 'גאון החיות', '🦁', 'from-amber-300 to-orange-200'],
  space: ['space', 'אסטרונאוט צעיר', '🚀', 'from-indigo-300 to-violet-200'],
  physics: ['physics', 'מדען צעיר', '🔬', 'from-cyan-300 to-sky-200'],
  chemistry: ['chemistry', 'כימאי צעיר', '⚗️', 'from-teal-300 to-lime-200'],
  body: ['body', 'מומחה גוף האדם', '💪', 'from-rose-300 to-pink-200'],
  plants: ['plants', 'שומר הטבע', '🌳', 'from-lime-300 to-emerald-200'],
  earth: ['earth', 'חזאי מזג האוויר', '🌦️', 'from-orange-300 to-sky-200'],
  'world-geo': ['geo', 'חוקר העולם', '🧭', 'from-emerald-300 to-teal-200'],
  israel: ['israel', 'מכיר את הארץ', '🏞️', 'from-sky-300 to-blue-200'],
  'world-history': ['history', 'נוסע בזמן', '⏳', 'from-orange-300 to-amber-200'],
  'jewish-history': ['jewish-history', 'שומר הזיכרון', '📜', 'from-yellow-300 to-sky-200'],
  holidays: ['holidays', 'שומר המסורת', '🕎', 'from-blue-300 to-amber-200'],
  hebrew: ['hebrew', 'קוסם המילים', '✍️', 'from-fuchsia-300 to-violet-200'],
  books: ['books', 'תולעת ספרים', '📖', 'from-violet-300 to-pink-200'],
  music: ['music', 'מוזיקאי מחונן', '🎻', 'from-pink-300 to-violet-200'],
  art: ['art', 'אמן צעיר', '🎨', 'from-fuchsia-300 to-pink-200'],
  sports: ['sports', 'אלוף הספורט', '🥇', 'from-green-300 to-yellow-200'],
  inventions: ['inventions', 'ממציא גאון', '💡', 'from-yellow-300 to-amber-200'],
  math: ['math', 'גאון המספרים', '🧮', 'from-sky-300 to-indigo-200'],
  food: ['food', 'שף צעיר', '🍕', 'from-red-300 to-yellow-200'],
  transport: ['transport', 'נהג הקטר', '🚂', 'from-slate-300 to-sky-200'],
  dinosaurs: ['dinos', 'צייד מאובנים', '🦖', 'from-lime-300 to-amber-200'],
  ocean: ['ocean', 'צוללן מעמקים', '🐙', 'from-blue-300 to-cyan-200'],
  myths: ['myths', 'שומר האגדות', '🐉', 'from-purple-300 to-amber-200'],
  records: ['records', 'צייד הפלאות', '🤯', 'from-yellow-300 to-pink-200'],
  environment: ['environment', 'שומר כדור הארץ', '♻️', 'from-green-300 to-lime-200'],
  cultures: ['cultures', 'אזרח העולם', '🗺️', 'from-teal-300 to-amber-200'],
  cinema: ['cinema', 'כוכב הקולנוע', '🎬', 'from-rose-300 to-amber-200'],
  literature: ['literature', 'משורר צעיר', '🖋️', 'from-stone-300 to-violet-200'],
  people: ['people', 'מכיר את המפורסמים', '🎤', 'from-yellow-300 to-sky-200'],
  'modern-history': ['modern-history', 'בלש המאה העשרים', '📻', 'from-slate-300 to-amber-200'],
  archaeology: ['archaeology', 'ארכיאולוג צעיר', '🏺', 'from-amber-300 to-stone-200'],
  money: ['money', 'בנקאי צעיר', '💰', 'from-emerald-300 to-yellow-200'],
  civics: ['civics', 'אזרח לדוגמה', '⚖️', 'from-blue-300 to-slate-200'],
  games: ['games', 'אלוף המשחקים', '🎲', 'from-violet-300 to-yellow-200'],
};

const topicTiers = categories.flatMap((c) => {
  const [id, name, emoji, color] = topicStickers[c.slug] || [c.slug, `מומחה ${c.name}`, c.emoji, 'from-sky-300 to-violet-200'];
  return TIERS.map((t) =>
    s(`${id}${t.suffix}`, name, emoji, color, (st) => ({ current: cat(c.name)(st), target: t.target }), {
      description: `${t.target} תשובות נכונות בנושא ${c.name}`,
      group: id,
      tier: t.tier,
      category: c.name,
      kids: Boolean(c.kids),
      hint: (n) => `עוד ${count(n, 'תשובה נכונה אחת', 'תשובות נכונות')} על ${c.name}`,
    }),
  );
});

// ---- יעדים לפי רמה ----
const STREAK_5 = { easy: 5, medium: 5, hard: 4, expert: 4 };
const STREAK_10 = { easy: 10, medium: 8, hard: 7, expert: 6 };
// "מושלם!" – ברמה מאתגרת/מומחה מספיק 9 מתוך 10
export const PERFECT_MIN = { easy: 10, medium: 10, hard: 9, expert: 9 };
// "אנציקלופדיה מהלכת" – ברמה הקלה יש רק 18 נושאים לילדים
const TOPICS_MANY = { easy: 15, medium: 30, hard: 30, expert: 30 };

const streakSticker = (id, name, emoji, color, targets) =>
  s(id, name, emoji, color, (st, d) => ({ current: st.bestStreak, target: byLevel(targets, d) }), {
    describe: (d) => {
      const t = byLevel(targets, d);
      return t === targets.easy ? `${t} תשובות נכונות ברצף` : `‏${t} תשובות נכונות ברצף (${LEVEL_SUFFIX[d] || ''})`;
    },
    hint: (_n, target) => `רצף של ${target} תשובות נכונות`,
  });

const starsSticker = (id, name, emoji, color, target) =>
  s(id, name, emoji, color, (st) => ({ current: st.stars, target }), {
    description: `אספת ${target.toLocaleString('en-US')} כוכבים`,
    hint: (n) => `עוד ${n} כוכבים`,
  });

const gamesSticker = (id, name, emoji, color, target, description) =>
  s(id, name, emoji, color, (st) => ({ current: st.gamesPlayed, target }), {
    description,
    hint: (n) => (n === 1 ? 'עוד משחק אחד' : `עוד ${n} משחקים`),
  });

const general = [
  gamesSticker('first-game', 'צעד ראשון', '🎈', 'from-sky-300 to-cyan-200', 1, 'סיימת את המשחק הראשון'),
  // ניתנת לשני השחקנים בסוף האתגר הראשון שלהם
  s('first-duel', 'קרב ראשון', '⚔️', 'from-orange-300 to-rose-200', (st) => ({ current: st.duels || 0, target: 1 }), {
    description: 'שיחקת באתגר הראשון',
    hint: () => 'אתגר אחד מול שחקן אחר',
  }),
  starsSticker('stars-50', 'כוכב עולה', '⭐', 'from-yellow-300 to-amber-200', 50),
  s('streak-3', 'רצף לוהט', '🔥', 'from-orange-300 to-rose-200', (st) => ({ current: st.bestStreak, target: 3 }), {
    description: '3 תשובות נכונות ברצף',
    hint: () => 'רצף של 3 תשובות נכונות',
  }),
  s('topics-5', 'סקרן אמיתי', '🔍', 'from-teal-300 to-cyan-200', (st) => ({ current: topicsCount(st), target: 5 }), {
    description: 'תשובות נכונות ב־5 נושאים שונים',
    hint: (n) => `תשובה נכונה בעוד ${count(n, 'נושא אחד', 'נושאים')}`,
  }),
  s('timed-10', 'מהיר כברק', '⏱️', 'from-rose-300 to-amber-200', (st) => ({ current: Math.max(0, ...Object.values(st.timedBest || {})), target: 10 }), {
    description: '10 תשובות נכונות במרוץ נגד השעון',
    hint: () => '10 תשובות נכונות במרוץ אחד נגד השעון',
  }),
  starsSticker('stars-200', 'אספן כוכבים', '🌟', 'from-yellow-300 to-orange-200', 200),
  streakSticker('streak-5', 'בלתי ניתן לעצירה', '⚡', 'from-yellow-300 to-lime-200', STREAK_5),
  s('perfect', 'מושלם!', '💎', 'from-sky-300 to-indigo-200', (st) => ({ current: st.perfectGames, target: 1 }), {
    describe: (d) => (byLevel(PERFECT_MIN, d) === 10 ? '10 מתוך 10 במשחק אחד' : `‏9 מתוך 10 או יותר במשחק אחד (${LEVEL_SUFFIX[d]})`),
    hint: () => 'משחק מושלם',
  }),
  gamesSticker('games-5', 'אלוף הטריוויה', '🏆', 'from-amber-300 to-yellow-200', 5, 'סיימת 5 משחקים'),
  gamesSticker('games-10', 'שחקן נאמן', '🎟️', 'from-teal-300 to-sky-200', 10, 'סיימת 10 משחקים'),
  s('topics-15', 'אנציקלופדיה מהלכת', '📚', 'from-violet-300 to-sky-200', (st, d) => ({ current: topicsCount(st), target: byLevel(TOPICS_MANY, d) }), {
    describe: (d) => `תשובות נכונות ב־${byLevel(TOPICS_MANY, d)} נושאים שונים`,
    hint: (n) => `תשובה נכונה בעוד ${count(n, 'נושא אחד', 'נושאים')}`,
  }),
  starsSticker('stars-500', 'אוצר של כוכבים', '👑', 'from-violet-300 to-fuchsia-200', 500),
  streakSticker('streak-10', 'רצף מושלם', '🌈', 'from-pink-300 to-sky-200', STREAK_10),
  s('champion', "אוכל צ'ילי", '🌶️', 'from-red-300 to-orange-200', (st) => ({ current: st.championCorrect || 0, target: 10 }), {
    description: '10 תשובות נכונות לשאלת הסיום (שאלת אלוף / שאלת הפתעה)',
    hint: (n) => `עוד ${count(n, 'שאלת סיום נכונה אחת', 'שאלות סיום נכונות')}`,
  }),
  gamesSticker('games-20', 'ותיק הטריוויה', '🎖️', 'from-slate-300 to-amber-200', 20, 'סיימת 20 משחקים'),
  starsSticker('stars-1000', 'אגדת הטריוויה', '🪐', 'from-indigo-300 to-pink-200', 1000),
  starsSticker('stars-2000', 'כוכב־על', '💫', 'from-sky-300 to-yellow-200', 2000),
  gamesSticker('games-50', 'מאסטר הטריוויה', '🧙', 'from-purple-300 to-sky-200', 50, 'סיימת 50 משחקים'),
  starsSticker('stars-5000', 'גלקסיה', '🌌', 'from-indigo-400 to-violet-200', 5000),
];

export const stickers = [...general, ...topicTiers];

export const stickerById = Object.fromEntries(stickers.map((st) => [st.id, st]));

/** תיאור המדבקה לפי רמת השחקן */
export const stickerDescription = (sticker, difficulty) => sticker.describe(difficulty);

/** שם מלא כולל דרגה ("גאון החיות · כסף") */
export const stickerTitle = (sticker) => (sticker.tier ? `${sticker.name} · ${TIERS[sticker.tier - 1].label}` : sticker.name);

export const isStickerEarned = (sticker, stats, difficulty) => {
  const { current, target } = sticker.progress(stats, difficulty);
  return current >= target;
};

/** מחזיר רשימת מדבקות שהשחקן זכאי להן אבל עוד לא קיבל */
export const findNewStickers = (player) =>
  stickers.filter((st) => !player.stickers.includes(st.id) && isStickerEarned(st, player.stats, player.difficulty)).map((st) => st.id);

/**
 * המדבקות שמוצגות לשחקן: ברמה הקלה לא מראים נושאים שלא מופיעים בה (ספרות, כלכלה...),
 * ו"שאלת אלוף" רק ברמות שיש בהן. מדבקה שכבר התקבלה תמיד מוצגת.
 */
export const stickersFor = (player) => {
  const owned = new Set(player.stickers);
  const ownedGroups = new Set(stickers.filter((st) => st.group && owned.has(st.id)).map((st) => st.group));
  return stickers.filter((st) => {
    if (owned.has(st.id) || (st.group && ownedGroups.has(st.group))) return true;
    if (st.levels && !st.levels.includes(player.difficulty)) return false;
    if (st.group && player.difficulty === 'easy' && !st.kids) return false;
    return true;
  });
};

/** כמה מדבקות יש לשחקן מתוך כמה (לתצוגה בכרטיס הבית) */
export const stickerCount = (player) => {
  const visible = stickersFor(player);
  const owned = new Set(player.stickers);
  return { owned: visible.filter((st) => owned.has(st.id)).length, total: visible.length };
};

/**
 * המדבקה הבאה שהכי קרובה ("כמעט שם!"): המדבקה הנעולה עם היחס הגבוה ביותר current/target.
 * מתעלמים ממדבקות בלי התקדמות בכלל, וממדבקת נושא שהדרגה הקודמת שלה עוד לא התקבלה.
 * מחזיר { sticker, current, target, remaining, pct, text } או null.
 */
export const nextSticker = (player) => {
  const owned = new Set(player.stickers);
  let best = null;
  stickersFor(player).forEach((st) => {
    if (owned.has(st.id)) return;
    if (st.tier > 1 && !owned.has(stickers.find((x) => x.group === st.group && x.tier === st.tier - 1)?.id)) return;
    const { current, target } = st.progress(player.stats, player.difficulty);
    if (target <= 1 || current <= 0 || current >= target) return;
    const ratio = current / target;
    const remaining = target - current;
    if (!best || ratio > best.ratio || (ratio === best.ratio && remaining < best.remaining)) {
      best = { sticker: st, current, target, remaining, ratio };
    }
  });
  if (!best) return null;
  return {
    ...best,
    pct: Math.round(best.ratio * 100),
    text: best.sticker.hint(best.remaining, best.target),
  };
};

/** משפט "כמעט שם" מלא – גם לתצוגה וגם להקראה */
export const nextStickerSentence = (player, next = nextSticker(player)) =>
  next ? `${next.text} ו${g(player, 'תקבל', 'תקבלי')} את המדבקה "${stickerTitle(next.sticker)}"` : '';
