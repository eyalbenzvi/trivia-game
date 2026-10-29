// בדיקת רשימת הפריטים של "20 שאלות": node scripts/validate-items.mjs
import { GROUPS, ITEMS, LEVELS, itemPool, pickItem } from '../src/data/items.js';

let errors = 0;
const fail = (msg) => {
  errors += 1;
  console.error(`✗ ${msg}`);
};

const HEBREW = /^[֐-׿' ]+$/;
const VS16 = '\uFE0F';
const ZWJ = '\u200D';
const PACKS = new Set(['base', 'hard']);

// אימוג'י מגרסה 12 ומעלה – בטלפונים ישנים מוצגים כריבוע ריק ("טופו")
const NEWER_THAN_11 = [
  [0x1fa70, 0x1faff], // כל הבלוק Symbols and Pictographs Extended-A
  [0x1f6d5, 0x1f6df], // 🛕 ואילך
  [0x1f6fa, 0x1f6ff], // 🛺 ואילך
  [0x1f7e0, 0x1f7ff], // עיגולים וריבועים צבעוניים
  [0x1f90c, 0x1f90f],
  [0x1f93f, 0x1f93f], // 🤿
  [0x1f971, 0x1f972],
  [0x1f977, 0x1f979],
  [0x1f97b, 0x1f97b],
  [0x1f9a3, 0x1f9af], // 🦥 🦦 🦧 🦨 🦩 🦪 🦫 🦬 🦭 🦮 🦯
  [0x1f9ba, 0x1f9bf],
  [0x1f9c3, 0x1f9cf], // 🧃 🧄 🧅 🧇 🧉 🧊 🧋 …
];
const tooNew = (cp) => NEWER_THAN_11.some(([a, b]) => cp >= a && cp <= b);
const segmenter = new Intl.Segmenter('he', { granularity: 'grapheme' });

/** בדיקת אימוג'י: גרפים אחד, כל רכיב תו אחד, U+FE0F אחרי רכיב שמוצג כברירת מחדל כטקסט, בלי אימוג'י חדשים מדי */
const checkEmoji = (where, emoji) => {
  if (!emoji || !/\p{Extended_Pictographic}/u.test(emoji)) return fail(`${where}: אין אימוג'י`);
  if ([...segmenter.segment(emoji)].length !== 1) return fail(`${where}: אימוג'י צריך להיות סימן אחד ("${emoji}")`);
  const parts = emoji.split(ZWJ);
  if (parts.length > 2) fail(`${where}: רצף ZWJ ארוך מדי ("${emoji}")`);
  for (const part of parts) {
    const base = part.replaceAll(VS16, '');
    const chars = [...base];
    if (chars.length !== 1) fail(`${where}: רכיב באימוג'י צריך להיות תו אחד ("${part}")`);
    const cp = chars[0]?.codePointAt(0) ?? 0;
    if (tooNew(cp)) fail(`${where}: אימוג'י חדש מדי (U+${cp.toString(16).toUpperCase()}) – לא יוצג בטלפונים ישנים`);
    if (!/\p{Emoji_Presentation}/u.test(base) && !part.endsWith(VS16)) fail(`${where}: חסר U+FE0F אחרי ${base}`);
  }
  return undefined;
};

const ids = new Set();
const names = new Set();
const emojis = new Set();
for (const item of ITEMS) {
  const where = `${item.id || '(בלי מזהה)'}`;
  if (!/^[a-z][a-z-]*$/.test(item.id || '')) fail(`${where}: מזהה לא תקין`);
  if (ids.has(item.id)) fail(`${where}: מזהה כפול`);
  ids.add(item.id);
  if (!HEBREW.test(item.name || '')) fail(`${where}: שם חייב להיות בעברית ("${item.name}")`);
  if (names.has(item.name)) fail(`${where}: שם כפול "${item.name}"`);
  names.add(item.name);
  if (!GROUPS[item.group]) fail(`${where}: קבוצה לא מוכרת "${item.group}"`);
  if (typeof item.kids !== 'boolean') fail(`${where}: kids חייב להיות true/false`);
  if (!PACKS.has(item.pack)) fail(`${where}: pack חייב להיות base או hard ("${item.pack}")`);
  if (item.pack === 'hard' && item.kids) fail(`${where}: פריט מאתגר לא יכול להיות לקטנים`);
  checkEmoji(where, item.emoji);
  if (emojis.has(item.emoji)) fail(`${where}: אימוג'י כפול ${item.emoji}`);
  emojis.add(item.emoji);
}

// הפריטים הישנים (60) חייבים להישאר עם אותם מזהים – הם שמורים ברשימת "לאחרונה" במכשירים
const LEGACY = 'dog cat cow horse chicken fish butterfly elephant lion monkey giraffe turtle rabbit duck penguin snake owl octopus hedgehog shark bat kangaroo whale snail tree flower apple banana strawberry carrot watermelon grapes cactus sunflower corn tomato pineapple palm clover lemon ball car bus airplane bicycle train house book pencil scissors umbrella balloon shoe sun moon phone guitar key glasses alarm-clock'.split(' ');
for (const id of LEGACY) if (!ids.has(id)) fail(`מזהה ישן חסר: ${id}`);

if (ITEMS.length < 200) fail(`צריכים להיות לפחות 200 פריטים (יש ${ITEMS.length})`);
for (const [g, { label }] of Object.entries(GROUPS)) {
  const all = ITEMS.filter((i) => i.group === g);
  const kids = all.filter((i) => i.kids);
  const hard = all.filter((i) => i.pack === 'hard');
  console.log(`${label}: ${all.length} פריטים, ${kids.length} לקטנים, ${hard.length} מאתגרים`);
  if (kids.length < 10) fail(`${label}: צריך לפחות 10 פריטים לקטנים (יש ${kids.length})`);
  if (!hard.length) fail(`${label}: אין פריטים מאתגרים`);
}
const kidsCount = itemPool('kids').length;
const baseCount = itemPool('all').length;
const hardCount = itemPool('hard').length;
if (kidsCount < 100) fail(`צריך לפחות 100 פריטים לקטנים (יש ${kidsCount})`);
if (hardCount < 60) fail(`צריך לפחות 60 פריטים מאתגרים (יש ${hardCount})`);
if (baseCount + hardCount !== ITEMS.length) fail('כל פריט צריך להיות במאגר "כל הפריטים" או ב"מאתגר"');
if (itemPool('all').some((i) => i.pack === 'hard')) fail('"כל הפריטים" כולל פריט מאתגר');
if (itemPool('self').length) fail('ברמה "השומר בוחר" לא אמור להיות מאגר');
if (LEVELS.join() !== 'kids,all,hard,self') fail(`רשימת רמות לא צפויה: ${LEVELS.join()}`);

// pickItem: לא מחזיר את הפריט שהוחרג, מעדיף פריטים שלא היו לאחרונה, ונשאר בתוך הרמה
for (const level of ['kids', 'all', 'hard']) {
  const pool = itemPool(level);
  const recent = pool.slice(0, pool.length - 2).map((x) => x.id);
  const freshIds = pool.slice(-2).map((x) => x.id);
  for (let i = 0; i < 200; i += 1) {
    const picked = pickItem(level, recent, freshIds[0]);
    if (!picked || picked.id !== freshIds[1]) {
      fail(`pickItem(${level}) בחר פריט שהיה לאחרונה או שהוחרג`);
      break;
    }
  }
  // רשימת "לאחרונה" עם פריטים מרמות אחרות לא מפריעה
  const mixed = [...ITEMS.filter((x) => !pool.includes(x)).map((x) => x.id), ...recent];
  if (pickItem(level, mixed, freshIds[0])?.id !== freshIds[1]) fail(`pickItem(${level}) עם רשימה מעורבת`);
  for (let i = 0; i < 300; i += 1) {
    const p = pickItem(level, []);
    if (!pool.includes(p)) fail(`pickItem(${level}) בחר פריט מחוץ לרמה (${p?.id})`);
    if (level === 'kids' && !p.kids) fail('pickItem בחר פריט שלא מתאים לקטנים');
    if (level !== 'hard' && p.pack === 'hard') fail(`pickItem(${level}) בחר פריט מאתגר`);
  }
  // כשכל המאגר היה לאחרונה – עדיין בוחרים, ולא את המוחרג
  const allRecent = pool.map((x) => x.id);
  for (let i = 0; i < 50; i += 1) {
    const p = pickItem(level, allRecent, allRecent[0]);
    if (!p || p.id === allRecent[0]) fail(`pickItem(${level}) כשכל המאגר היה לאחרונה`);
  }
}
if (pickItem('self', []) !== null) fail('pickItem("self") צריך להחזיר null');

console.log(
  errors ? `\n${errors} שגיאות` : `\n✓ ${ITEMS.length} פריטים תקינים (${kidsCount} לקטנים · ${baseCount} רגילים · ${hardCount} מאתגרים)`,
);
process.exit(errors ? 1 : 0);
