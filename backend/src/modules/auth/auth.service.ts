import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { SecurityPolicy, SecurityPolicyDocument } from '../users/schemas/security-policy.schema';
import { Session, SessionDocument } from './schemas/session.schema';
import { LoginAttempt, LoginAttemptDocument } from './schemas/login-attempt.schema';
import { PasswordResetOtp, OtpDocument } from './schemas/password-reset-otp.schema';
import { PasswordResetToken, PasswordResetTokenDocument } from './schemas/password-reset-token.schema';
import { AuditService } from '../../common/audit/audit.service';
import {
  AuditAction,
  AuditResource,
  AuditStatus,
  ActorType,
} from '../../common/audit/audit.constants';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserStatus, ErrorCode } from '../../common/constants';
import {
  validatePasswordAgainstPolicy,
  DEFAULT_SECURITY_POLICY,
} from '../../common/utils/password-policy.util';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { describeAddress, parseUserAgent } from './user-agent.util';
import { LoggerHelper } from '../../common/logger';

/**
 * Refresh tokens are hashed with SHA-256, not bcrypt.
 *
 * bcrypt silently truncates its input at 72 bytes. A JWT is far longer, and its
 * first 72 bytes are the header plus the start of the payload — identical for
 * every token issued to the same user. Under bcrypt, any of a user's refresh
 * tokens therefore matched any of their sessions, which defeats rotation and
 * revocation. SHA-256 covers the whole token; bcrypt's work factor buys nothing
 * here anyway because the token is already high-entropy random.
 */
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_IP_ATTEMPTS_PER_MIN = 10;
const OTP_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  private readonly logger = LoggerHelper.Instance.child(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
    @InjectModel(LoginAttempt.name) private readonly loginAttemptModel: Model<LoginAttemptDocument>,
    @InjectModel(PasswordResetOtp.name) private readonly otpModel: Model<OtpDocument>,
    @InjectModel(PasswordResetToken.name) private readonly tokenModel: Model<PasswordResetTokenDocument>,
    @InjectModel(SecurityPolicy.name) private readonly policyModel: Model<SecurityPolicyDocument>,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  /** Live organization SecurityPolicy, falling back to schema defaults if none has been seeded yet. */
  private async getPolicy() {
    const policy = await this.policyModel.findOne().lean();
    return policy || DEFAULT_SECURITY_POLICY;
  }

  private async assertPasswordMeetsPolicy(password: string) {
    const policy = await this.getPolicy();
    const violations = validatePasswordAgainstPolicy(password, policy as any);
    if (violations.length > 0) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCode.VALIDATION_FAILED,
          message: violations.join('. '),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** Public-safe subset of the SecurityPolicy — no session/lockout internals exposed. */
  async getPasswordPolicySummary() {
    const policy = await this.getPolicy();
    return {
      passwordMinLength: policy.passwordMinLength,
      passwordRequireUppercase: policy.passwordRequireUppercase,
      passwordRequireLowercase: policy.passwordRequireLowercase,
      passwordRequireNumbers: policy.passwordRequireNumbers,
      passwordRequireSymbols: policy.passwordRequireSymbols,
    };
  }

  /**
   * Authentication auditing (checklist §7). Credentials, OTPs and tokens are
   * never passed in — only the outcome and its forensic context.
   */
  private async auditAuth(params: {
    action: AuditAction;
    user?: { _id: string; email: string; organizationId?: string | null; firstName?: string; lastName?: string } | null;
    email?: string;
    description: string;
    status?: AuditStatus;
    metadata?: Record<string, any> | null;
  }) {
    await this.auditService.record({
      action: params.action,
      resourceType: AuditResource.AUTH,
      resourceId: params.user?._id ?? null,
      organizationId: params.user?.organizationId ?? null,
      actorUserId: params.user?._id ?? null,
      actorName: params.user ? `${params.user.firstName ?? ''} ${params.user.lastName ?? ''}`.trim() : '',
      actorEmail: params.user?.email || params.email || '',
      actorType: params.user ? ActorType.USER : ActorType.ANONYMOUS,
      description: params.description,
      status: params.status ?? AuditStatus.SUCCESS,
      metadata: params.metadata ?? null,
    });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const email = forgotPasswordDto.email.trim().toLowerCase();

    // Check if user exists (generic message returned regardless for security)
    const user = await this.userModel.findOne({ email, isDeleted: false });
    if (!user) {
      // Do not reveal email existence
      return {
        message: 'If an account exists with this email, verification instructions have been dispatched.',
      };
    }

    // Invalidate any existing unused OTPs & tokens for this email
    await this.otpModel.updateMany({ email, isUsed: false }, { $set: { isUsed: true } });
    await this.tokenModel.updateMany({ email, usedAt: null }, { $set: { usedAt: new Date() } });

    // 1. Generate random 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRATION_MS);

    await this.otpModel.create({
      email,
      otpHash,
      expiresAt: otpExpiresAt,
      attempts: 0,
      isUsed: false,
    });

    // 2. Generate secure cryptographic reset token for direct link
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const tokenExpiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

    await this.tokenModel.create({
      userId: user._id,
      email,
      tokenHash,
      expiresAt: tokenExpiresAt,
      usedAt: null,
    });

    // Send emails via MailService (configured with SMTP credentials)
    try {
      await this.mailService.sendPasswordResetOtp(email, otp, user.firstName || 'Colleague');
      await this.mailService.sendPasswordResetLink(email, rawToken, user.firstName || 'Colleague');
    } catch (err: any) {
      this.logger.error(null, 'Password reset email dispatch failed', err);
    }

    return {
      message: 'Verification instructions and a secure reset link have been sent to your email address.',
      expiresIn: 600, // 10 minutes in seconds
    };
  }

  async resetPasswordWithOtp(resetPasswordDto: ResetPasswordDto) {
    const email = resetPasswordDto.email.trim().toLowerCase();
    const { otp, newPassword } = resetPasswordDto;

    // Find active valid OTP record
    const otpRecord = await this.otpModel.findOne({
      email,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCode.VALIDATION_FAILED,
          message: 'Invalid or expired verification code. Please request a new code.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check attempts to protect against brute-force guessing
    if (otpRecord.attempts >= 5) {
      await this.otpModel.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          errorCode: ErrorCode.AUTH_RATE_LIMITED,
          message: 'Too many incorrect attempts. Please request a new code.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const isValidOtp = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValidOtp) {
      await this.otpModel.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCode.VALIDATION_FAILED,
          message: 'Invalid verification code. Please check and try again.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Enforce the organization's live password policy before consuming the OTP
    await this.assertPasswordMeetsPolicy(newPassword);

    // Mark OTP as used
    await this.otpModel.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userModel.updateOne(
      { email },
      {
        $set: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: UserStatus.ACTIVE,
        },
      },
    );

    // Revoke all existing sessions for this user for security
    const user = await this.userModel.findOne({ email });
    if (user) {
      await this.sessionModel.updateMany({ userId: user._id }, { $set: { revokedAt: new Date() } });
    }

    await this.auditAuth({
      action: AuditAction.PASSWORD_RESET,
      user,
      email,
      description: `Password reset completed for ${email} via OTP`,
      metadata: { method: 'OTP' },
    });

    return {
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }

  async validateResetToken(token: string) {
    if (!token || typeof token !== 'string' || token.trim().length < 16) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCode.VALIDATION_FAILED,
          message: 'This password reset link is invalid or malformed.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Find non-expired, unused token record
    const records = await this.tokenModel.find({
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    for (const record of records) {
      const isMatch = await bcrypt.compare(token, record.tokenHash);
      if (isMatch) {
        return {
          valid: true,
          email: record.email,
        };
      }
    }

    // Check if token was already used
    const usedRecords = await this.tokenModel.find({
      usedAt: { $ne: null },
    });
    for (const record of usedRecords) {
      const isMatch = await bcrypt.compare(token, record.tokenHash);
      if (isMatch) {
        throw new HttpException(
          {
            statusCode: HttpStatus.GONE, // 410
            errorCode: ErrorCode.AUTH_UNAUTHORIZED,
            message: 'This password reset link has already been used.',
          },
          HttpStatus.GONE,
        );
      }
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: ErrorCode.VALIDATION_FAILED,
        message: 'This password reset link is invalid or has expired.',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  async resetPasswordWithToken(dto: { token: string; password: string }) {
    const { token, password } = dto;
    const validation = await this.validateResetToken(token);

    // Enforce the organization's live password policy before consuming the token
    await this.assertPasswordMeetsPolicy(password);

    // Hash new password using 12 rounds of bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    await this.userModel.updateOne(
      { email: validation.email },
      {
        $set: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: UserStatus.ACTIVE,
        },
      },
    );

    // Mark token as used
    const records = await this.tokenModel.find({
      email: validation.email,
      usedAt: null,
    });
    for (const record of records) {
      const isMatch = await bcrypt.compare(token, record.tokenHash);
      if (isMatch) {
        await this.tokenModel.updateOne({ _id: record._id }, { $set: { usedAt: new Date() } });
      }
    }

    // Invalidate all existing sessions and refresh tokens for security
    const user = await this.userModel.findOne({ email: validation.email });
    if (user) {
      await this.sessionModel.updateMany({ userId: user._id }, { $set: { revokedAt: new Date() } });
      this.logger.info(null, 'Sessions revoked after password reset', { userId: user._id });
    }

    await this.auditAuth({
      action: AuditAction.PASSWORD_RESET,
      user,
      email: validation.email,
      description: `Password reset completed for ${validation.email} via email link`,
      metadata: { method: 'RESET_LINK' },
    });

    return {
      message: 'Password reset successfully. You can now sign in with your new password.',
    };
  }

  async changePassword(userId: string, changePasswordDto: { currentPassword: string; newPassword: string }) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userModel.findOne({ _id: userId, isDeleted: false }).select('+passwordHash');
    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCode.VALIDATION_FAILED,
          message: 'The current password you entered is incorrect.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (currentPassword === newPassword) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCode.VALIDATION_FAILED,
          message: 'New password must be different from your current password.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.assertPasswordMeetsPolicy(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: UserStatus.ACTIVE,
        },
      },
    );

    this.logger.info(null, 'Password changed', { userId });
    await this.auditAuth({
      action: AuditAction.PASSWORD_CHANGED,
      user,
      description: `${user.email} changed their password`,
    });

    return {
      message: 'Password changed successfully. Your account is secured with your new password.',
    };
  }

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string) {
    const email = loginDto.email.trim().toLowerCase();
    const policy = await this.getPolicy();
    const maxFailedAttempts = policy.maxFailedAttempts;
    const lockoutDurationMs = policy.lockoutDurationMinutes * 60 * 1000;

    // 1. IP-based brute force rate limiting
    const recentIpAttempts = await this.loginAttemptModel.countDocuments({
      ipAddress,
      createdAt: { $gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    });

    if (recentIpAttempts >= MAX_IP_ATTEMPTS_PER_MIN) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          errorCode: ErrorCode.AUTH_RATE_LIMITED,
          message: 'Too many login attempts. Please try again in a few moments.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Find user including passwordHash
    const user = await this.userModel
      .findOne({ email, isDeleted: false })
      .select('+passwordHash');

    if (!user) {
      await this.recordAttempt(email, null, ipAddress, userAgent, false, 'USER_NOT_FOUND');
      await this.auditAuth({
        action: AuditAction.LOGIN_FAILED,
        email,
        description: `Sign-in attempted for unknown account ${email}`,
        status: AuditStatus.FAILURE,
        metadata: { reason: 'USER_NOT_FOUND' },
      });
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      });
    }

    // 3. Check Account Lockout status
    if (user.status === UserStatus.LOCKED || (user.lockedUntil && user.lockedUntil > new Date())) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000),
      );
      await this.recordAttempt(email, user._id, ipAddress, userAgent, false, 'ACCOUNT_LOCKED');
      await this.auditAuth({
        action: AuditAction.LOGIN_FAILED,
        user,
        description: `Sign-in blocked — account ${email} is locked`,
        status: AuditStatus.FAILURE,
        metadata: { reason: 'ACCOUNT_LOCKED', lockedUntil: user.lockedUntil },
      });
      throw new HttpException(
        {
          statusCode: 423,
          errorCode: ErrorCode.AUTH_ACCOUNT_LOCKED,
          message: `Account is locked due to ${maxFailedAttempts} failed attempts. Please wait ${remainingMinutes} minute(s) or contact administrator.`,
        },
        423,
      );
    }

    // 4. Check Account Active status
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
      await this.recordAttempt(email, user._id, ipAddress, userAgent, false, 'ACCOUNT_INACTIVE');
      await this.auditAuth({
        action: AuditAction.LOGIN_FAILED,
        user,
        description: `Sign-in blocked — account ${email} is ${user.status.toLowerCase()}`,
        status: AuditStatus.FAILURE,
        metadata: { reason: 'ACCOUNT_INACTIVE', accountStatus: user.status },
      });
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        errorCode: ErrorCode.AUTH_ACCOUNT_INACTIVE,
        message: 'Your account is currently inactive. Please contact HR.',
      });
    }

    // 5. Verify Password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      let lockedUntil: Date | null = null;
      let newStatus: UserStatus = user.status;

      if (failedAttempts >= maxFailedAttempts) {
        lockedUntil = new Date(Date.now() + lockoutDurationMs);
        newStatus = UserStatus.LOCKED;
        this.logger.warn(null, 'Account locked after repeated failed sign-ins', {
          userId: user._id,
          failedAttempts,
          lockedUntil: lockedUntil.toISOString(),
        });
      }

      await this.userModel.updateOne(
        { _id: user._id },
        {
          $set: {
            failedLoginAttempts: failedAttempts,
            lockedUntil,
            status: newStatus,
          },
        },
      );

      await this.recordAttempt(email, user._id, ipAddress, userAgent, false, 'INVALID_PASSWORD');

      await this.auditAuth({
        action: AuditAction.LOGIN_FAILED,
        user,
        description: `Failed sign-in attempt for ${email}`,
        status: AuditStatus.FAILURE,
        metadata: { reason: 'INVALID_PASSWORD', failedAttempts },
      });

      if (newStatus === UserStatus.LOCKED) {
        await this.auditAuth({
          action: AuditAction.ACCOUNT_LOCKED,
          user,
          description: `Account ${email} locked after ${failedAttempts} failed attempts`,
          status: AuditStatus.FAILURE,
          metadata: { failedAttempts, lockedUntil },
        });
        this.mailService
          .sendAccountLockedNotification(user.email, user.firstName || 'User')
          .catch((err) => this.logger.warn(null, 'Lockout notification dispatch failed', err));

        throw new HttpException(
          {
            statusCode: 423,
            errorCode: ErrorCode.AUTH_ACCOUNT_LOCKED,
            message: `Account locked due to ${maxFailedAttempts} failed attempts. Please try again after ${policy.lockoutDurationMinutes} minutes.`,
          },
          423,
        );
      }

      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      });
    }

    // 6. Successful verification: Reset failed attempts & update last login
    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: UserStatus.ACTIVE,
          lastLoginAt: new Date(),
        },
      },
    );

    // 7. Issue tokens & session record
    const session = await this.issueSession(user, ipAddress, userAgent, loginDto.rememberMe);

    await this.recordAttempt(email, user._id, ipAddress, userAgent, true);
    await this.auditAuth({
      action: AuditAction.LOGIN,
      user,
      description: `${email} signed in`,
      metadata: { rememberMe: !!loginDto.rememberMe },
    });

    return session;
  }

  /**
   * Issues a fresh JWT access token + refresh token, and persists the Session record.
   * Shared by password login and the invitation-acceptance "seamless first sign-in" flow.
   */
  async issueSession(
    user: UserDocument,
    ipAddress: string,
    userAgent: string,
    rememberMe = false,
    /**
     * The sign-in this belongs to. Absent on a fresh login, supplied on a
     * refresh so the device keeps one identity across token rotation.
     */
    continuing?: { familyId: string; startedAt: Date },
  ) {
    const policy = await this.getPolicy();
    const sessionMinutes = policy.sessionTimeoutMinutes;

    const familyId = continuing?.familyId || randomUUID();
    const startedAt = continuing?.startedAt || new Date();

    const payload = {
      sub: user._id,
      // The session family, so an authenticated request can say which device
      // it came from without the refresh token being present.
      sid: familyId,
      email: user.email,
      roles: user.roles,
      organizationId: user.organizationId || null,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: `${sessionMinutes}m`,
    });

    // `jti` makes every refresh token unique. Without it, two tokens signed in
    // the same second for the same user are byte-identical, which would defeat
    // rotation-based replay detection entirely.
    const refreshToken = this.jwtService.sign(
      { sub: user._id, type: 'refresh', jti: randomUUID() },
      { expiresIn: rememberMe ? '30d' : '7d' },
    );

    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);

    const device = parseUserAgent(userAgent);

    await this.sessionModel.create({
      userId: user._id,
      familyId,
      startedAt,
      lastUsedAt: new Date(),
      refreshTokenHash,
      ipAddress,
      userAgent,
      deviceLabel: device.label,
      deviceType: device.deviceType,
      expiresAt,
      rememberMe,
    });

    let avatarUrl = user.avatarUrl || null;
    if (!avatarUrl) {
      try {
        const linkedEmp = await this.employeeModel
          .findOne({ $or: [{ userId: user._id }, { workEmail: user.email }] })
          .select('avatarUrl')
          .lean();
        if (linkedEmp?.avatarUrl) {
          avatarUrl = linkedEmp.avatarUrl;
          await this.userModel.updateOne({ _id: user._id }, { $set: { avatarUrl } }).catch(() => {});
        }
      } catch {
        // Fallback gracefully
      }
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        permissions: user.permissions || [],
        organizationId: user.organizationId || null,
        avatarUrl: avatarUrl || null,
      },
      accessToken,
      refreshToken,
      expiresIn: sessionMinutes * 60,
      /** Cookie lifetime for the rotated refresh token, in ms. */
      refreshExpiresInMs: expiresAt.getTime() - Date.now(),
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Exact digest match identifies the caller's own session precisely.
      const session = await this.sessionModel.findOne({
        userId,
        refreshTokenHash: hashRefreshToken(refreshToken),
        revokedAt: null,
      });

      if (session) {
        await this.sessionModel.updateOne({ _id: session._id }, { $set: { revokedAt: new Date() } });
        this.logger.info(null, 'Session revoked', { userId, sessionId: session._id });
        await this.auditLogout(userId, session._id);
        return { message: 'Logged out successfully' };
      }
    }

    // Fallback: revoke most recent active session for this user
    const latestSession = await this.sessionModel
      .findOne({ userId, revokedAt: null })
      .sort({ createdAt: -1 });

    if (latestSession) {
      await this.sessionModel.updateOne(
        { _id: latestSession._id },
        { $set: { revokedAt: new Date() } },
      );
    }

    this.logger.info(null, 'User logged out', { userId });
    await this.auditLogout(userId, latestSession?._id ?? null);
    return { message: 'Logged out successfully' };
  }

  /**
   * Exchanges a valid refresh token for a fresh access token.
   *
   * Uses refresh-token rotation: the presented session is revoked and a new one
   * issued, so a stolen token is single-use and replay is detectable by the
   * victim's next refresh failing.
   */
  async refreshSession(refreshToken: string, ipAddress: string, userAgent: string) {
    if (!refreshToken) {
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: ErrorCode.AUTH_SESSION_EXPIRED,
        message: 'No refresh token supplied. Please sign in again.',
      });
    }

    let payload: { sub: string; type?: string };
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: ErrorCode.AUTH_SESSION_EXPIRED,
        message: 'Your session has expired. Please sign in again.',
      });
    }

    if (payload.type !== 'refresh') {
      // An access token must never be accepted here.
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: ErrorCode.AUTH_TOKEN_INVALID,
        message: 'Invalid refresh token.',
      });
    }

    // Exact indexed lookup on the digest — no scan, and it actually identifies
    // the one session this token belongs to.
    const matched = await this.sessionModel.findOne({
      userId: payload.sub,
      refreshTokenHash: hashRefreshToken(refreshToken),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!matched) {
      // Valid signature but no live session: already rotated, revoked, or replayed.
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: ErrorCode.AUTH_SESSION_EXPIRED,
        message: 'This session is no longer active. Please sign in again.',
      });
    }

    const user = await this.userModel.findOne({ _id: payload.sub, isDeleted: false });
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.sessionModel.updateOne({ _id: matched._id }, { $set: { revokedAt: new Date() } });
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        errorCode: ErrorCode.AUTH_ACCOUNT_INACTIVE,
        message: 'This account is no longer active.',
      });
    }

    // Rotate: retire the presented session before minting its replacement.
    await this.sessionModel.updateOne(
      { _id: matched._id },
      { $set: { revokedAt: new Date(), revokedReason: 'ROTATED' } },
    );

    /*
     * The replacement inherits the family and the original sign-in time.
     *
     * Without this the sessions list would show a device that signed in a week
     * ago as having appeared four minutes ago, which is exactly the kind of
     * thing that makes somebody think they have been broken into.
     */
    return this.issueSession(user, ipAddress, userAgent, matched.rememberMe ?? false, {
      familyId: matched.familyId || randomUUID(),
      startedAt: matched.startedAt || (matched as any).createdAt || new Date(),
    });
  }

  /** Shared logout audit — resolves the actor so the record stays readable. */
  private async auditLogout(userId: string, sessionId: string | null) {
    const user = await this.userModel.findById(userId).lean();
    await this.auditService.record({
      action: AuditAction.LOGOUT,
      resourceType: AuditResource.SESSION,
      resourceId: sessionId,
      organizationId: user?.organizationId ?? null,
      actorUserId: userId,
      actorEmail: user?.email || '',
      description: user ? `${user.email} signed out` : 'Session ended',
      sessionId,
    });
  }

  /**
   * Every device currently signed in as this user.
   *
   * Live records only — one per device, because rotation carries the family
   * forward rather than accumulating rows. Nothing that could authenticate is
   * returned: the refresh token digest stays on the server, so this screen can
   * be opened anywhere without widening the account's attack surface.
   */
  async listSessions(userId: string, currentFamilyId?: string) {
    const sessions = await this.sessionModel
      .find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ lastUsedAt: -1 })
      .lean();

    return sessions.map((session: any) => {
      const device = parseUserAgent(session.userAgent);

      return {
        // The family, not the document id: the document is replaced on every
        // refresh, so its id would be stale by the time somebody clicked it.
        id: session.familyId || String(session._id),
        deviceLabel: session.deviceLabel || device.label,
        deviceType: session.deviceType || device.deviceType,
        browser: device.browser,
        os: device.os,
        location: describeAddress(session.ipAddress),
        ipAddress: session.ipAddress || '',
        signedInAt: session.startedAt || session.createdAt || null,
        lastUsedAt: session.lastUsedAt || session.createdAt || null,
        expiresAt: session.expiresAt,
        rememberMe: Boolean(session.rememberMe),
        /** The device reading this list. It cannot be ended from here. */
        isCurrent: Boolean(currentFamilyId) && session.familyId === currentFamilyId,
      };
    });
  }

  /**
   * Ends one device's session.
   *
   * The current device is deliberately refused: "sign out everything except
   * this" is a different button from "sign out", and a person who ends their
   * own session from a list of devices has almost always misread the row.
   */
  async revokeSession(userId: string, familyId: string, currentFamilyId?: string) {
    if (currentFamilyId && familyId === currentFamilyId) {
      throw new BadRequestException(
        'That is the device you are using. Use sign out if you meant to end this session.',
      );
    }

    const result = await this.sessionModel.updateMany(
      { userId, familyId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: 'REVOKED_BY_USER' } },
    );

    if (result.modifiedCount === 0) {
      throw new NotFoundException('That session has already ended.');
    }

    const user = await this.userModel.findById(userId).lean();
    await this.auditService.record({
      action: AuditAction.SESSION_REVOKED,
      resourceType: AuditResource.SESSION,
      resourceId: familyId,
      organizationId: user?.organizationId ?? null,
      actorUserId: userId,
      actorEmail: user?.email || '',
      description: 'Signed a device out from the active sessions list',
    });

    this.logger.info(null, 'Session revoked by its owner', { userId, familyId });

    return { revoked: result.modifiedCount };
  }

  /** Ends every other device, leaving the one asking signed in. */
  async revokeOtherSessions(userId: string, currentFamilyId?: string) {
    const filter: Record<string, unknown> = { userId, revokedAt: null };
    if (currentFamilyId) filter.familyId = { $ne: currentFamilyId };

    const result = await this.sessionModel.updateMany(filter, {
      $set: { revokedAt: new Date(), revokedReason: 'REVOKED_BY_USER' },
    });

    const user = await this.userModel.findById(userId).lean();
    await this.auditService.record({
      action: AuditAction.SESSION_REVOKED,
      resourceType: AuditResource.SESSION,
      resourceId: userId,
      organizationId: user?.organizationId ?? null,
      actorUserId: userId,
      actorEmail: user?.email || '',
      description: `Signed out ${result.modifiedCount} other device(s)`,
    });

    this.logger.info(null, 'Other sessions revoked', {
      userId,
      revokedCount: result.modifiedCount,
    });

    return { revoked: result.modifiedCount };
  }

  async logoutAll(userId: string) {
    const result = await this.sessionModel.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT' } },
    );

    this.logger.info(null, 'All sessions revoked', { userId, revokedCount: result.modifiedCount });

    const user = await this.userModel.findById(userId).lean();
    await this.auditService.record({
      action: AuditAction.SESSION_REVOKED,
      resourceType: AuditResource.SESSION,
      resourceId: userId,
      organizationId: user?.organizationId ?? null,
      actorUserId: userId,
      actorEmail: user?.email || '',
      description: `Revoked ${result.modifiedCount} active session(s)`,
      metadata: { revokedCount: result.modifiedCount },
    });

    return { message: `All active sessions (${result.modifiedCount}) have been terminated.` };
  }

  async getCurrentUser(userId: string) {
    const user = await this.userModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new UnauthorizedException('User account not found');
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'AUTH_ACCOUNT_INACTIVE',
        message: 'This account is no longer active.',
      });
    }

    let avatarUrl = user.avatarUrl || null;
    let linkedEmployeeId: string | null = null;
    try {
      const cleanEmail = (user.email || '').toLowerCase().trim();
      const linkedEmp =
        (await this.employeeModel
          .findOne({ userId: user._id, isDeleted: false })
          .select('_id avatarUrl')
          .lean()) ||
        (cleanEmail
          ? await this.employeeModel
              .findOne({
                $or: [{ workEmail: cleanEmail }, { personalEmail: cleanEmail }],
                isDeleted: false,
              })
              .select('_id avatarUrl')
              .lean()
          : null);
      if (linkedEmp) {
        linkedEmployeeId = String((linkedEmp as any)._id);
        if (!avatarUrl && (linkedEmp as any).avatarUrl) {
          avatarUrl = (linkedEmp as any).avatarUrl;
        }
      }
    } catch {
      // Non-blocking enrichment
    }

    return {
      id: user._id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      permissions: user.permissions || [],
      organizationId: user.organizationId || null,
      avatarUrl: avatarUrl || null,
      linkedEmployeeId,
    };
  }

  private async recordAttempt(
    email: string,
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string,
  ) {
    try {
      await this.loginAttemptModel.create({
        email,
        userId: userId || undefined,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        success,
        failureReason,
      });
    } catch (err) {
      this.logger.error(null, 'Failed to log login attempt', err);
    }
  }
}
