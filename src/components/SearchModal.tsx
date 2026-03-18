import React, { useState, useEffect } from 'react';
import { Search, X, User, Trophy, Target } from 'lucide-react';
import UserProfileModal from './UserProfileModal';
import { translations, Language, TranslationKey } from '../lib/translations';
import './SearchModal.css';

interface SearchModalProps {
  onClose: () => void;
  onSearchProfile: (userId: string) => void;
  language?: Language;
}

const SearchModal: React.FC<SearchModalProps> = ({ onClose, onSearchProfile, language = 'TH' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const t = (key: TranslationKey) => translations[language][key] || key;

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

  const handleProfileClick = (userId: string) => {
    setSelectedUserId(userId);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <>
      <div className="search-modal-overlay" onClick={onClose}>
        <div className="search-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="search-modal-header">
            <h2 className="search-modal-title">
              <Search className="text-indigo-400" />
              Search Players
            </h2>
            <button className="search-modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="search-modal-body">
            <div className="search-input-group">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder={t('searchPlayers') || "Search players..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                autoFocus
              />
              {searchLoading && <div className="search-spinner" />}
            </div>

            {searchQuery.length >= 2 && !searchLoading && (
              <div className="search-status">
                {searchResults.length > 0 
                  ? `Found ${searchResults.length} player${searchResults.length !== 1 ? 's' : ''}`
                  : 'No players found'
                }
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(result => (
                  <div
                    key={result._id}
                    className="search-result-item"
                    onClick={() => handleProfileClick(result._id)}
                  >
                    <div className="result-avatar">
                      {result.avatar ? <img src={result.avatar} alt="" /> : <User size={16} />}
                    </div>
                    <div className="result-info">
                      <span className="result-name">{result.username}</span>
                      <span className="result-stats">
                        <Trophy size={12} className="text-yellow-400" /> {result.stats?.wins || 0}W / 
                        <Target size={12} className="text-red-400" /> {result.stats?.losses || 0}L
                      </span>
                      <span className="result-level">
                        Level {Math.floor((result.stats?.gamesPlayed || 0) / 5) + 1}
                      </span>
                    </div>
                    <div className="result-chevron">
                      <X size={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!searchQuery && (
              <div className="search-placeholder">
                <Search size={48} className="placeholder-icon" />
                <h3>Search for Players</h3>
                <p>Type at least 2 characters to start searching for players</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          currentUser={null}
          onClose={() => {
            setSelectedUserId(null);
            onClose();
          }}
        />
      )}
    </>
  );
};

export default SearchModal;
