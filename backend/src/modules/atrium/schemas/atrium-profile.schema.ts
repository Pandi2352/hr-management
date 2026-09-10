import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type AtriumProfileDocument = AtriumProfile & Document;

/**
 * An employee's public face inside Atrium.
 *
 * **This is a deliberately separate collection from `employees`.** Atrium shows
 * every colleague to every colleague, which is the exact opposite of the
 * department-scoped visibility the HR directory enforces. Keeping the social
 * profile in its own document means the two can never drift into each other:
 * there is no compensation, personal email, phone, address, document or
 * national-id field here to leak, because none is stored.
 *
 * Identity fields (name, avatar, department, designation) are denormalised from
 * the employee record and refreshed on sync. They are duplicated rather than
 * joined so a directory page of 24 people is one query, not twenty-five.
 */
@Schema({ timestamps: true, collection: 'atrium_profiles' })
export class AtriumProfile {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  /** The login account, so "is this me?" needs no extra lookup. */
  @Prop({ type: String, default: '', index: true })
  userId: string;

  // --- Denormalised identity ------------------------------------------------

  @Prop({ type: String, required: true, trim: true })
  displayName: string;

  @Prop({ type: String, default: '' })
  employeeCode: string;

  @Prop({ type: String, default: '' })
  avatarUrl: string;

  @Prop({ type: String, default: '' })
  departmentId: string;

  @Prop({ type: String, default: '' })
  departmentName: string;

  @Prop({ type: String, default: '' })
  designationTitle: string;

  /**
   * Work email only — the address colleagues already see in meeting invites.
   * Personal email and phone are never copied here.
   */
  @Prop({ type: String, default: '' })
  workEmail: string;

  // --- Self-authored ---------------------------------------------------------

  @Prop({ type: String, default: '', maxlength: 280 })
  bio: string;

  /** Free-form interests. The playful half of a profile. */
  @Prop({ type: [String], default: [] })
  interests: string[];

  /** What colleagues can approach this person about — the useful half. */
  @Prop({ type: [String], default: [] })
  askMeAbout: string[];

  @Prop({ type: String, default: '' })
  pronouns: string;

  @Prop({ type: String, default: '' })
  location: string;

  /**
   * Stable accent colour key. Assigned once at creation and stored rather than
   * derived at render time, so a person keeps the same colour everywhere —
   * including after a rename, which a name-hash would not survive.
   */
  @Prop({ type: String, default: '' })
  accent: string;

  /**
   * Atrium's own portrait and cover.
   *
   * Kept separate from the denormalised `avatarUrl`, which HR owns through the
   * employee record. Someone can put a relaxed photo on their Atrium profile
   * without touching the picture on their official employee file, and an HR
   * sync can never overwrite it. `avatarUrl` is the fallback when this is blank.
   */
  @Prop({ type: String, default: '' })
  photoUrl: string;

  @Prop({ type: String, default: '' })
  coverUrl: string;

  // --- Mood -----------------------------------------------------------------

  /**
   * Today's mood: an emoji and a short line.
   *
   * Expiry is read-time, not a stored job. A mood is only returned when it was
   * set on the current calendar day, so yesterday's "shipping all night" does
   * not follow someone into next week and no cleanup task is needed.
   */
  @Prop({ type: String, default: '' })
  moodEmoji: string;

  @Prop({ type: String, default: '', maxlength: 60 })
  moodText: string;

  @Prop({ type: Date, default: null })
  moodSetAt: Date | null;

  // --- Milestones (Sprint 4 reads these; opt-outs captured now) --------------

  /** `YYYY-MM-DD`. Drives work-anniversary posts later. */
  @Prop({ type: String, default: '' })
  joiningDate: string;

  /** Birthdays are opt-**in**: some people actively do not want it known at work. */
  @Prop({ type: Boolean, default: false })
  showBirthday: boolean;

  /** `MM-DD` only — never the birth year, which is identifying. */
  @Prop({ type: String, default: '' })
  birthdayMonthDay: string;

  @Prop({ type: Boolean, default: true })
  showWorkAnniversary: boolean;

  // --- Denormalised counters -------------------------------------------------

  /**
   * Maintained with atomic `$inc` on follow/unfollow. Counting edges per row
   * would turn a 24-card directory page into fifty extra queries.
   */
  @Prop({ type: Number, default: 0, min: 0 })
  followerCount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  followingCount: number;

  /** Hidden from the directory when the employee is no longer active. */
  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AtriumProfileSchema = SchemaFactory.createForClass(AtriumProfile);

/** One profile per employee. */
AtriumProfileSchema.index({ organizationId: 1, employeeId: 1 }, { unique: true });
AtriumProfileSchema.index({ organizationId: 1, isActive: 1, displayName: 1 });
AtriumProfileSchema.index({ organizationId: 1, departmentId: 1 });
