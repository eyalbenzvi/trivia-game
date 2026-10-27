// מדבקות ותגים. כל מדבקה מגדירה פונקציית progress שמחזירה {current, target}.
const cat = (name) => (stats) => stats.categoryCorrect?.[name] || 0;

export const stickers = [
  {
    id: 'first-game',
    name: 'צעד ראשון',
    emoji: '🎈',
    description: 'סיימת את המשחק הראשון',
    color: 'from-sky-300 to-cyan-200',
    progress: (s) => ({ current: s.gamesPlayed, target: 1 }),
  },
  {
    id: 'stars-50',
    name: 'כוכב עולה',
    emoji: '⭐',
    description: 'אספת 50 כוכבים',
    color: 'from-yellow-300 to-amber-200',
    progress: (s) => ({ current: s.stars, target: 50 }),
  },
  {
    id: 'streak-3',
    name: 'רצף לוהט',
    emoji: '🔥',
    description: '3 תשובות נכונות ברצף',
    color: 'from-orange-300 to-rose-200',
    progress: (s) => ({ current: s.bestStreak, target: 3 }),
  },
  {
    id: 'animals',
    name: 'גאון החיות',
    emoji: '🦁',
    description: '5 תשובות נכונות על עולם החי',
    color: 'from-amber-300 to-orange-200',
    progress: (s) => ({ current: cat('עולם החי')(s), target: 5 }),
  },
  {
    id: 'space',
    name: 'אסטרונאוט צעיר',
    emoji: '🚀',
    description: '3 תשובות נכונות על חלל וכוכבים',
    color: 'from-indigo-300 to-violet-200',
    progress: (s) => ({ current: cat('חלל וכוכבים')(s), target: 3 }),
  },
  {
    id: 'nature',
    name: 'שומר הטבע',
    emoji: '🌳',
    description: '3 תשובות נכונות על טבע',
    color: 'from-lime-300 to-emerald-200',
    progress: (s) => ({ current: cat('טבע')(s), target: 3 }),
  },
  {
    id: 'body',
    name: 'מומחה גוף האדם',
    emoji: '🫀',
    description: '3 תשובות נכונות על גוף האדם',
    color: 'from-rose-300 to-pink-200',
    progress: (s) => ({ current: cat('גוף האדם')(s), target: 3 }),
  },
  {
    id: 'colors',
    name: 'אמן הצבעים',
    emoji: '🎨',
    description: '3 תשובות נכונות על צבעים וצורות',
    color: 'from-fuchsia-300 to-pink-200',
    progress: (s) => ({ current: cat('צבעים וצורות')(s), target: 3 }),
  },
  {
    id: 'science',
    name: 'מדען צעיר',
    emoji: '🔬',
    description: '3 תשובות נכונות על מדע והמצאות',
    color: 'from-cyan-300 to-sky-200',
    progress: (s) => ({ current: cat('מדע והמצאות')(s), target: 3 }),
  },
  {
    id: 'geo',
    name: 'חוקר העולם',
    emoji: '🧭',
    description: '3 תשובות נכונות על גיאוגרפיה',
    color: 'from-emerald-300 to-teal-200',
    progress: (s) => ({ current: cat('גיאוגרפיה')(s), target: 3 }),
  },
  {
    id: 'history',
    name: 'נוסע בזמן',
    emoji: '⏳',
    description: '3 תשובות נכונות על היסטוריה',
    color: 'from-orange-300 to-amber-200',
    progress: (s) => ({ current: cat('היסטוריה')(s), target: 3 }),
  },
  {
    id: 'stars-200',
    name: 'אספן כוכבים',
    emoji: '🌟',
    description: 'אספת 200 כוכבים',
    color: 'from-yellow-300 to-orange-200',
    progress: (s) => ({ current: s.stars, target: 200 }),
  },
  {
    id: 'streak-5',
    name: 'בלתי ניתן לעצירה',
    emoji: '⚡',
    description: '5 תשובות נכונות ברצף',
    color: 'from-yellow-300 to-lime-200',
    progress: (s) => ({ current: s.bestStreak, target: 5 }),
  },
  {
    id: 'perfect',
    name: 'מושלם!',
    emoji: '💎',
    description: '10 מתוך 10 במשחק אחד',
    color: 'from-sky-300 to-indigo-200',
    progress: (s) => ({ current: s.perfectGames, target: 1 }),
  },
  {
    id: 'games-5',
    name: 'אלוף הטריוויה',
    emoji: '🏆',
    description: 'סיימת 5 משחקים',
    color: 'from-amber-300 to-yellow-200',
    progress: (s) => ({ current: s.gamesPlayed, target: 5 }),
  },
  {
    id: 'stars-500',
    name: 'אוצר של כוכבים',
    emoji: '👑',
    description: 'אספת 500 כוכבים',
    color: 'from-violet-300 to-fuchsia-200',
    progress: (s) => ({ current: s.stars, target: 500 }),
  },
];

export const stickerById = Object.fromEntries(stickers.map((s) => [s.id, s]));

export const isStickerEarned = (sticker, stats) => {
  const { current, target } = sticker.progress(stats);
  return current >= target;
};

/** מחזיר רשימת מדבקות שהשחקן זכאי להן אבל עוד לא קיבל */
export const findNewStickers = (player) =>
  stickers.filter((s) => !player.stickers.includes(s.id) && isStickerEarned(s, player.stats)).map((s) => s.id);
