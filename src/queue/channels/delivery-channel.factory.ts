import { Injectable } from '@nestjs/common';
import { DeliveryChannel } from '../interfaces/delivery-channel.interface';
import { MessagePayload } from '../interfaces/message-payload.interface';
import { HttpWebhookChannel } from './http-webhook.channel';
import { EmailChannel } from './email.channel';
import { InternalServiceChannel } from './internal-service.channel';

@Injectable()
export class DeliveryChannelFactory {
  constructor(
    private readonly httpWebhookChannel: HttpWebhookChannel,
    private readonly emailChannel: EmailChannel,
    private readonly internalServiceChannel: InternalServiceChannel,
  ) {}

  getChannel(channelType: string): DeliveryChannel {
    switch (channelType) {
      case 'http':
        return this.httpWebhookChannel;
      case 'email':
        return this.emailChannel;
      case 'internal':
        return this.internalServiceChannel;
      default:
        throw new Error(`Unknown delivery channel type: ${channelType}`);
    }
  }

  async deliver(message: MessagePayload): Promise<void> {
    const channel = this.getChannel(message.channel);
    return channel.deliver(message);
  }
}
