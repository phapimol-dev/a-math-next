import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { generateTiles, drawTiles } from "./src/lib/tiles.js";
import { validateEquation, extractEquations, calculateScore } from "./src/lib/math_validator.js";
import { findBotMove } from "./src/lib/bot_ai.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// Initialize Next.js only if NOT in Pure Backend mode
let app = null;
let handle = null;

if (process.env.PURE_BACKEND !== "true") {
  app = next({ dev, hostname, port });
  handle = app.getRequestHandler();
}

const httpServer = createServer((req, res) => {
  try {
    const parsedUrl = parse(req.url, true);
    if (handle) {
      handle(req, res, parsedUrl);
    } else {
      res.statusCode = 404;
      res.end('A-Math Backend is running (Socket mode)');
    }
  } catch (err) {
    console.error('Error handling request:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

httpServer.on('error', (err) => {
  console.error('HTTP Server Error:', err);
});

const io = new Server(httpServer, {
  cors: { 
    origin: [
      "http://localhost:3000", 
      "http://localhost:3001",
      /\.pages\.dev$/, 
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ["GET", "POST"] 
  }
});

const rooms = new Map();
  const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const SPECIAL_SQUARES = {
    'TWS': [[0,0], [0,7], [0,14], [7,0], [7,14], [14,0], [14,7], [14,14]],
    'DWS': [[1,1], [2,2], [3,3], [4,4], [1,13], [2,12], [3,11], [4,10], 
            [13,1], [12,2], [11,3], [10,4], [13,13], [12,12], [11,11], [10,10]],
    'TLS': [[1,5], [1,9], [5,1], [5,5], [5,9], [5,13], [9,1], [9,5], [9,9], [9,13], [13,5], [13,9]],
    'DLS': [[0,3], [0,11], [2,6], [2,8], [3,0], [3,7], [3,14], [6,2], [6,6], [6,8], [6,12], 
            [7,3], [7,11], [8,2], [8,6], [8,8], [8,12], [11,0], [11,7], [11,14], [12,6], [12,8], [14,3], [14,11]]
  };

  const createBoard = () => {
    const board = Array(15).fill(null).map(() => Array(15).fill(null));
    for(let y=0; y<15; y++) {
      for(let x=0; x<15; x++) {
        board[y][x] = { tile: null, special: null };
        for(const [type, coords] of Object.entries(SPECIAL_SQUARES)) {
          if(coords.find(c => c[0] === y && c[1] === x)) board[y][x].special = type;
        }
      }
    }
    return board;
  };

// Helper: Trigger Bot Turn
  const triggerBotTurn = (roomId) => {
    setTimeout(() => {
       const room = rooms.get(roomId);
       if (!room || room.gameState !== "playing") return;
       
       const currentPlayer = room.players[room.turnIndex];
       if (!currentPlayer.isBot) return;
  
       // Signal UI that bot is calculating
       io.to(roomId).emit("botThinking", true);
  
       // We use another timeout so the "Thinking..." UI has time to render before heavy sync calculations
       setTimeout(() => {
          const move = findBotMove(room, currentPlayer.rack, room.botDifficulty);
          
          io.to(roomId).emit("botThinking", false);
  
          if (move) {
             // Execute Bot Move
             const { placements, score, equations } = move;
             
             console.log(`[Bot Move] L${room.botDifficulty} executing move worth ${score} pts.`);
             
             // Update board
             placements.forEach(p => {
               room.board[p.y][p.x].tile = p.tile;
             });
  
             // Calculate score + Bingo
             let finalScore = score;
             currentPlayer.score += finalScore;
  
             // Draw tiles & Remove used from rack
             const usedIds = placements.map(p => p.tile.id);
             const newTiles = drawTiles(room.tiles, placements.length);
             currentPlayer.rack = [
               ...currentPlayer.rack.filter(t => !usedIds.includes(t.id)),
               ...newTiles
             ];
  
             // Save last move for Challenge mechanics (Even though challenging a bot is silly, rules are rules)
             room.lastMove = {
               playerIndex: room.turnIndex,
               scoreGained: finalScore,
               drawnTiles: newTiles,
               placements: placements,
               wasValid: true // AI only makes valid moves
             };
  
             commitTurn(room);
             io.to(roomId).emit("moveMade", { room, moveScore: finalScore });
          } else {
             console.log(`[Bot Move] L${room.botDifficulty} found no moves. Swapping tiles.`);
             // Execute Bot Swap (Skip)
             // Swap up to 3 tiles if possible, or all
             const swapCount = Math.min(3, currentPlayer.rack.length);
             const tilesToSwap = currentPlayer.rack.slice(0, swapCount);
             const tileIds = tilesToSwap.map(t => t.id);
  
             room.tiles.push(...tilesToSwap);
             currentPlayer.rack = currentPlayer.rack.filter(t => !tileIds.includes(t.id));
  
             const newTiles = drawTiles(room.tiles, tilesToSwap.length);
             currentPlayer.rack.push(...newTiles);
  
             room.lastMove = null;
             commitTurn(room);
             io.to(roomId).emit("moveMade", { room, moveScore: 0 });
          }
       }, 500); // UI render delay
    }, 1500); // 1.5s human-like pause before bot starts thinking
  };

// Helper: Centralized turn switch with time deduction
  const commitTurn = (room) => {
    if (!room || room.gameState !== "playing") return;

    // Deduct time from the player who just finished
    const currentPlayer = room.players[room.turnIndex];
    if (room.lastTurnStartTime) {
      const elapsed = Date.now() - room.lastTurnStartTime;
      currentPlayer.timeLeft = Math.max(0, currentPlayer.timeLeft - elapsed);
    }

    // Switch turn
    room.turnIndex = (room.turnIndex + 1) % room.players.length;
    room.lastTurnStartTime = Date.now();
    
    // Check if next player is bot
    if (room.players[room.turnIndex].isBot) {
        triggerBotTurn(room.id);
    }
  };

  // Global Timeout Checker (Runs every 1 second)
  setInterval(() => {
    rooms.forEach((room, roomId) => {
      if (room.gameState !== "playing") return;
      
      const currentPlayer = room.players[room.turnIndex];
      const elapsed = Date.now() - room.lastTurnStartTime;
      const actualTimeLeft = currentPlayer.timeLeft - elapsed;

      if (actualTimeLeft <= 0) {
        currentPlayer.timeLeft = 0;
        room.gameState = "finished";
        const winnerIndex = (room.turnIndex + 1) % room.players.length;
        const winner = room.players[winnerIndex];
        
        console.log(`[Game Over] Room ${roomId} timed out. ${winner.name} wins!`);
        io.to(roomId).emit("gameOver", { 
          room, 
          reason: "timeout", 
          winnerId: winner.id,
          looserName: currentPlayer.name
        });
      }
    });
  }, 1000);

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("createRoom", ({ playerName, isPublic, isManualCheck }) => {
      const roomId = generateRoomId();
      const room = {
        id: roomId,
        isPublic,
        isManualCheck: !!isManualCheck,
        isBotRoom: false,
        lastMove: null,
        players: [{ id: socket.id, name: playerName, score: 0, rack: [], isBot: false, timeLeft: 22 * 60 * 1000 }],
        gameState: "waiting",
        board: createBoard(),
        tiles: generateTiles(),
        turnIndex: 0,
        lastTurnStartTime: null
      };
      rooms.set(roomId, room);
      socket.join(roomId);
      socket.emit("roomCreated", room);
      if (isPublic) io.emit("publicRoomsUpdate", getPublicRoomsList(rooms));
    });

    socket.on("createBotRoom", ({ playerName, difficulty, isManualCheck }) => {
      const roomId = generateRoomId();
      const room = {
        id: roomId,
        isPublic: false,
        isManualCheck: !!isManualCheck,
        isBotRoom: true,
        botDifficulty: difficulty || 2,
        lastMove: null,
        players: [
          { id: socket.id, name: playerName, score: 0, rack: [], isBot: false, timeLeft: 22 * 60 * 1000 },
          { id: `bot-${generateRoomId()}`, name: `A-Math Bot (L${difficulty})`, score: 0, rack: [], isBot: true, timeLeft: 22 * 60 * 1000 }
        ],
        gameState: "waiting",
        board: createBoard(),
        tiles: generateTiles(),
        turnIndex: 0,
        lastTurnStartTime: null
      };
      rooms.set(roomId, room);
      socket.join(roomId);
      socket.emit("roomCreated", room);
    });

    socket.on("joinRoom", ({ roomId, playerName }) => {
      const room = rooms.get(roomId);
      if (room && room.players.length < 2) {
        room.players.push({ id: socket.id, name: playerName, score: 0, rack: [], timeLeft: 22 * 60 * 1000 });
        socket.join(roomId);
        io.to(roomId).emit("playerJoined", room);
        if (room.isPublic && room.players.length >= 2) io.emit("publicRoomsUpdate", getPublicRoomsList(rooms));
      } else {
        socket.emit("error", room ? "Room is full" : "Room not found");
      }
    });

    socket.on("startGame", (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.players.length >= 2) {
        // Deal initial tiles
        room.players.forEach(p => {
          p.rack = drawTiles(room.tiles, 8);
        });
        room.gameState = "playing";
        room.lastTurnStartTime = Date.now();
        
        io.to(roomId).emit("gameStarted", room);

        // If it's the bot's turn first (randomly, or if index was set to 1) 
        if (room.players[room.turnIndex].isBot) {
            triggerBotTurn(roomId);
        }
        if (room.isPublic) io.emit("publicRoomsUpdate", getPublicRoomsList(rooms));
      }
    });

    socket.on("makeMove", ({ roomId, move }) => {
      const room = rooms.get(roomId);
      if (!room || room.gameState !== "playing") return;
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== room.turnIndex) return socket.emit("error", "Not your turn");

      if (!move.placements || move.placements.length === 0) {
        return socket.emit("error", "No tiles placed");
      }

      // Check horizontality / verticality
      const isHorizontal = move.placements.every(p => p.y === move.placements[0].y);
      const isVertical = move.placements.every(p => p.x === move.placements[0].x);
      if (!isHorizontal && !isVertical && move.placements.length > 1) {
        return socket.emit("error", "Tiles must be placed in a single row or column");
      }

      // Temporarily place tiles on board to extract equations
      move.placements.forEach(p => {
        room.board[p.y][p.x].tile = p.tile;
      });

      // Extract all formed equations
      const equations = extractEquations(room.board, move.placements);
      console.log(`[Move Made] Room: ${roomId}, Player: "${room.players[playerIndex].name}"`);
      console.log(`[Move Made] Equations detected: ${equations.map(e => `"${e.string}"`).join(", ")}`);
      
      // If no equations formed (e.g. just placed a single tile not connected to anything)
      if (equations.length === 0) {
        console.log(`[Move Made] Rejected: No equations formed`);
        // Revert board
        move.placements.forEach(p => room.board[p.y][p.x].tile = null);
        return socket.emit("error", "Must form an equation");
      }

      // Validate all equations
      const validationResults = equations.map(eq => ({
        eq: eq.string,
        valid: validateEquation(eq.string)
      }));
      
      const allValid = validationResults.every(r => r.valid);

      if (allValid || room.isManualCheck) {
        if (allValid) console.log(`[Move Made] Success: All equations are valid`);
        else console.log(`[Move Made] Manual Check Mode: Accepted invalid equations`);
        
        // Calculate score
        let moveScore = calculateScore(equations);
        if (move.placements.length >= 8) moveScore += 40; // Bingo bonus

        room.players[playerIndex].score += moveScore;
        
        // Draw new tiles
        const newTiles = drawTiles(room.tiles, move.placements.length);
        const usedIds = move.placements.map(p => p.tile.id);
        room.players[playerIndex].rack = [
          ...room.players[playerIndex].rack.filter(t => !usedIds.includes(t.id)),
          ...newTiles
        ];

        // Store lastMove for challenge system
        room.lastMove = {
          playerIndex,
          scoreGained: moveScore,
          drawnTiles: newTiles,
          placements: move.placements,
          wasValid: allValid
        };
        
        commitTurn(room);
        io.to(roomId).emit("moveMade", { room, moveScore });
      } else {
        const failed = validationResults.filter(r => !r.valid).map(r => r.eq);
        console.log(`[Move Made] Failure: Invalid equation(s) - ${failed.join(", ")}`);
        // Revert board if invalid
        move.placements.forEach(p => room.board[p.y][p.x].tile = null);
        socket.emit("error", "Invalid equation formed: " + failed.join(", "));
      }
    });

    socket.on("challenge", (roomId) => {
      const room = rooms.get(roomId);
      if (!room || room.gameState !== "playing") return;
      
      const challengerIndex = room.players.findIndex(p => p.id === socket.id);
      if (challengerIndex !== room.turnIndex) {
        return socket.emit("error", "You can only challenge during your turn");
      }
      
      const lastMove = room.lastMove;
      if (!lastMove) {
        return socket.emit("error", "No recent move to challenge");
      }

      if (!lastMove.wasValid) {
        // Challenge Successful! Equation was actually invalid.
        console.log(`[Challenge] Success in room ${roomId}. Voiding previous move and applying -10 penalty.`);
        const prevPlayer = room.players[lastMove.playerIndex];
        
        // 1. Revert score AND apply -10 penalty
        prevPlayer.score -= (lastMove.scoreGained + 10);
        
        // 2. Remove newly drawn tiles and return them to the bag
        const drawnIds = lastMove.drawnTiles.map(t => t.id);
        prevPlayer.rack = prevPlayer.rack.filter(t => !drawnIds.includes(t.id));
        room.tiles.push(...lastMove.drawnTiles);
        
        // 3. Revert board placements and return tiles to previous player's rack
        lastMove.placements.forEach(p => {
          room.board[p.y][p.x].tile = null;
          prevPlayer.rack.push(p.tile);
        });

        room.lastMove = null; // Clear last move
        commitTurn(room);
        io.to(roomId).emit("challengeResult", { success: true, room, penalty: 10 });
      } else {
        // Challenge Failed! Equation was valid.
        console.log(`[Challenge] Failed in room ${roomId}. (Equation was valid) Applying -10 penalty to challenger.`);
        
        // Apply -10 penalty to the challenger
        const challenger = room.players[challengerIndex];
        challenger.score -= 10;

        room.lastMove = null; // Clear last move so it can't be challenged again
        io.to(roomId).emit("challengeResult", { success: false, room, penalty: 10 });
      }
    });

    socket.on("swapTiles", ({ roomId, tileIds }) => {
      const room = rooms.get(roomId);
      if (!room || room.gameState !== "playing") return;

      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== room.turnIndex) return socket.emit("error", "Not your turn");

      const player = room.players[playerIndex];
      const tilesToSwap = player.rack.filter(t => tileIds.includes(t.id));

      if (tilesToSwap.length === 0 && tileIds.length > 0) {
        return socket.emit("error", "No valid tiles selected to swap");
      }

      console.log(`[Swap] Player "${player.name}" swapped ${tilesToSwap.length} tiles and skipped turn.`);

      // 1. Return tiles to bag
      room.tiles.push(...tilesToSwap);
      
      // 2. Remove from rack
      player.rack = player.rack.filter(t => !tileIds.includes(t.id));

      // 3. Draw new tiles
      const newTiles = drawTiles(room.tiles, tilesToSwap.length);
      player.rack.push(...newTiles);

      // 4. Advance turn and clear last move (skips can't be challenged)
      room.lastMove = null;
      commitTurn(room);
      io.to(roomId).emit("moveMade", { room, moveScore: 0 });
    });

    socket.on("getPublicRooms", () => {
      socket.emit("publicRoomsUpdate", getPublicRoomsList(rooms));
    });

    socket.on("disconnect", () => {
      for (const [roomId, room] of rooms.entries()) {
        const pIdx = room.players.findIndex(p => p.id === socket.id);
        if (pIdx !== -1) {
          room.players.splice(pIdx, 1);
          if (room.players.length === 0) rooms.delete(roomId);
          else io.to(roomId).emit("playerLeft", room);
          if (room.isPublic) io.emit("publicRoomsUpdate", getPublicRoomsList(rooms));
          break;
        }
      }
    });
});

// Start the server
const startApp = async () => {
  if (app) {
    try {
      await app.prepare();
      console.log("Next.js prepared successfully.");
    } catch (err) {
      console.error('Next.js preparation failed, switching to PURE BACKEND mode:', err);
      handle = null; // Disable Next.js handler
    }
  } else {
    console.log("Starting in PURE BACKEND mode...");
  }

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
};

startApp();

function getPublicRoomsList(rooms) {
  return Array.from(rooms.values())
    .filter(r => r.isPublic && r.players.length < 2 && r.gameState === "waiting" && !r.isBotRoom)
    .map(r => ({ id: r.id, playerCount: r.players.length }));
}
