import { Module } from '@nestjs/common';
import { EnrichmentService } from './enrichment.service';

@Module({
  providers: [EnrichmentService],
})
export class EnrichmentModule {}
