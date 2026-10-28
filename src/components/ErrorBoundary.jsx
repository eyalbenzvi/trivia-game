import { Component } from 'react';

const PREFIX = 'family-trivia:';

// מוחק את כל נתוני המשחק השמורים (שחקנים, הגדרות) וטוען מחדש
const resetData = () => {
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // אחסון חסום – אין מה למחוק
  }
  window.location.reload();
};

/** תופס שגיאה בזמן ציור המסך, כדי שלא יישאר מסך לבן */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div dir="rtl" lang="he" className="min-h-screen">
        <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="text-6xl">🙈</div>
          <p className="text-2xl font-bold text-slate-700">אופס, משהו השתבש</p>
          <p className="max-w-md text-slate-500">
            אפשר לנסות לטעון שוב. אם זה לא עוזר, איפוס הנתונים יחזיר את המשחק להתחלה (הכוכבים והמדבקות יימחקו).
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" className="btn bg-sky-700 text-white hover:bg-sky-800" onClick={() => window.location.reload()}>
              לנסות שוב
            </button>
            <button
              type="button"
              className="btn btn-white text-rose-600"
              onClick={() => window.confirm('למחוק את כל השחקנים וההתקדמות שנשמרו?') && resetData()}
            >
              איפוס נתונים
            </button>
          </div>
        </main>
      </div>
    );
  }
}
