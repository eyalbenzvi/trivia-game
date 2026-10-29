import { avatars } from '../data/avatars';
import { getTheme } from '../data/themes';
import { isCustomImage } from '../utils/image';

const HairBack = ({ style, color }) => {
  if (style === 'long') {
    return <path d="M22 62 Q18 104 34 110 L86 110 Q102 104 98 62 Q96 30 60 26 Q24 30 22 62Z" fill={color} />;
  }
  if (style === 'bob') {
    return <path d="M22 62 Q19 98 30 100 L90 100 Q101 98 98 62 Q96 28 60 26 Q24 28 22 62Z" fill={color} />;
  }
  if (style === 'bun') {
    return <circle cx="60" cy="22" r="14" fill={color} />;
  }
  if (style === 'pigtails') {
    return (
      <g fill={color}>
        <ellipse cx="20" cy="70" rx="12" ry="18" />
        <ellipse cx="100" cy="70" rx="12" ry="18" />
      </g>
    );
  }
  return null;
};

const HairFront = ({ style, color }) => {
  switch (style) {
    case 'long':
    case 'pigtails':
      return <path d="M26 60 Q26 26 60 25 Q94 26 94 60 Q84 44 70 42 Q62 50 46 46 Q34 48 26 60Z" fill={color} />;
    case 'bun':
      return <path d="M27 60 Q26 28 60 27 Q94 28 93 60 Q86 44 72 40 Q60 46 48 40 Q34 44 27 60Z" fill={color} />;
    case 'bob':
      return <path d="M26 62 Q24 26 60 25 Q96 26 94 62 Q90 46 80 40 Q62 48 40 42 Q30 48 26 62Z" fill={color} />;
    case 'short':
      return <path d="M28 58 Q26 27 60 26 Q94 27 92 58 Q89 44 78 39 Q62 45 46 40 Q33 43 28 58Z" fill={color} />;
    case 'bald':
      // קרחת עם שיער בצדדים
      return (
        <g fill={color}>
          <ellipse cx="28" cy="57" rx="6" ry="11" />
          <ellipse cx="92" cy="57" rx="6" ry="11" />
        </g>
      );
    case 'spiky':
      return (
        <path
          d="M27 60 Q24 30 60 27 Q96 30 93 60 L86 47 L80 54 L73 42 L65 51 L58 39 L50 50 L43 41 L37 53 L32 46Z"
          fill={color}
        />
      );
    case 'curly':
      return (
        <g fill={color}>
          {[
            [30, 54, 11],
            [35, 40, 12],
            [47, 31, 12],
            [60, 28, 12],
            [73, 31, 12],
            [85, 40, 12],
            [90, 54, 11],
            [52, 40, 9],
            [68, 40, 9],
          ].map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
          ))}
        </g>
      );
    default:
      return null;
  }
};

