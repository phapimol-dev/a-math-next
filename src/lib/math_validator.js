export const validateEquation = (equationStr) => {
  console.log(`[Validator] Validating: "${equationStr}"`);
  
  // Prevent empty or incredibly short strings
  if (!equationStr || equationStr.length < 3) {
    console.log(`[Validator] Rejected: Length too short (${equationStr?.length || 0})`);
    return false;
  }

  // Make sure it contains at least one equals sign
  const equalsCount = (equationStr.match(/=/g) || []).length;
  if (equalsCount < 1) {
    console.log(`[Validator] Rejected: Missing equals sign`);
    return false;
  }

  // Handle A-Math specific formatting:
  // "x" or "X" or "×" becomes "*"
  // "÷" becomes "/"
  const sanitized = equationStr
    .replace(/[xX×]/g, "*")
    .replace(/÷/g, "/");

  const parts = sanitized.split("=");
  
  try {
    const values = parts.map((part, index) => {
      const trimmed = part.trim();
      
      // Basic validation for each part
      if (!trimmed) {
        throw new Error(`Part ${index} is empty`);
      }
      
      // Valid starting chars: digit, minus (for negative numbers)
      if (!/^[\d-]/.test(trimmed) || /[+\-*/]$/.test(trimmed)) {
        throw new Error(`Part ${index} format check failed (start/end operators)`);
      }

      const val = evalSide(trimmed);
      if (val === null || isNaN(val) || !isFinite(val)) {
        throw new Error(`Part ${index} evaluation failed`);
      }
      return val;
    });

    console.log(`[Validator] Evaluation values:`, values);

    // All parts must be equal to each other
    const firstValue = values[0];
    const allEqual = values.every(v => Math.abs(v - firstValue) < 0.0001);

    console.log(`[Validator] Result for "${equationStr}": ${allEqual}`);
    return allEqual;
  } catch (e) {
    console.log(`[Validator] Rejected: ${e.message}`);
    return false;
  }
};

const evalSide = (expr) => {
  try {
    // Keep only digits, math operators, and decimals. Strip anything malicious.
    const safeExpr = expr.replace(/[^-+*/.\d]/g, "");
    
    // Check for division by zero
    if (/\/0(?!\.)/.test(safeExpr)) return null;

    return new Function(`return ${safeExpr}`)();
  } catch (e) {
    return null;
  }
};

// Helper to extract words from the board
// Extracts horizontally and vertically connected tiles that include the newly placed tiles
export const extractEquations = (board, placements) => {
  const equations = [];
  const processedH = new Set();
  const processedV = new Set();

  placements.forEach(({ x, y }) => {
    // Check horizontal
    let startX = x;
    while (startX > 0 && board[y][startX - 1].tile) startX--;
    
    let endX = x;
    while (endX < 14 && board[y][endX + 1].tile) endX++;

    if (endX > startX) {
      const hKey = `${startX},${y}-${endX},${y}`;
      if (!processedH.has(hKey)) {
        processedH.add(hKey);
        let eqStr = "";
        let tilesInEq = [];
        for (let i = startX; i <= endX; i++) {
          eqStr += board[y][i].tile.value;
          tilesInEq.push({ tile: board[y][i].tile, special: board[y][i].special, isNew: placements.some(p => p.x === i && p.y === y) });
        }
        equations.push({ string: eqStr, tiles: tilesInEq });
      }
    }

    // Check vertical
    let startY = y;
    while (startY > 0 && board[startY - 1][x].tile) startY--;
    
    let endY = y;
    while (endY < 14 && board[endY + 1][x].tile) endY++;

    if (endY > startY) {
      const vKey = `${x},${startY}-${x},${endY}`;
      if (!processedV.has(vKey)) {
        processedV.add(vKey);
        let eqStr = "";
        let tilesInEq = [];
        for (let i = startY; i <= endY; i++) {
          eqStr += board[i][x].tile.value;
          tilesInEq.push({ tile: board[i][x].tile, special: board[i][x].special, isNew: placements.some(p => p.x === x && p.y === i) });
        }
        equations.push({ string: eqStr, tiles: tilesInEq });
      }
    }
  });

  return equations;
};

export const calculateScore = (equations) => {
  let totalScore = 0;

  equations.forEach(eq => {
    let eqScore = 0;
    let eqMultiplier = 1;

    eq.tiles.forEach(({ tile, special, isNew }) => {
      let tileScore = tile.score || 0;

      // Special squares only apply to newly placed tiles
      if (isNew && special) {
        if (special === 'TP') tileScore *= 3;       // Triple Piece: 3× this tile's score
        else if (special === 'DP') tileScore *= 2;   // Double Piece: 2× this tile's score
        else if (special === 'TE') eqMultiplier *= 3; // Triple Equation: 3× entire equation
        else if (special === 'DE' || special === 'CENTER') eqMultiplier *= 2; // Double Equation: 2× entire equation
      }

      eqScore += tileScore;
    });

    totalScore += (eqScore * eqMultiplier);
  });

  // Bingo bonus is not calculated here (requires knowing total placements count in makeMove)
  return totalScore;
};

