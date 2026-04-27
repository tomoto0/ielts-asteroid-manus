/**
 * GamePage - IELTS Vocabulary Asteroid Game
 *
 * Renders the original vanilla JS + Canvas game as a React shell.
 * All DOM IDs must remain unchanged so the global scripts (script.js, gemini.js, ielts_words.js)
 * can locate their elements exactly as they expect.
 *
 * A leaderboard overlay is added alongside the game without touching any game logic.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import type { GameScore } from "../../../drizzle/schema";

export default function GamePage() {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const { data: leaderboardData, refetch: refetchLeaderboard } =
    trpc.scores.leaderboard.useQuery(undefined, {
      enabled: showLeaderboard,
      staleTime: 10_000,
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

  return (
    <div
      className="w-full h-screen"
      style={{ margin: 0, padding: 0, overflow: "hidden", backgroundColor: "#0b0f13" }}
    >
      {/* ── Game Canvas ── */}
      <canvas id="gameCanvas" style={{ display: "block", width: "100%", height: "100%" }} />

      {/* ── Start / Game-Over Overlay ── */}
      <div id="gameOverlay">
        <h1>IELTS Vocabulary Asteroid Game</h1>
        <p>Type the words on the asteroids to destroy them!</p>
        <button id="startButton">Start Game</button>
        <div className="controls">
          <label htmlFor="translationLanguage">Translation Language:</label>
          <select id="translationLanguage">
            <option value="ja">Japanese</option>
            <option value="es">Spanish</option>
            <option value="zh">Chinese</option>
            <option value="fr">French</option>
            <option value="it">Italian</option>
            <option value="ko">Korean</option>
            <option value="ar">Arabic</option>
            <option value="hi">Hindi</option>
            <option value="ru">Russian</option>
            <option value="id">Indonesian</option>
            <option value="pt">Portuguese</option>
          </select>
        </div>
        {/* Leaderboard toggle button inside the overlay */}
        <button
          id="leaderboardButton"
          onClick={() => {
            setShowLeaderboard((v) => !v);
            if (!showLeaderboard) refetchLeaderboard();
          }}
          style={{ marginTop: "10px", background: "#1a2a3a", border: "1px solid #00ff00", color: "#00ff00", padding: "8px 16px", cursor: "pointer", fontFamily: "monospace" }}
        >
          🏆 Leaderboard
        </button>
      </div>

      {/* ── Typing Input ── */}
      <div id="typingInput">
        <input type="text" id="textInput" autoComplete="off" />
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
          🏠 Menu
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

      {/* ── Leaderboard Overlay (React-managed, outside game DOM) ── */}
      {showLeaderboard && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(11, 15, 19, 0.97)",
            border: "2px solid #00ff00",
            borderRadius: "8px",
            padding: "24px 32px",
            zIndex: 9999,
            minWidth: "340px",
            color: "#fff",
            fontFamily: "monospace",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, color: "#00ff00", fontSize: "1.2rem" }}>🏆 Top 10 Leaderboard</h2>
            <button
              onClick={() => setShowLeaderboard(false)}
              style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", fontSize: "1.2rem" }}
            >
              ✕
            </button>
          </div>
          {!leaderboardData ? (
            <p style={{ color: "#aaa", textAlign: "center" }}>Loading...</p>
          ) : leaderboardData.length === 0 ? (
            <p style={{ color: "#aaa", textAlign: "center" }}>No scores yet. Be the first!</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #00ff00" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#00ff00" }}>#</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#00ff00" }}>Player</th>
                  <th style={{ textAlign: "right", padding: "4px 8px", color: "#00ff00" }}>Score</th>
                  <th style={{ textAlign: "right", padding: "4px 8px", color: "#00ff00" }}>Words</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#00ff00" }}>Lang</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((entry: GameScore, i: number) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: "1px solid #1a2a3a",
                      background: i === 0 ? "rgba(0,255,0,0.05)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "6px 8px", color: i === 0 ? "#ffd700" : "#aaa" }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </td>
                    <td style={{ padding: "6px 8px", color: "#fff" }}>{entry.playerName}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "#00ff00", fontWeight: "bold" }}>
                      {entry.score}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "#aaa" }}>
                      {entry.wordsDestroyed}
                    </td>
                    <td style={{ padding: "6px 8px", color: "#aaa" }}>{entry.language}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
