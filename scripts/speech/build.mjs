// בונה את מילוני הניקוד שהמשחק טוען (src/data/say/*.json ו-src/data/sayUi.json)
// מהפלט של vocalize.py. שימוש: node scripts/speech/build.mjs <jobs.json> <voc.json>
import fs from 'node:fs';
import path from 'node:path';
import { segmentsOf, stripNikud } from '../../src/utils/sayText.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const [jobsPath, vocPath] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
const voc = JSON.parse(fs.readFileSync(vocPath, 'utf8'));
// תיקונים ידניים: מילה → ניקוד נכון (שמות, מילים שהמודל טועה בהן)
const overrides = JSON.parse(fs.readFileSync(path.join(root, 'scripts/speech/overrides.json'), 'utf8'));

const SPLIT = /^[,.!?;:…]$/;
// חולם/קמץ קטן על האות שלפני ו' בכתיב מלא ("אָרֹוךְ") – מנוע הדיבור עלול להשמיע את הו' בנפרד;
// מעבירים אותו לו' עצמה: "אָרוֹךְ"
const fixVowels = (s) => s.replace(/[\u05B9\u05C7](\u05BC?)ו(?![\u05B0-\u05BC\u05C1\u05C2])/g, '$1וֹ');
const fixWords = (seg) =>
  seg.replace(/[א-ת֑-ׇ'"׳״־-]+/g, (w) => overrides[stripNikud(w)] || w);

let pairs = 0;
let missed = 0;
// מחזיר זוגות [קטע, קטע מנוקד] של טקסט
const pairsOf = (text) => {
  const v = voc[text]?.say;
  if (!v) return [];
  const a = segmentsOf(text);
  const b = segmentsOf(v);
  if (a.length !== b.length) {
    missed += 1;
    return [];
  }
  const out = [];
  a.forEach((seg, i) => {
    if (SPLIT.test(seg)) return;
    if (stripNikud(b[i]) !== seg) {
      missed += 1;
      return;
    }
    out.push([seg, fixWords(fixVowels(b[i]))]);
    pairs += 1;
  });
  return out;
};

const sayDir = path.join(root, 'src/data/say');
fs.rmSync(sayDir, { recursive: true, force: true });
fs.mkdirSync(sayDir, { recursive: true });
let bytes = 0;
for (const [key, texts] of Object.entries(jobs.bank)) {
  const s = {};
  texts.forEach((t) => pairsOf(t).forEach(([k, v]) => (s[k] = v)));
  const json = JSON.stringify({ s });
  bytes += json.length;
  fs.writeFileSync(path.join(sayDir, `${key}.json`), json);
}

// טקסטים של המשחק: קטעים שלמים, וגם מילים בודדות (למשפטים שנבנים תוך כדי משחק, עם שמות ומספרים)
const uiS = {};
const counts = new Map();
jobs.ui.forEach((t) =>
  pairsOf(t).forEach(([k, v]) => {
    uiS[k] = v;
    const pw = k.split(/\s+/);
    const vw = v.split(/\s+/);
    if (pw.length !== vw.length) return;
    pw.forEach((w, i) => {
      if (!/^[א-ת]/.test(w) || stripNikud(vw[i]) !== w) return;
      const m = counts.get(w) || new Map();
      m.set(vw[i], (m.get(vw[i]) || 0) + 1);
      counts.set(w, m);
    });
  }),
);
const uiW = {};
counts.forEach((m, w) => {
  uiW[w] = [...m.entries()].sort((x, y) => y[1] - x[1])[0][0];
});
Object.assign(uiW, overrides);
const uiJson = JSON.stringify({ s: uiS, w: uiW });
fs.writeFileSync(path.join(root, 'src/data/sayUi.json'), uiJson);

console.log(`${pairs} קטעים מנוקדים, ${missed} דולגו (לא תאמו למקור)`);
console.log(`מאגר: ${(bytes / 1e6).toFixed(1)}MB ב-${Object.keys(jobs.bank).length} קבצים · משחק: ${(uiJson.length / 1e3).toFixed(0)}KB, ${Object.keys(uiW).length} מילים`);
