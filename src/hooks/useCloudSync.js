import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { cloudAvailable, loadCloud, normalizeCode, playersCollection, CODE_LENGTH } from '../sync/cloud';

const WRITE_DELAY_MS = 800;

// מפתח להשוואה: מיקום ברשימה + כל נתוני השחקן. שינוי בו = צריך לשלוח לענן
const keyOf = (order, player) => `${order}|${JSON.stringify(player)}`;

const nameOf = (p) => String(p.name || '').trim();

/**
 * חיבור מכשיר למשפחה קיימת: שחקן שקיים בשני הצדדים (לפי מזהה או לפי שם) נשאר בגרסה
 * שענתה על יותר שאלות, ורשימות "שאלות שנענו" והמדבקות מתאחדות. שחקן שקיים רק במכשיר – מתווסף.
 */
const mergeOnJoin = (local, remote) => {
  const result = [...remote];
  local
    .filter((p) => !p.temporary)
    .forEach((p) => {
      const i = result.findIndex((r) => r.id === p.id) >= 0 ? result.findIndex((r) => r.id === p.id) : result.findIndex((r) => nameOf(r) && nameOf(r) === nameOf(p));
      if (i < 0) {
        result.push(p);
        return;
      }
      const r = result[i];
      const base = p.stats.totalAnswered > r.stats.totalAnswered ? p : r;
      result[i] = {
        ...base,
        id: r.id,
        stats: { ...base.stats, seen: [...new Set([...r.stats.seen, ...p.stats.seen])] },
        stickers: [...new Set([...r.stickers, ...p.stickers])],
      };
    });
  return [...result, ...local.filter((p) => p.temporary)];
};

/**
 * סנכרון השחקנים עם הענן. ההתקדמות ממשיכה להישמר במכשיר כמו קודם;
 * כשהמכשיר מחובר לקוד משפחה, כל שינוי נשלח לענן ושינויים ממכשירים אחרים מגיעים מיד.
 * אין פתרון להתנגשויות: הכתיבה האחרונה של כל שחקן קובעת.
 */
export function useCloudSync(players, setPlayers, revive) {
  const [code, setCode] = useLocalStorage('family-trivia:family', null, {
    revive: (v) => (typeof v === 'string' && normalizeCode(v).length >= CODE_LENGTH ? normalizeCode(v) : null),
  });
  const [status, setStatus] = useState('off'); // off | connecting | on | error
  const [tick, setTick] = useState(0);
  const known = useRef(new Map()); // מזהה שחקן → המפתח של הגרסה האחרונה שנשלחה לענן או הגיעה ממנו
  const inCloud = useRef(new Set()); // השחקנים שהופיעו בענן בעדכון האחרון
  const ready = useRef(false);
  const playersRef = useRef(players);
  playersRef.current = players;
  const reviveRef = useRef(revive);
  reviveRef.current = revive;

  const active = cloudAvailable && Boolean(code);

  // התחברות והאזנה לשינויים
  useEffect(() => {
    ready.current = false;
    known.current = new Map();
    inCloud.current = new Set();
    if (!active) {
      setStatus('off');
      return undefined;
    }
    setStatus('connecting');
    let cancelled = false;
    let unsubscribe = null;

    const parse = (docs) =>
      docs
        .map((d) => {
          try {
            return { order: d.data().order ?? 0, player: JSON.parse(d.data().data) };
          } catch {
            return null;
          }
        })
        .filter((x) => x && x.player && typeof x.player.id === 'string')
        .sort((a, b) => a.order - b.order);
    // השחקנים מהענן עוברים את אותו תיקון נתונים כמו מהמכשיר
    const reviveList = (list) => (list.length ? reviveRef.current(list.map((x) => x.player)) : []);

    (async () => {
      try {
        const f = await loadCloud();
        const col = playersCollection(f, code);
        const first = await f.getDocs(col);
        if (cancelled) return;
        const remote = reviveList(parse(first.docs));
        remote.forEach((p, i) => known.current.set(p.id, keyOf(i, p)));
        inCloud.current = new Set(remote.map((p) => p.id));
        const merged = remote.length ? mergeOnJoin(playersRef.current, remote) : playersRef.current;
        if (merged !== playersRef.current) setPlayers(merged);
        ready.current = true;
        setTick((t) => t + 1); // שולח לענן את מה שקיים רק במכשיר
        setStatus('on');

        unsubscribe = f.onSnapshot(
          col,
          (snap) => {
            const list = reviveList(parse(snap.docs));
            const current = playersRef.current;
            const localKeys = new Map(current.filter((p) => !p.temporary).map((p, i) => [p.id, keyOf(i, p)]));
            // שינוי מקומי שעוד לא נשלח לענן לא נדרס
            const dirty = (id) => localKeys.has(id) && localKeys.get(id) !== known.current.get(id);
            const next = list.map((p) => (dirty(p.id) ? current.find((c) => c.id === p.id) : p));
            const remoteIds = new Set(list.map((p) => p.id));
            // שחקן שהיה בענן ונעלם ממנו – נמחק במכשיר אחר, ונמחק גם כאן. שחקן שעוד לא הגיע לענן נשאר
            const deleted = (id) => inCloud.current.has(id) && !remoteIds.has(id);
            current.forEach((p) => {
              if (p.temporary || (!remoteIds.has(p.id) && !deleted(p.id))) next.push(p);
            });
            [...known.current.keys()].forEach((id) => deleted(id) && known.current.delete(id));
            list.forEach((p, i) => known.current.set(p.id, keyOf(i, p)));
            inCloud.current = remoteIds;
            const changed = next.length !== current.length || next.some((p, i) => p !== current[i] && JSON.stringify(p) !== JSON.stringify(current[i]));
            if (changed) setPlayers(next);
            setStatus('on');
          },
          () => setStatus('error'),
        );
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [active, code, setPlayers]);

  // שליחת שינויים לענן (מקובצים – לא בכל לחיצה)
  useEffect(() => {
    if (!active || !ready.current) return undefined;
    const timer = setTimeout(async () => {
      try {
        const f = await loadCloud();
        const col = playersCollection(f, code);
        const list = players.filter((p) => !p.temporary);
        const ids = new Set(list.map((p) => p.id));
        // כל השינויים נשלחים יחד, כדי שמכשיר אחר לא יראה רשימה חלקית
        const batch = f.writeBatch(f.db);
        const sent = [];
        list.forEach((p, i) => {
          const key = keyOf(i, p);
          if (known.current.get(p.id) === key) return;
          known.current.set(p.id, key);
          sent.push(p.id);
          batch.set(f.doc(col, p.id), { data: JSON.stringify(p), order: i, updatedAt: Date.now() });
        });
        [...known.current.keys()].forEach((id) => {
          if (ids.has(id)) return;
          known.current.delete(id);
          batch.delete(f.doc(col, id));
          sent.push(id);
        });
        if (!sent.length) return;
        batch.commit().catch(() => {
          sent.forEach((id) => known.current.delete(id));
          setStatus('error');
        });
      } catch {
        setStatus('error');
      }
    }, WRITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active, code, players, tick]);

  const connect = useCallback((value) => setCode(normalizeCode(value)), [setCode]);
  const disconnect = useCallback(() => setCode(null), [setCode]);

  return { available: cloudAvailable, code: active ? code : null, status, connect, disconnect };
}
