// משימות למשחק המשפחתי: כל תשובה נכונה מקדמת את הצוות לעבר היעד
export const missions = {
  moon: {
    id: 'moon',
    name: 'טסים לירח',
    description: 'כל תשובה נכונה מקרבת את החללית לירח',
    start: '🌍',
    mover: '🚀',
    goal: '🌕',
    color: 'from-indigo-400 to-sky-300',
    success: 'נחתנו על הירח!',
    fail: 'כמעט הגענו לירח!',
  },
  treasure: {
    id: 'treasure',
    name: 'המסע אל האוצר',
    description: 'מפליגים יחד אל אי המטמון',
    start: '🏝️',
    mover: '⛵',
    goal: '💰',
    color: 'from-cyan-400 to-emerald-300',
    success: 'מצאנו את האוצר!',
    fail: 'האוצר כבר באופק!',
  },
  summit: {
    id: 'summit',
    name: 'טיפוס לפסגה',
    description: 'מטפסים ביחד אל ראש ההר',
    start: '⛺',
    mover: '🧗',
    goal: '🏔️',
    color: 'from-emerald-400 to-amber-300',
    success: 'הגענו לפסגה!',
    fail: 'עוד קצת ומגיעים לפסגה!',
  },
};

export const missionList = Object.values(missions);
