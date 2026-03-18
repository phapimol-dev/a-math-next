import React, { useState, useEffect } from 'react';
import { X, Trophy, Swords, Medal, Star } from 'lucide-react';
import { translations, Language, TranslationKey } from '../lib/translations';

interface RankingUser {
  _id: string;
  username: string;
  avatar: string | null;
  stats: {
    wins: number;
    bestTurnScore: number;
    bestScore: number;
  };
}

interface RankingsData {
  topWins: RankingUser[];
  topTurnScores: RankingUser[];
}

interface RankingModalProps {
  onClose: () => void;
  language?: Language;
}

const RankingModal: React.FC<RankingModalProps> = ({ onClose, language = 'TH' }) => {
  const [data, setData] = useState<RankingsData | null>(null);
  const [activeTab, setActiveTab] = useState<'wins' | 'turn'>('wins');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = (key: TranslationKey) => translations[language][key] || key;

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/rankings');
        if (!res.ok) throw new Error('Failed to load rankings');
        const rankings = await res.json();
        setData(rankings);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, []);

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/50';
      case 1: return 'text-slate-300 bg-slate-300/10 border-slate-300/50';
      case 2: return 'text-orange-400 bg-orange-400/10 border-orange-400/50';
      default: return 'text-indigo-400/80 bg-indigo-400/5 border-white/10';
    }
  };

  const currentList = activeTab === 'wins' ? data?.topWins : data?.topTurnScores;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-lg p-0 overflow-hidden relative flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Trophy size={24} className="text-yellow-400" />
              {t('ranking').toUpperCase()}
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{t('globalLeaderboard')}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-2 bg-black/40 border-b border-white/5">
          <button 
            onClick={() => setActiveTab('wins')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'wins' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Medal size={18} /> {t('mostWins')}
          </button>
          <button 
            onClick={() => setActiveTab('turn')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'turn' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Star size={18} /> {t('bestTurn')}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl border border-white/5"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-400 mb-2">Error loading rankings</div>
              <p className="text-slate-500 text-sm">{error}</p>
            </div>
          ) : !currentList || currentList.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Swords size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">{t('noCompetitionData')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentList.map((user, index) => (
                <div key={user._id} className="group relative bg-white/5 hover:bg-white/[0.08] rounded-2xl p-4 border border-white/5 transition-all flex items-center gap-4 overflow-hidden">
                  {/* Rank Badge */}
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black italic shadow-lg shrink-0 ${getRankColor(index)}`}>
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center overflow-hidden shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-indigo-400">{user.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-black text-white truncate">{user.username}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter flex gap-2">
                      <span>{user.stats.wins} Wins</span>
                      <span className="opacity-30">•</span>
                      <span>Best: {user.stats.bestScore} pts</span>
                    </div>
                  </div>

                  {/* Main Stat */}
                  <div className="text-right shrink-0 pr-2">
                    <div className="text-2xl font-black text-white leading-none">
                      {activeTab === 'wins' ? user.stats.wins : user.stats.bestTurnScore}
                    </div>
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">
                      {activeTab === 'wins' ? t('mostWins') : t('ptsTurn')}
                    </div>
                  </div>

                  {/* Polish side accent */}
                  <div className={`absolute right-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity ${index < 3 ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RankingModal;
