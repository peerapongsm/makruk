import { describe, it, expect } from "vitest";
import { encode, decode } from "./protocol";

describe("protocol codec", () => {
  it("round-trips each message type", () => {
    const msgs = [
      { t: "hello", peerId: "p1", nickname: "เอก" },
      { t: "resign", peerId: "p1" },
    ] as const;
    for (const m of msgs) expect(decode(JSON.parse(encode(m as any)))).toEqual(m);
  });
  it("rejects malformed / unknown messages", () => {
    expect(decode({ t: "nope" })).toBeNull();
    expect(decode({ t: "move" })).toBeNull(); // missing move/peerId
    expect(decode("garbage")).toBeNull();
    expect(decode(null)).toBeNull();
  });
});
