import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';

export const ENRICHMENT_QUEUE = 'lead.enrichment';
export const CLASSIFICATION_QUEUE = 'lead.classification';
export const DLX_EXCHANGE = 'lead.dlx';
export const ENRICHMENT_DLQ = 'lead.enrichment.dlq';
export const CLASSIFICATION_DLQ = 'lead.classification.dlq';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connection: amqp.AmqpConnectionManager;
  public channelWrapper: ChannelWrapper;

  onModuleInit() {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

    this.connection = amqp.connect([url]);

    this.connection.on('connect', () =>
      this.logger.log('Connected to RabbitMQ'),
    );
    this.connection.on('disconnect', (err) =>
      this.logger.error('Disconnected from RabbitMQ', err),
    );

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        // Setup DLX
        await channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });

        // Setup DLQs
        await channel.assertQueue(ENRICHMENT_DLQ, { durable: true });
        await channel.assertQueue(CLASSIFICATION_DLQ, { durable: true });

        // Bind DLQs to DLX
        await channel.bindQueue(ENRICHMENT_DLQ, DLX_EXCHANGE, ENRICHMENT_QUEUE);
        await channel.bindQueue(
          CLASSIFICATION_DLQ,
          DLX_EXCHANGE,
          CLASSIFICATION_QUEUE,
        );

        // Setup Main Queues with DLX configuration
        await channel.assertQueue(ENRICHMENT_QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': DLX_EXCHANGE,
            'x-dead-letter-routing-key': ENRICHMENT_QUEUE,
          },
        });

        await channel.assertQueue(CLASSIFICATION_QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': DLX_EXCHANGE,
            'x-dead-letter-routing-key': CLASSIFICATION_QUEUE,
          },
        });
      },
    });
  }

  async publish(queue: string, message: Record<string, any>) {
    try {
      await this.channelWrapper.sendToQueue(queue, message, {
        persistent: true,
      });
      this.logger.log(`Message published to ${queue}`);
    } catch (error) {
      this.logger.error(`Failed to publish message to ${queue}`, error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.channelWrapper?.close();
    await this.connection?.close();
  }
}
