import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { defaultPlayers, emptyStats } from '../data/profiles';
import { findNewStickers } from '../data/stickers';

const STORAGE_KEY = 'family-trivia:players:v1';

// שחקני אורח לא נשמרים בין טעינות
const serialize = (players) => players.filter((p) => !p.temporary);

// מוודא שלכל שחקן יש את כל השדות (גם אם נשמר בגרסה ישנה)
const revive = (players) => {
  if (!Array.isArray(players) || players.length === 0) return defaultPlayers();
  return players.map((p) => ({
    ...p,
    stats: { ...emptyStats(), ...(p.stats || {}) },
    stickers: Array.isArray(p.stickers) ? p.stickers : [],
  }));
};

const withStickers = (player) => {
  const fresh = findNewStickers(player);
  return fresh.length ? { ...player, stickers: [...player.stickers, ...fresh] } : player;
};

export function usePlayers() {
  const [players, setPlayers] = useLocalStorage(STORAGE_KEY, defaultPlayers, { serialize, revive });

  const updatePlayer = useCallback(
    (id, updater) =>
      setPlayers((prev) =>
        prev.map((p) => (p.id === id ? withStickers(typeof updater === 'function' ? updater(p) : { ...p, ...updater }) : p)),
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

  const resetProgress = useCallback(
    (id) => setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, stats: emptyStats(), stickers: [] } : p))),
    [setPlayers],
  );

  return { players, updatePlayer, addPlayer, removePlayer, resetProgress };
}
