import { Controller, Post, Body, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { InvitationsService } from './invitations.service';
import { InvitationTokenDto, AcceptInvitationDto } from './dto/invitation.dto';
import { ResultEntity } from '../../common/response';

@ApiTags('Invitations (Public)')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate an invitation token without accepting it' })
  async validate(@Body() dto: InvitationTokenDto) {
    const result = await this.invitationsService.validateToken(dto.token);
    return ResultEntity.ok(result, 'Invitation is valid');
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation, set a password, and activate the account' })
  async accept(
    @Body() dto: AcceptInvitationDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const result = await this.invitationsService.acceptInvitation(dto, ipAddress, userAgent);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    return ResultEntity.ok(
        {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        },
        'Invitation accepted. Your account is now active.',
      );
  }
}
