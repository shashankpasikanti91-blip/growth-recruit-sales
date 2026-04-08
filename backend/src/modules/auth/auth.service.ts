import { Injectable, UnauthorizedException, BadRequestException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, SignupDto, VerifyEmailDto, ForgotPasswordDto, ResetPasswordDto } from './dto/login.dto';
import { GoogleProfile } from './strategies/google.strategy';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { BusinessIdService } from '../billing/business-id.service';
import { getPlanConfig } from '../../config/plans.config';
import { TenantOnboardingService } from '../tenants/tenant-onboarding.service';
import { OwnerNotificationService } from '../notifications/owner-notification.service';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly businessIdService: BusinessIdService,
    private readonly tenantOnboarding: TenantOnboardingService,
    private readonly ownerNotify: OwnerNotificationService,
    private readonly otpService: OtpService,
  ) {}

  async login(dto: LoginDto) {
    // Resolve tenant — always required unless SUPER_ADMIN or email is globally unique
    let tenantId: string | undefined;
    if (dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: dto.tenantSlug, isActive: true },
      });
      if (!tenant) throw new UnauthorizedException('Tenant not found or inactive');
      tenantId = tenant.id;
    }

    // SECURITY: if tenantSlug not provided, check for ambiguity across tenants
    // to prevent cross-tenant logins via shared email addresses
    if (!tenantId) {
      const matchCount = await this.prisma.user.count({
        where: { email: dto.email, isActive: true },
      });
      if (matchCount > 1) {
        throw new BadRequestException(
          'Multiple accounts found with this email. Please provide your workspace slug (e.g. my-company) to log in.',
        );
      }
    }

    // Find user
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        ...(tenantId ? { tenantId } : {}),
        isActive: true,
      },
      include: { tenant: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.tenant.isActive) throw new UnauthorizedException('Tenant is inactive');

    // Block unverified email users
    if (user.status === 'pending_verification') {
      throw new UnauthorizedException('Please verify your email before logging in. Check your inbox for the OTP code.');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { tenant: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    const { user } = stored;
    if (!user.isActive || !user.tenant.isActive) {
      throw new UnauthorizedException('User or tenant inactive');
    }

    // Rotate refresh token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);

    return tokens;
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    } else {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
    return { message: 'Logged out successfully' };
  }

  // ── Signup (Email) ─────────────────────────────────────────────────────────

  async signup(dto: SignupDto) {
    // Check if the user is signing up via an invite
    let invite: any = null;
    if (dto.inviteToken) {
      invite = await this.prisma.tenantInvite.findUnique({
        where: { token: dto.inviteToken },
        include: { tenant: true },
      });

      if (!invite) throw new BadRequestException('Invalid invite token');
      if (invite.status !== 'PENDING') throw new BadRequestException('This invite has already been used or revoked');
      if (invite.expiresAt < new Date()) throw new BadRequestException('This invite has expired');
      if (invite.email.toLowerCase() !== dto.email.toLowerCase()) {
        throw new BadRequestException('Email does not match the invite');
      }
    }

    const tenantId = invite?.tenantId;
    const role = invite?.role ?? 'TENANT_ADMIN';

    // If signing up without invite, create new tenant
    if (!tenantId) {
      // Check if email is already used
      const existingUser = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase() },
      });
      if (existingUser) {
        if (existingUser.status === 'pending_verification') {
          // Resend OTP for existing unverified user
          await this.sendSignupOtp(existingUser.email, existingUser.firstName);
          return { requiresVerification: true, email: existingUser.email };
        }
        throw new ConflictException('An account with this email already exists. Please log in instead.');
      }

      return this.createNewTenantWithUser({
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash: await bcrypt.hash(dto.password, 12),
        authProvider: 'EMAIL',
        companyName: dto.companyName,
        phone: dto.phone,
        industry: dto.industry,
        country: dto.country,
      });
    }

    // Signing up with invite — join existing tenant
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email.toLowerCase() } },
    });
    if (existing) throw new ConflictException('You already have an account in this workspace');

    // Check tenant user limit
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const userCount = await this.prisma.user.count({ where: { tenantId, isActive: true } });
    if (userCount >= (tenant?.maxUsers ?? 1)) {
      throw new ForbiddenException('This workspace has reached its user limit');
    }

    const businessId = await this.businessIdService.generate('user');
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        businessId,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        fullName: `${dto.firstName} ${dto.lastName}`,
        role: role as any,
        authProvider: 'EMAIL',
        invitedByUserId: invite.invitedByUserId,
        invitedAt: invite.createdAt,
      },
    });

    // Accept the invite
    await this.prisma.tenantInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', acceptedByUserId: user.id, acceptedAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user, invite.tenant),
      isNewTenant: false,
    };
  }

  // ── Google Auth ────────────────────────────────────────────────────────────

  async handleGoogleAuth(profile: GoogleProfile, inviteToken?: string) {
    const email = profile.email.toLowerCase();

    // Case 1: invited user — check and consume the invite
    if (inviteToken) {
      return this.handleGoogleInviteAcceptance(profile, inviteToken);
    }

    // Case 2: existing user by googleId — log in
    const userByGoogleId = await this.prisma.user.findFirst({
      where: { googleId: profile.googleId, isActive: true },
      include: { tenant: true },
    });

    if (userByGoogleId) {
      if (!userByGoogleId.tenant.isActive) throw new UnauthorizedException('Tenant is inactive');
      await this.prisma.user.update({
        where: { id: userByGoogleId.id },
        data: { lastLoginAt: new Date() },
      });
      const tokens = await this.generateTokens(userByGoogleId.id, userByGoogleId.email, userByGoogleId.tenantId, userByGoogleId.role);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.sanitizeUser(userByGoogleId, userByGoogleId.tenant),
        isNewTenant: false,
      };
    }

    // Case 3: existing email user (same tenant) — link Google account
    const existingUsers = await this.prisma.user.findMany({
      where: { email, isActive: true },
      include: { tenant: true },
    });

    if (existingUsers.length === 1) {
      const user = existingUsers[0];
      if (!user.tenant.isActive) throw new UnauthorizedException('Tenant is inactive');

      // Safe account linking: update googleId
      await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId, authProvider: 'GOOGLE', lastLoginAt: new Date() },
      });

      const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.sanitizeUser(user, user.tenant),
        isNewTenant: false,
      };
    }

    if (existingUsers.length > 1) {
      // Multiple tenants with same email — don't auto-join
      throw new BadRequestException(
        'Multiple accounts exist with this email. Please log in with email/password and specify your workspace slug.',
      );
    }

    // Case 4: Check for pending invite matching email
    const pendingInvite = await this.prisma.tenantInvite.findFirst({
      where: { email, status: 'PENDING', expiresAt: { gt: new Date() } },
      include: { tenant: true },
    });

    if (pendingInvite) {
      return this.handleGoogleInviteAcceptance(profile, pendingInvite.token);
    }

    // Case 5: Brand new user — create new tenant
    return this.createNewTenantWithUser({
      email,
      firstName: profile.firstName || profile.fullName.split(' ')[0] || 'User',
      lastName: profile.lastName || profile.fullName.split(' ').slice(1).join(' ') || '',
      authProvider: 'GOOGLE',
      googleId: profile.googleId,
    });
  }

  private async handleGoogleInviteAcceptance(profile: GoogleProfile, inviteToken: string) {
    const email = profile.email.toLowerCase();
    const invite = await this.prisma.tenantInvite.findUnique({
      where: { token: inviteToken },
      include: { tenant: true },
    });

    if (!invite) throw new BadRequestException('Invalid invite token');
    if (invite.status !== 'PENDING') throw new BadRequestException('This invite has already been used or revoked');
    if (invite.expiresAt < new Date()) throw new BadRequestException('This invite has expired');
    if (invite.email.toLowerCase() !== email) {
      throw new BadRequestException('Google account email does not match the invite email');
    }

    // Check if user already exists in this tenant
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: invite.tenantId, email } },
    });
    if (existing) {
      // Link Google and accept invite
      await this.prisma.user.update({
        where: { id: existing.id },
        data: { googleId: profile.googleId, authProvider: 'GOOGLE', lastLoginAt: new Date() },
      });
      await this.prisma.tenantInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', acceptedByUserId: existing.id, acceptedAt: new Date() },
      });
      const tokens = await this.generateTokens(existing.id, existing.email, existing.tenantId, existing.role);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.sanitizeUser(existing, invite.tenant),
        isNewTenant: false,
      };
    }

    // Check tenant user limit
    const userCount = await this.prisma.user.count({ where: { tenantId: invite.tenantId, isActive: true } });
    if (userCount >= (invite.tenant.maxUsers ?? 1)) {
      throw new ForbiddenException('This workspace has reached its user limit');
    }

    const businessId = await this.businessIdService.generate('user');

    const user = await this.prisma.user.create({
      data: {
        tenantId: invite.tenantId,
        businessId,
        email,
        firstName: profile.firstName || profile.fullName.split(' ')[0] || 'User',
        lastName: profile.lastName || profile.fullName.split(' ').slice(1).join(' ') || '',
        fullName: profile.fullName || `${profile.firstName} ${profile.lastName}`,
        role: invite.role,
        authProvider: 'GOOGLE',
        googleId: profile.googleId,
        invitedByUserId: invite.invitedByUserId,
        invitedAt: invite.createdAt,
        lastLoginAt: new Date(),
      },
    });

    await this.prisma.tenantInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', acceptedByUserId: user.id, acceptedAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user, invite.tenant),
      isNewTenant: false,
    };
  }

  // ── OTP Helpers ────────────────────────────────────────────────────────────

  private async sendSignupOtp(email: string, firstName: string): Promise<void> {
    const otp = await this.otpService.store(email, 'verify-email');
    await this.otpService.sendVerificationOtp(email, firstName, otp);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const valid = await this.otpService.verify(dto.email, 'verify-email', dto.otp);
    if (!valid) {
      throw new BadRequestException('Invalid or expired verification code. Please try again.');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), status: 'pending_verification' },
      include: { tenant: true },
    });
    if (!user) throw new BadRequestException('Account not found or already verified');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { status: 'active', lastLoginAt: new Date() },
    });

    // Notify owner now that signup is confirmed
    this.ownerNotify.notifyNewSignup({
      tenantName: user.tenant.name,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      plan: user.tenant.plan,
      signupAt: new Date(),
    }).catch((err) => {
      this.logger.warn(`Owner notification failed: ${err.message}`);
    });

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user, user.tenant),
      isNewTenant: true,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // Always return generic message — prevents user enumeration attacks
    const genericMessage = { message: 'If this email is registered, you will receive a reset code shortly.' };

    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), isActive: true },
    });
    if (!user || user.authProvider !== 'EMAIL') return genericMessage;

    const otp = await this.otpService.store(dto.email.toLowerCase(), 'reset-password');
    this.otpService.sendPasswordResetOtp(dto.email.toLowerCase(), user.firstName, otp).catch((err) => {
      this.logger.warn(`Password reset email failed for ${dto.email}: ${err.message}`);
    });
    return genericMessage;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const valid = await this.otpService.verify(dto.email, 'reset-password', dto.otp);
    if (!valid) {
      throw new BadRequestException('Invalid or expired reset code. Please request a new one.');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), isActive: true },
    });
    if (!user) throw new BadRequestException('Account not found');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

  // ── New Tenant Creation ────────────────────────────────────────────────────

  private async createNewTenantWithUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash?: string;
    authProvider: 'EMAIL' | 'GOOGLE';
    googleId?: string;
    companyName?: string;
    phone?: string;
    industry?: string;
    country?: string;
  }) {
    const slug = this.generateSlug(data.companyName || `${data.firstName}-${data.lastName}`);
    const tenantBusinessId = await this.businessIdService.generate('tenant');
    const userBusinessId = await this.businessIdService.generate('user');

    // Look up the starter plan outside the transaction (read-only, safe)
    const starterPlan = await this.prisma.plan.findFirst({
      where: { tier: 'STARTER' },
    });

    // Use STARTER config when plan exists, otherwise fall back to FREE
    const planConfig = getPlanConfig(starterPlan ? 'STARTER' : 'FREE');

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          businessId: tenantBusinessId,
          name: data.companyName || `${data.firstName}'s Workspace`,
          slug,
          plan: planConfig.tier,
          maxUsers: planConfig.maxUsers,
          maxCandidatesPerMonth: planConfig.maxCandidatesPerMonth,
          maxLeadsPerMonth: planConfig.maxLeadsPerMonth,
          maxAiUsagePerMonth: planConfig.maxAiUsagePerMonth,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          businessId: userBusinessId,
          email: data.email,
          passwordHash: data.passwordHash ?? null,
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: `${data.firstName} ${data.lastName}`,
          role: 'TENANT_ADMIN',
          authProvider: data.authProvider,
          googleId: data.googleId ?? null,
          lastLoginAt: new Date(),
          status: data.authProvider === 'EMAIL' ? 'pending_verification' : 'active',
          settings: (data.phone || data.industry || data.country)
            ? { phone: data.phone, industry: data.industry, country: data.country }
            : undefined,
        },
      });

      // Create onboarding record
      await tx.tenantOnboarding.create({
        data: { tenantId: tenant.id },
      });

      // Auto-create a Starter plan subscription (14-day trial) so Usage & Limits is never 0/0
      if (starterPlan) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: starterPlan.id,
            status: 'TRIALING',
            billingCycle: 'monthly',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            trialEndsAt: trialEnd,
          },
        });
      }

      return { tenant, user };
    });

    // Run tenant onboarding asynchronously — seeds ICP, mapping templates, prompt templates
    // Fire-and-forget: don't block signup if seeding fails
    this.tenantOnboarding.setup(result.tenant.id).catch((err) => {
      this.logger.warn(`Onboarding setup failed for tenant ${result.tenant.id}: ${err.message}`);
    });

    // EMAIL signups: send OTP and require verification before login
    if (data.authProvider === 'EMAIL') {
      this.sendSignupOtp(data.email, data.firstName).catch((err) => {
        this.logger.warn(`Signup OTP send failed for ${data.email}: ${err.message}`);
      });
      return { requiresVerification: true, email: data.email };
    }

    // GOOGLE signups bypass email verification — notify owner immediately
    this.ownerNotify.notifyNewSignup({
      tenantName: result.tenant.name,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      plan: planConfig.tier,
      signupAt: new Date(),
    }).catch((err) => {
      this.logger.warn(`Owner notification failed: ${err.message}`);
    });

    const tokens = await this.generateTokens(
      result.user.id, result.user.email, result.tenant.id, result.user.role,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(result.user, result.tenant),
      isNewTenant: true,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private sanitizeUser(user: any, tenant: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    };
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 40);
    // append random suffix for uniqueness
    const suffix = crypto.randomBytes(3).toString('hex');
    return `${base}-${suffix}`;
  }

  private async generateTokens(userId: string, email: string, tenantId: string, role: string) {
    const payload = { sub: userId, email, tenantId, role };

    const [accessToken, refreshTokenValue] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('auth.jwtSecret'),
        expiresIn: this.config.get('auth.jwtExpiresIn'),
      }),
      uuidv4(),
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { userId, token: refreshTokenValue, expiresAt },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }
}
