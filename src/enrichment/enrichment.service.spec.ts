import { Test, TestingModule } from '@nestjs/testing';
import { EnrichmentService } from './enrichment.service';

describe('EnrichmentService', () => {
  let service: EnrichmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnrichmentService],
    }).compile();

    service = module.get<EnrichmentService>(EnrichmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
