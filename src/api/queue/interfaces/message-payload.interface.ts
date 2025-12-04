export interface MessagePayload {
  id: string;
  channel: 'http' | 'email' | 'internal';
  destination: string;
  data: any;
  metadata?: Record<string, any>;
}
