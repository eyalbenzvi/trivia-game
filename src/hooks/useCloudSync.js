import { useEffect, useRef, useState } from 'react';
import { cloudAvailable, FAMILY_ID, loadCloud, playersCollection } from '../sync/cloud';
import { REVIEW_MAX } from '../utils/game';

const WRITE_DELAY_MS = 800;

// מפתח להשוואה: מיקום ברשימה + כל נתוני השחקן. שינוי בו = צריך לשלוח לענן
const keyOf = (order, player) => `${order}|${JSON.stringify(player)}`;

const nameOf = (p) => String(p.name || '').trim();

// קוד המשפחה מהגרסה הקודמת – כבר לא בשימוש (הנתונים של כולם כבר בענן), רק מוחקים אותו
const LEGACY_KEY = 'family-trivia:family';
// המכשיר כבר קיבל פעם את הנתונים המשותפים
const JOINED_KEY = 'family-trivia:cloud-joined';
// מה שהמכשיר יודע שנמצא בענן: מזהה שחקן → טביעה של הגרסה. בעזרתו יודעים בפתיחה מה השתנה כאן
// בלי אינטרנט (ונשלח), ומה סתם ישן (ומתעדכן מהענן – כך מחיקה או איפוס במכשיר אחר לא "חוזרים")
const SYNCED_KEY = 'family-trivia:cloud-synced';
const RETRY_MS = 5000;
const storage = {
  get: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      if (v == null) window.localStorage.removeItem(k);
      else window.localStorage.setItem(k, v);
    } catch {
      // אין גישה לאחסון
    }
  },
};

