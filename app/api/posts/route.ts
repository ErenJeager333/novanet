/**
 * NovaNet – Posts API Route
 * GET  /api/posts – list posts
 * POST /api/posts – create post
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-server';
import { z } from 'zod';

const createPostSchema = z.object({
  content: z.string().min(1).max(2000),
  media_url: z.array(z.string().url()).optional(),
  post_type: z.enum(['text', 'image', 'video', 'story', 'reel', 'thread']).optional(),
  visibility: z.enum(['public', 'friends', 'private']).optional(),
  group_id: z.string().uuid().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') ?? '0', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const groupId = searchParams.get('group_id');
  const authorId = searchParams.get('author_id');

  let query = supabase
    .from('posts')
    .select('*, author:profiles(*)')
    .eq('visibility', 'public')
    .eq('is_removed', false)
    .is('expires_at', null)
    .order('created_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1);

  if (groupId) query = query.eq('group_id', groupId);
  if (authorId) query = query.eq('author_id', authorId);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Anti-toxicity: check blocked words
  const adminClient = createAdminClient();
  const { data: blockedWords } = await adminClient.from('blocked_words').select('word');
  const words = (blockedWords ?? []).map((r: { word: string }) => r.word);
  const lower = parsed.data.content.toLowerCase();
  const hasBlocked = words.some((w: string) => lower.includes(w.toLowerCase()));

  if (hasBlocked) {
    return NextResponse.json(
      { error: 'Content violates community guidelines' },
      { status: 422 }
    );
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      ...parsed.data,
      author_id: user.id,
    })
    .select('*, author:profiles(*)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: post }, { status: 201 });
}
