import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { NextResponse } from 'next/server';

const optionalText = (maxLength: number) =>
  z.union([z.literal(''), z.string().trim().max(maxLength)]).transform((v) => v.trim() || '');

const leadSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa tu nombre.').max(120),
  company: z.string().trim().min(2, 'Ingresa el nombre de tu empresa.').max(255),
  role: optionalText(120),
  whatsapp: z.string().trim().min(7, 'Ingresa un número de WhatsApp válido.').max(30).regex(/^[+\d][\d\s()-]*$/, 'Ingresa un número de WhatsApp válido.'),
  fruit_type: optionalText(120),
  company_type: z.enum(['Productor', 'Packing', 'Exportadora', 'Otro'], { errorMap: () => ({ message: 'Selecciona un tipo de empresa.' }) }),
  problem: z.string().trim().min(10, 'Cuéntanos un poco más sobre tu problema.').max(2000),
});

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase no configurado.');
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Revisa los campos del formulario.', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data, error } = await getAnonClient()
      .from('leads')
      .insert({ ...parsed.data, status: 'new' })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Error al guardar lead:', error);
      return NextResponse.json({ error: 'No fue posible guardar la solicitud. Intente nuevamente.' }, { status: 500 });
    }

    return NextResponse.json({ lead: data }, { status: 201 });
  } catch (error) {
    console.error('Error inesperado al guardar lead:', error);
    return NextResponse.json({ error: 'No fue posible guardar la solicitud. Intente nuevamente.' }, { status: 500 });
  }
}

export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: 'La consulta de leads no está configurada en este entorno.' }, { status: 503 });
  }

  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await client.from('leads').select('*').order('created_at', { ascending: false }).limit(100);

  if (error) {
    console.error('Error al consultar leads:', error);
    return NextResponse.json({ error: 'No fue posible consultar los leads.' }, { status: 500 });
  }

  return NextResponse.json({ leads: data });
}
