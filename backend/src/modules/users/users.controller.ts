import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService, PaginatedUsersResponse } from './users.service';
import { InvitationsService, PaginatedInvitationsResponse } from './invitations.service';
import {
  UpdateUserStatusDto,
  AssignRolesDto,
  CreateRoleDto,
  UpdateRoleDto,
  UpdateSecurityPolicyDto,
} from './dto/users.dto';
import { CreateInvitationDto } from './dto/invitation.dto';
import { Role } from './schemas/role.schema';
import { Invitation } from './schemas/invitation.schema';
import { SecurityPolicy } from './schemas/security-policy.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';

@ApiTags('User & Security Management')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly invitationsService: InvitationsService,
  ) {}

  private actor(req: any): { id: string; name: string; orgId?: string | null } {
    return {
      id: req.user?.userId,
      name: req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email : 'SYSTEM',
      orgId: req.user?.organizationId,
    };
  }

  // --- CURRENT AUTHENTICATED USER PROFILE & AVATAR ---

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and linked employee metadata' })
  async getMyProfile(@Request() req: any) {
    const userId = req.user.userId;
    const data = await this.usersService.getMyProfile(userId);
    return { success: true, data };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user personal profile details' })
  async updateMyProfile(
    @Request() req: any,
    @Body() dto: { firstName?: string; lastName?: string; phone?: string; location?: string; bio?: string },
  ) {
    const userId = req.user.userId;
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload and update profile picture for current user' })
  async uploadMyAvatar(
    @Request() req: any,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No image file was uploaded.');
    }
    const userId = req.user.userId;
    const data = await this.usersService.uploadAvatar(userId, file);
    return {
      success: true,
      message: 'Profile picture uploaded successfully',
      data,
    };
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Remove current user profile picture' })
  async removeMyAvatar(@Request() req: any) {
    const userId = req.user.userId;
    return this.usersService.removeAvatar(userId);
  }

  // --- USER ROSTER ENDPOINTS ---

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'List all system users with linked employee metadata' })
  async findAllUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<PaginatedUsersResponse> {
    return this.usersService.findAllUsers({ search, role, status, page, pageSize });
  }

  @Get('metrics')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Get roster top-line metrics (active, pending, suspended, locked counts)' })
  async getMetrics() {
    return this.usersService.getMetrics();
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'Update user account status (ACTIVE, SUSPENDED, INACTIVE)' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Request() req: any,
  ): Promise<{ message: string }> {
    return this.usersService.updateUserStatus(id, dto, this.actor(req).id);
  }

  @Post(':id/unlock')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock a locked user account and reset failed login attempts' })
  async unlockUser(@Param('id') id: string, @Request() req: any): Promise<{ message: string }> {
    return this.usersService.unlockUser(id, this.actor(req).id);
  }

  @Patch(':id/roles')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'Assign roles to a user account' })
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
    @Request() req: any,
  ): Promise<{ message: string; roles: string[] }> {
    return this.usersService.assignRoles(id, dto, this.actor(req).id);
  }

  @Post(':id/reset-password')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email to user' })
  async sendPasswordReset(@Param('id') id: string, @Request() req: any): Promise<{ message: string }> {
    return this.usersService.sendPasswordReset(id, this.actor(req).id);
  }

  @Post(':id/terminate-sessions')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate all active sessions/devices for a user' })
  async terminateSessions(@Param('id') id: string, @Request() req: any): Promise<{ message: string }> {
    return this.usersService.terminateSessions(id, this.actor(req).id);
  }

  // --- INVITATION ENGINE ENDPOINTS ---

  @Get('invitations')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'List pending/expired/revoked administrative user invitations' })
  async listInvitations(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<PaginatedInvitationsResponse> {
    return this.invitationsService.listInvitations({ status, search, page, pageSize });
  }

  @Post('invitations')
  @RequirePermissions(PERMISSIONS.USERS_INVITE)
  @ApiOperation({ summary: 'Invite a new administrative user (Admin, HR, or Manager)' })
  async createInvitation(@Body() dto: CreateInvitationDto, @Request() req: any): Promise<Invitation> {
    const actor = this.actor(req);
    return this.invitationsService.createInvitation(dto, actor.id, actor.name, actor.orgId);
  }

  @Post('invitations/:id/resend')
  @RequirePermissions(PERMISSIONS.USERS_INVITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend an invitation email with a fresh token and expiry' })
  async resendInvitation(@Param('id') id: string, @Request() req: any): Promise<{ message: string }> {
    const actor = this.actor(req);
    return this.invitationsService.resendInvitation(id, actor.id, actor.name);
  }

  @Delete('invitations/:id')
  @RequirePermissions(PERMISSIONS.USERS_INVITE)
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  async revokeInvitation(@Param('id') id: string, @Request() req: any): Promise<{ message: string }> {
    return this.invitationsService.revokeInvitation(id, this.actor(req).id);
  }

  // --- ROLES & PERMISSIONS ENDPOINTS ---

  @Get('roles')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'List all system and custom roles with user counts' })
  async getRoles(): Promise<any[]> {
    return this.usersService.getRoles();
  }

  @Get('roles/:id')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Get role details and permission matrix' })
  async getRoleById(@Param('id') id: string): Promise<any> {
    return this.usersService.getRoleById(id);
  }

  @Post('roles')
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  @ApiOperation({ summary: 'Create custom role with granular permissions' })
  async createRole(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.usersService.createRole(dto);
  }

  @Patch('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  @ApiOperation({ summary: 'Update role metadata or permissions' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<Role> {
    return this.usersService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  @ApiOperation({ summary: 'Delete custom role if no users are assigned' })
  async deleteRole(@Param('id') id: string): Promise<{ message: string }> {
    return this.usersService.deleteRole(id);
  }

  // --- SECURITY POLICY ENDPOINTS ---

  @Get('security-policy')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Get organization password, session, and lockout security policy' })
  async getSecurityPolicy(): Promise<SecurityPolicy> {
    return this.usersService.getSecurityPolicy();
  }

  @Put('security-policy')
  @RequirePermissions(PERMISSIONS.SECURITY_POLICY_MANAGE)
  @ApiOperation({ summary: 'Update organization security policy' })
  async updateSecurityPolicy(
    @Body() dto: UpdateSecurityPolicyDto,
    @Request() req: any,
  ): Promise<SecurityPolicy> {
    return this.usersService.updateSecurityPolicy(dto, this.actor(req).id);
  }
}
