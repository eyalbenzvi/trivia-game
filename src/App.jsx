import { useCallback, useEffect, useState } from 'react';
import Background from './components/Background';
import ProfileSelect from './components/ProfileSelect';
import ProfileEditor from './components/ProfileEditor';
import Game from './components/Game';
import Summary from './components/Summary';
import StickerBook from './components/StickerBook';
import { usePlayers } from './hooks/usePlayers';
import { useLocalStorage } from './hooks/useLocalStorage';
import { playClick, setSoundEnabled } from './utils/sound';

export default function App() {
  const { players, updatePlayer, addPlayer, removePlayer, resetProgress } = usePlayers();
  const [soundOn, setSoundOn] = useLocalStorage('family-trivia:sound', true);
  const [screen, setScreen] = useState('home'); // home | game | summary | stickers
  const [activeId, setActiveId] = useState(null);
  const [gameKey, setGameKey] = useState(0);
  const [result, setResult] = useState(null);
  const [editor, setEditor] = useState(null); // { player } | { player: null } לשחקן חדש

  const active = players.find((p) => p.id === activeId);

  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  // אם השחקן הפעיל נמחק – חוזרים למסך הבית
  useEffect(() => {
    if (screen !== 'home' && !active) setScreen('home');
  }, [screen, active]);

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

  const openStickers = useCallback((player) => {
    playClick();
    setActiveId(player.id);
    setScreen('stickers');
  }, []);

  const goHome = useCallback(() => setScreen('home'), []);

  const saveProfile = (data) => {
    if (editor?.player) updatePlayer(editor.player.id, data);
    else addPlayer(data);
    setEditor(null);
  };

  return (
    <div dir="rtl" lang="he" className="min-h-screen">
      <Background />

      {screen === 'home' && (
        <ProfileSelect
          players={players}
          onPlay={startGame}
          onEdit={(player) => setEditor({ player })}
          onAdd={() => setEditor({ player: null })}
          onStickers={openStickers}
          soundOn={soundOn}
          onToggleSound={() => setSoundOn((v) => !v)}
        />
      )}

      {screen === 'game' && active && (
        <Game
          key={gameKey}
          player={active}
          onUpdatePlayer={updatePlayer}
          onFinish={(r) => {
            setResult(r);
            setScreen('summary');
          }}
          onQuit={goHome}
          soundOn={soundOn}
          onToggleSound={() => setSoundOn((v) => !v)}
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
