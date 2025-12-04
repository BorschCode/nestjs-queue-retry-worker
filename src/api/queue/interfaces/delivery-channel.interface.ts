import { MessagePayload } from './message-payload.interface';

export interface DeliveryChannel {
  deliver(message: MessagePayload): Promise<void>;
}
