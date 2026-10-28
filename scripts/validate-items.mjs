// בדיקת רשימת הפריטים של "20 שאלות": node scripts/validate-items.mjs
import { GROUPS, ITEMS, itemPool, pickItem } from '../src/data/items.js';

let errors = 0;
const fail = (msg) => {
  errors += 1;
  console.error(`✗ ${msg}`);
};

// אימוג'י שבלי U+FE0F מוצגים בחלק מהמכשירים כסימן טקסט שחור
const NEEDS_VS16 = new Set(['✈', '✏', '✂', '☀']);
const HEBREW = /^[֐-׿' ]+$/;

const ids = new Set();
const names = new Set();
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
  const emoji = item.emoji || '';
  if (!emoji || !/\p{Extended_Pictographic}/u.test(emoji)) fail(`${where}: אין אימוג'י`);
  const base = emoji.replace(/️/g, '');
  if (NEEDS_VS16.has(base) && !emoji.includes('️')) fail(`${where}: חסר U+FE0F אחרי ${base}`);
  if ([...base].length !== 1) fail(`${where}: אימוג'י צריך להיות תו אחד ("${emoji}")`);
}

if (ITEMS.length !== 60) fail(`צריכים להיות 60 פריטים (יש ${ITEMS.length})`);
for (const [g, { label }] of Object.entries(GROUPS)) {
  const all = ITEMS.filter((i) => i.group === g);
  const kids = all.filter((i) => i.kids);
  console.log(`${label}: ${all.length} פריטים, ${kids.length} לקטנים`);
  if (kids.length < 10) fail(`${label}: צריך לפחות 10 פריטים לקטנים (יש ${kids.length})`);
}
const kidsCount = itemPool('kids').length;
if (kidsCount < 30) fail(`צריך לפחות 30 פריטים לקטנים (יש ${kidsCount})`);

// pickItem: לא מחזיר את הפריט שהוחרג, ומעדיף פריטים שלא היו לאחרונה
for (let i = 0; i < 200; i += 1) {
  const recent = itemPool('kids').slice(0, kidsCount - 2).map((x) => x.id);
  const picked = pickItem('kids', recent, recent[0]);
  if (!picked || recent.includes(picked.id)) fail('pickItem בחר פריט שהיה לאחרונה');
  if (!picked.kids) fail('pickItem בחר פריט שלא מתאים לקטנים');
}
const allRecent = ITEMS.map((x) => x.id);
if (!pickItem('all', allRecent, 'dog') || pickItem('all', allRecent, 'dog').id === 'dog') fail('pickItem כשכל המאגר היה לאחרונה');

console.log(errors ? `\n${errors} שגיאות` : `\n✓ ${ITEMS.length} פריטים תקינים (${kidsCount} לקטנים)`);
process.exit(errors ? 1 : 0);
