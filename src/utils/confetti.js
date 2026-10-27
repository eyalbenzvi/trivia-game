import confetti from 'canvas-confetti';

const base = { disableForReducedMotion: true, zIndex: 60 };
const colors = ['#ff8787', '#ffd43b', '#51cf66', '#4dabf7', '#b197fc', '#f783ac'];

export const burstCorrect = (streak = 0) => {
  confetti({ ...base, particleCount: 110, spread: 80, startVelocity: 45, origin: { y: 0.65 }, colors });
  if (streak >= 3) {
    setTimeout(() => {
      confetti({ ...base, particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors });
      confetti({ ...base, particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors });
    }, 180);
  }
};

export const celebrate = (durationMs = 2500) => {
  const end = Date.now() + durationMs;
  const frame = () => {
    confetti({ ...base, particleCount: 4, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors });
    confetti({ ...base, particleCount: 4, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
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
