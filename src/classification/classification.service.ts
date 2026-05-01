import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { z } from 'zod';

// Zod Schema para validar o output do Ollama
const OllamaResponseSchema = z.object({
  score: z.number().min(0).max(100),
  classification: z.enum(['HOT', 'WARM', 'COLD']),
  justification: z.string().min(10),
  commercialPotential: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

export type ValidatedClassification = z.infer<typeof OllamaResponseSchema>;

@Injectable()
export class ClassificationService {
  private readonly logger = new Logger(ClassificationService.name);

  async classifyLead(
    leadData: Record<string, any>,
    enrichmentData: Record<string, any> | null,
  ): Promise<ValidatedClassification> {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const model = 'tinyllama';

    const industry = enrichmentData?.industry
      ? String(enrichmentData.industry)
      : 'Desconhecido';
    const annualRevenue = enrichmentData?.annualRevenue
      ? Number(enrichmentData.annualRevenue)
      : 0;
    const employeeCount = enrichmentData?.employeeCount
      ? Number(enrichmentData.employeeCount)
      : 0;
    const companyName = leadData.companyName
      ? String(leadData.companyName)
      : 'Desconhecido';

    const prompt = `
      Você é um especialista em vendas B2B. Analise este lead e retorne APENAS um JSON válido.
      Regras de Classificação:
      - HOT (High): Faturamento > 1000000 e mais de 50 funcionários.
      - WARM (Medium): Faturamento entre 500000 e 1000000.
      - COLD (Low): Faturamento < 500000 ou dados insuficientes.
      
      Dados do Lead:
      Nome: ${companyName}
      Setor: ${industry}
      Faturamento: ${annualRevenue}
      Funcionários: ${employeeCount}

      O JSON deve ter EXATAMENTE este formato:
      {
        "score": número de 0 a 100,
        "classification": "HOT", "WARM" ou "COLD",
        "justification": "Sua justificativa aqui",
        "commercialPotential": "HIGH", "MEDIUM" ou "LOW"
      }
    `;

    try {
      const response = await axios.post<Record<string, any>>(
        `${ollamaUrl}/api/generate`,
        {
          model,
          prompt,
          stream: false,
          format: 'json',
        },
      );

      const rawResponse = response.data.response as string;
      const rawJson = JSON.parse(rawResponse) as Record<string, unknown>;

      // Validação rigorosa com Zod
      const validatedData = OllamaResponseSchema.parse(rawJson);

      return validatedData;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        'Failed to classify lead with Ollama or invalid JSON returned',
        errorMessage,
      );
      throw new Error(`AI Classification Failed: ${errorMessage}`);
    }
  }
}
