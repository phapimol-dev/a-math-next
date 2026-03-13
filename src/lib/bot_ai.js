import { validateEquation, extractEquations, calculateScore } from './math_validator.js';

// ============================================================================
// PHASE 1: Board Pre-indexing
// ============================================================================

/**
 * Scans the board once and builds an index of all valid placement segments.
 * A segment is a contiguous run of cells in a row or column where an equation
 * could potentially be placed. Each segment tracks which cells are already
 * filled and which are empty (anchored to existing tiles).
 */
function buildBoardIndex(board) {
  const segments = [];

  for (let dir = 0; dir < 2; dir++) {
    for (let row = 0; row < 15; row++) {
      // Find contiguous runs that could form equations
      // We scan for every possible [start, end] slice where:
      //   - The cell before `start` is empty or off-board
      //   - The cell after `end` is empty or off-board
      //   - Length >= 3 (minimum equation like "1=1")
      //   - At least one cell is empty (needs a placement)
      //   - At least one cell touches an existing tile (connectedness)

      for (let start = 0; start < 15; start++) {
        // Must be start of run (no tile before it)
        const before = getCellSafe(board, dir, row, start - 1);
        if (before && before.tile !== null) continue;

        for (let end = start + 2; end < 15; end++) {
          // Must be end of run (no tile after it)
          const after = getCellSafe(board, dir, row, end + 1);
          if (after && after.tile !== null) continue;

          const len = end - start + 1;
          if (len < 3 || len > 15) continue;

          // Build the pattern for this segment
          const pattern = []; // Each entry: { pos, value: string|null, x, y }
          let emptyCount = 0;
          let filledCount = 0;
          let touchesExisting = false;
          let coversCenter = false;
          let hasEqual = false;

          for (let i = start; i <= end; i++) {
            const cell = getCell(board, dir, row, i);
            const x = dir === 0 ? i : row;
            const y = dir === 0 ? row : i;

            if (cell.tile !== null) {
              filledCount++;
              touchesExisting = true;
              if (cell.tile.value === '=') hasEqual = true;
              pattern.push({ pos: i, value: cell.tile.value, x, y, special: cell.special });
            } else {
              emptyCount++;
              // Check perpendicular adjacency
              if (hasPerpendicularTile(board, dir, row, i)) touchesExisting = true;
              pattern.push({ pos: i, value: null, x, y, special: cell.special });
            }

            if (x === 7 && y === 7) coversCenter = true;
          }

          if (emptyCount === 0 || emptyCount > 8) continue;

          segments.push({
            dir, row, start, end, len,
            pattern, emptyCount, filledCount,
            touchesExisting, coversCenter, hasEqual
          });
        }
      }
    }
  }

  return segments;
}

function getCell(board, dir, row, i) {
  return dir === 0 ? board[row][i] : board[i][row];
}

function getCellSafe(board, dir, row, i) {
  if (i < 0 || i > 14) return null;
  return getCell(board, dir, row, i);
}

function hasPerpendicularTile(board, dir, row, i) {
  if (dir === 0) { // Horizontal → check above/below
    const x = i, y = row;
    if (y > 0 && board[y - 1][x].tile !== null) return true;
    if (y < 14 && board[y + 1][x].tile !== null) return true;
  } else { // Vertical → check left/right
    const x = row, y = i;
    if (x > 0 && board[y][x - 1].tile !== null) return true;
    if (x < 14 && board[y][x + 1].tile !== null) return true;
  }
  return false;
}

// ============================================================================
// PHASE 2: Constraint-First Equation Generation
// ============================================================================

/**
 * Instead of permuting tiles, we build equations in the form:
 *   expression = expression
 * and only keep ones where LHS === RHS.
 *
 * We iterate over all ways to split available tiles into LHS tiles and RHS tiles,
 * with one '=' tile consumed. For each split, we generate all possible expressions
 * from each side, evaluate them, and match LHS values to RHS values.
 */
