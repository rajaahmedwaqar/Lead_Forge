import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Always answer 200 with {error} so the app can show the real message.
export const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export const serviceClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

export interface Caller {
  admin: ReturnType<typeof serviceClient>;
  userId: string;
  role: 'admin' | 'customer';
  profile: Record<string, any>;
}

/**
 * Identify the caller from their JWT. The user id ALWAYS comes from the verified token,
 * never from the request body. Returns a Response to send back when the caller is not allowed.
 * (Done here rather than by the gateway so it works with both legacy and new JWT signing keys.)
 */
export async function authenticate(req: Request, opts: { adminOnly?: boolean } = {}): Promise<Caller | Response> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return reply({ error: 'You are not signed in. Please sign in again.' }, 401);
  const admin = serviceClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return reply({ error: 'Your session has expired. Please sign in again.' }, 401);
  const { data: profile } = await admin.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  if (!profile) return reply({ error: 'No profile exists for this account.' }, 403);
  if (!profile.is_active) return reply({ error: 'This account has been suspended. Contact the administrator.' }, 403);
  if (opts.adminOnly && profile.role !== 'admin') return reply({ error: 'Administrator access is required.' }, 403);
  return { admin, userId: data.user.id, role: profile.role, profile };
}

export const isResponse = (x: unknown): x is Response => x instanceof Response;
