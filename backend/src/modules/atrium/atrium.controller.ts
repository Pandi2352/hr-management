import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { basename } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Public } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';
import { ResultEntity } from '../../common/response';
import { OrganizationService } from '../organization/organization.service';
import { AtriumProfileService } from './atrium-profile.service';
import { AtriumFollowService } from './atrium-follow.service';
import {
  AtriumDirectoryQueryDto,
  FollowListQueryDto,
  UpdateAtriumProfileDto,
} from './dto/atrium.dto';
import { ATRIUM_ACCENTS } from './atrium.constants';

/**
 * Atrium — the organization's social layer.
 *
 * Every route requires `atrium:participate`, which every employee has and which
 * is deliberately *not* `employee:read`. Keeping them separate means widening
 * Atrium can never accidentally widen the HR directory, and the department
 * scoping that constrains HR reads stays exactly as it was.
 */
@ApiTags('Atrium')
@Controller('atrium')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AtriumController {
  constructor(
    private readonly profileService: AtriumProfileService,
    private readonly followService: AtriumFollowService,
    private readonly orgService: OrganizationService,
  ) {}

  private async getOrgId(req: any): Promise<string> {
    if (req.user?.organizationId) return req.user.organizationId;
    const defaultOrg = await this.orgService.getProfile();
    return defaultOrg._id;
  }

  // --- Directory & profiles -------------------------------------------------

  @Get('directory')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @ApiOperation({ summary: 'Browse every colleague in the organization' })
  async directory(@Request() req: any, @Query() query: AtriumDirectoryQueryDto) {
    const orgId = await this.getOrgId(req);
    const result = await this.profileService.getDirectory(orgId, req.user, query);
    return ResultEntity.ok(result.data, undefined, result.meta);
  }

  @Get('facets')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @ApiOperation({ summary: 'Departments with people, plus the accent palette' })
  async facets(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    const departments = await this.profileService.getDepartmentFacets(orgId);
    return ResultEntity.ok({ departments, accents: ATRIUM_ACCENTS });
  }

  @Get('me')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @ApiOperation({ summary: 'My own Atrium profile' })
  async myProfile(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    return ResultEntity.ok(await this.profileService.getMyProfile(orgId, req.user));
  }

  @Patch('me')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @ApiOperation({ summary: 'Update my bio, interests and preferences' })
  async updateMyProfile(@Request() req: any, @Body() dto: UpdateAtriumProfileDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.profileService.updateMyProfile(orgId, req.user, dto);
    return ResultEntity.ok(data, 'Your profile is updated');
  }

  // --- Portrait, cover and mood --------------------------------------------

  @Post('me/photo')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload my Atrium portrait' })
  async uploadPhoto(@Request() req: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No image file was uploaded.');
    const orgId = await this.getOrgId(req);
    const data = await this.profileService.uploadImage(orgId, req.user, 'photo', file);
    return ResultEntity.ok(data, 'Your photo is updated');
  }

  @Delete('me/photo')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @ApiOperation({ summary: 'Remove my Atrium portrait' })
  async removePhoto(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    const data = await this.profileService.removeImage(orgId, req.user, 'photo');
    return ResultEntity.ok(data, 'Your photo is removed');
  }

  @Post('me/cover')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload my Atrium cover' })
  async uploadCover(@Request() req: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No image file was uploaded.');
    const orgId = await this.getOrgId(req);
    const data = await this.profileService.uploadImage(orgId, req.user, 'cover', file);
    return ResultEntity.ok(data, 'Your cover is updated');
  }

  @Delete('me/cover')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @ApiOperation({ summary: 'Remove my Atrium cover' })
  async removeCover(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    const data = await this.profileService.removeImage(orgId, req.user, 'cover');
    return ResultEntity.ok(data, 'Your cover is removed');
  }

  /**
   * Serves an uploaded image.
   *
   * Public because an <img> tag carries no Authorization header, matching how
   * user avatars are already served. Filenames embed a random UUID, so a URL
   * cannot be guessed from an employee id alone.
   */
  @Get('media/:filename')
  @Public()
  @ApiOperation({ summary: 'Serve an uploaded Atrium image' })
  async media(@Param('filename') filename: string, @Res() res: any) {
    return res.sendFile(this.profileService.resolveMediaPath(basename(filename)));
  }

  @Get('suggestions')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @ApiOperation({ summary: 'Colleagues worth following' })
  async suggestions(@Request() req: any, @Query('limit') limit?: number) {
    const orgId = await this.getOrgId(req);
    const data = await this.followService.getSuggestions(
      orgId,
      req.user,
      Math.min(24, Number(limit) || 8),
    );
    return ResultEntity.ok(data);
  }

  // --- Follow graph ---------------------------------------------------------

  @Post('follow/:employeeId')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @ApiOperation({ summary: 'Follow a colleague' })
  async follow(@Request() req: any, @Param('employeeId') employeeId: string) {
    const orgId = await this.getOrgId(req);
    const result = await this.followService.follow(orgId, req.user, employeeId);
    return ResultEntity.ok(result, result.alreadyInState ? 'Already following' : 'Following');
  }

  @Delete('follow/:employeeId')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @ApiOperation({ summary: 'Unfollow a colleague' })
  async unfollow(@Request() req: any, @Param('employeeId') employeeId: string) {
    const orgId = await this.getOrgId(req);
    const result = await this.followService.unfollow(orgId, req.user, employeeId);
    return ResultEntity.ok(result, result.alreadyInState ? 'Not following' : 'Unfollowed');
  }

  @Get('profiles/:employeeId/followers')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @ApiOperation({ summary: 'Who follows this colleague' })
  async followers(
    @Request() req: any,
    @Param('employeeId') employeeId: string,
    @Query() query: FollowListQueryDto,
  ) {
    const orgId = await this.getOrgId(req);
    const result = await this.followService.getFollowers(orgId, req.user, employeeId, query);
    return ResultEntity.ok(result.data, undefined, result.meta);
  }

  @Get('profiles/:employeeId/following')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @ApiOperation({ summary: 'Who this colleague follows' })
  async following(
    @Request() req: any,
    @Param('employeeId') employeeId: string,
    @Query() query: FollowListQueryDto,
  ) {
    const orgId = await this.getOrgId(req);
    const result = await this.followService.getFollowing(orgId, req.user, employeeId, query);
    return ResultEntity.ok(result.data, undefined, result.meta);
  }

  /**
   * Declared after the two `/profiles/:id/...` routes on purpose — Express
   * matches in order, and a bare `:employeeId` first would swallow both.
   */
  @Get('profiles/:employeeId')
  @RequirePermissions(PERMISSIONS.ATRIUM_PARTICIPATE)
  @ApiOperation({ summary: 'One colleague’s profile' })
  async profile(@Request() req: any, @Param('employeeId') employeeId: string) {
    const orgId = await this.getOrgId(req);
    return ResultEntity.ok(await this.profileService.getProfile(orgId, req.user, employeeId));
  }

  // --- Maintenance ----------------------------------------------------------

  @Post('reconcile-counters')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'Recompute follower counters from the edges (admin)' })
  async reconcile(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    const result = await this.followService.reconcileCounters(orgId);
    return ResultEntity.ok(
      result,
      `Checked ${result.checked} profiles, corrected ${result.corrected}.`,
    );
  }
}
