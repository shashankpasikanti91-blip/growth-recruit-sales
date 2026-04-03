import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { TeamModule } from '../team/team.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TeamModule, TenantsModule],
  providers: [OnboardingService],
  controllers: [OnboardingController],
  exports: [OnboardingService],
})
export class OnboardingModule {}
