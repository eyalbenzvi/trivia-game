import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Lightbulb, Star, Trophy, Volume2 } from 'lucide-react';
import Modal from './Modal';
import SpeakingBars from './SpeakingBars';
import { getCategoryMeta } from '../data/questions';
import { numeralOf } from './QuestionCard';

/**
 * חלון "הידעת?" אחרי כל תשובה.
 * נסגר רק כשהשחקן לוחץ על "המשך" – אף פעם לא אוטומטית.
 * chosen – התשובה שהשחקן בחר (מוצגת אחרי טעות, ברמות הקוראות).
 */
export default function FactModal({ open, ...props }) {
  if (!open || !props.question) return null;
  return <FactBody {...props} />;
}

function FactBody({ question, visual, correct, earned, chosen, onNext, isLast, nextLabel, onRead, speaking, speechSupported }) {
  const meta = getCategoryMeta(question.category);
  const answer = question.options[question.correctIndex];
  // ברמה הקלה (מי שעוד לא קורא) – מראים את התמונה של התשובה הנכונה, עם המילה מתחתיה
  const answerPicture = visual ? question.optionEmojis?.[question.correctIndex] : null;
  // החלון עולה בדיוק איפה שהיו התשובות: לחיצה שנייה מאוחרת של ילד לא סוגרת אותו מיד
  const openedAt = useRef(Date.now());
  const next = () => {
    if (Date.now() - openedAt.current < 400) return;
    onNext();
  };
  // הגוף נגלל בתוך החלון, וכפתור ההמשך תמיד גלוי מתחתיו. כשיש עוד טקסט למטה – מראים חץ עדין
  const bodyRef = useRef(null);
  const [more, setMore] = useState(false);
  const measure = useCallback(() => {
    const el = bodyRef.current;
    if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);
  // אחרי טעות (בלי תמונה) מוצגת שורת "בחרת" בתחתית האיור – הכוכב המקשט לא יושב עליה בטלפון צר
  const showChosen = !answerPicture && !correct && chosen != null;

  return (
    <Modal open label="הידעת?" dismissible={false} className="!flex max-w-xl flex-col !overflow-hidden">
      <div ref={bodyRef} onScroll={measure} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* כרטיס איור */}
        {/* במסך נמוך (טלפון לרוחב) האיור קטן ובשורה אחת עם התשובה – כדי שטקסט "הידעת?" ייראה מיד */}
        <div
          className={`relative flex flex-col items-center overflow-hidden bg-gradient-to-br ${meta.banner} px-6 pb-4 pt-6 sm:pb-6 sm:pt-8 compact:pb-3 compact:pt-4 short:flex-row short:justify-center short:gap-3 short:px-12 short:py-2`}
        >
          <span className="absolute right-6 top-4 text-3xl opacity-70 animate-float short:right-3 short:top-2 short:text-xl" aria-hidden="true">✨</span>
          <span
            className={`absolute bottom-4 left-8 text-2xl opacity-70 animate-float short:bottom-1 short:left-3 short:text-lg ${showChosen ? 'hidden sm:block short:hidden' : ''}`}
            style={{ animationDelay: '1s' }}
            aria-hidden="true"
          >
            ⭐
          </span>
          <span className="absolute left-6 top-6 text-2xl opacity-60 animate-float short:hidden" style={{ animationDelay: '.5s' }} aria-hidden="true">
            {meta.emoji}
          </span>
          <div className="relative shrink-0 animate-pop">
            <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full border-8 border-white/70 bg-white text-[60px] shadow-soft sm:h-[128px] sm:w-[128px] sm:text-[72px] compact:h-[80px] compact:w-[80px] compact:text-[48px] short:h-12 short:w-12 short:border-4 short:text-3xl">
              {numeralOf(answerPicture) ? (
                // ספרה בעיגול – כמו בתשובות עצמן (במקום אימוג'י של מקש)
                <span className="font-display font-extrabold text-slate-800">{numeralOf(answerPicture)}</span>
              ) : (
                answerPicture || question.icon
              )}
            </div>
            {/* בתמונות: סימן על פינת התמונה במקום משפט – ✓ כשצדקו, חיבוק כשלא */}
            {answerPicture && (
              <span
                className={`absolute -bottom-1 -end-1 flex h-11 w-11 items-center justify-center rounded-full text-2xl ring-4 ring-white short:h-7 short:w-7 short:text-base short:ring-2 ${
                  correct ? 'bg-emerald-700 text-white' : 'bg-amber-100'
                }`}
                aria-hidden="true"
              >
                {correct ? <Check size={26} strokeWidth={3.5} className="short:h-4 short:w-4" /> : '🤗'}
              </span>
            )}
          </div>
          {answerPicture ? (
            <>
              {/* המילה מופיעה פעם אחת, מתחת לתמונה; לקורא מסך – גם אם צדקו */}
              <div className="mt-2 text-2xl font-black text-slate-800 short:mt-0 short:text-xl">
                <span className="sr-only">{correct ? 'צדקת! ' : 'התשובה הנכונה: '}</span>
                {answer}
              </div>
              {correct && earned > 0 && (
                <div
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-1.5 text-lg font-bold text-white shadow-pop-sm animate-pop short:mt-0 short:py-1 short:text-base"
                  style={{ animationDelay: '120ms' }}
                >
                  <bdi dir="ltr">+{earned}</bdi>
                  <Star size={20} className="fill-yellow-200 text-yellow-200" aria-hidden="true" />
                  <span className="sr-only">כוכבים</span>
                </div>
              )}
            </>
          ) : correct ? (
            <div
              className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-base font-bold text-white shadow-pop-sm animate-pop sm:mt-4 sm:px-5 sm:text-lg compact:mt-2 short:mt-0 short:py-1 short:text-base"
              style={{ animationDelay: '120ms' }}
            >
              צדקת! {earned > 0 && <bdi dir="ltr">+{earned}</bdi>}
              {earned > 0 && <Star size={20} className="fill-yellow-200 text-yellow-200" aria-hidden="true" />}
              {earned > 0 && <span className="sr-only">כוכבים</span>}
            </div>
          ) : (
            <div className="mt-3 flex min-w-0 max-w-full flex-col items-center gap-1 sm:mt-4 compact:mt-2 short:mt-0">
              <div
                className="inline-flex max-w-full items-center gap-2 rounded-3xl bg-amber-100 px-4 py-2 text-base font-bold text-amber-900 shadow-pop-sm ring-2 ring-amber-300 animate-pop sm:px-5 sm:text-lg short:py-1 short:text-base"
                style={{ animationDelay: '120ms' }}
              >
                ✓ התשובה הנכונה: {answer}
              </div>
              {chosen != null && <div className="max-w-full px-2 text-center text-base font-medium text-slate-700 [overflow-wrap:anywhere]">✗ בחרת: {chosen}</div>}
            </div>
          )}
        </div>

        <div className="p-5 pb-4 text-center sm:p-8 sm:pb-5 compact:pt-4 short:px-5 short:pb-2 short:pt-2">
          <h2 className="mb-2 inline-flex items-center gap-2 text-2xl font-bold text-amber-700 sm:mb-3 sm:text-3xl short:mb-1 short:text-xl">
            <Lightbulb size={32} className="fill-amber-300 text-amber-600 short:h-6 short:w-6" aria-hidden="true" />
            הידעת?
          </h2>
          <p className="mx-auto max-w-[34ch] text-start text-lg font-medium leading-[1.7] text-slate-700 sm:text-2xl short:text-base">{question.explanation}</p>
        </div>
      </div>

      {/* יש עוד טקסט למטה – חץ עדין מעל הכפתורים (לחיצה עליו גוללת) */}
      {more && (
        <div className="relative h-0">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => bodyRef.current?.scrollBy({ top: bodyRef.current.clientHeight * 0.7, behavior: 'smooth' })}
            className="absolute inset-x-0 bottom-0 flex h-10 items-end justify-center bg-gradient-to-t from-white via-white/80 to-white/0 pb-0.5 text-amber-700"
          >
            <ChevronDown size={26} strokeWidth={3} className="animate-bounce" />
          </button>
        </div>
      )}

      <div className="shrink-0 px-5 text-center sm:px-8">
        {/* שורה אחת נמוכה – כדי שלטקסט "הידעת?" יישאר מקום גם בטקסט מוגדל */}
        <div className="flex flex-row items-stretch gap-2 border-t border-slate-100 bg-white pb-4 pt-3 sm:gap-3 sm:pb-8 compact:pb-3 short:pb-3 short:pt-2">
          {speechSupported && (
            // בטלפון לאורך – סמל עם מילה קטנה מתחתיו (כמו כפתורי הכותרת), כדי שלכפתור ההמשך יישאר רוחב
            <button
              type="button"
              onClick={onRead}
              aria-label={speaking ? 'מקריא…' : 'הקראה'}
              className="btn btn-white shrink-0 flex-col gap-0 px-2.5 py-1.5 text-xs text-sky-700 sm:flex-row sm:gap-2 sm:px-5 sm:py-3 sm:text-base short:flex-row short:gap-2 short:px-3 short:text-base"
            >
              {speaking ? <SpeakingBars /> : <Volume2 size={22} />}
              <span aria-hidden="true">{speaking ? 'מקריא…' : 'הקראה'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={next}
            autoFocus
            className="btn relative min-w-0 flex-1 overflow-hidden bg-emerald-700 py-3.5 text-lg leading-tight text-white hover:bg-emerald-800 sm:py-4 sm:text-xl short:whitespace-nowrap short:py-2.5 short:text-lg"
          >
            {isLast ? (
              <>
                <Trophy size={24} />
                לסיכום המשחק
              </>
            ) : (
              <>
                {nextLabel || (
                  <>
                    <span className="sm:hidden short:hidden">המשך</span>
                    <span className="hidden sm:inline short:inline">המשך לשאלה הבאה</span>
                  </>
                )}
                <ArrowLeft size={24} strokeWidth={3} />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
