import { Module } from '@nestjs/common';
import { EnrichmentWorker } from './enrichment.worker';
import { ClassificationWorker } from './classification.worker';
import { ClassificationModule } from '../classification/classification.module';

@Module({
  imports: [ClassificationModule],
  providers: [EnrichmentWorker, ClassificationWorker],
})
export class WorkersModule {}
