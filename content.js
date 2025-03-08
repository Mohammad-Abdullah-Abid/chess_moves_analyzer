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

// === Calculate All Controlled Squares on the Board ===
function calculateControlledSquares(board) {
  let coverage = {
    white: new Set(),
    black: new Set()
  };

  Object.entries(board).forEach(([square, piece]) => {
    let moves = getPossibleMoves(square, piece, board);
    if (piece[0] === 'w') {
      moves.forEach(move => coverage.white.add(move));
    } else {
      moves.forEach(move => coverage.black.add(move));
    }
  });
  return coverage;
}

// --- New Helper: isDefended ---
// Returns true if any piece (excluding the king) of the given color can move to the square.
function isDefended(square, board, color) {
  for (const [sq, piece] of Object.entries(board)) {
    if (piece[0] === color && piece[1] !== 'k') {
      const moves = getPossibleMoves(sq, piece, board);
      if (moves.includes(square)) {
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
// For move hints we adjust background color,
// and for capture hints we adjust the border style.
// For capture hints, we now simulate removal of the enemy piece if present
// to account for unmasking enemy attacks.
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
      hint.classList.add(enemyCoverage.has(square) ? 'danger-hint' : 'safe-hint');
    } else if (hint.getAttribute('data-test-element') === "capture-hint") {
      hint.classList.remove('safe-capture-hint', 'danger-capture-hint');
      // Determine danger based on current coverage.
      let isDanger = enemyCoverage.has(square);
      
      // Get threat details for this square.
      const threats = getThreatDetails(square, board, playerColor === 'w' ? 'b' : 'w');
      
      // If the only threat comes from the enemy king...
      if (threats.kingThreat && !threats.otherThreat) {
        // ...and if the square is defended by a friendly piece (excluding the king),
        // then cancel the danger.
        if (isDefended(square, board, playerColor)) {
          isDanger = false;
        }
      }
      
      // Run simulation only if not already dangerous and the square is not defended.
      if (!isDanger && board[square] && board[square][0] !== playerColor && !isDefended(square, board, playerColor)) {
        let simulatedBoard = Object.assign({}, board);
        delete simulatedBoard[square]; // Simulate capturing the enemy piece.
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
function highlightAttackedPieces(coverage, playerColor = 'w') {
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
      piece.classList.add('under-attack');
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
      highlightAttackedPieces(coverage, 'w');
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
