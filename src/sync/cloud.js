// סנכרון ההתקדמות בין מכשירים דרך Firebase (Firestore, בתוכנית החינמית).
// הספרייה נטענת רק כשהמכשיר מחובר ל"קוד משפחה", כך שבלי סנכרון המשחק לא נהיה כבד יותר.
import { firebaseConfig as realConfig } from './firebaseConfig';

// לבדיקות בלבד: בנייה עם VITE_FIRESTORE_EMULATOR מתחברת לאמולטור מקומי במקום לענן
const emulator = import.meta.env.VITE_FIRESTORE_EMULATOR;
const firebaseConfig = emulator ? { projectId: 'demo-trivia', apiKey: 'demo' } : realConfig;

export const cloudAvailable = Boolean(firebaseConfig?.projectId);

let loading = null;
export const loadCloud = () => {
  if (!loading) {
    loading = Promise.all([import('firebase/app'), import('firebase/firestore')])
      .then(([{ initializeApp }, fs]) => {
        const db = fs.getFirestore(initializeApp(firebaseConfig));
        if (emulator) fs.connectFirestoreEmulator(db, ...emulator.split(':').map((x, i) => (i ? Number(x) : x)));
        return { ...fs, db };
      })
      .catch((err) => {
        loading = null;
        throw err;
      });
  }
  return loading;
};

// כל שחקן הוא מסמך: families/<קוד משפחה>/players/<מזהה שחקן>
export const playersCollection = (f, code) => f.collection(f.db, 'families', code, 'players');

// קוד משפחה: 12 תווים באנגלית ומספרים, בלי תווים שמתבלבלים (0/o, 1/l)
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
export const CODE_LENGTH = 12;
export const newFamilyCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
};
export const normalizeCode = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const formatCode = (code) => code.replace(/(.{4})(?=.)/g, '$1-');

/** האם כבר שמורים בענן שחקנים עם הקוד הזה (כדי שטעות הקלדה לא תיצור משפחה חדשה) */
export const familyExists = async (code) => {
  const f = await loadCloud();
  const snap = await f.getDocs(f.query(playersCollection(f, code), f.limit(1)));
  return !snap.empty;
};
