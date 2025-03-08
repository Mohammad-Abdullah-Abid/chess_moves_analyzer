console.log("Chess.com Coverage Extension Loaded");

// === Helper Functions: Coordinate Conversion ===
function squareToCoord(square) {
  // '82' => { file: 8, rank: 2 }
  return {
    file: parseInt(square.charAt(0), 10),
    rank: parseInt(square.charAt(1), 10)
  };
}

function coordToSquare(coord) {
  // { file: 8, rank: 2 } => "82"
  return String(coord.file) + String(coord.rank);
}

function isInside(coord) {
  return coord.file >= 1 && coord.file <= 8 && coord.rank >= 1 && coord.rank <= 8;
}

// === Helper Functions: Occupancy & Enemy Check ===
function isEmpty(coord, board) {
  return !board[coordToSquare(coord)];
}

function isEnemy(coord, board, color) {
  const sq = coordToSquare(coord);
  return board[sq] && board[sq][0] !== color;
}

function isEnemySquare(square, board, color) {
  return board[square] && board[square][0] !== color;
}

// === Sliding Move Generator (for bishops, rooks, queens) ===
function getSlidingMoves(start, board, color, directions) {
  let moves = [];
  directions.forEach(direction => {
    let current = { ...start };
    while (true) {
      current = { file: current.file + direction.df, rank: current.rank + direction.dr };
      if (!isInside(current)) break;
      let currentSquare = coordToSquare(current);
      if (!board[currentSquare]) {
        moves.push(currentSquare);
      } else {
        // Stop on blocker: if enemy, include that square
        if (board[currentSquare][0] !== color) {
          moves.push(currentSquare);
        }
        break;
      }
    }
  });
  return moves;
}

// === Get Board State from DOM ===
function getBoardState() {
  // Builds an object like { "82": "wp", "51": "wk", ... }
  let board = {};
  let pieces = document.querySelectorAll('.piece');
  pieces.forEach(piece => {
    let squareClass = Array.from(piece.classList).find(cls => cls.startsWith('square-'));
    if (squareClass) {
      let square = squareClass.split('-')[1]; // e.g., "82"
      let pieceType = Array.from(piece.classList).find(cls => /^[wb][prnbqk]$/.test(cls));
      if (pieceType) {
        board[square] = pieceType;
      }
    }
  });
  return board;
}

// === Generate Moves for a Single Piece ===
function getPossibleMoves(square, piece, board) {
  let moves = [];
  const { file, rank } = squareToCoord(square);
  const color = piece[0];  // 'w' or 'b'
  const type = piece[1];   // 'p', 'n', 'b', 'r', 'q', 'k'

  if (type === 'p') {
    // Pawn: only calculate attacked squares (coverage), not movement squares
    if (color === 'w') {
      // White pawn attacks
      const attackSquares = [
        { file: file - 1, rank: rank + 1 }, // left diagonal
        { file: file + 1, rank: rank + 1 }  // right diagonal
      ];
      
      attackSquares.forEach(coord => {
        if (isInside(coord)) {
          moves.push(coordToSquare(coord));
        }
      });
    } else {  // Black pawn
      const attackSquares = [
        { file: file - 1, rank: rank - 1 }, // left diagonal
        { file: file + 1, rank: rank - 1 }  // right diagonal
      ];
      
      attackSquares.forEach(coord => {
        if (isInside(coord)) {
          moves.push(coordToSquare(coord));
        }
      });
    }
  } else if (type === 'n') {
    // Knight moves: fixed L-shaped offsets.
    const knightMoves = [
      { df: 1, dr: 2 },
      { df: 2, dr: 1 },
      { df: -1, dr: 2 },
      { df: -2, dr: 1 },
      { df: 1, dr: -2 },
      { df: 2, dr: -1 },
      { df: -1, dr: -2 },
      { df: -2, dr: -1 }
    ];
    knightMoves.forEach(offset => {
      let dest = { file: file + offset.df, rank: rank + offset.dr };
      if (isInside(dest)) {
        let destSquare = coordToSquare(dest);
        if (!board[destSquare] || isEnemySquare(destSquare, board, color)) {
          moves.push(destSquare);
        }
      }
    });
  } else if (type === 'b') {
    // Bishop moves: diagonal directions.
    moves.push(...getSlidingMoves({ file, rank }, board, color, [
      { df: 1, dr: 1 },
      { df: 1, dr: -1 },
      { df: -1, dr: 1 },
      { df: -1, dr: -1 }
    ]));
  } else if (type === 'r') {
    // Rook moves: vertical and horizontal directions.
    moves.push(...getSlidingMoves({ file, rank }, board, color, [
      { df: 1, dr: 0 },
      { df: -1, dr: 0 },
      { df: 0, dr: 1 },
      { df: 0, dr: -1 }
    ]));
  } else if (type === 'q') {
    // Queen moves: combination of rook and bishop.
    moves.push(...getSlidingMoves({ file, rank }, board, color, [
      { df: 1, dr: 1 },
      { df: 1, dr: -1 },
      { df: -1, dr: 1 },
      { df: -1, dr: -1 },
      { df: 1, dr: 0 },
      { df: -1, dr: 0 },
      { df: 0, dr: 1 },
      { df: 0, dr: -1 }
    ]));
  } else if (type === 'k') {
    // King moves: one square in any direction.
    const kingMoves = [
      { df: 1, dr: 1 },
      { df: 1, dr: 0 },
      { df: 1, dr: -1 },
      { df: 0, dr: 1 },
      { df: 0, dr: -1 },
      { df: -1, dr: 1 },
      { df: -1, dr: 0 },
      { df: -1, dr: -1 }
    ];
    kingMoves.forEach(offset => {
      let dest = { file: file + offset.df, rank: rank + offset.dr };
      if (isInside(dest)) {
        let destSquare = coordToSquare(dest);
        if (!board[destSquare] || isEnemySquare(destSquare, board, color)) {
          moves.push(destSquare);
        }
      }
    });
  }

  return moves;
}

