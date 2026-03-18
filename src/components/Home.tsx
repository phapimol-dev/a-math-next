"use client";

import React, { useState, useEffect } from 'react';
import { socket, connectSocket } from '../socket';
import { Users, Plus, Hash, RefreshCcw, LogIn, ChevronRight, AlertTriangle, X, LogOut, User, Trophy, Target } from 'lucide-react';
import UserProfileModal from './UserProfileModal';
import { translations, Language, TranslationKey } from '../lib/translations';
import './Home.css';

interface HomeProps {
  user: any;
  onRoomJoined: (room: any) => void;
  onLogout: () => void;
  language?: Language;
}

const Home: React.FC<HomeProps> = ({ user, onRoomJoined, onLogout, language = 'TH' }) => {
  const [roomId, setRoomId] = useState('');

  const t = (key: TranslationKey) => translations[language][key] || key;
  const [isPublic, setIsPublic] = useState(false);
  const [isManualCheck, setIsManualCheck] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<1 | 2 | 3>(2);
  const [publicRooms, setPublicRooms] = useState<{ id: string, playerCount: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const playerName = user.username;

  useEffect(() => {
    // Connect socket immediately so we can receive real-time lobby updates
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('publicRoomsUpdate', (rooms: any[]) => {
      setPublicRooms(rooms.slice(0, 10));
    });

    socket.on('roomCreated', (room: any) => {
      setIsLoading(false);
      onRoomJoined(room);
    });

    socket.on('playerJoined', (room: any) => {
      setIsLoading(false);
      onRoomJoined(room);
    });

    socket.on('error', (msg: string) => {
      setIsLoading(false);
      setError(msg);
    });

    const onConnect = () => {
      socket.emit('getPublicRooms');
    };
    socket.on('connect', onConnect);

    if (socket.connected) {
      socket.emit('getPublicRooms');
    }

    return () => {
      socket.off('publicRoomsUpdate');
      socket.off('roomCreated');
      socket.off('playerJoined');
      socket.off('error');
      socket.off('connect', onConnect);
    };
  }, [onRoomJoined]);

  const handleCreateRoom = (e: React.FormEvent, type: 'public' | 'private' | 'bot' = 'public') => {
    e.preventDefault();
    setIsLoading(true);
    connectSocket(playerName);

    const avatar = user.avatar;

    if (type === 'bot') {
      socket.emit('createBotRoom', { playerName, difficulty: botDifficulty, isManualCheck, mongoId: user.id });
    } else {
      socket.emit('createRoom', { playerName, avatar, isPublic: type === 'public', isManualCheck, mongoId: user.id });
    }
  };

  const handleJoinRoom = (id?: string) => {
    const targetRoomId = id || roomId;
    if (!targetRoomId.trim()) return setError('Please enter room ID');
    setIsLoading(true);
    connectSocket(playerName);
    socket.emit('joinRoom', { roomId: targetRoomId.toUpperCase(), playerName, avatar: user.avatar, mongoId: user.id });
  };

  const refreshPublicRooms = () => {
    socket.emit('getPublicRooms');
  };

  return (
    <>
      <div className="home-container animate-fade-in">

        {/* <div className="hero-section animate-float">
        <h1 className="text-gradient">A-MATH</h1>
        <p>Mathematical Crossword Board Game</p>
      </div> */}

        <div className="main-card glass-panel mt-[1rem]">
          <div className="btn-group">
            <button
              type="button"
              className={`flex-1 py-3 rounded-xl font-bold transition-all border ${isPublic ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/5'}`}
              onClick={() => setIsPublic(true)}
            >
              Public
            </button>
            <button
              type="button"
              className={`flex-1 py-3 rounded-xl font-bold transition-all border ${!isPublic ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/5'}`}
              onClick={() => setIsPublic(false)}
            >
              Private
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary py-4 shadow-indigo flex-[2]"
              onClick={(e) => handleCreateRoom(e, isPublic ? 'public' : 'private')}
              disabled={isLoading}
            >
              <Users size={20} />
              Create Human Room
            </button>
          </div>

          <div className="divider">or play vs bot</div>

          <div className="flex flex-col gap-3">
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
              {[1, 2, 3].map(level => (
                <button
                  key={level}
                  type="button"
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${botDifficulty === level
                    ? level === 1 ? 'bg-green-500 text-white shadow-lg' :
                      level === 2 ? 'bg-amber-500 text-white shadow-lg' :
                        'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  onClick={() => setBotDifficulty(level as 1 | 2 | 3)}
                >
                  Level {level} {level === 3 && '🔥'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-secondary py-3 border-rose-500/30 text-rose-300 hover:bg-rose-500/20 shadow-[0_0_15px_rgba(225,29,72,0.1)]"
              onClick={(e) => handleCreateRoom(e, 'bot')}
              disabled={isLoading}
            >
              Play vs AI (Singleplayer)
            </button>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5 transition-colors">
              <input
                type="checkbox"
                checked={isManualCheck}
                onChange={(e) => setIsManualCheck(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900 bg-black/50"
              />
              <span className="text-sm font-medium text-slate-200">
                Challenge Mode (Manual Validation)
              </span>
            </label>
          </div>

          <div className="divider">or join with code</div>

          <div className="input-wrapper">
            <label>Room Code</label>
            <div className="join-row">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  className="modern-input pl-10 uppercase font-mono"
                  placeholder="e.g. X1Y2Z3"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  disabled={isLoading}
                />
              </div>
              <button
                className="btn-primary px-6"
                onClick={() => handleJoinRoom()}
                disabled={isLoading || !roomId.trim()}
              >
                <LogIn size={20} className="sm:hidden" />
                <span className="hidden sm:inline">Join</span>
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="room-list-header">
              <h3>Public Lobbies</h3>
              <button
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
                onClick={refreshPublicRooms}
                title="Refresh Rooms"
              >
                <RefreshCcw size={18} />
              </button>
            </div>

            <div className="room-list">
              {publicRooms.length > 0 ? (
                publicRooms.map((room: any) => (
                  <div key={room.id} className="room-item group">
                    <div className="room-info items-center">
                      <div className="relative">
                        <img
                          src={room.hostAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.hostName}`}
                          alt={room.hostName}
                          className="w-10 h-10 rounded-full border border-white/10 shadow-lg object-cover"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[#1a1a1a] rounded-full"></div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">#{room.id}</span>
                          <span className="text-[10px] text-slate-500">•</span>
                          <span className="text-[10px] text-slate-400 font-medium">Challenge: {room.isManualCheck ? 'ON' : 'OFF'}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-200 truncate">{room.hostName}'s Room</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Users size={12} className="text-slate-500" />
                          <span className="text-[11px] text-slate-400 font-semibold">{room.playerCount}/2 Players</span>
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-secondary px-4 py-2 text-sm ml-auto group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 whitespace-nowrap"
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={isLoading}
                    >
                      Join
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-black/20 rounded-xl border border-white/5 text-gray-500 text-sm">
                  No open public rooms right now.<br />Be the first to create one!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modals outside the animated container to prevent 'transform' containing block bugs */}
        {error && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 bg-red-600/90 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 animate-slide-up">
            <AlertTriangle size={20} />
            <span className="font-bold">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 hover:bg-white/20 p-1 rounded-lg">
              <X size={16} />
            </button>
          </div>
        )}

        {selectedUserId && (
          <UserProfileModal
            userId={selectedUserId}
            currentUser={user}
            onClose={() => setSelectedUserId(null)}
          />
        )}
      </div>
    </>
  );
}

export default Home;
