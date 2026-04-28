/**
 * GamePage - IELTS Vocabulary Asteroid Game
 *
 * Renders the original vanilla JS + Canvas game as a React shell.
 * All DOM IDs must remain unchanged so the global scripts (script.js, gemini.js, ielts_words.js)
 * can locate their elements exactly as they expect.
 *
 * IMPORTANT: The static game shell (canvas, input, buttons) is isolated in a
 * separate memoized component (GameShell) that NEVER re-renders after mount.
 * This prevents React re-renders from resetting textInput.value during gameplay.
 *
 * A leaderboard overlay is added alongside the game without touching any game logic.
 */
import { useState, useEffect, memo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import type { GameScore } from "../../../drizzle/schema";

// Language flag emoji map
const LANG_FLAGS: Record<string, string> = {
  ja: "🇯🇵", es: "🇪🇸", zh: "🇨🇳", fr: "🇫🇷", it: "🇮🇹",
  ko: "🇰🇷", ar: "🇸🇦", hi: "🇮🇳", ru: "🇷🇺", id: "🇮🇩", pt: "🇵🇹",
};

const RANK_ICONS = ["🥇", "🥈", "🥉"];

/**
 * GameShell - static DOM structure for the vanilla JS game.
 * Wrapped in React.memo with no props so it NEVER re-renders after initial mount.
 * This guarantees that textInput.value set by script.js is never wiped by React.
 */
const GameShell = memo(function GameShell({ onLeaderboardClick }: { onLeaderboardClick: () => void }) {
  return (
    <>
      {/* ── Game Canvas ── */}
      <canvas id="gameCanvas" style={{ display: "block", position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />

      {/* ── Start / Game-Over Overlay ── */}
      <div id="gameOverlay">
        <h1>IELTS Vocabulary Asteroid Game</h1>
        <p>Type the words on the asteroids to destroy them!</p>
        <button id="startButton">▶ Start Game</button>
        <div className="controls">
          <label htmlFor="translationLanguage">Translation Language:</label>
          <select id="translationLanguage">
            <option value="ja">🇯🇵 Japanese</option>
            <option value="es">🇪🇸 Spanish</option>
            <option value="zh">🇨🇳 Chinese</option>
            <option value="fr">🇫🇷 French</option>
            <option value="it">🇮🇹 Italian</option>
            <option value="ko">🇰🇷 Korean</option>
            <option value="ar">🇸🇦 Arabic</option>
            <option value="hi">🇮🇳 Hindi</option>
            <option value="ru">🇷🇺 Russian</option>
            <option value="id">🇮🇩 Indonesian</option>
            <option value="pt">🇵🇹 Portuguese</option>
          </select>
        </div>
        {/* Leaderboard toggle button inside the overlay */}
        <button
          id="leaderboardButton"
          onClick={onLeaderboardClick}
        >
          🏆 Leaderboard
        </button>
      </div>

      {/* ── Typing Input ── */}
      <div id="typingInput">
        <input type="text" id="textInput" autoComplete="off" spellCheck={false} />
        <div id="currentTarget">Target: None</div>
      </div>

      {/* ── AI Panel ── */}
      <div id="aiPanel">
        <p id="aiMessage"></p>
        <button id="helpButton">HELP (Tab)</button>
        <p id="controlsInfo"></p>
      </div>

      {/* ── Game Controls ── */}
      <div id="gameControls">
        <button id="pauseButton" title="Pause Game" style={{ display: "none" }}>
          ⏸ Pause
        </button>
        <button id="menuButton" title="Return to Menu" style={{ display: "none" }}>
          ⬡ Menu
        </button>
      </div>

      {/* ── Audio Controls ── */}
      <div id="audioControls">
        <button id="soundToggle" title="Toggle Sound Effects">
          🔊 Sound: ON
        </button>
        <button id="bgmToggle" title="Toggle Background Music">
          🎵 BGM: ON
        </button>
      </div>
    </>
  );
});

export default function GamePage() {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const { data: leaderboardData, refetch: refetchLeaderboard, isLoading } =
    trpc.scores.leaderboard.useQuery(undefined, {
      enabled: showLeaderboard,
      staleTime: 10_000,
      // Disable automatic background refetching to prevent re-renders during gameplay
      refetchOnWindowFocus: false,
      refetchInterval: false,
    });

  // Expose a global so script.js can trigger a leaderboard refresh after saving a score
  useEffect(() => {
    (window as any).__refreshLeaderboard = () => {
      setShowLeaderboard(true);
      refetchLeaderboard();
    };
    return () => {
      delete (window as any).__refreshLeaderboard;
    };
  }, [refetchLeaderboard]);

  const handleLeaderboardClick = useCallback(() => {
    setShowLeaderboard((v) => {
      if (!v) refetchLeaderboard();
      return !v;
    });
  }, [refetchLeaderboard]);

  return (
    <div
      className="w-full h-screen"
      style={{ margin: 0, padding: 0, overflow: "hidden", backgroundColor: "#050a14", position: "relative" }}
    >
      {/* GameShell is memoized and never re-renders — textInput.value is safe from React */}
      <GameShell onLeaderboardClick={handleLeaderboardClick} />

      {/* ── Leaderboard Overlay ── */}
      {showLeaderboard && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "linear-gradient(160deg, rgba(5,15,40,0.97) 0%, rgba(5,10,25,0.99) 100%)",
            border: "1px solid rgba(0,229,255,0.35)",
            borderRadius: "10px",
            padding: "28px 32px",
            zIndex: 9999,
            minWidth: "360px",
            maxWidth: "480px",
            width: "90vw",
            color: "#e0f4ff",
            fontFamily: "'Share Tech Mono', monospace",
            boxShadow: "0 0 40px rgba(0,229,255,0.2), 0 0 80px rgba(0,100,200,0.1), inset 0 0 30px rgba(0,229,255,0.03)",
            backdropFilter: "blur(16px)",
            animation: "float-in 0.3s ease both",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "rgba(0,229,255,0.6)", textTransform: "uppercase", marginBottom: "4px" }}>
                ◈ GLOBAL RANKINGS
              </div>
              <h2 style={{ margin: 0, fontFamily: "'Orbitron', monospace", fontSize: "1.1rem", fontWeight: 700, background: "linear-gradient(135deg, #00e5ff, #00ff88)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Top 10 Leaderboard
              </h2>
            </div>
            <button
              onClick={() => setShowLeaderboard(false)}
              style={{
                background: "rgba(255,51,102,0.1)",
                border: "1px solid rgba(255,51,102,0.4)",
                color: "#ff3366",
                cursor: "pointer",
                fontSize: "1rem",
                width: "32px",
                height: "32px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,51,102,0.25)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,51,102,0.1)")}
            >
              ✕
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent)", marginBottom: "16px" }} />

          {/* Content */}
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(0,229,255,0.6)" }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "0.75rem", letterSpacing: "0.15em", animation: "flicker 1s ease infinite" }}>
                LOADING DATA...
              </div>
            </div>
          ) : !leaderboardData || leaderboardData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🚀</div>
              <div style={{ color: "rgba(200,220,255,0.5)", fontSize: "0.85rem", letterSpacing: "0.06em" }}>
                No scores yet. Be the first!
              </div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  {["#", "Player", "Score", "Words", "Lang"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "6px 8px",
                        color: "rgba(0,229,255,0.7)",
                        fontFamily: "'Orbitron', monospace",
                        fontSize: "0.6rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        textAlign: i >= 2 ? "right" : "left",
                        borderBottom: "1px solid rgba(0,229,255,0.2)",
                        fontWeight: 400,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((entry: GameScore, i: number) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: "1px solid rgba(0,229,255,0.07)",
                      background: i === 0
                        ? "linear-gradient(90deg, rgba(255,230,0,0.06), transparent)"
                        : i === 1
                        ? "linear-gradient(90deg, rgba(200,200,200,0.04), transparent)"
                        : i === 2
                        ? "linear-gradient(90deg, rgba(200,120,0,0.04), transparent)"
                        : "transparent",
                      transition: "background 0.2s",
                    }}
                  >
                    <td style={{ padding: "9px 8px", fontSize: "1rem", width: "36px" }}>
                      {i < 3 ? RANK_ICONS[i] : (
                        <span style={{ color: "rgba(150,180,200,0.5)", fontFamily: "'Orbitron', monospace", fontSize: "0.7rem" }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "9px 8px", color: i === 0 ? "#ffe600" : "#e0f4ff", fontWeight: i === 0 ? "bold" : "normal", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.playerName}
                    </td>
                    <td style={{ padding: "9px 8px", textAlign: "right", fontFamily: "'Orbitron', monospace", fontWeight: "bold", fontSize: "0.9rem" }}>
                      <span style={{ color: i === 0 ? "#00ff88" : i === 1 ? "#00e5ff" : i === 2 ? "#ff8800" : "rgba(0,255,136,0.7)" }}>
                        {entry.score.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: "9px 8px", textAlign: "right", color: "rgba(150,190,220,0.7)", fontSize: "0.8rem" }}>
                      {entry.wordsDestroyed}
                    </td>
                    <td style={{ padding: "9px 8px", textAlign: "center", fontSize: "1.1rem" }}>
                      {LANG_FLAGS[entry.language] ?? entry.language}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Footer */}
          <div style={{ marginTop: "16px", height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.2), transparent)" }} />
          <div style={{ marginTop: "10px", textAlign: "center", fontSize: "0.68rem", color: "rgba(100,150,180,0.4)", letterSpacing: "0.1em", fontFamily: "'Orbitron', monospace" }}>
            TOP 10 · ALL TIME · GLOBAL
          </div>
        </div>
      )}
    </div>
  );
}
