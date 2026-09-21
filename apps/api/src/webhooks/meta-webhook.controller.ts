import { Controller, Get, Post, Query, Res, Body, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MetaSignatureGuard } from './guards/meta-signature.guard';
import { RedisService } from './redis.service';

@Controller('api/webhooks/meta')
export class MetaWebhookController {
  constructor(
    private configService: ConfigService,
    @InjectQueue('incoming-messages') private incomingQueue: Queue,
    private redisService: RedisService
  ) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.configService.get<string>('META_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WEBHOOK_VERIFIED');
      res.status(HttpStatus.OK).send(challenge);
    } else {
      res.sendStatus(HttpStatus.FORBIDDEN);
    }
  }

  @Post()
  @UseGuards(MetaSignatureGuard)
  async handleIncomingMessage(@Body() body: any, @Res() res: Response) {
    try {
      // 1. Extract Event ID (e.g., wamid from messages, or ID from statuses)
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      let eventId = null;

      if (value?.messages && value.messages.length > 0) {
          eventId = value.messages[0].id; // Extract wamid
      } else if (value?.statuses && value.statuses.length > 0) {
          eventId = value.statuses[0].id; // Extract status id
      }

      if (!eventId) {
          console.warn('Could not extract event ID for idempotency');
          return res.status(HttpStatus.OK).send('EVENT_RECEIVED'); // Return OK to drop invalid payload
      }

      // 2. Check Idempotency (TTL 3600s = 1 hour)
      const idempotencyKey = `meta_event:${eventId}`;
      const isNewEvent = await this.redisService.setNx(idempotencyKey, '1', 3600);

      if (!isNewEvent) {
          console.log(`Duplicate event detected and dropped: ${eventId}`);
          return res.status(HttpStatus.OK).send('EVENT_RECEIVED'); // Duplicate, ignore and ack
      }

      // 3. Push to BullMQ
      await this.incomingQueue.add('meta-message', body, {
          jobId: eventId,
          removeOnComplete: true,
          removeOnFail: false
      });
      console.log(`Event enqueued: ${eventId}`);

      // 4. Return 200 OK ONLY after successful enqueue to prevent data loss
      res.status(HttpStatus.OK).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('Error processing webhook payload:', error);
      // Let it timeout or return 500 to trigger Meta retry on transient errors
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
    }
  }
}

