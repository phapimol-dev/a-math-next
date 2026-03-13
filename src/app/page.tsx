"use client";

import React, { useState } from 'react';
import Home from '../components/Home';
import Game from '../components/Game';
import { disconnectSocket } from '../socket';

export default function App() {
  const [room, setRoom] = useState<any>(null);

  const handleRoomJoined = (roomData: any) => {
    setRoom(roomData);
  };

  const handleLeaveRoom = () => {
    disconnectSocket();
    setRoom(null);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {!room ? (
        <Home onRoomJoined={handleRoomJoined} />
      ) : (
        <Game room={room} onLeave={handleLeaveRoom} />
      )}
    </main>
  );
}
