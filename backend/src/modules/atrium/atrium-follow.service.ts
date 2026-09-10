import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AtriumFollow, AtriumFollowDocument } from './schemas/atrium-follow.schema';
import { AtriumProfile, AtriumProfileDocument } from './schemas/atrium-profile.schema';
import { AtriumProfileService, AtriumPublicProfile } from './atrium-profile.service';
import { FollowListQueryDto } from './dto/atrium.dto';
import { LoggerHelper } from '../../common/logger';

export interface FollowResult {
  following: boolean;
  followerCount: number;
  /** True when the request changed nothing — a double-tap or a stale button. */
  alreadyInState: boolean;
}

@Injectable()
export class AtriumFollowService {
  private readonly logger = LoggerHelper.Instance.child(AtriumFollowService.name);

  constructor(
    @InjectModel(AtriumFollow.name)
    private readonly followModel: Model<AtriumFollowDocument>,
    @InjectModel(AtriumProfile.name)
    private readonly profileModel: Model<AtriumProfileDocument>,
    private readonly profileService: AtriumProfileService,
  ) {}

  /**
   * Follows a colleague.
   *
   * The unique index does the real work. Two taps of the button race: both pass
   * an "already following?" check, both insert, and one gets a duplicate-key
   * error. Catching 11000 and reporting the request as a no-op is what keeps
   * the counter equal to the true edge count — incrementing before the write,
   * or checking without the index, both drift permanently.
   */
  async follow(orgId: string, viewer: any, followeeId: string): Promise<FollowResult> {
    const followerId = await this.profileService.resolveViewerEmployeeId(viewer, orgId);

    if (followerId === followeeId) {
      throw new BadRequestException('You cannot follow yourself.');
    }

    const followee = await this.profileModel.findOne({
      organizationId: orgId,
      employeeId: followeeId,
    });
    if (!followee) throw new NotFoundException('This colleague has no Atrium profile yet.');
    if (!followee.isActive) {
      throw new BadRequestException('This colleague is no longer active.');
    }

    try {
      await this.followModel.create({ organizationId: orgId, followerId, followeeId });
    } catch (err: any) {
      if (err?.code === 11000) {
        // Already following. Report the live count rather than the stale one the
        // client was holding.
        return {
          following: true,
          followerCount: followee.followerCount,
          alreadyInState: true,
        };
      }
      throw err;
    }

    // Both counters move together, atomically, only after the edge exists.
    const [updatedFollowee] = await Promise.all([
      this.profileModel.findOneAndUpdate(
        { organizationId: orgId, employeeId: followeeId },
        { $inc: { followerCount: 1 } },
        { new: true },
      ),
      this.profileModel.updateOne(
        { organizationId: orgId, employeeId: followerId },
        { $inc: { followingCount: 1 } },
      ),
    ]);

    return {
      following: true,
      followerCount: updatedFollowee?.followerCount ?? followee.followerCount + 1,
      alreadyInState: false,
    };
  }

  /** Unfollow. Idempotent: unfollowing someone you do not follow is a no-op. */
  async unfollow(orgId: string, viewer: any, followeeId: string): Promise<FollowResult> {
    const followerId = await this.profileService.resolveViewerEmployeeId(viewer, orgId);

    const deleted = await this.followModel.findOneAndDelete({
      organizationId: orgId,
      followerId,
      followeeId,
    });

    const profile = await this.profileModel.findOne({
      organizationId: orgId,
      employeeId: followeeId,
    });

    if (!deleted) {
      return {
        following: false,
        followerCount: profile?.followerCount ?? 0,
        alreadyInState: true,
      };
    }

    // `$max: 0` in spirit: guarded so a historical drift cannot push a counter
    // negative, which would then render as "-1 followers".
    const [updatedFollowee] = await Promise.all([
      this.profileModel.findOneAndUpdate(
        { organizationId: orgId, employeeId: followeeId, followerCount: { $gt: 0 } },
        { $inc: { followerCount: -1 } },
        { new: true },
      ),
      this.profileModel.updateOne(
        { organizationId: orgId, employeeId: followerId, followingCount: { $gt: 0 } },
        { $inc: { followingCount: -1 } },
      ),
    ]);

    return {
      following: false,
      followerCount: updatedFollowee?.followerCount ?? Math.max(0, (profile?.followerCount ?? 1) - 1),
      alreadyInState: false,
    };
  }

  /** People following `employeeId`. */
  async getFollowers(orgId: string, viewer: any, employeeId: string, query: FollowListQueryDto) {
    const edges = await this.followModel
      .find({ organizationId: orgId, followeeId: employeeId }, 'followerId')
      .lean();
    return this.listProfiles(orgId, viewer, edges.map((e) => String(e.followerId)), query);
  }

