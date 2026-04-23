import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada');
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAuth() {
  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('No autorizado');
  return user;
}

export async function GET() {
  try {
    await requireAuth();
    const admin = adminClient();
    const { data, error } = await admin.auth.admin.listUsers();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const users = data.users.map((u) => ({
      id: u.id,
      email: u.email,
      role: (u.user_metadata?.role as string) || 'team',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));
    return Response.json(users);
  } catch (e: unknown) {
    return Response.json({ error: (e as Error).message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth();
    const { email, password, role } = await req.json();
    if (!email || !password) return Response.json({ error: 'Email y contraseña requeridos' }, { status: 400 });

    const admin = adminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { role: role || 'team' },
      email_confirm: true,
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ id: data.user.id, email: data.user.email });
  } catch (e: unknown) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAuth();
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'ID requerido' }, { status: 400 });

    const admin = adminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true });
  } catch (e: unknown) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
