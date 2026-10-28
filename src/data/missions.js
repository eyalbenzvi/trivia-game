// משימות למשחק המשפחתי: כל תשובה נכונה מקדמת את הצוות לעבר היעד.
// במקום "הצלחה / כישלון" יש שלוש מדליות לאורך המסלול: 50% / 70% / 90% מהתשובות
export const missions = {
  moon: {
    id: 'moon',
    name: 'טסים לירח',
    description: 'כל תשובה נכונה מקרבת את החללית לירח',
    start: '🌍',
    mover: '🚀',
    goal: '🌕',
    toMover: 'לחללית',
    reach: 'לירח',
    color: 'from-indigo-400 to-sky-300',
    medals: ['יצאנו לדרך!', 'נחתנו על הירח!', 'נחיתה מושלמת על הירח!'],
    goldLabel: 'נחיתה מושלמת',
    fail: 'הדלק נגמר קצת לפני – עוד משימה?',
  },
  treasure: {
    id: 'treasure',
    name: 'המסע אל האוצר',
    description: 'מפליגים יחד אל אי המטמון',
    start: '🏝️',
    mover: '⛵',
    goal: '💰',
    toMover: 'לסירה',
    reach: 'לאוצר',
    color: 'from-cyan-400 to-emerald-300',
    medals: ['הפלגנו לדרך!', 'מצאנו את האוצר!', 'מצאנו את כל האוצר!'],
    goldLabel: 'כל האוצר',
    fail: 'הרוח נחלשה קצת לפני האי – עוד משימה?',
  },
  summit: {
    id: 'summit',
    name: 'טיפוס לפסגה',
    description: 'מטפסים ביחד אל ראש ההר',
    start: '⛺',
    mover: '🧗',
    goal: '🏔️',
    toMover: 'למטפסים',
    reach: 'לפסגה',
    color: 'from-emerald-400 to-amber-300',
    medals: ['יצאנו לטיפוס!', 'הגענו לפסגה!', 'פסגה מושלמת!'],
    goldLabel: 'פסגה מושלמת',
    fail: 'עצרנו לנוח קצת לפני הפסגה – עוד משימה?',
  },
};

export const missionList = Object.values(missions);

export const MEDALS = [
  { id: 'bronze', emoji: '🥉', label: 'ארד', share: 0.5 },
  { id: 'silver', emoji: '🥈', label: 'כסף', share: 0.7 },
  { id: 'gold', emoji: '🥇', label: 'זהב', share: 0.9 },
];

/** ספי המדליות (מספר תשובות נכונות) למשימה עם total תורות. כסף = היעד של המשימה */
export const teamMilestones = (total) => {
  const [bronze, silver, gold] = MEDALS.map((m) => Math.max(1, Math.ceil(total * m.share)));
  return { bronze, silver: Math.max(silver, bronze), gold: Math.max(gold, silver), goal: silver };
};

/** כמה מדליות הצוות השיג (0–3) */
export const medalsFor = (correct, total) => {
  const m = teamMilestones(total);
  return [m.bronze, m.silver, m.gold].filter((n) => correct >= n).length;
};

/**
 * כותרת סיום לפי מספר המדליות – אין מסך כישלון, רק עידוד.
 * בלי מדליות – לפי כמה מהדרך עברנו (correct מתוך goal = היעד, נקודת הכסף)
 */
export const missionHeadline = (mission, medals, correct = 0, goal = 1) => {
  if (medals) return mission.medals[medals - 1];
  const r = correct / Math.max(1, goal);
  if (r >= 0.75) return `כמעט הגענו ${mission.reach}! ${mission.mover}`;
  if (r >= 0.5) return `עברנו חצי מהדרך ${mission.reach}! ${mission.mover}`;
  return `יצאנו לדרך ${mission.reach}! ${mission.mover}`;
};
