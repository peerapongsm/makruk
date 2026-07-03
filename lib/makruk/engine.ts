// หมากรุกไทย (Makruk) engine core — check/checkmate/stalemate, promotion, threefold
// repetition, and the endgame counting rules (กติกานับ).
//
// Counting rules source: Wikipedia, "Makruk" article, section "Counting"
// https://en.wikipedia.org/wiki/Makruk
//   - นับกระดาน (board count): "When neither player has any cowries [เบี้ย] left,
//     mate must be achieved in 64 moves."
//   - นับศักดิ์หมาก (material count): once the disadvantaged side is reduced to a
//     bare king, the advantaged side must mate within a move ceiling set by their
//     own remaining pieces: 2 เรือ=8, 1 เรือ=16, 2 โคน=22, 2 ม้า=32, 1 โคน=44, 1 ม้า=64,
//     เม็ด/เบี้ยหงาย only=64.
//
// AMBIGUITY (flagged per spec instructions, see also /method):
//   1. Wikipedia's board-count condition is "neither player has ANY pawns left" —
//      the design spec's shorthand ("disadvantaged side has no pawns") is looser.
//      This implementation follows the literal Wikipedia condition: both sides
//      must have zero เบี้ย on the board.
//   2. The material-count trigger ("last piece besides the lord is captured") is
//      implemented as: the disadvantaged side has been reduced to a bare king (no
//      เรือ/โคน/ม้า/เม็ด AND no เบี้ย). Mixed advantaged-side compositions not listed
//      verbatim in the table (e.g. 1 เรือ + 1 ม้า) fall back to the strongest piece
//      type present, in the order เรือ > โคน > ม้า > เม็ด-only, using that piece's tier.
//   3. Wikipedia notes the counter starts "from total pieces on the board (including
//      both lords)" rather than from zero — implemented literally: count = total
//      pieces on board at activation + plies elapsed since activation.

import { cloneBoardWith, findKingSquare, initialBoard, otherColor } from "./board";
import { allPseudoMoves, isSquareAttacked, pseudoMovesFrom } from "./moves";
import type {
  Board,
  Color,
  CountingState,
  CountingType,
  GameResult,
  GameState,
  Move,
  Piece,
  PieceType,
  Square,
} from "./types";

const COLORS: Color[] = ["white", "black"];

export function positionKey(board: Board, turn: Color): string {
  let key = turn === "white" ? "w:" : "b:";
  for (const p of board) {
    key += p ? `${p.color[0]}${p.type[0]}${p.type === "met" && p.promoted ? "*" : ""}` : ".";
  }
  return key;
}

export function createInitialState(): GameState {
  const board = initialBoard();
  return {
    board,
    turn: "white",
    history: [],
    counting: null,
    result: null,
    positions: [positionKey(board, "white")],
  };
}

export function isInCheck(board: Board, color: Color): boolean {
  const kingSq = findKingSquare(board, color);
  if (kingSq === null) return false;
  return isSquareAttacked(board, kingSq, otherColor(color));
}

function applyMoveToBoard(board: Board, move: Move): Board {
  const placed: Piece = move.promotion
    ? { type: "met", color: move.piece.color, promoted: true }
    : move.piece;
  return cloneBoardWith(board, { [move.from]: null, [move.to]: placed });
}

function leavesOwnKingInCheck(board: Board, move: Move, color: Color): boolean {
  const next = applyMoveToBoard(board, move);
  return isInCheck(next, color);
}

export function legalMovesFrom(state: GameState, square: Square): Move[] {
  if (state.result) return [];
  const piece = state.board[square];
  if (!piece || piece.color !== state.turn) return [];
  return pseudoMovesFrom(state.board, square).filter(
    (m) => !leavesOwnKingInCheck(state.board, m, piece.color)
  );
}

export function allLegalMoves(state: GameState): Move[] {
  if (state.result) return [];
  const moves: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (p && p.color === state.turn) moves.push(...legalMovesFrom(state, sq));
  }
  return moves;
}

// ---- counting rules ----

function isBareKing(board: Board, color: Color): boolean {
  for (const p of board) {
    if (p && p.color === color && p.type !== "khun") return false;
  }
  return true;
}

function countType(board: Board, color: Color, type: PieceType): number {
  let n = 0;
  for (const p of board) if (p && p.color === color && p.type === type) n++;
  return n;
}

function countAllPieces(board: Board): number {
  let n = 0;
  for (const p of board) if (p) n++;
  return n;
}

