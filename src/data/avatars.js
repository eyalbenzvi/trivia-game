// דמויות לבחירה: דמויות ילדים מצוירות (SVG) ודמויות חיות.
// BASE_URL מאפשר לתמונות לעבוד גם כשהאתר מוגש מתת-תיקייה (GitHub Pages)
const img = (name) => `${import.meta.env.BASE_URL}avatars/${name}.jpg`;

export const avatars = {
  'photo-reut': { type: 'image', src: img('reut'), label: 'רעות' },
  'photo-yoav': { type: 'image', src: img('yoav'), label: 'יואב' },
  'photo-ido': { type: 'image', src: img('ido'), label: 'עידו' },
  'kid-reut': {
    type: 'kid',
    label: 'רעות',
    hair: 'long',
    hairColor: '#6b3e26',
    skin: '#f6d2b8',
    accessory: 'glasses',
    bowColor: '#f472b6',
  },
  'kid-yoav': {
    type: 'kid',
    label: 'יואב',
    hair: 'spiky',
    hairColor: '#3b2a20',
    skin: '#f3c9a8',
    accessory: 'cap',
    capColor: '#38bdf8',
  },
  'kid-ido': {
    type: 'kid',
    label: 'עידו',
    hair: 'curly',
    hairColor: '#a0642c',
    skin: '#f8d9c0',
    accessory: 'none',
  },
  'kid-girl': {
    type: 'kid',
    label: 'קוקיות',
    hair: 'pigtails',
    hairColor: '#e0a33a',
    skin: '#eec1a0',
    accessory: 'none',
    bowColor: '#a78bfa',
  },
  'kid-boy': {
    type: 'kid',
    label: 'מתולתל',
    hair: 'curly',
    hairColor: '#1f1a17',
    skin: '#c98e63',
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
