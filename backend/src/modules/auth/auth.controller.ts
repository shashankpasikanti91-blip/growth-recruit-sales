import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, Res, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto, RefreshTokenDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sign up with email (new tenant or invite)' })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout / invalidate refresh token' })
  logout(@Req() req: any, @Body() body: Partial<RefreshTokenDto>) {
    return this.authService.logout(req.user.id, body.refreshToken);
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Redirect to Google OAuth consent screen' })
  googleAuth(@Query('invite_token') inviteToken?: string) {
    // Guard redirects to Google — this body never runs
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: any, @Res() res: Response, @Query('state') state?: string) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    try {
      const googleProfile = req.user;
      if (!googleProfile) {
        return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
      }

      // Extract invite token from state param if present
      const inviteToken = state || undefined;
      const result = await this.authService.handleGoogleAuth(googleProfile, inviteToken);

      // Redirect to frontend with tokens as URL params (short-lived)
      const params = new URLSearchParams({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        is_new_tenant: String(result.isNewTenant),
      });

      const redirectPath = result.isNewTenant ? '/onboarding' : '/dashboard';
      return res.redirect(`${frontendUrl}${redirectPath}?${params.toString()}`);
    } catch (err: any) {
      const message = encodeURIComponent(err.message || 'Authentication failed');
      return res.redirect(`${frontendUrl}/login?error=${message}`);
    }
  }
}
