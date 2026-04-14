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
  maxLeadsPerDay: number;
  maxLeadsPerRequest: number;
  maxAiUsagePerMonth: number;
  features: string[];
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  FREE: {
    id: 'free',
    name: 'Starter Trial',
    tier: 'FREE',
    monthlyPrice: 0,
    annualPrice: 0,
    maxUsers: 3,
    maxCandidatesPerMonth: 500,
    maxLeadsPerMonth: 1000,
    maxLeadsPerDay: 100,
    maxLeadsPerRequest: 50,
    maxAiUsagePerMonth: 200,
    features: [
      'Up to 3 users',
      '500 candidates',
      '250 leads',
      '200 AI screenings/month',
      'Basic analytics',
      'CSV / Excel imports',
    ],
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    tier: 'STARTER',
    monthlyPrice: 69,
    annualPrice: 55,
    maxUsers: 5,
    maxCandidatesPerMonth: 2000,
    maxLeadsPerMonth: 1000,
    maxLeadsPerDay: 100,
    maxLeadsPerRequest: 50,
    maxAiUsagePerMonth: 500,
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
  GROWTH: {
    id: 'growth',
    name: 'Growth',
    tier: 'GROWTH',
    monthlyPrice: 149,
    annualPrice: 119,
    maxUsers: 15,
    maxCandidatesPerMonth: 10000,
    maxLeadsPerMonth: 2500,
    maxLeadsPerDay: 250,
    maxLeadsPerRequest: 100,
    maxAiUsagePerMonth: 1000,
    features: [
      'Up to 15 users',
      '10,000 candidates',
      '2,500 AI-generated leads',
      '1,000 AI screenings/month',
      'Built for growing teams',
      'Advanced analytics',
      'Custom AI prompts',
      'Priority support',
    ],
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Enterprise',
    tier: 'PROFESSIONAL',
    monthlyPrice: -1, // custom pricing
    annualPrice: -1,
    maxUsers: 999,
    maxCandidatesPerMonth: 999999,
    maxLeadsPerMonth: 999999,
    maxLeadsPerDay: 9999,
    maxLeadsPerRequest: 200,
    maxAiUsagePerMonth: 999999,
    features: [
      'High-volume / scalable limits',
      'Custom workflows',
      'API access',
      'Dedicated support',
      'Custom AI models (BYO key)',
      'SSO / SAML',
      'SLA guarantee',
      'White-label option',
    ],
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'ENTERPRISE',
    monthlyPrice: -1, // custom pricing
    annualPrice: -1,
    maxUsers: 999,
    maxCandidatesPerMonth: 999999,
    maxLeadsPerMonth: 999999,
    maxLeadsPerDay: 9999,
    maxLeadsPerRequest: 200,
    maxAiUsagePerMonth: 999999,
    features: [
      'High-volume / scalable limits',
      'Custom workflows',
      'API access',
      'Dedicated support',
      'Custom AI models (BYO key)',
      'SSO / SAML',
      'SLA guarantee',
      'White-label option',
    ],
  },
};

export function getPlanConfig(plan: string): PlanConfig {
  return PLAN_CONFIGS[plan] ?? PLAN_CONFIGS.FREE;
}
