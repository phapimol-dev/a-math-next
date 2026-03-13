export const validateEquation = (equationStr) => {
  console.log(`[Validator] Validating: "${equationStr}"`);
  
  // Prevent empty or incredibly short strings
  if (!equationStr || equationStr.length < 3) {
    console.log(`[Validator] Rejected: Length too short (${equationStr?.length || 0})`);
    return false;
  }

  // Make sure it contains exactly one equals sign
  const equalsCount = (equationStr.match(/=/g) || []).length;
  if (equalsCount !== 1) {
    console.log(`[Validator] Rejected: Incorrect number of equals signs (${equalsCount})`);
    return false;
  }

  // Handle A-Math specific formatting:
  // "x" or "X" or "×" becomes "*"
  // "÷" becomes "/"
  const sanitized = equationStr
    .replace(/[xX×]/g, "*")
    .replace(/÷/g, "/")
    .replace(/=/g, "===");

  const parts = sanitized.split("===");
  if (parts.length !== 2) {
    console.log(`[Validator] Rejected: Could not split into two parts`);
    return false;
  }

  // Basic validation: parts shouldn't end with operators or start with arbitrary operators
  // Valid starting chars: digit, minus (for negative numbers)
  if (!/^[\d-]/.test(parts[0]) || !/^[\d-]/.test(parts[1])) {
    console.log(`[Validator] Rejected: Basic format check failed (start/end operators)`);
    return false;
  }
  if (/[+\-*/]$/.test(parts[0]) || /[+\-*/]$/.test(parts[1])) {
    console.log(`[Validator] Rejected: Basic format check failed (start/end operators)`);
    return false;
  }

  try {
    const leftSide = evalSide(parts[0]);
    const rightSide = evalSide(parts[1]);
    
    console.log(`[Validator] Evaluation: "${parts[0]}" = ${leftSide}, "${parts[1]}" = ${rightSide}`);

    // Check for null or undefined (eval error), or NaN, or Infinity
    if (leftSide === null || rightSide === null) {
      console.log(`[Validator] Rejected: Evaluation returned null`);
      return false;
    }
    if (isNaN(leftSide) || isNaN(rightSide)) {
      console.log(`[Validator] Rejected: Evaluation returned NaN`);
      return false;
    }
    if (!isFinite(leftSide) || !isFinite(rightSide)) {
      console.log(`[Validator] Rejected: Evaluation returned non-finite value`);
      return false;
    }

    // Use a small epsilon for floating point comparison (e.g., 2/3 = 4/6)
    const result = Math.abs(leftSide - rightSide) < 0.0001;
    console.log(`[Validator] Result for "${equationStr}": ${result}`);
    return result;
  } catch (e) {
    console.log(`[Validator] Error during validation: ${e.message}`);
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
        if (special === 'TLS') tileScore *= 3;
        else if (special === 'DLS') tileScore *= 2;
        else if (special === 'TWS') eqMultiplier *= 3;
        else if (special === 'DWS' || special === 'CENTER') eqMultiplier *= 2; // Center acts as DWS
      }

      eqScore += tileScore;
    });

    totalScore += (eqScore * eqMultiplier);
  });

  // Bingo bonus is not calculated here (requires knowing total placements count in makeMove)
  return totalScore;
};
