"use client";

import React, { useState, useEffect } from 'react';
import { socket, connectSocket } from '../socket';
import { Users, Plus, Hash, RefreshCcw, LogIn, ChevronRight, AlertTriangle, X, LogOut, User, Trophy, Target, Search } from 'lucide-react';
import UserProfileModal from './UserProfileModal';
import './Home.css';

interface HomeProps {
  user: any;
  onRoomJoined: (room: any) => void;
  onLogout: () => void;
}

const Home: React.FC<HomeProps> = ({ user, onRoomJoined, onLogout }) => {
  const [roomId, setRoomId] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isManualCheck, setIsManualCheck] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<1 | 2 | 3>(2);
  const [publicRooms, setPublicRooms] = useState<{ id: string, playerCount: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Social State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
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

    if (type === 'bot') {
      socket.emit('createBotRoom', { playerName, difficulty: botDifficulty, isManualCheck, mongoId: user.id });
    } else {
      socket.emit('createRoom', { playerName, isPublic: type === 'public', isManualCheck, mongoId: user.id });
    }
  };

  const handleJoinRoom = (id?: string) => {
    const targetRoomId = id || roomId;
    if (!targetRoomId.trim()) return setError('Please enter room ID');
    setIsLoading(true);
    connectSocket(playerName);
    socket.emit('joinRoom', { roomId: targetRoomId.toUpperCase(), playerName, mongoId: user.id });
  };

  const refreshPublicRooms = () => {
    socket.emit('getPublicRooms');
  };

  // Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        try {
          setSearchLoading(true);
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <>
      <div className="home-container animate-fade-in">
      {/* User Profile Bar */}
      <div className="profile-bar glass-panel">
        <div className="profile-info">
          <div className="profile-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} />
            ) : (
              <User size={24} />
            )}
          </div>
          <div className="profile-details">
            <span className="profile-name">{user.username}</span>
            <div className="profile-stats-mini">
              <span className="stat-badge win"><Trophy size={12} /> {user.stats?.wins || 0}W</span>
              <span className="stat-badge loss"><Target size={12} /> {user.stats?.losses || 0}L</span>
            </div>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={18} />
        </button>
      </div>

      <div className="hero-section animate-float">
        <h1 className="text-gradient">A-MATH</h1>
        <p>Mathematical Crossword Board Game</p>
      </div>

      <div className="main-card glass-panel">
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
              publicRooms.map(room => (
                <div key={room.id} className="room-item group">
                  <div className="room-info">
                    <span className="room-id">
                      <Hash size={16} className="text-indigo-400" />
                      {room.id}
                    </span>
                    <span className="room-players">
                      <Users size={14} />
                      {room.playerCount}/2 Players
                    </span>
                  </div>
                  <button
                    className="btn-secondary p-2 sm:px-4 sm:py-2 text-sm ml-2 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10"
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={isLoading}
                  >
                    <span className="hidden sm:inline">Join Room</span>
                    <ChevronRight size={18} className="sm:hidden" />
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

      {/* Social & Search Section */}
      <div className="main-card glass-panel mt-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="text-indigo-400" />
          Friends & Search
        </h3>
        
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="modern-input pl-10 bg-black/40 border-slate-700 w-full text-sm"
            placeholder="Search players by exact or partial username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchLoading && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              <RefreshCcw size={16} className="text-indigo-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="bg-black/40 rounded-xl overflow-hidden mb-6 border border-white/5">
            <div className="px-4 py-2 bg-white/5 border-b border-white/5 text-xs font-bold text-slate-400 uppercase tracking-wider">
              Search Results
            </div>
            {searchResults.length > 0 ? (
              <div className="divide-y divide-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                {searchResults.map(result => (
                  <button 
                    key={result._id}
                    className="w-full flex items-center gap-3 p-3 hover:bg-indigo-500/20 transition-colors text-left"
                    onClick={() => setSelectedUserId(result._id)}
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 border border-indigo-400/30 overflow-hidden">
                      {result.avatar ? <img src={result.avatar} alt="avatar" className="w-full h-full object-cover" /> : <User size={16} className="text-white" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-200">{result.username}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">W: {result.stats?.wins || 0} / L: {result.stats?.losses || 0}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm">
                No players found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}

        {/* Pending Requests */}
        {user.friendRequests && user.friendRequests.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-2">
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Pending Requests</h4>
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{user.friendRequests.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {user.friendRequests.map((req: any) => (
                <button
                  key={req._id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors text-left"
                  onClick={() => setSelectedUserId(req._id)}
                >
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shrink-0 border border-purple-400/30 overflow-hidden relative">
                    {req.avatar ? <img src={req.avatar} alt="avatar" className="w-full h-full object-cover" /> : <User size={18} className="text-white" />}
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1e1e2d]"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{req.username}</div>
                    <div className="text-xs text-purple-300">Wants to be friends</div>
                  </div>
                  <ChevronRight size={16} className="text-purple-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div>
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">My Friends ({user.friends?.length || 0})</h4>
          {user.friends && user.friends.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {user.friends.map((friend: any) => (
                <button
                  key={friend._id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/5 hover:bg-white/10 transition-colors text-left"
                  onClick={() => setSelectedUserId(friend._id)}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-slate-600 overflow-hidden">
                    {friend.avatar ? <img src={friend.avatar} alt="avatar" className="w-full h-full object-cover" /> : <User size={18} className="text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-200 truncate">{friend.username}</div>
                    <div className="text-xs text-slate-500 truncate">
                      Lvl {Math.floor((friend.stats?.gamesPlayed || 0) / 5) + 1} | W: {friend.stats?.wins || 0}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-black/20 rounded-xl border border-white/5 text-slate-500 text-sm">
              You haven't added any friends yet. <br/>Use the search bar above to find players!
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
    </>
  );
}

export default Home;
