import { createTRPCRouter } from '../server';
import { messagesRouter } from './messages';
import { chatRouter } from './chat';

export const appRouter = createTRPCRouter({
  messages: messagesRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;