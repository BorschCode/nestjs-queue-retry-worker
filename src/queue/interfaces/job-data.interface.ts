import { MessagePayload } from './message-payload.interface';

export interface JobData {
  message: MessagePayload;
  attemptCount: number;
  lastError?: string;
  firstAttemptedAt?: Date;
}

export enum JobType {
  DELIVER = 'deliver',
  RETRY = 'retry',
  DEAD_LETTER = 'dead_letter',
}
