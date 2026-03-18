import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ResumeScreeningService } from './services/resume-screening.service';
import { OutreachGenerationService } from './services/outreach-generation.service';
import { LeadScoringService } from './services/lead-scoring.service';
import { JdParserService } from './services/jd-parser.service';
import { AiProviderService } from './providers/ai-provider.service';
import { AiService } from './ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

class ScreenResumeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobDescription?: string;

  @ApiProperty()
  @IsString()
  resumeText: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  candidateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobId?: string;
}

class GenerateOutreachDto {
  @ApiProperty({ enum: ['email', 'linkedin', 'whatsapp'] })
  @IsEnum(['email', 'linkedin', 'whatsapp'])
  channel: 'email' | 'linkedin' | 'whatsapp';

  @ApiProperty({ enum: ['candidate', 'lead'] })
  @IsEnum(['candidate', 'lead'])
  entityType: 'candidate' | 'lead';

  @ApiProperty()
  @IsString()
  tone: string;

  @ApiProperty()
  @IsObject()
  recipientData: Record<string, any>;

  @ApiProperty()
  @IsObject()
  contextData: Record<string, any>;
}

class ParseJdDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  jobDescription?: string;

  // Legacy field support — frontend may send 'text' instead of 'jobDescription'
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text?: string;
}

class ScoreLeadDto {
  @ApiProperty()
  @IsObject()
  leadData: Record<string, any>;

  @ApiProperty()
  @IsObject()
  icpData: Record<string, any>;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(
    private readonly resumeScreening: ResumeScreeningService,
    private readonly outreachGeneration: OutreachGenerationService,
    private readonly leadScoring: LeadScoringService,
    private readonly jdParser: JdParserService,
    private readonly aiProvider: AiProviderService,
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('screen-resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Screen a resume against a job description using AI' })
  async screenResume(@CurrentUser() user: any, @Body() dto: ScreenResumeDto) {
    // Resolve job description — use provided text or fetch from DB via jobId
    let jobDescription = dto.jobDescription;
    if (!jobDescription && dto.jobId) {
      const job = await this.prisma.job.findFirst({ where: { id: dto.jobId } });
      if (job) {
        jobDescription = job.description || `${job.title} at ${job.location || 'unknown location'}. Requirements: ${(job.requirements as string[] || []).join(', ')}. Skills: ${(job.skills as string[] || []).join(', ')}.`;
      }
    }
    if (!jobDescription) {
      throw new BadRequestException('jobDescription is required, or provide a valid jobId to auto-fetch it');
    }

    const { result, tokensUsed, latencyMs } = await this.resumeScreening.screen({
      jobDescription,
      resumeText: dto.resumeText,
    });

    // Persist result if candidate+job provided
    if (dto.candidateId && dto.jobId) {
      await this.aiService.persistScreeningResult(user.tenantId, dto.candidateId, dto.jobId, result, tokensUsed, latencyMs);
    }

    return {
      ...result,
      pipeline_stage: this.resumeScreening.mapDecisionToStage(result.decision),
      meta: { tokensUsed, latencyMs },
    };
  }

  @Post('parse-jd')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parse a job description into structured data' })
  parseJd(@Body() dto: ParseJdDto) {
    const text = dto.jobDescription || dto.text;
    if (!text) throw new BadRequestException('jobDescription is required');
    return this.jdParser.parse(text);
  }

  @Post('generate-outreach')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate personalized outreach message' })
  generateOutreach(@Body() dto: GenerateOutreachDto) {
    return this.outreachGeneration.generate(dto);
  }

  @Post('score-lead')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Score a lead against an ICP' })
  scoreLead(@Body() dto: ScoreLeadDto) {
    return this.leadScoring.score(dto);
  }

  @Post('parse-resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extract text from a resume file (PDF/Word) for AI screening' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async parseResume(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    let text = '';

    if (file.originalname.endsWith('.pdf') || file.mimetype === 'application/pdf') {
      const data = await pdfParse(file.buffer);
      text = data.text?.trim() || '';
    } else if (file.originalname.match(/\.docx?$/) || file.mimetype.includes('word')) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value?.trim() || '';
    } else {
      text = file.buffer.toString('utf-8').trim();
    }

    if (!text) throw new BadRequestException('Could not extract text from the uploaded file');

    // Call AI to extract structured candidate fields from the resume text
    try {
      const { data: parsed } = await this.aiProvider.completeJson<any>(
        `Extract structured candidate information from this resume text. Return ONLY valid JSON.

{
  "firstName": "",
  "lastName": "",
  "email": "",
  "phone": "",
  "currentTitle": "",
  "currentCompany": "",
  "location": "",
  "linkedinUrl": "",
  "skills": [],
  "summary": "",
  "yearsExperience": null,
  "nationality": "",
  "visaType": "",
  "visaExpiry": "",
  "isForeigner": false
}

Rules:
- Extract ONLY information explicitly stated in the resume
- Split the candidate's full name into firstName and lastName
- For skills, list technical skills, tools, frameworks, and methodologies as an array of strings
- If a field is not found, use "" for strings, [] for arrays, null for numbers, false for booleans
- For linkedinUrl, extract any LinkedIn profile URL if present
- For nationality, extract if explicitly mentioned or inferable from education/location context
- For visaType, extract work visa info if mentioned (e.g. H-1B, EP, S Pass, 482, PR, Citizen)
- For isForeigner, set true if nationality and work location suggest the person needs a work visa
- For yearsExperience, calculate total years from work history dates if possible

Resume Text:
${text}`,
        {
          systemPrompt: 'You are an expert resume parser. Extract factual information only. Return ONLY valid JSON, no markdown.',
          temperature: 0.1,
          maxTokens: 1000,
        },
      );

      return {
        resumeText: text,
        charCount: text.length,
        ...parsed,
      };
    } catch {
      // If AI extraction fails, return raw text as fallback
      return { resumeText: text, charCount: text.length };
    }
  }
}
