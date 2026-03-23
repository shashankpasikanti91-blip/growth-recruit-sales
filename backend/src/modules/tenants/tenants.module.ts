import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantOnboardingService } from './tenant-onboarding.service';

@Module({
  providers: [TenantsService, TenantOnboardingService],
  controllers: [TenantsController],
  exports: [TenantsService, TenantOnboardingService],
})
export class TenantsModule {}