function KidFace({ preset }) {
  const { hair, hairColor, skin, accessory, bowColor, capColor } = preset;
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
      <HairBack style={hair} color={hairColor} />
      {/* אוזניים */}
      <circle cx="26" cy="68" r="7" fill={skin} />
      <circle cx="94" cy="68" r="7" fill={skin} />
      {/* ראש */}
      <circle cx="60" cy="66" r="34" fill={skin} />
      {/* עיניים */}
      <ellipse cx="47" cy="65" rx="4.5" ry="5.5" fill="#2d2a32" />
      <ellipse cx="73" cy="65" rx="4.5" ry="5.5" fill="#2d2a32" />
      <circle cx="48.6" cy="63" r="1.6" fill="#fff" />
      <circle cx="74.6" cy="63" r="1.6" fill="#fff" />
      {/* לחיים */}
      <circle cx="38" cy="77" r="6" fill="#ff8fa3" opacity="0.45" />
      <circle cx="82" cy="77" r="6" fill="#ff8fa3" opacity="0.45" />
      {/* זקן ושפם – מתחת לחיוך, כדי שהחיוך ייראה */}
      {accessory === 'beard' && (
        <g fill={hairColor}>
          <path d="M27 68 Q28 106 60 108 Q92 106 93 68 Q88 90 74 92 Q60 96 46 92 Q32 90 27 68Z" />
          <path d="M47 80 Q54 74 60 78 Q66 74 73 80 Q66 85 60 82 Q54 85 47 80Z" />
        </g>
      )}
      {accessory === 'glasses-mustache' && <path d="M47 80 Q54 74 60 78 Q66 74 73 80 Q66 85 60 82 Q54 85 47 80Z" fill={hairColor} />}
      {hair === 'bald' && (
        // קמטי מצח עדינים
        <g stroke="#c98e6a" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7">
          <path d="M48 44 Q60 40 72 44" />
          <path d="M51 50 Q60 47 69 50" />
        </g>
      )}
      {/* חיוך */}
      <path d="M49 79 Q60 90 71 79" stroke="#7a3b2e" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <HairFront style={hair} color={hairColor} />
      {accessory === 'earrings' && (
        <g fill="#f59e0b">
          <circle cx="25" cy="78" r="3.5" />
          <circle cx="95" cy="78" r="3.5" />
        </g>
      )}
      {(accessory === 'glasses' || accessory === 'glasses-mustache') && (
        <g stroke="#3f3d56" strokeWidth="2.6" fill="rgba(255,255,255,0.25)">
          <circle cx="47" cy="65" r="10" />
          <circle cx="73" cy="65" r="10" />
          <path d="M57 64 Q60 61 63 64" fill="none" />
        </g>
      )}
      {accessory === 'cap' && (
        <g>
          <path d="M26 50 Q28 20 60 20 Q92 20 94 50Z" fill={capColor} />
          <path d="M60 46 Q30 44 14 52 Q30 56 60 52Z" fill={capColor} opacity="0.85" />
          <circle cx="60" cy="21" r="4" fill="#fff" />
        </g>
      )}
      {(hair === 'long' || hair === 'pigtails') && bowColor && (
        <g fill={bowColor}>
          <path d="M84 30 L100 22 L98 40Z" />
          <path d="M84 30 L72 18 L70 34Z" />
          <circle cx="84" cy="30" r="4.5" />
        </g>
      )}
    </svg>
  );
}

// הגודל נקבע ברוחב + aspect-square, ו-max-w-full בתמונה עצמה: בכרטיס צר (למשל בטקסט מוגדל) העיגול מתכווץ ולא גולש מהכרטיס
const sizes = {
  // לוח התוצאות של האתגר – תמונה קטנה שנכנסת בשורה אחת עם השם והניקוד
  xs: 'w-8 text-xl sm:w-10 sm:text-2xl short:w-7 short:text-lg',
  sm: 'w-12 text-3xl',
  md: 'w-20 text-5xl',
  // "מי משחק?" במסך הבית – תמונות גדולות שגם מי שלא קורא מזהה
  pick: 'w-24 text-6xl md:w-32 md:text-7xl short:w-20 short:text-5xl',
  lg: 'w-28 text-7xl',
  xl: 'w-36 text-8xl',
};

/**
 * תמונת שחקן. decorative – כשהשם כתוב ממש ליד התמונה: התמונה לא מוקראת (alt ריק),
 * כדי שקורא מסך לא יגיד את השם פעמיים.
 */
export default function Avatar({ avatar, theme, size = 'md', className = '', decorative = false }) {
  const custom = isCustomImage(avatar);
  const preset = custom ? { type: 'image', src: avatar, label: 'תמונה' } : avatars[avatar] || avatars.fox;
  const t = getTheme(theme);
  return (
    <div
      className={`relative aspect-square max-w-full shrink-0 overflow-hidden rounded-full bg-gradient-to-br ${t.gradient} p-1 shadow-pop-sm ${sizes[size]} ${className}`}
    >
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white/85"
        // הדמויות המצוירות הן SVG בלי טקסט – השם שלהן נמסר כאן
        {...(preset.type === 'kid' && !decorative ? { role: 'img', 'aria-label': preset.label } : {})}
      >
        {preset.type === 'image' ? (
          // האיורים מגיעים עם מסגרת עגולה משלהם – מגדילים מעט כדי שהמסגרת שלנו תחליף אותה
          <img src={preset.src} alt={decorative ? '' : preset.label} draggable="false" className={`h-full w-full object-cover ${custom ? '' : 'scale-[1.1]'}`} />
        ) : preset.type === 'kid' ? (
          <KidFace preset={preset} />
        ) : (
          <span className="select-none leading-none" {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': preset.label })}>
            {preset.emoji}
          </span>
        )}
      </div>
    </div>
  );
}
