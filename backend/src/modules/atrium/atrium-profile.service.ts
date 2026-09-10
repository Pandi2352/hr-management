import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { randomUUID } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AtriumProfile, AtriumProfileDocument } from './schemas/atrium-profile.schema';
import { AtriumFollow, AtriumFollowDocument } from './schemas/atrium-follow.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { Department, DepartmentDocument } from '../organization/schemas/department.schema';
import { Designation, DesignationDocument } from '../organization/schemas/designation.schema';
import { AtriumDirectoryQueryDto, UpdateAtriumProfileDto } from './dto/atrium.dto';
import { ATRIUM_ACCENTS, accentForId, INACTIVE_EMPLOYEE_STATUSES } from './atrium.constants';
import { LoggerHelper } from '../../common/logger';

/**
 * The public shape of an Atrium profile.
 *
 * This interface *is* the privacy boundary. Every field is listed explicitly;
 * nothing is spread in from the employee document. Adding a field here is a
 * deliberate decision to show it to the entire organization.
 */
export interface AtriumPublicProfile {
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
  accent: string;
  /** Atrium's own portrait; falls back to the HR avatar when unset. */
  photoUrl: string;
  coverUrl: string;
  /** Only present while it is still the day the mood was set. */
  mood: { emoji: string; text: string } | null;
  followerCount: number;
  followingCount: number;
  joinedMonthYear: string;
  /** Populated per viewer; never stored. */
  isFollowing: boolean;
  isSelf: boolean;
  /**
   * False for yourself, and for any login with no employee record of its own.
   * Carried on every profile so a follow control can never be shown where
   * pressing it would only return an error.
   */
  viewerCanFollow: boolean;
}

/** `skipped` means a recent sync was reused rather than repeated. */
export interface SyncResult {
  created: number;
  refreshed: number;
  skipped?: boolean;
}

@Injectable()
export class AtriumProfileService {
  private readonly logger = LoggerHelper.Instance.child(AtriumProfileService.name);

  /**
   * How long a completed sync is trusted for.
   *
   * The sync reads every employee, department and designation in the
   * organization and diffs them against the profile collection. That is fine
   * once; it is not fine on every request, and a single Atrium page load fires
   * several — the directory, your own profile, the suggestions — which React's
   * development double-render then doubles again. Six full scans to paint one
   * screen.
   *
   * The cost of the window is that an employee created in the last minute may
   * not appear in the Atrium yet. That is the right trade for a social
   * directory; nothing here is time-critical.
   */
  private static readonly SYNC_TTL_MS = 60_000;

  /** Last completed sync per organization. Per-process, and deliberately so:
   *  the sync is idempotent, so a second instance repeating it is harmless. */
  private readonly lastSyncAt = new Map<string, number>();

  /** In-flight syncs, so concurrent requests await one run instead of racing. */
  private readonly inFlightSync = new Map<string, Promise<SyncResult>>();

  constructor(
    @InjectModel(AtriumProfile.name)
    private readonly profileModel: Model<AtriumProfileDocument>,
    @InjectModel(AtriumFollow.name)
    private readonly followModel: Model<AtriumFollowDocument>,
    @InjectModel(Employee.name)
    private readonly empModel: Model<EmployeeDocument>,
    @InjectModel(Department.name)
    private readonly deptModel: Model<DepartmentDocument>,
    @InjectModel(Designation.name)
    private readonly desigModel: Model<DesignationDocument>,
  ) {}

