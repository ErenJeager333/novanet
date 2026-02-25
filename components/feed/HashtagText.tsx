'use client';

import { useRouter } from 'next/navigation';
import { formatHashtags } from '@/lib/utils';

interface HashtagTextProps {
  content: string;
  className?: string;
}

export default function HashtagText({ content, className }: HashtagTextProps) {
  const router = useRouter();
  const parts = formatHashtags(content);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.type === 'hashtag' ? (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/explore?tag=${part.value.slice(1)}`);
            }}
            className="text-indigo-500 hover:text-indigo-600 font-medium hover:underline transition-colors"
          >
            {part.value}
          </button>
        ) : (
          <span key={i}>{part.value}</span>
        )
      )}
    </span>
  );
}