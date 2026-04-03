import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteService } from '../team/invite.service';
import { TenantOnboardingService } from '../tenants/tenant-onboarding.service';
import { CompanyDetailsDto, TeamSetupDto, ModulePreferencesDto } from './dto/onboarding.dto';

const ONBOARDING_STEPS = ['company_details', 'team_setup', 'module_preferences', 'first_workspace', 'complete'];

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inviteService: InviteService,
    private readonly tenantOnboarding: TenantOnboardingService,
  ) {}

  async getOnboarding(tenantId: string) {
    const onboarding = await this.prisma.tenantOnboarding.findUnique({
      where: { tenantId },
    });

    if (!onboarding) {
      // Create one if it doesn't exist (backward compat for existing tenants)
      return this.prisma.tenantOnboarding.create({
        data: { tenantId },
      });
    }

    return onboarding;
  }

  async startOnboarding(tenantId: string) {
    return this.prisma.tenantOnboarding.upsert({
      where: { tenantId },
      update: {},
      create: { tenantId },
    });
  }

  async updateStep(tenantId: string, userId: string, step: string, data?: any) {
    const onboarding = await this.getOnboarding(tenantId);
    if (onboarding.completed) {
      throw new BadRequestException('Onboarding already completed');
    }

    const stepIndex = ONBOARDING_STEPS.indexOf(step);
    if (stepIndex === -1) {
      throw new BadRequestException(`Invalid step: ${step}. Valid steps: ${ONBOARDING_STEPS.join(', ')}`);
    }

    // Process step data
    const metadata = (onboarding.metadata as any) || {};

    switch (step) {
      case 'company_details':
        await this.processCompanyDetails(tenantId, data as CompanyDetailsDto);
        metadata.company_details = data;
        break;

      case 'team_setup':
        if (data?.invites?.length > 0) {
          await this.processTeamSetup(tenantId, userId, data as TeamSetupDto);
        }
        metadata.team_setup = { inviteCount: data?.invites?.length ?? 0 };
        break;

      case 'module_preferences':
        if (data) {
          await this.processModulePreferences(tenantId, data as ModulePreferencesDto);
        }
        metadata.module_preferences = data;
        break;

      case 'first_workspace':
        metadata.first_workspace = data || { skipped: true };
        break;
    }

    // Determine next step
    const nextStepIndex = Math.min(stepIndex + 1, ONBOARDING_STEPS.length - 1);
    const nextStep = ONBOARDING_STEPS[nextStepIndex];

    return this.prisma.tenantOnboarding.update({
      where: { tenantId },
      data: {
        currentStep: nextStep,
        metadata,
      },
    });
  }

  async completeOnboarding(tenantId: string) {
    const onboarding = await this.getOnboarding(tenantId);
    if (onboarding.completed) return onboarding;

    // Run the idempotent seeding setup
    await this.tenantOnboarding.setup(tenantId);

    return this.prisma.tenantOnboarding.update({
      where: { tenantId },
      data: {
        completed: true,
        completedAt: new Date(),
        currentStep: 'complete',
      },
    });
  }

  // ── Step Processors ──────────────────────────────────────────────────────

  private async processCompanyDetails(tenantId: string, data: CompanyDetailsDto) {
    if (!data) return;
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.companyName,
        ...(data.countryCode ? { countryCode: data.countryCode } : {}),
        ...(data.timezone ? { timezone: data.timezone } : {}),
      },
    });
  }

  private async processTeamSetup(tenantId: string, userId: string, data: TeamSetupDto) {
    if (!data?.invites?.length) return;
    for (const invite of data.invites) {
      try {
        await this.inviteService.createInvite(tenantId, userId, {
          email: invite.email,
          fullName: invite.fullName,
          role: invite.role as any,
        });
      } catch {
        // Silently skip duplicate invites during onboarding
      }
    }
  }

  private async processModulePreferences(tenantId: string, data: ModulePreferencesDto) {
    if (!data) return;
    const settings: any = {};
    settings.recruitmentEnabled = data.recruitmentEnabled;
    settings.salesEnabled = data.salesEnabled;
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings },
    });
  }
}
