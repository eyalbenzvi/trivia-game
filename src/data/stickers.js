import { categoryByName } from './categories';

// מדבקות ותגים. כל מדבקה מגדירה פונקציית progress שמחזירה {current, target}.
const cat = (name) => (stats) => stats.categoryCorrect?.[name] || 0;

const s = (id, name, emoji, description, color, progress) => ({ id, name, emoji, description, color, progress });
const topic = (id, name, emoji, category, target, color) =>
  s(id, name, emoji, `${target} תשובות נכונות בנושא ${category}`, color, (st) => ({ current: cat(category)(st), target }));
// בכמה נושאים שונים השחקן כבר ענה נכון
const topicsCount = (st) => Object.keys(st.categoryCorrect || {}).filter((name) => categoryByName[name] && st.categoryCorrect[name] > 0).length;

export const stickers = [
  s('first-game', 'צעד ראשון', '🎈', 'סיימת את המשחק הראשון', 'from-sky-300 to-cyan-200', (st) => ({ current: st.gamesPlayed, target: 1 })),
  s('stars-50', 'כוכב עולה', '⭐', 'אספת 50 כוכבים', 'from-yellow-300 to-amber-200', (st) => ({ current: st.stars, target: 50 })),
  s('streak-3', 'רצף לוהט', '🔥', '3 תשובות נכונות ברצף', 'from-orange-300 to-rose-200', (st) => ({ current: st.bestStreak, target: 3 })),
  s('topics-5', 'סקרן אמיתי', '🔍', 'תשובות נכונות ב־5 נושאים שונים', 'from-teal-300 to-cyan-200', (st) => ({ current: topicsCount(st), target: 5 })),
  topic('animals', 'גאון החיות', '🦁', 'עולם החי', 5, 'from-amber-300 to-orange-200'),
  topic('space', 'אסטרונאוט צעיר', '🚀', 'חלל ואסטרונומיה', 5, 'from-indigo-300 to-violet-200'),
  topic('physics', 'מדען צעיר', '🔬', 'מדע ופיזיקה', 5, 'from-cyan-300 to-sky-200'),
  topic('plants', 'שומר הטבע', '🌳', 'צמחים וטבע', 5, 'from-lime-300 to-emerald-200'),
  topic('body', 'מומחה גוף האדם', '🫀', 'גוף האדם ובריאות', 5, 'from-rose-300 to-pink-200'),
  topic('geo', 'חוקר העולם', '🧭', 'גיאוגרפיה של העולם', 5, 'from-emerald-300 to-teal-200'),
  topic('israel', 'מכיר את הארץ', '🏞️', 'ארץ ישראל', 5, 'from-sky-300 to-blue-200'),
  topic('history', 'נוסע בזמן', '⏳', 'היסטוריה עולמית', 5, 'from-orange-300 to-amber-200'),
  topic('dinos', 'צייד מאובנים', '🦖', 'דינוזאורים ופרהיסטוריה', 5, 'from-lime-300 to-amber-200'),
  topic('ocean', 'צוללן מעמקים', '🐙', 'ים ואוקיינוסים', 5, 'from-blue-300 to-cyan-200'),
  topic('art', 'אמן צעיר', '🎨', 'אמנות ואדריכלות', 5, 'from-fuchsia-300 to-pink-200'),
  topic('music', 'מוזיקאי מחונן', '🎻', 'מוזיקה', 5, 'from-pink-300 to-violet-200'),
  topic('math', 'גאון המספרים', '🧮', 'מספרים וחשיבה', 5, 'from-sky-300 to-indigo-200'),
  topic('sports', 'אלוף הספורט', '🥇', 'ספורט', 5, 'from-green-300 to-yellow-200'),
  topic('myths', 'שומר האגדות', '🐉', 'מיתולוגיה ואגדות', 5, 'from-purple-300 to-amber-200'),
  s('timed-10', 'מהיר כברק', '⏱️', '10 תשובות נכונות במרוץ נגד השעון', 'from-rose-300 to-amber-200', (st) => ({ current: Math.max(0, ...Object.values(st.timedBest || {})), target: 10 })),
  s('stars-200', 'אספן כוכבים', '🌟', 'אספת 200 כוכבים', 'from-yellow-300 to-orange-200', (st) => ({ current: st.stars, target: 200 })),
  s('streak-5', 'בלתי ניתן לעצירה', '⚡', '5 תשובות נכונות ברצף', 'from-yellow-300 to-lime-200', (st) => ({ current: st.bestStreak, target: 5 })),
  s('perfect', 'מושלם!', '💎', '10 מתוך 10 במשחק אחד', 'from-sky-300 to-indigo-200', (st) => ({ current: st.perfectGames, target: 1 })),
  s('games-5', 'אלוף הטריוויה', '🏆', 'סיימת 5 משחקים', 'from-amber-300 to-yellow-200', (st) => ({ current: st.gamesPlayed, target: 5 })),
  s('topics-15', 'אנציקלופדיה מהלכת', '📚', 'תשובות נכונות ב־15 נושאים שונים', 'from-violet-300 to-sky-200', (st) => ({ current: topicsCount(st), target: 15 })),
  s('stars-500', 'אוצר של כוכבים', '👑', 'אספת 500 כוכבים', 'from-violet-300 to-fuchsia-200', (st) => ({ current: st.stars, target: 500 })),
  s('streak-10', 'רצף מושלם', '🌈', '10 תשובות נכונות ברצף', 'from-pink-300 to-sky-200', (st) => ({ current: st.bestStreak, target: 10 })),
  s('games-20', 'ותיק הטריוויה', '🎖️', 'סיימת 20 משחקים', 'from-slate-300 to-amber-200', (st) => ({ current: st.gamesPlayed, target: 20 })),
  s('stars-1000', 'אגדת הטריוויה', '🪐', 'אספת 1,000 כוכבים', 'from-indigo-300 to-pink-200', (st) => ({ current: st.stars, target: 1000 })),
];

export const stickerById = Object.fromEntries(stickers.map((s) => [s.id, s]));

export const isStickerEarned = (sticker, stats) => {
  const { current, target } = sticker.progress(stats);
  return current >= target;
};

/** מחזיר רשימת מדבקות שהשחקן זכאי להן אבל עוד לא קיבל */
export const findNewStickers = (player) =>
  stickers.filter((s) => !player.stickers.includes(s.id) && isStickerEarned(s, player.stats)).map((s) => s.id);
