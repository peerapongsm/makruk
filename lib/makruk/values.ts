// Material values per spec §5 (approximate, documented):
// ขุน = ไม่มีค่า/อนันต์ (excluded from material comparisons — both sides always have exactly one
// until the game ends), เรือ 5, โคน 2.6, ม้า 3, เม็ด 1.7, เบี้ย 1, เบี้ยหงาย 1.7 (= เม็ด, since a
// promoted pawn IS a เม็ด — it just keeps a cosmetic "promoted" flag).
import type { Board, Color, PieceType } from "./types";

export const PIECE_VALUES: Record<PieceType, number> = {
  khun: 0,
  rua: 5,
  khon: 2.6,
  ma: 3,
  met: 1.7,
  bia: 1,
};

export function materialValue(board: Board, color: Color): number {
  let total = 0;
  for (const p of board) {
    if (p && p.color === color) total += PIECE_VALUES[p.type];
  }
  return total;
}
