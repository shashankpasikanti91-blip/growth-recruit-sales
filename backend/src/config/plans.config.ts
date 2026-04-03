/**
 * Plan configuration for SRP AI Labs SaaS platform.
 * Defines limits and pricing for each plan tier.
 */

export interface PlanConfig {
  id: string;
  name: string;
  tier: string;
  monthlyPrice: number;
  annualPrice: number;
  maxUsers: number;
  maxCandidatesPerMonth: number;
  maxLeadsPerMonth: number;
  maxAiUsagePerMonth: number;
  features: string[];
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  FREE: {
    id: 'free',
    name: 'Free / Demo',
    tier: 'FREE',
    monthlyPrice: 0,
    annualPrice: 0,
    maxUsers: 1,
    maxCandidatesPerMonth: 50,
    maxLeadsPerMonth: 50,
    maxAiUsagePerMonth: 20,
    features: [
      '1 user',
      '50 candidates/month',
      '50 leads/month',
      '20 AI processing actions/month',
      'Limited dashboards',
      'Demo only',
    ],
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    tier: 'STARTER',
    monthlyPrice: 29,
    annualPrice: 23,
    maxUsers: 3,
    maxCandidatesPerMonth: 500,
    maxLeadsPerMonth: 500,
    maxAiUsagePerMonth: 200,
    features: [
      '3 users',
      '500 candidates/month',
      '500 leads/month',
      '200 AI processing actions/month',
      'CSV/Excel imports',
      'Basic analytics',
      'Email outreach',
      'Email support',
    ],
  },
  GROWTH: {
    id: 'growth',
    name: 'Growth',
    tier: 'GROWTH',
    monthlyPrice: 69,
    annualPrice: 55,
    maxUsers: 10,
    maxCandidatesPerMonth: 2000,
    maxLeadsPerMonth: 2000,
    maxAiUsagePerMonth: 1000,
    features: [
      '10 users',
      '2,000 candidates/month',
      '2,000 leads/month',
      '1,000 AI processing actions/month',
      'All file formats (PDF, Word, Excel, CSV)',
      'Advanced analytics',
      'n8n workflow automation',
      'Priority support',
    ],
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Pro',
    tier: 'PROFESSIONAL',
    monthlyPrice: 149,
    annualPrice: 119,
    maxUsers: 25,
    maxCandidatesPerMonth: 10000,
    maxLeadsPerMonth: 10000,
    maxAiUsagePerMonth: 5000,
    features: [
      '25 users',
      '10,000 candidates/month',
      '10,000 leads/month',
      '5,000 AI processing actions/month',
      'All file formats + bulk upload',
      'Power BI-style analytics',
      'Custom AI prompts',
      '5 n8n workflow templates',
      'Priority support',
    ],
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'ENTERPRISE',
    monthlyPrice: -1, // custom
    annualPrice: -1,
    maxUsers: 999,
    maxCandidatesPerMonth: 999999,
    maxLeadsPerMonth: 999999,
    maxAiUsagePerMonth: 999999,
    features: [
      'Unlimited users',
      'Unlimited candidates & leads',
      'Unlimited AI processing',
      'All file formats + API',
      'Custom AI models (BYO key)',
      'SSO / SAML',
      'Dedicated account manager',
      'SLA guarantee',
      'White-label option',
    ],
  },
};

export function getPlanConfig(plan: string): PlanConfig {
  return PLAN_CONFIGS[plan] ?? PLAN_CONFIGS.FREE;
}
