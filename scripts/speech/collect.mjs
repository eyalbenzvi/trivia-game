// איסוף כל הטקסטים שהאתר מקריא ושמוקלטים מראש: "המעטפת" (ברכות, תורות, סיכומים, 20 שאלות...)
// והתוכן של הרמה הקלה (השאלות של עידו). הפלט: scripts/speech/texts.json – מפתח הקלטה → הטקסט להקלטה.
//
// המשפטים כאן משוכפלים מהרכיבים (Game, Summary, TwentyQuestions...). בדיקת הכיסוי (scripts/speech/coverage.cjs)
// מוודאת שכל מה שהאתר אומר בפועל נמצא ברשימה, כך ששינוי ברכיב בלי עדכון כאן נתפס.
//
// הרצה (מתיקיית הפרויקט): node scripts/speech/run.mjs collect
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toSpeech } from '../../src/utils/speechText.js';
import { clipKey } from '../../src/utils/clipKey.js';
import { categories, kidCategoryNames } from '../../src/data/categories.js';
import { stickers, stickerTitle, stickerDescription } from '../../src/data/stickers.js';
import { missions, missionHeadline } from '../../src/data/missions.js';
import { ITEMS, GROUPS } from '../../src/data/items.js';
import { defaultPlayers, emptyStats, g } from '../../src/data/profiles.js';

const root = process.cwd();
const out = new Map(); // מפתח → { t: טקסט מקורי, s: טקסט אחרי toSpeech, src }
const add = (text, src) => {
  const s = toSpeech(text);
  if (!s || !/[א-ת]/.test(s)) return;
  const k = clipKey(s);
  if (!out.has(k)) out.set(k, { t: String(text), s, src });
};
const addAll = (list, src) => list.forEach((t) => add(t, src));
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// ----- שחקנים: שלושת הילדים + אבא/אמא (שם אחר שהוסיפו – בקול המכשיר)
const players = [
  ...defaultPlayers(),
  { name: 'אבא', gender: 'm', difficulty: 'hard', stats: emptyStats() },
  { name: 'אמא', gender: 'f', difficulty: 'hard', stats: emptyStats() },
];
const genders = [{ gender: 'm' }, { gender: 'f' }];
const levels = ['easy', 'medium', 'hard', 'expert'];

// ----- מסך הבית, הדף של השחקן, עורך הפרופיל
add('ברוכים הבאים! לחצו על התמונה שלכם כדי לשחק.', 'home');
addAll(['בדף שלכם: משחק, לפי נושא, ⏱️ מרוץ וחדר הפרסים.', 'משחק משפחתי – כולם יחד, או ⚔️ אתגר לשניים.', '20 שאלות – משחק ניחושים בקול.'], 'home');
players.forEach((p) => add(`${p.name}! ${g(p, 'מוכן', 'מוכנה')} לשחק? ${g(p, 'לחץ', 'לחצי')} על הכפתור הגדול`, 'hub'));
add('שלום! ככה אני מקריא את השאלות והתשובות.', 'editor');

// ----- משחק (Game.jsx)
addAll(['כל הכבוד!', 'מעולה!', 'וואו, צדקת!', 'אלופים!', 'יש! בול!', 'מדהים!'], 'game');
addAll(['לא נורא! ממשיכים 💪', 'לא נורא, ככה לומדים!', 'טעויות עוזרות ללמוד 💪'], 'game');
addAll(['כמעט! עכשיו אתה יודע', 'כמעט! עכשיו את יודעת', 'עובדה חדשה בכיס 🧠', 'טוב לדעת – ממשיכים!'], 'game');
addAll(['תשובה נכונה!', 'התשובה הנכונה היא:', 'הידעת?', 'התשובה:', 'בחרת:', 'התשובה הנכונה:', 'כדאי לזכור:'], 'game');
players.forEach((p) => add(`${p.name}, תורך! ${g(p, 'לחץ', 'לחצי')} על הכפתור ${g(p, 'כשאתה מוכן', 'כשאת מוכנה')}.`, 'game'));
add('שאלת הבוס! כל המשפחה עונה ביחד. תשובה נכונה מקדמת אותנו בשני צעדים.', 'game');
add('אתגר!', 'game');
add('שאלה אחרונה!', 'game');
players.forEach((a) => players.forEach((b) => a !== b && range(3, 7).forEach((n) => add(`${a.name} מול ${b.name}. ${n} שאלות לכל אחד.`, 'duel'))));
addAll(['שאלת הפתעה!', 'שאלת אלוף!'], 'game');
genders.forEach((p) => add(`30 כוכבים על הכף! ${g(p, 'לחץ', 'לחצי')} על הכפתור ${g(p, 'כשאתה מוכן', 'כשאת מוכנה')}.`, 'game'));
add('באיזה נושא נשחק?', 'topic');
genders.forEach((p) => add(`${g(p, 'בחר', 'בחרי')} נושא – ${g(p, 'לחץ', 'לחצי')} על נושא כדי לשמוע אותו, ואז על משחקים`, 'topic'));
categories.forEach((c) => {
  add(c.name, 'topic');
  add(`בחרתי: ${c.name}`, 'topic');
  add(`בחרת: ${c.name}`, 'topic');
});
addAll(['לחזור לדף הבית?', 'הכוכבים שכבר נאספו יישמרו.'], 'game');
addAll(['כל המשפחה צדקה! 👾 עוד 2 צעדים', 'לא נורא – היה כיף לחשוב ביחד!'], 'team');
addAll(['הורדתי תשובה אחת. אפשר לבקש רמז מאבא או אמא', 'הורדתי תשובה אחת.', 'הורדתי תשובות לא נכונות'], 'game');

