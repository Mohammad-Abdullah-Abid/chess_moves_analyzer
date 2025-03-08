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

// === Highlighting Hint Elements Based on Enemy Coverage ===
// For move hints we adjust background color,
// and for capture hints we adjust the border style.
function highlightHints(coverage, playerColor = 'w') {
  // Determine enemy coverage based on player color
  const enemyCoverage = playerColor === 'w' ? coverage.black : coverage.white;
  // Select both move hints and capture hints
  const hintElements = document.querySelectorAll('[data-test-element="hint"], [data-test-element="capture-hint"]');
  hintElements.forEach(hint => {
    // Find the square identifier from the class (e.g., "square-44")
    const squareClass = Array.from(hint.classList).find(cls => cls.startsWith('square-'));
    if (!squareClass) return;
    const square = squareClass.split('-')[1];
    
    // If it is a move hint element
    if (hint.getAttribute('data-test-element') === "hint") {
      hint.classList.remove('safe-hint', 'danger-hint');
      if (enemyCoverage.has(square)) {
        hint.classList.add('danger-hint');
      } else {
        hint.classList.add('safe-hint');
      }
    } 
    // If it is a capture hint element, adjust the border instead of background
    else if (hint.getAttribute('data-test-element') === "capture-hint") {
      hint.classList.remove('safe-capture-hint', 'danger-capture-hint');
      if (enemyCoverage.has(square)) {
        hint.classList.add('danger-capture-hint');
      } else {
        hint.classList.add('safe-capture-hint');
      }
    }
  });
}

// === Update Coverage on the Board ===
function updateCoverage() {
  const board = getBoardState();
  const coverage = calculateControlledSquares(board);
  // Assuming the player is white; change to 'b' if needed.
  highlightHints(coverage, 'w');
}

// === Monitor the Page for Changes (to update on each move) ===
const observer = new MutationObserver(() => {
  updateCoverage();
});
observer.observe(document.body, { childList: true, subtree: true });

// Run the update initially
updateCoverage();