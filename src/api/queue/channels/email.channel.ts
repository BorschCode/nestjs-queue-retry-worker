import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as nodemailer from 'nodemailer';
import { BaseDeliveryChannel } from './base-delivery.channel';
import { MessagePayload } from '../interfaces/message-payload.interface';

@Injectable()
export class EmailChannel extends BaseDeliveryChannel {
  private transporter: nodemailer.Transporter;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    protected readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    super(logger);
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'mailpit'),
      port: this.configService.get('SMTP_PORT', 1025),
      secure: false,
      auth: this.configService.get('SMTP_USER')
        ? {
            user: this.configService.get('SMTP_USER'),
            pass: this.configService.get('SMTP_PASS'),
          }
        : undefined,
    });
  }

  async deliver(message: MessagePayload): Promise<void> {
    try {
      const defaultFromAddress = this.configService.get(
        'MAIL_FROM_ADDRESS',
        'noreply@example.com',
      );
      const defaultFromName = this.configService.get(
        'MAIL_FROM_NAME',
        'Message Queue Service',
      );

      const fromAddress = message.data.from || defaultFromAddress;
      const fromName = message.data.fromName || defaultFromName;
      const from = `"${fromName}" <${fromAddress}>`;

      const mailOptions = {
        from: from,
        to: message.destination,
        subject: message.data.subject || 'Message Notification',
        text: message.data.text,
        html: message.data.html,
      };

      await this.transporter.sendMail(mailOptions);
      this.logSuccess(message);
    } catch (error) {
      this.logFailure(message, error);
      throw error;
    }
  }
}
