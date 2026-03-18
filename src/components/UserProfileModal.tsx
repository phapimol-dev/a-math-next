import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserMinus, Check, Clock, Trophy, Swords, Medal, Target } from 'lucide-react';
import MatchHistoryModal from './MatchHistoryModal';

interface UserProfileModalProps {
  userId: string;
  currentUser: any;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, currentUser, onClose }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      setProfile(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'request' | 'accept' | 'decline' | 'remove') => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const body: any = {};
      if (action === 'request') body.targetUserId = userId;
      else if (action === 'accept' || action === 'decline') body.requesterId = userId;
      else if (action === 'remove') body.friendId = userId;

      const res = await fetch(`/api/friends/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Action failed');

      // Refresh profile to update button states
      await fetchProfile();
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="glass-panel w-full max-w-sm p-8 text-center animate-pulse">
          <div className="w-20 h-20 bg-white/10 rounded-full mx-auto mb-4"></div>
          <div className="h-6 bg-white/10 rounded w-1/2 mx-auto mb-2"></div>
          <div className="h-4 bg-white/10 rounded w-1/3 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="glass-panel w-full max-w-sm p-6 text-center">
          <h3 className="text-xl font-bold text-red-400 mb-2">Error</h3>
          <p className="text-slate-300 mb-6">{error || 'Profile not found'}</p>
          <button className="btn-secondary w-full" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const isSelf = currentUser.id === userId;
  const isFriend = currentUser.friends?.includes(userId);
  const hasSentRequest = profile.friendRequests?.some((req: any) => req._id === currentUser.id);
  const hasReceivedRequest = currentUser.friendRequests?.includes(userId);

  const stats = profile.stats || { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, totalScore: 0, bestScore: 0 };
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md p-0 overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white/70 hover:text-white hover:bg-black/40 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header Cover & Avatar */}
        <div className="h-24 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-4 border-[#0f172a] bg-indigo-500 flex items-center justify-center overflow-hidden">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white uppercase">{profile.username.substring(0, 2)}</span>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-12 px-6 pb-6 text-center text-white">
          <h2 className="text-2xl font-bold mb-1">{profile.username}</h2>
          <p className="text-indigo-400 text-sm font-medium mb-6">Level {Math.floor(stats.gamesPlayed / 5) + 1}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <Trophy size={18} className="text-yellow-400 mx-auto mb-1" />
              <div className="text-xs text-slate-400 mb-1 flex flex-wrap text-[.75rem]">
                Player/Win/Loss
                {/* <div className='break-words text-[.75rem]'>Played/</div>
                <div className='break-words text-[.75rem]'>Won/</div>
                <div className='break-words text-[.75rem]'>Lost</div> */}
              </div>
              <div className="font-bold">{stats.gamesPlayed} / {stats.wins} / {stats.losses}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <Target size={18} className="text-green-400 mx-auto mb-1" />
              <div className="text-xs text-slate-400 mb-1">Win Rate</div>
              <div className="font-bold">{winRate}%</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <Medal size={18} className="text-purple-400 mx-auto mb-1" />
              <div className="text-xs text-slate-400 mb-1">Best Score</div>
              <div className="font-bold">{stats.bestScore}</div>
            </div>
          </div>

          {/* Actions */}
          {!isSelf && (
            <div className="flex flex-col gap-2">
              {isFriend ? (
                <button
                  onClick={() => handleAction('remove')}
                  disabled={actionLoading}
                  className="btn-secondary w-full border-red-500/30 text-red-200 hover:bg-red-500/20"
                >
                  <UserMinus size={18} className="mr-2" /> Unfriend
                </button>
              ) : hasReceivedRequest ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction('accept')}
                    disabled={actionLoading}
                    className="btn-primary flex-1"
                  >
                    <Check size={18} className="mr-2" /> Accept
                  </button>
                  <button
                    onClick={() => handleAction('decline')}
                    disabled={actionLoading}
                    className="btn-secondary flex-1 border-red-500/30 text-red-200"
                  >
                    <X size={18} className="mr-2" /> Decline
                  </button>
                </div>
              ) : hasSentRequest ? (
                <button disabled className="btn-secondary w-full opacity-50 cursor-not-allowed">
                  <Clock size={18} className="mr-2" /> Request Sent
                </button>
              ) : (
                <button
                  onClick={() => handleAction('request')}
                  disabled={actionLoading}
                  className="btn-primary w-full"
                >
                  <UserPlus size={18} className="mr-2" /> Add Friend
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
