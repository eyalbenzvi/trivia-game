// מפתח להקלטה: טקסט (אחרי toSpeech) → שם קובץ קבוע. אותו חישוב משמש את האתר ואת סקריפטי ההקלטה (scripts/speech).
// שני גיבובים של 32 סיביות (FNV-1a ו-djb2) – 16 תווים הקסדצימליים, בלי ספריות.
const hex = (n) => (n >>> 0).toString(16).padStart(8, '0');

export const clipKey = (text) => {
  let a = 0x811c9dc5;
  let b = 5381;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = (Math.imul(b, 33) + c) | 0;
  }
  return hex(a) + hex(b);
};
