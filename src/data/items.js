// פריטים סודיים ל"20 שאלות" (ובעתיד גם ל"נחשו מה?"): שם, אימוג'י וקבוצה – חי, צומח או דומם.
// בלי תכונות. נבחרו פריטים חד-משמעיים: בלי מאכלים מורכבים, ביצים, חלב, עץ או נייר.
// kids – פריט שילד בן 5 מכיר גם את המילה וגם את התמונה (עידו).
// אימוג'י עד גרסה 11 בלבד (נתמך באנדרואיד 9+ ו-iOS 12+). ✈️ ✏️ ✂️ ☀️ כתובים עם U+FE0F כדי שיוצגו כאימוג'י.
// חשוב: מזהים קיימים לא משתנים (נשמרים ברשימת "לאחרונה").

export const GROUPS = {
  alive: { label: 'חי', emoji: '🐾' },
  plant: { label: 'צומח', emoji: '🌱' },
  object: { label: 'דומם', emoji: '🧱' },
};

const group = (g, list) => list.map(([id, name, emoji, kids]) => ({ id, name, emoji, group: g, kids: Boolean(kids) }));

export const ITEMS = [
  ...group('alive', [
    ['dog', 'כלב', '🐕', 1],
    ['cat', 'חתול', '🐈', 1],
    ['cow', 'פרה', '🐄', 1],
    ['horse', 'סוס', '🐎', 1],
    ['chicken', 'תרנגולת', '🐔', 1],
    ['fish', 'דג', '🐟', 1],
    ['butterfly', 'פרפר', '🦋', 1],
    ['elephant', 'פיל', '🐘', 1],
    ['lion', 'אריה', '🦁', 1],
    ['monkey', 'קוף', '🐒', 1],
    ['giraffe', "ג'ירפה", '🦒', 1],
    ['turtle', 'צב', '🐢', 1],
    ['rabbit', 'ארנב', '🐇', 1],
    ['duck', 'ברווז', '🦆', 1],
    ['penguin', 'פינגווין', '🐧', 1],
    ['snake', 'נחש', '🐍', 1],
    ['owl', 'ינשוף', '🦉'],
    ['octopus', 'תמנון', '🐙'],
    ['hedgehog', 'קיפוד', '🦔'],
    ['shark', 'כריש', '🦈'],
    ['bat', 'עטלף', '🦇'],
    ['kangaroo', 'קנגורו', '🦘'],
    ['whale', 'לוויתן', '🐋'],
    ['snail', 'חילזון', '🐌'],
  ]),
  ...group('plant', [
    ['tree', 'עץ', '🌳', 1],
    ['flower', 'פרח', '🌷', 1],
    ['apple', 'תפוח', '🍎', 1],
    ['banana', 'בננה', '🍌', 1],
    ['strawberry', 'תות', '🍓', 1],
    ['carrot', 'גזר', '🥕', 1],
    ['watermelon', 'אבטיח', '🍉', 1],
    ['grapes', 'ענבים', '🍇', 1],
    ['cactus', 'קקטוס', '🌵', 1],
    ['sunflower', 'חמנייה', '🌻', 1],
    ['corn', 'תירס', '🌽', 1],
    ['tomato', 'עגבנייה', '🍅'],
    ['pineapple', 'אננס', '🍍'],
    ['palm', 'דקל', '🌴'],
    ['clover', 'תלתן', '🍀'],
    ['lemon', 'לימון', '🍋'],
  ]),
  ...group('object', [
    ['ball', 'כדור', '⚽', 1],
    ['car', 'מכונית', '🚗', 1],
    ['bus', 'אוטובוס', '🚌', 1],
    ['airplane', 'מטוס', '✈️', 1],
    ['bicycle', 'אופניים', '🚲', 1],
    ['train', 'רכבת', '🚂', 1],
    ['house', 'בית', '🏠', 1],
    ['book', 'ספר', '📕', 1],
    ['pencil', 'עיפרון', '✏️', 1],
    ['scissors', 'מספריים', '✂️', 1],
    ['umbrella', 'מטרייה', '☔', 1],
    ['balloon', 'בלון', '🎈', 1],
    ['shoe', 'נעל', '👟', 1],
    ['sun', 'שמש', '☀️'],
    ['moon', 'ירח', '🌙'],
    ['phone', 'טלפון', '📱'],
    ['guitar', 'גיטרה', '🎸'],
    ['key', 'מפתח', '🔑'],
    ['glasses', 'משקפיים', '👓'],
    ['alarm-clock', 'שעון מעורר', '⏰'],
  ]),
];

export const itemById = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** המאגר לפי רמה: 'kids' – רק פריטים לקטנים; 'all' – הכול */
export const itemPool = (level) => (level === 'kids' ? ITEMS.filter((i) => i.kids) : ITEMS);

/**
 * פריט סודי אקראי: קודם כאלה שלא היו לאחרונה (recent). כשהכול כבר היה – מכל המאגר.
 * exclude – הפריט הנוכחי ("פריט אחר" לא מחזיר אותו).
 */
export const pickItem = (level, recent = [], exclude = null) => {
  const pool = itemPool(level).filter((i) => i.id !== exclude);
  const seen = new Set(recent);
  const fresh = pool.filter((i) => !seen.has(i.id));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(Math.random() * from.length)];
};
