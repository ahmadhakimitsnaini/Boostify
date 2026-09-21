import { Test, TestingModule } from '@nestjs/testing';
import { MetaWebhookController } from './meta-webhook.controller';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Response } from 'express';
import { HttpStatus } from '@nestjs/common';

describe('MetaWebhookController', () => {
  let controller: MetaWebhookController;
  let configService: ConfigService;
  let redisService: RedisService;
  let queueMock: any;

  beforeEach(async () => {
    queueMock = {
      add: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetaWebhookController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock_verify_token'),
          },
        },
        {
          provide: RedisService,
          useValue: {
            setNx: jest.fn().mockResolvedValue(true), // Default: key is new
          },
        },
        {
          provide: getQueueToken('incoming-messages'),
          useValue: queueMock,
        },
      ],
    }).compile();

    controller = module.get<MetaWebhookController>(MetaWebhookController);
    configService = module.get<ConfigService>(ConfigService);
    redisService = module.get<RedisService>(RedisService);
  });

  describe('verifyWebhook (GET)', () => {
    it('should verify token correctly and return challenge', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        sendStatus: jest.fn(),
      } as unknown as Response;

      controller.verifyWebhook('subscribe', 'mock_verify_token', 'challenge_string', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith('challenge_string');
    });

    it('should forbid incorrect token', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        sendStatus: jest.fn(),
      } as unknown as Response;

      controller.verifyWebhook('subscribe', 'wrong_token', 'challenge_string', res);

      expect(res.sendStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });
  });

  describe('handleIncomingMessage (POST)', () => {
    let res: Partial<Response>;

    beforeEach(() => {
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
    });

    it('should drop messages without valid IDs to prevent errors', async () => {
      const body = { entry: [{ changes: [{ value: {} }] }] }; // No messages or statuses

      await controller.handleIncomingMessage(body, res as Response);

      expect(redisService.setNx).not.toHaveBeenCalled();
      expect(queueMock.add).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith('EVENT_RECEIVED');
    });

    it('should process new valid message and add to queue', async () => {
      const body = {
        entry: [{ changes: [{ value: { messages: [{ id: 'wamid.123' }] } }] }],
      };

      await controller.handleIncomingMessage(body, res as Response);

      expect(redisService.setNx).toHaveBeenCalledWith('meta_event:wamid.123', '1', 3600);
      expect(queueMock.add).toHaveBeenCalledWith(
        'meta-message',
        body,
        expect.objectContaining({ jobId: 'wamid.123' })
      );
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith('EVENT_RECEIVED');
    });

    it('should drop duplicate messages due to idempotency', async () => {
      const body = {
        entry: [{ changes: [{ value: { messages: [{ id: 'wamid.123' }] } }] }],
      };

      // Mock redis to return false, meaning the key already exists (duplicate)
      jest.spyOn(redisService, 'setNx').mockResolvedValue(false);

      await controller.handleIncomingMessage(body, res as Response);

      expect(redisService.setNx).toHaveBeenCalledWith('meta_event:wamid.123', '1', 3600);
      expect(queueMock.add).not.toHaveBeenCalled(); // Should NOT be enqueued
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith('EVENT_RECEIVED'); // Still ack to Meta
    });

    it('should return 500 on internal queue failure to let Meta retry', async () => {
        const body = {
          entry: [{ changes: [{ value: { messages: [{ id: 'wamid.123' }] } }] }],
        };

        // Simulate queue failure
        queueMock.add.mockRejectedValue(new Error('Redis connection failed'));

        await controller.handleIncomingMessage(body, res as Response);

        expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      });
  });
});
