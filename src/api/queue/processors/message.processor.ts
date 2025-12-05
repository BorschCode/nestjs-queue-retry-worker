import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Job } from 'bullmq';
import { QUEUE_CONFIG, getBackoffDelay } from '../config/queue.config';
import { JobData, JobType } from '../interfaces/job-data.interface';
import { DeliveryChannelFactory } from '../channels/delivery-channel.factory';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Processor(QUEUE_CONFIG.QUEUE_NAME, {
  concurrency: 5,
})
export class MessageProcessor extends WorkerHost {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly deliveryChannelFactory: DeliveryChannelFactory,
    @InjectQueue(QUEUE_CONFIG.DEAD_LETTER_QUEUE_NAME)
    private readonly deadLetterQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<JobData>): Promise<void> {
    const { message, attemptCount } = job.data;

    this.logger.log(
      `Processing job ${job.id} for message ${message.id} (attempt ${attemptCount}/${QUEUE_CONFIG.MAX_RETRY_ATTEMPTS})`,
      'MessageProcessor',
    );

    try {
      await this.deliveryChannelFactory.deliver(message);

      this.logger.log(
        `Successfully delivered message ${message.id}`,
        'MessageProcessor',
      );
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';

      this.logger.error(
        `Failed to deliver message ${message.id} on attempt ${attemptCount}: ${errorMessage}`,
        error.stack,
        'MessageProcessor',
      );

      // Check if we've exceeded max attempts
      if (attemptCount >= QUEUE_CONFIG.MAX_RETRY_ATTEMPTS) {
        // Move to dead-letter queue
        await this.moveToDeadLetter(job, errorMessage);
        return;
      }

      // Schedule retry with exponential backoff
      await this.scheduleRetry(job, errorMessage);

      // Re-throw to mark job as failed
      throw error;
    }
  }

  private async scheduleRetry(
    job: Job<JobData>,
    errorMessage: string,
  ): Promise<void> {
    const nextAttempt = job.data.attemptCount + 1;
    const delay = getBackoffDelay(nextAttempt);

    this.logger.log(
      `Scheduling retry ${nextAttempt} for message ${job.data.message.id} in ${delay}ms`,
      'MessageProcessor',
    );

    await job.updateData({
      ...job.data,
      attemptCount: nextAttempt,
      lastError: errorMessage,
      firstAttemptedAt: job.data.firstAttemptedAt || new Date(),
    });

    // BullMQ will automatically retry based on job configuration
  }

  private async moveToDeadLetter(
    job: Job<JobData>,
    errorMessage: string,
  ): Promise<void> {
    this.logger.error(
      `Moving message ${job.data.message.id} to dead-letter queue after ${QUEUE_CONFIG.MAX_RETRY_ATTEMPTS} failed attempts`,
      '',
      'MessageProcessor',
    );

    await this.deadLetterQueue.add(
      JobType.DEAD_LETTER,
      {
        ...job.data,
        lastError: errorMessage,
        movedToDeadLetterAt: new Date(),
      },
      {
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<JobData>) {
    this.logger.log(
      `Job ${job.id} completed for message ${job.data.message.id}`,
      'MessageProcessor',
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<JobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for message ${job.data.message.id}: ${error.message}`,
      error.stack,
      'MessageProcessor',
    );
  }
}
