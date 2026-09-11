import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { UserStatus } from '../../../common/constants';
import { requestContext } from '../../../common/audit/request-context';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  organizationId: string | null;
  /**
   * The session family this token was issued to.
   *
   * Lets a request say which device it came from without the refresh token
   * being present, which is what the active-sessions list needs to mark the row
   * you are reading it on. Absent on tokens issued before this existed.
   */
  sid?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_ACCESS_SECRET',
        'peopleos_default_secret_32_chars_long',
      ),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userModel.findOne({ _id: payload.sub, isDeleted: false });
    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is locked or inactive');
    }

    // Make the actor available to AuditService further down the call stack.
    requestContext.patch({
      actorUserId: user._id,
      actorEmail: user.email,
      organizationId: user.organizationId,
    });

    return {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      permissions: user.permissions,
      departmentScope: user.departmentScope || [],
      organizationId: user.organizationId,
      // Passed through so the sessions list can tell this device from the rest.
      sid: payload.sid,
    };
  }
}
