"use client";

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Auth from '../components/Auth';
import Home from '../components/Home';
import Game from '../components/Game';
import Navbar from '../components/Navbar';
import RankingModal from '../components/RankingModal';
import MatchHistoryModal from '../components/MatchHistoryModal';
import UserProfileModal from '../components/UserProfileModal';
import { disconnectSocket } from '../socket';
import { Language } from '../lib/translations';

export default function App() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [showRanking, setShowRanking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSearchUserId, setSelectedSearchUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('TH');
  const [isMounted, setIsMounted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(1200); // Default for SSR

  useEffect(() => {
    setIsMounted(true);
    // Load language from localStorage only on client mount
    const savedLang = localStorage.getItem('gameLanguage') as Language;
    if (savedLang) setLanguage(savedLang);

    // Handle window resize
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize(); // Initial set
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gameLanguage', lang);
    }
  };

  const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';

  // Synchronize NextAuth session with our local user state
  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.id) {
      // Fetch fresh user data from our backend to get stats, friends, avatar
      fetch(`${API_URL}/api/users/${(session.user as any).id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setUser({
              id: data._id,
              mongoId: data._id,
              username: data.username,
              avatar: data.avatar,
              stats: data.stats,
              friends: data.friends,
              friendRequests: data.friendRequests
            });
          }
        })
        .catch(err => console.error("Failed to sync user data:", err));
    } else if (status === 'unauthenticated') {
      setUser(null);
    }
  }, [session, status]);

  const handleLogout = async () => {
    disconnectSocket();
    setRoom(null);
    setUser(null);
    await signOut({ callbackUrl: '/' });
  };

  const handleRoomJoined = (roomData: any) => {
    setRoom(roomData);
  };

  const handleLeaveRoom = () => {
    disconnectSocket();
    setRoom(null);
  };

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black text-gradient mb-4">A-MATH</h1>
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </main>
    );
  }

  // The Navbar should have padding except when in game on mobile
  const showNavPadding = user && (!room || windowWidth > 768);

  if (!isMounted) return null; // Prevent hydration flash

  return (
    <main className={`min-h-screen bg-[#0a0a0a] ${showNavPadding ? 'pt-16' : ''}`}>
      {user && (
        <Navbar 
          user={user} 
          onLogout={handleLogout} 
          onGoHome={handleLeaveRoom} 
          onShowRanking={() => setShowRanking(true)}
          onShowHistory={() => setShowHistory(true)}
          onSearchProfile={(id) => setSelectedSearchUserId(id)}
          isInGame={!!room} 
          language={language}
        />
      )}
      {!user ? (
        <Auth />
      ) : !room ? (
        <Home user={user} onRoomJoined={handleRoomJoined} onLogout={handleLogout} />
      ) : (
        <Game room={room} onLeave={handleLeaveRoom} user={user} languageProp={language} onLanguageChange={handleSetLanguage} />
      )}

      {showRanking && <RankingModal onClose={() => setShowRanking(false)} language={language} />}
      {showHistory && user && (
        <MatchHistoryModal 
          userId={user.id} 
          username={user.username} 
          onClose={() => setShowHistory(false)} 
        />
      )}
      {selectedSearchUserId && (
        <UserProfileModal
          userId={selectedSearchUserId}
          currentUser={user}
          onClose={() => setSelectedSearchUserId(null)}
        />
      )}
    </main>
  );
}
