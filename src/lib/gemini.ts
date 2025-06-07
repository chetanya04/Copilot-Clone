// src/lib/gemini.ts - Clean version with Gemini + Pollinations
import { GoogleGenerativeAI } from '@google/generative-ai';

// Check for Gemini API key
if (!process.env.GOOGLE_GEMINI_API_KEY) {
  throw new Error('GOOGLE_GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// TEXT GENERATION - Gemini API
export async function generateTextResponse(prompt: string) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error('Gemini error:', error);
    throw new Error('Failed to generate text response');
  }
}

// TEXT GENERATION WITH CHAT HISTORY
export async function generateTextResponseWithHistory(prompt: string, chatHistory: any[] = []) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    });

    const recentHistory = chatHistory.slice(-10).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({ history: recentHistory });
    const result = await chat.sendMessage(prompt);
    return result.response.text();

  } catch (error) {
    console.error('Chat error:', error);
    // Fallback to simple generation
    return await generateTextResponse(prompt);
  }
}

// IMAGE GENERATION - Pollinations AI (FREE)
export function generateImage(prompt: string, width: number = 1024, height: number = 1024): string {
  try {
    // Clean the prompt
    const cleanPrompt = encodeURIComponent(prompt.trim());
    
    // Return Pollinations URL
    return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}`;
    
  } catch (error) {
    console.error('Image generation error:', error);
    // Return placeholder image
    return `https://picsum.photos/${width}/${height}`;
  }
}

// ADVANCED IMAGE GENERATION with more options
export function generateAdvancedImage(prompt: string, options: {
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
} = {}): string {
  
  const width = options.width || 1024;
  const height = options.height || 1024;
  const model = options.model || 'flux';
  const seed = options.seed || Math.floor(Math.random() * 1000000);
  
  const cleanPrompt = encodeURIComponent(prompt.trim());
  
  return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&model=${model}&seed=${seed}`;
}

// UTILITY FUNCTIONS
export function checkAvailableServices() {
  return {
    gemini: !!process.env.GOOGLE_GEMINI_API_KEY,
    pollinations: true // Always available
  };
}