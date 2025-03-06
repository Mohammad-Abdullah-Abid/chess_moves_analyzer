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
  // This builds an object like { "82": "wp", "51": "wk", ... }
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
    // Pawn: forward move plus initial two-square advance and diagonal captures.
    if (color === 'w') {
      let forward = { file: file, rank: rank + 1 };
      if (isInside(forward) && isEmpty(forward, board)) {
        moves.push(coordToSquare(forward));
        if (rank === 2) {
          let forward2 = { file: file, rank: rank + 2 };
          if (isInside(forward2) && isEmpty(forward2, board)) {
            moves.push(coordToSquare(forward2));
          }
        }
      }
      // Diagonal captures
      let diagLeft = { file: file - 1, rank: rank + 1 };
      let diagRight = { file: file + 1, rank: rank + 1 };
      if (isInside(diagLeft) && isEnemy(diagLeft, board, color)) {
        moves.push(coordToSquare(diagLeft));
      }
      if (isInside(diagRight) && isEnemy(diagRight, board, color)) {
        moves.push(coordToSquare(diagRight));
      }
    } else {  // Black pawn
      let forward = { file: file, rank: rank - 1 };
      if (isInside(forward) && isEmpty(forward, board)) {
        moves.push(coordToSquare(forward));
        if (rank === 7) {
          let forward2 = { file: file, rank: rank - 2 };
          if (isInside(forward2) && isEmpty(forward2, board)) {
            moves.push(coordToSquare(forward2));
          }
        }
      }
      let diagLeft = { file: file - 1, rank: rank - 1 };
      let diagRight = { file: file + 1, rank: rank - 1 };
      if (isInside(diagLeft) && isEnemy(diagLeft, board, color)) {
        moves.push(coordToSquare(diagLeft));
      }
      if (isInside(diagRight) && isEnemy(diagRight, board, color)) {
        moves.push(coordToSquare(diagRight));
      }
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

// === Highlighting Functionality ===
function highlightControlledSquares(coverage) {
  // Remove old highlights
  document.querySelectorAll('.square').forEach(square => {
    square.classList.remove('controlled-white', 'controlled-black');
  });
  // Add highlights based on calculated coverage
  coverage.white.forEach(square => {
    let squareElement = document.querySelector(`.square-${square}`);
    if (squareElement) squareElement.classList.add('controlled-white');
  });
  coverage.black.forEach(square => {
    let squareElement = document.querySelector(`.square-${square}`);
    if (squareElement) squareElement.classList.add('controlled-black');
  });
}

// === Update Coverage on the Board ===
function updateCoverage() {
  const board = getBoardState();
  const coverage = calculateControlledSquares(board);
  highlightControlledSquares(coverage);
}

// === Monitor the Page for Changes (to update on each move) ===
const observer = new MutationObserver(() => {
  updateCoverage();
});
observer.observe(document.body, { childList: true, subtree: true });

// Run the update initially
updateCoverage();
