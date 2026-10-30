// רשימת ההקלטות הקיימות (public/audio/clips) → src/data/clips.json, שממנה האתר יודע לאיזה קטע יש הקלטה.
// הרצה: node scripts/speech/run.mjs manifest
import { existsSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const texts = JSON.parse(readFileSync(join(root, 'scripts/speech/texts.json'), 'utf8'));
// הקלטה שנכשלה בבקרת האיכות (check_api.py) לא נכנסת – הקטע יוקרא בקול המכשיר
const checkPath = join(root, 'scripts/speech/check.json');
const check = existsSync(checkPath) ? JSON.parse(readFileSync(checkPath, 'utf8')) : {};
const keys = readdirSync(join(root, 'public/audio/clips'))
  .filter((f) => /^[0-9a-f]{16}\.ogg$/.test(f))
  .map((f) => f.slice(0, 16))
  .filter((k) => texts[k]) // הקלטה שהטקסט שלה כבר לא באתר לא נכנסת לרשימה
  .filter((k) => check[k]?.ok !== false)
  .sort();
writeFileSync(join(root, 'src/data/clips.json'), `${JSON.stringify(keys)}\n`);
const failed = Object.values(check).filter((v) => !v.ok).length;
console.log(`${keys.length} הקלטות ברשימה (מתוך ${Object.keys(texts).length} טקסטים; ${failed} נכשלו בבקרה)`);
