
import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '@/src/lib/trpc/routers/app';
import { createContext } from '@/src/lib/trpc/Context';

export default createNextApiHandler({
  router: appRouter,
  createContext,
});