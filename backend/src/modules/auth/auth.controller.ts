import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ResultEntity } from '../../common/response';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('password-policy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the public password-complexity subset of the organization security policy' })
  async getPasswordPolicy() {
    const data = await this.authService.getPasswordPolicySummary();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      status: 'OK',
      message: 'Password policy retrieved',
      data,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user with fresh roles and linked employee' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getMe(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    const data = await this.authService.getCurrentUser(userId);
    return ResultEntity.ok(data, 'Current user retrieved');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange the refresh cookie for a new access token (rotates the session)' })
  @ApiResponse({ status: 200, description: 'New access token issued' })
  @ApiResponse({ status: 401, description: 'Refresh token missing, expired, or already rotated' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const result = await this.authService.refreshSession(refreshToken, ipAddress, userAgent);

    // Rotation issues a new refresh token; replace the cookie with it.
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: result.refreshExpiresInMs,
      path: '/api/v1/auth',
    });

    return ResultEntity.ok(
        {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        },
        'Session refreshed',
      );
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(@Req() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    const userId = req.user.userId;
    const result = await this.authService.changePassword(userId, changePasswordDto);
    return ResultEntity.ok(null, result.message);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate current session and clear refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const userId = req.user.userId;
    const refreshToken = req.cookies?.refreshToken;

    const result = await this.authService.logout(userId, refreshToken);

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });

    return ResultEntity.ok(null, result.message);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate all active sessions across all devices for this user' })
  @ApiResponse({ status: 200, description: 'All sessions terminated' })
  async logoutAll(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const userId = req.user.userId;

    const result = await this.authService.logoutAll(userId);

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });

    return ResultEntity.ok(null, result.message);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send 6-digit OTP verification code to registered email' })
  @ApiResponse({ status: 200, description: 'OTP dispatched successfully' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    return ResultEntity.ok({ expiresIn: result.expiresIn }, result.message);
  }

  @Post('reset-password/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate password reset token without changing password' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  async validateResetToken(@Body() body: { token: string }) {
    const result = await this.authService.validateResetToken(body.token);
    return ResultEntity.ok({ valid: result.valid, email: result.email }, 'Password reset link is valid');
  }

  @Post('reset-password-with-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using validated email reset link token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPasswordWithToken(@Body() body: { token: string; password: string }) {
    const result = await this.authService.resetPasswordWithToken(body);
    return ResultEntity.ok(null, result.message);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 6-digit OTP code and set new password' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const result = await this.authService.resetPasswordWithOtp(resetPasswordDto);
    return ResultEntity.ok(null, result.message);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiResponse({ status: 200, description: 'Authentication successful, returns tokens and user info' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account inactive or suspended' })
  @ApiResponse({ status: 423, description: 'Account locked due to consecutive failed attempts' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const result = await this.authService.login(loginDto, ipAddress, userAgent);

    // Set secure HTTP-only cookie for refresh token based on rememberMe flag
    const cookieMaxAge = (loginDto.rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Supports cross-port dev workflows like localhost:5173/5174
      maxAge: cookieMaxAge,
      path: '/api/v1/auth',
    });

    return ResultEntity.ok(
        {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        rememberMe: !!loginDto.rememberMe,
        },
        'Login successful',
      );
  }
}
