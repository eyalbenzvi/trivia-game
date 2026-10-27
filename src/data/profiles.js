export const difficultyInfo = {
  easy: {
    label: 'קל',
    title: 'רמה קלה',
    description: '3 תשובות, שאלות פשוטות והקראה אוטומטית',
    emoji: '🐣',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  medium: {
    label: 'בינוני',
    title: 'רמה בינונית',
    description: 'טבע, בעלי חיים, גיאוגרפיה ועובדות מצחיקות',
    emoji: '🦊',
    badge: 'bg-amber-100 text-amber-700',
  },
  hard: {
    label: 'מאתגר',
    title: 'רמה מאתגרת',
    description: 'מדע, חלל, היסטוריה וידע כללי',
    emoji: '🦉',
    badge: 'bg-violet-100 text-violet-700',
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
});

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
