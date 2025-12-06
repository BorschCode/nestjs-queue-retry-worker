import { Injectable } from '@nestjs/common';
import { DeliveryChannel as IDeliveryChannel } from '../interfaces/delivery-channel.interface';
import { MessagePayload } from '../interfaces/message-payload.interface';
import { DeliveryChannel } from '../enums/delivery-channel.enum';
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

  getChannel(channelType: DeliveryChannel): IDeliveryChannel {
    switch (channelType) {
      case DeliveryChannel.HTTP:
        return this.httpWebhookChannel;
      case DeliveryChannel.EMAIL:
        return this.emailChannel;
      case DeliveryChannel.INTERNAL:
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
