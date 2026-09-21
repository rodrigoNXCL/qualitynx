import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { NextResponse } from 'next/server';

const leadSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(120),
  company: z.string().trim().min(1, 'Empresa requerida').max(255),
  role: z.string().trim().max(120).optional().or(z.literal('')).default(''),
  whatsapp: z.string().trim().min(1, 'WhatsApp requerido').max(30),
  company_type: z.string().trim().min(1, 'Tipo de empresa requerido'),
  fruit_type: z.string().trim().max(120).optional().or(z.literal('')).default(''),
  recording_method: z.string().trim().max(80).optional().or(z.literal('')).default(''),
  inspection_volume: z.string().trim().max(50).optional().or(z.literal('')).default(''),
  problem: z.string().trim().min(1, 'Cuéntanos tu situación').max(2000),
});

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase no configurado.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      console.error('Validación fallida:', fields);
      return NextResponse.json({ error: 'Revisa los campos del formulario.', fields }, { status: 400 });
    }

    const { data, error } = await getAnonClient()
      .from('leads')
      .insert({ ...parsed.data, status: 'new' })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Error Supabase al guardar lead:', JSON.stringify(error));
      return NextResponse.json({ error: 'No fue posible guardar la solicitud.' }, { status: 500 });
    }

    return NextResponse.json({ lead: data }, { status: 201 });
  } catch (err) {
    console.error('Error inesperado al guardar lead:', err);
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}

export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: 'No configurado.' }, { status: 503 });
  }
  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await client.from('leads').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'Error al consultar.' }, { status: 500 });
  return NextResponse.json({ leads: data });
}
