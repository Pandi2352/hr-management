/** Accent keys the backend assigns; the colour values live in `atriumAccents.ts`. */
export type AtriumAccent =
  | 'indigo' | 'violet' | 'fuchsia' | 'rose'
  | 'orange' | 'amber' | 'lime' | 'emerald'
  | 'teal' | 'cyan' | 'sky' | 'blue';

/**
 * Exactly what the API returns for a colleague.
 *
 * Notice what is absent: no compensation, personal email, phone, address or
 * documents. Atrium reads a separate profile collection, not the employee
 * record, so those fields do not exist to leak.
 */
export interface AtriumProfile {
  employeeId: string;
  displayName: string;
  employeeCode: string;
  avatarUrl: string;
  departmentId: string;
  departmentName: string;
  designationTitle: string;
  workEmail: string;
  bio: string;
  interests: string[];
  askMeAbout: string[];
  pronouns: string;
  location: string;
  accent: AtriumAccent;
  /** Atrium's own portrait; the backend falls back to the HR avatar. */
  photoUrl: string;
  coverUrl: string;
  /** Absent once the day it was set has passed. */
  mood: { emoji: string; text: string } | null;
  followerCount: number;
  followingCount: number;
  joinedMonthYear: string;
  isFollowing: boolean;
  isSelf: boolean;
  /** False for yourself, and for a login with no employee record of its own. */
  viewerCanFollow: boolean;
}

export interface UpdateAtriumProfilePayload {
  bio?: string;
  interests?: string[];
  askMeAbout?: string[];
  pronouns?: string;
  location?: string;
  accent?: AtriumAccent;
  showBirthday?: boolean;
  showWorkAnniversary?: boolean;
  moodEmoji?: string;
  moodText?: string;
}

export interface AtriumDirectoryParams {
  search?: string;
  departmentId?: string;
  relationship?: 'all' | 'following' | 'not-following';
  page?: number;
  pageSize?: number;
}

/** Directory pagination, plus whether this login has an employee record. */
export interface AtriumDirectoryMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  /** False for a login with no employee record; it can browse but not follow. */
  viewerLinked: boolean;
}

export interface AtriumFacets {
  departments: { departmentId: string; name: string; count: number }[];
  accents: AtriumAccent[];
}

export interface FollowResult {
  following: boolean;
  followerCount: number;
  /** The request changed nothing — a double-tap, or a stale button. */
  alreadyInState: boolean;
}
