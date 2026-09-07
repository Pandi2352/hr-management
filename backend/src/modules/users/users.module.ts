import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { UserAvatarsController } from './avatars.controller';
import { User, UserSchema } from './schemas/user.schema';
import { Role, RoleSchema } from './schemas/role.schema';
import { SecurityPolicy, SecurityPolicySchema } from './schemas/security-policy.schema';
import { Invitation, InvitationSchema } from './schemas/invitation.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Organization, OrganizationSchema } from '../organization/schemas/organization.schema';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: SecurityPolicy.name, schema: SecurityPolicySchema },
      { name: Invitation.name, schema: InvitationSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    MailModule,
    AuthModule,
  ],
  controllers: [UsersController, InvitationsController, UserAvatarsController],
  providers: [UsersService, InvitationsService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
