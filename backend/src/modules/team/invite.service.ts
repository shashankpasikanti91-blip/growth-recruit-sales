import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInviteDto } from './dto/team.dto';
import * as crypto from 'crypto';

@Injectable()
export class InviteService {
  private readonly INVITE_EXPIRY_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createInvite(tenantId: string, invitedByUserId: string, dto: CreateInviteDto) {
    const email = dto.email.toLowerCase();

    // Don't allow inviting yourself
    const inviter = await this.prisma.user.findUnique({ where: { id: invitedByUserId } });
    if (inviter?.email === email) {
      throw new BadRequestException('You cannot invite yourself');
    }

    // Check if user already exists in this tenant
    const existingUser = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists in your workspace');
    }

    // Check for pending invite for same email in same tenant
    const existingInvite = await this.prisma.tenantInvite.findFirst({
      where: { tenantId, email, status: 'PENDING' },
    });
    if (existingInvite) {
      throw new ConflictException('An invite is already pending for this email. You can resend it instead.');
    }

    // Check tenant user limit (existing users + pending invites)
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const [userCount, pendingInvites] = await Promise.all([
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
      this.prisma.tenantInvite.count({ where: { tenantId, status: 'PENDING' } }),
    ]);

    if (userCount + pendingInvites >= tenant.maxUsers) {
      throw new ForbiddenException(
        `Your workspace can have up to ${tenant.maxUsers} users (current: ${userCount} users + ${pendingInvites} pending invites). Upgrade your plan to add more.`,
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.INVITE_EXPIRY_DAYS);

    const invite = await this.prisma.tenantInvite.create({
      data: {
        tenantId,
        email,
        fullName: dto.fullName,
        role: dto.role,
        token,
        status: 'PENDING',
        expiresAt,
        invitedByUserId,
      },
      include: {
        tenant: { select: { name: true, slug: true } },
        invitedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      ...invite,
      inviteLink: this.getInviteLink(token),
    };
  }

  async listInvites(tenantId: string) {
    return this.prisma.tenantInvite.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: { select: { firstName: true, lastName: true, email: true } },
        acceptedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }

  async resendInvite(tenantId: string, inviteId: string) {
    const invite = await this.prisma.tenantInvite.findFirst({
      where: { id: inviteId, tenantId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Can only resend pending invites');
    }

    // Generate new token and extend expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.INVITE_EXPIRY_DAYS);

    const updated = await this.prisma.tenantInvite.update({
      where: { id: inviteId },
      data: { token, expiresAt },
      include: {
        tenant: { select: { name: true, slug: true } },
        invitedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      ...updated,
      inviteLink: this.getInviteLink(token),
    };
  }

  async revokeInvite(tenantId: string, inviteId: string) {
    const invite = await this.prisma.tenantInvite.findFirst({
      where: { id: inviteId, tenantId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Can only revoke pending invites');
    }

    return this.prisma.tenantInvite.update({
      where: { id: inviteId },
      data: { status: 'REVOKED' },
    });
  }

  async validateInvite(token: string) {
    const invite = await this.prisma.tenantInvite.findUnique({
      where: { token },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
        invitedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!invite) throw new NotFoundException('Invalid invite link');

    const isExpired = invite.expiresAt < new Date();
    const isValid = invite.status === 'PENDING' && !isExpired;

    return {
      valid: isValid,
      invite: {
        email: invite.email,
        fullName: invite.fullName,
        role: invite.role,
        status: isExpired && invite.status === 'PENDING' ? 'EXPIRED' : invite.status,
        tenant: invite.tenant,
        invitedBy: invite.invitedBy
          ? `${invite.invitedBy.firstName} ${invite.invitedBy.lastName}`
          : 'Unknown',
        expiresAt: invite.expiresAt,
      },
    };
  }

  private getInviteLink(token: string): string {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    return `${frontendUrl}/invite/accept?token=${token}`;
  }
}
