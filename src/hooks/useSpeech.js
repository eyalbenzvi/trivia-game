import { useCallback, useEffect, useRef, useState } from 'react';
import { toSpeech } from '../utils/speechText';
import { clipFor, loadClips } from '../utils/clips';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
// רשימת ההקלטות המוכנות נטענת ברקע (לפני ההקראה הראשונה)
if (typeof window !== 'undefined') setTimeout(loadClips, 300);
// לבדיקות: localStorage family-trivia:speech-log = on – כל קטע שמוקרא נרשם ב-console
let speechLog = false;
try {
  speechLog = window.localStorage.getItem('family-trivia:speech-log') === 'on';
} catch {
  // אין גישה לאחסון
}

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
  // נגן ההקלטות המוכנות (אלמנט אחד לכל הרכיב)
  const audioRef = useRef(null);
  // הקראה שמחכה לסוף ההקראה הנוכחית (speak עם wait), וסימון שיש הקראה פעילה
  const queuedRef = useRef(null);
  const activeRef = useRef(false);
  const speakRef = useRef(null);
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

  const stopAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    a.onended = null;
    a.onerror = null;
    a.pause();
    a.removeAttribute('src');
  };

  const cancel = useCallback(() => {
    tokenRef.current += 1;
    clearTimeout(timerRef.current);
    utterRef.current = [];
    queuedRef.current = null;
    activeRef.current = false;
    stopAudio();
    if (supported) synth.cancel();
    setSpeaking(false);
  }, [supported]);

  /**
   * הקראה רציפה שמשלבת הקלטות מוכנות וקול המכשיר: כל קטע – ההקלטה שלו אם יש, אחרת מנוע הדיבור.
   * items: [{ text, url|null }]
   */
  const playSequence = (items, token, opts, done) => {
    if (!audioRef.current && typeof Audio !== 'undefined') audioRef.current = new Audio();
    const audio = audioRef.current;
    const step = (i) => {
      if (token !== tokenRef.current) return;
      if (i >= items.length) return done();
      const it = items[i];
      const next = () => step(i + 1);
      const viaVoice = () => {
        if (!supported) return next();
        const u = new window.SpeechSynthesisUtterance(it.text);
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
      if (!it.url || !audio) return viaVoice();
      audio.onended = next;
      // הקלטה שלא נטענה (למשל בלי רשת) – הקטע מוקרא בקול המכשיר
      audio.onerror = () => {
        audio.onerror = null;
        audio.onended = null;
        viaVoice();
      };
      audio.src = it.url;
      audio.volume = opts.volume ?? 1;
      audio.play().catch(() => audio.onerror?.());
    };
    setSpeaking(true);
    step(0);
  };

  /**
   * opts.wait – אם משהו מוקרא עכשיו, ההקראה מחכה שהוא יסתיים במקום לקטוע אותו
   * (למשל: עידו עבר לשאלה הבאה באמצע "הידעת?" – ההסבר נשמע עד הסוף, ואחריו השאלה).
   */
  const speak = useCallback(
    (input, opts = {}) => {
      if (opts.wait && activeRef.current) {
        const queued = [input, { ...opts, wait: false }];
        queuedRef.current = queued;
        // אם סוף ההקראה הנוכחית לא מדווח (קורה בכרום) – לא מחכים לנצח
        setTimeout(() => queuedRef.current === queued && speakRef.current?.(...queued), 30000);
        return;
      }
      const parts = (Array.isArray(input) ? input : [input]).map(toSpeech).filter(Boolean);
      if (!parts.length) return;
      if (speechLog) parts.forEach((t) => console.log(`SPOKEN\t${t}`));
      // קטעים שיש להם הקלטה מוכנה – מנגנים אותה (גם במכשיר בלי קול עברי)
      const items = parts.map((text) => ({ text, url: clipFor(text) }));
      const anyClip = items.some((it) => it.url);
      if (!supported && !anyClip) return;
      const busy = supported && (synth.speaking || synth.pending);
      cancel();
      const token = tokenRef.current;
      activeRef.current = true;
      const done = () => {
        if (token !== tokenRef.current) return;
        utterRef.current = [];
        activeRef.current = false;
        setSpeaking(false);
        const queued = queuedRef.current;
        queuedRef.current = null;
        if (queued) speakRef.current?.(...queued);
      };
      const run = () => {
        if (token !== tokenRef.current) return;
        if (anyClip) return playSequence(items, token, opts, done);
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
        return undefined;
      };
      // בכרום speak מיד אחרי cancel של הקראה פעילה לפעמים "נבלע" – רק אז מחכים רגע.
      // אחרת מקריאים מיד, כדי להישאר בתוך הנגיעה של המשתמש (נדרש ב-iOS)
      if (busy) timerRef.current = setTimeout(run, 120);
      else run();
    },
    [supported, voice, rate, cancel],
  );
  speakRef.current = speak;

  // עצירת הקראה כשהרכיב יורד מהמסך
  useEffect(
    () => () => {
      tokenRef.current += 1;
      clearTimeout(timerRef.current);
      utterRef.current = [];
      queuedRef.current = null;
      stopAudio();
      if (supported) synth.cancel();
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
