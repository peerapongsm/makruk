"use client";

import { useCallback, useEffect, useRef } from "react";
import type { BotOptions, GameState } from "@/lib/makruk";
import type { BotWorkerRequest, BotWorkerResponse } from "@/workers/bot.worker";

/** Wraps the bot's Web Worker: request a move for `state`, await the reply, never block the UI thread. */
export function useBotWorker() {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("../workers/bot.worker.ts", import.meta.url));
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const requestMove = useCallback((state: GameState, options: BotOptions) => {
    return new Promise<{ from: number; to: number } | null>((resolve) => {
      const worker = workerRef.current;
      if (!worker) {
        resolve(null);
        return;
      }
      const handleMessage = (event: MessageEvent<BotWorkerResponse | null>) => {
        worker.removeEventListener("message", handleMessage);
        resolve(event.data);
      };
      worker.addEventListener("message", handleMessage);
      const request: BotWorkerRequest = { state, options };
      worker.postMessage(request);
    });
  }, []);

  return { requestMove };
}
