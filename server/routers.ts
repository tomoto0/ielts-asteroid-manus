import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { saveGameScore, getTopScores } from "./db";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  scores: router({
    save: publicProcedure
      .input(
        z.object({
          playerName: z.string().min(1).max(64),
          score: z.number().int().min(0),
          wordsDestroyed: z.number().int().min(0).default(0),
          language: z.string().max(8).default("ja"),
        })
      )
      .mutation(async ({ input }) => {
        await saveGameScore({
          playerName: input.playerName,
          score: input.score,
          wordsDestroyed: input.wordsDestroyed,
          language: input.language,
        });
        return { success: true } as const;
      }),

    leaderboard: publicProcedure.query(async () => {
      return getTopScores(10);
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
