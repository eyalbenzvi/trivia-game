import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // "Noto Color Emoji" נטען רק לתווי הדגלים (ראו index.html) – בווינדוס דגלים מוצגים אחרת כשתי אותיות.
        // "Apple Color Emoji" לפניו: באייפון ובמק ספארי לא מצייר את הגופן הצבעוני של Noto (הדגל יוצא ריק),
        // אז שם משתמשים בדגלים של המערכת; במכשירים אחרים אין את הגופן הזה וממשיכים ל-Noto
        sans: ['Heebo', 'Assistant', '"Apple Color Emoji"', '"Noto Color Emoji"', 'system-ui', 'sans-serif', '"Segoe UI Emoji"'],
        display: ['Rubik', 'Heebo', '"Apple Color Emoji"', '"Noto Color Emoji"', 'system-ui', 'sans-serif', '"Segoe UI Emoji"'],
      },
      colors: {
        sky: { soft: '#dff3ff' },
        sunny: { 50: '#fffbea', 100: '#fff3c4', 300: '#ffe066', 400: '#ffd43b', 500: '#fcc419' },
        mint: { 50: '#ecfdf5', 100: '#d3f9e8', 300: '#8ce99a', 400: '#51cf66', 500: '#37b24d' },
        coral: { 50: '#fff1ee', 100: '#ffe0d9', 300: '#ffa8a0', 400: '#ff8787', 500: '#fa5252' },
      },
      boxShadow: {
        pop: '0 6px 0 0 rgba(0,0,0,0.12)',
        'pop-sm': '0 4px 0 0 rgba(0,0,0,0.12)',
        soft: '0 10px 30px -10px rgba(30, 41, 59, 0.25)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-10px)' },
          '40%': { transform: 'translateX(10px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(4deg)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        celebrate: {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        // מחוון הקראה (3 פסים)
        eq: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        // טיימר בשניות האחרונות
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.12)' },
        },
        // הודעת עונש שעולה ונעלמת
        'float-up': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-16px)', opacity: '0' },
        },
        // כניסת הבוס
        'drop-shake': {
          '0%': { transform: 'translateY(-40px)', opacity: '0' },
          '40%': { transform: 'translateY(0)', opacity: '1' },
          '55%': { transform: 'translateX(-8px)' },
          '70%': { transform: 'translateX(8px)' },
          '85%': { transform: 'translateX(-4px)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        shake: 'shake 0.5s ease-in-out',
        pop: 'pop 0.45s cubic-bezier(.2,.9,.3,1.3) both',
        float: 'float 3.5s ease-in-out infinite',
        wiggle: 'wiggle 1.2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.25s ease-out both',
        celebrate: 'celebrate 0.6s ease-in-out',
        eq: 'eq 0.8s ease-in-out infinite',
        heartbeat: 'heartbeat 1s ease-in-out infinite',
        'float-up': 'float-up 0.9s ease-out forwards',
        'drop-shake': 'drop-shake 0.8s ease-out both',
      },
    },
  },
  plugins: [
    // מסכים נמוכים (טווחים נפרדים): compact – טלפון קטן לאורך (501–700px גובה), short – טלפון לרוחב (עד 500px גובה).
    // ‏:root מעלה את הספציפיות – כך הם גוברים על sm:/md: (שנוצרים אחריהם) – כדי שהשאלה והתשובות ייכנסו למסך בלי גלילה.
    // (לא ב-screens: מסכי raw מבטלים את הווריאנטים min-[...] של Tailwind)
    plugin(({ addVariant }) => {
      addVariant('compact', '@media (min-height: 501px) and (max-height: 700px) { :root & }');
      addVariant('short', '@media (max-height: 500px) { :root & }');
      // tight – טלפון לאורך בגובה 701–800px (מתחת לזה compact): לתשובות בתמונות, כדי שכל שלוש ייכנסו בלי לגלול
      addVariant('tight', '@media (min-height: 701px) and (max-height: 800px) and (max-width: 639px) { :root & }');
    }),
  ],
};
