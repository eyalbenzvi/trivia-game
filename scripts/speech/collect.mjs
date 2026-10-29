// אוסף את כל הטקסטים שמוקראים במשחק – שאלות, תשובות, הסברים וטקסטים של המשחק עצמו –
// בצורה שבה הם נשלחים למנוע הדיבור (אחרי toSpeech), לקובץ אחד שעובר ניקוד (vocalize.py).
// שימוש: node scripts/speech/collect.mjs <קובץ-יציאה.json>
import fs from 'node:fs';
import path from 'node:path';
import { toSpeech } from '../../src/utils/speechText.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const out = process.argv[2] || 'say-jobs.json';
const jobs = { bank: {}, ui: [], ido: [] };
// הקלטות מראש לעידו: השאלות של הרמה הקלה שמתאימות לקטנים (kids לא false) – שאלה, כל תשובה וההסבר
const ido = new Set(['או']);

// שאלות: לפי קובץ
const bankDir = path.join(root, 'src/data/bank');
for (const f of fs.readdirSync(bankDir).filter((x) => x.endsWith('.json'))) {
  const key = f.replace(/\.json$/, '');
  const texts = new Set();
  for (const q of JSON.parse(fs.readFileSync(path.join(bankDir, f), 'utf8'))) {
    [q.question, ...(q.options || []), q.explanation].forEach((t) => t && texts.add(toSpeech(t)));
    if (q.difficulty === 'easy' && q.kids !== false)
      [q.question, ...(q.options || []), q.explanation].forEach((t) => t && ido.add(toSpeech(t)));
  }
  jobs.bank[key] = [...texts].filter(Boolean);
}

// טקסטים של המשחק: כל רצף עברי בקוד (מחרוזות, תבניות, JSX)
const HEB_RUN = /[א-ת][א-ת0-9\s'"׳״־\-,.!?:;…()%]*/g;
const ui = new Set();
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (!['bank', 'say'].includes(f)) walk(p);
    } else if (/\.(jsx?|mjs)$/.test(f)) {
      const src = fs.readFileSync(p, 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of src.match(HEB_RUN) || []) {
        const t = toSpeech(m.replace(/\s+/g, ' ').trim());
        if (/[א-ת]/.test(t)) ui.add(t);
      }
    }
  }
};
walk(path.join(root, 'src'));
jobs.ui = [...ui];
jobs.ido = [...ido].filter(Boolean);

fs.writeFileSync(out, JSON.stringify(jobs));
const total = Object.values(jobs.bank).reduce((n, l) => n + l.length, 0);
console.log(`${total} טקסטים מהמאגר, ${jobs.ui.length} טקסטים של המשחק, ${jobs.ido.length} להקלטה לעידו → ${out}`);
