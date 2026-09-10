import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type AtriumFollowDocument = AtriumFollow & Document;

/**
 * A directed follow edge.
 *
 * Following is a **content subscription, not an access grant**: it decides
 * whose posts reach your feed and nothing else. It never widens what you can
 * see on a profile, and it needs no approval from the person followed.
 *
 * Edges are hard-deleted on unfollow rather than soft-deleted. A soft-deleted
 * edge would have to be excluded from every count and every "is following"
 * check, and the first place that was forgotten would silently report the wrong
 * follower total.
 */
@Schema({ timestamps: true, collection: 'atrium_follows' })
export class AtriumFollow {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  /** Employee id of the person doing the following. */
  @Prop({ type: String, required: true, index: true })
  followerId: string;

  /** Employee id of the person being followed. */
  @Prop({ type: String, required: true, index: true })
  followeeId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AtriumFollowSchema = SchemaFactory.createForClass(AtriumFollow);

/**
 * The guard that keeps counters honest.
 *
 * A double-tapped follow button fires two requests; both pass a service-level
 * "already following?" check before either writes. Without this index the
 * second insert succeeds, the counter is incremented twice, and the follower
 * total is permanently wrong with no way to notice. The unique index makes the
 * second write fail, and the service treats that failure as "already following".
 */
AtriumFollowSchema.index(
  { organizationId: 1, followerId: 1, followeeId: 1 },
  { unique: true },
);

/** Feed and list queries walk the graph in both directions. */
AtriumFollowSchema.index({ organizationId: 1, followerId: 1, createdAt: -1 });
AtriumFollowSchema.index({ organizationId: 1, followeeId: 1, createdAt: -1 });
