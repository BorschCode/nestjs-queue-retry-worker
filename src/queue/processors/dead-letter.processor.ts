import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Job } from 'bullmq';
import { QUEUE_CONFIG } from '../config/queue.config';
import { JobData } from '../interfaces/job-data.interface';

@Processor(QUEUE_CONFIG.DEAD_LETTER_QUEUE_NAME)
export class DeadLetterProcessor extends WorkerHost {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async process(job: Job<JobData>): Promise<void> {
    const { message, attemptCount, lastError, firstAttemptedAt } = job.data;

    this.logger.error(
      `Dead-letter queue processing message ${message.id}`,
      JSON.stringify({
        messageId: message.id,
        channel: message.channel,
        destination: message.destination,
        attemptCount,
        lastError,
        firstAttemptedAt,
        failedAt: new Date(),
      }),
      'DeadLetterProcessor',
    );

    // Here you could implement additional error handling:
    // - Send alerts to monitoring systems
    // - Store in a database for manual review
    // - Trigger error-handling workflows
    // - Send notifications to administrators

    // For now, we just log the failure
    this.logger.log(
      `Message ${message.id} logged in dead-letter queue for manual review`,
      'DeadLetterProcessor',
    );
  }
}
