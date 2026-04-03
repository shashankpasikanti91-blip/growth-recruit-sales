import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantOnboardingService } from './tenant-onboarding.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule],
  providers: [TenantsService, TenantOnboardingService],
  controllers: [TenantsController],
  exports: [TenantsService, TenantOnboardingService],
})
export class TenantsModule {}
