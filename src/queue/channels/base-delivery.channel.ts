import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DeliveryChannel } from '../interfaces/delivery-channel.interface';
import { MessagePayload } from '../interfaces/message-payload.interface';

export abstract class BaseDeliveryChannel implements DeliveryChannel {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    protected readonly logger: LoggerService,
  ) {}

  abstract deliver(message: MessagePayload): Promise<void>;

  protected logSuccess(message: MessagePayload): void {
    this.logger.log(
      `Message ${message.id} delivered successfully to ${message.destination}`,
      'DeliveryChannel',
    );
  }

  protected logFailure(message: MessagePayload, error: Error): void {
    this.logger.error(
      `Failed to deliver message ${message.id} to ${message.destination}: ${error.message}`,
      error.stack,
      'DeliveryChannel',
    );
  }
}
