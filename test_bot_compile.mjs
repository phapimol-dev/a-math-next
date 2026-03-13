import { findBotMove } from './src/lib/bot_ai.js';
import { generateTiles } from './src/lib/tiles.js';

console.log('bot_ai.js loaded successfully!');

// create a dummy board
const board = Array(15).fill(null).map(() => Array(15).fill(null).map(() => ({ tile: null, special: null })));

// place a tile in the center
board[7][7] = { tile: { value: '5', score: 2, id: 'a1' }, special: 'CENTER' };
board[7][8] = { tile: { value: '+', score: 2, id: 'a2' }, special: null };
board[7][9] = { tile: { value: '4', score: 2, id: 'a3' }, special: null };
board[7][10] = { tile: { value: '=', score: 1, id: 'a4' }, special: null };
board[7][11] = { tile: { value: '9', score: 2, id: 'a5' }, special: null };

const room = {
  board: board,
  turnIndex: 1,
};

const rack = [
  { value: '1', score: 1, id: 'r1' },
  { value: '4', score: 2, id: 'r2' },
  { value: '+', score: 2, id: 'r3' },
  { value: '5', score: 2, id: 'r4' },
  { value: '=', score: 1, id: 'r5' },
];

console.log('Testing bot move calculation...');
try {
  const t0 = Date.now();
  const move = findBotMove(room, rack, 3);
  console.log(`Calculation finished in ${Date.now() - t0}ms`);
  console.log('Move:', move ? 'Found a move' : 'No move found');
  if (move) {
      console.log('Score:', move.score);
  }
} catch (err) {
  console.error('ERROR during findBotMove:', err);
}
