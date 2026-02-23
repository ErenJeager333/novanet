/**
 * NovaNet – Utility Functions
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, isThisYear } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Tailwind Class Merger ─────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  // Less than 1 minute
  if (diff < 60_000) return 'just now';

  // Less than 24 hours – use relative
  if (diff < 86_400_000) {
    return formatDistanceToNow(d, { addSuffix: true });
  }

  // This year – show day and month
  if (isThisYear(d)) {
    return format(d, 'MMM d');
  }

  // Older – show full date
  return format(d, 'MMM d, yyyy');
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

// ─── Number Formatting ────────────────────────────────────────────────────────

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Content Moderation ───────────────────────────────────────────────────────

/**
 * Client-side check: returns true if content contains a blocked word.
 * Server-side version should query the blocked_words table.
 *
 * Anti-toxicity feature: prevents hateful content from being posted.
 */
export function containsBlockedWords(content: string, blockedWords: string[]): boolean {
  const lower = content.toLowerCase();
  return blockedWords.some((word) => lower.includes(word.toLowerCase()));
}

/**
 * Truncate content for preview.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + '…';
}

// ─── URL Utilities ────────────────────────────────────────────────────────────

export function getAvatarFallback(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function getPublicUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`;
}

// ─── Stories Utility ──────────────────────────────────────────────────────────

/**
 * Returns the expiry date for a story (24h from now).
 */
export function getStoryExpiryDate(): string {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d.toISOString();
}

export function isStoryExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// ─── Well-being Utilities ─────────────────────────────────────────────────────

/**
 * Formats seconds into a human-readable duration.
 * e.g. 3661 → "1h 1m"
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
