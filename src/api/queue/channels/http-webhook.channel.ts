import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { firstValueFrom } from 'rxjs';
import { BaseDeliveryChannel } from './base-delivery.channel';
import { MessagePayload } from '../interfaces/message-payload.interface';

@Injectable()
export class HttpWebhookChannel extends BaseDeliveryChannel {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    protected readonly logger: LoggerService,
    private readonly httpService: HttpService,
  ) {
    super(logger);
  }

  async deliver(message: MessagePayload): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          message.destination,
          {
            id: message.id,
            data: message.data,
            metadata: message.metadata,
          },
          {
            timeout: 10000, // 10 second timeout
            headers: {
              'Content-Type': 'application/json',
              'X-Message-Id': message.id,
            },
          },
        ),
      );

      if (response.status >= 200 && response.status < 300) {
        this.logSuccess(message);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.logFailure(message, error);
      throw error;
    }
  }
}
