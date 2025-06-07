import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../server';

export const messagesRouter = createTRPCRouter({
  // Add any message-specific routes here if needed
  getMessageById: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabase
        .from('messages')
        .select('*')
        .eq('id', input.messageId)
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    }),
});