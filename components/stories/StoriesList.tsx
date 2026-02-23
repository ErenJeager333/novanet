/**
 * NovaNet – Stories List Component
 * Horizontal scrollable row of story bubbles.
 * Stories expire after 24h (ephemeral, Snapchat-like).
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Post } from '@/types';
import { getAvatarFallback } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

interface StoriesListProps {
  stories: Post[];
  currentUserId: string;
}

export default function StoriesList({ stories, currentUserId }: StoriesListProps) {
  const [activeStory, setActiveStory] = useState<Post | null>(null);

  if (stories.length === 0) return null;

  return (
    <>
      {/* Stories row */}
      <div className="card p-3">
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {/* Add story CTA */}
          <Link
            href="/feed?newStory=1"
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-nova-300 dark:border-nova-700 flex items-center justify-center bg-nova-50 dark:bg-nova-950/30">
              <Plus size={20} className="text-nova-500" />
            </div>
            <span className="text-xs text-gray-500 truncate w-14 text-center">
              Your story
            </span>
          </Link>

          {/* Story bubbles */}
          {stories.map((story) => (
            <button
              key={story.id}
              onClick={() => setActiveStory(story)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className="story-ring w-[60px] h-[60px]">
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-0.5 overflow-hidden">
                  {story.author?.avatar_url ? (
                    <Image
                      src={story.author.avatar_url}
                      alt={story.author.display_name ?? ''}
                      width={56}
                      height={56}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-nova-gradient flex items-center justify-center text-white text-sm font-bold">
                      {getAvatarFallback(
                        story.author?.display_name ?? story.author?.username
                      )}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate w-14 text-center">
                {story.author?.display_name?.split(' ')[0] ?? story.author?.username}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Story viewer modal */}
      {activeStory && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button
            onClick={() => setActiveStory(null)}
            className="absolute top-4 right-4 z-10 text-white p-2"
          >
            <X size={28} />
          </button>

          <div className="relative w-full max-w-sm h-[80vh] rounded-2xl overflow-hidden">
            {/* Story progress bar */}
            <div className="absolute top-3 inset-x-3 z-10 h-0.5 bg-white/30 rounded-full">
              <div className="h-full bg-white rounded-full animate-[progress_5s_linear_forwards]" />
            </div>

            {/* Story content */}
            {activeStory.media_url && activeStory.media_url[0] ? (
              <Image
                src={activeStory.media_url[0]}
                alt="Story"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-nova-gradient flex items-center justify-center p-8">
                <p className="text-white text-xl font-bold text-center leading-relaxed">
                  {activeStory.content}
                </p>
              </div>
            )}

            {/* Story author */}
            <div className="absolute bottom-4 inset-x-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 overflow-hidden">
                {activeStory.author?.avatar_url && (
                  <Image
                    src={activeStory.author.avatar_url}
                    alt=""
                    width={36}
                    height={36}
                    className="object-cover"
                  />
                )}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">
                  {activeStory.author?.display_name ?? activeStory.author?.username}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
