import { Module } from '@nestjs/common';
import { AiProviderService } from './providers/ai-provider.service';
import { ResumeScreeningService } from './services/resume-screening.service';
import { OutreachGenerationService } from './services/outreach-generation.service';
import { LeadScoringService } from './services/lead-scoring.service';
import { JdParserService } from './services/jd-parser.service';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  providers: [
    AiProviderService,
    ResumeScreeningService,
    OutreachGenerationService,
    LeadScoringService,
    JdParserService,
    AiService,
  ],
  controllers: [AiController],
  exports: [
    AiProviderService,
    ResumeScreeningService,
    OutreachGenerationService,
    LeadScoringService,
    JdParserService,
    AiService,
  ],
})
export class AiModule {}
