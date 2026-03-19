import React, { useState, useEffect } from 'react';
import { X, Calendar, Hash, Target, Trophy, Swords, XCircle, Timer, Skull } from 'lucide-react';

interface MatchHistoryModalProps {
  userId: string;
  username: string;
  onClose: () => void;
}

const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({ userId, username, onClose }) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/user/${userId}/matches`);
        if (!res.ok) throw new Error('Failed to load match history');
        const data = await res.json();
        setMatches(data.matches);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getMatchSummary = (match: any) => {
    const myPlayer = match.players.find((p: any) => 
      p.userId?._id === userId || 
      p.userId === userId || 
      p.username === username
    );
    const opponent = match.players.find((p: any) => 
      p.username !== myPlayer?.username
    );

    const isMeWinnerId = match.winnerId === userId || (match.winnerId?._id === userId);
    
    let resultText = 'Draw';
    let resultColor = 'text-slate-400';
    let ResultIcon = Target;

    if (match.isDraw) {
      resultText = 'Draw';
    } else if (match.winnerId) {
      // Prioritize explicit winnerId from server (handles surrenders correctly)
      if (isMeWinnerId) {
        resultText = 'Victory';
        resultColor = 'text-green-400';
        ResultIcon = Trophy;
      } else {
        resultText = 'Defeat';
        resultColor = 'text-red-400';
        ResultIcon = XCircle;
      }
    } else {
      // Fallback for older matches or Bot matches where winnerId might be null
      if (myPlayer && myPlayer.score > (opponent?.score || 0)) {
        resultText = 'Victory';
        resultColor = 'text-green-400';
        ResultIcon = Trophy;
      } else {
        resultText = 'Defeat';
        resultColor = 'text-red-400';
        ResultIcon = XCircle;
      }
    }

    if (match.reason === 'surrender') {
        const isMySurrender = (!match.isDraw && !isMeWinnerId);
        resultText += isMySurrender ? ' (Surr)' : ' (Opp Surr)';
    }

    const opponentName = opponent?.isBot ? `Bot (${match.reason === 'surrender' && !isMeWinnerId ? 'Won' : 'L3'})` : (opponent?.username || 'Unknown');

    return {
      opponentName,
      myScore: myPlayer?.score || 0,
      oppScore: opponent?.score || 0,
      resultText,
      resultColor,
      ResultIcon
    };
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-lg p-0 overflow-hidden relative flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Swords size={20} className="text-indigo-400" />
            Match History <span className="text-slate-500 text-sm font-normal ml-2">({username})</span>
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl border border-white/5"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">{error}</div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Timer size={48} className="mx-auto mb-3 opacity-20" />
              <p>No matches played yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map(match => {
                const summary = getMatchSummary(match);
                const { ResultIcon } = summary;
                return (
                  <div key={match._id} className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border bg-black/40 ${
                        summary.resultText.includes('Victory') ? 'border-green-500/50 text-green-400' :
                        summary.resultText.includes('Defeat') ? 'border-red-500/50 text-red-400' :
                        'border-slate-500/50 text-slate-400'
                      }`}>
                        <ResultIcon size={20} />
                      </div>
                      <div>
                        <div className={`font-bold ${summary.resultColor}`}>{summary.resultText}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar size={12} /> {formatDate(match.playedAt)}
                          <span className="mx-1">•</span>
                          {Math.floor(match.duration / 60)}m {match.duration % 60}s
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 bg-white/5 rounded-lg px-3 py-2">
                       <div className="text-right">
                         <div className="text-xs text-indigo-300 font-bold">You</div>
                         <div className="font-mono font-bold text-white">{summary.myScore}</div>
                       </div>
                       <div className="text-slate-500 font-bold text-sm">vs</div>
                       <div className="text-left">
                         <div className="text-xs text-rose-300 font-bold truncate max-w-[80px]" title={summary.opponentName}>{summary.opponentName}</div>
                         <div className="font-mono font-bold text-white">{summary.oppScore}</div>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchHistoryModal;
