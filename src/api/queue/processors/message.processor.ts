import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Job } from 'bullmq';
import { QUEUE_CONFIG, getBackoffDelay } from '../config/queue.config';
import { JobData, JobType } from '../interfaces/job-data.interface';
import { DeliveryChannelFactory } from '../channels/delivery-channel.factory';
import { EmailChannel } from '../channels/email.channel';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Processor(QUEUE_CONFIG.QUEUE_NAME, {
  concurrency: 5,
})
export class MessageProcessor extends WorkerHost {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly deliveryChannelFactory: DeliveryChannelFactory,
    private readonly emailChannel: EmailChannel,
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

    // Send admin notifications before moving to DLQ
    await this.sendAdminNotification(job, errorMessage);

    // Add to dead-letter queue for manual review
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

    this.logger.log(
      `Message ${job.data.message.id} added to dead-letter queue for manual review`,
      'MessageProcessor',
    );
  }

  private async sendAdminNotification(
    job: Job<JobData>,
    errorMessage: string,
  ): Promise<void> {
    const adminEmails = this.configService.get<string>('ADMIN_EMAILS', '');

    if (!adminEmails) {
      this.logger.warn(
        'ADMIN_EMAILS not configured, skipping admin notification',
        'MessageProcessor',
      );
      return;
    }

    const emails = adminEmails.split(',').map((email) => email.trim());
    const { message, attemptCount, firstAttemptedAt } = job.data;

    const emailSubject = `[ALERT] Message Failed After ${attemptCount} Attempts - Job ${job.id}`;
    const emailBody = this.buildNotificationEmail(
      job,
      message,
      attemptCount,
      errorMessage,
      firstAttemptedAt,
    );

    // Send email to each admin
    for (const adminEmail of emails) {
      try {
        await this.emailChannel.deliver({
          id: `admin-notification-${job.id}-${Date.now()}`,
          channel: message.channel,
          destination: adminEmail,
          data: {
            subject: emailSubject,
            html: emailBody,
            text: emailBody.replace(/<[^>]*>/g, ''),
          },
        });

        this.logger.log(
          `Admin notification sent to ${adminEmail} for message ${message.id}`,
          'MessageProcessor',
        );
      } catch (error) {
        this.logger.error(
          `Failed to send admin notification to ${adminEmail}: ${error.message}`,
          error.stack,
          'MessageProcessor',
        );
      }
    }
  }

  private buildNotificationEmail(
    job: Job<JobData>,
    message: any,
    attemptCount: number,
    lastError: string,
    firstAttemptedAt: Date,
  ): string {
    const failedAt = new Date();
    const duration = Math.round(
      (failedAt.getTime() - new Date(firstAttemptedAt).getTime()) / 1000,
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 15px; border-radius: 5px; }
          .content { background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .section { margin: 15px 0; }
          .label { font-weight: bold; color: #495057; }
          .value { margin-left: 10px; }
          .error-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
          .footer { text-align: center; color: #6c757d; font-size: 12px; margin-top: 20px; }
          pre { background-color: #e9ecef; padding: 10px; border-radius: 3px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⚠️ Dead Letter Queue Alert</h2>
          </div>

          <div class="content">
            <div class="section">
              <p><span class="label">Job ID:</span><span class="value">${job.id}</span></p>
              <p><span class="label">Message ID:</span><span class="value">${message.id}</span></p>
              <p><span class="label">Channel:</span><span class="value">${message.channel}</span></p>
              <p><span class="label">Destination:</span><span class="value">${message.destination}</span></p>
            </div>

            <div class="section">
              <p><span class="label">Attempts Made:</span><span class="value">${attemptCount}</span></p>
              <p><span class="label">First Attempt:</span><span class="value">${new Date(firstAttemptedAt).toLocaleString()}</span></p>
              <p><span class="label">Failed At:</span><span class="value">${failedAt.toLocaleString()}</span></p>
              <p><span class="label">Duration:</span><span class="value">${duration} seconds</span></p>
            </div>

            <div class="error-box">
              <p class="label">Error:</p>
              <pre>${lastError || 'Unknown error'}</pre>
            </div>

            <div class="section">
              <p class="label">Message Data:</p>
              <pre>${JSON.stringify(message.data, null, 2)}</pre>
            </div>
          </div>

          <div class="footer">
            <p>This is an automated notification from the Message Queue Service.</p>
            <p>To requeue this job, use: POST /api/admin/queue/requeue/${job.id}</p>
          </div>
        </div>
      </body>
      </html>
    `;
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
