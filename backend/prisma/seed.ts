import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to generate static businessId for seed data
const bid = (prefix: string, date: string, seq: number, pad = 6) =>
  `${prefix}-${date}-${String(seq).padStart(pad, '0')}`;

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
      businessId: bid('TEN', '2026', 1, 4),
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
      businessId: bid('USR', '2026', 1, 4),
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
      id: 'plan-free',
      name: 'Starter Trial',
      tier: 'FREE' as const,
      description: 'Start free, scale as you grow. No credit card required.',
      monthlyPrice: 0,
      annualPrice: 0,
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
        'CSV / Excel imports',
        'Basic analytics',
        'Email outreach',
        'Community support',
      ],
    },
    {
      id: 'plan-starter',
      name: 'Starter',
      tier: 'STARTER' as const,
      description: 'For individuals and small teams starting to scale their pipeline.',
      monthlyPrice: 69,
      annualPrice: 55,
      currency: 'USD',
      maxUsers: 5,
      maxCandidates: 2000,
      maxLeads: 1000,
      maxAiCalls: 500,
      maxImports: 20,
      features: [
        'Up to 5 users',
        '2,000 candidates',
        '1,000 AI-generated leads',
        '500 AI screenings/month',
        'All file formats (PDF, Word, CSV)',
        'Full automation',
        'n8n workflow automation',
        'Email support',
      ],
    },
    {
      id: 'plan-growth',
      name: 'Growth',
      tier: 'GROWTH' as const,
      description: 'Built for growing teams. Full automation and advanced capacity.',
      monthlyPrice: 149,
      annualPrice: 119,
      currency: 'USD',
      maxUsers: 15,
      maxCandidates: 10000,
      maxLeads: 2500,
      maxAiCalls: 1000,
      maxImports: 100,
      features: [
        'Up to 15 users',
        '10,000 candidates',
        '2,500 AI-generated leads',
        '1,000 AI screenings/month',
        'All file formats + bulk upload',
        'Advanced analytics',
        'Custom AI prompts',
        'Priority support',
      ],
    },
    {
      id: 'plan-professional',
      name: 'Enterprise',
      tier: 'PROFESSIONAL' as const,
      description: 'Enterprise-ready automation. Custom pricing for your scale.',
      monthlyPrice: -1,
      annualPrice: -1,
      currency: 'USD',
      maxUsers: 999,
      maxCandidates: 999999,
      maxLeads: 999999,
      maxAiCalls: 999999,
      maxImports: 9999,
      features: [
        'High-volume / scalable limits',
        'Custom workflows',
        'API access',
        'Dedicated support',
        'Custom AI models (BYO key)',
        'SSO / SAML',
        'White-label option',
        'SLA guarantee',
      ],
    },
    {
      id: 'plan-enterprise',
      name: 'Enterprise',
      tier: 'ENTERPRISE' as const,
      description: 'Enterprise-ready automation. Custom pricing for your scale.',
      monthlyPrice: -1,
      annualPrice: -1,
      currency: 'USD',
      maxUsers: 999,
      maxCandidates: 999999,
      maxLeads: 999999,
      maxAiCalls: 999999,
      maxImports: 9999,
      features: [
        'High-volume / scalable limits',
        'Custom workflows',
        'API access',
        'Dedicated support',
        'Custom AI models (BYO key)',
        'SSO / SAML',
        'White-label option',
        'SLA guarantee',
      ],
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        maxUsers: plan.maxUsers,
        maxCandidates: plan.maxCandidates,
        maxLeads: plan.maxLeads,
        maxAiCalls: plan.maxAiCalls,
        maxImports: plan.maxImports,
        features: plan.features,
      },
      create: plan,
    });
  }
  console.log(`✅ Seeded ${plans.length} pricing plans`);

  // Seed starter subscription for demo tenant
  const starterPlan = await prisma.plan.findUnique({ where: { id: 'plan-starter' } });
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
    console.log(`✅ Seeded Starter trial subscription for ${tenant.name}`);
  }

  // ─── Seed Visa Rules (per country) ──────────────────────────────────────────
  const visaRulesData = [
    // ── Malaysia ──
    { countryCode: 'MY', visaType: 'EP-I', visaName: 'Employment Pass Category I', category: 'WORK', description: 'For foreign knowledge workers earning RM10,000+ per month in management and professional roles.', eligibility: ['Minimum salary RM10,000/month', 'Recognized degree or equivalent experience', 'Valid employment contract', 'Company must be registered in Malaysia'], requiredDocuments: ['Passport (min 18 months validity)', 'Employment contract', 'Academic certificates', 'CV/Resume', 'Company registration docs', 'Passport-size photo'], processingTimeDays: 14, validityMonths: 60, renewalInfo: 'Renewable for up to 5 years each time. Apply 3 months before expiry.', fees: { application: 1010, processingCurrency: 'MYR' }, salaryThreshold: 10000, latestUpdates: ['2024: Minimum salary threshold increased from RM5,000 to RM10,000 for EP-I', 'Digital nomad visa (DE Rantau) introduced as alternative for remote workers'], tips: ['Apply through ESD (Expatriate Services Division)', 'Processing is faster for MSC-status companies', 'Spouse can apply for DP simultaneously'] },
    { countryCode: 'MY', visaType: 'EP-II', visaName: 'Employment Pass Category II', category: 'WORK', description: 'For foreign knowledge workers earning RM5,000-RM9,999 per month.', eligibility: ['Salary RM5,000 - RM9,999/month', 'Recognized degree', 'Valid employment contract'], requiredDocuments: ['Passport (min 18 months validity)', 'Employment contract', 'Academic certificates', 'CV/Resume', 'Company registration docs'], processingTimeDays: 14, validityMonths: 24, renewalInfo: 'Renewable for 2 years each time.', fees: { application: 510, processingCurrency: 'MYR' }, salaryThreshold: 5000, latestUpdates: ['Subject to quota restrictions per company'], tips: ['Company quota depends on paid-up capital and industry'] },
    { countryCode: 'MY', visaType: 'DP', visaName: 'Dependent Pass', category: 'DEPENDENT', description: 'For spouse and children of EP holders.', eligibility: ['Spouse or child of EP holder', 'EP holder earns RM5,000+/month', 'Valid marriage certificate or birth certificate'], requiredDocuments: ['Passport', 'Marriage certificate / birth certificate', 'EP holder pass copy', 'Photo'], processingTimeDays: 14, validityMonths: 24, renewalInfo: 'Tied to EP validity. Renewed together with EP.', fees: { application: 410, processingCurrency: 'MYR' }, latestUpdates: ['DP holders can apply for work permission separately'], tips: ['Apply together with primary EP for faster processing'] },

    // ── Singapore ──
    { countryCode: 'SG', visaType: 'EP', visaName: 'Employment Pass', category: 'WORK', description: 'For foreign professionals, managers, and executives earning at least SGD 5,000/month (SGD 5,600 for financial sector).', eligibility: ['Minimum salary SGD 5,000/month (SGD 5,600 for financial sector)', 'Recognized qualifications', 'Professional experience relevant to the role', 'Company must be registered in Singapore'], requiredDocuments: ['Passport (min 6 months validity)', 'Educational certificates', 'Employment contract/offer letter', 'Company business profile (ACRA)', 'Detailed job description'], processingTimeDays: 21, validityMonths: 24, renewalInfo: 'Renewable for up to 3 years. Apply 6 months before expiry via EP Online.', fees: { application: 105, issuance: 225, processingCurrency: 'SGD' }, salaryThreshold: 5000, quotaInfo: 'No quota for EP. Subject to COMPASS framework scoring since Sep 2023.', latestUpdates: ['Sep 2023: COMPASS framework introduced — points-based assessment', '2024: Minimum salary raised to SGD 5,000', 'ONE Pass (Overseas Networks & Expertise) for top earners SGD 30,000+/month'], tips: ['Use MOM SAT (Self-Assessment Tool) to check eligibility before applying', 'COMPASS scoring considers salary, qualifications, diversity, and Strategic Economic Priorities bonus', 'EP holders can bring family on Dependant Pass if earning SGD 6,000+'] },
    { countryCode: 'SG', visaType: 'S-PASS', visaName: 'S Pass', category: 'WORK', description: 'For mid-level skilled workers earning at least SGD 3,150/month.', eligibility: ['Minimum salary SGD 3,150/month', 'Degree/diploma from recognized institution', 'Relevant work experience'], requiredDocuments: ['Passport', 'Educational certificates', 'Employment details', 'Company registration'], processingTimeDays: 21, validityMonths: 24, renewalInfo: 'Renewable for 2 years each time.', fees: { application: 105, issuance: 225, levy: 450, processingCurrency: 'SGD' }, salaryThreshold: 3150, quotaInfo: 'Subject to S Pass quota: max 15% of company workforce (from Jan 2025).', latestUpdates: ['Jan 2025: Quota reduced from 18% to 15%', 'Levy tiers based on company S Pass ratio'], tips: ['Companies must pay monthly levy per S Pass holder', 'Check quota eligibility before sponsoring'] },
    { countryCode: 'SG', visaType: 'DP-SG', visaName: 'Dependant Pass', category: 'DEPENDENT', description: 'For spouse and children of EP/S Pass holders earning SGD 6,000+/month.', eligibility: ['Legally married spouse or unmarried children under 21', 'Sponsor (EP/S Pass holder) earns SGD 6,000+/month'], requiredDocuments: ['Passport', 'Marriage/birth certificate', 'Sponsor pass details'], processingTimeDays: 21, validityMonths: 24, fees: { application: 105, issuance: 225, processingCurrency: 'SGD' }, latestUpdates: ['DP holders need LOC (Letter of Consent) to work in Singapore'], tips: ['Apply via EP Online together with main pass for faster processing'] },

    // ── Australia ──
    { countryCode: 'AU', visaType: '482', visaName: 'Temporary Skill Shortage (TSS) Visa', category: 'WORK', description: 'Allows employers to sponsor foreign workers for positions they cannot fill locally. Short-term (2 yrs) and Medium-term (4 yrs) streams.', eligibility: ['Sponsored by an approved employer', 'Occupation on STSOL or MLTSSL list', 'At least 2 years relevant work experience', 'English language proficiency (IELTS 5.0+ or equivalent)', 'Skills assessment may be required'], requiredDocuments: ['Valid passport', 'Skills assessment (if required)', 'English test results (IELTS/PTE)', 'Employment references', 'Qualification documents', 'Police clearance certificates', 'Health examination'], processingTimeDays: 60, validityMonths: 48, renewalInfo: 'Medium-term stream: pathway to permanent residency after 3 years. Short-term: renewable once.', fees: { application: 1455, nominationFee: 330, processingCurrency: 'AUD' }, latestUpdates: ['2024: Salary threshold increased to AUD 73,150/year', 'Training levy replaced nomination fee structure', 'Accredited sponsor program for faster processing'], tips: ['Employer must be an approved Standard Business Sponsor', 'Check if your occupation is on the relevant skills list at immi.homeaffairs.gov.au', 'Medium-term stream allows PR pathway via subclass 186'] },
    { countryCode: 'AU', visaType: '186', visaName: 'Employer Nomination Scheme (PR)', category: 'WORK', description: 'Permanent residency visa for skilled workers nominated by their employer.', eligibility: ['Nominated by an approved Australian employer', 'Under 45 years of age', 'Positive skills assessment', 'At least 3 years relevant work experience', 'Competent English (IELTS 6.0 each band)'], requiredDocuments: ['Passport', 'Skills assessment', 'IELTS/PTE results', 'Employment references', 'Qualification docs', 'Police and health clearances'], processingTimeDays: 180, validityMonths: 0, renewalInfo: 'Permanent visa — no renewal needed. Must meet residency requirements for citizenship (3+ years).', fees: { application: 4240, nominationFee: 540, processingCurrency: 'AUD' }, latestUpdates: ['Direct Entry stream requires positive skills assessment', 'Temporary Residence Transition stream for 482 holders with 3 years work'], tips: ['This is the main employer-sponsored PR pathway', 'Start PR process after 2-3 years on 482 visa'] },
    { countryCode: 'AU', visaType: '500', visaName: 'Student Visa', category: 'STUDENT', description: 'For international students enrolled in registered courses in Australia.', eligibility: ['Confirmed enrolment (CoE)', 'Genuine Temporary Entrant (GTE)', 'English language requirements', 'Financial capacity proof', 'Health insurance (OSHC)'], requiredDocuments: ['Passport', 'CoE from provider', 'GTE statement', 'Financial evidence', 'English test results', 'OSHC policy'], processingTimeDays: 30, validityMonths: 60, fees: { application: 710, processingCurrency: 'AUD' }, latestUpdates: ['2024: Tighter GTE requirements', 'Work rights: 48 hours per fortnight during semester'], tips: ['Can work part-time while studying', 'Graduate visa (485) available after completion'] },

    // ── UAE ──
    { countryCode: 'AE', visaType: 'EMPLOYMENT', visaName: 'Employment Visa (Work Permit)', category: 'WORK', description: 'Standard employment visa sponsored by UAE employer. Valid in the sponsoring emirate.', eligibility: ['Job offer from UAE-registered company', 'Medical fitness test passed', 'Educational certificates attested by UAE embassy', 'No criminal record'], requiredDocuments: ['Passport (min 6 months validity)', 'Passport photos (white background)', 'Attested educational certificates', 'Employment offer letter', 'Medical fitness test', 'Emirates ID application', 'Tenancy contract (for residency stamp)'], processingTimeDays: 30, validityMonths: 24, renewalInfo: 'Renewable every 2 years. Employer initiates renewal 30 days before expiry.', fees: { entryPermit: 500, medicalTest: 320, emiratesId: 370, visaStamping: 500, processingCurrency: 'AED' }, latestUpdates: ['2023: Remote work visa introduced for freelancers', '2024: Golden Visa expanded to include more skilled workers', 'Green Visa for skilled workers (self-sponsored, 5 years)'], tips: ['All certificates must be attested by UAE embassy in home country', 'Medical test is mandatory — done at approved centers', 'Emirates ID is required and takes 1-2 weeks after visa'] },
    { countryCode: 'AE', visaType: 'GOLDEN', visaName: 'Golden Visa (Long-term Residence)', category: 'WORK', description: '5 or 10 year renewable residency visa for investors, entrepreneurs, scientists, outstanding students, and skilled professionals.', eligibility: ['Classified as skilled professional in priority field (tech, health, education, science)', 'Monthly salary AED 30,000+ OR Bachelor degree from top university', 'Valid employment in UAE', 'No sponsor required for renewal'], requiredDocuments: ['Passport', 'Current UAE visa copy', 'Salary certificate', 'Educational certificates', 'Professional references'], processingTimeDays: 30, validityMonths: 120, fees: { application: 2800, processingCurrency: 'AED' }, latestUpdates: ['2024: Expanded to include AI, tech, and digital professionals', 'No sponsor needed — self-sponsored', 'Family members included automatically'], tips: ['Apply through ICP (Federal Authority for Identity, Citizenship)', 'Tech professionals with AI/ML skills have high approval rates'] },

    // ── United States ──
    { countryCode: 'US', visaType: 'H-1B', visaName: 'H-1B Specialty Occupation Visa', category: 'WORK', description: 'For foreign workers in specialty occupations requiring a bachelor\'s degree or equivalent. Subject to annual cap (65,000 + 20,000 master\'s).', eligibility: ['Job offer in a specialty occupation', 'Bachelor\'s degree (minimum) in relevant field', 'Employer must file Labor Condition Application (LCA)', 'Selected in H-1B lottery (if cap-subject)'], requiredDocuments: ['Valid passport', 'Educational transcripts and degree certificates', 'Credential evaluation (if non-US degree)', 'Resume/CV', 'LCA from employer', 'Job offer letter', 'DS-160 form', 'Passport photos'], processingTimeDays: 120, validityMonths: 36, renewalInfo: 'Extendable up to 6 years total. Beyond 6 years possible if I-140 (green card petition) approved.', fees: { applicationI129: 460, fraudPreventionFee: 500, ASCFee: 85, premiumProcessing: 2805, processingCurrency: 'USD' }, salaryThreshold: 60000, quotaInfo: 'Annual cap: 65,000 regular + 20,000 US Master\'s exemption. Registration period: March each year.', latestUpdates: ['FY2026: Registration period March 7-24, 2025', 'Beneficiary-centric lottery (one entry per person, not per employer)', 'USCIS increased premium processing fee to $2,805', 'DHS rule tightening specialty occupation definition'], tips: ['Register for lottery in March for October 1 start date', 'Premium processing gives result in 15 business days', 'Cap-exempt employers (universities, research orgs) not subject to lottery', 'H-1B to Green Card pathway via PERM → I-140 → I-485'] },
    { countryCode: 'US', visaType: 'L-1', visaName: 'L-1 Intracompany Transfer Visa', category: 'WORK', description: 'For employees transferring from a foreign office to a US office of the same company. L-1A for managers, L-1B for specialized knowledge.', eligibility: ['Employed by company abroad for at least 1 continuous year in past 3 years', 'Transferring to US parent, subsidiary, affiliate, or branch', 'Manager/executive (L-1A) or specialized knowledge (L-1B) role'], requiredDocuments: ['Passport', 'I-129 petition', 'Employment verification', 'Organization chart', 'Company relationship documentation', 'DS-160'], processingTimeDays: 60, validityMonths: 36, renewalInfo: 'L-1A: up to 7 years total. L-1B: up to 5 years total.', fees: { applicationI129: 460, fraudPreventionFee: 500, processingCurrency: 'USD' }, latestUpdates: ['Blanket L petitions available for large multinationals', 'L-1A provides direct path to EB-1C green card'], tips: ['No lottery required — good alternative to H-1B', 'L-1A managers have fastest green card path via EB-1C'] },

    // ── United Kingdom ──
    { countryCode: 'GB', visaType: 'SKILLED-WORKER', visaName: 'Skilled Worker Visa', category: 'WORK', description: 'Main UK work visa for foreign nationals with a confirmed job offer from a licensed UK sponsor.', eligibility: ['Job offer from Home Office licensed sponsor', 'Certificate of Sponsorship (CoS)', 'Job at required skill level (RQF 3+)', 'Meet minimum salary threshold (GBP 38,700 or going rate for occupation)', 'English language B1 level (CEFR)'], requiredDocuments: ['Valid passport', 'Certificate of Sponsorship reference number', 'Proof of English language ability', 'Proof of maintenance funds (GBP 1,270 for 28 days, unless sponsor certifies)', 'Criminal record certificate (if applicable)', 'TB test results (if from listed country)'], processingTimeDays: 21, validityMonths: 60, renewalInfo: 'Can extend and switch. Eligible for Indefinite Leave to Remain (ILR) after 5 years.', fees: { applicationFrom: 719, healthcareSurcharge: 1035, processingCurrency: 'GBP' }, salaryThreshold: 38700, latestUpdates: ['Apr 2024: General salary threshold increased from GBP 26,200 to GBP 38,700', 'Shortage Occupation List replaced by Immigration Salary List', 'Health & Care Worker visa has separate (lower) thresholds'], tips: ['Check if employer has sponsor licence on gov.uk register', 'Healthcare surcharge is per year of visa — budget accordingly', 'After 5 years on Skilled Worker, can apply for permanent residency (ILR)'] },
    { countryCode: 'GB', visaType: 'GLOBAL-TALENT', visaName: 'Global Talent Visa', category: 'WORK', description: 'For leaders or potential leaders in academia, research, arts, or digital technology.', eligibility: ['Endorsement from approved body (Tech Nation for digital tech)', 'Demonstrated exceptional talent or exceptional promise', 'No job offer required', 'No minimum salary'], requiredDocuments: ['Passport', 'Endorsement letter', 'Evidence of achievements in field', 'CV/Resume'], processingTimeDays: 28, validityMonths: 60, renewalInfo: 'Renewable. Can lead to ILR after 3 years (exceptional talent) or 5 years.', fees: { endorsement: 524, visa: 192, healthcareSurcharge: 1035, processingCurrency: 'GBP' }, latestUpdates: ['Tech Nation endorsed route popular for AI/ML engineers', 'Fast track to settlement (3 years for exceptional talent)'], tips: ['Strong GitHub profile, open-source contributions, patents help for tech route', 'No sponsor needed — full work flexibility'] },

    // ── India (minimal — local market) ──
    { countryCode: 'IN', visaType: 'EMPLOYMENT-VISA', visaName: 'Employment Visa', category: 'WORK', description: 'For foreign nationals employed by an Indian company. Not commonly needed as India primarily hires local talent for most roles.', eligibility: ['Job offer from Indian company', 'Minimum salary USD 25,000/year', 'Highly skilled professional', 'Position cannot be filled by Indian national'], requiredDocuments: ['Passport (min 6 months validity)', 'Employment contract', 'Company registration', 'Educational certificates', 'Police clearance', 'Photos'], processingTimeDays: 30, validityMonths: 12, renewalInfo: 'Extendable in-country at FRRO. Annual registration required.', fees: { application: 250, processingCurrency: 'USD' }, salaryThreshold: 25000, latestUpdates: ['Most tech hiring in India is local — massive talent pool', 'E-visa available for short business visits'], tips: ['India has huge local talent pool — work visas mainly for specialized expat roles', 'FRRO registration required within 14 days of arrival'] },
  ];

  for (const rule of visaRulesData) {
    await prisma.visaRule.upsert({
      where: { countryCode_visaType: { countryCode: rule.countryCode, visaType: rule.visaType } },
      update: { latestUpdates: rule.latestUpdates },
      create: rule,
    });
  }
  console.log(`✅ Seeded ${visaRulesData.length} visa rules across ${new Set(visaRulesData.map(r => r.countryCode)).size} countries`);

  // ─── Seed Demo Companies ────────────────────────────────────────────────────
  const companiesData = [
    { id: 'comp-nexus', businessId: bid('COM', '202604', 1), name: 'Nexus Ventures', website: 'https://nexusventures.io', industry: 'Technology', size: '51-200', revenue: '$5M-10M', countryCode: 'MY', city: 'Kuala Lumpur', description: 'AI & ML venture studio building next-gen SaaS products.', techStack: ['Python', 'React', 'AWS', 'Kubernetes'], painPoints: ['Slow hiring pipeline', 'Scaling engineering team'] },
    { id: 'comp-stellar', businessId: bid('COM', '202604', 2), name: 'Stellar Corp', website: 'https://stellarcorp.com', industry: 'FinTech', size: '201-500', revenue: '$10M-50M', countryCode: 'SG', city: 'Singapore', description: 'Digital payments and banking infrastructure for Southeast Asia.', techStack: ['Java', 'React', 'Azure', 'PostgreSQL'], painPoints: ['Compliance hiring', 'Retention issues'] },
    { id: 'comp-greentech', businessId: bid('COM', '202604', 3), name: 'GreenTech Solutions', website: 'https://greentech.my', industry: 'CleanTech', size: '11-50', revenue: '$1M-5M', countryCode: 'MY', city: 'Penang', description: 'IoT-powered smart energy management for commercial buildings.', techStack: ['Node.js', 'React', 'IoT', 'MongoDB'], painPoints: ['Need senior engineers', 'Budget constraints'] },
    { id: 'comp-acme', businessId: bid('COM', '202604', 4), name: 'Acme Digital', website: 'https://acmedigital.co', industry: 'Marketing', size: '11-50', revenue: '$2M-5M', countryCode: 'AU', city: 'Sydney', description: 'Performance marketing agency with AI-driven campaign optimization.', techStack: ['Python', 'Google Ads API', 'BigQuery'], painPoints: ['Client churn', 'Data analyst shortage'] },
    { id: 'comp-medflow', businessId: bid('COM', '202604', 5), name: 'MedFlow Health', website: 'https://medflow.health', industry: 'HealthTech', size: '51-200', revenue: '$5M-10M', countryCode: 'IN', city: 'Bangalore', description: 'Telemedicine platform connecting rural patients with specialists.', techStack: ['Flutter', 'Node.js', 'AWS', 'ML'], painPoints: ['Regulatory compliance', 'Doctor onboarding'] },
  ];

  for (const c of companiesData) {
    await prisma.company.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, tenantId: tenant.id },
    });
  }
  console.log(`✅ Seeded ${companiesData.length} demo companies`);

  // ─── Seed Demo Contacts ─────────────────────────────────────────────────────
  const contactsData = [
    { id: 'cont-sarah', businessId: bid('CNT', '202604', 1), companyId: 'comp-nexus', firstName: 'Sarah', lastName: 'Chen', email: 'sarah.chen@nexusventures.io', phone: '+60-12-345-6789', title: 'Head of Talent', isDecisionMaker: true },
    { id: 'cont-james', businessId: bid('CNT', '202604', 2), companyId: 'comp-stellar', firstName: 'James', lastName: 'Tan', email: 'james.tan@stellarcorp.com', phone: '+65-9123-4567', title: 'VP Engineering', isDecisionMaker: true },
    { id: 'cont-lisa', businessId: bid('CNT', '202604', 3), companyId: 'comp-greentech', firstName: 'Lisa', lastName: 'Ng', email: 'lisa.ng@greentech.my', phone: '+60-11-2233-4455', title: 'CTO', isDecisionMaker: true },
    { id: 'cont-mike', businessId: bid('CNT', '202604', 4), companyId: 'comp-acme', firstName: 'Mike', lastName: 'Reynolds', email: 'mike@acmedigital.co', phone: '+61-4-5678-9012', title: 'Founder & CEO', isDecisionMaker: true },
    { id: 'cont-priya', businessId: bid('CNT', '202604', 5), companyId: 'comp-medflow', firstName: 'Priya', lastName: 'Sharma', email: 'priya@medflow.health', phone: '+91-98765-43210', title: 'COO', isDecisionMaker: true },
  ];

  for (const c of contactsData) {
    await prisma.contact.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, tenantId: tenant.id },
    });
  }
  console.log(`✅ Seeded ${contactsData.length} demo contacts`);

  // ─── Seed ICP Profile ───────────────────────────────────────────────────────
  const icp = await prisma.icpProfile.upsert({
    where: { id: 'icp-default' },
    update: {},
    create: {
      id: 'icp-default',
      tenantId: tenant.id,
      name: 'Tech Companies SEA',
      industries: ['Technology', 'FinTech', 'HealthTech', 'CleanTech'],
      companySizes: ['11-50', '51-200', '201-500'],
      countries: ['MY', 'SG', 'IN', 'AU'],
      titleKeywords: ['CTO', 'VP Engineering', 'Head of Talent', 'CEO', 'COO'],
      painPointKeywords: ['hiring', 'scaling', 'retention', 'pipeline'],
      techStackRequired: ['React', 'Node.js', 'Python', 'AWS'],
      description: 'Tech companies in Southeast Asia with 11-500 employees needing recruitment solutions.',
      isActive: true,
    },
  });
  console.log(`✅ Seeded ICP Profile: ${icp.name}`);

  // ─── Seed Demo Leads ────────────────────────────────────────────────────────
  const leadsData = [
    { id: 'lead-1', businessId: bid('LED', '202604', 1), companyId: 'comp-nexus', contactId: 'cont-sarah', firstName: 'Sarah', lastName: 'Chen', email: 'sarah.chen@nexusventures.io', phone: '+60-12-345-6789', title: 'Head of Talent', stage: 'QUALIFIED' as const, score: 87, icpId: 'icp-default', painPoints: ['Slow hiring pipeline', 'Scaling engineering team'], notes: 'Very interested in AI screening. Wants demo next week.', sourceName: 'LinkedIn' },
    { id: 'lead-2', businessId: bid('LED', '202604', 2), companyId: 'comp-stellar', contactId: 'cont-james', firstName: 'James', lastName: 'Tan', email: 'james.tan@stellarcorp.com', phone: '+65-9123-4567', title: 'VP Engineering', stage: 'PROPOSAL' as const, score: 92, icpId: 'icp-default', painPoints: ['Compliance hiring', 'Retention issues'], notes: 'Sent proposal. Needs SSO and compliance features.', sourceName: 'Referral' },
    { id: 'lead-3', businessId: bid('LED', '202604', 3), companyId: 'comp-greentech', contactId: 'cont-lisa', firstName: 'Lisa', lastName: 'Ng', email: 'lisa.ng@greentech.my', phone: '+60-11-2233-4455', title: 'CTO', stage: 'CONTACTED' as const, score: 74, icpId: 'icp-default', painPoints: ['Need senior engineers', 'Budget constraints'], notes: 'Small team but growing. Budget-conscious.', sourceName: 'Website' },
    { id: 'lead-4', businessId: bid('LED', '202604', 4), companyId: 'comp-acme', contactId: 'cont-mike', firstName: 'Mike', lastName: 'Reynolds', email: 'mike@acmedigital.co', phone: '+61-4-5678-9012', title: 'Founder & CEO', stage: 'NEW' as const, score: 65, icpId: 'icp-default', painPoints: ['Client churn', 'Data analyst shortage'], notes: 'Inbound from pricing page.', sourceName: 'Website' },
    { id: 'lead-5', businessId: bid('LED', '202604', 5), companyId: 'comp-medflow', contactId: 'cont-priya', firstName: 'Priya', lastName: 'Sharma', email: 'priya@medflow.health', phone: '+91-98765-43210', title: 'COO', stage: 'NEGOTIATION' as const, score: 95, icpId: 'icp-default', painPoints: ['Regulatory compliance', 'Doctor onboarding'], notes: 'Ready to sign. Negotiating annual vs monthly.', sourceName: 'Cold Outreach' },
    { id: 'lead-6', businessId: bid('LED', '202604', 6), firstName: 'Ahmad', lastName: 'Hassan', email: 'ahmad@techstartup.my', title: 'Founder', stage: 'NEW' as const, score: 55, painPoints: ['No ATS', 'Manual screening'], notes: 'Early stage startup, 5 employees.', sourceName: 'LinkedIn' },
    { id: 'lead-7', businessId: bid('LED', '202604', 7), firstName: 'Wei Lin', lastName: 'Tan', email: 'weilin@datawave.sg', title: 'HR Director', stage: 'QUALIFIED' as const, score: 81, painPoints: ['High volume hiring', 'Slow time-to-hire'], notes: 'Hiring 30+ per month. Current ATS is too slow.', sourceName: 'Referral' },
    { id: 'lead-8', businessId: bid('LED', '202604', 8), firstName: 'Rachel', lastName: 'Wong', email: 'rachel@cloudnine.com.au', title: 'People & Culture Lead', stage: 'CONTACTED' as const, score: 70, painPoints: ['DEI tracking', 'Candidate experience'], notes: 'Wants better candidate experience tools.', sourceName: 'Website' },
  ];

  for (const l of leadsData) {
    await prisma.lead.upsert({
      where: { id: l.id },
      update: {},
      create: { ...l, tenantId: tenant.id, isActive: true },
    });
  }
  console.log(`✅ Seeded ${leadsData.length} demo leads`);

  // ─── Seed Demo Jobs ─────────────────────────────────────────────────────────
  const jobsData = [
    {
      id: 'job-swe', businessId: bid('JOB', '202604', 1), title: 'Senior Software Engineer', department: 'Engineering', location: 'Kuala Lumpur, Malaysia', countryCode: 'MY',
      jobType: 'Full-time', salaryMin: 12000, salaryMax: 18000, currency: 'MYR',
      description: 'We are looking for a Senior Software Engineer to join our platform team. You will design and build scalable microservices, mentor junior engineers, and drive technical decisions.\n\nResponsibilities:\n- Design and implement RESTful APIs and microservices\n- Lead code reviews and mentor junior developers\n- Collaborate with product team on technical requirements\n- Optimize application performance and reliability\n\nRequirements:\n- 5+ years of experience in Node.js, TypeScript, or Python\n- Strong experience with PostgreSQL, Redis, and Docker\n- Experience with cloud platforms (AWS/Azure/GCP)\n- Good communication skills',
      requirements: ['5+ years Node.js/TypeScript/Python', 'PostgreSQL & Redis', 'Docker & Kubernetes', 'Cloud platforms', 'REST API design'],
      skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS', 'Redis', 'REST API'],
      experience: '5-8 years', educationLevel: 'Bachelor',
    },
    {
      id: 'job-fe', businessId: bid('JOB', '202604', 2), title: 'Frontend Developer (React)', department: 'Engineering', location: 'Remote (APAC)', countryCode: 'MY',
      jobType: 'Full-time', salaryMin: 8000, salaryMax: 14000, currency: 'MYR',
      description: 'Join our frontend team to build beautiful, performant user interfaces with React and Next.js.\n\nResponsibilities:\n- Build responsive UI components with React/Next.js\n- Implement pixel-perfect designs from Figma\n- Write unit tests and integration tests\n- Collaborate with backend engineers on API integration\n\nRequirements:\n- 3+ years React experience\n- Proficiency in TypeScript, Tailwind CSS\n- Experience with Next.js, state management (Zustand/Redux)\n- Understanding of web performance optimization',
      requirements: ['3+ years React', 'TypeScript', 'Tailwind CSS', 'Next.js', 'State Management'],
      skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'JavaScript', 'HTML/CSS'],
      experience: '3-5 years', educationLevel: 'Bachelor',
    },
    {
      id: 'job-ds', businessId: bid('JOB', '202604', 3), title: 'Data Scientist', department: 'AI/ML', location: 'Singapore', countryCode: 'SG',
      jobType: 'Full-time', salaryMin: 8000, salaryMax: 12000, currency: 'SGD',
      description: 'We need a Data Scientist to build and deploy ML models for our recruitment AI.\n\nResponsibilities:\n- Build NLP models for resume parsing and job matching\n- Develop scoring algorithms for candidate-job fit\n- Analyse recruitment pipeline data for insights\n- Deploy models via REST APIs\n\nRequirements:\n- MSc/PhD in Computer Science, Statistics, or related field\n- Strong Python, scikit-learn, PyTorch/TensorFlow\n- Experience with NLP and text classification\n- SQL proficiency',
      requirements: ['MSc/PhD in CS/Statistics', 'Python', 'ML/NLP', 'PyTorch or TensorFlow', 'SQL'],
      skills: ['Python', 'Machine Learning', 'NLP', 'PyTorch', 'TensorFlow', 'SQL', 'scikit-learn'],
      experience: '3-6 years', educationLevel: 'Master',
    },
    {
      id: 'job-pm', businessId: bid('JOB', '202604', 4), title: 'Product Manager', department: 'Product', location: 'Kuala Lumpur, Malaysia', countryCode: 'MY',
      jobType: 'Full-time', salaryMin: 10000, salaryMax: 16000, currency: 'MYR',
      description: 'Lead product strategy and roadmap for our recruitment automation platform.\n\nResponsibilities:\n- Define product vision and roadmap\n- Gather requirements from customers and stakeholders\n- Work with engineering and design teams\n- Analyse metrics and drive product decisions\n\nRequirements:\n- 4+ years product management experience in B2B SaaS\n- Experience with recruitment/HR tech is a plus\n- Strong analytical and communication skills\n- Familiarity with agile methodologies',
      requirements: ['4+ years PM in B2B SaaS', 'Data-driven decision making', 'Agile methodologies', 'Stakeholder management'],
      skills: ['Product Management', 'B2B SaaS', 'Agile', 'Data Analysis', 'User Research'],
      experience: '4-7 years', educationLevel: 'Bachelor',
    },
    {
      id: 'job-sales', businessId: bid('JOB', '202604', 5), title: 'Business Development Rep', department: 'Sales', location: 'Remote (APAC)', countryCode: 'MY',
      jobType: 'Full-time', salaryMin: 5000, salaryMax: 8000, currency: 'MYR',
      description: 'Drive outbound sales for our AI recruitment platform across APAC.\n\nResponsibilities:\n- Identify and qualify new business opportunities\n- Run outbound email and LinkedIn campaigns\n- Book demos and manage pipeline in CRM\n- Collaborate with marketing on lead generation\n\nRequirements:\n- 2+ years B2B SaaS sales experience\n- Experience with CRM tools (HubSpot, Salesforce)\n- Strong communication and presentation skills\n- Self-motivated with proven track record',
      requirements: ['2+ years B2B sales', 'CRM experience', 'Communication skills', 'Self-motivated'],
      skills: ['B2B Sales', 'CRM', 'Cold Outreach', 'LinkedIn', 'Pipeline Management'],
      experience: '2-4 years', educationLevel: 'Bachelor',
    },
  ];

  for (const j of jobsData) {
    await prisma.job.upsert({
      where: { id: j.id },
      update: {},
      create: { ...j, tenantId: tenant.id, isActive: true },
    });
  }
  console.log(`✅ Seeded ${jobsData.length} demo jobs`);

  // ─── Seed Demo Candidates ──────────────────────────────────────────────────
  const candidatesData = [
    { id: 'cand-1', businessId: bid('CAN', '202604', 1), firstName: 'Arun', lastName: 'Kumar', email: 'arun.kumar@gmail.com', phone: '+60-12-8765-4321', currentTitle: 'Senior Software Engineer', currentCompany: 'Grab', location: 'Kuala Lumpur, MY', countryCode: 'MY', yearsExperience: 6, skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS', 'Redis', 'GraphQL'], languages: ['English', 'Malay', 'Tamil'], summary: 'Full-stack engineer with 6 years building scalable microservices at Grab. Led migration of monolith to microservices serving 5M+ users.', nationality: 'Indian', visaType: 'EP-I', visaExpiry: new Date('2027-06-15'), visaStatus: 'VALID', isForeigner: true },
    { id: 'cand-2', businessId: bid('CAN', '202604', 2), firstName: 'Mei Ling', lastName: 'Wong', email: 'meiling.wong@outlook.com', phone: '+60-11-3456-7890', currentTitle: 'Frontend Developer', currentCompany: 'Wise', location: 'Penang, MY', countryCode: 'MY', yearsExperience: 4, skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'JavaScript', 'Figma'], languages: ['English', 'Mandarin', 'Malay'], summary: 'Creative frontend developer passionate about UX. Built Wise\'s partner onboarding portal used by 200+ businesses.', nationality: 'Malaysian', visaStatus: 'CITIZEN', isForeigner: false },
    { id: 'cand-3', businessId: bid('CAN', '202604', 3), firstName: 'Rajesh', lastName: 'Patel', email: 'rajesh.patel@yahoo.com', phone: '+91-98765-12345', currentTitle: 'Data Scientist', currentCompany: 'Flipkart', location: 'Bangalore, IN', countryCode: 'IN', yearsExperience: 5, skills: ['Python', 'Machine Learning', 'NLP', 'PyTorch', 'SQL', 'scikit-learn', 'TensorFlow'], languages: ['English', 'Hindi', 'Gujarati'], summary: 'Data scientist specializing in NLP. Built Flipkart\'s product recommendation engine increasing CTR by 23%.', nationality: 'Indian', visaStatus: 'CITIZEN', isForeigner: false },
    { id: 'cand-4', businessId: bid('CAN', '202604', 4), firstName: 'Sophie', lastName: 'Taylor', email: 'sophie.taylor@google.com', phone: '+65-8123-4567', currentTitle: 'Product Manager', currentCompany: 'Google', location: 'Singapore', countryCode: 'SG', yearsExperience: 7, skills: ['Product Management', 'B2B SaaS', 'Agile', 'Data Analysis', 'User Research', 'SQL'], languages: ['English'], summary: 'Senior PM at Google Cloud. Led launch of 3 B2B SaaS products from 0\u21921. Strong in data-driven decision making.', nationality: 'Australian', visaType: 'EP', visaExpiry: new Date('2027-09-30'), visaStatus: 'VALID', isForeigner: true },
    { id: 'cand-5', businessId: bid('CAN', '202604', 5), firstName: 'Ahmad', lastName: 'Ibrahim', email: 'ahmad.ibrahim@live.com', phone: '+60-13-9876-5432', currentTitle: 'DevOps Engineer', currentCompany: 'AirAsia', location: 'Kuala Lumpur, MY', countryCode: 'MY', yearsExperience: 4, skills: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Linux', 'Python'], languages: ['English', 'Malay'], summary: 'DevOps engineer managing 200+ microservices at AirAsia. Reduced deployment time by 70% with GitOps.', nationality: 'Malaysian', visaStatus: 'CITIZEN', isForeigner: false },
    { id: 'cand-6', businessId: bid('CAN', '202604', 6), firstName: 'Emily', lastName: 'Zhang', email: 'emily.zhang@microsoft.com', phone: '+61-4-1234-5678', currentTitle: 'Full Stack Developer', currentCompany: 'Microsoft', location: 'Sydney, AU', countryCode: 'AU', yearsExperience: 5, skills: ['React', 'Node.js', 'TypeScript', 'Azure', 'PostgreSQL', 'C#', '.NET'], languages: ['English', 'Mandarin'], summary: 'Full stack dev at Microsoft Teams. Expert in React and .NET ecosystem. Speaker at JSConf Australia.', nationality: 'Chinese', visaType: '482', visaExpiry: new Date('2027-03-15'), visaStatus: 'VALID', isForeigner: true },
    { id: 'cand-7', businessId: bid('CAN', '202604', 7), firstName: 'Muhammad', lastName: 'Ali', email: 'muhammad.ali@hotmail.com', phone: '+60-14-5678-1234', currentTitle: 'Junior Developer', currentCompany: 'Local startup', location: 'Johor Bahru, MY', countryCode: 'MY', yearsExperience: 1, skills: ['JavaScript', 'React', 'HTML/CSS', 'Node.js'], languages: ['English', 'Malay'], summary: 'Fresh graduate from UTM. Built 3 projects during internship. Eager to learn and grow in a fast-paced environment.', nationality: 'Malaysian', visaStatus: 'CITIZEN', isForeigner: false },
    { id: 'cand-8', businessId: bid('CAN', '202604', 8), firstName: 'Priyanka', lastName: 'Nair', email: 'priyanka.nair@infosys.com', phone: '+91-87654-32109', currentTitle: 'Business Development Manager', currentCompany: 'Infosys', location: 'Chennai, IN', countryCode: 'IN', yearsExperience: 3, skills: ['B2B Sales', 'CRM', 'Cold Outreach', 'LinkedIn', 'Pipeline Management', 'Salesforce'], languages: ['English', 'Hindi', 'Tamil'], summary: 'Top BDR at Infosys, exceeded quota by 140% for 6 consecutive quarters. Expert in SaaS sales cycles.', nationality: 'Indian', visaStatus: 'CITIZEN', isForeigner: false },
    { id: 'cand-9', businessId: bid('CAN', '202604', 9), firstName: 'Daniel', lastName: 'Lee', email: 'daniel.lee@grab.com', phone: '+65-9876-5432', currentTitle: 'Senior Backend Engineer', currentCompany: 'Grab', location: 'Singapore', countryCode: 'SG', yearsExperience: 8, skills: ['Go', 'Node.js', 'PostgreSQL', 'Kafka', 'Docker', 'Kubernetes', 'AWS'], languages: ['English', 'Mandarin'], summary: '8 years at Grab, principal backend engineer. Designed real-time payment processing handling 10K TPS.', nationality: 'Singaporean', visaStatus: 'CITIZEN', isForeigner: false },
    { id: 'cand-10', businessId: bid('CAN', '202604', 10), firstName: 'Fatimah', lastName: 'Abdullah', email: 'fatimah@deloitte.com', phone: '+60-17-8765-4321', currentTitle: 'ML Engineer', currentCompany: 'Deloitte', location: 'Kuala Lumpur, MY', countryCode: 'MY', yearsExperience: 4, skills: ['Python', 'Machine Learning', 'NLP', 'AWS SageMaker', 'SQL', 'Docker'], languages: ['English', 'Malay', 'Arabic'], summary: 'ML engineer building NLP solutions for document processing at Deloitte. Published 2 papers on text classification.', nationality: 'Malaysian', visaStatus: 'CITIZEN', isForeigner: false },
  ];

  for (const c of candidatesData) {
    await prisma.candidate.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, tenantId: tenant.id, isActive: true },
    });
  }
  console.log(`✅ Seeded ${candidatesData.length} demo candidates`);

  // ─── Seed Demo Resumes (text-based for screening) ──────────────────────────
  const resumesData = [
    { id: 'res-1', businessId: bid('RES', '202604', 1), candidateId: 'cand-1', fileName: 'Arun_Kumar_Resume.pdf', fileUrl: '/uploads/resumes/arun_kumar.pdf', mimeType: 'application/pdf', isPrimary: true, rawText: 'ARUN KUMAR\nSenior Software Engineer\narun.kumar@gmail.com | +60-12-8765-4321 | KL, Malaysia\n\nSUMMARY\n6 years building scalable microservices. Led Grab\'s monolith-to-microservice migration serving 5M+ users.\n\nEXPERIENCE\nSenior Software Engineer — Grab (2021-Present)\n- Designed event-driven architecture processing 2M+ events/day\n- Built Node.js microservices with TypeScript, PostgreSQL, Redis\n- Mentored 4 junior engineers, led code reviews\n- Reduced API latency by 40% through caching optimization\n\nSoftware Engineer — Petronas Digital (2019-2021)\n- Built REST APIs for internal workflow automation\n- Implemented CI/CD pipelines with Docker and Jenkins\n- Developed real-time dashboards with React\n\nSKILLS\nNode.js, TypeScript, PostgreSQL, Docker, AWS, Redis, GraphQL, Kafka, Python\n\nEDUCATION\nBSc Computer Science — University of Malaya (2018)' },
    { id: 'res-2', businessId: bid('RES', '202604', 2), candidateId: 'cand-2', fileName: 'MeiLing_Wong_CV.pdf', fileUrl: '/uploads/resumes/meiling_wong.pdf', mimeType: 'application/pdf', isPrimary: true, rawText: 'MEI LING WONG\nFrontend Developer\nmeiling.wong@outlook.com | +60-11-3456-7890 | Penang, MY\n\nSUMMARY\nCreative frontend developer with 4 years experience. Built Wise\'s partner portal used by 200+ businesses.\n\nEXPERIENCE\nFrontend Developer — Wise (2022-Present)\n- Built partner onboarding portal with React, Next.js, Tailwind CSS\n- Implemented design system with 50+ reusable components\n- Improved Lighthouse score from 65 to 94\n\nJunior Frontend Developer — Fusionex (2020-2022)\n- Developed data visualization dashboards\n- Migrated jQuery codebase to React\n\nSKILLS\nReact, TypeScript, Next.js, Tailwind CSS, JavaScript, Figma, HTML/CSS, Jest\n\nEDUCATION\nBSc Software Engineering — USM (2020)' },
    { id: 'res-3', businessId: bid('RES', '202604', 3), candidateId: 'cand-3', fileName: 'Rajesh_Patel_Resume.pdf', fileUrl: '/uploads/resumes/rajesh_patel.pdf', mimeType: 'application/pdf', isPrimary: true, rawText: 'RAJESH PATEL\nData Scientist\nrajesh.patel@yahoo.com | +91-98765-12345 | Bangalore, IN\n\nSUMMARY\nData scientist with 5 years experience specializing in NLP. Built Flipkart\'s product recommendation engine.\n\nEXPERIENCE\nSenior Data Scientist — Flipkart (2021-Present)\n- Built NLP-based product recommendation engine (CTR +23%)\n- Developed text classification models for customer support routing\n- Led team of 3 data scientists\n\nData Scientist — TCS (2019-2021)\n- Built predictive models for supply chain optimization\n- Implemented sentiment analysis pipeline\n\nSKILLS\nPython, PyTorch, TensorFlow, NLP, scikit-learn, SQL, Spark, Pandas\n\nEDUCATION\nMSc Data Science — IIT Bangalore (2019)\nBSc Mathematics — Delhi University (2017)' },
    { id: 'res-4', businessId: bid('RES', '202604', 4), candidateId: 'cand-4', fileName: 'Sophie_Taylor_CV.pdf', fileUrl: '/uploads/resumes/sophie_taylor.pdf', mimeType: 'application/pdf', isPrimary: true, rawText: 'SOPHIE TAYLOR\nSenior Product Manager\nsophie.taylor@google.com | +65-8123-4567 | Singapore\n\nSUMMARY\n7 years as PM. Led launch of 3 B2B SaaS products at Google Cloud from 0→1.\n\nEXPERIENCE\nSenior Product Manager — Google Cloud (2021-Present)\n- Led Cloud Talent Solution from concept to $10M ARR\n- Managed roadmap for AI-powered recruitment tools\n- Ran 50+ customer discovery interviews per quarter\n\nProduct Manager — Slack (2019-2021)\n- Launched Slack Connect, driving 25% MRR growth\n- Data-driven A/B testing improving activation by 18%\n\nSKILLS\nProduct Management, B2B SaaS, Agile, User Research, SQL, Data Analysis\n\nEDUCATION\nMBA — INSEAD (2019)\nBSc Computer Science — NUS (2015)' },
    { id: 'res-5', businessId: bid('RES', '202604', 5), candidateId: 'cand-8', fileName: 'Priyanka_Nair_CV.pdf', fileUrl: '/uploads/resumes/priyanka_nair.pdf', mimeType: 'application/pdf', isPrimary: true, rawText: 'PRIYANKA NAIR\nBusiness Development Manager\npriyanka.nair@infosys.com | +91-87654-32109 | Chennai, IN\n\nSUMMARY\nTop BDR at Infosys. Exceeded quota 140% for 6 consecutive quarters.\n\nEXPERIENCE\nBusiness Development Manager — Infosys (2023-Present)\n- Managed $2M+ pipeline across APAC\n- Closed 15 enterprise deals (avg deal size $80K)\n- Built outbound playbook adopted by 20-person team\n\nBDR — Zoho (2021-2023)\n- Booked 200+ qualified demos\n- Top performer 4/8 quarters\n\nSKILLS\nB2B Sales, Salesforce, LinkedIn Sales Navigator, Cold Outreach, Pipeline Management\n\nEDUCATION\nBBA — Anna University (2021)' },
  ];

  for (const r of resumesData) {
    await prisma.resume.upsert({
      where: { id: r.id },
      update: {},
      create: r,
    });
  }
  console.log(`✅ Seeded ${resumesData.length} demo resumes`);

  // ─── Seed Demo Applications ─────────────────────────────────────────────────
  const applicationsData = [
    { id: 'app-1', businessId: bid('APP', '202604', 1), tenantId: tenant.id, candidateId: 'cand-1', jobId: 'job-swe', stage: 'INTERVIEWING' as const, matchScore: 92, isShortlisted: true, isInterview: true, scoreDetails: { skill_match: 95, experience_match: 90, education_match: 85 } },
    { id: 'app-2', businessId: bid('APP', '202604', 2), tenantId: tenant.id, candidateId: 'cand-2', jobId: 'job-fe', stage: 'SCREENED' as const, matchScore: 88, isShortlisted: true, scoreDetails: { skill_match: 92, experience_match: 85, education_match: 80 } },
    { id: 'app-3', businessId: bid('APP', '202604', 3), tenantId: tenant.id, candidateId: 'cand-3', jobId: 'job-ds', stage: 'OFFERED' as const, matchScore: 95, isShortlisted: true, isInterview: true, scoreDetails: { skill_match: 98, experience_match: 92, education_match: 95 } },
    { id: 'app-4', businessId: bid('APP', '202604', 4), tenantId: tenant.id, candidateId: 'cand-4', jobId: 'job-pm', stage: 'INTERVIEWING' as const, matchScore: 90, isShortlisted: true, isInterview: true, scoreDetails: { skill_match: 88, experience_match: 95, education_match: 90 } },
    { id: 'app-5', businessId: bid('APP', '202604', 5), tenantId: tenant.id, candidateId: 'cand-5', jobId: 'job-swe', stage: 'SCREENED' as const, matchScore: 72, isShortlisted: false, scoreDetails: { skill_match: 70, experience_match: 75, education_match: 70 } },
    { id: 'app-6', businessId: bid('APP', '202604', 6), tenantId: tenant.id, candidateId: 'cand-6', jobId: 'job-fe', stage: 'SOURCED' as const, matchScore: null, scoreDetails: Prisma.DbNull },
    { id: 'app-7', businessId: bid('APP', '202604', 7), tenantId: tenant.id, candidateId: 'cand-7', jobId: 'job-fe', stage: 'REJECTED' as const, matchScore: 35, scoreDetails: { skill_match: 40, experience_match: 20, education_match: 50 } },
    { id: 'app-8', businessId: bid('APP', '202604', 8), tenantId: tenant.id, candidateId: 'cand-8', jobId: 'job-sales', stage: 'PLACED' as const, matchScore: 94, isShortlisted: true, isInterview: true, scoreDetails: { skill_match: 96, experience_match: 92, education_match: 85 } },
    { id: 'app-9', businessId: bid('APP', '202604', 9), tenantId: tenant.id, candidateId: 'cand-9', jobId: 'job-swe', stage: 'SCREENED' as const, matchScore: 85, isShortlisted: true, scoreDetails: { skill_match: 80, experience_match: 95, education_match: 80 } },
    { id: 'app-10', businessId: bid('APP', '202604', 10), tenantId: tenant.id, candidateId: 'cand-10', jobId: 'job-ds', stage: 'SCREENED' as const, matchScore: 82, isShortlisted: true, scoreDetails: { skill_match: 85, experience_match: 78, education_match: 82 } },
  ];

  for (const a of applicationsData) {
    await prisma.application.upsert({
      where: { id: a.id },
      update: {},
      create: a,
    });
  }
  console.log(`✅ Seeded ${applicationsData.length} demo applications`);

  // ─── Seed Scorecards ────────────────────────────────────────────────────────
  const scorecardsData = [
    { id: 'sc-1', tenantId: tenant.id, candidateId: 'cand-1', jobId: 'job-swe', score: 92, maxScore: 100, breakdown: { skill_match: 95, experience_match: 90, education_match: 85, communication: 90 }, explanation: 'Excellent fit — strong Node.js/TypeScript experience at Grab directly maps to our stack.', aiGenerated: true },
    { id: 'sc-2', tenantId: tenant.id, candidateId: 'cand-2', jobId: 'job-fe', score: 88, maxScore: 100, breakdown: { skill_match: 92, experience_match: 85, education_match: 80, portfolio: 90 }, explanation: 'Strong React/Next.js skills with production experience at Wise. Good cultural fit.', aiGenerated: true },
    { id: 'sc-3', tenantId: tenant.id, candidateId: 'cand-3', jobId: 'job-ds', score: 95, maxScore: 100, breakdown: { skill_match: 98, experience_match: 92, education_match: 95, research: 94 }, explanation: 'Top candidate — MSc with strong NLP focus, recommendation engine experience directly relevant.', aiGenerated: true },
    { id: 'sc-4', tenantId: tenant.id, candidateId: 'cand-4', jobId: 'job-pm', score: 90, maxScore: 100, breakdown: { skill_match: 88, experience_match: 95, education_match: 90, leadership: 92 }, explanation: 'Strong PM with Google Cloud experience. B2B SaaS 0→1 track record matches our needs.', aiGenerated: true },
    { id: 'sc-5', tenantId: tenant.id, candidateId: 'cand-8', jobId: 'job-sales', score: 94, maxScore: 100, breakdown: { skill_match: 96, experience_match: 92, education_match: 85, hustle: 98 }, explanation: 'Outstanding track record — 140% quota attainment at Infosys. Perfect for BDR role.', aiGenerated: true },
  ];

  for (const s of scorecardsData) {
    await prisma.scorecard.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }
  console.log(`✅ Seeded ${scorecardsData.length} AI scorecards`);

  // ─── Seed Activities / Timeline ─────────────────────────────────────────────
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
  
  const activitiesData = [
    { id: 'act-1', businessId: bid('ACT', '202604', 1), tenantId: tenant.id, userId: admin.id, candidateId: 'cand-1', type: 'IMPORT' as const, title: 'Candidate imported', description: 'Imported from CSV upload', createdAt: daysAgo(14) },
    { id: 'act-2', businessId: bid('ACT', '202604', 2), tenantId: tenant.id, userId: admin.id, candidateId: 'cand-1', type: 'AI_ANALYSIS' as const, title: 'AI screening completed', description: 'Score: 92/100 — Strong Shortlist. Excellent Node.js/TypeScript match.', createdAt: daysAgo(13) },
    { id: 'act-3', businessId: bid('ACT', '202604', 3), tenantId: tenant.id, userId: admin.id, candidateId: 'cand-1', type: 'STAGE_CHANGE' as const, title: 'Moved to Interviewing', description: 'Auto-promoted after AI screening score > 85.', createdAt: daysAgo(12) },
    { id: 'act-4', businessId: bid('ACT', '202604', 4), tenantId: tenant.id, userId: admin.id, candidateId: 'cand-1', type: 'NOTE' as const, title: 'Recruiter note', description: 'Great communication in phone screen. Available to start in 2 weeks.', createdAt: daysAgo(10) },
    { id: 'act-5', businessId: bid('ACT', '202604', 5), tenantId: tenant.id, userId: admin.id, candidateId: 'cand-3', type: 'AI_ANALYSIS' as const, title: 'AI screening completed', description: 'Score: 95/100 — Strong Shortlist. Top candidate for Data Scientist role.', createdAt: daysAgo(11) },
    { id: 'act-6', businessId: bid('ACT', '202604', 6), tenantId: tenant.id, userId: admin.id, candidateId: 'cand-3', type: 'STAGE_CHANGE' as const, title: 'Offered', description: 'Extended offer after final round interview.', createdAt: daysAgo(5) },
    { id: 'act-7', businessId: bid('ACT', '202604', 7), tenantId: tenant.id, userId: admin.id, leadId: 'lead-2', type: 'EMAIL_SENT' as const, title: 'Proposal sent', description: 'Sent pricing proposal to James Tan at Stellar Corp.', createdAt: daysAgo(7) },
    { id: 'act-8', businessId: bid('ACT', '202604', 8), tenantId: tenant.id, userId: admin.id, leadId: 'lead-5', type: 'MEETING' as const, title: 'Demo call', description: 'Conducted product demo for MedFlow Health team. Very positive response.', createdAt: daysAgo(3) },
    { id: 'act-9', businessId: bid('ACT', '202604', 9), tenantId: tenant.id, userId: admin.id, leadId: 'lead-1', type: 'CALL' as const, title: 'Discovery call', description: 'Discussed pain points with Sarah Chen. They need AI screening ASAP.', createdAt: daysAgo(9) },
    { id: 'act-10', businessId: bid('ACT', '202604', 10), tenantId: tenant.id, userId: admin.id, candidateId: 'cand-8', type: 'STAGE_CHANGE' as const, title: 'Placed', description: 'Priyanka accepted the BDR offer. Start date: March 25.', createdAt: daysAgo(2) },
    { id: 'act-11', businessId: bid('ACT', '202604', 11), tenantId: tenant.id, userId: admin.id, type: 'IMPORT' as const, title: 'Bulk import completed', description: '10 candidates imported from CSV file. 0 duplicates.', createdAt: daysAgo(14) },
    { id: 'act-12', businessId: bid('ACT', '202604', 12), tenantId: tenant.id, userId: admin.id, candidateId: 'cand-2', type: 'OUTREACH_SENT' as const, title: 'Outreach email sent', description: 'AI-generated introduction email about Frontend Developer role.', createdAt: daysAgo(8) },
  ];

  for (const a of activitiesData) {
    await prisma.activity.upsert({
      where: { id: a.id },
      update: {},
      create: a,
    });
  }
  console.log(`✅ Seeded ${activitiesData.length} activities`);

  // ─── Seed Outreach Messages ─────────────────────────────────────────────────
  const outreachData = [
    { id: 'out-1', businessId: bid('OUT', '202604', 1), tenantId: tenant.id, candidateId: 'cand-1', subject: 'Exciting Senior SWE opportunity at SRP AI Labs', body: 'Hi Arun,\n\nI came across your impressive background at Grab — your work on microservices migration is exactly what we need. We\'re building an AI-powered recruitment platform and looking for a Senior Software Engineer.\n\nWould you be open to a quick 15-min chat this week?\n\nBest,\nSRP Recruiting', status: 'SENT' as const, channel: 'email', aiGenerated: true, sentAt: daysAgo(12) },
    { id: 'out-2', businessId: bid('OUT', '202604', 2), tenantId: tenant.id, candidateId: 'cand-2', subject: 'Frontend Developer Role — Perfect for your React/Next.js skills', body: 'Hi Mei Ling,\n\nYour work at Wise on the partner portal caught my eye. We\'re looking for a talented Frontend Developer to build our next-gen UI with React and Next.js.\n\nInterested in learning more?\n\nCheers,\nSRP Recruiting', status: 'REPLIED' as const, channel: 'email', aiGenerated: true, sentAt: daysAgo(8), repliedAt: daysAgo(7) },
    { id: 'out-3', businessId: bid('OUT', '202604', 3), tenantId: tenant.id, leadId: 'lead-1', subject: 'AI-powered recruitment for Nexus Ventures', body: 'Hi Sarah,\n\nI noticed Nexus Ventures is scaling fast. Our AI screening tool can process 100+ resumes in minutes and auto-rank candidates against your requirements.\n\nWould a 20-min demo work this Thursday?\n\nBest,\nSRP AI Labs', status: 'SENT' as const, channel: 'email', aiGenerated: true, sentAt: daysAgo(9) },
    { id: 'out-4', businessId: bid('OUT', '202604', 4), tenantId: tenant.id, leadId: 'lead-5', subject: 'Following up on MedFlow Health demo', body: 'Hi Priya,\n\nThanks for the great demo session. As discussed, I\'ve prepared the annual pricing proposal with the compliance features your team needs.\n\nPlease find attached. Happy to jump on a call to discuss.\n\nBest,\nSRP AI Labs', status: 'REPLIED' as const, channel: 'email', aiGenerated: false, sentAt: daysAgo(2), repliedAt: daysAgo(1) },
  ];

  for (const o of outreachData) {
    await prisma.outreachMessage.upsert({
      where: { id: o.id },
      update: {},
      create: o,
    });
  }
  console.log(`✅ Seeded ${outreachData.length} outreach messages`);

  // ─── Seed AI Usage Logs ─────────────────────────────────────────────────────
  const aiUsageData = [];
  const serviceTypes = ['RESUME_PARSER', 'CANDIDATE_SCORING', 'LEAD_SCORING', 'OUTREACH_GENERATION', 'JD_PARSER'] as const;
  for (let d = 0; d < 30; d++) {
    const numCalls = Math.floor(Math.random() * 5) + 1;
    for (let c = 0; c < numCalls; c++) {
      const st = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
      aiUsageData.push({
        tenantId: tenant.id,
        serviceType: st,
        model: 'openai/gpt-4.1-mini',
        tokensInput: Math.floor(Math.random() * 2000) + 500,
        tokensOutput: Math.floor(Math.random() * 1000) + 200,
        cost: parseFloat((Math.random() * 0.05 + 0.005).toFixed(4)),
        createdAt: daysAgo(d),
      });
    }
  }

  await prisma.aiUsageLog.createMany({ data: aiUsageData, skipDuplicates: true });
  console.log(`✅ Seeded ${aiUsageData.length} AI usage log entries`);

  // ─── Seed Demo Import Record ────────────────────────────────────────────────
  await prisma.sourceImport.upsert({
    where: { id: 'import-demo-1' },
    update: {},
    create: {
      id: 'import-demo-1',
      tenantId: tenant.id,
      name: 'Initial Candidate Import',
      source: 'CSV',
      status: 'COMPLETED',
      totalRows: 10,
      successRows: 10,
      failedRows: 0,
      duplicateRows: 0,
      importType: 'candidate',
      importedById: admin.id,
    },
  });
  await prisma.sourceImport.upsert({
    where: { id: 'import-demo-2' },
    update: {},
    create: {
      id: 'import-demo-2',
      tenantId: tenant.id,
      name: 'Lead List from LinkedIn',
      source: 'CSV',
      status: 'COMPLETED',
      totalRows: 8,
      successRows: 8,
      failedRows: 0,
      duplicateRows: 0,
      importType: 'lead',
      importedById: admin.id,
    },
  });
  console.log(`✅ Seeded 2 demo import records`);

  // ─── Seed Workflow Runs ─────────────────────────────────────────────────────
  const workflowData = [
    { id: 'wf-1', businessId: bid('WFR', '202604', 1), tenantId: tenant.id, workflowType: 'CANDIDATE_IMPORTED' as const, status: 'SUCCESS' as const, triggeredBy: 'system', startedAt: daysAgo(14), completedAt: daysAgo(14) },
    { id: 'wf-2', businessId: bid('WFR', '202604', 2), tenantId: tenant.id, workflowType: 'LEAD_IMPORTED' as const, status: 'SUCCESS' as const, triggeredBy: 'system', startedAt: daysAgo(14), completedAt: daysAgo(14) },
    { id: 'wf-3', businessId: bid('WFR', '202604', 3), tenantId: tenant.id, workflowType: 'OUTREACH_DRAFT_GENERATION' as const, status: 'SUCCESS' as const, triggeredBy: admin.id, startedAt: daysAgo(12), completedAt: daysAgo(12) },
    { id: 'wf-4', businessId: bid('WFR', '202604', 4), tenantId: tenant.id, workflowType: 'SCHEDULED_ENRICHMENT' as const, status: 'SUCCESS' as const, triggeredBy: 'cron', startedAt: daysAgo(7), completedAt: daysAgo(7) },
    { id: 'wf-5', businessId: bid('WFR', '202604', 5), tenantId: tenant.id, workflowType: 'FOLLOW_UP_REMINDER' as const, status: 'RUNNING' as const, triggeredBy: 'cron', startedAt: new Date() },
  ];

  for (const w of workflowData) {
    await prisma.workflowRun.upsert({
      where: { id: w.id },
      update: {},
      create: w,
    });
  }
  console.log(`✅ Seeded ${workflowData.length} workflow runs`);

  console.log('\n✨ Database seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log(`   Email: admin@srp-ai-labs.com`);
  console.log(`   Password: Admin@123`);
  console.log(`\n📊 Demo Data Summary:`);
  console.log(`   ${companiesData.length} companies, ${contactsData.length} contacts`);
  console.log(`   ${leadsData.length} leads (with ICP scores)`);
  console.log(`   ${jobsData.length} job postings (with JDs)`);
  console.log(`   ${candidatesData.length} candidates`);
  console.log(`   ${resumesData.length} resumes (with raw text for AI screening)`);
  console.log(`   ${applicationsData.length} applications (various stages)`);
  console.log(`   ${scorecardsData.length} AI scorecards`);
  console.log(`   ${activitiesData.length} activity timeline entries`);
  console.log(`   ${outreachData.length} outreach messages`);
  console.log(`   ${aiUsageData.length} AI usage log entries (30 days)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
