import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OnboardingService } from './onboarding.service';
import { UpdateOnboardingStepDto } from './dto/onboarding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'onboarding', version: '1' })
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get onboarding status' })
  getOnboarding(@CurrentUser('tenantId') tenantId: string) {
    return this.onboardingService.getOnboarding(tenantId);
  }

  @Post('start')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Start onboarding wizard' })
  start(@CurrentUser('tenantId') tenantId: string) {
    return this.onboardingService.startOnboarding(tenantId);
  }

  @Patch('step')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Save onboarding step data and advance' })
  updateStep(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateOnboardingStepDto,
  ) {
    return this.onboardingService.updateStep(tenantId, userId, dto.step, dto.data);
  }

  @Post('complete')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Mark onboarding as complete' })
  complete(@CurrentUser('tenantId') tenantId: string) {
    return this.onboardingService.completeOnboarding(tenantId);
  }
}
