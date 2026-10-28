// מצבי המשחק של Game – דגלים פשוטים, כדי שהמנוע לא יתמלא בתנאים של mode === '...'
// turnBased – שחקנים מתחלפים בתורות (עם מסך "התור של…")
// mission – מסלול משימה ומדליות; boss – שאלת בוס בסוף; scoreboard – לוח תוצאות של אתגר
// parentHelp – העזרה ברמה הקלה מציעה רמז מאבא/אמא (לא באתגר, שבו ההורה יכול להיות היריב)

// באתגר: 5 שאלות לכל שחקן
export const DUEL_ROUNDS = 5;

const base = { turnBased: false, mission: false, boss: false, scoreboard: false, lifelines: 0, parentHelp: false };

export const GAME_MODES = {
  solo: base,
  topic: base,
  team: { ...base, turnBased: true, mission: true, boss: true, lifelines: 1, parentHelp: true },
  duel: { ...base, turnBased: true, scoreboard: true, lifelines: 1 },
};
