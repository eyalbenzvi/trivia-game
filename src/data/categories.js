// כל נושאי הטריוויה. slug הוא שם קובץ השאלות ב-src/data/bank/<slug>.json
// kids: נושא שמתאים לגילאי 5–6 – ברמה הקלה משחקים רק בנושאים האלה (בלי ספרות, היסטוריה, כלכלה וכו')
export const categories = [
  { slug: 'animals', group: 'nature', kids: true, name: 'עולם החי', emoji: '🦁', banner: 'from-amber-200 via-orange-200 to-yellow-100', chip: 'bg-amber-100 text-amber-800' },
  { slug: 'space', group: 'nature', kids: true, name: 'חלל ואסטרונומיה', emoji: '🚀', banner: 'from-indigo-300 via-violet-300 to-sky-200', chip: 'bg-indigo-100 text-indigo-800' },
  { slug: 'physics', group: 'nature', name: 'מדע ופיזיקה', emoji: '🔭', banner: 'from-cyan-200 via-sky-200 to-teal-100', chip: 'bg-cyan-100 text-cyan-800' },
  { slug: 'chemistry', group: 'nature', name: 'חומרים וכימיה', emoji: '⚗️', banner: 'from-teal-200 via-cyan-200 to-lime-100', chip: 'bg-teal-100 text-teal-800' },
  { slug: 'body', group: 'nature', kids: true, name: 'גוף האדם ובריאות', emoji: '💪', banner: 'from-rose-200 via-pink-200 to-orange-100', chip: 'bg-rose-100 text-rose-800' },
  { slug: 'plants', group: 'nature', kids: true, name: 'צמחים וטבע', emoji: '🌳', banner: 'from-lime-200 via-green-200 to-emerald-100', chip: 'bg-lime-100 text-lime-800' },
  { slug: 'earth', group: 'nature', kids: true, name: 'מזג אוויר וכדור הארץ', emoji: '🌋', banner: 'from-orange-200 via-red-200 to-amber-100', chip: 'bg-orange-100 text-orange-800' },
  { slug: 'world-geo', group: 'world', name: 'גיאוגרפיה של העולם', emoji: '🌍', banner: 'from-emerald-200 via-teal-200 to-sky-100', chip: 'bg-emerald-100 text-emerald-800' },
  { slug: 'israel', group: 'world', kids: true, name: 'ארץ ישראל', emoji: '🏞️', banner: 'from-sky-200 via-blue-200 to-white', chip: 'bg-blue-100 text-blue-800' },
  { slug: 'world-history', group: 'world', name: 'היסטוריה עולמית', emoji: '🏛️', banner: 'from-orange-200 via-amber-200 to-rose-100', chip: 'bg-orange-100 text-orange-800' },
  { slug: 'jewish-history', group: 'world', name: 'תולדות עם ישראל', emoji: '📜', banner: 'from-amber-200 via-yellow-200 to-sky-100', chip: 'bg-yellow-100 text-yellow-800' },
  { slug: 'holidays', group: 'culture', kids: true, name: 'חגים ומסורת', emoji: '🕎', banner: 'from-blue-200 via-indigo-200 to-amber-100', chip: 'bg-indigo-100 text-indigo-800' },
  { slug: 'hebrew', group: 'culture', kids: true, name: 'שפה ומילים', emoji: '📝', banner: 'from-fuchsia-200 via-pink-200 to-violet-100', chip: 'bg-fuchsia-100 text-fuchsia-800' },
  { slug: 'books', group: 'culture', kids: true, name: 'ספרים וסיפורים', emoji: '📚', banner: 'from-violet-200 via-purple-200 to-pink-100', chip: 'bg-violet-100 text-violet-800' },
  { slug: 'music', group: 'culture', kids: true, name: 'מוזיקה', emoji: '🎵', banner: 'from-pink-200 via-rose-200 to-violet-100', chip: 'bg-pink-100 text-pink-800' },
  { slug: 'art', group: 'culture', kids: true, name: 'אמנות ואדריכלות', emoji: '🎨', banner: 'from-pink-200 via-fuchsia-200 to-sky-200', chip: 'bg-fuchsia-100 text-fuchsia-800' },
  { slug: 'sports', group: 'fun', kids: true, name: 'ספורט', emoji: '⚽', banner: 'from-green-200 via-emerald-200 to-yellow-100', chip: 'bg-green-100 text-green-800' },
  { slug: 'inventions', group: 'nature', name: 'המצאות וטכנולוגיה', emoji: '💡', banner: 'from-yellow-200 via-amber-200 to-sky-100', chip: 'bg-yellow-100 text-yellow-800' },
  { slug: 'math', group: 'fun', kids: true, name: 'מספרים וחשיבה', emoji: '🧮', banner: 'from-sky-200 via-indigo-200 to-violet-100', chip: 'bg-sky-100 text-sky-800' },
  { slug: 'food', group: 'fun', kids: true, name: 'אוכל ומטבחי העולם', emoji: '🍕', banner: 'from-red-200 via-orange-200 to-yellow-100', chip: 'bg-red-100 text-red-800' },
  { slug: 'transport', group: 'fun', kids: true, name: 'תחבורה וכלי רכב', emoji: '🚂', banner: 'from-slate-200 via-sky-200 to-blue-100', chip: 'bg-slate-100 text-slate-800' },
  { slug: 'dinosaurs', group: 'nature', kids: true, name: 'דינוזאורים ופרהיסטוריה', emoji: '🦖', banner: 'from-lime-200 via-amber-200 to-orange-100', chip: 'bg-lime-100 text-lime-800' },
  { slug: 'ocean', group: 'nature', kids: true, name: 'ים ואוקיינוסים', emoji: '🐋', banner: 'from-blue-300 via-cyan-200 to-teal-100', chip: 'bg-blue-100 text-blue-800' },
  { slug: 'myths', group: 'culture', name: 'מיתולוגיה ואגדות', emoji: '🐉', banner: 'from-purple-300 via-violet-200 to-amber-100', chip: 'bg-purple-100 text-purple-800' },
  { slug: 'records', group: 'fun', name: 'שיאים ועובדות מדהימות', emoji: '🏆', banner: 'from-yellow-200 via-orange-200 to-pink-100', chip: 'bg-amber-100 text-amber-800' },
  { slug: 'environment', group: 'nature', name: 'סביבה ואנרגיה', emoji: '♻️', banner: 'from-green-200 via-lime-200 to-sky-100', chip: 'bg-green-100 text-green-800' },
  { slug: 'cultures', group: 'world', name: 'מדינות ותרבויות', emoji: '🗺️', banner: 'from-teal-200 via-sky-200 to-amber-100', chip: 'bg-teal-100 text-teal-800' },
  { slug: 'cinema', group: 'culture', name: 'קולנוע וטלוויזיה', emoji: '🎬', banner: 'from-rose-200 via-red-200 to-amber-100', chip: 'bg-rose-100 text-rose-800' },
  { slug: 'literature', group: 'culture', name: 'ספרות ושירה', emoji: '🖋️', banner: 'from-stone-200 via-amber-100 to-violet-100', chip: 'bg-stone-100 text-stone-800' },
  { slug: 'people', group: 'world', name: 'אישים מפורסמים', emoji: '🌟', banner: 'from-yellow-200 via-amber-200 to-sky-100', chip: 'bg-yellow-100 text-yellow-800' },
  { slug: 'modern-history', group: 'world', name: 'המאה העשרים', emoji: '📻', banner: 'from-slate-200 via-amber-100 to-sky-100', chip: 'bg-slate-100 text-slate-800' },
  { slug: 'archaeology', group: 'world', name: 'ארכיאולוגיה ותגליות', emoji: '🏺', banner: 'from-amber-200 via-orange-100 to-stone-100', chip: 'bg-amber-100 text-amber-800' },
  { slug: 'money', group: 'world', name: 'כסף וכלכלה', emoji: '💰', banner: 'from-emerald-200 via-yellow-100 to-lime-100', chip: 'bg-emerald-100 text-emerald-800' },
  { slug: 'civics', group: 'world', name: 'אזרחות ועולם', emoji: '⚖️', banner: 'from-blue-200 via-sky-100 to-slate-100', chip: 'bg-blue-100 text-blue-800' },
  { slug: 'games', group: 'fun', kids: true, name: 'משחקים ותחביבים', emoji: '🎲', banner: 'from-violet-200 via-pink-100 to-yellow-100', chip: 'bg-violet-100 text-violet-800' },
];

// קבוצות הנושאים במסך בחירת הנושא – הסדר בתוך כל קבוצה קבוע (topics), כדי שילד ימצא את הנושא האהוב באותו מקום
export const TOPIC_GROUPS = [
  { id: 'nature', label: 'טבע ומדע', topics: ['animals', 'plants', 'ocean', 'dinosaurs', 'body', 'space', 'earth', 'physics', 'chemistry', 'environment', 'inventions'] },
  { id: 'world', label: 'ארץ ועולם', topics: ['israel', 'world-geo', 'cultures', 'world-history', 'jewish-history', 'modern-history', 'archaeology', 'civics', 'people', 'money'] },
  { id: 'culture', label: 'שפה ותרבות', topics: ['hebrew', 'books', 'literature', 'music', 'art', 'cinema', 'holidays', 'myths'] },
  { id: 'fun', label: 'פנאי וחשיבה', topics: ['sports', 'games', 'food', 'transport', 'math', 'records'] },
];

export const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
export const categoryByName = Object.fromEntries(categories.map((c) => [c.name, c]));

// שמות הנושאים שמתאימים לילדים קטנים (לרמה הקלה)
export const kidCategoryNames = new Set(categories.filter((c) => c.kids).map((c) => c.name));
