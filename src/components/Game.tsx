"use client";

import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { RotateCcw, Check, Info, LogOut } from 'lucide-react';
import './Game.css';
import { sounds } from '../lib/sounds';

interface GameProps {
  room: any;
  onLeave: () => void;
}

// Define GameState interface based on usage
interface GameState {
  id: string;
  gameState: 'waiting' | 'playing' | 'finished';
  players: {
    id: string;
    name: string;
    score: number;
    rack: any[];
    timeLeft: number; // Added
  }[];
  turnIndex: number;
  board: any[][];
  tiles: any[];
  isManualCheck?: boolean;
  lastMove?: any;
  lastTurnStartTime: number | null; // Added
}

const formatTime = (ms: number) => {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Game: React.FC<GameProps> = ({ room, onLeave }) => {
  const [gameState, setGameState] = useState<GameState>(room);
  const [selectedTile, setSelectedTile] = useState<any>(null);
  const [placements, setPlacements] = useState<any[]>([]);
  const [isSwapMode, setIsSwapMode] = useState(false);
  const [swapSelection, setSwapSelection] = useState<string[]>([]);
  const [isBotThinking, setIsBotThinking] = useState(false);
  
  // Local high-frequency timer for smooth UI
  const [localTimeLeft, setLocalTimeLeft] = useState<number[]>([1320000, 1320000]);

  useEffect(() => {
    if (gameState.gameState !== 'playing') return;

    const interval = setInterval(() => {
      setLocalTimeLeft(prev => {
        const newTime = [...prev];
        const activeIdx = gameState.turnIndex;
        // Calculate expected time left: server state - (now - turnStartTime)
        if (gameState.lastTurnStartTime) {
            const elapsed = Date.now() - gameState.lastTurnStartTime;
            const trueTime = Math.max(0, gameState.players[activeIdx].timeLeft - elapsed);
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
      // Sync local times from server
      setLocalTimeLeft(updatedRoom.players.map(p => p.timeLeft));
    };
    
    const handleGameStarted = (updatedRoom: GameState) => {
      setGameState(updatedRoom);
      setLocalTimeLeft(updatedRoom.players.map(p => p.timeLeft));
    };

    const handleMoveMade = ({ room, moveScore }: { room: GameState, moveScore: number }) => {
      setGameState(room);
      setLocalTimeLeft(room.players.map(p => p.timeLeft));
      setPlacements([]);
      setSelectedTile(null);
      setIsSwapMode(false);
      setSwapSelection([]);
      sounds.playTurnSound(); // Play turn sound
    };

    const handleChallengeResult = ({ success, room, penalty }: { success: boolean, room: GameState, penalty?: number }) => {
      setGameState(room);
      setLocalTimeLeft(room.players.map(p => p.timeLeft));
      setPlacements([]);
      setSelectedTile(null);
      setIsSwapMode(false);
      setSwapSelection([]);
      
      const penaltyText = penalty ? ` (${penalty} points penalty)` : "";
      if (success) {
        alert(`Challenge Successful! The opponent's previous move was invalid. Their points were deducted${penaltyText} and tiles were recalled.`);
        sounds.playTurnSound(); // Play turn sound because challenge success switches turn back
      } else {
        alert(`Challenge Failed! The opponent's equation was valid. You lost ${penalty || 10} points as a penalty.`);
      }
    };

    const handleGameOver = ({ room, reason, winnerId, looserName }: any) => {
        setGameState(room);
        const isMewinner = winnerId === socket.id;
        if (isMewinner) sounds.playWinSound();
        else sounds.playLossSound();

        if (reason === "timeout") {
            const winner = room.players.find((p: any) => p.id === winnerId);
            alert(`GAME OVER! ${looserName} ran out of time. ${winner?.name || "The opponent"} wins!`);
        } else {
            // handle other game over reasons if any
        }
    };

    const handleBotThinking = (thinking: boolean) => {
      setIsBotThinking(thinking);
    };

    socket.on('playerJoined', handleRoomUpdate);
    socket.on('gameStarted', handleGameStarted);
    socket.on('moveMade', handleMoveMade);
    socket.on('challengeResult', handleChallengeResult);
    socket.on('botThinking', handleBotThinking);
    socket.on('playerLeft', handleRoomUpdate);
    socket.on('gameOver', handleGameOver);

    return () => {
      socket.off('playerJoined', handleRoomUpdate);
      socket.off('gameStarted', handleGameStarted);
      socket.off('moveMade', handleMoveMade);
      socket.off('challengeResult', handleChallengeResult);
      socket.off('botThinking', handleBotThinking);
      socket.off('playerLeft', handleRoomUpdate);
      socket.off('gameOver', handleGameOver);
    };
  }, []);

  const handleStartGame = () => {
    socket.emit('startGame', gameState.id);
  };

  const handleCellClick = (x: number, y: number) => {
    if (gameState.gameState !== 'playing') return;
    if (gameState.players[gameState.turnIndex].id !== socket.id) return;

    // Check if clicking a tile we just placed, allowing removal
    const existingPlacementIndex = placements.findIndex(p => p.x === x && p.y === y);
    if (existingPlacementIndex !== -1) {
      const newPlacements = [...placements];
      newPlacements.splice(existingPlacementIndex, 1);
      setPlacements(newPlacements);
      setSelectedTile(null);
      return;
    }

    if (selectedTile) {
      if (gameState.board[y][x].tile || existingPlacementIndex !== -1) return;
      const newPlacements = [...placements, { x, y, tile: selectedTile }];
      setPlacements(newPlacements);
      setSelectedTile(null);
    }
  };

  const handleSubmitMove = () => {
    if (placements.length === 0) return;

    socket.emit('makeMove', {
      roomId: gameState.id,
      move: { placements } // Removed equation manual entry
    });
  };

  const handleToggleSwapMode = () => {
    if (!isMyTurn) return;
    if (isSwapMode) {
      setIsSwapMode(false);
      setSwapSelection([]);
    } else {
      // Clear placements when entering swap mode
      setPlacements([]);
      setSelectedTile(null);
      setIsSwapMode(true);
    }
  };

  const handleTileClickInRack = (tile: any) => {
    if (!isMyTurn) return;
    
    if (isSwapMode) {
      if (swapSelection.includes(tile.id)) {
        setSwapSelection(prev => prev.filter(id => id !== tile.id));
      } else {
        setSwapSelection(prev => [...prev, tile.id]);
      }
    } else {
      setSelectedTile(tile);
    }
  };

  const handleConfirmSwap = () => {
    socket.emit('swapTiles', {
      roomId: gameState.id,
      tileIds: swapSelection
    });
  };

  if (gameState.gameState === 'waiting') {
    return (
      <div className="lobby-container animate-fade-in">
        <div className="main-card max-w-md w-full glass-panel">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-black mb-2">Lobby</h2>
            <div className="inline-block bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-xl text-2xl font-mono font-bold tracking-widest border border-indigo-500/30">
              {gameState.id}
            </div>
            <p className="text-slate-400 mt-4 text-sm">Share this code with your friend to play</p>
          </div>
          
          <div className="space-y-3 mb-6">
            {gameState.players.map((p: any) => (
              <div key={p.id} className="p-4 bg-black/20 rounded-xl flex justify-between items-center border border-white/5">
                <span className="font-semibold">{p.name}</span>
                {p.id === socket.id && (
                  <span className="text-xs bg-indigo-500 text-white font-bold px-2 py-1 rounded">YOU</span>
                )}
              </div>
            ))}
            
            {gameState.players.length === 1 && (
              <div className="p-4 bg-white/5 rounded-xl border border-dashed border-white/20 text-center animate-pulse text-slate-400">
                Waiting for player 2...
              </div>
            )}
          </div>

          <p className="text-sm text-center text-slate-400 font-semibold mb-6">
            {gameState.players.length}/2 Players
          </p>
          
          <div className="flex flex-col gap-3">
            {gameState.players.length >= 2 ? (
               <button className="btn-primary" onClick={handleStartGame}>Start Game Now</button>
            ) : null}
            <button className="btn-secondary" onClick={onLeave}>Leave Room</button>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.turnIndex];
  const myPlayer = gameState.players.find((p: any) => p.id === socket.id);
  const isMyTurn = myPlayer?.id === currentPlayer?.id;

  return (
    <div className="game-container">
      <header className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
         <div className="flex items-center gap-4">
           <h1 className="text-xl font-black text-gradient hidden sm:block">A-MATH</h1>
           <div className="flex gap-2">
             <div className="bg-white/10 px-3 py-1 rounded-lg text-sm font-mono border border-white/10 flex items-center gap-2">
               <span className="text-slate-400">Bag:</span>
               <span className="font-bold text-white">{gameState.tiles?.length || 0}</span>
             </div>
             <div className="bg-white/10 px-3 py-1 rounded-lg text-sm font-mono border border-white/10">
               Room: <span className="text-indigo-400 font-bold">{gameState.id}</span>
             </div>
           </div>
         </div>
         <button className="btn-secondary py-2 px-4 text-sm flex items-center gap-2" onClick={onLeave}>
           <LogOut size={16} />
           <span className="hidden sm:inline">Leave</span>
         </button>
      </header>

      <div className="game-layout">
        <aside className="sidebar">
          <div className="players-mobile-row">
            {gameState.players.map((p: any, idx: number) => (
              <div key={p.id} className={`player-card ${idx === gameState.turnIndex ? 'active' : ''} ${localTimeLeft[idx] < 60000 ? 'low-time' : ''}`}>
                <div className="flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-bold text-lg truncate pr-2">{p.name}</span>
                    {idx === gameState.turnIndex && <span className="turn-badge">Turn</span>}
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-3xl font-black text-white drop-shadow-md">{p.score}</div>
                      <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider mt-1">Points</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-mono font-bold ${idx === gameState.turnIndex ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`}>
                        {formatTime(localTimeLeft[idx])}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Time Left</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="action-buttons mt-auto sm:mt-0">
             <div className="flex flex-col gap-2 w-full">
               {isSwapMode ? (
                 <div className="flex flex-col gap-2">
                   <div className="text-xs text-center text-amber-400 font-bold uppercase tracking-widest bg-amber-400/10 py-2 rounded-lg border border-amber-400/20">
                     Swap Mode: Select tiles to return
                   </div>
                   <div className="flex gap-2">
                     <button 
                       className="btn-secondary flex-1 py-3"
                       onClick={() => setIsSwapMode(false)}
                     >
                       Cancel
                     </button>
                     <button 
                       className="btn-primary flex-1 py-3 bg-amber-600 hover:bg-amber-500 border-amber-500 shadow-amber-500/20"
                       onClick={handleConfirmSwap}
                     >
                       Confirm Swap
                     </button>
                   </div>
                 </div>
               ) : (
                 <>
                   <div className="flex gap-2 w-full justify-between items-center sm:w-auto mb-2">
                     <button 
                       className="btn-secondary py-2 px-4 text-sm flex-1"
                       onClick={() => { setPlacements([]); setSelectedTile(null); }}
                       disabled={!isMyTurn || placements.length === 0}
                     >
                       Clear
                     </button>
                     
                     <button 
                       className={`py-2 px-4 text-sm font-semibold rounded-xl border transition-all flex-1 ${
                         isMyTurn 
                           ? 'bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                           : 'bg-white/5 text-slate-500 border-white/5 cursor-not-allowed'
                       }`}
                       onClick={handleToggleSwapMode}
                       disabled={!isMyTurn}
                     >
                       Swap Tiles
                     </button>
                   </div>
                   
                   <div className="flex gap-2 w-full">
                     {gameState.isManualCheck && gameState.lastMove && isMyTurn && placements.length === 0 && (
                       <button 
                         className="py-2 px-4 text-sm font-semibold rounded-xl bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] flex-1"
                         onClick={() => socket.emit('challenge', gameState.id)}
                       >
                         Challenge
                       </button>
                     )}
                     
                     <button 
                       className="btn-primary py-3 px-6 shadow-indigo flex-1"
                       onClick={handleSubmitMove}
                       disabled={!isMyTurn || placements.length === 0}
                     >
                       Submit Move
                     </button>
                   </div>
                 </>
               )}
            </div>
          </div>
        </aside>

        <main className="board-area relative">
          {isBotThinking && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-indigo-500/90 text-white px-6 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center gap-3 z-10 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-150"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-300"></div>
              <span>Bot is thinking...</span>
            </div>
          )}
          
          <div className="board-wrapper">
            <div className="board">
              {gameState.board.map((row: any, y: number) => (
                row.map((cell: any, x: number) => {
                  const placement = placements.find(p => p.x === x && p.y === y);
                  const tile = cell.tile || placement?.tile;
                  const specialClass = cell.special ? cell.special.toLowerCase() : '';
                  
                  return (
                    <div 
                      key={`${x}-${y}`} 
                      className={`cell ${specialClass} ${x===7 && y===7 ? 'center' : ''}`}
                      onClick={() => handleCellClick(x, y)}
                    >
                      {tile ? (
                        <div className="tile">
                          <span className="tile-value">{tile.value}</span>
                          <span className="tile-score">{tile.score}</span>
                        </div>
                      ) : (
                          <span className="cell-label">{cell.special || ''}</span>
                      )}
                    </div>
                  );
                })
              ))}
            </div>
          </div>
          
          <div className="rack-container">
            <div className="flex items-center justify-between mb-2 px-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Your Rack <span className="lowercase text-slate-500 ml-1">({myPlayer?.rack.length}/8)</span>
              </h4>
              {isMyTurn && <span className="text-xs text-indigo-400 font-semibold animate-pulse">Your Turn!</span>}
            </div>
            <div className={`rack ${isSwapMode ? 'swap-mode' : ''}`}>
               {myPlayer?.rack
                 .filter((tile: any) => !placements.find(p => p.tile.id === tile.id))
                 .map((tile: any) => {
                   const isSelected = isSwapMode 
                     ? swapSelection.includes(tile.id)
                     : selectedTile?.id === tile.id;
                   
                   return (
                     <div 
                       key={tile.id} 
                       className={`tile rack-tile ${isSelected ? 'active' : ''}`}
                       onClick={() => handleTileClickInRack(tile)}
                     >
                        <span className="tile-value">{tile.value}</span>
                        <span className="tile-score">{tile.score}</span>
                        {isSwapMode && isSelected && (
                          <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-0.5 shadow-lg">
                            <Check size={12} strokeWidth={4} />
                          </div>
                        )}
                     </div>
                   );
                 })}
            </div>
          </div>
        </main>

        <aside className="sidebar hidden xl:block">
           <div className="glass-panel p-5 rounded-2xl h-full">
             <div className="flex items-center gap-2 mb-4 text-slate-300">
               <Info size={18} />
               <h3 className="font-bold uppercase tracking-wider text-sm">Legend</h3>
             </div>
             
              <div className="space-y-4 text-sm font-medium">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center text-[10px] font-bold">TE</div>
                  <span className="text-slate-300">Triple Equation (3×)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-yellow-500 flex items-center justify-center text-[10px] font-bold text-black">DE</div>
                  <span className="text-slate-300">Double Equation (2×)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-[10px] font-bold">TP</div>
                  <span className="text-slate-300">Triple Piece (3×)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center text-[10px] font-bold">DP</div>
                  <span className="text-slate-300">Double Piece (2×)</span>
                </div>
             </div>
             
             <div className="mt-8 pt-6 border-t border-white/10 text-xs text-slate-400 space-y-2">
                <p>• Form equations like crossword puzzle</p>
                <p>• Must touch game center first turn</p>
                <p>• Use 8 tiles at once for Bingo (+40)</p>
             </div>
           </div>
        </aside>
      </div>
    </div>
  );
}

export default Game;
