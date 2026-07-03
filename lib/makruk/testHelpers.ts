// Shared fixture helpers for lib/makruk tests. Not a test file itself.
import { algebraicToSquare, emptyBoard } from "./board";
import { positionKey } from "./engine";
import type { Board, Color, GameState, Piece, PieceType } from "./types";

/** Build a board from a map of algebraic square -> "wK" style shorthand, e.g. { e1: "wkhun", a3: "bbia" }. */
export function boardFrom(pieces: Record<string, { type: PieceType; color: Color; promoted?: boolean }>): Board {
  const board = emptyBoard().slice() as (Piece | null)[];
  for (const [square, piece] of Object.entries(pieces)) {
    board[algebraicToSquare(square)] = piece;
  }
  return board;
}

export function stateFrom(board: Board, turn: Color = "white"): GameState {
  return {
    board,
    turn,
    history: [],
    counting: null,
    result: null,
    positions: [positionKey(board, turn)],
  };
}

export function p(type: PieceType, color: Color, promoted = false): { type: PieceType; color: Color; promoted?: boolean } {
  return promoted ? { type, color, promoted } : { type, color };
}