function generateValidEquations(tiles) {
  const validEquations = [];
  const seen = new Set();

  // Separate tile types
  const digits = tiles.filter(t => /^\d$/.test(t.value));
  const operators = tiles.filter(t => /^[+\-x/]$/.test(t.value));
  const equals = tiles.filter(t => t.value === '=');

  if (equals.length === 0) return validEquations; // Can't make equations without '='

  // We need at minimum: 1 digit on LHS, '=', 1 digit on RHS → 3 tiles
  // But also need the numbers to be equal → typically more complex

  const allNonEqual = [...digits, ...operators];

  // Generate all subsets of non-equal tiles for LHS (at least 1 tile)
  // Then RHS gets the remaining tiles (at least 1 tile)
  const subsets = getSubsets(allNonEqual);

  for (const lhsTiles of subsets) {
    if (lhsTiles.length === 0) continue;

    const rhsTiles = getRemainingTiles(allNonEqual, lhsTiles);
    if (rhsTiles.length === 0) continue;

    // Generate all valid expressions from LHS tiles
    const lhsExprs = generateExpressions(lhsTiles);
    if (lhsExprs.length === 0) continue;

    // Generate all valid expressions from RHS tiles
    const rhsExprs = generateExpressions(rhsTiles);
    if (rhsExprs.length === 0) continue;

    // Index RHS by value for fast lookup
    const rhsByValue = new Map();
    for (const rhs of rhsExprs) {
      if (rhs.value === null || !isFinite(rhs.value) || isNaN(rhs.value)) continue;
      // Round to avoid floating point issues
      const key = Math.round(rhs.value * 10000) / 10000;
      if (!rhsByValue.has(key)) rhsByValue.set(key, []);
      rhsByValue.get(key).push(rhs);
    }

    // Match LHS to RHS
    for (const lhs of lhsExprs) {
      if (lhs.value === null || !isFinite(lhs.value) || isNaN(lhs.value)) continue;
      const key = Math.round(lhs.value * 10000) / 10000;
      const matches = rhsByValue.get(key);
      if (!matches) continue;

      for (const rhs of matches) {
        const eqStr = lhs.str + '=' + rhs.str;
        if (!seen.has(eqStr)) {
          seen.add(eqStr);
          // Track which tiles are used (by index reference)
          validEquations.push({
            str: eqStr,
            chars: eqStr.split(''),
            lhsTiles: lhs.tiles,
            rhsTiles: rhs.tiles,
            equalTile: equals[0] // Use first available '=' tile
          });
        }
      }
    }
  }

  return validEquations;
}

/**
 * Generate all valid arithmetic expressions from a set of tiles.
 * Returns array of { str, value, tiles } objects.
 * An expression is: number (op number)*
 * Numbers can be multi-digit (formed by concatenating digit tiles).
 */
function generateExpressions(tiles) {
  const results = [];
  const exprDigits = tiles.filter(t => /^\d$/.test(t.value));
  const exprOps = tiles.filter(t => /^[+\-x/]$/.test(t.value));

  // Generate permutations of digits and try grouping them into numbers with operators
  const digitPerms = getUniquePermutations(exprDigits, exprDigits.length);

  for (const digitPerm of digitPerms) {
    // For each permutation, try all ways to insert operators between groups of digits
    // Groups of digits form multi-digit numbers
    // e.g., [1, 2, 3] with ops [+] → "12+3", "1+23", "123" (no op needed if pure number)

    if (exprOps.length === 0) {
      // Pure number — just concatenate all digits
      const numStr = digitPerm.map(t => t.value).join('');
      if (numStr.length > 1 && numStr[0] === '0') continue; // No leading zeros
      const val = parseInt(numStr, 10);
      if (!isNaN(val)) {
        results.push({ str: numStr, value: val, tiles: [...digitPerm] });
      }
    } else {
      // Try inserting operators at different split points
      // If N digits and M operators, we need to split digits into M+1 groups
      if (exprOps.length >= digitPerm.length) continue; // Need more digits than ops

      const opPerms = getUniquePermutations(exprOps, exprOps.length);
      for (const opPerm of opPerms) {
        // Split digitPerm into (opPerm.length + 1) groups
        const splits = getSplitPoints(digitPerm.length, opPerm.length + 1);

        for (const split of splits) {
          let expr = '';
          let valid = true;
          let allTilesUsed = [];

          for (let g = 0; g < split.length; g++) {
            const group = digitPerm.slice(
              split.slice(0, g).reduce((a, b) => a + b, 0),
              split.slice(0, g + 1).reduce((a, b) => a + b, 0)
            );

            const numStr = group.map(t => t.value).join('');
            if (numStr.length > 1 && numStr[0] === '0') { valid = false; break; } // No leading zeros

            expr += numStr;
            allTilesUsed.push(...group);

            if (g < opPerm.length) {
              expr += opPerm[g].value;
              allTilesUsed.push(opPerm[g]);
            }
          }

          if (!valid) continue;

          // Evaluate expression
          const safeExpr = expr.replace(/x/gi, '*');
          try {
            const val = new Function(`return ${safeExpr}`)();
            if (val !== null && isFinite(val) && !isNaN(val)) {
              // Skip divisions that produce non-integers
              if (expr.includes('/') && !Number.isInteger(val)) continue;
              results.push({ str: expr, value: val, tiles: allTilesUsed });
            }
          } catch { /* skip invalid expressions */ }
        }
      }
    }
  }

  // Deduplicate by string
  const dedupMap = new Map();
  for (const r of results) {
    if (!dedupMap.has(r.str)) dedupMap.set(r.str, r);
  }
  return Array.from(dedupMap.values());
}

