import { describe, it, expect } from "vitest";
import { inviteLinkPath, parseRoomIdFromSearch, shortRoomCode } from "./lobby-utils";

describe("parseRoomIdFromSearch", () => {
  it("extracts a room id from ?room=", () => {
    expect(parseRoomIdFromSearch("?room=abc-123")).toBe("abc-123");
  });

  it("returns null when the param is absent", () => {
    expect(parseRoomIdFromSearch("")).toBeNull();
    expect(parseRoomIdFromSearch("?other=1")).toBeNull();
  });

  it("returns null for a blank room param", () => {
    expect(parseRoomIdFromSearch("?room=")).toBeNull();
  });
});

describe("shortRoomCode", () => {
  it("uppercases the first 8 characters of the room id", () => {
    expect(shortRoomCode("abcdef12-3456-7890")).toBe("ABCDEF12");
  });
});

describe("inviteLinkPath", () => {
  it("builds the /?room= path for a room id", () => {
    expect(inviteLinkPath("xyz")).toBe("/?room=xyz");
  });
});
