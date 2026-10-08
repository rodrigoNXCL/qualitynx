import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.json(
        { error: 'Supabase no configurado.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = signInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Correo y contraseña son requeridos.' },
        { status: 400 }
      );
    }

    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await client.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      redirect: '/dashboard',
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: { id: data.user.id, email: data.user.email },
    });
  } catch {
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}
