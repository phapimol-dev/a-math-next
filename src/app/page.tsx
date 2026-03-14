"use client";

import React, { useState, useEffect } from 'react';
import Auth from '../components/Auth';
import Home from '../components/Home';
import Game from '../components/Game';
import { disconnectSocket } from '../socket';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';

  // Check for existing session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
          setUser(data.user);
          setToken(savedToken);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthenticated = (userData: any, authToken: string) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    setRoom(null);
    disconnectSocket();
  };

  const handleRoomJoined = (roomData: any) => {
    setRoom(roomData);
  };

  const handleLeaveRoom = () => {
    disconnectSocket();
    setRoom(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black text-gradient mb-4">A-MATH</h1>
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {!user ? (
        <Auth onAuthenticated={handleAuthenticated} />
      ) : !room ? (
        <Home user={user} onRoomJoined={handleRoomJoined} onLogout={handleLogout} />
      ) : (
        <Game room={room} onLeave={handleLeaveRoom} user={user} />
      )}
    </main>
  );
}
