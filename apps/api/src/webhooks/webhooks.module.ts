import { Module } from '@nestjs/common';
import { MetaWebhookController } from './meta-webhook.controller';
import { BullModule } from '@nestjs/bullmq';
import { RedisService } from './redis.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'incoming-messages',
    }),
  ],
  controllers: [MetaWebhookController],
  providers: [RedisService],
})
export class WebhooksModule {}
