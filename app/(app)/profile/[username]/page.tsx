/**
 * NovaNet – User Profile Page
 */

import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import ProfileClient from '@/components/profile/ProfileClient';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `View ${username}'s profile on NovaNet`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createServerClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Fetch profile by username
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !profile) notFound();

  // Fetch posts
  const { data: posts } = await supabase
    .from('posts')
    .select('*, author:profiles(*)')
    .eq('author_id', profile.id)
    .eq('is_removed', false)
    .is('expires_at', null)
    .order('created_at', { ascending: false })
    .limit(20);

  // Is current user following this profile?
  let isFollowing = false;
  if (currentUser) {
    const { data: rel } = await supabase
      .from('relationships')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', profile.id)
      .single();
    isFollowing = !!rel;
  }

  return (
    <ProfileClient
      profile={profile}
      posts={posts ?? []}
      currentUserId={currentUser?.id ?? null}
      isFollowing={isFollowing}
    />
  );
}
