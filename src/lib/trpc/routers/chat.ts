// src/lib/trpc/routers/chat.ts - UPDATED WITH BETTER ERROR HANDLING
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../server';
import { generateTextResponse, generateImage } from '../../gemini';

export const chatRouter = createTRPCRouter({
  // Test endpoint to verify everything is working
  test: protectedProcedure
    .query(async ({ ctx }) => {
      return { message: 'TRPC is working!', userId: ctx.userId };
    }),

  // Get all user's chats
  getChats: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        console.log('Getting chats for user:', ctx.userId);
        
        const { data, error } = await ctx.supabase
          .from('chats')
          .select('*')
          .eq('user_id', ctx.userId)
          .order('updated_at', { ascending: false });
        
        if (error) {
          console.error('Supabase error in getChats:', error);
          throw new Error(`Database error: ${error.message}`);
        }
        
        console.log('Found chats:', data?.length || 0);
        return data || [];
      } catch (error) {
        console.error('Error in getChats:', error);
        throw error;
      }
    }),

  // Create new chat
  createChat: protectedProcedure
    .input(z.object({
      title: z.string().optional().default('New Chat')
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('Creating chat for user:', ctx.userId);
        
        const { data, error } = await ctx.supabase
          .from('chats')
          .insert({
            user_id: ctx.userId,
            title: input.title
          })
          .select()
          .single();
        
        if (error) {
          console.error('Supabase error in createChat:', error);
          throw new Error(`Database error: ${error.message}`);
        }
        
        console.log('Created chat:', data);
        return data;
      } catch (error) {
        console.error('Error in createChat:', error);
        throw error;
      }
    }),

  // Get messages for a chat
  getMessages: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        console.log('Getting messages for chat:', input.chatId, 'user:', ctx.userId);
        
        // First check if the chat belongs to the user
        const { data: chat, error: chatError } = await ctx.supabase
          .from('chats')
          .select('user_id')
          .eq('id', input.chatId)
          .single();

        if (chatError) {
          console.error('Error checking chat ownership:', chatError);
          throw new Error(`Chat not found: ${chatError.message}`);
        }

        if (!chat || chat.user_id !== ctx.userId) {
          throw new Error('Chat not found or unauthorized');
        }

        const { data, error } = await ctx.supabase
          .from('messages')
          .select('*')
          .eq('chat_id', input.chatId)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Supabase error in getMessages:', error);
          throw new Error(`Database error: ${error.message}`);
        }
        
        console.log('Found messages:', data?.length || 0);
        return data || [];
      } catch (error) {
        console.error('Error in getMessages:', error);
        throw error;
      }
    }),

  // Send message and get AI response
  sendMessage: protectedProcedure
    .input(z.object({
      chatId: z.string(),
      content: z.string(),
      isImageRequest: z.boolean().optional().default(false)
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('Sending message to chat:', input.chatId, 'content length:', input.content.length, 'isImage:', input.isImageRequest);
        
        // First check if the chat belongs to the user
        const { data: chat, error: chatError } = await ctx.supabase
          .from('chats')
          .select('user_id')
          .eq('id', input.chatId)
          .single();

        if (chatError) {
          console.error('Error checking chat ownership:', chatError);
          throw new Error(`Chat not found: ${chatError.message}`);
        }

        if (!chat || chat.user_id !== ctx.userId) {
          throw new Error('Chat not found or unauthorized');
        }

        // Save user message
        console.log('Saving user message...');
        const { error: userMsgError } = await ctx.supabase
          .from('messages')
          .insert({
            chat_id: input.chatId,
            role: 'user',
            content: input.content
          });
        
        if (userMsgError) {
          console.error('Error saving user message:', userMsgError);
          throw new Error(`Failed to save message: ${userMsgError.message}`);
        }

        // Get chat history for context (optional for now)
        const { data: history } = await ctx.supabase
          .from('messages')
          .select('role, content')
          .eq('chat_id', input.chatId)
          .order('created_at', { ascending: true })
          .limit(10);

        let aiResponse: string;
        let imageUrl: string | null = null;

        if (input.isImageRequest) {
          console.log('Generating image...');
          try {
            imageUrl = await generateImage(input.content);
            aiResponse = `I've generated an image based on: "${input.content}"`;
          } catch (error) {
            console.error('Image generation failed:', error);
            aiResponse = "Sorry, I couldn't generate an image right now. Please try again later.";
          }
        } else {
          console.log('Generating text response...');
          try {
            // Use simple text generation for now
            aiResponse = await generateTextResponse(input.content);
          } catch (error) {
            console.error('Text generation failed:', error);
            aiResponse = "I'm sorry, I'm having trouble generating a response right now. Please check the API configuration and try again.";
          }
        }

        // Save AI response
        console.log('Saving AI response...');
        const { data, error } = await ctx.supabase
          .from('messages')
          .insert({
            chat_id: input.chatId,
            role: 'assistant',
            content: aiResponse,
            image_url: imageUrl
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error saving AI response:', error);
          throw new Error(`Failed to save AI response: ${error.message}`);
        }

        // Update chat's updated_at
        await ctx.supabase
          .from('chats')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', input.chatId);
        
        console.log('Message sent successfully');
        return data;
      } catch (error) {
        console.error('Error in sendMessage:', error);
        throw error;
      }
    }),

  // Delete chat
  deleteChat: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('Deleting chat:', input.chatId, 'for user:', ctx.userId);
        
        const { error } = await ctx.supabase
          .from('chats')
          .delete()
          .eq('id', input.chatId)
          .eq('user_id', ctx.userId);
        
        if (error) {
          console.error('Error deleting chat:', error);
          throw new Error(`Failed to delete chat: ${error.message}`);
        }
        
        console.log('Chat deleted successfully');
        return { success: true };
      } catch (error) {
        console.error('Error in deleteChat:', error);
        throw error;
      }
    }),
});