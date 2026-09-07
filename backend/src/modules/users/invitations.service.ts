import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  GoneException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Invitation, InvitationDocument, InvitationStatus } from './schemas/invitation.schema';
import { User, UserDocument } from './schemas/user.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import { SecurityPolicy, SecurityPolicyDocument } from './schemas/security-policy.schema';
import { Organization, OrganizationDocument } from '../organization/schemas/organization.schema';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { CreateInvitationDto, AcceptInvitationDto } from './dto/invitation.dto';
import { UserStatus } from '../../common/constants';
import { generateUuid } from '../../common/utils/uuid.util';
import { validatePasswordAgainstPolicy, DEFAULT_SECURITY_POLICY } from '../../common/utils/password-policy.util';

const RESEND_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_RESENDS_PER_WINDOW = 3;

export interface PaginatedInvitationsResponse {
  data: Invitation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class InvitationsService {
  constructor(
    @InjectModel(Invitation.name) private readonly invitationModel: Model<InvitationDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(SecurityPolicy.name) private readonly policyModel: Model<SecurityPolicyDocument>,
    @InjectModel(Organization.name) private readonly orgModel: Model<OrganizationDocument>,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  private async audit(
    orgId: string | null | undefined,
    userId: string | null | undefined,
    entityId: string,
    action: AuditAction,
    description = '',
    metadata: Record<string, any> | null = null,
  ) {
    await this.auditService.record({
      action,
      resourceType: AuditResource.INVITATION,
      resourceId: entityId,
      organizationId: orgId,
      actorUserId: userId,
      description,
      metadata,
    });
  }

  /** Lazily flips stale PENDING invitations to EXPIRED so they stay visible in the roster. */
  private async sweepExpired(): Promise<void> {
    await this.invitationModel.updateMany(
      { status: InvitationStatus.PENDING, expiresAt: { $lt: new Date() } },
      { $set: { status: InvitationStatus.EXPIRED } },
    );
  }

  async createInvitation(
    dto: CreateInvitationDto,
    actorId: string,
    actorName: string,
    orgId?: string | null,
  ): Promise<Invitation> {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.userModel.findOne({ email, isDeleted: false });
    if (existingUser) {
      throw new ConflictException(`A user account already exists for ${email}`);
    }

    await this.sweepExpired();
    const existingPending = await this.invitationModel.findOne({
      email,
      status: InvitationStatus.PENDING,
    });
    if (existingPending) {
      throw new ConflictException(
        `An invitation is already pending for ${email}. Resend or revoke it instead of creating a new one.`,
      );
    }

    const expiryHours = dto.expiryHours || 48;
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const invitation = await this.invitationModel.create({
      organizationId: orgId || undefined,
      email,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      roles: dto.roles,
      tokenHash,
      status: InvitationStatus.PENDING,
      invitedByUserId: actorId,
      invitedByName: actorName,
      expiresAt,
      resendCount: 0,
    });

    await this.dispatchInvitationEmail(invitation, rawToken, expiryHours);
    await this.audit(
      orgId,
      actorId,
      invitation._id,
      AuditAction.INVITE_SENT,
      `Invited ${email} as ${dto.roles.join(', ')}`,
      { email, roles: dto.roles, expiryHours },
    );

    const sanitized = invitation.toObject();
    delete (sanitized as any).tokenHash;
    return sanitized;
  }

  private async dispatchInvitationEmail(
    invitation: InvitationDocument | Invitation,
    rawToken: string,
    expiryHours: number,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const acceptUrl = `${frontendUrl}/auth/accept-invite?token=${rawToken}`;

    let orgName = 'PeopleOS';
    try {
      const org = await this.orgModel.findOne().lean();
      if (org) orgName = org.tradeName || org.legalName || orgName;
    } catch {
      // Use fallback org name
    }

    await this.mailService.sendInvitationEmail({
      toEmail: invitation.email,
      inviterName: invitation.invitedByName || 'A PeopleOS Administrator',
      roleLabel: invitation.roles.join(', ') || 'Administrator',
      orgName,
      acceptUrl,
      expiresInHours: expiryHours,
    });
  }

  async listInvitations(query: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedInvitationsResponse> {
    await this.sweepExpired();

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const filter: any = {};
    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }
    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
      ];
    }

    const [data, total] = await Promise.all([
      this.invitationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      this.invitationModel.countDocuments(filter),
    ]);

    return {
      data: data as unknown as Invitation[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async resendInvitation(id: string, actorId: string, actorName: string): Promise<{ message: string }> {
    const invitation = await this.invitationModel.findById(id);
    if (!invitation) throw new NotFoundException('Invitation not found');

    if (invitation.status !== InvitationStatus.PENDING && invitation.status !== InvitationStatus.EXPIRED) {
      throw new BadRequestException(
        `This invitation has already been ${invitation.status.toLowerCase()} and cannot be resent`,
      );
    }

    if (
      invitation.lastResentAt &&
      Date.now() - invitation.lastResentAt.getTime() < RESEND_WINDOW_MS &&
      invitation.resendCount >= MAX_RESENDS_PER_WINDOW
    ) {
      throw new BadRequestException(
        `This invitation has already been resent ${MAX_RESENDS_PER_WINDOW} times in the last 24 hours. Please wait before trying again.`,
      );
    }

    const rawToken = randomBytes(32).toString('hex');
    invitation.tokenHash = await bcrypt.hash(rawToken, 10);
    invitation.status = InvitationStatus.PENDING;
    invitation.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    invitation.resendCount = (invitation.resendCount || 0) + 1;
    invitation.lastResentAt = new Date();
    invitation.invitedByUserId = actorId;
    invitation.invitedByName = actorName;
    await invitation.save();

    await this.dispatchInvitationEmail(invitation, rawToken, 48);
    await this.audit(invitation.organizationId, actorId, invitation._id, AuditAction.INVITE_RESENT, `Resent invitation to ${invitation.email}`);

    return { message: `Invitation resent to ${invitation.email}` };
  }

  async revokeInvitation(id: string, actorId: string): Promise<{ message: string }> {
    const invitation = await this.invitationModel.findById(id);
    if (!invitation) throw new NotFoundException('Invitation not found');

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('This invitation has already been accepted and cannot be revoked');
    }

    invitation.status = InvitationStatus.REVOKED;
    invitation.revokedAt = new Date();
    await invitation.save();

    await this.audit(invitation.organizationId, actorId, invitation._id, AuditAction.INVITE_REVOKED, `Revoked invitation for ${invitation.email}`);

    return { message: `Invitation for ${invitation.email} has been revoked` };
  }

  /** Finds the invitation matching a raw token, if any (does not mutate state). */
  private async findByRawToken(token: string): Promise<InvitationDocument | null> {
    if (!token || typeof token !== 'string' || token.trim().length < 16) {
      return null;
    }

    const candidates = await this.invitationModel.find({}).select('+tokenHash');
    for (const candidate of candidates) {
      const isMatch = await bcrypt.compare(token, candidate.tokenHash);
      if (isMatch) return candidate;
    }
    return null;
  }

  async validateToken(token: string): Promise<{
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    expiresAt: Date;
    invitedByName: string;
  }> {
    await this.sweepExpired();

    const invitation = await this.findByRawToken(token);
    if (!invitation) {
      throw new BadRequestException('This invitation link is invalid or malformed.');
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new GoneException('This invitation has already been accepted. Please sign in instead.');
    }
    if (invitation.status === InvitationStatus.REVOKED) {
      throw new BadRequestException('This invitation has been revoked by an administrator.');
    }
    if (invitation.status === InvitationStatus.EXPIRED || invitation.expiresAt < new Date()) {
      throw new BadRequestException('This invitation link has expired. Please request a new one.');
    }

    return {
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      roles: invitation.roles,
      expiresAt: invitation.expiresAt,
      invitedByName: invitation.invitedByName,
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto, ipAddress: string, userAgent: string) {
    const invitation = await this.findByRawToken(dto.token);
    if (!invitation) {
      throw new BadRequestException('This invitation link is invalid or malformed.');
    }
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new GoneException('This invitation has already been accepted. Please sign in instead.');
    }
    if (invitation.status === InvitationStatus.REVOKED) {
      throw new BadRequestException('This invitation has been revoked by an administrator.');
    }
    if (invitation.status === InvitationStatus.EXPIRED || invitation.expiresAt < new Date()) {
      throw new BadRequestException('This invitation link has expired. Please request a new one.');
    }

    const policy = (await this.policyModel.findOne().lean()) || DEFAULT_SECURITY_POLICY;
    const violations = validatePasswordAgainstPolicy(dto.password, policy as any);
    if (violations.length > 0) {
      throw new BadRequestException(violations.join('. '));
    }

    const existingUser = await this.userModel.findOne({ email: invitation.email, isDeleted: false });
    if (existingUser) {
      throw new ConflictException(`A user account already exists for ${invitation.email}`);
    }

    const allRoles = await this.roleModel.find().lean();
    const matchedRoles = allRoles.filter((role) =>
      invitation.roles.some((assigned) =>
        [role.name, role.code, role.code.toUpperCase()].includes(assigned),
      ),
    );
    const permissions = matchedRoles.some((r) => r.permissions.includes('*'))
      ? ['*']
      : Array.from(new Set(matchedRoles.flatMap((r) => r.permissions)));

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.userModel.create({
      _id: generateUuid(),
      organizationId: invitation.organizationId,
      email: invitation.email,
      passwordHash,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      status: UserStatus.ACTIVE,
      roles: invitation.roles,
      permissions,
      failedLoginAttempts: 0,
      isDeleted: false,
    });

    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    await invitation.save();

    await this.audit(
      invitation.organizationId,
      user._id,
      invitation._id,
      AuditAction.INVITE_ACCEPTED,
      `${invitation.email} accepted their invitation and activated their account`,
      { roles: invitation.roles },
    );

    return this.authService.issueSession(user, ipAddress, userAgent, false);
  }
}
