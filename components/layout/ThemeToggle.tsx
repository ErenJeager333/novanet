'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse" />;

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
      <button
        onClick={() => setTheme('light')}
        className={cn(
          'p-1.5 rounded-lg transition-all',
          theme === 'light'
            ? 'bg-white dark:bg-gray-700 text-yellow-500 shadow-sm'
            : 'text-gray-400 hover:text-gray-600'
        )}
        title="Mode clair"
      >
        <Sun size={15} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={cn(
          'p-1.5 rounded-lg transition-all',
          theme === 'system'
            ? 'bg-white dark:bg-gray-700 text-indigo-500 shadow-sm'
            : 'text-gray-400 hover:text-gray-600'
        )}
        title="Mode système"
      >
        <Monitor size={15} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          'p-1.5 rounded-lg transition-all',
          theme === 'dark'
            ? 'bg-white dark:bg-gray-700 text-indigo-400 shadow-sm'
            : 'text-gray-400 hover:text-gray-600'
        )}
        title="Mode sombre"
      >
        <Moon size={15} />
      </button>
    </div>
  );
}