import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const countrySeeds = [
  {
    code: 'MY',
    name: 'Malaysia',
    timezone: 'Asia/Kuala_Lumpur',
    currency: 'MYR',
    locale: 'en-MY',
    phoneFormat: '+60-XX-XXXXXXX',
    dateFormat: 'DD/MM/YYYY',
    jobBoardSources: ['JobStreet', 'LinkedIn', 'Indeed', 'Glassdoor'],
    outreachTone: 'professional',
    complianceNotes: 'PDPA (Personal Data Protection Act 2010)',
  },
  {
    code: 'IN',
    name: 'India',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    locale: 'en-IN',
    phoneFormat: '+91-XXXXX-XXXXX',
    dateFormat: 'DD/MM/YYYY',
    jobBoardSources: ['Naukri', 'LinkedIn', 'Indeed', 'Shine'],
    outreachTone: 'professional',
    complianceNotes: 'IT Act, DPDP Bill 2023',
  },
  {
    code: 'AU',
    name: 'Australia',
    timezone: 'Australia/Sydney',
    currency: 'AUD',
    locale: 'en-AU',
    phoneFormat: '+61-X-XXXX-XXXX',
    dateFormat: 'DD/MM/YYYY',
    jobBoardSources: ['Seek', 'LinkedIn', 'Indeed', 'CareerOne'],
    outreachTone: 'casual_professional',
    complianceNotes: 'Privacy Act 1988, Australian Privacy Principles',
  },
  {
    code: 'SG',
    name: 'Singapore',
    timezone: 'Asia/Singapore',
    currency: 'SGD',
    locale: 'en-SG',
    phoneFormat: '+65-XXXX-XXXX',
    dateFormat: 'DD/MM/YYYY',
    jobBoardSources: ['JobsDB', 'LinkedIn', 'Indeed', 'MyCareersFuture'],
    outreachTone: 'professional',
    complianceNotes: 'PDPA (Personal Data Protection Act)',
  },
  {
    code: 'AE',
    name: 'UAE',
    timezone: 'Asia/Dubai',
    currency: 'AED',
    locale: 'en-AE',
    phoneFormat: '+971-XX-XXX-XXXX',
    dateFormat: 'DD/MM/YYYY',
    jobBoardSources: ['Bayt', 'LinkedIn', 'Indeed', 'GulfTalent'],
    outreachTone: 'formal',
    complianceNotes: 'UAE Federal Law No. 45 of 2021 on Personal Data Protection',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    timezone: 'Europe/London',
    currency: 'GBP',
    locale: 'en-GB',
    phoneFormat: '+44-XXXX-XXXXXX',
    dateFormat: 'DD/MM/YYYY',
    jobBoardSources: ['Reed', 'LinkedIn', 'Indeed', 'Totaljobs'],
    outreachTone: 'professional',
    complianceNotes: 'UK GDPR, Data Protection Act 2018',
  },
  {
    code: 'US',
    name: 'United States',
    timezone: 'America/New_York',
    currency: 'USD',
    locale: 'en-US',
    phoneFormat: '+1-XXX-XXX-XXXX',
    dateFormat: 'MM/DD/YYYY',
    jobBoardSources: ['LinkedIn', 'Indeed', 'ZipRecruiter', 'Glassdoor'],
    outreachTone: 'friendly_professional',
    complianceNotes: 'CAN-SPAM Act, CCPA (California), various state laws',
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Seed country configs
  for (const country of countrySeeds) {
    await prisma.countryConfig.upsert({
      where: { code: country.code },
      update: {},
      create: {
        code: country.code,
        name: country.name,
        timezone: country.timezone,
        currency: country.currency,
        locale: country.locale,
        phoneFormat: country.phoneFormat,
        dateFormat: country.dateFormat,
        jobBoardSources: country.jobBoardSources,
        outreachTone: country.outreachTone,
        complianceNotes: country.complianceNotes,
      },
    });
  }
  console.log(`✅ Seeded ${countrySeeds.length} country configs`);

  // Seed demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'srp-ai-labs' },
    update: {},
    create: {
      name: 'SRP AI Labs',
      slug: 'srp-ai-labs',
      countryCode: 'MY',
      timezone: 'Asia/Kuala_Lumpur',
      currency: 'MYR',
      locale: 'en-MY',
    },
  });
  console.log(`✅ Seeded tenant: ${tenant.name}`);

  // Seed super admin user
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@srp-ai-labs.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@srp-ai-labs.com',
      passwordHash,
      firstName: 'SRP',
      lastName: 'Admin',
      role: 'TENANT_ADMIN',
    },
  });
  console.log(`✅ Seeded admin user: ${admin.email}`);

  // Seed default prompt templates
  const defaultPrompts = [
    {
      serviceType: 'RESUME_PARSER' as const,
      name: 'Default Resume Parser',
      version: 1,
      prompt: `Parse the following resume text and extract structured data. Return valid JSON with fields: firstName, lastName, email, phone, currentTitle, currentCompany, yearsExperience, skills (array), languages (array), education (array of {degree, institution, year}), workHistory (array of {title, company, startDate, endDate, description}).

Resume text:
{{resumeText}}`,
      systemPrompt: 'You are an expert resume parser. Always return valid, structured JSON. Do not invent data not present in the resume.',
      variables: ['resumeText'],
    },
    {
      serviceType: 'JD_PARSER' as const,
      name: 'Default JD Parser',
      version: 1,
      prompt: `Parse the following job description and extract structured requirements. Return valid JSON with fields: title, department, location, jobType, salaryMin, salaryMax, currency, requiredSkills (array), preferredSkills (array), yearsExperienceMin, yearsExperienceMax, educationLevel, responsibilities (array), benefits (array).

Job Description:
{{jobDescription}}`,
      systemPrompt: 'You are an expert job description parser. Extract factual information only from the provided job description.',
      variables: ['jobDescription'],
    },
    {
      serviceType: 'CANDIDATE_SCORING' as const,
      name: 'Default Candidate Scorer',
      version: 1,
      prompt: `Score this candidate against the job requirements. Return valid JSON with: score (0-100), breakdown (object with skill_match, experience_match, education_match each 0-100), explanation (string, 2-3 sentences), strengths (array of strings), gaps (array of strings).

Candidate:
{{candidateData}}

Job Requirements:
{{jobData}}`,
      systemPrompt: 'You are an expert recruitment specialist. Score candidates objectively based on the job requirements provided.',
      variables: ['candidateData', 'jobData'],
    },
    {
      serviceType: 'LEAD_SCORING' as const,
      name: 'Default Lead Scorer',
      version: 1,
      prompt: `Score this lead against the Ideal Customer Profile. Return valid JSON with: score (0-100), breakdown (object with industry_fit, size_fit, title_relevance, intent_signals each 0-100), explanation (string), nextBestAction (string).

Lead Data:
{{leadData}}

ICP:
{{icpData}}`,
      systemPrompt: 'You are an expert B2B sales specialist. Score leads based on fit with the ICP and buying intent signals.',
      variables: ['leadData', 'icpData'],
    },
    {
      serviceType: 'OUTREACH_GENERATION' as const,
      name: 'Default Outreach Generator',
      version: 1,
      prompt: `Generate a personalized {{channel}} outreach message for the following {{entityType}}. The tone should be {{tone}}. Keep it concise (under 150 words), specific to their background/company, and include a clear call to action. Return JSON with: subject (if email), body.

Recipient data:
{{recipientData}}

Context:
{{contextData}}`,
      systemPrompt: 'You are an expert outreach copywriter. Write messages that are personal, relevant, and not spammy. Never use cliches like "I hope this email finds you well."',
      variables: ['channel', 'entityType', 'tone', 'recipientData', 'contextData'],
    },
  ];

  for (const prompt of defaultPrompts) {
    await prisma.promptTemplate.upsert({
      where: {
        id: `default-${prompt.serviceType.toLowerCase()}`,
      },
      update: {},
      create: {
        id: `default-${prompt.serviceType.toLowerCase()}`,
        tenantId: null,
        serviceType: prompt.serviceType,
        name: prompt.name,
        version: prompt.version,
        prompt: prompt.prompt,
        systemPrompt: prompt.systemPrompt,
        variables: prompt.variables,
        isDefault: true,
        isActive: true,
      },
    });
  }
  console.log(`✅ Seeded ${defaultPrompts.length} default prompt templates`);

  // ─── Seed Pricing Plans ─────────────────────────────────────────────────────
  const plans = [
    {
      id: 'plan-starter',
      name: 'Starter',
      tier: 'STARTER' as const,
      description: 'Perfect for small teams just getting started with AI-powered recruitment.',
      monthlyPrice: 49,
      annualPrice: 470, // ~20% off
      currency: 'USD',
      maxUsers: 3,
      maxCandidates: 500,
      maxLeads: 250,
      maxAiCalls: 200,
      maxImports: 5,
      features: [
        'Up to 3 users',
        '500 candidates',
        '250 leads',
        '200 AI screenings/month',
        '5 imports/month',
        'Email outreach',
        'Basic analytics',
        'CSV import',
        'Email support',
      ],
    },
    {
      id: 'plan-growth',
      name: 'Growth',
      tier: 'GROWTH' as const,
      description: 'For growing agencies managing multiple clients and job boards.',
      monthlyPrice: 129,
      annualPrice: 1238, // ~20% off
      currency: 'USD',
      maxUsers: 10,
      maxCandidates: 5000,
      maxLeads: 2500,
      maxAiCalls: 1000,
      maxImports: 50,
      features: [
        'Up to 10 users',
        '5,000 candidates',
        '2,500 leads',
        '1,000 AI screenings/month',
        '50 imports/month',
        'Email + LinkedIn outreach',
        'Advanced analytics & reports',
        'n8n automation workflows',
        'CSV / Excel import',
        'Apollo & Hunter integration',
        'Priority email support',
      ],
    },
    {
      id: 'plan-professional',
      name: 'Professional',
      tier: 'PROFESSIONAL' as const,
      description: 'Full-featured platform for high-volume recruitment and sales teams.',
      monthlyPrice: 299,
      annualPrice: 2870, // ~20% off
      currency: 'USD',
      maxUsers: 30,
      maxCandidates: 25000,
      maxLeads: 10000,
      maxAiCalls: 5000,
      maxImports: 200,
      features: [
        'Up to 30 users',
        '25,000 candidates',
        '10,000 leads',
        '5,000 AI screenings/month',
        '200 imports/month',
        'Omni-channel outreach',
        'Power BI-style reporting',
        'Full n8n automation suite',
        'All integrations (Apollo, Hunter, Clearbit)',
        'API access',
        'Custom AI prompt templates',
        'Dedicated Slack support',
        'SLA: 4-hour response',
      ],
    },
    {
      id: 'plan-enterprise',
      name: 'Enterprise',
      tier: 'ENTERPRISE' as const,
      description: 'Unlimited scale, custom SLAs, and white-glove onboarding for large organisations.',
      monthlyPrice: 799,
      annualPrice: 7670, // ~20% off
      currency: 'USD',
      maxUsers: 999,
      maxCandidates: 999999,
      maxLeads: 999999,
      maxAiCalls: 999999,
      maxImports: 9999,
      features: [
        'Unlimited users',
        'Unlimited candidates & leads',
        'Unlimited AI screenings',
        'Unlimited imports',
        'Custom AI models (BYO API key)',
        'SSO / SAML integration',
        'Custom domain & white-label',
        'Data residency options',
        'Dedicated customer success manager',
        'SLA: 1-hour response',
        'On-premise deployment option',
        'Custom contract & billing',
      ],
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: { monthlyPrice: plan.monthlyPrice, annualPrice: plan.annualPrice },
      create: plan,
    });
  }
  console.log(`✅ Seeded ${plans.length} pricing plans`);

  // Seed starter subscription for demo tenant
  const starterPlan = await prisma.plan.findUnique({ where: { id: 'plan-professional' } });
  if (starterPlan) {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    await prisma.subscription.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: {
        tenantId: tenant.id,
        planId: starterPlan.id,
        status: 'TRIALING',
        billingCycle: 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: trialEnd,
      },
    });
    console.log(`✅ Seeded Professional trial subscription for ${tenant.name}`);
  }

  console.log('\n✨ Database seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log(`   Email: admin@srp-ai-labs.com`);
  console.log(`   Password: Admin@123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
