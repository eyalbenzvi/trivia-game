// "יציאה מוגנת": משחק פעיל רושם כאן פונקציה שפותחת את חלון "לחזור לדף הבית?".
// כפתור ה-Back של הטלפון עובר דרכה, כדי שלחיצה בטעות לא תפסיק משחק באמצע.
let guard = null;

export const setLeaveGuard = (fn) => {
  guard = fn;
  return () => {
    if (guard === fn) guard = null;
  };
};

/** מבקש לחזור לדף הבית: אם יש משחק פעיל – הוא מחליט (שואל), אחרת – leave() */
export const requestLeave = (leave) => (guard ? guard() : leave());
