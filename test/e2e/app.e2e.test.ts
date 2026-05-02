import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RabbitmqService, ENRICHMENT_QUEUE } from '../../src/rabbitmq/rabbitmq.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let rabbitmqService: RabbitmqService;

  const mockPrismaService = {
    lead: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  const mockRabbitmqService = {
    publish: jest.fn(),
    channelWrapper: {
      addSetup: jest.fn(),
    },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(RabbitmqService)
      .useValue(mockRabbitmqService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    rabbitmqService = moduleFixture.get<RabbitmqService>(RabbitmqService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  describe('/leads (POST)', () => {
    it('should create a lead and trigger enrichment pipeline', async () => {
      const createLeadDto = {
        fullName: 'E2E Test Lead',
        email: 'e2e@test.com',
        phone: '+5511999999999',
        companyName: 'E2E Corp',
        companyCnpj: '99888777000166',
        source: 'WEBSITE',
      };

      const mockCreatedLead = {
        id: 'e2e-uuid-123',
        ...createLeadDto,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockPrismaService.lead.findUnique.mockResolvedValue(null);
      mockPrismaService.lead.create.mockResolvedValue(mockCreatedLead);

      const response = await request(app.getHttpServer())
        .post('/leads')
        .send(createLeadDto)
        .expect(201);

      expect(response.body).toEqual(mockCreatedLead);

      // Verify the pipeline was triggered correctly (only enrichment)
      expect(mockRabbitmqService.publish).toHaveBeenCalledTimes(1);
      expect(mockRabbitmqService.publish).toHaveBeenCalledWith(ENRICHMENT_QUEUE, {
        leadId: mockCreatedLead.id,
      });
    });

    it('should return 400 Bad Request for invalid data', async () => {
      const invalidDto = {
        email: 'not-an-email',
        // missing required fields
      };

      await request(app.getHttpServer())
        .post('/leads')
        .send(invalidDto)
        .expect(400);
    });
  });
});
