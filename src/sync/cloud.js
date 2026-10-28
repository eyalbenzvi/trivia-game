// סנכרון ההתקדמות בין מכשירים דרך Firebase (Firestore, בתוכנית החינמית).
// הספרייה נטענת ברקע אחרי פתיחת המשחק, כך שהמסך הראשון לא נהיה איטי יותר.
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

// נתונים אחד משותפים לכל המשפחה. כל שחקן הוא מסמך: families/<FAMILY_ID>/players/<מזהה שחקן>
export const FAMILY_ID = 'family-shared-main';
export const playersCollection = (f, code) => f.collection(f.db, 'families', code, 'players');
