const SIMPLE_TILE_SET = [
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
  ...Array(6).fill({ value: "+", score: 2 }),
  ...Array(6).fill({ value: "-", score: 2 }),
  ...Array(4).fill({ value: "x", score: 3 }),
  ...Array(4).fill({ value: "/", score: 3 }),
  ...Array(10).fill({ value: "=", score: 1 }),
];

export const generateTiles = () => {
  const tiles = [];
  SIMPLE_TILE_SET.forEach(tile => {
    tiles.push({ ...tile, id: Math.random().toString(36).substring(2, 9) });
  });
  return tiles.sort(() => Math.random() - 0.5);
};

export const drawTiles = (bag, count) => {
  return bag.splice(0, count);
};
