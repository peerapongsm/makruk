// Minimax + alpha-beta bot. Framework-free — runs inside a Web Worker in the app
// (see app/game/bot-worker.ts) so search never blocks the UI thread.
import { otherColor } from "./board";
import { allLegalMoves, applyMove } from "./engine";
import { PIECE_VALUES } from "./values";
import type { Color, GameState, Move, PieceType, Square } from "./types";

const MATE_SCORE = 100_000;

// Light piece-square bonus: mild pull toward the center, and a small nudge for เบี้ย
// to advance (toward promotion). Kept small relative to material (max ~0.3) so it
// only breaks ties between otherwise-similar moves, never overrides material.
function centerBonus(square: Square): number {
  const row = Math.floor(square / 8);
  const col = square % 8;
  const dRow = Math.abs(row - 3.5);
  const dCol = Math.abs(col - 3.5);
  return (3.5 - (dRow + dCol) / 2) * 0.04;
}

function pawnAdvanceBonus(pieceType: PieceType, color: Color, square: Square): number {
  if (pieceType !== "bia") return 0;
  const row = Math.floor(square / 8);
  const progress = color === "white" ? row : 7 - row;
  return progress * 0.03;
}

function evaluate(state: GameState, forColor: Color): number {
  if (state.result) {
    if (state.result.winner === forColor) return MATE_SCORE;
    if (state.result.winner === null) return 0;
    return -MATE_SCORE;
  }
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const piece = state.board[sq];
    if (!piece) continue;
    const value = PIECE_VALUES[piece.type] + centerBonus(sq) + pawnAdvanceBonus(piece.type, piece.color, sq);
    score += piece.color === forColor ? value : -value;
  }
  return score;
}

function negamax(state: GameState, depth: number, alpha: number, beta: number, color: Color): number {
  if (state.result || depth === 0) return evaluate(state, color);
  let best = -Infinity;
  for (const move of allLegalMoves(state)) {
    const next = applyMove(state, move);
    const score = -negamax(next, depth - 1, -beta, -alpha, otherColor(color));
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // beta cutoff
  }
  return best;
}

export interface BotOptions {
  /** search depth in plies */
  depth: number;
  /** randomly break ties among equally-best moves (used for the "ง่าย" difficulty) */
  randomTiebreak?: boolean;
}

/** Difficulty presets per spec §1/§5: ง่าย = depth 1 + random tiebreak, กลาง = depth 2, ยาก = depth 3. */
export const DIFFICULTY: Record<"easy" | "medium" | "hard", BotOptions> = {
  easy: { depth: 1, randomTiebreak: true },
  medium: { depth: 2 },
  hard: { depth: 3 },
};

export function chooseBotMove(state: GameState, options: BotOptions): Move | null {
  const moves = allLegalMoves(state);
  if (moves.length === 0) return null;
  const color = state.turn;

  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;
  const scored: { move: Move; score: number }[] = [];

  for (const move of moves) {
    const next = applyMove(state, move);
    const score = -negamax(next, options.depth - 1, -beta, -alpha, otherColor(color));
    scored.push({ move, score });
    if (score > bestScore) bestScore = score;
    if (score > alpha) alpha = score;
  }

  const candidates = options.randomTiebreak
    ? scored.filter((s) => s.score === bestScore)
    : scored.filter((s) => s.score === bestScore).slice(0, 1);

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return pick.move;
}
