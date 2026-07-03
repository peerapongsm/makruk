// หมากรุกไทย (Makruk) engine — framework-free core types.
// Reused by project-18-makruk (this app) and project-51 makruk-academy.

export type Color = "white" | "black";

export type PieceType =
  | "khun" // ขุน — king
  | "met" // เม็ด — queen-equivalent (incl. promoted pawns, which move identically)
  | "khon" // โคน — bishop-equivalent
  | "ma" // ม้า — knight
  | "rua" // เรือ — rook
  | "bia"; // เบี้ย — pawn

export interface Piece {
  readonly type: PieceType;
  readonly color: Color;
  /** true if this เม็ด started life as a promoted เบี้ย (เบี้ยหงาย). Cosmetic only — moves like any เม็ด. */
  readonly promoted?: boolean;
}

/** 0..63, index = row * 8 + col. row 0 = rank 1, col 0 = file a. */
export type Square = number;

/** length-64 array, index = row*8+col. null = empty square. */
export type Board = readonly (Piece | null)[];

export interface Move {
  readonly from: Square;
  readonly to: Square;
  readonly piece: Piece;
  readonly captured: Piece | null;
  readonly promotion: boolean;
}

export type CountingType = "board" | "material";

export interface CountingState {
  readonly type: CountingType;
  readonly ceiling: number;
  /** total piece count on board at the ply counting activated */
  readonly startCount: number;
  /** ply index (state.history.length) at which counting activated */
  readonly startPly: number;
  /** which color is disadvantaged (being counted against) */
  readonly disadvantaged: Color;
}

export type GameResultReason =
  | "checkmate"
  | "stalemate"
  | "repetition"
  | "counting-expired"
  | "resignation";

export interface GameResult {
  readonly winner: Color | null; // null = draw
  readonly reason: GameResultReason;
}

export interface GameState {
  readonly board: Board;
  readonly turn: Color;
  readonly history: readonly Move[];
  readonly counting: CountingState | null;
  readonly result: GameResult | null;
  /** position key after each ply (including the starting position), used for threefold repetition. */
  readonly positions: readonly string[];
}
