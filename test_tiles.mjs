import { generateTiles } from './src/lib/tiles.js';

const counts = {};
for (let i = 0; i < 1000; i++) {
  const tiles = generateTiles();
  tiles.forEach(t => {
    counts[t.value] = (counts[t.value] || 0) + 1;
  });
}

console.log("Tile Distribution (1000 bags):");
Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([val, count]) => {
  console.log(`${val.padStart(4)}: ${count / 1000}`);
});
