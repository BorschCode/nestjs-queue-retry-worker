import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MessageQueueService } from '../src/queue/services/message-queue.service';
import { MessagePayload } from '../src/queue/interfaces/message-payload.interface';
import { QUEUE_CONFIG } from '../src/queue/config/queue.config';

describe('Queue Integration Tests (e2e)', () => {
  let app: INestApplication;
  let messageQueueService: MessageQueueService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    messageQueueService = moduleFixture.get<MessageQueueService>(
      MessageQueueService,
    );

    // Clean up queues before starting tests
    const mainQueue = messageQueueService['messageQueue'];
    const deadLetterQueue = messageQueueService['deadLetterQueue'];

    await mainQueue.obliterate({ force: true });
    await deadLetterQueue.obliterate({ force: true });
  });

  afterAll(async () => {
    // Clean up queues after tests
    const mainQueue = messageQueueService['messageQueue'];
    const deadLetterQueue = messageQueueService['deadLetterQueue'];

    await mainQueue.obliterate({ force: true });
    await deadLetterQueue.obliterate({ force: true });

    await app.close();
  });

  describe('Message Queue Processing', () => {
    it('should add a message to the queue via API', async () => {
      const message: MessagePayload = {
        id: 'e2e-test-1',
        channel: 'internal',
        destination: 'test-service',
        data: { test: 'data' },
      };

      const response = await request(app.getHttpServer())
        .post('/admin/queue/message')
        .send(message)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
    });

    it('should retrieve queue stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/queue/stats')
        .expect(200);

      expect(response.body).toHaveProperty('mainQueue');
      expect(response.body).toHaveProperty('deadLetterQueue');
      expect(response.body.mainQueue).toHaveProperty('waiting');
      expect(response.body.mainQueue).toHaveProperty('active');
      expect(response.body.mainQueue).toHaveProperty('completed');
      expect(response.body.mainQueue).toHaveProperty('failed');
    });

    it('should retrieve queue jobs', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/queue/jobs?state=waiting&start=0&end=10')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Queue Service Direct Tests', () => {
    it('should process internal service message successfully', async () => {
      const message: MessagePayload = {
        id: 'direct-test-1',
        channel: 'internal',
        destination: 'test-service',
        data: { action: 'process' },
      };

      const job = await messageQueueService.addMessage(message);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.message.id).toBe(message.id);

      // Wait for job to be processed
      await job.waitUntilFinished(messageQueueService['messageQueue'] as any);

      const completedJob = await messageQueueService.getJobById(job.id);
      expect(completedJob).toBeDefined();
    }, 30000);

    it('should get queue statistics', async () => {
      const stats = await messageQueueService.getQueueStats();

      expect(stats).toBeDefined();
      expect(stats.mainQueue).toBeDefined();
      expect(stats.deadLetterQueue).toBeDefined();
      expect(typeof stats.mainQueue.waiting).toBe('number');
      expect(typeof stats.mainQueue.active).toBe('number');
      expect(typeof stats.mainQueue.completed).toBe('number');
    });
  });
});
