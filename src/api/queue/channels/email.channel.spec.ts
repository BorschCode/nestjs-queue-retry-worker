import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EmailChannel } from './email.channel';
import { MessagePayload } from '../interfaces/message-payload.interface';
import { DeliveryChannel } from '../enums/delivery-channel.enum';

describe('EmailChannel', () => {
  let channel: EmailChannel;
  let logger: any;

  beforeEach(async () => {
    logger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailChannel,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                SMTP_HOST: 'mailpit',
                SMTP_PORT: 1025,
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: logger,
        },
      ],
    }).compile();

    channel = module.get<EmailChannel>(EmailChannel);
  });

  it('should be defined', () => {
    expect(channel).toBeDefined();
  });

  describe('deliver', () => {
    const mockMessage: MessagePayload = {
      id: 'test-message-1',
      channel: DeliveryChannel.EMAIL,
      destination: 'test@example.com',
      data: {
        from: 'sender@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
        html: '<p>This is a test email</p>',
      },
    };

    it('should successfully deliver an email', async () => {
      // Mock the transporter sendMail method
      const sendMailSpy = jest
        .spyOn(channel['transporter'], 'sendMail')
        .mockResolvedValue({} as any);

      await channel.deliver(mockMessage);

      expect(sendMailSpy).toHaveBeenCalledWith({
        from: '"Message Queue Service" <sender@example.com>',
        to: mockMessage.destination,
        subject: mockMessage.data.subject,
        text: mockMessage.data.text,
        html: mockMessage.data.html,
      });

      expect(logger.log).toHaveBeenCalled();
    });

    it('should throw error on email delivery failure', async () => {
      const error = new Error('SMTP connection failed');

      jest.spyOn(channel['transporter'], 'sendMail').mockRejectedValue(error);

      await expect(channel.deliver(mockMessage)).rejects.toThrow(
        'SMTP connection failed',
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
