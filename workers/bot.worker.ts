// Runs the bot's minimax search off the UI thread so the board never freezes while it thinks.
import { chooseBotMove } from "@/lib/makruk";
import type { BotOptions, GameState } from "@/lib/makruk";

export interface BotWorkerRequest {
  state: GameState;
  options: BotOptions;
}

export interface BotWorkerResponse {
  from: number;
  to: number;
}

self.onmessage = (event: MessageEvent<BotWorkerRequest>) => {
  const { state, options } = event.data;
  const move = chooseBotMove(state, options);
  const response: BotWorkerResponse | null = move ? { from: move.from, to: move.to } : null;
  (self as unknown as Worker).postMessage(response);
};
