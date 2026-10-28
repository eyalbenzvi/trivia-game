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
const warnings = { dup: [], long: [], expl: [], easyExpl: [] };
const allQuestions = new Map();
// כל השאלות שנבדקו – לבדיקות האזהרה שבסוף (שאלות דומות מאוד וכו')
const checked = [];
// דגלים (זוג אותיות אזוריות) – ילד שלא יודע לקרוא לא מזהה מדינה לפי דגל
const FLAG = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
const emojiKey = (e) => String(e).replace(/\uFE0F/g, '');
// שאלה קלה שעידו יכול לקבל: נושא לילדים (אלא אם kids: false בשאלה) או kids: true בשאלה
const kidPlayable = (q, cat) => q.difficulty === 'easy' && (q.kids === true || (q.kids !== false && !!cat?.kids));
const YEAR = /(?<!\d)(1\d{3}|20\d{2})(?!\d)/;
const wordCount = (s) => s.split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;
// מזהים ייחודיים בכל המאגר (ולא רק בקובץ) – רשימת השאלות שנראו שומרת רק את המזהה
const allIds = new Map();
const totals = { easy: 0, medium: 0, hard: 0, expert: 0 };

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
  const counts = { easy: 0, medium: 0, hard: 0, expert: 0 };
  for (const [i, q] of data.entries()) {
    const at = `#${i} (${q?.id})`;
    if (!q || typeof q !== 'object') { err(`${at} שאלה לא תקינה`); continue; }
    if (!q.id || typeof q.id !== 'string') err(`${at} id חסר`);
    else if (allIds.has(q.id)) err(`${at} id כפול (גם ב-${allIds.get(q.id)})`);
    else allIds.set(q.id, file);
    if (!(q.difficulty in counts)) { err(`${at} difficulty לא תקין`); continue; }
    counts[q.difficulty]++;
    if (q.category !== bySlug[slug]?.name) err(`${at} category צריך להיות "${bySlug[slug]?.name}"`);
    const n = q.difficulty === 'easy' ? 3 : 4;
    if (!Array.isArray(q.options) || q.options.length !== n) err(`${at} צריך ${n} תשובות`);
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= n) err(`${at} correctIndex לא תקין`);
    if (new Set((q.options || []).map(norm)).size !== (q.options || []).length) err(`${at} תשובות כפולות`);
    if (q.difficulty === 'easy' && (!Array.isArray(q.optionEmojis) || q.optionEmojis.length !== 3)) err(`${at} חסרים optionEmojis`);
    if ('kids' in q && typeof q.kids !== 'boolean') err(`${at} kids חייב להיות true או false`);
    const playable = kidPlayable(q, bySlug[slug]);
    if (q.difficulty === 'easy' && Array.isArray(q.optionEmojis)) {
      if (new Set(q.optionEmojis.map(emojiKey)).size !== q.optionEmojis.length) err(`${at} אותה תמונה ליותר מתשובה אחת (${q.optionEmojis.join(' ')})`);
      if (playable && q.optionEmojis.some((e) => FLAG.test(String(e)))) err(`${at} דגל בתמונות של שאלה לילדים – ילד שלא קורא לא מזהה מדינה לפי דגל`);
    }
    for (const field of ['question', 'explanation', 'icon']) if (!q[field] || typeof q[field] !== 'string') err(`${at} חסר ${field}`);
    const texts = [q.question, q.explanation, ...(q.options || [])];
    if (texts.some((t) => LATIN.test(t || ''))) err(`${at} יש אותיות באנגלית`);
    if ((q.options || []).some((o) => o.length > 40)) err(`${at} תשובה ארוכה מדי (מעל 40 תווים)`);
    const key = norm(q.question || '');
    if (allQuestions.has(key)) err(`${at} שאלה כפולה (גם ב-${allQuestions.get(key)})`);
    allQuestions.set(key, `${file} ${q.id}`);
    checked.push({ q, file, playable });
  }
  for (const d of Object.keys(counts)) totals[d] += counts[d];
  console.log(`${file}: קל ${counts.easy}, בינוני ${counts.medium}, מאתגר ${counts.hard}, מומחה ${counts.expert}`);
}
// ---- אזהרות (לא מכשילות את הבדיקה) ----
const STOP = new Set(['של', 'את', 'מה', 'מי', 'איזה', 'איזו', 'אילו', 'כמה', 'על', 'עם', 'הוא', 'היא', 'הם', 'הן', 'לא', 'כן', 'או', 'גם', 'יש', 'אין', 'זה', 'זו', 'כל', 'איך', 'למה', 'איפה', 'האם', 'הכי', 'אשר', 'שם', 'בין', 'אחד', 'אחת']);
const PREFIX = /^[הוובלמשכ]/;
const words = (s) => (s || '').replace(/[\u0591-\u05C7]/g, '').split(/[^\p{L}\d]+/u).filter(Boolean);
const finals = (s) => s.replace(/[ךםןףץ]/g, (c) => ({ ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' })[c]);
const wordForms = (w) => {
  const forms = new Set([finals(w)]);
  for (const f of [...forms]) if (PREFIX.test(f) && f.length >= 4) forms.add(f.slice(1));
  for (const f of [...forms]) { const t = f.replace(/(ים|ות|ית|ה|ת|י)$/, ''); if (t.length >= 3) forms.add(t); }
  return [...forms];
};
const stem = (w) => (w.length >= 4 && PREFIX.test(w) ? w.slice(1) : w);
// גם אמוג'י בשאלה נחשב למילה (אחרת כל שאלות 'לאיזו מדינה שייך הדגל …' נראות זהות)
const qWords = (s) => new Set([...words(s).map(stem).filter((w) => w.length >= 2 && !STOP.has(w)), ...((s || '').match(/[\u{1F1E6}-\u{1F1FF}]{2}|\p{Extended_Pictographic}/gu) || [])]);
// שאלות כמעט כפולות: חפיפת מילים (מנורמלת לפי השאלה הארוכה מבין השתיים) של 0.75 ומעלה
{
  const sets = checked.map((c) => qWords(c.q.question));
  const index = new Map();
  sets.forEach((set, i) => { for (const w of set) { if (!index.has(w)) index.set(w, []); index.get(w).push(i); } });
  const seen = new Set();
  sets.forEach((set, i) => {
    if (set.size < 3) return;
    const shared = new Map();
    for (const w of set) for (const j of index.get(w)) if (j > i) shared.set(j, (shared.get(j) || 0) + 1);
    for (const [j, n] of shared) {
      if (sets[j].size < 3) continue;
      const score = n / Math.max(set.size, sets[j].size);
      const k = `${i}:${j}`;
      if (score >= 0.75 && !seen.has(k)) {
        seen.add(k);
        const a = checked[i].q, b = checked[j].q;
        warnings.dup.push(`${score.toFixed(2)} ${a.id} [${a.difficulty}] «${a.question}» ~ ${b.id} [${b.difficulty}] «${b.question}»`);
      }
    }
  });
}
for (const { q, playable } of checked) {
  const opts = q.options || [];
  const right = opts[q.correctIndex];
  if (typeof right !== 'string') continue;
  // התשובה הנכונה בולטת באורכה: ארוכה ב-30% ולפחות ב-8 תווים מכל אחת מהאחרות
  if (opts.length > 1 && opts.every((o, i) => i === q.correctIndex || (right.length >= o.length * 1.3 && right.length - o.length >= 8))) {
    warnings.long.push(`${q.id}: «${right}» מול ${opts.filter((_, i) => i !== q.correctIndex).map((o) => `«${o}»`).join(' ')}`);
  }
  // ההסבר לא מזכיר אף מילה (3 אותיות ומעלה) מהתשובה הנכונה
  // השוואה גסה לפי שורש: בלי אותיות סופיות, אותיות שימוש בהתחלה וסיומות ריבוי/נקבה
  const answerWords = words(right).filter((w) => /^\p{L}{3,}$/u.test(w));
  const expl = finals((q.explanation || '').replace(/[\u0591-\u05C7]/g, ''));
  if (answerWords.length && !answerWords.some((w) => wordForms(w).some((f) => expl.includes(f)))) {
    warnings.expl.push(`${q.id}: «${right}» – «${q.explanation}»`);
  }
  // הסבר ברמה הקלה מוקרא לילד בן 5: בלי שנים ולא יותר מ-25 מילים
  if (playable && q.explanation) {
    const n = wordCount(q.explanation);
    if (YEAR.test(q.explanation) || n > 25) warnings.easyExpl.push(`${q.id} (${n} מילים${YEAR.test(q.explanation) ? ', שנה' : ''}): ${q.explanation}`);
  }
}
const warnTitles = {
  dup: 'שאלות דומות מאוד (כדאי לבדוק שאינן כפולות)',
  long: 'התשובה הנכונה ארוכה בהרבה מכל האחרות',
  expl: 'ההסבר לא מזכיר את התשובה הנכונה',
  easyExpl: 'הסבר ברמה הקלה עם שנה או ארוך מ-25 מילים',
};
const totalWarnings = Object.values(warnings).reduce((s, l) => s + l.length, 0);
if (totalWarnings) {
  console.log('\n⚠ אזהרות (לא מכשילות):');
  for (const [k, list] of Object.entries(warnings)) {
    if (!list.length) continue;
    console.log(`\n⚠ ${warnTitles[k]} – ${list.length}:`);
    for (const line of list) console.log(`  ${line}`);
  }
}
console.log(`\nסה"כ ${totals.easy + totals.medium + totals.hard + totals.expert} שאלות (קל ${totals.easy}, בינוני ${totals.medium}, מאתגר ${totals.hard}, מומחה ${totals.expert}), ${errors} שגיאות, ${totalWarnings} אזהרות (${Object.entries(warnings).map(([k, l]) => `${k}: ${l.length}`).join(', ')})`);
process.exit(errors ? 1 : 0);
