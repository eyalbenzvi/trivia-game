// בדיקת קבצי מאגר השאלות: node scripts/validate-bank.mjs [slug ...]
import { readFileSync, readdirSync } from 'node:fs';
import { categories } from '../src/data/categories.js';

const dir = new URL('../src/data/bank/', import.meta.url);
const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
const wanted = process.argv.slice(2);
// קובץ נוסף לאותו נושא נקרא <slug>-2.json, <slug>-3.json וכו'
const baseSlug = (file) => file.replace(/\.json$/, '').replace(/-\d+$/, '');
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && (!wanted.length || wanted.includes(f.replace('.json', '')) || wanted.includes(baseSlug(f))));
const LATIN = /[A-Za-z]/;
const norm = (s) => s.replace(/[\s"'״׳?!.,:\-–]/g, '');
let errors = 0;
const allQuestions = new Map();
const totals = { easy: 0, medium: 0, hard: 0 };

for (const file of files) {
  const slug = baseSlug(file);
  const err = (msg) => (errors++, console.log(`✗ ${file}: ${msg}`));
  let data;
  try {
    data = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
  } catch (e) {
    err(`JSON לא תקין: ${e.message}`);
    continue;
  }
  if (!bySlug[slug]) err('slug לא מוכר ב-categories.js');
  if (!Array.isArray(data)) { err('הקובץ חייב להיות מערך'); continue; }
  const ids = new Set();
  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const [i, q] of data.entries()) {
    const at = `#${i} (${q.id})`;
    if (!q.id || ids.has(q.id)) err(`${at} id חסר או כפול`);
    ids.add(q.id);
    if (!(q.difficulty in counts)) { err(`${at} difficulty לא תקין`); continue; }
    counts[q.difficulty]++;
    if (q.category !== bySlug[slug]?.name) err(`${at} category צריך להיות "${bySlug[slug]?.name}"`);
    const n = q.difficulty === 'easy' ? 3 : 4;
    if (!Array.isArray(q.options) || q.options.length !== n) err(`${at} צריך ${n} תשובות`);
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= n) err(`${at} correctIndex לא תקין`);
    if (new Set((q.options || []).map(norm)).size !== (q.options || []).length) err(`${at} תשובות כפולות`);
    if (q.difficulty === 'easy' && (!Array.isArray(q.optionEmojis) || q.optionEmojis.length !== 3)) err(`${at} חסרים optionEmojis`);
    for (const field of ['question', 'explanation', 'icon']) if (!q[field] || typeof q[field] !== 'string') err(`${at} חסר ${field}`);
    const texts = [q.question, q.explanation, ...(q.options || [])];
    if (texts.some((t) => LATIN.test(t || ''))) err(`${at} יש אותיות באנגלית`);
    if ((q.options || []).some((o) => o.length > 40)) err(`${at} תשובה ארוכה מדי (מעל 40 תווים)`);
    const key = norm(q.question || '');
    if (allQuestions.has(key)) err(`${at} שאלה כפולה (גם ב-${allQuestions.get(key)})`);
    allQuestions.set(key, `${file} ${q.id}`);
  }
  for (const d of Object.keys(counts)) totals[d] += counts[d];
  console.log(`${file}: קל ${counts.easy}, בינוני ${counts.medium}, מאתגר ${counts.hard}`);
}
console.log(`\nסה"כ ${totals.easy + totals.medium + totals.hard} שאלות (קל ${totals.easy}, בינוני ${totals.medium}, מאתגר ${totals.hard}), ${errors} שגיאות`);
process.exit(errors ? 1 : 0);
