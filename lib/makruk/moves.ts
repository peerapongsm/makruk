import { isOnBoard, promotionRow, rowColToSquare, squareToRowCol } from "./board";
import type { Board, Color, Move, Piece, Square } from "./types";

const KING_DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
] as const;

const DIAGONAL_DIRS = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
] as const;

const ORTHOGONAL_DIRS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
] as const;

const KNIGHT_DIRS = [
  [-2, -1], [-2, 1], [2, -1], [2, 1],
  [-1, -2], [-1, 2], [1, -2], [1, 2],
] as const;

/** Squares (not moves) a piece on `square` attacks/could move to, ignoring pins/checks. */
export function attackSquares(board: Board, square: Square): Square[] {
  const p = board[square];
  if (!p) return [];
  const { row, col } = squareToRowCol(square);
  const out: Square[] = [];

  const pushStep = (dr: number, dc: number) => {
    const r = row + dr;
    const c = col + dc;
    if (!isOnBoard(r, c)) return;
    const target = board[rowColToSquare(r, c)];
    if (!target || target.color !== p.color) out.push(rowColToSquare(r, c));
  };

  const pushSlide = (dr: number, dc: number) => {
    let r = row + dr;
    let c = col + dc;
    while (isOnBoard(r, c)) {
      const target = board[rowColToSquare(r, c)];
      if (!target) {
        out.push(rowColToSquare(r, c));
      } else {
        if (target.color !== p.color) out.push(rowColToSquare(r, c));
        break;
      }
      r += dr;
      c += dc;
    }
  };

  switch (p.type) {
    case "khun":
      for (const [dr, dc] of KING_DIRS) pushStep(dr, dc);
      break;
    case "met":
      for (const [dr, dc] of DIAGONAL_DIRS) pushStep(dr, dc);
      break;
    case "khon": {
      for (const [dr, dc] of DIAGONAL_DIRS) pushStep(dr, dc);
      const fwd = p.color === "white" ? 1 : -1;
      pushStep(fwd, 0);
      break;
    }
    case "ma":
      for (const [dr, dc] of KNIGHT_DIRS) pushStep(dr, dc);
      break;
    case "rua":
      for (const [dr, dc] of ORTHOGONAL_DIRS) pushSlide(dr, dc);
      break;
    case "bia": {
      const fwd = p.color === "white" ? 1 : -1;
      // capture squares only (diagonal-forward) — non-capturing forward step handled separately
      for (const dc of [-1, 1]) {
        const r = row + fwd;
        const c = col + dc;
        if (!isOnBoard(r, c)) continue;
        const target = board[rowColToSquare(r, c)];
        if (!target || target.color !== p.color) out.push(rowColToSquare(r, c));
      }
      break;
    }
  }
  return out;
}

/** Pseudo-legal moves for the piece on `square` (does not check whether own king ends up in check). */
export function pseudoMovesFrom(board: Board, square: Square): Move[] {
  const p = board[square];
  if (!p) return [];
  const moves: Move[] = [];

  if (p.type === "bia") {
    const { row, col } = squareToRowCol(square);
    const fwd = p.color === "white" ? 1 : -1;
    const promoteRow = promotionRow(p.color);

    // straight forward, non-capturing only
    const fr = row + fwd;
    if (isOnBoard(fr, col) && !board[rowColToSquare(fr, col)]) {
      const to = rowColToSquare(fr, col);
      moves.push(makeMove(square, to, p, null, fr === promoteRow));
    }
    // diagonal-forward, capturing only
    for (const dc of [-1, 1]) {
      const c = col + dc;
      if (!isOnBoard(fr, c)) continue;
      const to = rowColToSquare(fr, c);
      const target = board[to];
      if (target && target.color !== p.color) {
        moves.push(makeMove(square, to, p, target, fr === promoteRow));
      }
    }
    return moves;
  }

  for (const to of attackSquares(board, square)) {
    const target = board[to];
    moves.push(makeMove(square, to, p, target, false));
  }
  return moves;
}

function makeMove(from: Square, to: Square, piece: Piece, captured: Piece | null, promotion: boolean): Move {
  return { from, to, piece, captured, promotion };
}

/** All pseudo-legal moves for every piece of `color`. */
export function allPseudoMoves(board: Board, color: Color): Move[] {
  const moves: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (p && p.color === color) moves.push(...pseudoMovesFrom(board, sq));
  }
  return moves;
}

/** Is `square` attacked by any piece of `byColor`? */
export function isSquareAttacked(board: Board, square: Square, byColor: Color): boolean {
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (p && p.color === byColor && attackSquares(board, sq).includes(square)) return true;
  }
  return false;
}