// --- New Helper: isPinned ---
// Checks if a piece at pieceSquare (of side 'color') is pinned to its king.
function isPinned(pieceSquare, board, color) {
  // Find the king of that color.
  let kingSquare;
  for (const [sq, piece] of Object.entries(board)) {
    if (piece === color + 'k') {
      kingSquare = sq;
      break;
    }
  }
  if (!kingSquare) return false;

  const kingCoord = squareToCoord(kingSquare);
  const pieceCoord = squareToCoord(pieceSquare);
  const df = pieceCoord.file - kingCoord.file;
  const dr = pieceCoord.rank - kingCoord.rank;
  
  // Only consider if piece and king are collinear (vertical, horizontal, or diagonal).
  const adf = Math.abs(df);
  const adr = Math.abs(dr);
  let normDf = 0, normDr = 0;
  if (df === 0 && dr !== 0) {
    normDr = dr / adr;
  } else if (dr === 0 && df !== 0) {
    normDf = df / adf;
  } else if (adf === adr) {
    normDf = df / adf;
    normDr = dr / adr;
  } else {
    return false;
  }
  
  // Move from the pieceSquare outward in the same direction and see if there's an opponent sliding piece.
  let current = { ...pieceCoord };
  current.file += normDf;
  current.rank += normDr;
  while (isInside(current)) {
    const currentSquare = coordToSquare(current);
    if (board[currentSquare]) {
      const currPiece = board[currentSquare];
      const opponentColor = color === 'w' ? 'b' : 'w';
      if (currPiece[0] === opponentColor) {
        // If the opponent piece is a sliding piece that moves along this ray...
        if ((normDf === 0 || normDr === 0) && (currPiece[1] === 'r' || currPiece[1] === 'q')) {
          return true;
        }
        if (normDf !== 0 && normDr !== 0 && (currPiece[1] === 'b' || currPiece[1] === 'q')) {
          return true;
        }
        break;
      } else {
        break;
      }
    }
    current.file += normDf;
    current.rank += normDr;
  }
  return false;
}

