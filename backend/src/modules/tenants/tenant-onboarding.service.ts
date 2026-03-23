import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * TenantOnboardingService
 * Idempotent setup run after a new tenant is created.
 * Safe to call multiple times — all operations check existence first.
 */
@Injectable()
export class TenantOnboardingService {
  private readonly logger = new Logger(TenantOnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async setup(tenantId: string): Promise<{ seeded: string[] }> {
    const seeded: string[] = [];

    try {
      await this.seedDefaultMappingTemplates(tenantId, seeded);
    } catch (err: any) {
      this.logger.warn(`Onboarding: mapping templates failed for ${tenantId}: ${err.message}`);
    }

    try {
      await this.seedDefaultIcpProfile(tenantId, seeded);
    } catch (err: any) {
      this.logger.warn(`Onboarding: ICP profile failed for ${tenantId}: ${err.message}`);
    }

    try {
      await this.seedDefaultPromptTemplates(tenantId, seeded);
    } catch (err: any) {
      this.logger.warn(`Onboarding: prompt templates failed for ${tenantId}: ${err.message}`);
    }

    this.logger.log(`Tenant ${tenantId} onboarding complete. Seeded: ${seeded.join(', ') || 'nothing new'}`);
    return { seeded };
  }

  private async seedDefaultMappingTemplates(tenantId: string, seeded: string[]) {
    const existing = await this.prisma.mappingTemplate.count({ where: { tenantId } });
    if (existing > 0) return;

    await this.prisma.mappingTemplate.createMany({
      data: [
        {
          tenantId,
          name: 'Default Candidate CSV Import',
          description: 'Standard mapping for candidate CSV files with common column names',
          entityType: 'candidate',
          isDefault: true,
          mappings: {
            firstName: ['first_name', 'firstname', 'first name', 'given_name'],
            lastName: ['last_name', 'lastname', 'last name', 'surname', 'family_name'],
            email: ['email', 'email_address', 'e-mail'],
            phone: ['phone', 'mobile', 'telephone', 'contact_number'],
            currentTitle: ['title', 'job_title', 'position', 'current_title', 'role'],
            currentCompany: ['company', 'current_company', 'employer', 'organization'],
            location: ['location', 'city', 'address', 'country'],
            skills: ['skills', 'skill_set', 'technologies', 'competencies'],
            linkedinUrl: ['linkedin', 'linkedin_url', 'linkedin_profile'],
          },
        },
        {
          tenantId,
          name: 'Default Lead CSV Import',
          description: 'Standard mapping for sales lead CSV files',
          entityType: 'lead',
          isDefault: true,
          mappings: {
            firstName: ['first_name', 'firstname', 'given_name'],
            lastName: ['last_name', 'lastname', 'surname'],
            email: ['email', 'email_address', 'work_email'],
            phone: ['phone', 'mobile', 'direct_dial'],
            title: ['title', 'job_title', 'position', 'role'],
            company: ['company', 'company_name', 'organization', 'account'],
            linkedinUrl: ['linkedin', 'linkedin_url'],
          },
        },
      ],
      skipDuplicates: true,
    });
    seeded.push('mapping_templates');
  }

  private async seedDefaultIcpProfile(tenantId: string, seeded: string[]) {
    const existing = await this.prisma.icpProfile.count({ where: { tenantId } });
    if (existing > 0) return;

    await this.prisma.icpProfile.create({
      data: {
        tenantId,
        name: 'Default ICP',
        description: 'Edit this profile to match your ideal customer profile',
        industries: [],
        companySizes: ['11-50', '51-200', '201-500'],
        countries: [],
        titleKeywords: ['CEO', 'CTO', 'VP', 'Director', 'Head of', 'Manager'],
        painPointKeywords: [],
        techStackRequired: [],
        isActive: true,
      },
    });
    seeded.push('icp_profile');
  }

  private async seedDefaultPromptTemplates(tenantId: string, seeded: string[]) {
    // Only seed tenant-specific overrides if none exist
    const existing = await this.prisma.promptTemplate.count({ where: { tenantId } });
    if (existing > 0) return;

    await this.prisma.promptTemplate.create({
      data: {
        tenantId,
        serviceType: 'OUTREACH_GENERATION',
        name: 'Default Outreach Template',
        version: 1,
        prompt: 'Generate a professional {{channel}} outreach message for {{entityType}} named {{name}}. Context: {{context}}. Tone: {{tone}}.',
        systemPrompt: 'You are an expert recruiter/sales specialist. Write personalized, concise outreach messages.',
        variables: ['channel', 'entityType', 'name', 'context', 'tone'],
        isActive: true,
        isDefault: true,
      },
    });
    seeded.push('prompt_templates');
  }
}
