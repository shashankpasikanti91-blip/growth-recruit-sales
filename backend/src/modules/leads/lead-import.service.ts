import { Injectable, BadRequestException, ServiceUnavailableException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessIdService } from '../billing/business-id.service';
import { UsageService } from '../billing/usage.service';
import { PLAN_CONFIGS } from '../../config/plans.config';
import { IsString, IsOptional, IsInt, Min, Max, IsArray, IsObject, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GoogleMapsImportDto {
  @ApiProperty({ example: 'IT staffing agencies', description: 'Business type / keyword to search' })
  @IsString()
  query: string;

  @ApiProperty({ example: 'Kuala Lumpur, Malaysia', description: 'Location to search in' })
  @IsString()
  location: string;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  limit?: number;
}

export class ApifyImportDto {
  @ApiProperty({ description: 'Array of Apify dataset items (lead records)' })
  @IsArray()
  items: ApifyLeadItem[];
}

export enum LeadSource {
  GOOGLE_SEARCH = 'GOOGLE_SEARCH',
  GOOGLE_MAPS = 'GOOGLE_MAPS',
  APOLLO = 'APOLLO',
}

export class GenerateLeadsDto {
  @ApiProperty({ example: 'GOOGLE_SEARCH', enum: LeadSource })
  @IsEnum(LeadSource)
  source: LeadSource;

  @ApiProperty({ example: 'recruitment agencies' })
  @IsString()
  industry: string;

  @ApiProperty({ example: 'Kuala Lumpur, Malaysia' })
  @IsString()
  location: string;

  @ApiPropertyOptional({ example: 'owner,founder,CEO' })
  @IsOptional()
  @IsString()
  jobTitles?: string;

  @ApiPropertyOptional({ example: 50, minimum: 10, maximum: 200 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(200)
  limit?: number;
}

interface ApifyLeadItem {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  title?: string;
  jobTitle?: string;
  company?: string;
  companyName?: string;
  linkedinUrl?: string;
  linkedin?: string;
  website?: string;
  location?: string;
  country?: string;
  [key: string]: any;
}

interface PlaceResult {
  name: string;
  formatted_address?: string;
  website?: string;
  international_phone_number?: string;
  geometry?: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  place_id?: string;
}

@Injectable()
export class LeadImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessIdService: BusinessIdService,
    private readonly usageService: UsageService,
  ) {}

  /**
   * Search Google Maps Places API and create leads from business results.
   * Requires GOOGLE_MAPS_API_KEY in environment.
   */
  async importFromGoogleMaps(tenantId: string, dto: GoogleMapsImportDto) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'GOOGLE_MAPS_API_KEY is not configured on this server. Add it to your .env file to use this feature.',
      );
    }

    const limit = dto.limit ?? 20;
    const searchQuery = `${dto.query} ${dto.location}`.trim();

    // Google Places Text Search
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`;

    let places: PlaceResult[] = [];
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new BadRequestException(`Google Maps API returned ${response.status}`);
      }
      const data = (await response.json()) as { status: string; results: PlaceResult[]; error_message?: string };
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new BadRequestException(`Google Maps API error: ${data.status} — ${data.error_message ?? ''}`);
      }
      places = (data.results ?? []).slice(0, limit);
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof ServiceUnavailableException) throw err;
      throw new BadRequestException(`Failed to call Google Maps API: ${err.message}`);
    }

    if (places.length === 0) {
      return { imported: 0, skipped: 0, leads: [] };
    }

    const created: string[] = [];
    let skipped = 0;

    for (const place of places) {
      // Upsert company
      let company = await this.prisma.company.findFirst({
        where: { tenantId, name: { equals: place.name, mode: 'insensitive' } },
      });

      if (!company) {
        company = await this.prisma.company.create({
          data: {
            tenantId,
            name: place.name,
            website: place.website ?? null,
            businessId: await this.businessIdService.generate('company'),
          },
        });
      }

      // Skip if a lead for this company already exists with name = place name
      const existing = await this.prisma.lead.findFirst({
        where: { tenantId, companyId: company.id, firstName: place.name },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const lead = await this.prisma.lead.create({
        data: {
          tenantId,
          firstName: place.name,
          lastName: '',
          sourceName: 'google_maps',
          stage: 'NEW',
          companyId: company.id,
          phone: place.international_phone_number ?? null,
          rawData: {
            address: place.formatted_address || null,
            website: place.website || null,
            rating: place.rating || null,
            totalRatings: place.user_ratings_total || null,
            placeId: place.place_id || null,
            lat: place.geometry?.location?.lat || null,
            lng: place.geometry?.location?.lng || null,
          },
          businessId: await this.businessIdService.generate('lead'),
        },
      });
      created.push(lead.id);
    }

    return { imported: created.length, skipped, total: places.length };
  }

  /**
   * Bulk create leads from Apify dataset items.
   * Accepts Apify webhook payload or manually passed items array.
   */
  async importFromApify(tenantId: string, dto: ApifyImportDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('No items provided');
    }
    if (dto.items.length > 500) {
      throw new BadRequestException('Max 500 items per Apify import batch');
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of dto.items) {
      try {
        // Normalise field names from various Apify actor formats
        const email = item.email?.trim() || null;
        const firstName = item.firstName || (item.fullName ?? '').split(' ')[0] || item.companyName || item.company || '';
        const lastName = item.lastName || (item.fullName ?? '').split(' ').slice(1).join(' ') || '';
        const companyName = item.company || item.companyName || null;
        const linkedinUrl = item.linkedinUrl || item.linkedin || null;
        const phone = item.phone || null;
        const title = item.title || item.jobTitle || null;

        if (!firstName && !email) {
          skipped++;
          continue;
        }

        // Skip duplicates by email
        if (email) {
          const existing = await this.prisma.lead.findFirst({ where: { tenantId, email } });
          if (existing) {
            skipped++;
            continue;
          }
        }

        let companyId: string | null = null;
        if (companyName) {
          let company = await this.prisma.company.findFirst({
            where: { tenantId, name: { equals: companyName, mode: 'insensitive' } },
          });
          if (!company) {
            company = await this.prisma.company.create({
              data: { tenantId, name: companyName, website: item.website ?? null, businessId: await this.businessIdService.generate('company') },
            });
          }
          companyId = company.id;
        }

        await this.prisma.lead.create({
          data: {
            tenantId,
            firstName,
            lastName,
            email,
            phone,
            title,
            linkedinUrl,
            companyId,
            sourceName: 'apify',
            stage: 'NEW',
            businessId: await this.businessIdService.generate('lead'),
          },
        });
        imported++;
      } catch (err: any) {
        errors.push(`Row error: ${err.message}`);
      }
    }

    return { imported, skipped, errors: errors.slice(0, 10) };
  }

  // ── Platform-Powered Lead Generation ──────────────────────────────────────

  private readonly logger = new Logger(LeadImportService.name);

  /**
   * Generate leads using SRP AI Labs' own Apify + Google Maps + Apollo keys.
   * Clients never need their own API keys — the platform handles everything.
   * Enforces monthly AND daily limits, creates SourceImport for tracking.
   */
  async generateLeads(tenantId: string, dto: GenerateLeadsDto) {
    const limit = dto.limit ?? 50;
    const titles = dto.jobTitles?.split(',').map(t => t.trim()).filter(Boolean) ?? [];

    // ── Enforce monthly plan limit ──
    await this.usageService.enforce(tenantId, 'lead', limit);

    // ── Enforce daily limit (prevents burning Apify budget) ──
    await this.enforceDailyLimit(tenantId, limit);

    // ── Create SourceImport record for tracking ──
    const sourceImport = await this.prisma.sourceImport.create({
      data: {
        tenantId,
        name: `AI Lead Gen — ${dto.source} — ${dto.industry} in ${dto.location}`,
        source: dto.source === LeadSource.GOOGLE_MAPS ? 'GOOGLE_MAPS' : dto.source === LeadSource.APOLLO ? 'APOLLO' : 'APIFY',
        status: 'PROCESSING',
        totalRows: limit,
        importType: 'lead',
        businessId: await this.businessIdService.generate('sourceImport'),
      },
    });

    let result: any;
    try {
      if (dto.source === LeadSource.GOOGLE_SEARCH) {
        result = await this.generateViaApifyGoogleSearch(tenantId, dto.industry, dto.location, titles, limit, sourceImport.id);
      } else if (dto.source === LeadSource.GOOGLE_MAPS) {
        result = await this.generateViaGoogleMaps(tenantId, dto.industry, dto.location, limit, sourceImport.id);
      } else if (dto.source === LeadSource.APOLLO) {
        result = await this.generateViaApollo(tenantId, dto.industry, dto.location, titles, limit, sourceImport.id);
      } else {
        throw new BadRequestException('Unsupported source');
      }

      // ── Increment usage by actual imported count ──
      const imported = result.imported ?? 0;
      if (imported > 0) {
        await this.usageService.increment(tenantId, 'lead', imported);
      }

      // ── Update SourceImport record ──
      await this.prisma.sourceImport.update({
        where: { id: sourceImport.id },
        data: {
          status: imported > 0 ? 'COMPLETED' : 'PARTIAL',
          successRows: imported,
          duplicateRows: result.skipped ?? 0,
          totalRows: (imported + (result.skipped ?? 0)),
        },
      });

      return { ...result, importId: sourceImport.id };
    } catch (err) {
      // Mark import as failed
      await this.prisma.sourceImport.update({
        where: { id: sourceImport.id },
        data: { status: 'FAILED', errorReport: { message: (err as Error).message } },
      }).catch(() => {});
      throw err;
    }
  }

  /**
   * Enforce daily lead generation limit based on plan tier.
   * Prevents burning through Apify budget in a single day.
   */
  private async enforceDailyLimit(tenantId: string, requestedAmount: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });
    const planKey = (tenant?.plan ?? 'FREE').toUpperCase();
    const planConfig = PLAN_CONFIGS[planKey] ?? PLAN_CONFIGS.FREE;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCount = await this.prisma.lead.count({
      where: {
        tenantId,
        createdAt: { gte: startOfDay },
        sourceName: { in: ['google_search', 'google_maps', 'apify', 'apollo'] },
      },
    });

    if (todayCount + requestedAmount > planConfig.maxLeadsPerDay) {
      const remaining = Math.max(0, planConfig.maxLeadsPerDay - todayCount);
      throw new ForbiddenException(
        `Daily lead generation limit reached. You can generate ${remaining} more leads today (${planConfig.maxLeadsPerDay}/day on ${planConfig.name} plan). Resets at midnight.`,
      );
    }

    // Also enforce per-request limit
    if (requestedAmount > planConfig.maxLeadsPerRequest) {
      throw new ForbiddenException(
        `Maximum ${planConfig.maxLeadsPerRequest} leads per request on ${planConfig.name} plan. Please reduce the amount.`,
      );
    }
  }

  /**
   * Get daily usage stats for the generate page.
   */
  async getDailyUsage(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, currentLeadUsage: true, maxLeadsPerMonth: true },
    });
    const planKey = (tenant?.plan ?? 'FREE').toUpperCase();
    const planConfig = PLAN_CONFIGS[planKey] ?? PLAN_CONFIGS.FREE;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCount = await this.prisma.lead.count({
      where: {
        tenantId,
        createdAt: { gte: startOfDay },
        sourceName: { in: ['google_search', 'google_maps', 'apify', 'apollo'] },
      },
    });

    // Recent generation history (last 10)
    const recentGenerations = await this.prisma.sourceImport.findMany({
      where: { tenantId, importType: 'lead', source: { in: ['APIFY', 'GOOGLE_MAPS', 'APOLLO'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        source: true,
        status: true,
        successRows: true,
        duplicateRows: true,
        totalRows: true,
        createdAt: true,
      },
    });

    return {
      monthly: {
        used: tenant?.currentLeadUsage ?? 0,
        limit: planConfig.maxLeadsPerMonth,
        remaining: Math.max(0, planConfig.maxLeadsPerMonth - (tenant?.currentLeadUsage ?? 0)),
      },
      daily: {
        used: todayCount,
        limit: planConfig.maxLeadsPerDay,
        remaining: Math.max(0, planConfig.maxLeadsPerDay - todayCount),
      },
      perRequest: planConfig.maxLeadsPerRequest,
      plan: planConfig.name,
      recentGenerations,
    };
  }

  /**
   * Use Apify's Google Search Results Scraper to find businesses and contacts.
   */
  private async generateViaApifyGoogleSearch(
    tenantId: string,
    industry: string,
    location: string,
    titles: string[],
    limit: number,
    sourceImportId?: string,
  ) {
    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('Lead generation service is temporarily unavailable. Contact support.');
    }

    const searchQueries = titles.length > 0
      ? titles.map(t => `${t} ${industry} ${location} email contact`)
      : [`${industry} ${location} business owner email contact`];

    // Run Apify Google Search Results Scraper
    const actorId = 'apify~google-search-scraper';
    const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}&waitForFinish=120`;

    let allItems: any[] = [];
    try {
      const runResp = await fetch(runUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: searchQueries.join('\n'),
          maxPagesPerQuery: 2,
          resultsPerPage: Math.min(limit, 100),
          languageCode: '',
          mobileResults: false,
        }),
      });

      if (!runResp.ok) {
        const errText = await runResp.text();
        this.logger.error(`Apify run failed: ${runResp.status} ${errText}`);
        throw new BadRequestException('Lead generation failed — search service returned an error');
      }

      const runData = await runResp.json() as any;
      const datasetId = runData?.data?.defaultDatasetId;
      if (!datasetId) {
        throw new BadRequestException('Lead generation failed — no results returned');
      }

      // Fetch dataset items
      const dataUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&limit=${limit}`;
      const dataResp = await fetch(dataUrl);
      if (dataResp.ok) {
        allItems = await dataResp.json() as any[];
      }
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`Apify Google Search error: ${err.message}`);
      throw new BadRequestException('Lead generation service encountered an error. Please try again.');
    }

    // Parse search results into leads
    return this.parseSearchResultsToLeads(tenantId, allItems, 'google_search', limit, sourceImportId);
  }

  /**
   * Apollo lead generation — cascading fallback strategy:
   *  1. Native Apollo API (requires paid Apollo plan)
   *  2. Google Search B2B queries (always works on free Apify)
   */
  private async generateViaApollo(
    tenantId: string,
    industry: string,
    location: string,
    titles: string[],
    limit: number,
    sourceImportId?: string,
  ) {
    // 1. Try native Apollo API (works on paid plans)
    const apolloApiKey = process.env.APOLLO_API_KEY;
    if (apolloApiKey) {
      try {
        const people = await this.callApolloNativeApi(apolloApiKey, industry, location, titles, limit);
        if (people.length > 0) {
          return this.importApolloContacts(tenantId, people.slice(0, limit), sourceImportId);
        }
        return { imported: 0, skipped: 0, errors: [] };
      } catch (err: any) {
        // 403 = free plan — fall through to Google Search fallback
        if (err.status === 403 || err.message?.includes('free plan') || err.message?.includes('API_INACCESSIBLE')) {
          this.logger.warn('Apollo native API not available (free plan), falling back to Google Search B2B');
        } else {
          this.logger.warn(`Apollo native API failed: ${err.message}, falling back to Google Search B2B`);
        }
      }
    }

    // 2. Fallback: Google Search with B2B-optimized queries
    this.logger.log('Using Google Search B2B fallback for Apollo source');
    return this.generateViaGoogleSearchB2B(tenantId, industry, location, titles, limit, sourceImportId);
  }

  /**
   * Native Apollo.io People Search API (requires paid plan).
   */
  private async callApolloNativeApi(apiKey: string, industry: string, location: string, titles: string[], limit: number): Promise<any[]> {
    const perPage = Math.min(limit, 100);
    const pages = Math.ceil(limit / perPage);
    let allPeople: any[] = [];

    for (let page = 1; page <= pages && allPeople.length < limit; page++) {
      const body: Record<string, any> = {
        q_keywords: industry,
        person_locations: [location],
        per_page: perPage,
        page,
      };
      if (titles.length > 0) {
        body.person_titles = titles;
      }

      const resp = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        this.logger.error(`Apollo API error: ${resp.status} ${errText}`);
        const error: any = new Error(errText);
        error.status = resp.status;
        throw error;
      }

      const data = await resp.json() as any;
      const people = data.people ?? [];
      if (people.length === 0) break;
      allPeople.push(...people);
    }

    return allPeople;
  }

  /**
   * Google Search B2B fallback for Apollo — uses LinkedIn + business search queries
   * to find contacts when Apollo API is not available.
   */
  private async generateViaGoogleSearchB2B(
    tenantId: string,
    industry: string,
    location: string,
    titles: string[],
    limit: number,
    sourceImportId?: string,
  ) {
    const apifyKey = process.env.APIFY_API_KEY;
    if (!apifyKey) {
      throw new ServiceUnavailableException('Lead generation service is temporarily unavailable. Contact support.');
    }

    // Build optimized B2B search queries (LinkedIn + business directory focused)
    const searchQueries: string[] = [];
    if (titles.length > 0) {
      for (const title of titles.slice(0, 3)) {
        searchQueries.push(`site:linkedin.com/in "${title}" "${industry}" "${location}"`);
        searchQueries.push(`"${title}" "${industry}" "${location}" email contact`);
      }
    } else {
      searchQueries.push(`site:linkedin.com/in "${industry}" "${location}" CEO OR founder OR owner`);
      searchQueries.push(`"${industry}" "${location}" owner founder email contact`);
    }

    const actorId = 'apify~google-search-scraper';
    const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${encodeURIComponent(apifyKey)}&waitForFinish=120`;

    let allItems: any[] = [];
    try {
      const runResp = await fetch(runUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: searchQueries.join('\n'),
          maxPagesPerQuery: 2,
          resultsPerPage: Math.min(limit, 50),
          languageCode: '',
          mobileResults: false,
        }),
      });

      if (!runResp.ok) {
        const errText = await runResp.text();
        this.logger.error(`Apify Google Search B2B run failed: ${runResp.status} ${errText}`);
        throw new BadRequestException('Lead generation failed — search service returned an error');
      }

      const runData = await runResp.json() as any;
      const datasetId = runData?.data?.defaultDatasetId;
      if (!datasetId) {
        throw new BadRequestException('Lead generation failed — no results returned');
      }

      const dataUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(apifyKey)}&limit=${limit * 2}`;
      const dataResp = await fetch(dataUrl);
      if (dataResp.ok) {
        allItems = await dataResp.json() as any[];
      }
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`Google Search B2B error: ${err.message}`);
      throw new BadRequestException('Lead generation failed. Please try again.');
    }

    return this.parseSearchResultsToLeads(tenantId, allItems, 'apollo', limit, sourceImportId);
  }

  /**
   * Import Apollo People Search results as leads with rich data.
   */
  private async importApolloContacts(tenantId: string, people: any[], sourceImportId?: string) {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const person of people) {
      try {
        const email = person.email?.trim() || null;
        const firstName = person.first_name || '';
        const lastName = person.last_name || '';
        const phone = person.phone_numbers?.[0]?.raw_number || person.phone_number || null;
        const title = person.title || '';
        const linkedinUrl = person.linkedin_url || null;
        const org = person.organization ?? {};
        const companyName = org.name || person.organization_name || null;

        if (!firstName && !email) { skipped++; continue; }

        // Skip duplicates by email
        if (email) {
          const existing = await this.prisma.lead.findFirst({ where: { tenantId, email } });
          if (existing) { skipped++; continue; }
        }

        // Upsert company with rich data
        let companyId: string | null = null;
        if (companyName) {
          let company = await this.prisma.company.findFirst({
            where: { tenantId, name: { equals: companyName, mode: 'insensitive' } },
          });
          if (!company) {
            company = await this.prisma.company.create({
              data: {
                tenantId,
                name: companyName,
                website: org.website_url || null,
                domain: org.primary_domain || null,
                industry: org.industry || null,
                size: org.estimated_num_employees ? String(org.estimated_num_employees) : null,
                businessId: await this.businessIdService.generate('company'),
              },
            });
          }
          companyId = company.id;
        }

        await this.prisma.lead.create({
          data: {
            tenantId,
            firstName,
            lastName,
            email,
            phone,
            title,
            linkedinUrl,
            companyId,
            sourceName: 'apollo',
            sourceImportId: sourceImportId ?? null,
            stage: 'NEW',
            rawData: {
              city: person.city || null,
              state: person.state || null,
              country: person.country || null,
              headline: person.headline || null,
              seniority: person.seniority || null,
              departments: person.departments || [],
              companyName,
              companyWebsite: org.website_url || null,
              companyIndustry: org.industry || null,
              companySize: org.estimated_num_employees || null,
              apolloId: person.id || null,
            },
            businessId: await this.businessIdService.generate('lead'),
          },
        });
        imported++;
      } catch (err: any) {
        errors.push(`Row error: ${err.message}`);
      }
    }

    return { imported, skipped, errors: errors.slice(0, 10) };
  }

  /**
   * Google Maps lead generation via Places API (with sourceImportId tracking).
   */
  private async generateViaGoogleMaps(
    tenantId: string,
    industry: string,
    location: string,
    limit: number,
    sourceImportId?: string,
  ) {
    const result = await this.importFromGoogleMaps(tenantId, {
      query: industry,
      location,
      limit: Math.min(limit, 60),
    });
    // Link created leads to source import
    if (sourceImportId) {
      await this.prisma.lead.updateMany({
        where: { tenantId, sourceName: 'google_maps', sourceImportId: null },
        data: { sourceImportId },
      });
    }
    return result;
  }

  /**
   * Internal Apify import with sourceName and sourceImportId tracking.
   */
  private async importFromApifyInternal(
    tenantId: string,
    items: any[],
    sourceName: string,
    sourceImportId?: string,
  ) {
    if (!items?.length) {
      return { imported: 0, skipped: 0, errors: [] };
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const email = item.email?.trim() || null;
        const firstName = item.firstName || (item.fullName ?? '').split(' ')[0] || item.companyName || item.company || '';
        const lastName = item.lastName || (item.fullName ?? '').split(' ').slice(1).join(' ') || '';
        const companyName = item.company || item.companyName || null;
        const linkedinUrl = item.linkedinUrl || item.linkedin || null;
        const phone = item.phone || null;
        const title = item.title || item.jobTitle || null;

        if (!firstName && !email) { skipped++; continue; }

        if (email) {
          const existing = await this.prisma.lead.findFirst({ where: { tenantId, email } });
          if (existing) { skipped++; continue; }
        }

        let companyId: string | null = null;
        if (companyName) {
          let company = await this.prisma.company.findFirst({
            where: { tenantId, name: { equals: companyName, mode: 'insensitive' } },
          });
          if (!company) {
            company = await this.prisma.company.create({
              data: { tenantId, name: companyName, website: item.website ?? null, businessId: await this.businessIdService.generate('company') },
            });
          }
          companyId = company.id;
        }

        await this.prisma.lead.create({
          data: {
            tenantId,
            firstName,
            lastName,
            email,
            phone,
            title,
            linkedinUrl,
            companyId,
            sourceName,
            sourceImportId: sourceImportId ?? null,
            stage: 'NEW',
            rawData: {
              location: item.location || null,
              country: item.country || null,
              website: item.website || null,
              industry: item.industry || null,
              companyName,
            },
            businessId: await this.businessIdService.generate('lead'),
          },
        });
        imported++;
      } catch (err: any) {
        errors.push(`Row error: ${err.message}`);
      }
    }

    return { imported, skipped, errors: errors.slice(0, 10) };
  }

  /**
   * Parse generic search results (Google Search) into lead records.
   */
  private async parseSearchResultsToLeads(
    tenantId: string,
    items: any[],
    sourceName: string,
    limit: number,
    sourceImportId?: string,
  ) {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of items.slice(0, limit)) {
      try {
        // Google Search results have organicResults array
        const results = item.organicResults ?? [item];
        for (const result of results) {
          if (imported >= limit) break;

          const title = result.title ?? result.name ?? '';
          const url = result.url ?? result.link ?? result.website ?? '';
          const description = result.description ?? result.snippet ?? '';

          // Extract potential company name from title
          const companyName = title.split(' - ')[0]?.split(' | ')[0]?.trim() || title;
          if (!companyName) { skipped++; continue; }

          // Skip duplicates
          const existing = await this.prisma.company.findFirst({
            where: { tenantId, name: { equals: companyName, mode: 'insensitive' } },
          });

          let company = existing;
          if (!company) {
            company = await this.prisma.company.create({
              data: { tenantId, name: companyName, website: url || null, businessId: await this.businessIdService.generate('company') },
            });
          }

          // Check if lead already exists for this company
          const existingLead = await this.prisma.lead.findFirst({
            where: { tenantId, companyId: company.id },
          });
          if (existingLead) { skipped++; continue; }

          await this.prisma.lead.create({
            data: {
              tenantId,
              firstName: companyName,
              lastName: '',
              sourceName,
              stage: 'NEW',
              companyId: company.id,
              sourceImportId: sourceImportId ?? null,
              notes: description || null,
              businessId: await this.businessIdService.generate('lead'),
            },
          });
          imported++;
        }
      } catch (err: any) {
        errors.push(err.message);
      }
    }

    return { imported, skipped, errors: errors.slice(0, 5), source: sourceName };
  }
}
