import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useCloudSync } from './useCloudSync';
import { defaultPlayers, emptyStats } from '../data/profiles';
import { findNewStickers, stickerById } from '../data/stickers';
import { REVIEW_MAX } from '../utils/game';

const STORAGE_KEY = 'family-trivia:players:v1';

// שחקני אורח לא נשמרים בין טעינות
const serialize = (players) => players.filter((p) => !p.temporary);

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
// מונים לפי נושא / לפי משך מרוץ – רק מספרים תקינים
const counts = (v) => (isObj(v) ? Object.fromEntries(Object.entries(v).filter(([, n]) => Number.isFinite(n) && n >= 0)) : {});

const reviveStats = (s) => {
  const st = isObj(s) ? s : {};
  return {
    ...emptyStats(),
    stars: num(st.stars),
    gamesPlayed: num(st.gamesPlayed),
    totalCorrect: num(st.totalCorrect),
    totalAnswered: num(st.totalAnswered),
    bestStreak: num(st.bestStreak),
    perfectGames: num(st.perfectGames),
    categoryCorrect: counts(st.categoryCorrect),
    seen: Array.isArray(st.seen) ? [...new Set(st.seen.filter((x) => typeof x === 'string'))] : [],
    timedBest: counts(st.timedBest),
    review: Array.isArray(st.review) ? st.review.filter((x) => typeof x === 'string').slice(-REVIEW_MAX) : [],
    recent: Array.isArray(st.recent) ? st.recent.filter((r) => isObj(r) && Number.isFinite(r.c) && Number.isFinite(r.t)).slice(-3) : [],
    championCorrect: num(st.championCorrect),
    duels: num(st.duels),
  };
};

const withStickers = (player) => {
  const fresh = findNewStickers(player);
  return fresh.length ? { ...player, stickers: [...player.stickers, ...fresh] } : player;
};

// מוודא שלכל שחקן יש את כל השדות ושהם תקינים (גם אם נשמר בגרסה ישנה או נפגם).
// מדבקות שהוסרו מהמשחק נמחקות, ומדבקות חדשות שהשחקן כבר זכאי להן ניתנות מיד.
const revive = (players) => {
  const list = Array.isArray(players) ? players.filter((p) => isObj(p) && typeof p.id === 'string' && p.id) : [];
  if (!list.length) return defaultPlayers();
  const ids = new Set();
  return list
    .filter((p) => !ids.has(p.id) && ids.add(p.id))
    .map((p) =>
      withStickers({
        ...p,
        name: String(p.name ?? '').slice(0, 20),
        age: typeof p.age === 'string' || Number.isFinite(p.age) ? String(p.age).slice(0, 10) : '',
        avatar: typeof p.avatar === 'string' ? p.avatar : 'fox',
        autoRead: Boolean(p.autoRead),
        stats: reviveStats(p.stats),
        stickers: Array.isArray(p.stickers) ? [...new Set(p.stickers.filter((id) => stickerById[id]))] : [],
      }),
    );
};

// שחקני אורח קיימים רק בלשונית הזו – שומרים אותם כשמגיע עדכון מלשונית אחרת
const merge = (incoming, prev) => [...incoming, ...prev.filter((p) => p.temporary && !incoming.some((q) => q.id === p.id))];

export function usePlayers() {
  const [players, setPlayers, { saveFailed }] = useLocalStorage(STORAGE_KEY, defaultPlayers, { serialize, revive, merge });
  useCloudSync(players, setPlayers, revive);

  const updatePlayer = useCallback(
    (id, updater) =>
      setPlayers((prev) =>
        // מדבקות מחושבות רק אחרי משחק (פונקציה). עריכת פרטים (אובייקט, למשל החלפת רמה) לא מחלקת מדבקות –
        // חלק מהיעדים תלויים ברמה, ואחרת החלפת רמה הייתה נותנת מדבקה בלי לשחק
        prev.map((p) => (p.id === id ? (typeof updater === 'function' ? withStickers(updater(p)) : { ...p, ...updater }) : p)),
      ),
    [setPlayers],
  );

  const addPlayer = useCallback(
    (data) => {
      const id = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      setPlayers((prev) => [...prev, { ...data, id, builtIn: false, stats: emptyStats(), stickers: [] }]);
      return id;
    },
    [setPlayers],
  );

  const removePlayer = useCallback((id) => setPlayers((prev) => prev.filter((p) => p.id !== id)), [setPlayers]);

  // החזרת שחקן שנמחק ("ביטול" אחרי מחיקה) – למקום שבו היה
  const restorePlayer = useCallback(
    (player, index) =>
      setPlayers((prev) => {
        if (prev.some((p) => p.id === player.id)) return prev;
        const next = [...prev];
        next.splice(Math.min(Math.max(index, 0), next.length), 0, player);
        return next;
      }),
    [setPlayers],
  );

  const resetProgress = useCallback(
    (id) => setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, stats: emptyStats(), stickers: [] } : p))),
    [setPlayers],
  );

  // saveFailed: השמירה במכשיר נכשלה (אחסון מלא/חסום) – ההתקדמות לא תישמר
  return { players, updatePlayer, addPlayer, removePlayer, restorePlayer, resetProgress, saveFailed };
}
