import { useCallback, useEffect, useRef, useState } from 'react';
import { toSpeech } from '../utils/speechText';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

// ב-iOS אפשר להקריא רק אחרי הקראה ראשונה שהתחילה בתוך נגיעה של המשתמש –
// בנגיעה הראשונה בדף (למשל "יאללה, משחקים!") משמיעים הקראה שקטה כדי "לפתוח" את ההקראה
if (synth && typeof window.SpeechSynthesisUtterance !== 'undefined') {
  const events = ['click', 'touchend', 'keydown'];
  const unlock = () => {
    events.forEach((e) => window.removeEventListener(e, unlock, true));
    if (synth.speaking || synth.pending) return;
    const u = new window.SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  };
  events.forEach((e) => window.addEventListener(e, unlock, true));
}

const pickHebrewVoice = (voices) =>
  voices.find((v) => v.lang === 'he-IL' && /google/i.test(v.name)) ||
  voices.find((v) => v.lang === 'he-IL') ||
  voices.find((v) => /^(he|iw)/i.test(v.lang)) ||
  null;

/**
 * הקראה בעברית בעזרת Web Speech API.
 * speak מקבל מחרוזת או מערך של קטעים – כל קטע נשלח כהקראה נפרדת
 * (כרום עוצר הקראות ארוכות מדי, ולכן עדיף לפצל).
 */
export function useSpeech({ rate = 0.95 } = {}) {
  const supported = Boolean(synth && typeof window.SpeechSynthesisUtterance !== 'undefined');
  const [voice, setVoice] = useState(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const timerRef = useRef(null);
  const tokenRef = useRef(0);
  // כרום "שוכח" הקראות שאין אליהן הפניה ואז onend לא מגיע – שומרים אותן כאן
  const utterRef = useRef([]);

  useEffect(() => {
    if (!supported) return undefined;
    const load = () => {
      const voices = synth.getVoices();
      if (voices.length) {
        setVoice(pickHebrewVoice(voices));
        setVoicesLoaded(true);
      }
    };
    load();
    synth.addEventListener?.('voiceschanged', load);
    // יש דפדפנים שלא מפעילים voiceschanged – נסיון נוסף אחרי רגע
    const t = setTimeout(load, 800);
    // ויש מכשירים בלי קולות בכלל – אחרי זמן סביר מסיקים שאין קול בעברית
    const t2 = setTimeout(() => {
      load();
      setVoicesLoaded(true);
    }, 1500);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      synth.removeEventListener?.('voiceschanged', load);
    };
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    tokenRef.current += 1;
    clearTimeout(timerRef.current);
    utterRef.current = [];
    synth.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (input, opts = {}) => {
      if (!supported) return;
      const parts = (Array.isArray(input) ? input : [input]).map(toSpeech).filter(Boolean);
      if (!parts.length) return;
      const busy = synth.speaking || synth.pending;
      cancel();
      const token = tokenRef.current;
      const done = () => {
        if (token !== tokenRef.current) return;
        utterRef.current = [];
        setSpeaking(false);
      };
      const run = () => {
        if (token !== tokenRef.current) return;
        utterRef.current = parts.map((text, i) => {
          const u = new window.SpeechSynthesisUtterance(text);
          u.lang = 'he-IL';
          if (voice) u.voice = voice;
          u.rate = opts.rate ?? rate;
          u.pitch = opts.pitch ?? 1.05;
          if (i === 0) u.onstart = () => token === tokenRef.current && setSpeaking(true);
          if (i === parts.length - 1) u.onend = done;
          // שגיאה בכל אחד מהקטעים – הקטעים הבאים לא יגיעו ל-onend, לכן מנקים את המצב
          u.onerror = done;
          return u;
        });
        utterRef.current.forEach((u) => synth.speak(u));
        // אם הדפדפן "נתקע" במצב השהיה
        if (synth.paused) synth.resume();
      };
      // בכרום speak מיד אחרי cancel של הקראה פעילה לפעמים "נבלע" – רק אז מחכים רגע.
      // אחרת מקריאים מיד, כדי להישאר בתוך הנגיעה של המשתמש (נדרש ב-iOS)
      if (busy) timerRef.current = setTimeout(run, 120);
      else run();
    },
    [supported, voice, rate, cancel],
  );

  // עצירת הקראה כשהרכיב יורד מהמסך
  useEffect(
    () => () => {
      if (!supported) return;
      tokenRef.current += 1;
      clearTimeout(timerRef.current);
      utterRef.current = [];
      synth.cancel();
    },
    [supported],
  );

  return {
    speak,
    cancel,
    speaking,
    supported,
    hasHebrewVoice: Boolean(voice),
    voicesLoaded,
  };
}
