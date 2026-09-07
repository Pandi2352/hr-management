import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { UsersService } from './users.service';
import { createReadStream } from 'fs';
import { extname } from 'path';

@ApiTags('Avatars (Public)')
@Controller('users/avatar')
export class UserAvatarsController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':filename')
  @ApiOperation({ summary: 'Publicly serve user avatar image with caching headers' })
  serveAvatar(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const filePath = this.usersService.getAvatarFilePath(filename);
      const ext = extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };
      const contentType = mimeTypes[ext] || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
      createReadStream(filePath).pipe(res);
    } catch {
      throw new NotFoundException('Avatar not found');
    }
  }
}
