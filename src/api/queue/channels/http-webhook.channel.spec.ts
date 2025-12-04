import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { of, throwError } from 'rxjs';
import { HttpWebhookChannel } from './http-webhook.channel';
import { MessagePayload } from '../interfaces/message-payload.interface';

describe('HttpWebhookChannel', () => {
  let channel: HttpWebhookChannel;
  let httpService: HttpService;
  let logger: any;

  beforeEach(async () => {
    logger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpWebhookChannel,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: logger,
        },
      ],
    }).compile();

    channel = module.get<HttpWebhookChannel>(HttpWebhookChannel);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(channel).toBeDefined();
  });

  describe('deliver', () => {
    const mockMessage: MessagePayload = {
      id: 'test-message-1',
      channel: 'http',
      destination: 'https://example.com/webhook',
      data: { test: 'data' },
      metadata: { source: 'test' },
    };

    it('should successfully deliver a message', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse) as any);

      await channel.deliver(mockMessage);

      expect(httpService.post).toHaveBeenCalledWith(
        mockMessage.destination,
        {
          id: mockMessage.id,
          data: mockMessage.data,
          metadata: mockMessage.metadata,
        },
        expect.objectContaining({
          timeout: 10000,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Message-Id': mockMessage.id,
          }),
        }),
      );

      expect(logger.log).toHaveBeenCalled();
    });

    it('should throw error on HTTP timeout', async () => {
      const error = new Error('Timeout');

      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => error));

      await expect(channel.deliver(mockMessage)).rejects.toThrow('Timeout');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error on HTTP error status', async () => {
      const mockResponse = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse) as any);

      await expect(channel.deliver(mockMessage)).rejects.toThrow('HTTP 500');
    });
  });
});
