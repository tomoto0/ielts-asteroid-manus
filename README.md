# 🚀 IELTS Vocabulary Asteroid Game

> **Type IELTS vocabulary words to destroy falling asteroids — learn while you play!**

![OGP Banner](https://d2xsxph8kpxj0f.cloudfront.net/310419663027084947/9DnwzxsHiWb7cWTxwRXotk/ogp-ielts-asteroid-v2-GcaQMzPU8VYLV5J7VBf4Fa.png)

A full-stack web game that makes IELTS vocabulary acquisition exciting. Asteroids carrying English words fall from space — type each word correctly before it reaches the bottom to destroy it and score points. Powered by a React + Express + tRPC + MySQL stack deployed on Manus Platform.

**Live URL:** https://ielts-typing-game.manus.space/

---

## ✨ Features

| Feature | Details |
|---|---|
| **708 IELTS Words** | Curated vocabulary list covering all IELTS Academic & General bands |
| **11 Translation Languages** | Japanese 🇯🇵, Chinese 🇨🇳, Korean 🇰🇷, Spanish 🇪🇸, French 🇫🇷, German 🇩🇪, Italian 🇮🇹, Portuguese 🇵🇹, Arabic 🇸🇦, Hindi 🇮🇳, English 🇬🇧 |
| **AI Vocabulary Tips** | Press **Tab** during gameplay to get an AI-generated usage tip for the current target word (powered by Manus built-in LLM, server-side proxy — API key never exposed to client) |
| **Global Leaderboard** | Top 10 scores persisted in MySQL via tRPC + Drizzle ORM |
| **Particle Explosions** | Canvas-rendered particle burst, score pop-ups, and neon glow effects on word destruction |
| **Parallax Starfield** | Three-layer animated star background with nebula |
| **Sound Effects & BGM** | Web Audio API synthesised SFX and background music, individually toggleable |
| **Responsive Canvas** | Adapts to any screen size; mobile-safe viewport handling |

---

## 🎮 How to Play

1. Select your **translation language** from the dropdown on the start screen.
2. Click **START GAME**.
3. Asteroids with IELTS words fall from the top of the screen.
4. **Type the word** shown on the targeted asteroid (highlighted in cyan) and press nothing — each correct character advances the progress bar on the asteroid.
5. Destroy the asteroid before it reaches the bottom. If any asteroid passes the bottom line, the game ends.
6. Press **Tab** at any time to request an AI tip for the current word.
7. Use **PAUSE** / **MENU** buttons to pause or return to the start screen.
8. Your score is automatically saved to the global leaderboard at game over.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React 19 + Wouter (SPA shell)                       │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  GameShell (React.memo — never re-renders)     │  │   │
│  │  │  ┌──────────────┐  ┌──────────────────────┐   │  │   │
│  │  │  │  <canvas>    │  │  Vanilla JS Game     │   │  │   │
│  │  │  │  (rendering) │  │  script.js           │   │  │   │
│  │  │  └──────────────┘  └──────────────────────┘   │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  LeaderboardOverlay (tRPC useQuery)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │ tRPC (HTTP/JSON)          │ REST POST
          ▼                           ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│  Express 4 Server    │   │  /api/gemini-tip              │
│  tRPC Router         │   │  (invokeLLM — server-side)   │
│  scores.save         │   └──────────────────────────────┘
│  scores.leaderboard  │
└──────────┬───────────┘
           │ Drizzle ORM
           ▼
┌──────────────────────┐
│  MySQL / TiDB        │
│  gameScores table    │
└──────────────────────┘
```

---

## 🗂️ Key File Structure

```
client/
  index.html              ← Full SNS/OGP meta tags, Google Fonts
  public/
    script.js             ← Game engine (Canvas, asteroids, input, audio)
    ielts_words.js        ← 708 IELTS word objects with definitions
    gemini.js             ← AI tip client (calls /api/gemini-tip proxy)
    style.css             ← Space theme, neon glow, glassmorphism
  src/
    pages/
      GamePage.tsx        ← React shell: GameShell memo + LeaderboardOverlay
    App.tsx               ← Route: / → GamePage

server/
  _core/
    index.ts              ← Express setup + /api/gemini-tip endpoint
    llm.ts                ← Manus built-in LLM helper (invokeLLM)
  routers.ts              ← tRPC: scores.save, scores.leaderboard
  db.ts                   ← Drizzle query helpers: saveScore, getLeaderboard

drizzle/
  schema.ts               ← users + gameScores tables
  0001_gameScores.sql     ← Migration applied to production DB
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 + TypeScript |
| Routing | Wouter |
| API layer | tRPC 11 + Superjson |
| Backend | Express 4 + Node.js |
| Database ORM | Drizzle ORM |
| Database | MySQL / TiDB (Manus managed) |
| Game engine | Vanilla JS + HTML5 Canvas API |
| Audio | Web Audio API (synthesised) |
| AI tips | Manus built-in LLM (Gemini-compatible) |
| Styling | Tailwind CSS 4 + custom CSS (space theme) |
| Build tool | Vite 7 |
| Testing | Vitest (10 tests, all passing) |
| Hosting | Manus Platform |

---

## 🗃️ Database Schema

```sql
CREATE TABLE gameScores (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  playerName    VARCHAR(64)  NOT NULL,
  score         INT          NOT NULL,
  wordsDestroyed INT         NOT NULL DEFAULT 0,
  language      VARCHAR(32)  NOT NULL DEFAULT 'Japanese',
  createdAt     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API Endpoints

### tRPC Procedures

| Procedure | Type | Description |
|---|---|---|
| `scores.save` | mutation | Persist a game score (playerName, score, wordsDestroyed, language) |
| `scores.leaderboard` | query | Return top 10 scores ordered by score DESC |

### REST Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/gemini-tip` | Server-side proxy to Manus LLM — returns AI vocabulary tip for a given word |

---

## 🚀 Local Development

```bash
# 1. Clone
git clone https://github.com/Tabibito-AI/ielts-asteroid-game.git
cd ielts-asteroid-game

# 2. Install dependencies
pnpm install

# 3. Set environment variables (copy from .env.example)
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, BUILT_IN_FORGE_API_KEY, etc.

# 4. Run database migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 5. Start dev server
pnpm dev
# → http://localhost:3000
```

---

## 🧪 Tests

```bash
pnpm test
# ✓ server/scores.test.ts  (9 tests)
# ✓ server/auth.logout.test.ts (1 test)
# Test Files: 2 passed | Tests: 10 passed
```

---

## 📱 SNS Sharing

This app is fully configured for rich previews on all major platforms:

- **X (Twitter)** — `twitter:card: summary_large_image`
- **Facebook** — `og:image`, `og:type: website`, `og:locale: ja_JP`
- **LINE** — Standard OGP tags (1200×630 PNG image)
- **Structured Data** — JSON-LD `WebApplication` schema for Google rich results

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ using [Manus Platform](https://manus.im)*
