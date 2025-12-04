import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseDeliveryChannel } from './base-delivery.channel';
import { MessagePayload } from '../interfaces/message-payload.interface';

@Injectable()
export class InternalServiceChannel extends BaseDeliveryChannel {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    protected readonly logger: LoggerService,
  ) {
    super(logger);
  }

  async deliver(message: MessagePayload): Promise<void> {
    try {
      // Simulate internal service call
      // In a real application, this would call another microservice or internal service
      this.logger.log(
        `Processing internal service message ${message.id} for ${message.destination}`,
        'InternalServiceChannel',
      );

      // Simulate processing
      await this.processInternally(message);

      this.logSuccess(message);
    } catch (error) {
      this.logFailure(message, error);
      throw error;
    }
  }

  private async processInternally(message: MessagePayload): Promise<void> {
    // Simulate internal processing logic
    // This is where you would call other services, modules, or perform internal operations
    return new Promise((resolve) => {
      setTimeout(() => {
        this.logger.log(
          `Internal service processed message: ${JSON.stringify(message.data)}`,
          'InternalServiceChannel',
        );
        resolve();
      }, 100);
    });
  }
}