// טביעה קצרה של שחקן (לא שומרים את כל הנתונים פעמיים)
const hashOf = (player) => {
  const str = JSON.stringify(player);
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return `${str.length}:${h >>> 0}`;
};
const readSynced = () => {
  try {
    const v = JSON.parse(storage.get(SYNCED_KEY));
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
};
const writeSynced = (map) => storage.set(SYNCED_KEY, JSON.stringify(map));

// שתי גרסאות של אותו שחקן: נשארת זו שענתה על יותר שאלות, ו"שאלות שנענו", המחברת והמדבקות מתאחדות
const mergePlayer = (p, r) => {
  const base = p.stats.totalAnswered > r.stats.totalAnswered ? p : r;
  const other = base === p ? r : p;
  return {
    ...base,
    id: r.id,
    stats: {
      ...base.stats,
      seen: [...new Set([...r.stats.seen, ...p.stats.seen])],
      review: [...new Set([...(other.stats.review || []), ...(base.stats.review || [])])].slice(-REVIEW_MAX),
    },
    stickers: [...new Set([...r.stickers, ...p.stickers])],
  };
};

/**
 * פתיחת המשחק: מאחדים את מה שבמכשיר עם מה שבענן.
 * - שחקן שלא השתנה כאן מאז הסנכרון האחרון → מהענן כמו שהוא (כולל איפוס שנעשה במכשיר אחר)
 * - שחקן שהשתנה כאן בלי אינטרנט → מתאחד עם הענן
 * - שחקן שנמחק בענן → נמחק גם כאן; שחקן שנמחק כאן בלי אינטרנט → יימחק גם בענן
 * - שחקן חדש שנוצר כאן → נשלח לענן
 */
const mergeLocalRemote = (local, remote, synced, joined) => {
  const result = [];
  const used = new Set();
  const legacy = !synced; // מכשיר שעוד לא שמר מה נמצא בענן (גרסה קודמת או מכשיר חדש)
  remote.forEach((r) => {
    const s = synced?.[r.id];
    const p = local.find((x) => !x.temporary && x.id === r.id) || (!joined && local.find((x) => !x.temporary && !used.has(x.id) && nameOf(x) && nameOf(x) === nameOf(r)));
    if (!p) {
      // נמחק כאן כשלא היה אינטרנט (והענן לא השתנה מאז) – לא מחזירים
      if (s && s === hashOf(r)) return;
      result.push(r);
      return;
    }
    used.add(p.id);
    if (s && s === hashOf(p)) result.push(r); // לא השתנה כאן
    else if (s) result.push(mergePlayer(p, r)); // השתנה כאן בלי אינטרנט
    else result.push(p.stats.totalAnswered > r.stats.totalAnswered ? mergePlayer(p, r) : r); // אין מידע – מעדיפים את הענן
  });
  local
    .filter((p) => !p.temporary && !used.has(p.id))
    .forEach((p) => {
      // היה בענן ונמחק במכשיר אחר
      if (synced?.[p.id]) return;
      // נוצר כאן ועוד לא הגיע לענן. במכשיר בלי מידע: רק שחקן עם התקדמות (אחרת זה שחקן ברירת מחדל שנמחק בענן)
      if (legacy && (joined || !p.stats.totalAnswered)) return;
      result.push(p);
    });
  return [...result, ...local.filter((p) => p.temporary)];
};

/**
 * סנכרון השחקנים עם הענן – נתונים אחד משותפים לכל המשפחה, בלי קוד ובלי הגדרות.
 * ההתקדמות ממשיכה להישמר במכשיר כמו קודם; כל שינוי נשלח לענן ושינויים ממכשירים אחרים מגיעים מיד.
 * אם אין אינטרנט – מנסים שוב כשהוא חוזר. אותו שחקן ששיחק בשני מכשירים בבת אחת – ההתקדמות מתאחדת.
 */
export function useCloudSync(players, setPlayers, revive) {
  const code = FAMILY_ID;
  const [status, setStatus] = useState('off'); // off | connecting | on | error
  const [tick, setTick] = useState(0);
  const [attempt, setAttempt] = useState(0); // ניסיון חיבור חוזר אחרי תקלה
  const known = useRef(new Map()); // מזהה שחקן → המפתח של הגרסה האחרונה שנשלחה לענן או הגיעה ממנו
  const inCloud = useRef(new Set()); // השחקנים שהופיעו בענן בעדכון האחרון
  const ready = useRef(false);
  const playersRef = useRef(players);
  playersRef.current = players;
  const reviveRef = useRef(revive);
  reviveRef.current = revive;

  const active = cloudAvailable;

  // אחרי תקלה: מנסים להתחבר שוב כשהאינטרנט חוזר או כשחוזרים למשחק
  useEffect(() => {
    if (status !== 'error') return undefined;
    const retry = () => {
      if (navigator.onLine !== false && document.visibilityState !== 'hidden') setAttempt((a) => a + 1);
    };
    const timer = setTimeout(retry, RETRY_MS * 6);
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', retry);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', retry);
    };
  }, [status]);

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
        const local = playersRef.current;
        const joined = Boolean(storage.get(JOINED_KEY) || storage.get(LEGACY_KEY));
        const merged = remote.length ? mergeLocalRemote(local, remote, readSynced(), joined) : local;
        writeSynced(Object.fromEntries(remote.map((p) => [p.id, hashOf(p)])));
        storage.set(JOINED_KEY, '1');
        storage.set(LEGACY_KEY, null);
        if (merged !== local) setPlayers(merged);
        ready.current = true;
        setTick((t) => t + 1); // שולח לענן את מה שקיים רק במכשיר
        setStatus('on');

        unsubscribe = f.onSnapshot(
          col,
          (snap) => {
            const list = reviveList(parse(snap.docs));
            const current = playersRef.current;
            const localKeys = new Map(current.filter((p) => !p.temporary).map((p, i) => [p.id, keyOf(i, p)]));
            // שינוי מקומי שעוד לא נשלח לענן לא נדרס – מתאחד עם מה שהגיע (אותו שחקן שיחק בשני מכשירים)
            const dirty = (id) => localKeys.has(id) && localKeys.get(id) !== known.current.get(id);
            const next = list.map((p, i) => {
              if (!dirty(p.id)) return p;
              const mine = current.find((c) => c.id === p.id);
              // רק אם גם בענן השתנה משהו מאז (אחרת – למשל אחרי איפוס כאן – הגרסה שלנו נשארת כמו שהיא)
              return keyOf(i, p) === known.current.get(p.id) ? mine : mergePlayer(mine, p);
            });
            const remoteIds = new Set(list.map((p) => p.id));
            // שחקן שהיה בענן ונעלם ממנו – נמחק במכשיר אחר, ונמחק גם כאן. שחקן שעוד לא הגיע לענן נשאר
            const deleted = (id) => inCloud.current.has(id) && !remoteIds.has(id);
            current.forEach((p) => {
              if (p.temporary || (!remoteIds.has(p.id) && !deleted(p.id))) next.push(p);
            });
            [...known.current.keys()].forEach((id) => deleted(id) && known.current.delete(id));
            list.forEach((p, i) => known.current.set(p.id, keyOf(i, p)));
            inCloud.current = remoteIds;
            // מה שבאמת שמור בענן (לא כתיבה שלנו שעוד בדרך)
            if (!snap.metadata.hasPendingWrites) writeSynced(Object.fromEntries(list.map((p) => [p.id, hashOf(p)])));
            const changed = next.length !== current.length || next.some((p, i) => p !== current[i] && JSON.stringify(p) !== JSON.stringify(current[i]));
            if (changed) setPlayers(next);
            setStatus('on');
          },
          () => {
            ready.current = false;
            setStatus('error');
          },
        );
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [active, code, setPlayers, attempt]);

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
        const saved = [];
        const removed = [];
        list.forEach((p, i) => {
          const key = keyOf(i, p);
          if (known.current.get(p.id) === key) return;
          known.current.set(p.id, key);
          saved.push(p);
          batch.set(f.doc(col, p.id), { data: JSON.stringify(p), order: i, updatedAt: Date.now() });
        });
        [...known.current.keys()].forEach((id) => {
          if (ids.has(id)) return;
          known.current.delete(id);
          batch.delete(f.doc(col, id));
          removed.push(id);
        });
        if (!saved.length && !removed.length) return;
        batch.commit().then(
          () => {
            const synced = readSynced() || {};
            saved.forEach((p) => (synced[p.id] = hashOf(p)));
            removed.forEach((id) => delete synced[id]);
            writeSynced(synced);
          },
          () => {
            // לא נשמר – מנסים שוב (גם מחיקה)
            saved.forEach((p) => known.current.delete(p.id));
            removed.forEach((id) => known.current.set(id, ''));
            setStatus('error');
            setTimeout(() => setTick((t) => t + 1), RETRY_MS);
          },
        );
      } catch {
        setStatus('error');
      }
    }, WRITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active, code, players, tick]);

  return { status };
}