// ----- מרוץ (TimedGame / TimedSummary)
addAll(['לעצור את המרוץ?', 'השעון מחכה בינתיים.', 'מרוץ נגד השעון!', 'עונים על כמה שיותר שאלות לפני שהזמן נגמר.'], 'race');
genders.forEach((p) => add(`${g(p, 'בחר זמן ולחץ', 'בחרי זמן ולחצי')} על מתחילים.`, 'race'));
addAll(['קבעת שיא ראשון! 🎯', 'שיא חדש! 🏆', 'הנה מה שהספקת ⏸️', 'הזמן נגמר! ⏱️', 'כל ניסיון מלמד אותנו משהו. נשחק שוב?'], 'race');
range(1, 40).forEach((n) => add(`ניסית ${n} שאלות! 💪`, 'race'));
add('וקיבלת 25 כוכבי בונוס על השיא!', 'race');

// ----- סיכום משחק יחיד (Summary.jsx)
const correctCountText = (n) => (n === 1 ? 'על שאלה אחת' : `על ${n} שאלות`);
range(1, 40).forEach((n) => add(`ענית נכון ${correctCountText(n)}.`, 'summary'));
add('הפעם זה לא הצליח, אבל למדנו דברים חדשים!', 'summary');
range(5, 10).forEach((t) => {
  add(`מושלם! ${t} מתוך ${t}!`, 'summary');
  add(`${t} מתוך ${t}`, 'summary');
});
addAll(['משחק מושלם!', 'משחק מושלם', 'משחק מעולה!', 'משחק מעולה', 'יפה מאוד!', 'יפה מאוד', 'איזה יופי של ניסיון!', 'סבב מאתגר'], 'summary');
range(1, 12).forEach((n) => add(`ועוד ${n} מדבקות בחדר הפרסים.`, 'summary'));
range(2, 60).forEach((n) => add(`${n} ימים ברצף!`, 'summary'));
const ranks = [['גאון העל', 'גאונית העל'], ['פרופסור', 'פרופסורית'], ['אלוף ידע', 'אלופת ידע'], ['בלש ידע', 'בלשית ידע'], ['חוקר מתחיל', 'חוקרת מתחילה']];
ranks.forEach(([m, f]) => {
  add(`עלית דרגה! עכשיו אתה ${m}.`, 'summary');
  add(`עלית דרגה! עכשיו את ${f}.`, 'summary');
});

// ----- מדבקות: שם, תיאור, רמזים ("כמעט שם")
stickers.forEach((st) => {
  genders.forEach((p) => {
    const title = stickerTitle(st, p);
    add(title, 'sticker');
    add(`וקיבלת מדבקה חדשה: ${title}!`, 'sticker');
    add(`${title}!`, 'sticker');
    add(`ו${g(p, 'תקבל', 'תקבלי')} את המדבקה "${title}"`, 'sticker');
  });
  levels.forEach((d) => {
    add(stickerDescription(st, d), 'sticker');
    add(`הדרגה הבאה: ${stickerDescription(st, d)}.`, 'sticker');
    const { target } = st.progress(emptyStats(), d);
    range(1, Math.min(20, Math.max(1, target))).forEach((n) => add(st.hint(n, target), 'sticker'));
  });
});
add('עוד לא קיבלת אותה.', 'sticker');
players.forEach((p) => add(`${p.name} ${g(p, 'קיבל', 'קיבלה')} מדבקה חדשה:`, 'sticker'));

