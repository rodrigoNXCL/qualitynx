import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@qualitynx/database';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  try {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('users')
      .select(`
        *,
        companies (
          id,
          name,
          code,
          is_active
        )
      `)
      .eq('auth_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}