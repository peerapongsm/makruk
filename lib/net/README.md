# net/ — engine API this layer depends on

This records the existing makruk engine's public API (`lib/makruk/`, exported via
`lib/makruk/index.ts`) as consumed by the online net layer. **Read-only** — nothing
under `lib/makruk/` is edited by the net layer; this file exists so later net/session
tasks don't have to re-derive it.

## Types (`lib/makruk/types.ts`)

- `Color = "white" | "black"`
- `PieceType = "khun" | "met" | "khon" | "ma" | "rua" | "bia"` (king, queen-equivalent,
  bishop-equivalent, knight, rook, pawn)
- `Piece { type: PieceType; color: Color; promoted?: boolean }`
- `Square = number` — 0..63, `index = row * 8 + col`
- `Board = readonly (Piece | null)[]` — length 64
- `Move { from: Square; to: Square; piece: Piece; captured: Piece | null; promotion: boolean }`
- `CountingType = "board" | "material"`
- `CountingState { type: CountingType; ceiling: number; startCount: number; startPly: number; disadvantaged: Color }`
- `GameResultReason = "checkmate" | "stalemate" | "repetition" | "counting-expired" | "resignation"`
- `GameResult { winner: Color | null; reason: GameResultReason }`
- `GameState { board: Board; turn: Color; history: readonly Move[]; counting: CountingState | null; result: GameResult | null; positions: readonly string[] }`

`protocol.ts`'s `EngineMove` = this `Move`. `CountKind` = this `CountingType` (the
"count-declare" net message lets an online player declare which counting rule
applies — the engine itself only *detects* counting state automatically via
`applyMove`, there's no existing "declare" action, so this net message maps onto the
same two-value enum).

## Standard start position

- `createInitialState(): GameState` (`lib/makruk/engine.ts`) — builds the standard
  start position (`initialBoard()` from `lib/makruk/board.ts`) with `turn: "white"`,
  empty history, no counting/result.

## Turn accessor

- `state.turn: Color` — whose move it is. No separate accessor function; read the
  `GameState` field directly.

## Legality + move generation

- `legalMovesFrom(state: GameState, square: Square): Move[]` — legal moves for the
  piece on `square` (empty if not that color's turn, no piece, or game over).
- `allLegalMoves(state: GameState): Move[]` — every legal move for the side to move.
- `isInCheck(board: Board, color: Color): boolean`

## Applying a move

- `applyMove(state: GameState, move: Pick<Move, "from" | "to">): GameState` — validates
  the `{from, to}` pair against `legalMovesFrom`, **throws** `Error` if illegal.
  Returns the new `GameState` (board, turn flip, history, counting, result all
  updated). This is the only mutator the net layer should call to advance a game.

## Counting state

- `currentCountingTally(state: GameState): { count: number; ceiling: number } | null`
  — current progress vs. the active counting ceiling (null if no counting active).
- Counting activation/detection is automatic inside `applyMove` — there is no
  separate "declare counting" function in the engine today.

## Resignation

- `resign(state: GameState, resigningColor: Color): GameState` — sets
  `result: { winner: otherColor(resigningColor), reason: "resignation" }`.

## Other exports (not currently consumed by `protocol.ts`, listed for completeness)

- `positionKey(board: Board, turn: Color): string` — repetition-detection key.
- `perft(state: GameState, depth: number): number` — move-generator test helper.
- `allPseudoMoves(board: Board, color: Color): Move[]`, `pseudoMovesFrom`,
  `isSquareAttacked`, `attackSquares` (`lib/makruk/moves.ts`).
- `initialBoard`, `emptyBoard`, `cloneBoardWith`, `otherColor`, `findKingSquare`,
  `countPieces`, `squareToAlgebraic`, `algebraicToSquare` (`lib/makruk/board.ts`).
- `moveToNotation` (`lib/makruk/notation.ts`), piece values (`lib/makruk/values.ts`),
  bot search (`lib/makruk/bot.ts`) — bot is local-play only, not part of the online
  net surface.

## Import path

The net layer imports engine types with a relative path (`../makruk/types`), not the
`@/lib/...` alias, to keep this module framework-agnostic — the repo's `vitest.config.ts`
has no path-alias resolution configured for tests, and a pure codec module shouldn't
need one.
