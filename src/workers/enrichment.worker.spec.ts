import { Test, TestingModule } from '@nestjs/testing';
import { EnrichmentWorker } from './enrichment.worker';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitmqService, CLASSIFICATION_QUEUE } from '../rabbitmq/rabbitmq.service';
import axios from 'axios';
import * as amqp from 'amqplib';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EnrichmentWorker', () => {
  let worker: EnrichmentWorker;
  let prismaService: PrismaService;
  let rabbitmqService: RabbitmqService;

  const mockPrismaService = {
    lead: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    enrichment: {
      create: jest.fn(),
    },
  };

  const mockRabbitmqService = {
    channelWrapper: {
      addSetup: jest.fn(),
    },
    publish: jest.fn(),
  };

  const mockChannel = {
    assertQueue: jest.fn(),
    consume: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
  } as unknown as amqp.ConfirmChannel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrichmentWorker,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RabbitmqService, useValue: mockRabbitmqService },
      ],
    }).compile();

    worker = module.get<EnrichmentWorker>(EnrichmentWorker);
    prismaService = module.get<PrismaService>(PrismaService);
    rabbitmqService = module.get<RabbitmqService>(RabbitmqService);

    jest.clearAllMocks();
  });

  describe('processMessage', () => {
    const leadId = 'lead-123';
    const mockMsg = {
      content: Buffer.from(JSON.stringify({ leadId })),
    } as amqp.ConsumeMessage;

    it('should process enrichment successfully and publish to classification queue', async () => {
      // Mock db lead
      mockPrismaService.lead.findUnique.mockResolvedValue({
        id: leadId,
        companyCnpj: '12345678000199',
      });

      // Mock axios response
      mockedAxios.get.mockResolvedValue({
        data: {
          companyName: 'Mocked Corp',
          employeeCount: 50,
        },
      });

      await worker.processMessage(mockMsg, mockChannel);

      // 1. Updates status to ENRICHING
      expect(mockPrismaService.lead.update).toHaveBeenNthCalledWith(1, {
        where: { id: leadId },
        data: { status: 'ENRICHING' },
      });

      // 2. Calls Mock API
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/enrich/12345678000199'));

      // 3. Creates Enrichment record
      expect(mockPrismaService.enrichment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId,
          companyName: 'Mocked Corp',
          status: 'SUCCESS',
        }),
      });

      // 4. Updates status to ENRICHED
      expect(mockPrismaService.lead.update).toHaveBeenNthCalledWith(2, {
        where: { id: leadId },
        data: { status: 'ENRICHED' },
      });

      // 5. Publishes to classification queue
      expect(mockRabbitmqService.publish).toHaveBeenCalledWith(CLASSIFICATION_QUEUE, { leadId });

      // 6. Acks the message
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
    });

    it('should handle errors, save failed status and nack message', async () => {
      // Mock db lead
      mockPrismaService.lead.findUnique.mockResolvedValue({
        id: leadId,
        companyCnpj: '12345678000199',
      });

      // Mock axios to throw error
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await worker.processMessage(mockMsg, mockChannel);

      // 1. Creates failed Enrichment record
      expect(mockPrismaService.enrichment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId,
          status: 'FAILED',
          errorMessage: 'API Error',
        }),
      });

      // 2. Updates lead status to FAILED
      expect(mockPrismaService.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: { status: 'FAILED' },
      });

      // 3. Nacks the message
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMsg, false, false);
      expect(mockRabbitmqService.publish).not.toHaveBeenCalled();
    });
  });
});