  /**
   * Builds the client payload.
   *
   * Written as an explicit field list rather than `{...profile}` on purpose: a
   * spread would start emitting every future column, and this object is served
   * to every employee in the company.
   */
  /** Public so the follow service shares one projection rather than copying it. */
  toPublic(
    profile: AtriumProfile,
    viewerEmployeeId: string,
    followingSet: Set<string>,
  ): AtriumPublicProfile {
    return {
      employeeId: profile.employeeId,
      displayName: profile.displayName,
      employeeCode: profile.employeeCode,
      avatarUrl: profile.avatarUrl,
      departmentId: profile.departmentId,
      departmentName: profile.departmentName,
      designationTitle: profile.designationTitle,
      workEmail: profile.workEmail,
      bio: profile.bio,
      interests: profile.interests || [],
      askMeAbout: profile.askMeAbout || [],
      pronouns: profile.pronouns,
      location: profile.location,
      accent: profile.accent || accentForId(profile.employeeId),
      photoUrl: profile.photoUrl || profile.avatarUrl || '',
      coverUrl: profile.coverUrl || '',
      mood: AtriumProfileService.liveMood(profile),
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
      joinedMonthYear: profile.joiningDate
        ? new Date(profile.joiningDate).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })
        : '',
      isFollowing: followingSet.has(profile.employeeId),
      isSelf: Boolean(viewerEmployeeId) && profile.employeeId === viewerEmployeeId,
      viewerCanFollow: Boolean(viewerEmployeeId) && profile.employeeId !== viewerEmployeeId,
    };
  }

  /**
   * Resolves the employee behind a login account, or '' when there is none.
   *
   * Atrium is keyed on employee id, not user id, because the follow graph runs
   * between colleagues rather than between logins.
   *
   * Two rules matter here, and both exist because getting this wrong hands one
   * person another person's identity:
   *
   * 1. **Never match on `personalEmail`.** It used to be in this lookup, and it
   *    bound the seeded super admin to an unrelated employee whose personal
   *    address happened to equal the admin's login — the admin saw, and could
   *    have edited, that colleague's profile. A personal address is not an
   *    identity claim: it is reused, shared between family members, and typed
   *    in by whoever filled the form. Only the explicit `userId` link and the
   *    company-issued `workEmail` identify an employee.
   *
   * 2. **An ambiguous match resolves to nobody.** If two employees somehow
   *    carry the same work email, picking whichever the index returns first is
   *    a coin toss over someone's private profile. Refusing is the only safe
   *    answer.
   */
  private async findViewerEmployeeId(user: any, orgId: string): Promise<string> {
    if (user?.employeeId) return String(user.employeeId);

    // The explicit link wins, and needs no disambiguation.
    if (user?.userId) {
      const linked = await this.empModel
        .findOne({ organizationId: orgId, isDeleted: false, userId: user.userId }, '_id')
        .lean();
      if (linked) return String(linked._id);
    }

    const email = (user?.email || '').trim().toLowerCase();
    if (!email) return '';

    // Two are fetched so a duplicate is detected rather than silently chosen.
    const matches = await this.empModel
      .find({ organizationId: orgId, isDeleted: false, workEmail: email }, '_id')
      .limit(2)
      .lean();

    if (matches.length === 1) return String(matches[0]._id);

    if (matches.length > 1) {
      this.logger.warn(null, 'Ambiguous Atrium viewer: work email matches several employees', {
        email,
        organizationId: orgId,
      });
    }
    return '';
  }

  /**
   * The viewer's employee id for anything that acts *as* them — their own
   * profile, their uploads, their follows. There is no safe default here, so an
   * unlinked login is told plainly rather than guessed at.
   */
  async resolveViewerEmployeeId(user: any, orgId: string): Promise<string> {
    const employeeId = await this.findViewerEmployeeId(user, orgId);
    if (!employeeId) {
      throw new BadRequestException(
        'Your login is not linked to an employee record, so you have no Atrium profile of your own. Ask HR to link it.',
      );
    }
    return employeeId;
  }

  /**
   * The viewer's employee id for read-only browsing, or '' when unlinked.
   *
   * Someone without an employee record — a seeded super admin, an integration
   * account — can still look around the Atrium. They simply appear as nobody:
   * no card is "you", nothing reads as followed. Blocking the directory outright
   * would lock administrators out of a feature they may have to support.
   */
  async resolveViewerEmployeeIdOrNone(user: any, orgId: string): Promise<string> {
    return this.findViewerEmployeeId(user, orgId);
  }

  /**
   * Creates any missing profiles from the employee roster.
   *
   * Runs on demand rather than as a migration so a newly hired employee appears
   * without anyone remembering to backfill. Existing profiles keep their
   * self-authored fields; only denormalised identity is refreshed.
   */
  async syncProfiles(orgId: string, options: { force?: boolean } = {}): Promise<SyncResult> {
    if (!options.force) {
      const last = this.lastSyncAt.get(orgId) ?? 0;
      if (Date.now() - last < AtriumProfileService.SYNC_TTL_MS) {
        return { created: 0, refreshed: 0, skipped: true };
      }

      // Two requests arriving together share one run rather than both scanning.
      const inFlight = this.inFlightSync.get(orgId);
      if (inFlight) return inFlight;
    }

    const run = this.runSync(orgId)
      .then((result) => {
        this.lastSyncAt.set(orgId, Date.now());
        return result;
      })
      .finally(() => {
        this.inFlightSync.delete(orgId);
      });

    this.inFlightSync.set(orgId, run);
    return run;
  }

  private async runSync(orgId: string): Promise<SyncResult> {
    const [employees, existing, departments, designations] = await Promise.all([
      this.empModel
        .find(
          { organizationId: orgId, isDeleted: false },
          '_id firstName lastName displayName employeeCode avatarUrl departmentId designationId workEmail joiningDate dateOfBirth status userId',
        )
        .lean(),
      this.profileModel.find({ organizationId: orgId }).lean(),
      this.deptModel.find({ organizationId: orgId, isDeleted: false }, '_id name').lean(),
      this.desigModel.find({ organizationId: orgId, isDeleted: false }, '_id title').lean(),
    ]);

    const deptMap = new Map(departments.map((d) => [String(d._id), d.name]));
    const desigMap = new Map(designations.map((d) => [String(d._id), d.title]));
    const byEmployee = new Map(existing.map((p) => [String(p.employeeId), p]));

    const inserts: any[] = [];
    const updates: any[] = [];

    for (const e of employees) {
      const id = String(e._id);
      const isActive = !INACTIVE_EMPLOYEE_STATUSES.includes(e.status);
      const identity = {
        displayName: e.displayName || `${e.firstName} ${e.lastName}`.trim(),
        employeeCode: e.employeeCode || '',
        avatarUrl: e.avatarUrl || '',
        departmentId: e.departmentId ? String(e.departmentId) : '',
        departmentName: e.departmentId ? deptMap.get(String(e.departmentId)) || '' : '',
        designationTitle: e.designationId ? desigMap.get(String(e.designationId)) || '' : '',
        workEmail: e.workEmail || '',
        joiningDate: e.joiningDate || '',
        userId: e.userId ? String(e.userId) : '',
        isActive,
      };

      const current = byEmployee.get(id);
      if (!current) {
        inserts.push({
          organizationId: orgId,
          employeeId: id,
          accent: accentForId(id),
          // Only the day and month, and only shown if the person opts in.
          birthdayMonthDay: e.dateOfBirth ? String(e.dateOfBirth).slice(5, 10) : '',
          ...identity,
        });
      } else {
        updates.push({
          updateOne: { filter: { _id: current._id }, update: { $set: identity } },
        });
      }
    }

    if (inserts.length) await this.profileModel.insertMany(inserts, { ordered: false });
    if (updates.length) await this.profileModel.bulkWrite(updates);

    if (inserts.length) {
      this.logger.info(null, 'Atrium profiles created', { count: inserts.length });
    }
    return { created: inserts.length, refreshed: updates.length };
  }

  /** Employee ids the viewer already follows — one query, reused per page. */
  private async followingSet(orgId: string, viewerEmployeeId: string): Promise<Set<string>> {
    const edges = await this.followModel
      .find({ organizationId: orgId, followerId: viewerEmployeeId }, 'followeeId')
      .lean();
    return new Set(edges.map((e) => String(e.followeeId)));
  }

  async getDirectory(orgId: string, viewer: any, query: AtriumDirectoryQueryDto) {
    await this.syncProfiles(orgId);
    const viewerEmployeeId = await this.resolveViewerEmployeeIdOrNone(viewer, orgId);
    const following = await this.followingSet(orgId, viewerEmployeeId);

    const filter: any = { organizationId: orgId, isActive: true };
    if (query.departmentId && query.departmentId !== 'ALL') {
      filter.departmentId = query.departmentId;
    }

    if (query.search?.trim()) {
      const safe = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safe, 'i');
      filter.$or = [
        { displayName: regex },
        { designationTitle: regex },
        { departmentName: regex },
        { interests: regex },
        { askMeAbout: regex },
      ];
    }

    if (query.relationship === 'following') {
      filter.employeeId = { $in: [...following] };
    } else if (query.relationship === 'not-following') {
      filter.employeeId = { $nin: [...following, viewerEmployeeId] };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 24));

    const [rows, totalItems] = await Promise.all([
      this.profileModel
        .find(filter)
        .sort({ displayName: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.profileModel.countDocuments(filter),
    ]);

    return {
      data: rows.map((p) => this.toPublic(p as AtriumProfile, viewerEmployeeId, following)),
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
        /**
         * False when this login has no employee record. The client uses it to
         * hide follow controls that would only ever return an error, rather
         * than letting someone press a button that cannot work.
         */
        viewerLinked: Boolean(viewerEmployeeId),
      },
    };
  }

  async getProfile(orgId: string, viewer: any, employeeId: string): Promise<AtriumPublicProfile> {
    const viewerEmployeeId = await this.resolveViewerEmployeeIdOrNone(viewer, orgId);
    const profile = await this.profileModel
      .findOne({ organizationId: orgId, employeeId })
      .lean();
    if (!profile) throw new NotFoundException('This colleague has no Atrium profile yet.');

    const following = await this.followingSet(orgId, viewerEmployeeId);
    return this.toPublic(profile as AtriumProfile, viewerEmployeeId, following);
  }

  async getMyProfile(orgId: string, viewer: any): Promise<AtriumPublicProfile> {
    await this.syncProfiles(orgId);
    const viewerEmployeeId = await this.resolveViewerEmployeeId(viewer, orgId);
    return this.getProfile(orgId, viewer, viewerEmployeeId);
  }

  /**
   * Returns a mood only while it is still the day it was set.
   *
   * Read-time expiry rather than a scheduled sweep: there is no cron in this
   * service, and a stale row costs nothing as long as nobody is shown it.
   * Compared in the server's local day, which is the working day everyone here
   * shares.
   */
  private static liveMood(profile: AtriumProfile): { emoji: string; text: string } | null {
    if (!profile.moodEmoji && !profile.moodText) return null;
    if (!profile.moodSetAt) return null;
    const set = new Date(profile.moodSetAt);
    const now = new Date();
    const sameDay =
      set.getFullYear() === now.getFullYear() &&
      set.getMonth() === now.getMonth() &&
      set.getDate() === now.getDate();
    if (!sameDay) return null;
    return { emoji: profile.moodEmoji || '', text: profile.moodText || '' };
  }

  /**
   * Stores an Atrium portrait or cover.
   *
   * Written to its own `uploads/atrium` directory and served through an Atrium
   * route, so it never mixes with the HR avatar store that `users` owns. The
   * previous file is deleted after the new URL is saved — losing an orphan is
   * better than losing the picture someone just uploaded.
   */
  async uploadImage(
    orgId: string,
    viewer: any,
    kind: 'photo' | 'cover',
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<AtriumPublicProfile> {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Upload a JPG, PNG or WEBP image.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Image size cannot exceed 5MB.');
    }

    const viewerEmployeeId = await this.resolveViewerEmployeeId(viewer, orgId);
    const profile = await this.profileModel.findOne({
      organizationId: orgId,
      employeeId: viewerEmployeeId,
    });
    if (!profile) throw new NotFoundException('Your Atrium profile has not been created yet.');

    const dir = resolve(process.cwd(), 'uploads', 'atrium');
    await mkdir(dir, { recursive: true });

    // The extension comes from the MIME type, not the client filename, so an
    // uploaded ".html" cannot be written into a directory we serve from.
    const ext = file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const filename = `${kind}-${viewerEmployeeId}-${randomUUID()}${ext}`;
    await writeFile(join(dir, filename), file.buffer);

    const url = `/api/v1/atrium/media/${filename}`;
    const previous = kind === 'photo' ? profile.photoUrl : profile.coverUrl;
    if (kind === 'photo') profile.photoUrl = url;
    else profile.coverUrl = url;
    await profile.save();

    await this.removeStoredFile(previous);

    this.logger.info(null, `Atrium ${kind} updated`, { employeeId: viewerEmployeeId });
    const following = await this.followingSet(orgId, viewerEmployeeId);
    return this.toPublic(profile.toObject(), viewerEmployeeId, following);
  }

  /** Clears the portrait or cover and deletes the stored file. */
  async removeImage(
    orgId: string,
    viewer: any,
    kind: 'photo' | 'cover',
  ): Promise<AtriumPublicProfile> {
    const viewerEmployeeId = await this.resolveViewerEmployeeId(viewer, orgId);
    const profile = await this.profileModel.findOne({
      organizationId: orgId,
      employeeId: viewerEmployeeId,
    });
    if (!profile) throw new NotFoundException('Your Atrium profile has not been created yet.');

    const previous = kind === 'photo' ? profile.photoUrl : profile.coverUrl;
    if (kind === 'photo') profile.photoUrl = '';
    else profile.coverUrl = '';
    await profile.save();

    await this.removeStoredFile(previous);

    const following = await this.followingSet(orgId, viewerEmployeeId);
    return this.toPublic(profile.toObject(), viewerEmployeeId, following);
  }

  /** Deletes a file this service wrote. Anything else is left alone. */
  private async removeStoredFile(url: string) {
    if (!url || !url.startsWith('/api/v1/atrium/media/')) return;
    const name = url.replace('/api/v1/atrium/media/', '');
    const path = join(resolve(process.cwd(), 'uploads', 'atrium'), name);
    if (!existsSync(path)) return;
    try {
      await unlink(path);
    } catch {
      // An orphaned file is not worth failing the request the user asked for.
    }
  }

  /** Resolves a served media filename to a path, refusing anything outside the store. */
  resolveMediaPath(filename: string): string {
    const dir = resolve(process.cwd(), 'uploads', 'atrium');
    const path = resolve(dir, filename);
    // `resolve` collapses `..`, so a traversal attempt lands outside `dir` and
    // is rejected here rather than reaching the filesystem.
    if (!path.startsWith(dir + sep)) {
      throw new NotFoundException('Image not found.');
    }
    if (!existsSync(path)) throw new NotFoundException('Image not found.');
    return path;
  }

  async updateMyProfile(
    orgId: string,
    viewer: any,
    dto: UpdateAtriumProfileDto,
  ): Promise<AtriumPublicProfile> {
    const viewerEmployeeId = await this.resolveViewerEmployeeId(viewer, orgId);
    const profile = await this.profileModel.findOne({
      organizationId: orgId,
      employeeId: viewerEmployeeId,
    });
    if (!profile) throw new NotFoundException('Your Atrium profile has not been created yet.');

    if (dto.accent && !ATRIUM_ACCENTS.includes(dto.accent as any)) {
      throw new BadRequestException('That accent colour is not available.');
    }

    // Tags are trimmed, de-duplicated and length-capped here rather than trusted
    // from the client, so one person cannot stretch every card in the directory.
    const cleanTags = (tags: string[] | undefined, max: number) =>
      tags === undefined
        ? undefined
        : [...new Set(tags.map((t) => t.trim()).filter(Boolean).map((t) => t.slice(0, 32)))].slice(
            0,
            max,
          );

    if (dto.bio !== undefined) profile.bio = dto.bio.trim();
    if (dto.pronouns !== undefined) profile.pronouns = dto.pronouns.trim();
    if (dto.location !== undefined) profile.location = dto.location.trim();
    if (dto.accent !== undefined) profile.accent = dto.accent;
    if (dto.showBirthday !== undefined) profile.showBirthday = dto.showBirthday;
    if (dto.showWorkAnniversary !== undefined) {
      profile.showWorkAnniversary = dto.showWorkAnniversary;
    }

    // A mood is stamped when it changes, which is what read-time expiry keys on.
    if (dto.moodEmoji !== undefined || dto.moodText !== undefined) {
      const emoji = (dto.moodEmoji ?? profile.moodEmoji ?? '').trim();
      const text = (dto.moodText ?? profile.moodText ?? '').trim().slice(0, 60);
      profile.moodEmoji = emoji;
      profile.moodText = text;
      profile.moodSetAt = emoji || text ? new Date() : null;
    }

    const interests = cleanTags(dto.interests, 10);
    if (interests) profile.interests = interests;
    const askMeAbout = cleanTags(dto.askMeAbout, 6);
    if (askMeAbout) profile.askMeAbout = askMeAbout;

    await profile.save();

    const following = await this.followingSet(orgId, viewerEmployeeId);
    return this.toPublic(profile.toObject(), viewerEmployeeId, following);
  }

  /** Departments that actually have people, for the directory filter. */
  async getDepartmentFacets(orgId: string) {
    const rows = await this.profileModel.aggregate([
      { $match: { organizationId: orgId, isActive: true } },
      { $group: { _id: { id: '$departmentId', name: '$departmentName' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return rows
      .filter((r: any) => r._id.id)
      .map((r: any) => ({ departmentId: r._id.id, name: r._id.name, count: r.count }));
  }
}