/**
 * Returns all ways to split N items into K groups where each group has ≥ 1 item.
 * Returns array of arrays, each inner array is group sizes summing to N.
 */
function getSplitPoints(n, k) {
  if (k === 1) return [[n]];
  if (k > n) return [];
  const results = [];
  for (let first = 1; first <= n - k + 1; first++) {
    const rest = getSplitPoints(n - first, k - 1);
    for (const r of rest) {
      results.push([first, ...r]);
    }
  }
  return results;
}

/**
 * Get all unique permutations of arr of length k (handling duplicate values).
 */
function getUniquePermutations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];

  const results = [];
  const used = new Array(arr.length).fill(false);
  const sorted = [...arr].sort((a, b) => {
    const va = a.value === '/' ? 'ZZZ' : a.value;
    const vb = b.value === '/' ? 'ZZZ' : b.value;
    return va.localeCompare(vb);
  });

  function backtrack(current) {
    if (current.length === k) {
      results.push([...current]);
      return;
    }
    for (let i = 0; i < sorted.length; i++) {
      if (used[i]) continue;
      if (i > 0 && sorted[i].value === sorted[i - 1].value && !used[i - 1]) continue;
      used[i] = true;
      current.push(sorted[i]);
      backtrack(current);
      current.pop();
      used[i] = false;
    }
  }

  backtrack([]);
  return results;
}

/**
 * Get all subsets of an array (power set), excluding empty set and full set.
 * Returns arrays of tile objects. Caps at reasonable size to avoid explosion.
 */
function getSubsets(arr) {
  const result = [];
  const n = arr.length;
  // Only generate subsets up to size n-1 (leave at least 1 for other side)
  const limit = Math.min(n, 6); // Cap subset size to prevent combinatorial explosion

  for (let size = 1; size < n; size++) {
    if (size > limit) break;
    generateCombinations(arr, size, 0, [], result);
  }
  return result;
}

function generateCombinations(arr, size, start, current, result) {
  if (current.length === size) {
    result.push([...current]);
    return;
  }
  for (let i = start; i < arr.length; i++) {
    // Skip duplicates at same level
    if (i > start && arr[i].value === arr[i - 1].value) continue;
    current.push(arr[i]);
    generateCombinations(arr, size, i + 1, current, result);
    current.pop();
  }
}

/**
 * Given allNonEqual tiles and a subset used for LHS, return the "remaining" tiles for RHS.
 * Handles duplicates by tracking usage counts.
 */
function getRemainingTiles(all, used) {
  const remaining = [...all];
  for (const u of used) {
    const idx = remaining.findIndex(t => t.id === u.id);
    if (idx !== -1) remaining.splice(idx, 1);
  }
  return remaining;
}

// ============================================================================
// PHASE 3: Match equations to board segments
// ============================================================================

/**
 * For each valid equation string, try to fit it into each board segment.
 * Check that existing tiles match, and that the tiles needed for empty cells
 * are available in the rack.
 */