function materialCeiling(board: Board, advantaged: Color): number {
  const rua = countType(board, advantaged, "rua");
  const khon = countType(board, advantaged, "khon");
  const ma = countType(board, advantaged, "ma");
  if (rua >= 2) return 8;
  if (rua === 1) return 16;
  if (khon >= 2) return 22;
  if (ma >= 2) return 32;
  if (khon === 1) return 44;
  if (ma === 1) return 64;
  return 64; // เม็ด/เบี้ยหงาย only, or nothing beyond the king
}

interface CountingCondition {
  type: CountingType;
  ceiling: number;
  disadvantaged: Color;
}

function evaluateCountingCondition(board: Board): CountingCondition | null {
  for (const color of COLORS) {
    if (isBareKing(board, color)) {
      const advantaged = otherColor(color);
      return { type: "material", ceiling: materialCeiling(board, advantaged), disadvantaged: color };
    }
  }
  const whitePawns = countType(board, "white", "bia");
  const blackPawns = countType(board, "black", "bia");
  if (whitePawns === 0 && blackPawns === 0) {
    const wv = materialValueForCounting(board, "white");
    const bv = materialValueForCounting(board, "black");
    if (wv !== bv) {
      return { type: "board", ceiling: 64, disadvantaged: wv < bv ? "white" : "black" };
    }
  }
  return null;
}

function materialValueForCounting(board: Board, color: Color): number {
  const values: Record<PieceType, number> = { khun: 0, rua: 5, khon: 2.6, ma: 3, met: 1.7, bia: 1 };
  let total = 0;
  for (const p of board) if (p && p.color === color) total += values[p.type];
  return total;
}

function updateCounting(prev: CountingState | null, board: Board, ply: number): CountingState | null {
  const cond = evaluateCountingCondition(board);
  if (!cond) return null;
  if (prev && prev.type === cond.type && prev.ceiling === cond.ceiling && prev.disadvantaged === cond.disadvantaged) {
    return prev;
  }
  return { ...cond, startCount: countAllPieces(board), startPly: ply };
}

/** Current tally shown in the counting UI: how many of the ceiling's moves have elapsed. */
export function currentCountingTally(state: GameState): { count: number; ceiling: number } | null {
  if (!state.counting) return null;
  const elapsed = state.history.length - state.counting.startPly;
  return { count: state.counting.startCount + elapsed, ceiling: state.counting.ceiling };
}

// ---- result detection ----

function computeResult(state: GameState): GameResult | null {
  const legal = allLegalMoves(state);
  if (legal.length === 0) {
    if (isInCheck(state.board, state.turn)) {
      return { winner: otherColor(state.turn), reason: "checkmate" };
    }
    return { winner: null, reason: "stalemate" };
  }

  const lastKey = state.positions[state.positions.length - 1];
  const repeats = state.positions.filter((k) => k === lastKey).length;
  if (repeats >= 3) {
    return { winner: null, reason: "repetition" };
  }

  if (state.counting) {
    const tally = currentCountingTally(state);
    if (tally && tally.count >= tally.ceiling) {
      return { winner: null, reason: "counting-expired" };
    }
  }

  return null;
}

/** Apply a legal move and return the resulting (new) game state. Throws if the move is illegal. */
export function applyMove(state: GameState, move: Pick<Move, "from" | "to">): GameState {
  const legal = legalMovesFrom(state, move.from).find((m) => m.to === move.to);
  if (!legal) {
    throw new Error(`Illegal move: ${move.from} -> ${move.to}`);
  }

  const nextBoard = applyMoveToBoard(state.board, legal);
  const nextTurn = otherColor(state.turn);
  const nextHistory = [...state.history, legal];
  const nextPositions = [...state.positions, positionKey(nextBoard, nextTurn)];
  const nextCounting = updateCounting(state.counting, nextBoard, nextHistory.length);

  const provisional: GameState = {
    board: nextBoard,
    turn: nextTurn,
    history: nextHistory,
    counting: nextCounting,
    result: null,
    positions: nextPositions,
  };

  return { ...provisional, result: computeResult(provisional) };
}

/** perft: count leaf positions reachable in exactly `depth` plies (move-generator correctness check). */
export function perft(state: GameState, depth: number): number {
  if (depth === 0) return 1;
  if (state.result) return 0;
  let nodes = 0;
  for (const move of allLegalMoves(state)) {
    nodes += perft(applyMove(state, move), depth - 1);
  }
  return nodes;
}

/** Resign: `resigningColor` loses immediately. */
export function resign(state: GameState, resigningColor: Color): GameState {
  return { ...state, result: { winner: otherColor(resigningColor), reason: "resignation" } };
}

export { allPseudoMoves };
