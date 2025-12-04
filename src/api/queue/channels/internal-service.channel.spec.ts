import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InternalServiceChannel } from './internal-service.channel';
import { MessagePayload } from '../interfaces/message-payload.interface';

describe('InternalServiceChannel', () => {
  let channel: InternalServiceChannel;
  let logger: any;

  beforeEach(async () => {
    logger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalServiceChannel,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: logger,
        },
      ],
    }).compile();

    channel = module.get<InternalServiceChannel>(InternalServiceChannel);
  });

  it('should be defined', () => {
    expect(channel).toBeDefined();
  });

  describe('deliver', () => {
    const mockMessage: MessagePayload = {
      id: 'test-message-1',
      channel: 'internal',
      destination: 'internal-service',
      data: { action: 'process', payload: { test: 'data' } },
    };

    it('should successfully deliver to internal service', async () => {
      await channel.deliver(mockMessage);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining(`Processing internal service message ${mockMessage.id}`),
        'InternalServiceChannel',
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining(`Message ${mockMessage.id} delivered successfully`),
        'DeliveryChannel',
      );
    });

    it('should handle internal processing errors', async () => {
      // Mock processInternally to throw an error
      jest.spyOn(channel as any, 'processInternally').mockRejectedValue(
        new Error('Internal processing failed'),
      );

      await expect(channel.deliver(mockMessage)).rejects.toThrow(
        'Internal processing failed',
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
