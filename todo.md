# IELTS Asteroid Game - Manus Deployment TODO

## Phase 1: Game Files & Routing
- [x] Copy script.js, ielts_words.js, gemini.js, style.css, favicon.ico to client/public/
- [x] Update client/index.html with game script tags
- [x] Create client/src/pages/GamePage.tsx with full game DOM
- [x] Update client/src/App.tsx to route / to GamePage

## Phase 2: Database & tRPC
- [x] Add gameScores table to drizzle/schema.ts
- [x] Run migration and apply SQL
- [x] Add score query helpers to server/db.ts
- [x] Add scores.save tRPC procedure
- [x] Add scores.leaderboard tRPC procedure

## Phase 3: Gemini Proxy
- [x] Add /api/gemini-tip REST endpoint in server/_core/index.ts using invokeLLM
- [x] Update client/public/gemini.js to call /api/gemini-tip (API key removed from client)

## Phase 4: Score Saving & Leaderboard UI
- [x] Hook score saving into endGame() in client/public/script.js
- [x] Add leaderboard overlay to GamePage.tsx using trpc.scores.leaderboard

## Phase 5: SEO/OGP & Tests
- [x] Generate OGP image and upload to S3
- [x] Add SEO/OGP meta tags to client/index.html
- [x] Write vitest tests for scores.save and scores.leaderboard
- [x] Run pnpm test - all 10 tests pass

## Phase 6: Checkpoint & Deploy
- [x] TypeScript: 0 errors
- [x] Save checkpoint
- [x] Deploy to Manus platform (user clicks Publish button)

## Phase 7: OGP Image / SNS Meta Tags / README
- [x] Generate high-quality OGP image (1200x630) for the game
- [x] Upload OGP image to CDN via manus-upload-file --webdev
- [x] Update index.html with comprehensive SNS meta tags (OGP, Twitter Card, LINE, Facebook, ja_JP locale)
- [x] Create English README.md at project root

## Phase 8: TTS & Survival Gauge
- [x] Add speakWord(word, lang) using Web Speech API to read English word aloud when asteroid is targeted
- [x] Add speakTranslation(translatedText, lang) to read the translation in selected language after destruction
- [x] Hook TTS into completeCurrentTypingTarget() to speak translation after word is destroyed
- [x] Hook TTS into syncTypingState() to speak English word when a new target is acquired
- [x] Redesign game-over: replace instant-death with a survival gauge (HP bar)
- [x] HP bar: starts at 100%, decreases when asteroid passes bottom (-25%), recovers +15% per asteroid destroyed
- [x] Draw HP bar on canvas HUD (top-right, red/green gradient)
- [x] Game over only when HP reaches 0
- [x] Update tests if needed, run pnpm test (10 tests pass)
- [x] Save checkpoint
