import { DeliveryChannel } from '../enums/delivery-channel.enum';

export interface MessagePayload {
  id: string;
  channel: DeliveryChannel;
  destination: string;
  data: any;
  metadata?: Record<string, any>;
}