// ----- משחק משפחתי (TeamSummary)
Object.values(missions).forEach((m) => {
  m.medals.forEach((h) => add(h, 'team'));
  [0.8, 0.6, 0.2].forEach((r) => add(missionHeadline(m, 0, r * 10, 10), 'team'));
});
addAll(['קיבלנו מדליה אחת!', 'קיבלנו 2 מדליות!', 'קיבלנו 3 מדליות!', 'היה מעולה, ובפעם הבאה נגיע רחוק יותר.'], 'team');
const teamTitles = [['הצלף', 'הצלפית'], ['מצית הרצף', 'מציתת הרצף'], ['המציל', 'המצילה'], ['מנוע הצוות', 'מנוע הצוות'], ['הלומד', 'הלומדת'], ['לב הצוות', 'לב הצוות'], ['רוח הצוות', 'רוח הצוות'], ['המעודד הראשי', 'המעודדת הראשית']];
players.forEach((p) => teamTitles.forEach(([m, f]) => add(`${p.name}: ${g(p, m, f)}`, 'team')));

// ----- אתגר (DuelSummary)
addAll(['תיקו – שתיכן ניצחתן!', 'תיקו – שניכם ניצחתם!'], 'duel');
players.forEach((p) => {
  add(`${p.name} ${g(p, 'ניצח', 'ניצחה')}!`, 'duel');
  add(`${p.name} – היה ממש צמוד!`, 'duel');
  add(`${p.name} – איזה קרב!`, 'duel');
  add(`${p.name}:`, 'duel');
});
range(0, 10).forEach((c) => add(c === 1 ? 'תשובה נכונה אחת' : `${c} תשובות נכונות`, 'duel'));
range(0, 14).forEach((n) => {
  add(`למדתם ${n} עובדות חדשות ביחד 💡`, 'duel');
  add(`למדתן ${n} עובדות חדשות ביחד 💡`, 'duel');
});
range(1, 7).forEach((c) => {
  const t = c === 1 ? 'תשובה נכונה אחת' : `${c} תשובות נכונות`;
  add(`${t} לכל אחד – אלופים!`, 'duel');
  add(`${t} לכל אחת – אלופות!`, 'duel');
});

// ----- 20 שאלות
addAll(['עשרים שאלות!', 'השומר רואה סוד, ורק הוא יודע מה זה.', 'כל השאר שואלים שאלות של כן או לא.', 'שאלה ראשונה טובה: חי, צומח או דומם?', 'יש עשרים שאלות כדי לגלות!'], 'twenty');
players.forEach((p) => {
  add(`${p.name}, ${g(p, 'קח', 'קחי')} את הטלפון, ואל ${g(p, 'תראה', 'תראי')} לאף אחד. ${g(p, 'לחץ', 'לחצי')} על הכפתור הגדול כדי לראות את הסוד.`, 'twenty');
  add(`${p.name} ${g(p, 'הוא', 'היא')} השומר!`, 'twenty');
});
addAll(['גילינו!', 'מה זה היה? השומר מגלה!', 'הסוד:', 'כן!', 'לא!', 'לפעמים!', 'נשארו חמש שאלות', 'נשארו שתי שאלות', 'נגמרו השאלות!'], 'twenty');
range(1, 20).forEach((n) => add(`אחרי ${n} שאלות.`, 'twenty'));
Object.values(GROUPS).forEach((grp) => add(`זה ${grp.label}.`, 'twenty'));
ITEMS.forEach((it) => {
  add(it.name, 'twenty');
  add(`זה היה: ${it.name}!`, 'twenty');
});

// ----- התוכן של עידו: כל השאלות של הרמה הקלה במאגר של הקטנים (כמו gamePool ב-utils/game.js)
const bankDir = join(root, 'src/data/bank');
const easy = readdirSync(bankDir)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(join(bankDir, f), 'utf8')))
  .filter((q) => q.difficulty === 'easy' && (q.kids === true || (q.kids !== false && kidCategoryNames.has(q.category))));
easy.forEach((q) => {
  add(q.question, 'ido');
  // התשובות מוקראות כקטעים נפרדים (speechForQuestion), והאחרונה – לפי הסדר המעורבב – "או X?"
  q.options.forEach((opt) => {
    add(opt, 'ido');
    add(`או ${opt}?`, 'ido');
  });
  if (q.explanation) add(q.explanation, 'ido');
});

const entries = Object.fromEntries([...out.entries()].sort(([a], [b]) => (a < b ? -1 : 1)));
writeFileSync(join(root, 'scripts/speech/texts.json'), `${JSON.stringify(entries, null, 0)}\n`);
const by = {};
let chars = 0;
Object.values(entries).forEach((v) => {
  by[v.src] = (by[v.src] || 0) + 1;
  chars += v.t.length;
});
console.log(`${Object.keys(entries).length} texts, ${chars} chars, ${easy.length} easy questions`);
console.log(by);
