import { systemRouter } from "./systemRouter";
import { publicProcedure, router } from "./lib/trpc";
import { decrementCounter, getCounter, incrementCounter } from "./db";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
  }),

  // Global counter demo - persisted server state
  counter: router({
    get: publicProcedure.query(() => getCounter()),
    increment: publicProcedure.mutation(() => incrementCounter()),
    decrement: publicProcedure.mutation(() => decrementCounter()),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
