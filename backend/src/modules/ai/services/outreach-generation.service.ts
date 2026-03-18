import { Injectable } from '@nestjs/common';
import { AiProviderService } from '../providers/ai-provider.service';

@Injectable()
export class OutreachGenerationService {
  constructor(private readonly aiProvider: AiProviderService) {}

  async generate(input: {
    channel: 'email' | 'linkedin' | 'whatsapp';
    entityType: 'candidate' | 'lead';
    tone: string;
    recipientData: Record<string, any>;
    contextData: Record<string, any>;
  }): Promise<{ subject?: string; body: string; tokensUsed: number }> {
    const prompt = `Generate a personalized ${input.channel} outreach message for the following ${input.entityType}.
The tone should be: ${input.tone}
Keep it concise (under 150 words), specific to their background/company, and include a clear call to action.
Return JSON with: ${input.channel === 'email' ? '"subject": "...", ' : ''}"body": "..."

Recipient data:
${JSON.stringify(input.recipientData, null, 2)}

Context / reason for outreach:
${JSON.stringify(input.contextData, null, 2)}`;

    const systemPrompt = `You are an expert outreach copywriter. 
Write messages that are personal, relevant, and not spammy.
NEVER use clichés like "I hope this email finds you well", "I came across your profile", or "synergy".
Be specific. Be human. Be direct.
Return ONLY valid JSON.`;

    const { data, meta } = await this.aiProvider.completeJson<{ subject?: string; body: string }>(prompt, {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 600,
    });

    return {
      subject: data.subject,
      body: data.body,
      tokensUsed: meta.tokensInput + meta.tokensOutput,
    };
  }

  async generateFollowUpSequence(input: {
    entityType: 'candidate' | 'lead';
    recipientData: Record<string, any>;
    previousOutreach: string;
    steps: number;
  }): Promise<{ sequence: Array<{ day: number; subject: string; body: string }>; tokensUsed: number }> {
    const prompt = `Generate a ${input.steps}-step follow-up email sequence for the following ${input.entityType}.
Each step should be on a different day and escalate appropriately in urgency without being pushy.
Return JSON: { "sequence": [{ "day": 1, "subject": "...", "body": "..." }, ...] }

Recipient:
${JSON.stringify(input.recipientData, null, 2)}

Previous outreach sent:
${input.previousOutreach}`;

    const { data, meta } = await this.aiProvider.completeJson<{
      sequence: Array<{ day: number; subject: string; body: string }>;
    }>(prompt, { temperature: 0.6, maxTokens: 1500 });

    return { sequence: data.sequence, tokensUsed: meta.tokensInput + meta.tokensOutput };
  }
}
