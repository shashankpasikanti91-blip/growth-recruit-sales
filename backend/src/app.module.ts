import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { CountriesModule } from './modules/countries/countries.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { LeadsModule } from './modules/leads/leads.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ImportsModule } from './modules/imports/imports.module';
import { MappingsModule } from './modules/mappings/mappings.module';
import { OutreachModule } from './modules/outreach/outreach.module';
import { AiModule } from './modules/ai/ai.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AuditModule } from './modules/audit/audit.module';
import { BillingModule } from './modules/billing/billing.module';
import { HealthModule } from './modules/health/health.module';
import { AppCacheModule } from './modules/cache/cache.module';
import { SearchModule } from './modules/search/search.module';
import { TeamModule } from './modules/team/team.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { DedupeProcessor } from './processors/dedupe.processor';
import { EnrichmentProcessor } from './processors/enrichment.processor';
import { OutreachProcessor } from './processors/outreach.processor';
import { LeadScoringService } from './modules/ai/services/lead-scoring.service';
import { OutreachGenerationService } from './modules/ai/services/outreach-generation.service';
import { AiProviderService } from './modules/ai/providers/ai-provider.service';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';
import aiConfig from './config/ai.config';
import redisConfig from './config/redis.config';
import storageConfig from './config/storage.config';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, authConfig, aiConfig, redisConfig, storageConfig],
      envFilePath: ['.env'],
    }),

    // Event emitter for domain events
    EventEmitterModule.forRoot({ wildcard: true }),

    // Rate limiting — 1000 req/min per IP globally; individual AI endpoints apply stricter limits
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]),

    // Bull queue root config
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      }),
    }),

    // Register all background processing queues
    BullModule.registerQueue(
      { name: 'dedupe' },
      { name: 'enrichment' },
      { name: 'outreach' },
    ),

    // Core infrastructure
    PrismaModule,
    AppCacheModule,
    AuditModule,

    // Feature modules
    AuthModule,
    TenantsModule,
    UsersModule,
    CountriesModule,
    CandidatesModule,
    JobsModule,
    ApplicationsModule,
    LeadsModule,
    CompaniesModule,
    ContactsModule,
    ImportsModule,
    MappingsModule,
    OutreachModule,
    AiModule,
    WorkflowsModule,
    WebhooksModule,
    AnalyticsModule,
    IntegrationsModule,
    BillingModule,
    HealthModule,
    SearchModule,
    TeamModule,
    OnboardingModule,
    DocumentsModule,
  ],
  providers: [
    // Background processors — registered at root level since they depend on cross-module services
    DedupeProcessor,
    EnrichmentProcessor,
    OutreachProcessor,
    // Supporting services needed by processors
    LeadScoringService,
    OutreachGenerationService,
    AiProviderService,
  ],
})
export class AppModule {}
