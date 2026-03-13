// Official A-Math Tile Set: 100 tiles total
const OFFICIAL_TILE_SET = [
  // Numbers 0-9
  ...Array(5).fill({ value: "0", score: 1 }),
  ...Array(6).fill({ value: "1", score: 1 }),
  ...Array(6).fill({ value: "2", score: 1 }),
  ...Array(5).fill({ value: "3", score: 1 }),
  ...Array(5).fill({ value: "4", score: 2 }),
  ...Array(4).fill({ value: "5", score: 2 }),
  ...Array(4).fill({ value: "6", score: 2 }),
  ...Array(4).fill({ value: "7", score: 2 }),
  ...Array(4).fill({ value: "8", score: 2 }),
  ...Array(4).fill({ value: "9", score: 2 }),
  // Multi-digit numbers 10-20
  ...Array(2).fill({ value: "10", score: 3 }),
  ...Array(1).fill({ value: "11", score: 4 }),
  ...Array(2).fill({ value: "12", score: 3 }),
  ...Array(1).fill({ value: "13", score: 6 }),
  ...Array(1).fill({ value: "14", score: 4 }),
  ...Array(1).fill({ value: "15", score: 4 }),
  ...Array(1).fill({ value: "16", score: 4 }),
  ...Array(1).fill({ value: "17", score: 6 }),
  ...Array(1).fill({ value: "18", score: 4 }),
  ...Array(1).fill({ value: "19", score: 7 }),
  ...Array(1).fill({ value: "20", score: 5 }),
  // Operators
  ...Array(4).fill({ value: "+", score: 2 }),
  ...Array(4).fill({ value: "-", score: 2 }),
  ...Array(5).fill({ value: "+/-", score: 1 }),   // Can act as + or -
  ...Array(4).fill({ value: "×", score: 2 }),
  ...Array(4).fill({ value: "÷", score: 2 }),
  ...Array(4).fill({ value: "×/÷", score: 1 }),   // Can act as × or ÷
  // Equals
  ...Array(11).fill({ value: "=", score: 1 }),
  // Blanks (wild tiles - player chooses what it represents)
  ...Array(4).fill({ value: "", score: 0, isBlank: true }),
];
// Total: 5+6+6+5+5+4+4+4+4+4 + 2+1+2+1+1+1+1+1+1+1+1 + 4+4+5+4+4+4 + 11 + 4 = 100

export const generateTiles = () => {
  const tiles = [];
  OFFICIAL_TILE_SET.forEach(tile => {
    tiles.push({ ...tile, id: Math.random().toString(36).substring(2, 9) });
  });
  
  // Fisher-Yates Shuffle for true randomness
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  
  return tiles;
};

export const drawTiles = (bag, count) => {
  return bag.splice(0, count);
};