function matchEquationsToBoard(validEquations, segments, board, rack, isFirstTurn) {
  const candidates = [];

  for (const eq of validEquations) {
    const chars = eq.chars; // e.g. ['1','2','+','4','=','1','6']

    for (const seg of segments) {
      if (seg.len !== chars.length) continue;
      if (isFirstTurn && !seg.coversCenter) continue;
      if (!isFirstTurn && !seg.touchesExisting && seg.filledCount === 0) continue;

      // Check compatibility: existing tiles must match the equation chars
      let compatible = true;
      const neededTiles = []; // tiles from rack needed for empty cells
      const placements = [];

      for (let i = 0; i < seg.pattern.length; i++) {
        const cell = seg.pattern[i];
        const eqChar = chars[i];

        if (cell.value !== null) {
          // Cell has an existing tile — must match the equation character
          if (cell.value !== eqChar) { compatible = false; break; }
        } else {
          // Cell is empty — we need a tile from the rack with this value
          neededTiles.push({ value: eqChar, x: cell.x, y: cell.y, special: cell.special });
        }
      }

      if (!compatible) continue;

      // Check if the rack has the needed tiles
      const rackCopy = [...rack];
      let rackSufficient = true;

      for (const need of neededTiles) {
        const idx = rackCopy.findIndex(t => t.value === need.value);
        if (idx === -1) { rackSufficient = false; break; }
        const tile = rackCopy.splice(idx, 1)[0];
        placements.push({ x: need.x, y: need.y, tile, special: need.special });
      }

      if (!rackSufficient || placements.length === 0) continue;

      // Validate cross-equations by temporarily placing tiles
      placements.forEach(p => { board[p.y][p.x].tile = p.tile; });

      const allEquations = extractEquations(board, placements);
      const allValid = allEquations.every(eq2 => validateEquation(eq2.string));

      let score = 0;
      if (allValid) {
        score = calculateScore(allEquations);
        if (placements.length >= 8) score += 40; // Bingo
      }

      // Revert board
      placements.forEach(p => { board[p.y][p.x].tile = null; });

      if (allValid) {
        candidates.push({ placements, score, equations: allEquations });
      }
    }
  }

  return candidates;
}

// ============================================================================
// MAIN: findBotMove
// ============================================================================

/**
 * Finds the best possible move for the bot based on difficulty.
 * Uses Constraint-First algorithm:
 *   1. Index the board into segments
 *   2. Generate only mathematically valid equations from rack
 *   3. Match equations to board segments
 *   4. Score and select
 */
export function findBotMove(room, rack, difficulty) {
  const board = room.board;
  const isFirstTurn = board[7][7].tile === null;
  const startTime = Date.now();

  console.log(`[Bot AI] Starting Constraint-First search (L${difficulty}), rack: [${rack.map(t => t.value).join(',')}]`);

  // Phase 1: Pre-index segments
  const segments = buildBoardIndex(board);
  console.log(`[Bot AI] Phase 1: Found ${segments.length} valid segments in ${Date.now() - startTime}ms`);

  // Phase 2: Generate valid equations from rack tiles
  const validEquations = generateValidEquations(rack);
  console.log(`[Bot AI] Phase 2: Generated ${validEquations.length} valid equations in ${Date.now() - startTime}ms`);

  if (validEquations.length === 0) {
    console.log(`[Bot AI] No valid equations possible from rack. Will swap.`);
    return null;
  }

  // Phase 3: Match equations to board
  const candidates = matchEquationsToBoard(validEquations, segments, board, rack, isFirstTurn);
  console.log(`[Bot AI] Phase 3: Found ${candidates.length} board-compatible moves in ${Date.now() - startTime}ms`);

  if (candidates.length === 0) {
    console.log(`[Bot AI] No moves fit the board. Will swap.`);
    return null;
  }

  // Phase 4: Select based on difficulty
  candidates.sort((a, b) => b.score - a.score);

  const totalTime = Date.now() - startTime;
  console.log(`[Bot AI] Total time: ${totalTime}ms. Best score: ${candidates[0].score}`);

  if (difficulty === 1) {
    // Easy: pick a random move from the bottom 50%
    const bottomHalf = candidates.slice(Math.floor(candidates.length / 2));
    return bottomHalf[Math.floor(Math.random() * bottomHalf.length)] || candidates[candidates.length - 1];
  } else if (difficulty === 2) {
    // Medium: pick from top 30%
    const topN = Math.max(1, Math.ceil(candidates.length * 0.3));
    return candidates[Math.floor(Math.random() * topN)];
  } else {
    // Hard: best possible
    return candidates[0];
  }
}
