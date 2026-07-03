import type { Board, Color, Piece, PieceType, Square } from "./types";

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export function rowColToSquare(row: number, col: number): Square {
  return row * 8 + col;
}

export function squareToRowCol(square: Square): { row: number; col: number } {
  return { row: Math.floor(square / 8), col: square % 8 };
}

export function isOnBoard(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

/** a1-h8 algebraic notation. row 0 = rank 1, col 0 = file a. */
export function squareToAlgebraic(square: Square): string {
  const { row, col } = squareToRowCol(square);
  return `${FILES[col]}${row + 1}`;
}

export function algebraicToSquare(algebraic: string): Square {
  const col = FILES.indexOf(algebraic[0] as (typeof FILES)[number]);
  const row = Number(algebraic.slice(1)) - 1;
  if (col < 0 || !isOnBoard(row, col)) {
    throw new Error(`Invalid square notation: ${algebraic}`);
  }
  return rowColToSquare(row, col);
}

function piece(type: PieceType, color: Color): Piece {
  return { type, color };
}

/**
 * Standard makruk starting position.
 * White (rank 1-3), Black (rank 6-8). Back rank order: รือ ม้า โคน เม็ด ขุน โคน ม้า รือ,
 * with เม็ด/ขุน mirrored between sides (d1=เม็ด,e1=ขุน / d8=ขุน,e8=เม็ด) so the ขุน of one
 * side faces the เม็ด of the other — standard makruk convention (not queen-faces-queen
 * like chess). เบี้ย start on the 3rd rank from each side (row index 2 for white, row
 * index 5 for black), not the 2nd rank.
 */
export function initialBoard(): Board {
  const board: (Piece | null)[] = new Array(64).fill(null);

  const backRank: PieceType[] = ["rua", "ma", "khon", "met", "khun", "khon", "ma", "rua"];
  for (let col = 0; col < 8; col++) {
    board[rowColToSquare(0, col)] = piece(backRank[col], "white");
    board[rowColToSquare(2, col)] = piece("bia", "white");
  }
  const blackBackRank: PieceType[] = ["rua", "ma", "khon", "khun", "met", "khon", "ma", "rua"];
  for (let col = 0; col < 8; col++) {
    board[rowColToSquare(7, col)] = piece(blackBackRank[col], "black");
    board[rowColToSquare(5, col)] = piece("bia", "black");
  }

  return board;
}

export function emptyBoard(): Board {
  return new Array(64).fill(null);
}

export function cloneBoardWith(board: Board, changes: Record<Square, Piece | null>): Board {
  const next = board.slice();
  for (const key of Object.keys(changes)) {
    const sq = Number(key);
    next[sq] = changes[sq];
  }
  return next;
}

export function otherColor(color: Color): Color {
  return color === "white" ? "black" : "white";
}

/** Forward direction (row delta) for a color's pawns/khon-forward-move/etc. */
export function forwardRow(color: Color): number {
  return color === "white" ? 1 : -1;
}

/** The rank (row index) a pawn of this color promotes on: the 6th rank counted from its own side. */
export function promotionRow(color: Color): number {
  return color === "white" ? 5 : 2; // row index: white rank6 = row5, black rank6(own) = board rank3 = row2
}

export function findKingSquare(board: Board, color: Color): Square | null {
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (p && p.type === "khun" && p.color === color) return sq;
  }
  return null;
}

export function countPieces(board: Board, color?: Color): number {
  let n = 0;
  for (const p of board) {
    if (p && (!color || p.color === color)) n++;
  }
  return n;
}
