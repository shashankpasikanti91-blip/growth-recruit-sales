import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
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
import { AiService } from './ai.service';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

class ScreenResumeDto {
  @ApiProperty()
  @IsString()
  jobDescription: string;

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
  @IsString()
  jobDescription: string;
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
    private readonly aiService: AiService,
  ) {}

  @Post('screen-resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Screen a resume against a job description using AI' })
  async screenResume(@CurrentUser() user: any, @Body() dto: ScreenResumeDto) {
    const { result, tokensUsed, latencyMs } = await this.resumeScreening.screen({
      jobDescription: dto.jobDescription,
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
    return this.jdParser.parse(dto.jobDescription);
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
  @ApiOperation({ summary: 'Parse a resume file (PDF/Word) into structured candidate data' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async parseResume(@UploadedFile() file: Express.Multer.File) {
    let text = '';
    if (!file) throw new Error('No file uploaded');

    if (file.originalname.endsWith('.pdf') || file.mimetype === 'application/pdf') {
      const data = await pdfParse(file.buffer);
      text = data.text;
    } else if (file.originalname.match(/\.docx?$/) || file.mimetype.includes('word')) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    } else {
      text = file.buffer.toString('utf-8');
    }

    // Use JD parser to extract structured data from resume text
    return this.jdParser.parse(text);
  }
}
