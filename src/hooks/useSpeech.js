import { useCallback, useEffect, useRef, useState } from 'react';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

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
    return () => {
      clearTimeout(t);
      synth.removeEventListener?.('voiceschanged', load);
    };
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    tokenRef.current += 1;
    clearTimeout(timerRef.current);
    synth.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (input, opts = {}) => {
      if (!supported) return;
      const parts = (Array.isArray(input) ? input : [input]).map((s) => String(s || '').trim()).filter(Boolean);
      if (!parts.length) return;
      cancel();
      const token = tokenRef.current;
      // השהיה קצרה אחרי cancel – בכרום speak מיד אחרי cancel לפעמים "נבלע"
      timerRef.current = setTimeout(() => {
        if (token !== tokenRef.current) return;
        parts.forEach((text, i) => {
          const u = new window.SpeechSynthesisUtterance(text);
          u.lang = 'he-IL';
          if (voice) u.voice = voice;
          u.rate = opts.rate ?? rate;
          u.pitch = opts.pitch ?? 1.05;
          if (i === 0) u.onstart = () => token === tokenRef.current && setSpeaking(true);
          if (i === parts.length - 1) {
            u.onend = () => token === tokenRef.current && setSpeaking(false);
            u.onerror = () => token === tokenRef.current && setSpeaking(false);
          }
          synth.speak(u);
        });
        // אם הדפדפן "נתקע" במצב השהיה
        if (synth.paused) synth.resume();
      }, 120);
    },
    [supported, voice, rate, cancel],
  );

  // עצירת הקראה כשהרכיב יורד מהמסך
  useEffect(() => () => supported && (clearTimeout(timerRef.current), synth.cancel()), [supported]);

  return {
    speak,
    cancel,
    speaking,
    supported,
    hasHebrewVoice: Boolean(voice),
    voicesLoaded,
  };
}
