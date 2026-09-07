import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LoginAttempt,
  LoginAttemptDocument,
} from '../auth/schemas/login-attempt.schema';

export interface LoginHistoryQuery {
  search?: string;
  outcome?: 'ALL' | 'SUCCESS' | 'FAILURE';
  reason?: string;
  ipAddress?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

/** Derived from the user-agent string; no extra data is stored for this. */
function deviceFromUserAgent(userAgent = ''): string {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return 'Tablet';
  if (/mobile|android|iphone/.test(ua)) return 'Mobile';
  if (/curl|postman|axios|node-fetch|python-requests/.test(ua)) return 'API Client';
  if (ua) return 'Desktop';
  return 'Unknown';
}

function browserFromUserAgent(userAgent = ''): string {
  if (/edg\//i.test(userAgent)) return 'Edge';
  if (/chrome|crios/i.test(userAgent)) return 'Chrome';
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  return 'Unknown';
}

@Injectable()
export class LoginHistoryService {
  constructor(
    @InjectModel(LoginAttempt.name)
    private readonly attemptModel: Model<LoginAttemptDocument>,
  ) {}

  async findAll(query: LoginHistoryQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.outcome === 'SUCCESS') filter.success = true;
    if (query.outcome === 'FAILURE') filter.success = false;
    if (query.reason && query.reason !== 'ALL') filter.failureReason = query.reason;
    if (query.ipAddress) filter.ipAddress = query.ipAddress;

    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(query.from);
      if (query.to) {
        const to = new Date(query.to);
        if (!query.to.includes('T')) to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    if (query.search && query.search.trim()) {
      const rx = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ email: rx }, { ipAddress: rx }, { failureReason: rx }];
    }

    const [rows, total] = await Promise.all([
      this.attemptModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.attemptModel.countDocuments(filter),
    ]);

    return {
      data: rows.map((row: any) => ({
        _id: row._id,
        email: row.email,
        userId: row.userId ?? null,
        success: row.success,
        failureReason: row.failureReason ?? null,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent ?? '',
        deviceType: deviceFromUserAgent(row.userAgent),
        browser: browserFromUserAgent(row.userAgent),
        createdAt: row.createdAt,
      })),
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

  /**
   * Repeated failures from one IP inside the window — the "suspicious pattern"
   * signal from the checklist, computed rather than stored.
   */
  async findSuspicious(windowHours = 24, threshold = 3) {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const rows = await this.attemptModel.aggregate([
      { $match: { success: false, createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$ipAddress',
          failures: { $sum: 1 },
          emails: { $addToSet: '$email' },
          lastAttempt: { $max: '$createdAt' },
        },
      },
      { $match: { failures: { $gte: threshold } } },
      { $sort: { failures: -1 } },
      { $limit: 20 },
    ]);

    return rows.map((r: any) => ({
      ipAddress: r._id,
      failures: r.failures,
      distinctAccounts: r.emails.length,
      emails: r.emails.slice(0, 5),
      lastAttempt: r.lastAttempt,
      windowHours,
    }));
  }
}
