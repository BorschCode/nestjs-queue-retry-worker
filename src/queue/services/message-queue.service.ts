import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { QUEUE_CONFIG, getBackoffDelay } from '../config/queue.config';
import { MessagePayload } from '../interfaces/message-payload.interface';
import { JobData, JobType } from '../interfaces/job-data.interface';

@Injectable()
export class MessageQueueService {
  constructor(
    @InjectQueue(QUEUE_CONFIG.QUEUE_NAME)
    private readonly messageQueue: Queue,
    @InjectQueue(QUEUE_CONFIG.DEAD_LETTER_QUEUE_NAME)
    private readonly deadLetterQueue: Queue,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async addMessage(message: MessagePayload): Promise<Job<JobData>> {
    this.logger.log(
      `Adding message ${message.id} to queue for ${message.channel} delivery`,
      'MessageQueueService',
    );

    const jobData: JobData = {
      message,
      attemptCount: 1,
      firstAttemptedAt: new Date(),
    };

    return this.messageQueue.add(JobType.DELIVER, jobData, {
      attempts: QUEUE_CONFIG.MAX_RETRY_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: QUEUE_CONFIG.BACKOFF.delay,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000,
      },
      removeOnFail: false, // Keep failed jobs for inspection
    });
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.messageQueue.getWaitingCount(),
      this.messageQueue.getActiveCount(),
      this.messageQueue.getCompletedCount(),
      this.messageQueue.getFailedCount(),
      this.messageQueue.getDelayedCount(),
    ]);

    const [dlWaiting, dlActive, dlCompleted] = await Promise.all([
      this.deadLetterQueue.getWaitingCount(),
      this.deadLetterQueue.getActiveCount(),
      this.deadLetterQueue.getCompletedCount(),
    ]);

    return {
      mainQueue: {
        waiting,
        active,
        completed,
        failed,
        delayed,
      },
      deadLetterQueue: {
        waiting: dlWaiting,
        active: dlActive,
        completed: dlCompleted,
      },
    };
  }

  async getJobs(
    state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' = 'waiting',
    start = 0,
    end = 10,
  ): Promise<Job[]> {
    return this.messageQueue.getJobs([state], start, end);
  }

  async getDeadLetterJobs(start = 0, end = 10): Promise<Job[]> {
    return this.deadLetterQueue.getJobs(['waiting', 'completed'], start, end);
  }

  async requeueFromDeadLetter(jobId: string): Promise<void> {
    const job = await this.deadLetterQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found in dead-letter queue`);
    }

    this.logger.log(
      `Requeuing message ${job.data.message.id} from dead-letter queue`,
      'MessageQueueService',
    );

    // Reset attempt count and add back to main queue
    const jobData: JobData = {
      ...job.data,
      attemptCount: 1,
      lastError: undefined,
    };

    await this.addMessage(jobData.message);
    await job.remove();

    this.logger.log(
      `Message ${job.data.message.id} requeued successfully`,
      'MessageQueueService',
    );
  }

  async getJobById(jobId: string): Promise<Job | undefined> {
    return this.messageQueue.getJob(jobId);
  }

  async removeJob(jobId: string): Promise<void> {
    const job = await this.messageQueue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }
}
