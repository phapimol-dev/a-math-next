import React, { useState, useEffect } from 'react';
import { Users, UserPlus, X, Search, ChevronRight, User, Trophy, Target } from 'lucide-react';
import UserProfileModal from './UserProfileModal';
import { translations, Language, TranslationKey } from '../lib/translations';
import './FriendsModal.css';

interface FriendsModalProps {
  user: any;
  onClose: () => void;
  language?: Language;
}

const FriendsModal: React.FC<FriendsModalProps> = ({ user, onClose, language = 'TH' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const handleFriendAction = async (action: 'request' | 'accept' | 'decline' | 'remove', targetUserId: string) => {
    try {
      // Prevent adding yourself as friend
      if (action === 'request' && targetUserId === user.id) {
        alert('You cannot add yourself as a friend!');
        return;
      }

      setActionLoading(targetUserId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found in localStorage');
        return;
      }
      
      const body: any = {};
      if (action === 'request') body.targetUserId = targetUserId;
      else if (action === 'accept' || action === 'decline') body.requesterId = targetUserId;
      else if (action === 'remove') body.friendId = targetUserId;

      console.log('Sending friend request:', { action, body, token: token.substring(0, 10) + '...' });

      const res = await fetch(`/api/friends/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
      }

      // Refresh user data or update local state
      window.location.reload();
    } catch (err: any) {
      console.error('Friend action error:', err);
      alert(err.message || 'Failed to perform friend action');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div className="friends-modal-overlay" onClick={onClose}>
        <div className="friends-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="friends-modal-header">
            <h2 className="friends-modal-title">
              <Users className="text-indigo-400" />
              Friends & Search
            </h2>
            <button className="friends-modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="friends-modal-body">
            {/* Search Section */}
            <div className="friends-search-section">
              <div className="search-input-group">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder={t('searchPlayers') || "Search players..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchLoading && <div className="search-spinner" />}
              </div>

              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map(result => (
                    <div key={result._id} className="search-result-item">
                      <div className="result-avatar">
                        {result.avatar ? <img src={result.avatar} alt="" /> : <User size={16} />}
                      </div>
                      <div className="result-info">
                        <span className="result-name">{result.username}</span>
                        <span className="result-stats">W: {result.stats?.wins || 0} / L: {result.stats?.losses || 0}</span>
                      </div>
                      <button
                        className="add-friend-btn"
                        onClick={() => handleFriendAction('request', result._id)}
                        disabled={actionLoading === result._id || result._id === user.id}
                        title={result._id === user.id ? "Cannot add yourself" : "Add friend"}
                      >
                        <UserPlus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Requests */}
            {user.friendRequests && user.friendRequests.length > 0 && (
              <div className="pending-requests">
                <div className="section-header">
                  <h4>Pending Requests</h4>
                  <span className="request-count">{user.friendRequests.length}</span>
                </div>
                <div className="requests-list">
                  {user.friendRequests.map((req: any) => (
                    <div key={req._id} className="request-item">
                      <div className="request-avatar">
                        {req.avatar ? <img src={req.avatar} alt="" /> : <User size={18} />}
                      </div>
                      <div className="request-info">
                        <div className="request-name">{req.username}</div>
                        <div className="request-status">Wants to be friends</div>
                      </div>
                      <div className="request-actions">
                        <button
                          className="accept-btn"
                          onClick={() => handleFriendAction('accept', req._id)}
                          disabled={actionLoading === req._id}
                        >
                          Accept
                        </button>
                        <button
                          className="decline-btn"
                          onClick={() => handleFriendAction('decline', req._id)}
                          disabled={actionLoading === req._id}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            <div className="friends-list">
              <div className="section-header">
                <h4>My Friends ({user.friends?.length || 0})</h4>
              </div>
              {user.friends && user.friends.length > 0 ? (
                <div className="friends-grid">
                  {user.friends.map((friend: any) => (
                    <div
                      key={friend._id}
                      className="friend-item"
                      onClick={() => setSelectedUserId(friend._id)}
                    >
                      <div className="friend-avatar">
                        {friend.avatar ? <img src={friend.avatar} alt="" /> : <User size={18} />}
                      </div>
                      <div className="friend-info">
                        <div className="friend-name">{friend.username}</div>
                        <div className="friend-stats">
                          Lvl {Math.floor((friend.stats?.gamesPlayed || 0) / 5) + 1} | W: {friend.stats?.wins || 0}
                        </div>
                      </div>
                      <ChevronRight size={16} className="friend-chevron" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-friends">
                  <Users size={48} className="no-friends-icon" />
                  <p>You haven't added any friends yet!</p>
                  <p>Use the search bar above to find players.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          currentUser={user}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>
  );
};

export default FriendsModal;
