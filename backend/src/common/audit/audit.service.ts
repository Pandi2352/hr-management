import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit-log.schema';
import {
  Organization,
  OrganizationDocument,
} from '../../modules/organization/schemas/organization.schema';
import { ActorType, AuditAction, AuditResource, AuditStatus } from './audit.constants';
import { diffAuditValues, sanitizeAuditValue } from './audit-sanitizer.util';
import { requestContext } from './request-context';

export interface RecordAuditInput {
  action: AuditAction | string;
  resourceType: AuditResource | string;
  resourceId?: string | null;
  organizationId?: string | null;
  /** Falls back to the authenticated actor on the request context. */
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
  actorName?: string;
  actorEmail?: string;
  actorType?: ActorType;
  description?: string;
  status?: AuditStatus;
  /** Raw before/after — sanitized and reduced to changed fields internally. */
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, any> | null;
  sessionId?: string | null;
  /** Overrides for events recorded outside an HTTP request. */
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQuery {
  organizationId?: string;
  search?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  actorUserId?: string;
  status?: string;
  requestId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  /** Cached fallback org id — resolved once, reused for the process lifetime. */
  private defaultOrganizationId: string | null = null;

  constructor(
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>,
    @InjectModel(Organization.name) private readonly orgModel: Model<OrganizationDocument>,
  ) {}

  /**
   * Actors without an `organizationId` (e.g. the seeded super admin) would
   * otherwise write records under "SYSTEM" that the org-scoped read path can
   * never return. Fall back to the tenant's own organization so writes and
   * reads land in the same scope.
   */
  private async resolveOrganizationId(explicit?: string | null): Promise<string> {
    if (explicit) return explicit;

    if (!this.defaultOrganizationId) {
      try {
        const org = await this.orgModel.findOne({}, '_id').lean();
        this.defaultOrganizationId = org ? String(org._id) : null;
      } catch {
        this.defaultOrganizationId = null;
      }
    }

    return this.defaultOrganizationId || 'SYSTEM';
  }

  /**
   * Writes one append-only audit record.
   *
   * Never throws: a logging failure must not roll back or block the business
   * transaction that succeeded (checklist §1). Failures are surfaced in the
   * server log instead so they're still detectable.
   */
  async record(input: RecordAuditInput): Promise<void> {
    try {
      const ctx = requestContext.get();

      const changes =
        input.before !== undefined || input.after !== undefined
          ? diffAuditValues(input.before, input.after)
          : null;

      await this.auditModel.create({
        organizationId: await this.resolveOrganizationId(
          input.organizationId || ctx?.organizationId,
        ),

        actorUserId: input.actorUserId ?? ctx?.actorUserId ?? null,
        actorEmployeeId: input.actorEmployeeId ?? null,
        actorName: input.actorName || '',
        actorEmail: input.actorEmail || ctx?.actorEmail || '',
        actorType:
          input.actorType ??
          (input.actorUserId || ctx?.actorUserId ? ActorType.USER : ActorType.SYSTEM),

        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        description: input.description || '',
        status: input.status ?? AuditStatus.SUCCESS,

        oldValue: changes?.oldValue ?? null,
        newValue: changes?.newValue ?? null,
        metadata: input.metadata ? sanitizeAuditValue(input.metadata) : null,

        requestId: ctx?.requestId ?? null,
        sessionId: input.sessionId ?? null,
        ipAddress: input.ipAddress || ctx?.ipAddress || '',
        userAgent: input.userAgent || ctx?.userAgent || '',
        deviceType: ctx?.deviceType || '',
      });
    } catch (err) {
      this.logger.error(
        `Failed to write audit record (${input.action} ${input.resourceType})`,
        err as Error,
      );
    }
  }

  /** Paginated, filtered query backing GET /audit/logs. */
  async findAll(query: AuditQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.organizationId) filter.organizationId = query.organizationId;
    if (query.action && query.action !== 'ALL') filter.action = query.action;
    if (query.resourceType && query.resourceType !== 'ALL') filter.resourceType = query.resourceType;
    if (query.resourceId) filter.resourceId = query.resourceId;
    if (query.actorUserId && query.actorUserId !== 'ALL') filter.actorUserId = query.actorUserId;
    if (query.status && query.status !== 'ALL') filter.status = query.status;
    if (query.requestId) filter.requestId = query.requestId;

    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(query.from);
      if (query.to) {
        // Inclusive end-of-day when a bare date is supplied.
        const to = new Date(query.to);
        if (!query.to.includes('T')) to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    if (query.search && query.search.trim()) {
      const rx = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { actorName: rx },
        { actorEmail: rx },
        { description: rx },
        { resourceId: rx },
        { requestId: rx },
        { action: rx },
        { _id: rx },
      ];
    }

    const sort: any = { createdAt: query.sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      this.auditModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.auditModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async findById(id: string, organizationId?: string) {
    const filter: any = { _id: id };
    if (organizationId) filter.organizationId = organizationId;
    return this.auditModel.findOne(filter).lean();
  }

  /** Timeline for one resource — powers the Employee "Audit History" tab. */
  async findForResource(
    resourceType: string,
    resourceId: string,
    options: { page?: number; limit?: number; action?: string; organizationId?: string } = {},
  ) {
    return this.findAll({
      resourceType,
      resourceId,
      action: options.action,
      organizationId: options.organizationId,
      page: options.page,
      limit: options.limit ?? 20,
    });
  }

  /** Full filtered result set for CSV export — bypasses pagination. */
  async findAllForExport(query: AuditQuery, cap = 5000) {
    const { data } = await this.findAll({ ...query, page: 1, limit: cap });
    return data;
  }
}
