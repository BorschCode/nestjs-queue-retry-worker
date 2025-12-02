import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MessageQueueService } from '../src/queue/services/message-queue.service';
import { DeliveryChannelFactory } from '../src/queue/channels/delivery-channel.factory';
import { MessagePayload } from '../src/queue/interfaces/message-payload.interface';
import { QUEUE_CONFIG } from '../src/queue/config/queue.config';

describe('Dead-Letter Queue Integration Tests (e2e)', () => {
  let app: INestApplication;
  let messageQueueService: MessageQueueService;
  let deliveryChannelFactory: DeliveryChannelFactory;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    messageQueueService = moduleFixture.get<MessageQueueService>(
      MessageQueueService,
    );
    deliveryChannelFactory = moduleFixture.get<DeliveryChannelFactory>(
      DeliveryChannelFactory,
    );

    // Clean up queues before starting tests
    const mainQueue = messageQueueService['messageQueue'];
    const deadLetterQueue = messageQueueService['deadLetterQueue'];

    await mainQueue.obliterate({ force: true });
    await deadLetterQueue.obliterate({ force: true });
  });

  afterAll(async () => {
    // Clean up queues and ensure no pending jobs
    const mainQueue = messageQueueService['messageQueue'];
    const deadLetterQueue = messageQueueService['deadLetterQueue'];

    // Remove all jobs in all states
    await mainQueue.obliterate({ force: true });
    await deadLetterQueue.obliterate({ force: true });

    await app.close();
  });

  describe('Dead-Letter Transitions', () => {
    let deliverSpy: jest.SpyInstance;

    afterEach(() => {
      // Ensure mock is restored after each test
      if (deliverSpy) {
        deliverSpy.mockRestore();
      }
    });

    it('should move message to dead-letter queue after max retries', async () => {
      // Mock the delivery to always fail
      deliverSpy = jest
        .spyOn(deliveryChannelFactory, 'deliver')
        .mockRejectedValue(new Error('Simulated delivery failure'));

      const message: MessagePayload = {
        id: 'dead-letter-test-1',
        channel: 'http',
        destination: 'https://invalid-endpoint.example.com/webhook',
        data: { test: 'data' },
      };

      await messageQueueService.addMessage(message);

      // Wait for all retries to complete and move to dead-letter
      // This will take some time due to exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 35000));

      // Check dead-letter queue
      const deadLetterJobs = await messageQueueService.getDeadLetterJobs(0, 10);

      const movedJob = deadLetterJobs.find(
        (j) => j.data.message.id === message.id,
      );

      expect(movedJob).toBeDefined();
      expect(movedJob?.data.attemptCount).toBe(QUEUE_CONFIG.MAX_RETRY_ATTEMPTS);
      expect(movedJob?.data.lastError).toContain('Simulated delivery failure');
    }, 60000);

    it('should retrieve dead-letter queue jobs via API', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/queue/dead-letter?start=0&end=10')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should requeue message from dead-letter queue', async () => {
      // First, get a job from dead-letter queue
      const deadLetterJobs = await messageQueueService.getDeadLetterJobs(0, 1);

      if (deadLetterJobs.length > 0) {
        const jobId = deadLetterJobs[0].id;

        // Mock delivery to succeed this time to avoid long retries
        deliverSpy = jest
          .spyOn(deliveryChannelFactory, 'deliver')
          .mockResolvedValue(undefined);

        const response = await request(app.getHttpServer())
          .post(`/admin/queue/requeue/${jobId}`)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('requeued successfully');

        // Wait for the requeued job to be processed
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }, 30000);
  });

  describe('Error Logging', () => {
    it('should log failure reasons in dead-letter queue', async () => {
      const deadLetterJobs = await messageQueueService.getDeadLetterJobs(0, 10);

      if (deadLetterJobs.length > 0) {
        const job = deadLetterJobs[0];
        expect(job.data).toHaveProperty('lastError');
        expect(job.data.lastError).toBeDefined();
      }
    });
  });
});
