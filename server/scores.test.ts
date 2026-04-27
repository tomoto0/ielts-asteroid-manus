import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module so tests run without a real database
vi.mock("./db", () => ({
  saveGameScore: vi.fn().mockResolvedValue(undefined),
  getTopScores: vi.fn().mockResolvedValue([
    {
      id: 1,
      playerName: "Alice",
      score: 200,
      wordsDestroyed: 20,
      language: "ja",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    },
    {
      id: 2,
      playerName: "Bob",
      score: 150,
      wordsDestroyed: 15,
      language: "en",
      createdAt: new Date("2024-01-02T00:00:00Z"),
    },
    {
      id: 3,
      playerName: "Carol",
      score: 100,
      wordsDestroyed: 10,
      language: "zh",
      createdAt: new Date("2024-01-03T00:00:00Z"),
    },
  ]),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("scores.save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves a valid score and returns success", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scores.save({
      playerName: "TestPlayer",
      score: 100,
      wordsDestroyed: 10,
      language: "ja",
    });

    expect(result).toEqual({ success: true });
  });

  it("accepts a score with default wordsDestroyed and language", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scores.save({
      playerName: "Player2",
      score: 50,
      wordsDestroyed: 0,
      language: "ja",
    });

    expect(result).toEqual({ success: true });
  });

  it("rejects a score with an empty playerName", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scores.save({
        playerName: "",
        score: 100,
        wordsDestroyed: 5,
        language: "ja",
      })
    ).rejects.toThrow();
  });

  it("rejects a negative score", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scores.save({
        playerName: "Player",
        score: -1,
        wordsDestroyed: 0,
        language: "ja",
      })
    ).rejects.toThrow();
  });

  it("rejects a playerName longer than 64 characters", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scores.save({
        playerName: "A".repeat(65),
        score: 100,
        wordsDestroyed: 5,
        language: "ja",
      })
    ).rejects.toThrow();
  });
});

describe("scores.leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an array of up to 10 scores", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scores.leaderboard();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it("returns scores with required fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scores.leaderboard();

    expect(result.length).toBeGreaterThan(0);
    const first = result[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("playerName");
    expect(first).toHaveProperty("score");
    expect(first).toHaveProperty("wordsDestroyed");
    expect(first).toHaveProperty("language");
    expect(first).toHaveProperty("createdAt");
  });

  it("returns scores ordered by score descending (highest first)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scores.leaderboard();

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it("first entry has the highest score", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scores.leaderboard();

    expect(result[0].playerName).toBe("Alice");
    expect(result[0].score).toBe(200);
  });
});
