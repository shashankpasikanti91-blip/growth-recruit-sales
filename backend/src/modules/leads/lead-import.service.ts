import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsOptional, IsInt, Min, Max, IsArray, IsObject } from 'class-validator';
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
  constructor(private readonly prisma: PrismaService) {}

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
            phone: place.international_phone_number ?? null,
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
              data: { tenantId, name: companyName, website: item.website ?? null },
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
          },
        });
        imported++;
      } catch (err: any) {
        errors.push(`Row error: ${err.message}`);
      }
    }

    return { imported, skipped, errors: errors.slice(0, 10) };
  }
}
