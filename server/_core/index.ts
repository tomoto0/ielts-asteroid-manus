import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { invokeLLM } from "./llm";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ── Word Translation Proxy ──
  // Returns a single translated word/phrase for TTS playback after asteroid destruction.
  // Uses Google Translate unofficial endpoint (no API key required).
  app.post("/api/translate", async (req, res) => {
    try {
      const { word, targetLang } = req.body as { word?: string; targetLang?: string };
      if (!word || typeof word !== "string") {
        res.status(400).json({ error: "word is required" });
        return;
      }
      const lang = targetLang || "ja";
      // Map app language codes to Google Translate locale codes
      const gtLangMap: Record<string, string> = {
        ja: "ja", es: "es", zh: "zh-CN",
        fr: "fr", it: "it", ko: "ko", ar: "ar",
        hi: "hi", ru: "ru", id: "id", pt: "pt",
      };
      const gtLang = gtLangMap[lang] || lang;
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(gtLang)}&dt=t&q=${encodeURIComponent(word)}`;
      const gtRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!gtRes.ok) throw new Error(`GT HTTP ${gtRes.status}`);
      const data = await gtRes.json() as unknown[][];
      // Response format: [ [ [translatedText, originalText, ...], ... ], ... ]
      const translation = ((data?.[0] as unknown[][])?.[0] as string[])?.[0]?.trim() ?? word;
      console.log(`[TranslateProxy] ${word} -> ${translation} (${gtLang})`);
      res.json({ translation });
    } catch (err) {
      console.error("[TranslateProxy] Error:", err);
      // Fallback: return the original word so TTS still fires (in English)
      res.json({ translation: req.body?.word ?? "" });
    }
  });

  // ── Gemini AI Tip Proxy ──
  // Keeps the API key strictly server-side; client calls /api/gemini-tip
  app.post("/api/gemini-tip", async (req, res) => {
    try {
      const { prompt } = req.body as { prompt?: string };
      if (!prompt || typeof prompt !== "string") {
        res.status(400).json({ error: "prompt is required" });
        return;
      }
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a helpful IELTS vocabulary coach. Give concise, encouraging tips (1-2 sentences max) about typing speed, vocabulary learning, or game strategy.",
          },
          { role: "user", content: prompt },
        ],
        maxTokens: 256,
      });
      const text =
        (result.choices?.[0]?.message?.content as string) ??
        "Keep practicing to improve your IELTS vocabulary!";
      res.json({ text });
    } catch (err) {
      console.error("[GeminiProxy] Error:", err);
      // Return a fallback tip so the game never breaks
      res.json({ text: "Focus on accuracy first, then speed. You're doing great!" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
