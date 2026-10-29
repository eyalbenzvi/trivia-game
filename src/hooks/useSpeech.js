import { useCallback, useEffect, useRef, useState } from 'react';
import { toSpeech } from '../utils/speechText';
import { clipsFor, loadUiSay, sayPending, vocalize, waitForSay } from '../utils/nikud';

// מילון הניקוד של טקסטי המשחק נטען ברקע מיד בפתיחה
if (typeof window !== 'undefined') setTimeout(loadUiSay, 1500);

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

  // נגן להקלטות המוכנות (השאלות של עידו)
  const audioRef = useRef(null);
  const stopAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    a.onended = null;
    a.onerror = null;
    a.pause();
  };

  const cancel = useCallback(() => {
    tokenRef.current += 1;
    clearTimeout(timerRef.current);
    stopAudio();
    if (!supported) return setSpeaking(false);
    utterRef.current = [];
    synth.cancel();
    setSpeaking(false);
  }, [supported]);

  /**
   * הקראה רציפה שמשלבת הקלטות וקול המכשיר: כל קטע – הקלטה אם יש, אחרת מנוע הדיבור.
   * items: [{ clips: [url...] } | { text }]
   */
  const playSequence = (items, token, opts, done) => {
    if (!audioRef.current && typeof Audio !== 'undefined') audioRef.current = new Audio();
    const audio = audioRef.current;
    const flat = items.flatMap((it) => (it.clips ? it.clips.map((url) => ({ url, text: it.text })) : [it]));
    const step = (i) => {
      if (token !== tokenRef.current) return;
      if (i >= flat.length) return done();
      const it = flat[i];
      const next = () => step(i + 1);
      const viaVoice = (text) => {
        if (!supported || !text) return next();
        const u = new window.SpeechSynthesisUtterance(text);
        u.lang = 'he-IL';
        if (voice) u.voice = voice;
        u.rate = opts.rate ?? rate;
        u.pitch = opts.pitch ?? 1.05;
        u.volume = opts.volume ?? 1;
        u.onend = next;
        u.onerror = next;
        utterRef.current = [u];
        synth.speak(u);
      };
      if (!it.url) return viaVoice(it.text);
      audio.onended = next;
      // הקלטה שלא נטענה – קוראים את הטקסט בקול המכשיר (ומדלגים על שאר ההקלטות של אותו קטע)
      audio.onerror = () => {
        const j = flat.findIndex((x, k) => k > i && x.text !== it.text);
        audio.onerror = null;
        audio.onended = null;
        viaVoice(it.text);
        if (j > i + 1) flat.splice(i + 1, j - i - 1);
      };
      audio.src = it.url;
      audio.volume = opts.volume ?? 1;
      audio.play().catch(() => audio.onerror?.());
    };
    setSpeaking(true);
    step(0);
  };

  const speak = useCallback(
    (input, opts = {}) => {
      const texts = (Array.isArray(input) ? input : [input]).map(toSpeech).filter(Boolean);
      if (!texts.length) return;
      // הטקסט נשלח מנוקד (רק להקראה) – כך המנוע לא מנחש תנועות והטעמה
      let parts = texts.map(vocalize);
      // לשאלות של עידו יש הקלטות מוכנות – הן עובדות גם במכשיר בלי קול עברי
      const withClips = () => {
        const items = texts.map((t, i) => {
          const c = clipsFor(t);
          return c ? { clips: c, text: parts[i] } : { text: parts[i] };
        });
        return items.some((it) => it.clips) ? items : null;
      };
      if (!supported && !withClips() && !sayPending()) return;
      const busy = supported && (synth.speaking || synth.pending);
      cancel();
      const token = tokenRef.current;
      const done = () => {
        if (token !== tokenRef.current) return;
        utterRef.current = [];
        setSpeaking(false);
      };
      const run = () => {
        if (token !== tokenRef.current) return;
        const items = withClips();
        if (items) return playSequence(items, token, opts, done);
        if (!supported) return done();
        utterRef.current = parts.map((text, i) => {
          const u = new window.SpeechSynthesisUtterance(text);
          u.lang = 'he-IL';
          if (voice) u.voice = voice;
          u.rate = opts.rate ?? rate;
          u.pitch = opts.pitch ?? 1.05;
          // volume – הקראה שקטה (למשל הסוד של השומר ב"20 שאלות"); יש מכשירים שמתעלמים ממנה
          u.volume = opts.volume ?? 1;
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
      // אם הניקוד של השאלה עוד נטען – מחכים לו רגע קצר (עד 0.7 שניות)
      const go = () => (busy ? (timerRef.current = setTimeout(run, 120)) : run());
      if (sayPending())
        waitForSay().then(() => {
          parts = texts.map(vocalize);
          go();
        });
      else go();
    },
    [supported, voice, rate, cancel],
  );

  // עצירת הקראה כשהרכיב יורד מהמסך
  useEffect(
    () => () => {
      tokenRef.current += 1;
      clearTimeout(timerRef.current);
      stopAudio();
      if (!supported) return;
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
