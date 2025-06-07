import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@auth0/nextjs-auth0';
import { supabase } from '../supabaseClient';

export async function createContext({ req, res }: { req: NextApiRequest; res: NextApiResponse }) {
  const session = await getSession(req, res);
  const user = session?.user;

  return {
    user,
    userId: user?.sub || null,
    supabase,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;