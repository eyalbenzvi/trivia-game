import { useCallback, useEffect, useState } from 'react';
import Background from './components/Background';
import ProfileSelect from './components/ProfileSelect';
import ProfileEditor from './components/ProfileEditor';
import Game from './components/Game';
import Summary from './components/Summary';
import StickerBook from './components/StickerBook';
import TeamSetup from './components/TeamSetup';
import TeamSummary from './components/TeamSummary';
import TimedGame from './components/TimedGame';
import TimedSummary from './components/TimedSummary';
import { usePlayers } from './hooks/usePlayers';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useQuestionBank } from './hooks/useQuestionBank';
import { missions } from './data/missions';
import { playClick, setSoundEnabled } from './utils/sound';

function LoadingBank({ error, onRetry, onBack }) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      {error ? (
        <>
          <div className="text-6xl">📡</div>
          <p className="text-2xl font-bold text-slate-700">לא הצלחנו לטעון את השאלות</p>
          <p className="text-slate-500">כדאי לבדוק את החיבור לאינטרנט ולנסות שוב.</p>
          <div className="flex gap-3">
            <button type="button" className="btn bg-sky-500 text-white hover:bg-sky-600" onClick={onRetry}>
              לנסות שוב
            </button>
            <button type="button" className="btn btn-white" onClick={onBack}>
              חזרה
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="animate-wiggle text-7xl">🧠</div>
          <p className="text-2xl font-bold text-slate-600">מכינים שאלות...</p>
        </>
      )}
    </main>
  );
}

export default function App() {
  const { players, updatePlayer, addPlayer, removePlayer, resetProgress } = usePlayers();
  const { bank, error: bankError, retry: retryBank } = useQuestionBank();
  const [soundOn, setSoundOn] = useLocalStorage('family-trivia:sound', true);
  const [teamConfig, setTeamConfig] = useLocalStorage('family-trivia:team', null, { revive: (c) => (c && Array.isArray(c.playerIds) ? { ...c, playerIds: c.playerIds.filter((id) => typeof id === 'string'), rounds: [3, 4, 6].includes(c.rounds) ? c.rounds : 4, mission: typeof c.mission === 'string' ? c.mission : 'moon' } : null) });
  // home | game | summary | stickers | team-setup | team-game | team-summary | timed | timed-summary
  const [screen, setScreen] = useState('home');
  const [activeId, setActiveId] = useState(null);
  const [gameKey, setGameKey] = useState(0);
  const [result, setResult] = useState(null);
  const [editor, setEditor] = useState(null); // { player } | { player: null } לשחקן חדש

  const active = players.find((p) => p.id === activeId);
  const teamPlayers = (teamConfig?.playerIds || []).map((id) => players.find((p) => p.id === id)).filter(Boolean);

  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  // אם השחקן הפעיל נמחק – חוזרים למסך הבית
  useEffect(() => {
    const soloScreens = ['game', 'summary', 'stickers', 'timed', 'timed-summary'];
    if (soloScreens.includes(screen) && !active) setScreen('home');
    if (['team-game', 'team-summary'].includes(screen) && teamPlayers.length < 2) setScreen('team-setup');
  }, [screen, active, teamPlayers.length]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [screen, gameKey]);

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
    <div dir="rtl" lang="he" className="min-h-screen">
      <Background />

      {screen === 'home' && (
        <ProfileSelect
          players={players}
          onPlay={startGame}
          onTimed={startTimed}
          onTeam={() => (playClick(), setScreen('team-setup'))}
          onEdit={(player) => setEditor({ player })}
          onAdd={() => setEditor({ player: null })}
          onStickers={openStickers}
          soundOn={soundOn}
          onToggleSound={toggleSound}
        />
      )}

      {['game', 'team-game', 'timed'].includes(screen) && !bank && <LoadingBank error={bankError} onRetry={retryBank} onBack={goHome} />}

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
        <TimedSummary player={active} result={result} onPlayAgain={() => startTimed(active)} onHome={goHome} />
      )}

      {screen === 'team-setup' && <TeamSetup players={players} initial={teamConfig} onStart={startTeamGame} onBack={goHome} />}

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

      {screen === 'summary' && active && result && (
        <Summary
          player={active}
          result={result}
          onPlayAgain={() => startGame(active)}
          onSwitchPlayer={goHome}
          onStickers={() => openStickers(active)}
        />
      )}

      {screen === 'team-summary' && result && (
        <TeamSummary players={teamPlayers} result={result} onPlayAgain={() => startTeamGame()} onHome={goHome} />
      )}

      {screen === 'stickers' && active && <StickerBook player={active} onBack={goHome} onPlay={() => startGame(active)} />}

      {editor && (
        <ProfileEditor
          key={editor.player?.id || 'new'}
          player={editor.player}
          onSave={saveProfile}
          onClose={() => setEditor(null)}
          onDelete={(id) => {
            removePlayer(id);
            setEditor(null);
          }}
          onReset={resetProgress}
        />
      )}
    </div>
  );
}
