import { describe, it, expect } from "vitest";
import { assignColors } from "./room";

describe("assignColors (pure)", () => {
  it("host defaults to white: host plays white, guest plays black", () => {
    expect(assignColors(true, "white")).toEqual({ local: "white", remote: "black" });
    expect(assignColors(false, "white")).toEqual({ local: "black", remote: "white" });
  });

  it("respects a host that chose black", () => {
    expect(assignColors(true, "black")).toEqual({ local: "black", remote: "white" });
    expect(assignColors(false, "black")).toEqual({ local: "white", remote: "black" });
  });
});
