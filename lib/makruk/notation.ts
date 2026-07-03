import { squareToAlgebraic } from "./board";
import type { Move, PieceType } from "./types";

export const PIECE_LABEL: Record<PieceType, string> = {
  khun: "ขุน",
  met: "เม็ด",
  khon: "โคน",
  ma: "ม้า",
  rua: "เรือ",
  bia: "เบี้ย",
};

/** e.g. "เรือ a1-a2", "เบี้ย d3xe4", "เบี้ย d5-d6=เม็ด" (promotion). */
export function moveToNotation(move: Move): string {
  const from = squareToAlgebraic(move.from);
  const to = squareToAlgebraic(move.to);
  const label = PIECE_LABEL[move.piece.type];
  const sep = move.captured ? "x" : "-";
  const suffix = move.promotion ? "=เม็ด" : "";
  return `${label} ${from}${sep}${to}${suffix}`;
}
