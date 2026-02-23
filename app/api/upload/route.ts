/**
 * NovaNet – Media Upload API Route
 * POST /api/upload – upload image/video to Cloudinary
 *
 * Falls back to Supabase Storage if Cloudinary env vars are not set.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file size (max 50MB)
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 413 });
  }

  // ─── Try Cloudinary first ──────────────────────────────────────────────────
  if (
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    const cloudinaryForm = new FormData();
    cloudinaryForm.append('file', file);
    cloudinaryForm.append(
      'upload_preset',
      process.env.CLOUDINARY_UPLOAD_PRESET ?? 'novanet_uploads'
    );
    cloudinaryForm.append('folder', 'novanet');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
      { method: 'POST', body: cloudinaryForm }
    );

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ url: data.secure_url });
    }
  }

  // ─── Fallback: Supabase Storage ───────────────────────────────────────────
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `media/${user.id}/${uuidv4()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from('media')
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
