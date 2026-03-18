import { LogOut, Home, User, Gamepad2, Settings as SettingsIcon, Trophy, Target, Menu, X, Search, RefreshCcw, Users } from 'lucide-react';
import { translations, Language, TranslationKey } from '../lib/translations';
import './Navbar.css';
import React from 'react';
import FriendsModal from './FriendsModal';
import SearchModal from './SearchModal';

interface NavbarProps {
  user: any;
  onLogout: () => void;
  onGoHome?: () => void;
  onShowHistory?: () => void;
  onShowRanking?: () => void;
  onSearchProfile?: (userId: string) => void;
  isInGame?: boolean;
  language?: Language;
}

const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onGoHome,
  onShowHistory,
  onShowRanking,
  onSearchProfile,
  isInGame,
  language = 'TH'
}) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [showFriendsModal, setShowFriendsModal] = React.useState(false);
  const [showSearchModal, setShowSearchModal] = React.useState(false);

  if (!user) return null;

  const t = (key: TranslationKey) => translations[language][key] || key;

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => {
    setIsMenuOpen(false);
    setShowSearchModal(false);
  };

  return (
    <>
      <nav className={`global-navbar ${isInGame ? 'is-in-game' : ''}`}>
        <div className="navbar-content">
          <div className="navbar-brand" onClick={() => { onGoHome?.(); closeMenu(); }} style={{ cursor: 'pointer' }}>
            <div className="brand-logo">A</div>
            <span className="brand-text">A-MATH</span>
          </div>

          {/* Mobile Toggle */}
          <button className="mobile-toggle" onClick={toggleMenu} aria-label="Toggle Menu">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className={`navbar-actions ${isMenuOpen ? 'mobile-open' : ''}`}>
            {/* Friends & Search Buttons */}
            {!isInGame && (
              <div className="navbar-social-buttons">
                <button 
                  className="nav-social-btn" 
                  onClick={() => { setShowFriendsModal(true); closeMenu(); }}
                  title="Friends"
                >
                  <Users size={18} />
                  <span className="nav-text">Friends</span>
                  {user.friendRequests && user.friendRequests.length > 0 && (
                    <span className="notification-badge">{user.friendRequests.length}</span>
                  )}
                </button>
              </div>
            )}

            <button className="nav-link" onClick={() => { onShowRanking?.(); closeMenu(); }}>
              <Trophy size={18} className="text-yellow-400" />
              <span className="nav-text">{t('ranking')}</span>
            </button>

            <div className="nav-divider"></div>

            <div className="nav-profile-group cursor-pointer">
              <div className="user-profile interactive" onClick={() => { onShowHistory?.(); closeMenu(); }} title="View Match History">
                <div className="profile-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} />
                  ) : (
                    <User size={18} />
                  )}
                </div>
                <div className="profile-details">
                  <span className="profile-name">{user.username}</span>
                  <div className="profile-stats-mini">
                    <span className="stat-badge win"><Trophy size={10} /> {user.stats?.wins || 0}W</span>
                    <span className="stat-badge loss"><Target size={10} /> {user.stats?.losses || 0}L</span>
                  </div>
                </div>
              </div>

              <button className="logout-btn" onClick={(e) => { e.stopPropagation(); onLogout(); closeMenu(); }} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Overlay Background */}
        {isMenuOpen && <div className="mobile-overlay" onClick={closeMenu}></div>}
      </nav>
      
      {/* Friends Modal */}
      {showFriendsModal && (
        <FriendsModal
          user={user}
          onClose={() => setShowFriendsModal(false)}
          language={language}
        />
      )}
      
      {/* Search Modal */}
      {showSearchModal && (
        <SearchModal
          onClose={() => setShowSearchModal(false)}
          onSearchProfile={onSearchProfile || (() => {})}
          language={language}
        />
      )}
    </>
  );
};

export default Navbar;
