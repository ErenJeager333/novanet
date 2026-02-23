/**
 * NovaNet – Core TypeScript Types
 * Mirrors the Supabase schema for type-safe usage throughout the app.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'moderator' | 'admin';
export type PostType = 'text' | 'image' | 'video' | 'story' | 'reel' | 'thread';
export type Visibility = 'public' | 'friends' | 'private';
export type RelationshipType = 'friend' | 'follow' | 'blocked';
export type NotificationType = 'like' | 'comment' | 'follow' | 'message' | 'mention' | 'group_invite';
export type FeedMode = 'chronological' | 'algorithmic';

// ─── Database Row Types ────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string;
  avatar_url: string | null;
  cover_url: string | null;
  website: string | null;
  location: string | null;
  job_title: string | null;
  company: string | null;
  role: UserRole;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  default_visibility: Visibility;
  show_likes: boolean;
  daily_limit_minutes: number | null;
  break_reminder_mins: number;
  feed_mode: FeedMode;
  notif_likes: boolean;
  notif_comments: boolean;
  notif_follows: boolean;
  notif_messages: boolean;
  theme: 'light' | 'dark' | 'system';
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  group_id: string | null;
  content: string;
  media_url: string[] | null;
  post_type: PostType;
  visibility: Visibility;
  expires_at: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_flagged: boolean;
  is_removed: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  author?: Profile;
  is_liked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  is_flagged: boolean;
  is_removed: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  author?: Profile;
  is_liked?: boolean;
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string | null;
  comment_id: string | null;
  created_at: string;
}

export interface Relationship {
  id: string;
  follower_id: string;
  following_id: string;
  relationship_type: RelationshipType;
  created_at: string;
  // Joined
  follower?: Profile;
  following?: Profile;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  cover_url: string | null;
  visibility: Visibility;
  creator_id: string;
  members_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  is_member?: boolean;
  creator?: Profile;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
  // Joined
  profile?: Profile;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  name: string | null;
  created_at: string;
  // Joined
  participants?: Profile[];
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  file_url: string | null;
  file_type: 'image' | 'video' | 'file' | null;
  file_name: string | null;
  expires_at: string | null;
  is_read: boolean;
  read_at: string | null;
  is_deleted: boolean;
  created_at: string;
  // Joined
  sender?: Profile;
}


export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: NotificationType;
  post_id: string | null;
  comment_id: string | null;
  message: string | null;
  is_read: boolean;
  read_at: string | null;
  is_deleted: boolean;
  // Joined
  sender?: Profile;
}

export interface Report {
  id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface WellbeingSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_s: number | null;
}

// ─── API Response Types ────────────────────────────────────────────────────────

export interface ApiResponse<T = void> {
  data?: T;
  error?: string;
}

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface CreatePostInput {
  content: string;
  media_url?: string[];
  post_type?: PostType;
  visibility?: Visibility;
  group_id?: string;
  parent_id?: string;
  expires_at?: string; // for stories
}

export interface UpdateProfileInput {
  display_name?: string;
  bio?: string;
  website?: string;
  location?: string;
  job_title?: string;
  company?: string;
  avatar_url?: string;
  cover_url?: string;
}

export interface SendMessageInput {
  conversation_id: string;
  content: string;
  media_url?: string;
  expires_at?: string;
}

// ─── Component Props ──────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
}