// --- New Helper: filterPinnedMoves ---
// If a piece is pinned, restrict its moves to only those along the ray from its king.
function filterPinnedMoves(pieceSquare, moves, board, color) {
  if (!isPinned(pieceSquare, board, color)) {
    return moves;
  }
  // Find the king of this side.
  let kingSquare;
  for (const [sq, piece] of Object.entries(board)) {
    if (piece === color + 'k') {
      kingSquare = sq;
      break;
    }
  }
  const kingCoord = squareToCoord(kingSquare);
  const pieceCoord = squareToCoord(pieceSquare);
  const df = pieceCoord.file - kingCoord.file;
  const dr = pieceCoord.rank - kingCoord.rank;
  const adf = Math.abs(df), adr = Math.abs(dr);
  let normDf = 0, normDr = 0;
  if (df === 0 && dr !== 0) {
    normDr = dr / adr;
  } else if (dr === 0 && df !== 0) {
    normDf = df / adf;
  } else if (adf === adr) {
    normDf = df / adf;
    normDr = dr / adr;
  }
  return moves.filter(move => {
    const moveCoord = squareToCoord(move);
    const dmf = moveCoord.file - kingCoord.file;
    const dmr = moveCoord.rank - kingCoord.rank;
    if (normDf === 0) {
      return dmf === 0;
    }
    if (normDr === 0) {
      return dmr === 0;
    }
    return Math.abs(dmf / normDf - dmr / normDr) < 0.001;
  });
}

// === Calculate All Controlled Squares on the Board ===
function calculateControlledSquares(board) {
  let coverage = {
    white: new Set(),
    black: new Set()
  };

  Object.entries(board).forEach(([square, piece]) => {
    let moves = getPossibleMoves(square, piece, board);
    // If the piece is pinned, filter its moves.
    moves = filterPinnedMoves(square, moves, board, piece[0]);
    if (piece[0] === 'w') {
      moves.forEach(move => coverage.white.add(move));
    } else {
      moves.forEach(move => coverage.black.add(move));
    }
  });
  return coverage;
}

// --- Updated Helper: isDefended ---
// Returns true if any piece (excluding the king) of the given color
// can move to the target square if that square were empty.
function isDefended(targetSquare, board, color) {
  for (const [sq, piece] of Object.entries(board)) {
    // Skip if it's not a friendly piece or if it's the piece on the target.
    if (piece[0] === color && sq !== targetSquare && piece[1] !== 'k') {
      // Create a simulated board where the target square is empty.
      let simBoard = Object.assign({}, board);
      delete simBoard[targetSquare];
      const moves = getPossibleMoves(sq, piece, simBoard);
      if (moves.includes(targetSquare)) {
        return true;
      }
    }
  }
  return false;
}

// --- New Helper: getThreatDetails ---
// Returns an object indicating if the enemy king and/or other enemy pieces threaten the square.
function getThreatDetails(square, board, enemyColor) {
  let kingThreat = false;
  let otherThreat = false;
  for (const [sq, piece] of Object.entries(board)) {
    if (piece[0] === enemyColor) {
      const moves = getPossibleMoves(sq, piece, board);
      if (moves.includes(square)) {
        if (piece[1] === 'k') {
          kingThreat = true;
        } else {
          otherThreat = true;
        }
      }
    }
  }
  return { kingThreat, otherThreat };
}

