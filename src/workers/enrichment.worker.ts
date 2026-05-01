import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  RabbitmqService,
  ENRICHMENT_QUEUE,
  CLASSIFICATION_QUEUE,
} from '../rabbitmq/rabbitmq.service';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as amqp from 'amqplib';

interface EnrichmentMessage {
  leadId: string;
}

@Injectable()
export class EnrichmentWorker implements OnModuleInit {
  private readonly logger = new Logger(EnrichmentWorker.name);

  constructor(
    private readonly rabbitmqService: RabbitmqService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.rabbitmqService.channelWrapper.addSetup(
      async (channel: amqp.ConfirmChannel) => {
        await channel.consume(
          ENRICHMENT_QUEUE,
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          async (msg: amqp.ConsumeMessage | null) => {
            if (!msg) return;

            const content = JSON.parse(
              msg.content.toString(),
            ) as EnrichmentMessage;
            const { leadId } = content;

            try {
              this.logger.log(`Processing enrichment for lead ${leadId}`);

              // 1. Atualizar status do lead para ENRICHING
              await this.prisma.lead.update({
                where: { id: leadId },
                data: { status: 'ENRICHING' },
              });

              const lead = await this.prisma.lead.findUnique({
                where: { id: leadId },
              });
              if (!lead) throw new Error('Lead not found');

              // 2. Chamar Mock API
              const mockApiUrl =
                process.env.MOCK_API_URL || 'http://localhost:4000';
              const response = await axios.get<Record<string, any>>(
                `${mockApiUrl}/enrich/${lead.companyCnpj}`,
              );
              const data = response.data;

              // 3. Salvar Histórico de Enriquecimento (com campos JSONB)
              await this.prisma.enrichment.create({
                data: {
                  leadId,
                  companyName: String(data.companyName || ''),
                  tradeName: String(data.tradeName || ''),
                  cnpj: String(data.cnpj || ''),
                  industry: String(data.industry || ''),
                  legalNature: String(data.legalNature || ''),
                  employeeCount: Number(data.employeeCount || 0),
                  annualRevenue: Number(data.annualRevenue || 0),
                  foundedAt: data.foundedAt
                    ? new Date(String(data.foundedAt))
                    : null,
                  address: data.address as Record<string, unknown>,
                  cnaes: data.cnaes as Record<string, unknown>[],
                  partners: data.partners as Record<string, unknown>[],
                  phones: data.phones as Record<string, unknown>[],
                  emails: data.emails as Record<string, unknown>[],
                  status: 'SUCCESS',
                  completedAt: new Date(),
                },
              });

              // 4. Atualizar status do lead para ENRICHED
              await this.prisma.lead.update({
                where: { id: leadId },
                data: { status: 'ENRICHED' },
              });

              // 5. ENCADEAMENTO DE FILAS: Disparar Classificação após sucesso
              this.logger.log(
                `Enrichment successful. Dispatching classification for lead ${leadId}`,
              );
              await this.rabbitmqService.publish(CLASSIFICATION_QUEUE, {
                leadId,
              });

              channel.ack(msg);
            } catch (error: unknown) {
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
              this.logger.error(
                `Failed to enrich lead ${leadId}`,
                errorMessage,
              );

              // Registrar falha no histórico
              await this.prisma.enrichment.create({
                data: {
                  leadId,
                  status: 'FAILED',
                  errorMessage,
                  completedAt: new Date(),
                },
              });

              // Atualizar status do lead para FAILED
              await this.prisma.lead.update({
                where: { id: leadId },
                data: { status: 'FAILED' },
              });

              // Nack para enviar para DLQ em caso de erro de infraestrutura
              // Em um cenário real, diferenciaríamos erros de negócio (ack) de infra (nack)
              channel.nack(msg, false, false);
            }
          },
        );
      },
    );
  }
}
