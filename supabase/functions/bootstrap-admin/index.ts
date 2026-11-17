import { cors, reply, serviceClient } from '../_shared/http.ts';

// Creates (or resets) the single administrator account, login ID "admin123".
// Protected by the ADMIN_SETUP_TOKEN secret, which only the project owner knows. The password is
// sent once over HTTPS by scripts/setup-admin.ps1, is stored only as a hash inside Supabase Auth,
// and appears nowhere in the repository or the frontend bundle.
const LOGIN_ID = 'admin123';
// Supabase Auth identifies users by email, so the ID maps to a reserved internal address (no mail is ever sent to it).
const ADMIN_EMAIL = `${LOGIN_ID}@${Deno.env.get('ADMIN_EMAIL_DOMAIN') ?? 'admin.leadforge.invalid'}`;

function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const secret = Deno.env.get('ADMIN_SETUP_TOKEN');
    if (!secret || secret.length < 16) {
      return reply({ error: 'ADMIN_SETUP_TOKEN secret is not set (min 16 characters). Run scripts/setup-admin.ps1.' }, 503);
    }
    const { setup_token, password } = await req.json().catch(() => ({}));
    if (typeof setup_token !== 'string' || !safeEqual(setup_token, secret)) {
      return reply({ error: 'Invalid setup token.' }, 403);
    }
    if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
      return reply({ error: 'Password must be 12 to 128 characters.' }, 400);
    }

    const admin = serviceClient();
    // If anyone registered this reserved address before setup, remove it: no old session survives.
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const old = list?.users.find((u) => u.email === ADMIN_EMAIL);
    if (old) await admin.auth.admin.deleteUser(old.id);

    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL, password, email_confirm: true, user_metadata: { display_name: 'Administrator' },
    });
    if (error || !data.user) return reply({ error: `Could not create the admin: ${error?.message}` }, 500);

    const { error: pErr } = await admin.from('profiles')
      .upsert({ id: data.user.id, role: 'admin', login_id: LOGIN_ID, display_name: 'Administrator', is_active: true });
    if (pErr) return reply({ error: `Admin created, but its profile failed (run schema.sql first): ${pErr.message}` }, 500);

    return reply({ ok: true, login_id: LOGIN_ID, replaced_existing: !!old });
  } catch (e) {
    return reply({ error: `bootstrap-admin crashed: ${(e as Error).message}` }, 500);
  }
});
