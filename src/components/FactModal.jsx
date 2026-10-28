import { ArrowLeft, Lightbulb, Star, Trophy, Volume2 } from 'lucide-react';
import Modal from './Modal';
import { getCategoryMeta } from '../data/questions';

/**
 * חלון "הידעת?" אחרי כל תשובה.
 * נסגר רק כשהשחקן לוחץ על "המשך" – אף פעם לא אוטומטית.
 */
export default function FactModal({ open, ...props }) {
  if (!open || !props.question) return null;
  return <FactBody {...props} />;
}

function FactBody({ question, visual, correct, earned, onNext, isLast, nextLabel, onRead, speaking, speechSupported }) {
  const meta = getCategoryMeta(question.category);
  const answer = question.options[question.correctIndex];
  // ברמה הקלה (מי שעוד לא קורא) – מראים את התמונה של התשובה הנכונה, עם המילה מתחתיה
  const answerPicture = visual ? question.optionEmojis?.[question.correctIndex] : null;

  return (
    <Modal open label="הידעת?" dismissible={false} className="max-w-xl">
      {/* כרטיס איור */}
      {/* במסך נמוך (טלפון לרוחב) האיור קטן ובשורה אחת עם התשובה – כדי שטקסט "הידעת?" ייראה מיד */}
      <div
        className={`relative flex flex-col items-center overflow-hidden bg-gradient-to-br ${meta.banner} px-6 pb-4 pt-6 sm:pb-6 sm:pt-8 compact:pb-3 compact:pt-4 short:flex-row short:justify-center short:gap-3 short:px-12 short:py-2`}
      >
        <span className="absolute right-6 top-4 text-3xl opacity-70 animate-float short:right-3 short:top-2 short:text-xl" aria-hidden="true">✨</span>
        <span className="absolute bottom-4 left-8 text-2xl opacity-70 animate-float short:bottom-1 short:left-3 short:text-lg" style={{ animationDelay: '1s' }} aria-hidden="true">
          ⭐
        </span>
        <span className="absolute left-6 top-6 text-2xl opacity-60 animate-float short:hidden" style={{ animationDelay: '.5s' }} aria-hidden="true">
          {meta.emoji}
        </span>
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-8 border-white/70 bg-white text-6xl shadow-soft animate-pop sm:h-32 sm:w-32 sm:text-7xl compact:h-20 compact:w-20 compact:text-5xl short:h-12 short:w-12 short:border-4 short:text-3xl">
          {answerPicture || question.icon}
        </div>
        {answerPicture && <div className="mt-2 text-2xl font-black text-slate-800 short:mt-0 short:text-xl">{answer}</div>}
        <div
          className={`mt-3 inline-flex max-w-full items-center gap-2 rounded-full px-4 py-2 text-base font-bold sm:mt-4 sm:px-5 sm:text-lg compact:mt-2 short:mt-0 short:py-1 short:text-base text-white shadow-pop-sm animate-pop ${
            correct ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
          style={{ animationDelay: '120ms' }}
        >
          {correct ? (
            <>
              צדקת! {earned > 0 && <bdi dir="ltr">+{earned}</bdi>}
              {earned > 0 && <Star size={20} className="fill-yellow-200 text-yellow-200" />}
            </>
          ) : (
            <>התשובה הנכונה: {answer}</>
          )}
        </div>
      </div>

      <div className="p-5 pb-0 text-center sm:p-8 sm:pb-0 compact:pt-4 short:px-5 short:pt-2">
        <h2 className="mb-2 inline-flex items-center gap-2 text-2xl font-bold text-amber-500 sm:mb-3 sm:text-3xl short:mb-1 short:text-xl">
          <Lightbulb size={32} className="fill-amber-200 short:h-6 short:w-6" />
          הידעת?
        </h2>
        <p className="text-lg font-medium leading-relaxed text-slate-700 sm:text-2xl short:text-base short:leading-relaxed">{question.explanation}</p>

        <div className="sticky bottom-0 -mx-5 mt-5 flex flex-col-reverse items-stretch gap-2 bg-white px-5 pb-5 pt-3 sm:-mx-8 sm:mt-7 sm:flex-row sm:gap-3 sm:px-8 sm:pb-8 compact:pb-4 short:mx-[-1.25rem] short:mt-3 short:flex-row short:px-5 short:pb-3 short:pt-2">
          {speechSupported && (
            <button type="button" onClick={onRead} className={`btn btn-white text-sky-600 short:px-3 ${speaking ? 'animate-pulse' : ''}`}>
              <Volume2 size={22} />
              הקראה
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            autoFocus
            className="btn relative flex-1 overflow-hidden bg-gradient-to-l from-emerald-500 to-teal-400 py-4 text-xl text-white hover:from-emerald-600 hover:to-teal-500 short:whitespace-nowrap short:py-2.5 short:text-lg"
          >
            {isLast ? (
              <>
                <Trophy size={24} />
                לסיכום המשחק
              </>
            ) : (
              <>
                {nextLabel || 'המשך לשאלה הבאה'}
                <ArrowLeft size={24} strokeWidth={3} />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
