import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Job } from 'bullmq';
import { QUEUE_CONFIG } from '../config/queue.config';
import { JobData } from '../interfaces/job-data.interface';
import { EmailChannel } from '../channels/email.channel';

@Processor(QUEUE_CONFIG.DEAD_LETTER_QUEUE_NAME)
export class DeadLetterProcessor extends WorkerHost {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly emailChannel: EmailChannel,
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

    // Send notifications to administrators
    await this.sendAdminNotification(job);

    // Here you could implement additional error handling:
    // - Send alerts to monitoring systems
    // - Store in a database for manual review
    // - Trigger error-handling workflows

    this.logger.log(
      `Message ${message.id} logged in dead-letter queue for manual review`,
      'DeadLetterProcessor',
    );
  }

  private async sendAdminNotification(job: Job<JobData>): Promise<void> {
    const adminEmails = this.configService.get<string>('ADMIN_EMAILS', '');

    if (!adminEmails) {
      this.logger.warn(
        'ADMIN_EMAILS not configured, skipping admin notification',
        'DeadLetterProcessor',
      );
      return;
    }

    const emails = adminEmails.split(',').map((email) => email.trim());
    const { message, attemptCount, lastError, firstAttemptedAt } = job.data;

    const emailSubject = `[ALERT] Message Failed After ${attemptCount} Attempts - Job ${job.id}`;
    const emailBody = this.buildNotificationEmail(
      job,
      message,
      attemptCount,
      lastError,
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
          'DeadLetterProcessor',
        );
      } catch (error) {
        this.logger.error(
          `Failed to send admin notification to ${adminEmail}: ${error.message}`,
          error.stack,
          'DeadLetterProcessor',
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
}
