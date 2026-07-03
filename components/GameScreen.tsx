"use client";

import { currentCountingTally, moveToNotation } from "@/lib/makruk";
import type { GameState, Move, Square } from "@/lib/makruk";
import { Board } from "./Board";
import type { Difficulty, Mode } from "./MakrukApp";

interface GameScreenProps {
  state: GameState;
  mode: Mode;
  selected: Square | null;
  legalMoves: Move[];
  inCheck: boolean;
  flipped: boolean;
  thinking: boolean;
  canUndo: boolean;
  onTapSquare: (square: Square) => void;
  onFlip: () => void;
  onUndo: () => void;
  onResign: () => void;
  onNewGame: () => void;
}

const COLOR_LABEL = { white: "ฝ่ายขาว", black: "ฝ่ายดำ" } as const;

const RESULT_REASON_LABEL: Record<string, string> = {
  checkmate: "รุกฆาต",
  stalemate: "อับ (เดินไม่ได้แต่ไม่ถูกรุก)",
  repetition: "เดินซ้ำตำแหน่งเดิม 3 ครั้ง",
  "counting-expired": "นับครบกำหนดแล้วยังไม่จบ",
  resignation: "ยอมแพ้",
};

export function GameScreen({
  state,
  mode,
  selected,
  legalMoves,
  inCheck,
  flipped,
  thinking,
  canUndo,
  onTapSquare,
  onFlip,
  onUndo,
  onResign,
  onNewGame,
}: GameScreenProps) {
  const tally = currentCountingTally(state);
  const modeLabel = mode.kind === "hotseat" ? "2 คนเครื่องเดียว" : `บอท (${DIFFICULTY_LABEL[mode.difficulty]})`;

  return (
    <div className="page game">
      <div className="game__layout">
        <div className="game__side-top">
          <div className="game__status-block">
            <p className="small-caps">{modeLabel}</p>

            {!state.result && (
              <div className="game__status">
                <span className={`game__turn game__turn--${state.turn}`}>
                  ตาของ{COLOR_LABEL[state.turn]}
                  {mode.kind === "bot" && state.turn === "black" ? " (บอท)" : ""}
                </span>
                {thinking && <span className="game__thinking">บอทกำลังคิด…</span>}
                {inCheck && !thinking && <span className="game__check-warning">รุก! ขุนกำลังถูกรุก</span>}
              </div>
            )}
          </div>

          {tally && state.counting && !state.result && (
            <div className="game__counting" role="status">
              <strong>กำลังนับ ({state.counting.type === "board" ? "นับกระดาน" : "นับศักดิ์หมาก"})</strong>
              <span>
                {" "}
                ตา {tally.count} / {tally.ceiling} — ฝ่าย{COLOR_LABEL[state.counting.disadvantaged]}เสียเปรียบ
                ต้องถูกรุกฆาตก่อนครบ ไม่งั้นเสมอ
              </span>
            </div>
          )}

          {state.result && (
            <div className="game__result" role="alert">
              <h2>
                {state.result.winner === null
                  ? "เสมอ"
                  : mode.kind === "bot"
                    ? state.result.winner === "white"
                      ? "คุณชนะ!"
                      : "คุณแพ้"
                    : `${COLOR_LABEL[state.result.winner]}ชนะ`}
              </h2>
              <p>เหตุผล: {RESULT_REASON_LABEL[state.result.reason] ?? state.result.reason}</p>
            </div>
          )}
        </div>

        <div className="game__board-wrap">
          <Board
            state={state}
            selected={selected}
            legalMoves={legalMoves}
            flipped={flipped}
            inCheck={inCheck}
            onTapSquare={onTapSquare}
          />
        </div>

        <div className="game__side-bottom">
          <div className="game__controls">
            <button type="button" onClick={onNewGame}>
              เกมใหม่
            </button>
            <button type="button" className="secondary" onClick={onUndo} disabled={!canUndo}>
              ย้อนกลับ
            </button>
            <button type="button" className="secondary" onClick={onFlip}>
              พลิกกระดาน
            </button>
            <button type="button" className="danger" onClick={onResign} disabled={!!state.result}>
              ยอมแพ้
            </button>
          </div>

          <div className="game__history">
            <p className="small-caps">ประวัติการเดิน</p>
            <div className="game__history-strip">
              {state.history.length === 0 && <span className="game__history-empty">ยังไม่มีการเดิน</span>}
              {state.history.map((move, i) => (
                <span key={i} className="game__history-item">
                  {i + 1}. {moveToNotation(move)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "ง่าย",
  medium: "กลาง",
  hard: "ยาก",
};
