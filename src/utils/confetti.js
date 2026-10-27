import confetti from 'canvas-confetti';

const base = { disableForReducedMotion: true, zIndex: 60 };
const colors = ['#ff8787', '#ffd43b', '#51cf66', '#4dabf7', '#b197fc', '#f783ac'];

// כל קריאה ל-clearConfetti מגדילה את המונה – לולאות celebrate ישנות נעצרות
let generation = 0;
const timers = new Set();
const later = (fn, ms) => {
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
  }, ms);
  timers.add(t);
};

/** עוצר את כל הקונפטי (כשעוברים מסך – שלא ימשיך לרדת על המסך הבא) */
export const clearConfetti = () => {
  generation += 1;
  timers.forEach(clearTimeout);
  timers.clear();
  confetti.reset();
};

export const burstCorrect = (streak = 0) => {
  confetti({ ...base, particleCount: 110, spread: 80, startVelocity: 45, origin: { y: 0.65 }, colors });
  if (streak >= 3) {
    later(() => {
      confetti({ ...base, particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors });
      confetti({ ...base, particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors });
    }, 180);
  }
};

/** חגיגה גדולה. small – גרסה עדינה (למשל לשיא ראשון). מחזיר פונקציה שעוצרת את החגיגה */
export const celebrate = (durationMs = 2500, { small = false } = {}) => {
  const end = Date.now() + durationMs;
  const gen = generation;
  const particleCount = small ? 2 : 4;
  let stopped = false;
  const frame = () => {
    if (stopped || gen !== generation) return;
    confetti({ ...base, particleCount, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors });
    confetti({ ...base, particleCount, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  return () => {
    stopped = true;
  };
};

export const starBurst = () => {
  confetti({
    ...base,
    particleCount: 50,
    spread: 100,
    startVelocity: 30,
    shapes: ['star'],
    scalar: 1.4,
    colors: ['#ffd43b', '#fcc419', '#ffe066'],
    origin: { y: 0.45 },
  });
};

/** קונפטי קטן במקום שבו נמצא אלמנט (למשל מדבקה שנלחצה בחדר הפרסים) */
export const sparkleAt = (el) => {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = (r.left + r.width / 2) / window.innerWidth;
  const y = (r.top + r.height / 2) / window.innerHeight;
  confetti({ ...base, particleCount: 24, spread: 70, startVelocity: 18, scalar: 0.8, ticks: 80, origin: { x, y }, colors });
};
