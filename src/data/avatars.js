// דמויות לבחירה: דמויות מצוירות (SVG) של ילדים, הורים וסבים, ודמויות חיות.
// label הוא השם שמוקרא בקורא מסך – תיאור של הציור (ולא שם של ילד, כדי שלא יתבלבלו)
// gender / group – לבחירת דמות ברירת מחדל שמתאימה למין ולגיל של שחקן חדש (חיות מתאימות לכולם)
// BASE_URL מאפשר לתמונות לעבוד גם כשהאתר מוגש מתת-תיקייה (GitHub Pages)
const img = (name) => `${import.meta.env.BASE_URL}avatars/${name}.jpg`;

export const avatars = {
  'photo-reut': { type: 'image', src: img('reut'), label: 'התמונה של רעות' },
  'photo-yoav': { type: 'image', src: img('yoav'), label: 'התמונה של יואב' },
  'photo-ido': { type: 'image', src: img('ido'), label: 'התמונה של עידו' },
  'kid-reut': {
    type: 'kid',
    gender: 'f',
    group: 'kid',
    label: 'ילדה עם שיער ארוך ומשקפיים',
    hair: 'long',
    hairColor: '#6b3e26',
    skin: '#f6d2b8',
    accessory: 'glasses',
    bowColor: '#f472b6',
  },
  'kid-yoav': {
    type: 'kid',
    gender: 'm',
    group: 'kid',
    label: 'ילד עם כובע כחול',
    hair: 'spiky',
    hairColor: '#3b2a20',
    skin: '#f3c9a8',
    accessory: 'cap',
    capColor: '#38bdf8',
  },
  'kid-ido': {
    type: 'kid',
    gender: 'm',
    group: 'kid',
    label: 'ילד עם שיער מתולתל',
    hair: 'curly',
    hairColor: '#a0642c',
    skin: '#f8d9c0',
    accessory: 'none',
  },
  'kid-girl': {
    type: 'kid',
    gender: 'f',
    group: 'kid',
    label: 'ילדה עם קוקיות',
    hair: 'pigtails',
    hairColor: '#e0a33a',
    skin: '#eec1a0',
    accessory: 'none',
    bowColor: '#a78bfa',
  },
  'kid-boy': {
    type: 'kid',
    gender: 'm',
    group: 'kid',
    label: 'ילד עם משקפיים',
    hair: 'curly',
    hairColor: '#1f1a17',
    skin: '#c98e63',
    accessory: 'glasses',
  },
  'adult-man': {
    type: 'kid',
    gender: 'm',
    group: 'adult',
    label: 'איש עם זקן',
    hair: 'short',
    hairColor: '#4a3426',
    skin: '#eab896',
    accessory: 'beard',
  },
  'adult-woman': {
    type: 'kid',
    gender: 'f',
    group: 'adult',
    label: 'אישה עם שיער אסוף',
    hair: 'bob',
    hairColor: '#7c3f1d',
    skin: '#f3cdb0',
    accessory: 'earrings',
  },
  'senior-man': {
    type: 'kid',
    gender: 'm',
    group: 'senior',
    label: 'סבא עם משקפיים ושפם',
    hair: 'bald',
    hairColor: '#d4d4d8',
    skin: '#f0c7a6',
    accessory: 'glasses-mustache',
  },
  'senior-woman': {
    type: 'kid',
    gender: 'f',
    group: 'senior',
    label: 'סבתא עם קוקו לבן',
    hair: 'bun',
    hairColor: '#e5e7eb',
    skin: '#f6d2b8',
    accessory: 'glasses',
  },
  fox: { type: 'emoji', emoji: '🦊', label: 'שועל' },
  panda: { type: 'emoji', emoji: '🐼', label: 'פנדה' },
  unicorn: { type: 'emoji', emoji: '🦄', label: 'חד-קרן' },
  tiger: { type: 'emoji', emoji: '🐯', label: 'נמר' },
  frog: { type: 'emoji', emoji: '🐸', label: 'צפרדע' },
  monkey: { type: 'emoji', emoji: '🐵', label: 'קוף' },
  dino: { type: 'emoji', emoji: '🦖', label: 'דינוזאור' },
  robot: { type: 'emoji', emoji: '🤖', label: 'רובוט' },
};

export const avatarKeys = Object.keys(avatars);

/** קבוצת גיל לדמות: עד 17 – ילד/ה, 18–59 – הורה, 60 ומעלה – סבא/סבתא. בלי גיל – לא ידוע */
export const ageGroup = (age) => {
  const n = parseFloat(age);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 18) return 'kid';
  if (n < 60) return 'adult';
  return 'senior';
};

const isAnimal = (k) => avatars[k].type === 'emoji';

/**
 * דמות ברירת מחדל לשחקן חדש: דמות מצוירת שמתאימה למין ולגיל ושאף אחד עוד לא משתמש בה.
 * כשאין מין – חיה (כדי שלא יקבל דמות של המין השני). אף פעם לא דמות של המין השני.
 */
export function defaultAvatar({ gender, age } = {}, used = new Set()) {
  const free = (k) => !used.has(k);
  const animal = avatarKeys.filter(isAnimal);
  if (gender !== 'm' && gender !== 'f') return animal.find(free) || animal[0];
  const group = ageGroup(age);
  const faces = avatarKeys.filter((k) => avatars[k].type === 'kid' && avatars[k].gender === gender);
  // סדר העדפה לפי גיל: סבים → הורים, הורים → סבים; ילד או גיל לא ידוע – ילדים
  const order = group === 'senior' ? ['senior', 'adult'] : group === 'adult' ? ['adult', 'senior'] : ['kid'];
  for (const gr of order) {
    const hit = faces.find((k) => avatars[k].group === gr && free(k));
    if (hit) return hit;
  }
  return animal.find(free) || faces.find((k) => avatars[k].group === order[0]) || animal[0];
}
