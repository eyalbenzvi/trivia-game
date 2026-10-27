// אפקטים קוליים קטנים שנוצרים ב-Web Audio API – בלי קבצי שמע חיצוניים.
let ctx = null;
let enabled = true;

export const setSoundEnabled = (value) => {
  enabled = value;
};

const getCtx = () => {
  if (!enabled || typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

const tone = (freq, start, duration, { type = 'sine', volume = 0.18 } = {}) => {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
};

export const playClick = () => tone(660, 0, 0.08, { type: 'triangle', volume: 0.12 });

export const playCorrect = () => {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.25, { type: 'triangle' }));
};

export const playWrong = () => {
  tone(330, 0, 0.22, { type: 'sine', volume: 0.14 });
  tone(262, 0.18, 0.32, { type: 'sine', volume: 0.12 });
};

export const playFanfare = () => {
  const notes = [523.25, 523.25, 659.25, 783.99, 659.25, 783.99, 1046.5];
  const times = [0, 0.12, 0.24, 0.36, 0.56, 0.68, 0.84];
  notes.forEach((f, i) => tone(f, times[i], i === notes.length - 1 ? 0.6 : 0.18, { type: 'square', volume: 0.07 }));
};

export const playUnlock = () => {
  [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tone(f, i * 0.07, 0.3, { type: 'sine', volume: 0.12 }));
};

// "רגע, חושבים" – צליל רך ונמוך (בלי להעליב), אחרי כמה טעויות ברצף במרוץ
export const playThink = () => {
  tone(392, 0, 0.18, { type: 'sine', volume: 0.1 });
  tone(349.23, 0.2, 0.18, { type: 'sine', volume: 0.1 });
  tone(392, 0.4, 0.3, { type: 'sine', volume: 0.1 });
};

// מדליה במשימה המשפחתית
export const playMedal = () => {
  [659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => tone(f, i * 0.11, 0.35, { type: 'triangle', volume: 0.14 }));
};
