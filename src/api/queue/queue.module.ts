import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { QUEUE_CONFIG } from './config/queue.config';
import { MessageQueueService } from './services/message-queue.service';
import { MessageProcessor } from './processors/message.processor';
import { DeadLetterProcessor } from './processors/dead-letter.processor';
import { QueueController } from './queue.controller';
import {
  HttpWebhookChannel,
  EmailChannel,
  InternalServiceChannel,
  DeliveryChannelFactory,
} from './channels';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      {
        name: QUEUE_CONFIG.QUEUE_NAME,
      },
      {
        name: QUEUE_CONFIG.DEAD_LETTER_QUEUE_NAME,
      },
    ),
  ],
  controllers: [QueueController],
  providers: [
    MessageQueueService,
    MessageProcessor,
    DeadLetterProcessor,
    HttpWebhookChannel,
    EmailChannel,
    InternalServiceChannel,
    DeliveryChannelFactory,
  ],
  exports: [MessageQueueService, BullModule],
})
export class QueueModule {}
