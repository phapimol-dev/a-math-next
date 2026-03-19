"use client";

import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import {
  RotateCcw, Check, Info, LogOut, Flag, Settings, Volume2, Globe, X,
  ChevronRight, Trophy, AlertTriangle, MessageSquare, Menu
} from 'lucide-react';
import { translations, Language, TranslationKey } from '../lib/translations';
import './Game.css';
import { sounds } from '../lib/sounds';

interface GameProps {
  room: any;
  onLeave: () => void;
  user?: any;
  languageProp?: Language;
  onLanguageChange?: (lang: Language) => void;
}

interface GameState {
  id: string;
  gameState: 'waiting' | 'playing' | 'finished';
  players: {
    id: string;
    name: string;
    score: number;
    rack: any[];
    timeLeft: number;
    online?: boolean;
    isBot?: boolean;
  }[];
  turnIndex: number;
  board: any[][];
  tiles: any[];
  isManualCheck?: boolean;
  lastMove?: any;
  lastTurnStartTime: number | null;
  botDifficulty?: number;
}

const formatTime = (ms: number) => {
  const isNegative = ms < 0;
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${isNegative ? '-' : ''}${mins}:${secs.toString().padStart(2, '0')}`;
};

const Game: React.FC<GameProps> = ({ room, onLeave, languageProp = 'TH', onLanguageChange }) => {
  const [gameState, setGameState] = useState<GameState>(room);
  const [selectedTile, setSelectedTile] = useState<any>(null);
  const [placements, setPlacements] = useState<any[]>([]);
  const [isSwapMode, setIsSwapMode] = useState(false);
  const [swapSelection, setSwapSelection] = useState<string[]>([]);
  const [isBotThinking, setIsBotThinking] = useState(false);

  // Local high-frequency timer for smooth UI
  const [localTimeLeft, setLocalTimeLeft] = useState<number[]>([1320000, 1320000]);

  // Blank Tile Selection
  const [showBlankModal, setShowBlankModal] = useState(false);
  const [pendingBlankPos, setPendingBlankPos] = useState<{ x: number, y: number } | null>(null);

  // Rack Reordering
  const [rackOrder, setRackOrder] = useState<string[]>([]);
  const [reorderSelectedId, setReorderSelectedId] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  
  const language = languageProp;
  const setLanguage = onLanguageChange || (() => {});
  const [volumeLevel, setVolumeLevel] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('gameVolume') || '5');
    }
    return 5;
  });

  // Game Over State
  const [gameOverInfo, setGameOverInfo] = useState<{
    room: GameState;
    reason: string;
    winnerId?: string;
    looserName?: string;
    isDraw?: boolean;
  } | null>(null);
  const [validationError, setValidationError] = useState<{ failed: string[], all: string[] } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [botNotification, setBotNotification] = useState<string | null>(null);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);

  const t = (key: TranslationKey) => translations[language][key] || key;

  const handleVolumeChange = (level: number) => {
    setVolumeLevel(level);
    sounds.setVolume(level);
  };

  useEffect(() => {
    if (gameState.gameState !== 'playing') return;

    const interval = setInterval(() => {
      setLocalTimeLeft(prev => {
        const newTime = [...prev];
        const activeIdx = gameState.turnIndex;

        const activePlayer = gameState.players[activeIdx];
        if (activePlayer && gameState.lastTurnStartTime) {
          const elapsed = Date.now() - gameState.lastTurnStartTime;
          const trueTime = Math.max(-3600000, activePlayer.timeLeft - elapsed);
          newTime[activeIdx] = trueTime;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gameState.gameState, gameState.turnIndex, gameState.lastTurnStartTime, gameState.players]);

  useEffect(() => {
    const handleRoomUpdate = (updatedRoom: GameState) => {
      setGameState(updatedRoom);
      if (updatedRoom.players) {
        setLocalTimeLeft(updatedRoom.players.map(p => p.timeLeft || 0));
      }
      const myPlayer = updatedRoom.players.find(p => p.id === socket.id);
      if (myPlayer) {
        setRackOrder(prev => {
          const currentIds = myPlayer.rack.map(t => t.id);
          const nextOrder = prev.filter(id => currentIds.includes(id));
          const newIds = currentIds.filter(id => !nextOrder.includes(id));
          return [...nextOrder, ...newIds];
        });
      }
    };

    const handleMoveMade = ({ room, moveScore, action, count }: { room: GameState, moveScore: number, action?: string, count?: number }) => {
      setGameState(room);
      setLocalTimeLeft(room.players.map(p => p.timeLeft));
      setPlacements([]);
      setSelectedTile(null);
      setIsSwapMode(false);
      setSwapSelection([]);
      sounds.playTurnSound();

      if (action === 'swap') {
        setBotNotification(t('botSwapped').replace('{{count}}', String(count)));
        setTimeout(() => setBotNotification(null), 4000);
      } else if (action === 'pass') {
        setBotNotification(t('botPassed'));
        setTimeout(() => setBotNotification(null), 4000);
      }
    };

    const handleGameOver = ({ room, reason, winnerId, looserName, isDraw }: any) => {
      setGameState(room);
      setGameOverInfo({ room, reason, winnerId, looserName, isDraw });
      if (isDraw) sounds.playTurnSound();
      else {
        const isMeWinner = winnerId === socket.id;
        if (isMeWinner) sounds.playWinSound();
        else sounds.playLossSound();
      }
    };

    socket.on('playerJoined', handleRoomUpdate);
    socket.on('gameStarted', (r) => { setGameState(r); setLocalTimeLeft(r.players.map((p: any) => p.timeLeft)); });
    socket.on('moveMade', handleMoveMade);
    socket.on('playerLeft', handleRoomUpdate);
    socket.on('gameOver', handleGameOver);
    socket.on('botThinking', (thinking) => setIsBotThinking(thinking));
    socket.on('moveValidationError', (data) => setValidationError({ failed: data.failedEquations, all: data.allEquations }));
    socket.on('error', (msg) => setErrorMessage(msg));

    return () => {
      socket.off('playerJoined', handleRoomUpdate);
      socket.off('gameStarted');
      socket.off('moveMade', handleMoveMade);
      socket.off('playerLeft', handleRoomUpdate);
      socket.off('gameOver', handleGameOver);
      socket.off('botThinking');
      socket.off('moveValidationError');
      socket.off('error');
    };
  }, []);

  const handleStartGame = () => socket.emit('startGame', gameState.id);

  const handleSurrender = () => {
    setShowSurrenderModal(true);
  };

  const handleCellClick = (x: number, y: number) => {
    if (gameState.gameState !== 'playing') return;
    if (gameState.players[gameState.turnIndex].id !== socket.id) return;

    const existingPIdx = placements.findIndex(p => p.x === x && p.y === y);
    if (existingPIdx !== -1) {
      const newP = [...placements];
      newP.splice(existingPIdx, 1);
      setPlacements(newP);
      return;
    }

    if (selectedTile && !gameState.board[y][x].tile) {
      if (selectedTile.isBlank) {
        setPendingBlankPos({ x, y });
        setShowBlankModal(true);
      } else {
        setPlacements([...placements, { ...selectedTile, x, y }]);
        setSelectedTile(null);
      }
    }
  };

  const handleSubmit = () => {
    if (placements.length === 0) return;
    socket.emit('makeMove', { roomId: gameState.id, placements });
  };

  const handleConfirmSwap = () => {
    if (swapSelection.length === 0) return;
    socket.emit('swapTiles', { roomId: gameState.id, tileIds: swapSelection });
    setIsSwapMode(false);
    setSwapSelection([]);
    sounds.playTurnSound();
  };

  const onSelectBlank = (char: string) => {
    if (pendingBlankPos && selectedTile) {
      setPlacements([...placements, { ...selectedTile, char, value: char, x: pendingBlankPos.x, y: pendingBlankPos.y }]);
      setPendingBlankPos(null);
      setSelectedTile(null);
      setShowBlankModal(false);
    }
  };

  const renderSettingsModal = () => {
    if (!showSettings) return null;
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="max-w-sm w-full glass-panel shadow-2xl border-white/10 overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/5">
            <h3 className="text-xl font-black flex items-center gap-2">
              <Settings className="text-indigo-400" size={20} />
              {t('settings')}
            </h3>
            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                <Globe size={14} /> {t('language')}
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 bg-black/50 rounded-2xl border border-white/5">
                <button onClick={() => { setLanguage('TH'); localStorage.setItem('gameLanguage', 'TH'); }} className={`py-3 rounded-xl font-bold transition-all ${language === 'TH' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>ไทย</button>
                <button onClick={() => { setLanguage('EN'); localStorage.setItem('gameLanguage', 'EN'); }} className={`py-3 rounded-xl font-bold transition-all ${language === 'EN' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>English</button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                <Volume2 size={14} /> {t('volume')}
              </div>
              <div className="flex justify-between items-center h-12 gap-2 bg-black/80 rounded-2xl border border-white/5">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button key={level} onClick={() => handleVolumeChange(level)} className="flex-1 group flex flex-col items-center gap-2">
                    <div className={`w-full rounded-full transition-all ${volumeLevel >= level ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'bg-white/10 group-hover:bg-white/20'}`} style={{ height: `${20 + level * 16}%` }} />
                    <span className={`text-[.75rem] font-black ${volumeLevel === level ? 'text-indigo-400' : 'text-slate-600'}`}>{level === 1 ? t('off') : level}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (gameState.gameState === 'waiting') {
    return (
      <div className="lobby-container relative min-h-screen flex items-center justify-center p-4">
        <button className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-slate-300" onClick={() => setShowSettings(true)}><Settings size={20} /></button>
        <div className="main-card max-w-md w-full glass-panel">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-black mb-2">{t('lobbyTitle')}</h2>
            <div className="inline-block bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-xl text-2xl font-mono font-bold tracking-widest border border-indigo-500/30">{gameState.id}</div>
            <p className="text-slate-400 mt-4 text-sm">{t('shareCode')}</p>
          </div>
          <div className="space-y-3 mb-6">
            {gameState.players.map((p: any) => (
              <div key={p.id} className="p-4 bg-black/20 rounded-xl flex justify-between items-center border border-white/5">
                <span className="font-semibold">{p.name}</span>
                {p.id === socket.id && <span className="text-xs bg-indigo-500 text-white font-bold px-2 py-1 rounded">{t('you')}</span>}
              </div>
            ))}
            {gameState.players.length === 1 && <div className="p-4 bg-white/5 rounded-xl border border-dashed border-white/20 text-center animate-pulse text-slate-400">{t('waitingPlayer')}</div>}
          </div>
          <p className="text-sm text-center text-slate-400 font-semibold mb-6">{gameState.players.length}/2 {t('playersCount')}</p>
          <div className="flex flex-col gap-3">
            {gameState.players.length >= 2 && <button className="btn-primary" onClick={handleStartGame}>{t('startGame')}</button>}
            <button className="btn-secondary" onClick={onLeave}>{t('leaveRoom')}</button>
          </div>
        </div>
        {renderSettingsModal()}
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.turnIndex];
  const myPlayer = gameState.players.find((p: any) => p.id === socket.id);
  const isMyTurn = myPlayer?.id === currentPlayer?.id;

  return (
    <>
      <div className="game-container">
        <header className="relative z-[100] flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-gradient hidden sm:block">A-MATH</h1>
            <div className="flex gap-2">
              <div className="bg-white/10 px-3 py-1 rounded-lg text-sm font-mono border border-white/10 flex items-center gap-2">
                <span className="text-slate-400">{t('bag')}:</span>
                <span className="font-bold text-white">{gameState.tiles?.length || 0}</span>
              </div>
              <div className="bg-white/10 px-3 py-1 rounded-lg text-sm font-mono border border-white/10">
                {t('room')}: <span className="text-indigo-400 font-bold">{gameState.id}</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <button
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-slate-300"
              onClick={() => setShowNavMenu(!showNavMenu)}
            >
              <Menu size={20} />
            </button>

            {showNavMenu && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setShowNavMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-black/90 rounded-md shadow-2xl border-white/10 overflow-hidden z-[130] animate-scale-in origin-top-right">
                  <div className="flex flex-col p-2 gap-1">
                    <button
                      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                      onClick={() => { setShowSettings(true); setShowNavMenu(false); }}
                    >
                      <Settings size={18} className="text-indigo-400" />
                      {t('settings')}
                    </button>
                    <button
                      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all"
                      onClick={() => { handleSurrender(); setShowNavMenu(false); }}
                    >
                      <Flag size={18} />
                      {t('surrender')}
                    </button>
                    <div className="h-px bg-white/5 my-1" />
                    <button
                      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                      onClick={() => { onLeave(); setShowNavMenu(false); }}
                    >
                      <LogOut size={18} />
                      {t('leaveRoom')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="game-layout">
          <aside className="sidebar">
            <div className="players-mobile-row">
              {gameState.players.map((p: any, idx: number) => (
                <div key={p.id} className={`player-card ${idx === gameState.turnIndex ? 'active' : ''} ${localTimeLeft[idx] < 60000 ? 'low-time' : ''} ${p.online === false ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-lg truncate pr-2">{p.name} {p.id === socket.id ? `(${t('you')})` : ''}</span>
                        {p.online === false && <span className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">Offline</span>}
                      </div>
                      {idx === gameState.turnIndex && <span className="turn-badge">{t('turn')}</span>}
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-sm font-medium text-slate-400">{t('points')}: <span className="text-2xl font-black text-white ml-1">{p.score}</span></div>
                      <div className="text-right"><div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{t('timeLeft')}</div><div className={`text-xl font-mono font-bold tabular-nums ${localTimeLeft[idx] < 60000 ? 'text-red-500' : 'text-indigo-400'}`}>{formatTime(localTimeLeft[idx])}</div></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <main className="board-area">
            <div className="board glass-panel">
              {gameState.board.map((row, y) => row.map((cell, x) => {
                const placement = placements.find(p => p.x === x && p.y === y);
                const isSpecial = !cell.tile && cell.special;
                return (
                  <div key={`${x}-${y}`} className={`cell ${isSpecial ? `special-${cell.special?.toLowerCase()}` : ''}`} onClick={() => handleCellClick(x, y)}>
                    {cell.tile ? (
                      <div className={`tile on-board ${cell.tile.isBlank ? 'blank' : ''}`}>
                        <span className="tile-value">{cell.tile.value}</span>
                        {cell.tile.score > 0 && <span className="tile-score">{cell.tile.score}</span>}
                      </div>
                    ) : placement ? (
                      <div className={`tile placement animate-scale-in ${placement.isBlank ? 'blank' : ''}`}>
                        <span className="tile-value">{placement.value}</span>
                        {placement.score > 0 && <span className="tile-score">{placement.score}</span>}
                      </div>
                    ) : isSpecial && <span className="special-label">{cell.special}</span>}
                  </div>
                );
              }))}
            </div>
          </main>

          <aside className="actions-sidebar">
            <div className="actions-panel">
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                  {t('actions')}
                  <span className="w-8 h-px bg-slate-700"></span>
                </h3>

                <button className="action-btn primary w-full py-5 text-lg font-black tracking-wide" onClick={handleSubmit} disabled={placements.length === 0 || !isMyTurn}>
                  <div className="flex items-center justify-center">
                    <Check size={24} className="mr-2" /> {t('submitMove')}
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button className="action-btn secondary py-3" onClick={() => setPlacements([])} disabled={placements.length === 0 || !isMyTurn}>
                    <div className="flex items-center justify-center">
                      <RotateCcw size={18} className="mr-1" /> {t('clear')}
                    </div>
                  </button>
                  <button
                    className={`action-btn py-3 transition-all ${isSwapMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'secondary'}`}
                    onClick={() => { setIsSwapMode(!isSwapMode); setSwapSelection([]); }}
                    disabled={!isMyTurn}
                  >
                    <div className="flex items-center justify-center px-2">
                      <RotateCcw size={18} className={`mr-1 ${isSwapMode ? 'rotate-45' : ''}`} />
                      {isSwapMode ? t('cancel') : t('swapTiles')}
                    </div>
                  </button>
                </div>

                {isSwapMode && (
                  <button
                    className="action-btn primary w-full py-4 mt-2 bg-gradient-to-r from-amber-500 to-orange-600 animate-fade-in"
                    onClick={handleConfirmSwap}
                    disabled={swapSelection.length === 0}
                  >
                    <Check size={20} className="mr-2" /> {t('confirmSwap')}
                  </button>
                )}
              </div>

              <div className="pt-6 border-t border-white/10 flex flex-col gap-4">
                <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex justify-between items-center group hover:bg-black/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bag-card-icon">
                      <span className="text-amber-950 font-black text-sm">#</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-px">{t('bag')}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Remaining</span>
                    </div>
                  </div>
                  <span className="text-3xl font-black text-white">{gameState.tiles?.length || 0}</span>
                </div>

                <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex flex-col justify-center items-center text-center group hover:bg-black/60 transition-colors">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('turn')}</span>
                  <span className={`text-lg font-bold truncate w-full ${isMyTurn ? 'text-indigo-400 animate-pulse drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-slate-300'}`}>
                    {isMyTurn ? t('you').toUpperCase() : (gameState.players[gameState.turnIndex]?.name || '...')}
                  </span>
                </div>
              </div>
            </div>

            <div className="legend-panel mt-4">
              <h3 className="section-title"><Info size={14} /> {t('legend')}</h3>
              <div className="space-y-4">
                <div className="legend-item"><div className="sq-preview special-te rounded-md py-1 px-2">x3</div><span className="text-xs font-semibold">{t('tripleEquation')}</span></div>
                <div className="legend-item"><div className="sq-preview special-de rounded-md py-1 px-2">x2</div><span className="text-xs font-semibold">{t('doubleEquation')}</span></div>
                <div className="legend-item"><div className="sq-preview special-tp rounded-md py-1 px-2">x3</div><span className="text-xs font-semibold">{t('triplePiece')}</span></div>
                <div className="legend-item"><div className="sq-preview special-dp rounded-md py-1 px-2">x2</div><span className="text-xs font-semibold">{t('doublePiece')}</span></div>
              </div>
            </div>
          </aside>
        </div>

        <div className="rack-area-fixed">
          <div className="rack-container glass-panel">
            <div className="max-w-4xl w-full mx-auto">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('yourRack')}</h3>
                {isMyTurn && <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div><span className="text-[10px] font-black text-indigo-400 uppercase">{t('yourTurn')}</span></div>}
              </div>

              <div className="rack flex justify-center gap-2 md:gap-3">
                {myPlayer?.rack
                  .filter((tile: any) => !placements.find(p => p.id === tile.id))
                  .map((tile: any) => {
                    const isSelected = selectedTile?.id === tile.id;
                    const isSwapping = swapSelection.includes(tile.id);

                    return (
                      <div
                        key={tile.id}
                        className={`tile rack-tile ${tile.isBlank ? 'blank' : ''} ${isSelected ? 'active selected' : ''} ${isSwapping ? 'swapping scale-95 opacity-50' : ''}`}
                        onClick={() => {
                          if (isSwapMode) {
                            setSwapSelection(prev =>
                              prev.includes(tile.id) ? prev.filter(id => id !== tile.id) : [...prev, tile.id]
                            );
                          } else {
                            setSelectedTile(isSelected ? null : tile);
                          }
                        }}
                      >
                        <span className="tile-value">{tile.value || tile.char}</span>
                        {tile.score > 0 && <span className="tile-score">{tile.score}</span>}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals outside game-container to avoid animation transform containing block issues */}
      {renderSettingsModal()}

      {showBlankModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-xl w-full glass-panel p-8 shadow-2xl border-white/10">
            <h3 className="text-2xl font-black mb-6 text-center text-white flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg border border-indigo-400/50">?</div>
              Select Blank Value
            </h3>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Numbers</p>
                <div className="grid grid-cols-7 gap-2">
                  {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(c => (
                    <button key={c} className="blank-option-btn number" onClick={() => onSelectBlank(c)}>{c}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Operators & Equals</p>
                <div className="grid grid-cols-4 gap-2">
                  {['+', '-', '×', '÷', '+/-', '×/÷', '='].map(c => (
                    <button key={c} className={`blank-option-btn operator ${c === '=' ? 'equals' : ''} ${c.length > 1 ? 'text-xs' : ''}`} onClick={() => onSelectBlank(c)}>{c}</button>
                  ))}
                  <button className="blank-option-btn secondary col-span-1" onClick={() => setShowBlankModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameOverInfo && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full glass-panel p-8 text-center border-2 border-white/10">
            {gameOverInfo.winnerId === socket.id ? <><div className="text-6xl mb-6">🏆</div><h2 className="text-4xl font-black text-yellow-400 mb-2">{t('victory')}</h2></> : gameOverInfo.isDraw ? <><div className="text-6xl mb-6">🤝</div><h2 className="text-4xl font-black text-white mb-2">{t('draw')}</h2></> : <><div className="text-6xl mb-6">☹️</div><h2 className="text-4xl font-black text-slate-400 mb-2">{t('defeat')}</h2></>}
            <p className="text-slate-400 mb-8 italic">
              {gameOverInfo.reason === 'disconnection' ? t('disconnection') : (gameOverInfo.reason === 'surrender' ? t('surrenderReason') : `"${gameOverInfo.reason}"`)}
            </p>
            <div className="space-y-4 mb-8">
              {gameOverInfo.room.players.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                  <span className="font-bold text-lg text-slate-200">{p.name} {p.id === socket.id ? `(${t('you')})` : ''}</span>
                  <span className="text-2xl font-black text-white">{p.score}</span>
                </div>
              ))}
            </div>
            <button className="btn-primary w-full py-4 text-lg" onClick={onLeave}>{t('returnToLobby')}</button>
          </div>
        </div>
      )}

      {validationError && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full glass-panel overflow-hidden shadow-2xl border border-white/10">
            <div className="p-6 bg-red-500/10 border-b border-red-500/20 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{t('invalidEquation')}</h3>
                <p className="text-sm text-slate-400">{t('invalidEquationDesc')}</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {validationError.all.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('detectedEquations')}</p>
                  <div className="space-y-2">
                    {validationError.all.map((eq, i) => {
                      const isFailed = validationError.failed.includes(eq);
                      return (
                        <div key={i} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${isFailed ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                          <span className="font-mono text-lg font-bold tracking-wider">{eq}</span>
                          {isFailed ? <X className="text-red-500" size={18} /> : <Check className="text-emerald-500" size={18} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-white/5 border-t border-white/5">
              <button
                className="w-full btn-primary py-4 text-lg font-bold shadow-xl"
                onClick={() => setValidationError(null)}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 bg-red-600/90 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 animate-slide-up">
          <AlertTriangle size={20} />
          <span className="font-bold">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-2 hover:bg-white/20 p-1 rounded-lg">
            <X size={16} />
          </button>
        </div>
      )}

      {botNotification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-indigo-600/90 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 animate-fade-in shadow-indigo-500/20">
          <Info size={20} />
          <span className="font-bold">{botNotification}</span>
        </div>
      )}

      {showSurrenderModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-sm w-full glass-panel overflow-hidden shadow-2xl border border-white/10">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto ring-8 ring-red-500/5">
                <Flag size={40} fill="currentColor" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">{t('surrender')}?</h3>
                <p className="text-slate-400 leading-relaxed">
                  {t('confirmSurrender')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  className="py-4 rounded-2xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-white/5"
                  onClick={() => setShowSurrenderModal(false)}
                >
                  {t('cancel')}
                </button>
                <button
                  className="py-4 rounded-2xl font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 transition-all border border-red-500/50"
                  onClick={() => {
                    socket.emit('resign', gameState.id);
                    setShowSurrenderModal(false);
                  }}
                >
                  {t('surrender')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Game;
