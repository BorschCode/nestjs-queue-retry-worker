import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Job, Queue } from 'bullmq';
import { MessageProcessor } from './message.processor';
import { DeliveryChannelFactory } from '../channels/delivery-channel.factory';
import { EmailChannel } from '../channels/email.channel';
import { QUEUE_CONFIG } from '../config/queue.config';
import { JobData, JobType } from '../interfaces/job-data.interface';
import { MessagePayload } from '../interfaces/message-payload.interface';
import { DeliveryChannel } from '../enums/delivery-channel.enum';

describe('MessageProcessor', () => {
  let processor: MessageProcessor;
  let deliveryChannelFactory: DeliveryChannelFactory;
  let deadLetterQueue: Queue;
  let logger: any;

  beforeEach(async () => {
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageProcessor,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => defaultValue),
          },
        },
        {
          provide: DeliveryChannelFactory,
          useValue: {
            deliver: jest.fn(),
          },
        },
        {
          provide: EmailChannel,
          useValue: {
            deliver: jest.fn(),
          },
        },
        {
          provide: getQueueToken(QUEUE_CONFIG.DEAD_LETTER_QUEUE_NAME),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: logger,
        },
      ],
    }).compile();

    processor = module.get<MessageProcessor>(MessageProcessor);
    deliveryChannelFactory = module.get<DeliveryChannelFactory>(
      DeliveryChannelFactory,
    );
    deadLetterQueue = module.get<Queue>(
      getQueueToken(QUEUE_CONFIG.DEAD_LETTER_QUEUE_NAME),
    );
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    const mockMessage: MessagePayload = {
      id: 'test-message-1',
      channel: DeliveryChannel.HTTP,
      destination: 'https://example.com/webhook',
      data: { test: 'data' },
    };

    const createMockJob = (attemptCount: number): Partial<Job<JobData>> => ({
      id: 'job-1',
      data: {
        message: mockMessage,
        attemptCount,
        firstAttemptedAt: new Date(),
      },
      updateData: jest.fn(),
    });

    it('should successfully process a message on first attempt', async () => {
      const job = createMockJob(1) as Job<JobData>;
      jest.spyOn(deliveryChannelFactory, 'deliver').mockResolvedValue();

      await processor.process(job);

      expect(deliveryChannelFactory.deliver).toHaveBeenCalledWith(mockMessage);
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Successfully delivered'),
        'MessageProcessor',
      );
    });

    it('should schedule retry on delivery failure', async () => {
      const job = createMockJob(2) as Job<JobData>;
      const error = new Error('Delivery failed');

      jest.spyOn(deliveryChannelFactory, 'deliver').mockRejectedValue(error);

      await expect(processor.process(job)).rejects.toThrow('Delivery failed');

      expect(job.updateData).toHaveBeenCalledWith(
        expect.objectContaining({
          attemptCount: 3,
          lastError: 'Delivery failed',
        }),
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('should move to dead-letter queue after max attempts', async () => {
      const job = createMockJob(
        QUEUE_CONFIG.MAX_RETRY_ATTEMPTS,
      ) as Job<JobData>;
      const error = new Error('Final delivery failure');

      jest.spyOn(deliveryChannelFactory, 'deliver').mockRejectedValue(error);

      await processor.process(job);

      expect(deadLetterQueue.add).toHaveBeenCalledWith(
        JobType.DEAD_LETTER,
        expect.objectContaining({
          message: mockMessage,
          attemptCount: QUEUE_CONFIG.MAX_RETRY_ATTEMPTS,
          lastError: 'Final delivery failure',
        }),
        expect.objectContaining({
          removeOnComplete: false,
          removeOnFail: false,
        }),
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Moving message'),
        '',
        'MessageProcessor',
      );
    });

    it('should increment attempt counter correctly', async () => {
      const job = createMockJob(1) as Job<JobData>;
      const error = new Error('Transient error');

      jest.spyOn(deliveryChannelFactory, 'deliver').mockRejectedValue(error);

      await expect(processor.process(job)).rejects.toThrow('Transient error');

      expect(job.updateData).toHaveBeenCalledWith({
        message: mockMessage,
        attemptCount: 2,
        lastError: 'Transient error',
        firstAttemptedAt: expect.any(Date),
      });
    });
  });

  describe('event handlers', () => {
    const mockMessage: MessagePayload = {
      id: 'test-message-1',
      channel: DeliveryChannel.HTTP,
      destination: 'https://example.com/webhook',
      data: { test: 'data' },
    };

    it('should log on job completion', () => {
      const job = {
        id: 'job-1',
        data: {
          message: mockMessage,
          attemptCount: 1,
        },
      } as Job<JobData>;

      processor.onCompleted(job);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Job job-1 completed'),
        'MessageProcessor',
      );
    });

    it('should log on job failure', () => {
      const job = {
        id: 'job-1',
        data: {
          message: mockMessage,
          attemptCount: 1,
        },
      } as Job<JobData>;
      const error = new Error('Test error');

      processor.onFailed(job, error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Job job-1 failed'),
        error.stack,
        'MessageProcessor',
      );
    });
  });
});