// === Highlighting Hint Elements Based on Enemy Coverage ===
// For move hints, we adjust the background color;
// for capture hints, we adjust the border style and simulate removal of enemy piece.
function highlightHints(board, coverage, playerColor = 'w') {
  const enemyCoverage = playerColor === 'w' ? coverage.black : coverage.white;
  // Select both move hints and capture hints
  const hintElements = document.querySelectorAll('[data-test-element="hint"], [data-test-element="capture-hint"]');
  hintElements.forEach(hint => {
    // Find the square identifier from the class (e.g., "square-44")
    const squareClass = Array.from(hint.classList).find(cls => cls.startsWith('square-'));
    if (!squareClass) return;
    const square = squareClass.split('-')[1];

    // For move hints, adjust background color
    if (hint.getAttribute('data-test-element') === "hint") {
      hint.classList.remove('safe-hint', 'danger-hint');
      let isDanger = enemyCoverage.has(square);
      
      // Get threat details for this square.
      const threats = getThreatDetails(square, board, playerColor === 'w' ? 'b' : 'w');
      // If only threatened by enemy king and the square is defended, cancel danger.
      if (threats.kingThreat && !threats.otherThreat && isDefended(square, board, playerColor)) {
        isDanger = false;
      }
      hint.classList.add(isDanger ? 'danger-hint' : 'safe-hint');
    } else if (hint.getAttribute('data-test-element') === "capture-hint") {
      hint.classList.remove('safe-capture-hint', 'danger-capture-hint');
      let isDanger = enemyCoverage.has(square);
      
      const threats = getThreatDetails(square, board, playerColor === 'w' ? 'b' : 'w');
      if (threats.kingThreat && !threats.otherThreat && isDefended(square, board, playerColor)) {
        isDanger = false;
      }
      
      // Simulation: if the square holds an enemy piece and is not defended,
      // simulate its removal to see if additional enemy attacks are unmasked.
      if (!isDanger && board[square] && board[square][0] !== playerColor && !isDefended(square, board, playerColor)) {
        let simulatedBoard = Object.assign({}, board);
        delete simulatedBoard[square];
        let simulatedCoverage = calculateControlledSquares(simulatedBoard);
        let simulatedEnemyCoverage = playerColor === 'w' ? simulatedCoverage.black : simulatedCoverage.white;
        if (simulatedEnemyCoverage.has(square)) {
          isDanger = true;
        }
      }
      
      hint.classList.add(isDanger ? 'danger-capture-hint' : 'safe-capture-hint');
    }
  });
}




// === Highlighting Pieces Under Attack ===
function highlightAttackedPieces(board, coverage, playerColor = 'w') {
  const enemyCoverage = playerColor === 'w' ? coverage.black : coverage.white;
  const pieces = document.querySelectorAll('.piece');
  pieces.forEach(piece => {
    let pieceType = Array.from(piece.classList).find(cls => /^[wb][prnbqk]$/.test(cls));
    if (!pieceType) return;
    const color = pieceType.charAt(0);
    if (color !== playerColor) return;
    
    // Determine the square the piece is on from its class (e.g., "square-82")
    const squareClass = Array.from(piece.classList).find(cls => cls.startsWith('square-'));
    if (!squareClass) return;
    const square = squareClass.split('-')[1];
    
    // Remove any existing under-attack indicator
    piece.classList.remove('under-attack');
    // If the enemy controls this square, mark the piece as under attack
    if (enemyCoverage.has(square)) {
      const threats = getThreatDetails(square, board, playerColor === 'w' ? 'b' : 'w');
      if (threats.kingThreat && !threats.otherThreat && isDefended(square, board, playerColor)) {
        // Considered safe.
      } else {
        piece.classList.add('under-attack');
      }
    }
  });
}

// === Update Coverage on the Board Based on User Settings ===
function updateCoverage() {
  chrome.storage.sync.get({
    extensionEnabled: true,
    highlightHints: true,
    highlightAttacks: true
  }, (settings) => {
    // If the extension is disabled, remove any added classes.
    if (!settings.extensionEnabled) {
      document.querySelectorAll('[data-test-element="hint"], [data-test-element="capture-hint"]').forEach(el => {
        el.classList.remove('safe-hint', 'danger-hint', 'safe-capture-hint', 'danger-capture-hint');
      });
      document.querySelectorAll('.piece').forEach(piece => piece.classList.remove('under-attack'));
      return;
    }

    const board = getBoardState();
    const coverage = calculateControlledSquares(board);

    if (settings.highlightHints) {
      highlightHints(board, coverage, 'w');
    } else {
      document.querySelectorAll('[data-test-element="hint"], [data-test-element="capture-hint"]').forEach(el => {
        el.classList.remove('safe-hint', 'danger-hint', 'safe-capture-hint', 'danger-capture-hint');
      });
    }
    if (settings.highlightAttacks) {
      highlightAttackedPieces(board, coverage, 'w');
    } else {
      document.querySelectorAll('.piece').forEach(piece => piece.classList.remove('under-attack'));
    }
  });
}

// === Monitor the Page for Changes (to update on each move) ===
const observer = new MutationObserver(() => {
  updateCoverage();
});
observer.observe(document.body, { childList: true, subtree: true });

// Run the update initially
updateCoverage();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.extensionEnabled || changes.highlightHints || changes.highlightAttacks)) {
    updateCoverage();
  }
});
