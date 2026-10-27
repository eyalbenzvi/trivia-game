// הכנת טקסט עברי להקראה: מנועי הדיבור בעברית מתקשים במספרים (זכר/נקבה),
// בקיצורים (קמ״ש, ק״מ), ב"כ־40" ובאימוג'ים. כאן הופכים הכול למילים.

const FEM_UNITS = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע'];
const MASC_UNITS = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה'];
const FEM_TEENS = ['עשר', 'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה', 'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה'];
const MASC_TEENS = ['עשרה', 'אחד עשר', 'שנים עשר', 'שלושה עשר', 'ארבעה עשר', 'חמישה עשר', 'שישה עשר', 'שבעה עשר', 'שמונה עשר', 'תשעה עשר'];
const TENS = ['', '', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים'];
const HUNDREDS = ['', 'מאה', 'מאתיים', 'שלוש מאות', 'ארבע מאות', 'חמש מאות', 'שש מאות', 'שבע מאות', 'שמונה מאות', 'תשע מאות'];
const THOUSANDS = ['', 'אלף', 'אלפיים', 'שלושת אלפים', 'ארבעת אלפים', 'חמשת אלפים', 'ששת אלפים', 'שבעת אלפים', 'שמונת אלפים', 'תשעת אלפים', 'עשרת אלפים'];

/** חלקי המספר 0–999 */
const below1000 = (n, fem) => {
  const parts = [];
  if (n >= 100) parts.push(HUNDREDS[Math.floor(n / 100)]);
  const rest = n % 100;
  if (rest >= 10 && rest < 20) parts.push((fem ? FEM_TEENS : MASC_TEENS)[rest - 10]);
  else {
    if (rest >= 20) parts.push(TENS[Math.floor(rest / 10)]);
    if (rest % 10) parts.push((fem ? FEM_UNITS : MASC_UNITS)[rest % 10]);
  }
  return parts;
};

const joinParts = (parts) =>
  parts.length > 1 ? `${parts.slice(0, -1).join(' ')} ו${parts[parts.length - 1]}` : parts[0] || 'אפס';

/** מספר שלם למילים בעברית. fem=true לצורת נקבה (גם צורת הספירה הרגילה) */
export const numberToHebrew = (num, fem = true) => {
  if (!Number.isFinite(num) || num < 0 || num >= 1e12) return String(num);
  if (num === 0) return 'אפס';
  const parts = [];
  const big = [
    [1e9, 'מיליארד'],
    [1e6, 'מיליון'],
  ];
  let n = num;
  for (const [size, word] of big) {
    const count = Math.floor(n / size);
    if (count) parts.push(count === 1 ? word : count === 2 ? `שני ${word}` : `${joinParts(below1000(count, false))} ${word}`);
    n %= size;
  }
  const thousands = Math.floor(n / 1000);
  if (thousands) parts.push(thousands <= 10 ? THOUSANDS[thousands] : `${joinParts(below1000(thousands, false))} אלף`);
  parts.push(...below1000(n % 1000, fem));
  return joinParts(parts);
};

// שמות עצם שהמין שלהם לא נקבע לפי הסיומת
const FEM_WORDS = new Set([
  'שנה', 'שנים', 'רגל', 'רגליים', 'עין', 'עיניים', 'אוזן', 'אוזניים', 'יד', 'ידיים', 'שן', 'שיניים', 'כנף', 'כנפיים',
  'ביצה', 'ביצים', 'מילה', 'מילים', 'עיר', 'ערים', 'אבן', 'אבנים', 'נשים', 'פעם', 'פעמים', 'ארץ', 'ארצות', 'דרך', 'דרכים',
  'שמש', 'נפש', 'צפור', 'ציפור', 'ציפורים', 'בטן', 'כף', 'כפות', 'ברך', 'ברכיים', 'צלע', 'צלעות', 'אצבע', 'אצבעות',
  'מעלה', 'מעלות', 'עצם', 'עצמות', 'דקה', 'דקות', 'שעה', 'שעות', 'שנייה', 'שניות', 'אות', 'אותיות', 'חיות', 'נקודות',
]);
const MASC_WORDS = new Set([
  'לבבות', 'זוגות', 'מוחות', 'כיסאות', 'עורות', 'קירות', 'ארונות', 'גגות', 'שדות', 'מזונות', 'קווים', 'כלבים',
  'מקומות', 'לילות', 'חלונות', 'קולות', 'שולחנות', 'אבות', 'כוחות', 'חלומות', 'דורות', 'רחובות', 'שבועות', 'מזלות',
  'מיליון', 'מיליארד', 'אלף', 'אלפים', 'מטר', 'מטרים', 'קילומטר', 'קילומטרים', 'סנטימטר', 'מילימטר', 'קילוגרם', 'גרם',
  'אחוז', 'אחוזים', 'יום', 'ימים', 'חודש', 'חודשים', 'שבוע', 'ליטר', 'ליטרים', 'שקלים', 'שקל',
  'צדדים', 'צבעים', 'שחקנים', 'כוכבים', 'כוכבי',
]);

const PREFIXES = /^[והבלמכש]{1,2}/;

/** ניחוש מין דקדוקי של שם העצם שאחרי המספר */
const genderOf = (word) => {
  if (!word) return null;
  const w = word.replace(/[^א-ת]/g, '');
  if (!w) return null;
  for (const candidate of [w, w.replace(PREFIXES, '')]) {
    if (FEM_WORDS.has(candidate)) return 'f';
    if (MASC_WORDS.has(candidate)) return 'm';
  }
  if (w.endsWith('ות') || w.endsWith('ה') || w.endsWith('ת')) return 'f';
  return 'm';
};

const UNITS_ABBR = [
  [/קמ["״]ש/g, 'קילומטר לשעה'],
  [/ק["״]מ/g, 'קילומטר'],
  [/ס["״]מ/g, 'סנטימטר'],
  [/מ["״]מ/g, 'מילימטר'],
  [/ק["״]ג/g, 'קילוגרם'],
  [/מ["״]ר/g, 'מטר רבוע'],
  [/ש["״]ח/g, 'שקלים'],
  [/וכו['׳]/g, 'וכולי'],
  [/לפנה["״]ס/g, 'לפני הספירה'],
  [/לספה["״]נ/g, 'לספירה'],
];

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu;

const readDecimal = (int, frac, fem) => {
  if (frac === '5') return `${numberToHebrew(int, fem)} וחצי`;
  return `${numberToHebrew(int, fem)} נקודה ${numberToHebrew(Number(frac), true)}`;
};

/** הופך טקסט לגרסה שקל להקריא */
export const toSpeech = (text) => {
  let t = String(text || '');
  t = t.replace(EMOJI, ' ');
  UNITS_ABBR.forEach(([re, rep]) => {
    t = t.replace(re, rep);
  });
  // ראשי תיבות אחרים (תנ״ך, צה״ל) – מקריאים כמילה אחת
  t = t.replace(/([א-ת])["״]([א-ת])/g, '$1$2');
  // 1,300 -> 1300
  t = t.replace(/(\d),(?=\d{3}\b)/g, '$1');
  // כ־40 / כ-40 -> בערך 40
  t = t.replace(/(^|[\s(])כ\s*[-־–]\s*(?=\d)/g, '$1בערך ');
  // ה־14 במאי -> הארבעה עשר במאי
  t = t.replace(/(^|[\s(])ה\s*[-־–]\s*(\d+)/g, (_, pre, n) => `${pre}ה${numberToHebrew(Number(n), false)}`);
  // ב־1948, מ־100, ל־3 -> צמוד למילים
  t = t.replace(/(^|[\s(])([בלמש]|מה|וב|ול|ומ)\s*[-־–]\s*(?=\d)/g, '$1$2');
  // טווחים 10-12 -> 10 עד 12
  t = t.replace(/(\d)\s*[-–]\s*(\d)/g, '$1 עד $2');
  // אחוזים
  t = t.replace(/(\d+(?:\.\d+)?)\s*%/g, '$1 אחוז');
  // מספרים (כולל מספרים צמודים לאות שימוש כמו "ב1948") – לפי מין המילה שאחריהם
  t = t.replace(/(\d+)(?:\.(\d+))?(?=(\s*)([א-ת"״׳'־-]*))/g, (match, int, frac, _sp, nextWord, offset, full) => {
    const n = Number(int);
    const before = full.slice(Math.max(0, offset - 6), offset);
    const isYear = n >= 1000 && n <= 2100 && !frac && (/שנת\s*$/.test(before) || !nextWord);
    // בטווח ("10 עד 12 ביצים") המין נקבע לפי המילה שאחרי המספר השני
    const range = nextWord === 'עד' ? full.slice(offset + match.length).match(/^\s*עד\s*\d+(?:\.\d+)?\s*([\u05d0-\u05ea"״׳'־-]*)/) : null;
    let fem = genderOf(range ? range[1] : nextWord) !== 'm';
    if (isYear) fem = true;
    if (frac) return readDecimal(n, frac, fem);
    // "שני"/"שתי" לפני שם עצם
    if (n === 2 && nextWord && /[א-ת]/.test(nextWord)) return fem ? 'שתי' : 'שני';
    return numberToHebrew(n, fem);
  });
  return t.replace(/\s+/g, ' ').trim();
};
