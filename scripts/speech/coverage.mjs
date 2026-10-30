// בדיקת כיסוי: כל קטע שהאתר הקריא בפועל בבדיקות (קובץ שורות, מ-speech-log) – האם יש לו טקסט ברשימת ההקלטות?
// הרצה: node scripts/speech/run.mjs coverage <spoken.txt>
import { readFileSync } from 'node:fs';
import { clipKey } from '../../src/utils/clipKey.js';

const texts = JSON.parse(readFileSync('scripts/speech/texts.json', 'utf8'));
const spoken = [...new Set(readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean))];
const missing = spoken.filter((s) => !texts[clipKey(s)]);
console.log(`${spoken.length} קטעים נאמרו, ${spoken.length - missing.length} מכוסים, ${missing.length} חסרים`);
missing.forEach((m) => console.log('  ', m));
