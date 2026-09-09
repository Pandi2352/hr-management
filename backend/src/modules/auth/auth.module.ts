import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, UserSchema } from '../users/schemas/user.schema';
import { SecurityPolicy, SecurityPolicySchema } from '../users/schemas/security-policy.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { LoginAttempt, LoginAttemptSchema } from './schemas/login-attempt.schema';
import { PasswordResetOtp, PasswordResetOtpSchema } from './schemas/password-reset-otp.schema';
import { PasswordResetToken, PasswordResetTokenSchema } from './schemas/password-reset-token.schema';
import { MailModule } from '../mail/mail.module';

import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET', 'peopleos_default_secret_32_chars_long'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: SecurityPolicy.name, schema: SecurityPolicySchema },
      { name: Session.name, schema: SessionSchema },
      { name: LoginAttempt.name, schema: LoginAttemptSchema },
      { name: PasswordResetOtp.name, schema: PasswordResetOtpSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
    ]),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
