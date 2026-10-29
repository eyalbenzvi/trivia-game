import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import Background from './components/Background';
import ProfileSelect from './components/ProfileSelect';
import ProfileEditor from './components/ProfileEditor';
import PlayerHub from './components/PlayerHub';
import HomeButton from './components/HomeButton';
import Game from './components/Game';
import Summary from './components/Summary';
import StickerBook from './components/StickerBook';
import TeamSetup from './components/TeamSetup';
import TeamSummary from './components/TeamSummary';
import DuelSummary from './components/DuelSummary';
import TwentyQuestions from './components/TwentyQuestions';
import TimedGame from './components/TimedGame';
import TimedSummary from './components/TimedSummary';
import { usePlayers } from './hooks/usePlayers';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useQuestionBank } from './hooks/useQuestionBank';
import { missions } from './data/missions';
import { DUEL_ROUNDS } from './utils/modes';
import { playClick, setSoundEnabled } from './utils/sound';
import { requestLeave } from './utils/nav';
import { smooth } from './utils/motion';
import { topicList } from './utils/game';

function LoadingBank({ error, onRetry, onBack }) {
  // טעינה ארוכה מדי – מציעים לנסות שוב (בלי להעלים את מסך הטעינה)
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (error) return undefined;
    setSlow(false);
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [error, attempt]);
  const retry = () => {
    setAttempt((n) => n + 1);
    onRetry();
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-4 sm:px-6">
      <header className="mb-5 flex">
        <HomeButton onClick={onBack} />
      </header>
      {error ? (
        <section role="alert" className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <div className="text-6xl" aria-hidden="true">
            📡
          </div>
          <h1 className="text-2xl font-bold text-slate-700">לא הצלחנו לטעון את השאלות</h1>
          <p className="text-slate-600">כדאי לבדוק את החיבור לאינטרנט ולנסות שוב.</p>
          <button type="button" autoFocus className="btn bg-sky-700 text-white hover:bg-sky-800" onClick={retry}>
            לנסות שוב
          </button>
        </section>
      ) : (
        <section role="status" aria-busy="true" className="text-center">
          {/* שלד של כרטיס שאלה – כדי שהמעבר למשחק לא "יקפוץ" */}
          <div className="card p-4 text-start sm:p-6" aria-hidden="true">
            <div className="h-14 animate-pulse rounded-2xl bg-slate-200" />
            <div className="mt-4 h-4 w-11/12 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-5 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          </div>
          <p className="mt-5 text-2xl font-bold text-slate-700">מכינים שאלות…</p>
          {slow && (
            <div className="mt-3 flex flex-col items-center gap-3">
              <p className="text-lg font-medium text-slate-700">לוקח קצת זמן… אפשר לחכות עוד רגע או לנסות שוב</p>
              <button type="button" className="btn btn-white text-sky-800" onClick={retry}>
                לנסות שוב
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

// שמות המסכים לכותרת הלשונית (המשחק עצמו מעדכן אותה לפי השאלה)
const SCREEN_TITLES = {
  home: 'בית',
  game: 'משחק',
  topic: 'משחק',
  summary: 'סיכום',
  stickers: 'חדר הפרסים',
  timed: 'מרוץ',
  'timed-summary': 'סיכום',
  'team-setup': 'משחק משפחתי',
  'team-game': 'משחק משפחתי',
  'team-summary': 'סיכום',
  'duel-game': 'אתגר',
  'duel-summary': 'סיכום',
  twenty: '20 שאלות',
};

export default function App() {
  const { players, updatePlayer, addPlayer, removePlayer, restorePlayer, resetProgress, replaceAll, saveFailed } = usePlayers();
  // הודעת "ההתקדמות לא נשמרת" מוצגת פעם אחת – אחרי סגירה לא חוזרת עד טעינה מחדש
  const [saveNoticeDismissed, setSaveNoticeDismissed] = useState(false);
  const [onboarded, setOnboarded] = useLocalStorage('family-trivia:onboarded', false, { revive: (v) => v === true });
  const { bank, error: bankError, retry: retryBank } = useQuestionBank();
  const [soundOn, setSoundOn] = useLocalStorage('family-trivia:sound', true);
  const [teamConfig, setTeamConfig] = useLocalStorage('family-trivia:team', null, { revive: (c) => (c && Array.isArray(c.playerIds) ? { ...c, playerIds: c.playerIds.filter((id) => typeof id === 'string'), rounds: [3, 4, 6].includes(c.rounds) ? c.rounds : 4, mission: typeof c.mission === 'string' ? c.mission : 'moon' } : null) });
  // home | game | summary | stickers | team-setup | team-game | team-summary | duel-game | duel-summary | timed | timed-summary | twenty
  const [screen, setScreen] = useState('home');
  const [activeId, setActiveId] = useState(null);
  const [gameKey, setGameKey] = useState(0);
  const [result, setResult] = useState(null);
  const [editor, setEditor] = useState(null); // { player } | { player: null } לשחקן חדש
  const [hubId, setHubId] = useState(null); // הדף של השחקן (חלון) שנפתח מהתמונה במסך הבית

  const active = players.find((p) => p.id === activeId);
  const hubPlayer = screen === 'home' ? players.find((p) => p.id === hubId) : null;
  const teamPlayers = (teamConfig?.playerIds || []).map((id) => players.find((p) => p.id === id)).filter(Boolean);
  // האתגר נשמר רק בזיכרון (לא יחד עם הגדרות המשחק המשפחתי) – לצורך "משחק חוזר"
  const [duelIds, setDuelIds] = useState(null);
  const duelPlayers = (duelIds || []).map((id) => players.find((p) => p.id === id)).filter(Boolean);

  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  // אם השחקן הפעיל נמחק – חוזרים למסך הבית
  useEffect(() => {
    const soloScreens = ['game', 'topic', 'summary', 'stickers', 'timed', 'timed-summary'];
    if (soloScreens.includes(screen) && !active) setScreen('home');
    if (['team-game', 'team-summary'].includes(screen) && teamPlayers.length < 2) setScreen('team-setup');
    if (['duel-game', 'duel-summary'].includes(screen) && duelPlayers.length !== 2) setScreen('team-setup');
  }, [screen, active, teamPlayers.length, duelPlayers.length]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: smooth() });
  }, [screen, gameKey]);

  // useLayoutEffect רץ לפני האפקטים הרגילים של המסך, כך שהמשחק יכול לדרוס את הכותרת עם מספר השאלה
  useLayoutEffect(() => {
    document.title = `${SCREEN_TITLES[screen] || 'בית'} · טריוויה משפחתית`;
  }, [screen]);

  // קונפטי ממסך הסיכום לא ממשיך לרדת על המסך הבא.
  // useLayoutEffect רץ לפני האפקטים של המסך החדש, כך שחגיגה של המסך החדש לא נמחקת
  useLayoutEffect(() => {
    confetti.reset();
  }, [screen]);

  const startGame = useCallback((player) => {
    playClick();
    setActiveId(player.id);
    setResult(null);
    setGameKey((k) => k + 1);
    setScreen('game');
  }, []);

  const startTeamGame = useCallback(
    (config) => {
      playClick();
      if (config) setTeamConfig(config);
      setResult(null);
      setGameKey((k) => k + 1);
      setScreen('team-game');
    },
    [setTeamConfig],
  );

  // אתגר: שני שחקנים. "משחק חוזר" הופך את הסדר – כך השני מתחיל
  const startDuel = useCallback(({ playerIds }) => {
    playClick();
    setDuelIds(playerIds);
    setResult(null);
    setGameKey((k) => k + 1);
    setScreen('duel-game');
  }, []);

  // אתגר שהסתיים (לא אתגר שנעצר באמצע) נספר לשני השחקנים – למדבקה "קרב ראשון",
  // ולמאזן מול היריב (duelRecord: ניצחונות, תיקו ומשחקים – בלי "הפסדים")
  const finishDuel = (r) => {
    const correctOf = (id) => r?.perPlayer?.[id]?.correct || 0;
    duelIds.forEach((id) => {
      const rival = duelIds.find((x) => x !== id);
      const mine = correctOf(id);
      const theirs = correctOf(rival);
      updatePlayer(id, (p) => {
        const rec = p.stats.duelRecord?.[rival] || { wins: 0, ties: 0, games: 0 };
        return {
          ...p,
          stats: {
            ...p.stats,
            duels: (p.stats.duels || 0) + 1,
            duelRecord: rival
              ? { ...p.stats.duelRecord, [rival]: { wins: rec.wins + (mine > theirs ? 1 : 0), ties: rec.ties + (mine === theirs ? 1 : 0), games: rec.games + 1 } }
              : p.stats.duelRecord,
          },
        };
      });
    });
    setResult(r);
    setScreen('duel-summary');
  };

  // category – "עוד סבב באותו נושא" (בלי בחירת נושא)
  const [topicCategory, setTopicCategory] = useState(null);
  const startTopic = useCallback((player, category = null) => {
    playClick();
    setTopicCategory(category);
    setActiveId(player.id);
    setResult(null);
    setGameKey((k) => k + 1);
    setScreen('topic');
  }, []);

  const startTimed = useCallback((player) => {
    playClick();
    setActiveId(player.id);
    setResult(null);
    setGameKey((k) => k + 1);
    setScreen('timed');
  }, []);

  const openStickers = useCallback((player) => {
    playClick();
    setActiveId(player.id);
    setScreen('stickers');
  }, []);

  const goHome = useCallback(() => setScreen('home'), []);

  // "ביטול" אחרי איפוס או מחיקה של שחקן – הודעה עם כפתור ביטול ל־20 שניות.
  // כשהאצבע/הפוקוס על ההודעה הזמן עוצר, ואחרי שעוזבים נשארות עוד 10 שניות
  const [undo, setUndo] = useState(null); // { text, kind, restore }
  const undoTimer = useRef(null);
  const hideUndoIn = (ms) => {
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), ms);
  };
  // "ביטול" אחרי איפוס/מחיקה – רק לפני שמתחילים לשחק (אחרת השחזור היה מוחק את מה ששוחק בינתיים)
  useEffect(() => {
    if (screen !== 'home') setUndo(null);
  }, [screen]);
  const offerUndo = (text, kind, restore) => {
    setUndo({ text, kind, restore });
    hideUndoIn(20000);
  };
  const resetWithUndo = (id) => {
    const snapshot = players.find((p) => p.id === id);
    if (!snapshot) return;
    resetProgress(id);
    setEditor(null);
    offerUndo(`ההתקדמות של ${snapshot.name} אופסה`, 'reset', () => updatePlayer(id, () => snapshot));
  };
  const deleteWithUndo = (id) => {
    const index = players.findIndex((p) => p.id === id);
    const snapshot = players[index];
    if (!snapshot) return;
    removePlayer(id);
    setEditor(null);
    offerUndo(`${snapshot.name} ${snapshot.gender === 'f' ? 'נמחקה' : 'נמחק'}`, 'delete', () => restorePlayer(snapshot, index));
  };

  // כפתור Back בטלפון: נשארים בתוך המשחק. סוגר את חלון העריכה, אחר כך את הדף של השחקן, חוזר לדף הבית,
  // ובאמצע משחק שואל קודם. בדף הבית הוא פשוט לא עושה כלום (לא יוצא מהאתר).
  const navState = useRef({});
  navState.current = { screen, editorOpen: Boolean(editor), hubOpen: Boolean(hubPlayer) };
  // לבדיקת גרסה חדשה (main.jsx): טוענים מחדש רק כשלא באמצע משחק או עריכה
  window.__triviaScreen = editor ? 'editor' : screen;
  useEffect(() => {
    // דפדפנים מדלגים ב-Back על רשומת היסטוריה שנוספה בלי לחיצה של המשתמש,
    // ולכן מוסיפים אותה בלחיצה הראשונה (ושוב אחרי כל Back)
    let armed = false;
    const arm = () => {
      if (armed) return;
      armed = true;
      window.history.pushState({ trivia: true }, '');
    };
    const onPop = () => {
      armed = false;
      // מחזירים מיד רשומה, כדי שגם Back שני ברצף (בלי לחיצה באמצע) יישאר במשחק
      arm();
      const { screen: current, editorOpen, hubOpen } = navState.current;
      if (editorOpen) setEditor(null);
      else if (hubOpen) setHubId(null);
      else if (current !== 'home') requestLeave(() => setScreen('home'));
    };
    window.addEventListener('pointerdown', arm, true);
    window.addEventListener('keydown', arm, true);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('pointerdown', arm, true);
      window.removeEventListener('keydown', arm, true);
      window.removeEventListener('popstate', onPop);
    };
  }, []);
  const toggleSound = () => setSoundOn((v) => !v);

  const saveProfile = (data) => {
    if (editor?.player) updatePlayer(editor.player.id, data);
    else addPlayer(data);
    setEditor(null);
  };

  const finish = (summaryScreen) => (r) => {
    setResult(r);
    setScreen(summaryScreen);
  };

  return (
    <div dir="rtl" lang="he" className="min-h-app">
      <Background />

      {screen === 'home' && (
        <ProfileSelect
          players={players}
          onOpen={(player) => (playClick(), setHubId(player.id))}
          onTeam={() => (playClick(), setScreen('team-setup'))}
          onTwenty={() => (playClick(), setScreen('twenty'))}
          onAdd={() => setEditor({ player: null })}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          showOnboarding={!onboarded && !players.some((p) => p.stats.gamesPlayed > 0)}
          onDismissOnboarding={() => setOnboarded(true)}
          saveFailed={saveFailed && !saveNoticeDismissed}
          onDismissSaveFailed={() => setSaveNoticeDismissed(true)}
          onRestore={replaceAll}
        />
      )}

      {['game', 'topic', 'team-game', 'duel-game', 'timed'].includes(screen) && !bank && <LoadingBank error={bankError} onRetry={retryBank} onBack={goHome} />}

      {screen === 'game' && active && bank && (
        <Game
          key={gameKey}
          mode="solo"
          players={[active]}
          bank={bank}
          onUpdatePlayer={updatePlayer}
          onFinish={finish('summary')}
          onQuit={goHome}
          soundOn={soundOn}
          onToggleSound={toggleSound}
        />
      )}

      {screen === 'topic' && active && bank && (
        <Game
          key={gameKey}
          mode="topic"
          initialCategory={topicCategory}
          players={[active]}
          bank={bank}
          onUpdatePlayer={updatePlayer}
          onFinish={finish('summary')}
          onQuit={goHome}
          soundOn={soundOn}
          onToggleSound={toggleSound}
        />
      )}

      {screen === 'timed' && active && bank && (
        <TimedGame
          key={gameKey}
          player={active}
          bank={bank}
          onUpdatePlayer={updatePlayer}
          onFinish={finish('timed-summary')}
          onQuit={goHome}
          soundOn={soundOn}
          onToggleSound={toggleSound}
        />
      )}

      {screen === 'timed-summary' && active && result && (
        <TimedSummary player={active} result={result} onPlayAgain={() => startTimed(active)} onHome={goHome} onStickers={() => openStickers(active)} />
      )}

      {screen === 'team-setup' && <TeamSetup players={players} initial={teamConfig} onStart={startTeamGame} onStartDuel={startDuel} onBack={goHome} />}

      {screen === 'team-game' && bank && teamPlayers.length >= 2 && (
        <Game
          key={gameKey}
          mode="team"
          players={teamPlayers}
          bank={bank}
          rounds={teamConfig.rounds}
          mission={missions[teamConfig.mission] || missions.moon}
          onUpdatePlayer={updatePlayer}
          onFinish={finish('team-summary')}
          onQuit={goHome}
          soundOn={soundOn}
          onToggleSound={toggleSound}
        />
      )}

      {screen === 'duel-game' && bank && duelPlayers.length === 2 && (
        <Game
          key={gameKey}
          mode="duel"
          players={duelPlayers}
          bank={bank}
          rounds={DUEL_ROUNDS}
          onUpdatePlayer={updatePlayer}
          onFinish={finishDuel}
          onQuit={goHome}
          soundOn={soundOn}
          onToggleSound={toggleSound}
        />
      )}

      {screen === 'duel-summary' && result && duelPlayers.length === 2 && (
        <DuelSummary players={duelPlayers} result={result} onPlayAgain={() => startDuel({ playerIds: [...duelIds].reverse() })} onHome={goHome} />
      )}

      {screen === 'twenty' && <TwentyQuestions players={players} onHome={goHome} />}

      {screen === 'summary' && active && result && (
        <Summary
          player={active}
          result={result}
          onPlayAgain={() => (result.mode === 'topic' ? startTopic(active, result.focusCategory) : startGame(active))}
          onOtherTopic={() => startTopic(active)}
          topicDone={result.mode === 'topic' && Boolean(bank) && !topicList(bank, active, [result.focusCategory])[0]?.playable}
          onSetDifficulty={(difficulty) => updatePlayer(active.id, { difficulty })}
          onSwitchPlayer={goHome}
          onStickers={() => openStickers(active)}
        />
      )}

      {screen === 'team-summary' && result && (
        <TeamSummary players={teamPlayers} result={result} onPlayAgain={() => startTeamGame()} onHome={goHome} />
      )}

      {screen === 'stickers' && active && <StickerBook player={active} bank={bank} onBack={goHome} onPlay={() => startGame(active)} />}

      {hubPlayer && (
        <PlayerHub
          key={hubPlayer.id}
          player={hubPlayer}
          onClose={() => setHubId(null)}
          onPlay={startGame}
          onTopic={startTopic}
          onTimed={startTimed}
          onStickers={openStickers}
          onEdit={(player) => setEditor({ player })}
        />
      )}

      {editor && (
        <ProfileEditor
          key={editor.player?.id || 'new'}
          player={editor.player}
          players={players}
          onSave={saveProfile}
          onClose={() => setEditor(null)}
          onDelete={deleteWithUndo}
          onReset={resetWithUndo}
        />
      )}

      {/* אזור ההודעה תמיד קיים, כדי שקורא מסך יכריז על ההודעה כשהיא מופיעה */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
        role="status"
        aria-live="polite"
      >
        {undo && (
          <div
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-800 px-4 py-3 text-white shadow-pop animate-pop"
            onPointerEnter={() => clearTimeout(undoTimer.current)}
            onPointerLeave={() => hideUndoIn(10000)}
            onFocus={() => clearTimeout(undoTimer.current)}
            onBlur={() => hideUndoIn(10000)}
          >
            <span className="font-bold">{undo.text}</span>
            <button
              type="button"
              className="min-h-[48px] shrink-0 rounded-xl bg-white px-4 font-bold text-slate-800"
              aria-label={undo.kind === 'delete' ? 'ביטול המחיקה' : 'ביטול האיפוס'}
              onClick={() => {
                undo.restore();
                clearTimeout(undoTimer.current);
                setUndo(null);
              }}
            >
              ↩ ביטול
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
