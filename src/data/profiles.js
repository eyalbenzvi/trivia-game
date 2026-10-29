export const difficultyInfo = {
  easy: {
    label: 'קל',
    title: 'רמה קלה',
    ages: 'גילאי 5–6',
    description: '🖼️ שאלות עם תמונות, שלוש תשובות והקראה',
    emoji: '🐣',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  medium: {
    label: 'בינוני',
    title: 'רמה בינונית',
    ages: 'גילאי 7–9',
    description: 'עובדות מעניינות שילדים יכולים לדעת',
    emoji: '🦊',
    badge: 'bg-amber-100 text-amber-700',
  },
  hard: {
    label: 'מאתגר',
    title: 'רמה מאתגרת',
    ages: 'גיל 10 ומעלה',
    description: 'ידע כללי לסקרנים – גם לנוער ולמבוגרים',
    emoji: '🦉',
    badge: 'bg-violet-100 text-violet-700',
  },
  expert: {
    label: 'מומחה',
    title: 'רמת מומחה',
    ages: 'לאלופי טריוויה',
    description: 'שאלות קשות באמת',
    emoji: '🧠',
    badge: 'bg-rose-100 text-rose-700',
  },
};

export const emptyStats = () => ({
  stars: 0,
  gamesPlayed: 0,
  totalCorrect: 0,
  totalAnswered: 0,
  bestStreak: 0,
  perfectGames: 0,
  categoryCorrect: {},
  seen: [],
  timedBest: {},
  review: [],
  recent: [],
  championCorrect: 0,
  // כמה אתגרים (שחקן מול שחקן) השחקן סיים
  duels: 0,
  // מאזן האתגרים מול כל יריב: { [opponentId]: { wins, ties, games } }
  duelRecord: {},
  // מה השחקן בחר בשאלות שבמחברת הטעויות: { [questionId]: chosenOptionText }
  reviewPicks: {},
  // ימים ברצף שבהם השחקן ענה על שאלה, והיום האחרון ('YYYY-MM-DD', לפי השעון המקומי)
  dayStreak: 0,
  lastPlayDay: '',
});

/** תאריך מקומי בפורמט 'YYYY-MM-DD' */
export const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const yesterday = (date = new Date()) => localDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));

/** הרצף העדכני: אם לא שיחקו היום או אתמול – הרצף כבר נשבר (0) */
export const activeDayStreak = (stats, now = new Date()) => {
  const last = stats?.lastPlayDay;
  return last === localDay(now) || last === yesterday(now) ? stats.dayStreak || 0 : 0;
};

/** עדכון הרצף אחרי שענו על שאלה היום */
export const bumpDayStreak = (stats, now = new Date()) => {
  const today = localDay(now);
  if (stats.lastPlayDay === today) return stats.dayStreak >= 1 ? stats : { ...stats, dayStreak: 1 };
  const dayStreak = stats.lastPlayDay === yesterday(now) ? (stats.dayStreak || 0) + 1 : 1;
  return { ...stats, dayStreak, lastPlayDay: today };
};

export const defaultPlayers = () => [
  {
    id: 'reut',
    name: 'רעות',
    age: '11',
    gender: 'f',
    avatar: 'photo-reut',
    theme: 'sky',
    difficulty: 'hard',
    autoRead: false,
    builtIn: true,
    stats: emptyStats(),
    stickers: [],
  },
  {
    id: 'yoav',
    name: 'יואב',
    age: '8',
    gender: 'm',
    avatar: 'photo-yoav',
    theme: 'mint',
    difficulty: 'medium',
    autoRead: false,
    builtIn: true,
    stats: emptyStats(),
    stickers: [],
  },
  {
    id: 'ido',
    name: 'עידו',
    age: '5.5',
    gender: 'm',
    avatar: 'photo-ido',
    theme: 'orange',
    difficulty: 'easy',
    autoRead: true,
    builtIn: true,
    stats: emptyStats(),
    stickers: [],
  },
];

// בחירת צורת פנייה לפי מין: g(player, 'זכר', 'נקבה')
export const g = (player, male, female) => (player?.gender === 'f' ? female : male);

export const ageLabel = (player) => (player.age ? `${g(player, 'בן', 'בת')} ${player.age}` : '');

// רמת קושי מומלצת לפי גיל (null אם הגיל לא ידוע)
export const levelForAge = (age) => {
  const n = parseFloat(age);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n <= 6) return 'easy';
  if (n <= 9) return 'medium';
  // מגיל 10 – מאתגר (גם נוער ומבוגרים); "מומחה" נשאר לבחירה ידנית
  return 'hard';
};

// דרגות לפי סך הכוכבים – תואר שמופיע ליד השם
const ranks = [
  { min: 5000, emoji: '🧙', male: 'גאון העל', female: 'גאונית העל' },
  { min: 2500, emoji: '🎓', male: 'פרופסור', female: 'פרופסורית' },
  { min: 1000, emoji: '🏅', male: 'אלוף ידע', female: 'אלופת ידע' },
  { min: 300, emoji: '🕵️', male: 'בלש ידע', female: 'בלשית ידע' },
  { min: 0, emoji: '🔎', male: 'חוקר מתחיל', female: 'חוקרת מתחילה' },
];

export const rankFor = (player) => {
  const stars = player?.stats?.stars || 0;
  const r = ranks.find((x) => stars >= x.min) || ranks[ranks.length - 1];
  return { emoji: r.emoji, title: g(player, r.male, r.female), min: r.min };
};