  /** People `employeeId` follows. */
  async getFollowing(orgId: string, viewer: any, employeeId: string, query: FollowListQueryDto) {
    const edges = await this.followModel
      .find({ organizationId: orgId, followerId: employeeId }, 'followeeId')
      .lean();
    return this.listProfiles(orgId, viewer, edges.map((e) => String(e.followeeId)), query);
  }

  /**
   * Hydrates a set of employee ids into public profiles, paginated.
   *
   * One query for the page and one for the viewer's own follow set — never one
   * per row, which is how a followers list turns into fifty round trips.
   */
  private async listProfiles(
    orgId: string,
    viewer: any,
    ids: string[],
    query: FollowListQueryDto,
  ) {
    const viewerEmployeeId = await this.profileService.resolveViewerEmployeeIdOrNone(viewer, orgId);
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

    const filter: any = { organizationId: orgId, employeeId: { $in: ids } };
    if (query.search?.trim()) {
      const safe = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.displayName = new RegExp(safe, 'i');
    }

    const [rows, totalItems, myEdges] = await Promise.all([
      this.profileModel
        .find(filter)
        .sort({ displayName: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.profileModel.countDocuments(filter),
      this.followModel
        .find({ organizationId: orgId, followerId: viewerEmployeeId }, 'followeeId')
        .lean(),
    ]);

    const following = new Set(myEdges.map((e) => String(e.followeeId)));

    return {
      data: rows.map((p: any) => this.publicOf(p, viewerEmployeeId, following)),
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    };
  }

  /**
   * Suggestions: colleagues worth following.
   *
   * Ordered by shared department first, then by follower count. Department
   * proximity beats popularity because the people you sit near are the ones
   * whose updates you actually want — a pure popularity ranking just surfaces
   * the leadership team to everyone.
   */
  async getSuggestions(orgId: string, viewer: any, limit = 8): Promise<AtriumPublicProfile[]> {
    const viewerEmployeeId = await this.profileService.resolveViewerEmployeeIdOrNone(viewer, orgId);

    const [me, edges] = await Promise.all([
      this.profileModel.findOne({ organizationId: orgId, employeeId: viewerEmployeeId }).lean(),
      this.followModel
        .find({ organizationId: orgId, followerId: viewerEmployeeId }, 'followeeId')
        .lean(),
    ]);

    const following = new Set(edges.map((e) => String(e.followeeId)));
    const exclude = [...following, viewerEmployeeId];

    const candidates = await this.profileModel
      .find({
        organizationId: orgId,
        isActive: true,
        employeeId: { $nin: exclude },
      })
      .limit(120)
      .lean();

    const myDept = me?.departmentId || '';
    const ranked = candidates
      .map((p: any) => ({
        profile: p,
        score:
          (myDept && p.departmentId === myDept ? 1000 : 0) +
          Math.min(p.followerCount || 0, 100),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return ranked.map((r) => this.publicOf(r.profile, viewerEmployeeId, following));
  }

  /**
   * Recomputes every counter from the edges.
   *
   * Denormalised counters drift — a crash between the insert and the `$inc`, a
   * manual database edit. This makes the drift recoverable instead of
   * permanent, and reports what it corrected.
   */
  async reconcileCounters(orgId: string) {
    const [followerRows, followingRows, profiles] = await Promise.all([
      this.followModel.aggregate([
        { $match: { organizationId: orgId } },
        { $group: { _id: '$followeeId', count: { $sum: 1 } } },
      ]),
      this.followModel.aggregate([
        { $match: { organizationId: orgId } },
        { $group: { _id: '$followerId', count: { $sum: 1 } } },
      ]),
      this.profileModel.find({ organizationId: orgId }, 'employeeId followerCount followingCount').lean(),
    ]);

    const followers = new Map(followerRows.map((r: any) => [String(r._id), r.count]));
    const followings = new Map(followingRows.map((r: any) => [String(r._id), r.count]));

    const fixes: any[] = [];
    for (const p of profiles) {
      const trueFollowers = followers.get(String(p.employeeId)) || 0;
      const trueFollowing = followings.get(String(p.employeeId)) || 0;
      if (p.followerCount !== trueFollowers || p.followingCount !== trueFollowing) {
        fixes.push({
          updateOne: {
            filter: { _id: p._id },
            update: { $set: { followerCount: trueFollowers, followingCount: trueFollowing } },
          },
        });
      }
    }

    if (fixes.length) {
      await this.profileModel.bulkWrite(fixes);
      this.logger.warn(null, 'Atrium follow counters drifted and were corrected', {
        corrected: fixes.length,
      });
    }

    return { checked: profiles.length, corrected: fixes.length };
  }

  /** One projection, owned by the profile service — never a second copy here. */
  private publicOf(
    profile: any,
    viewerEmployeeId: string,
    following: Set<string>,
  ): AtriumPublicProfile {
    return this.profileService.toPublic(profile, viewerEmployeeId, following);
  }
}
