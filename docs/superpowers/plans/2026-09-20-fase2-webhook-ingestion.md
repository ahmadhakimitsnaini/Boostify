# Fase 2: Core Engine - Webhook Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a lightweight, secure Meta webhook endpoint that validates signatures, handles idempotency (rejects duplicates), and pushes valid payloads to a Redis queue via BullMQ in under 2 seconds.

**Architecture:**
1.  Add environment variables for Meta credentials.
2.  Set up Redis and BullMQ connection in the NestJS application.
3.  Create a custom `MetaSignatureGuard` to validate the `X-Hub-Signature-256` header.
4.  Create a `MetaWebhookController` with a `GET` endpoint for verification and a `POST` endpoint for receiving messages.
5.  Implement Idempotency checking using Redis to cache processed message IDs.

**Tech Stack:** NestJS, Redis, BullMQ (`@nestjs/bullmq`), crypto (Node.js built-in for HMAC SHA-256).

**Spec:** Described in `todos.md` under "Fase 2: Core Engine - Webhook Ingestion & Queue (Minggu 2)".

## Global Constraints
- The Webhook POST endpoint must return HTTP 200 OK within 2 seconds.
- The Webhook endpoint must be isolated from heavy global middlewares.
- Idempotency TTL in Redis is 1 hour (3600 seconds).

---

### Task 1: Setup Environment and Dependencies

**Files:**
- Modify: `.env.example`
- Modify: `package.json` (if new packages are needed, e.g., `@nestjs/bullmq`, `bullmq`)

**Interfaces:**
- Consumes: None
- Produces: Environment variables ready for use.

- [ ] **Step 1: Add environment variables to `.env.example`**
Add the following lines to `.env.example`:
```env
META_APP_SECRET=your_meta_app_secret
META_VERIFY_TOKEN=your_meta_verify_token
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 2: Ensure BullMQ dependencies are present**
Check `package.json` for `"@nestjs/bullmq"` and `"bullmq"`. If missing, add them.

- [ ] **Step 3: Commit**
```bash
git add .env.example package.json
git commit -m "chore: add env vars for meta and redis"
```

### Task 2: Setup Redis and BullMQ Module

**Files:**
- Modify: `src/app.module.ts` (or equivalent main module)

**Interfaces:**
- Consumes: `REDIS_URL` from environment.
- Produces: A configured `BullModule` available globally or in a shared module.

- [ ] **Step 1: Import and configure BullModule in AppModule**
Add `BullModule.forRoot()` to `imports` in `src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Commit**
```bash
git add src/app.module.ts
git commit -m "feat: configure bullmq with redis connection"
```

### Task 3: Create Webhook Module and Controller (GET Verification)

**Files:**
- Create: `src/webhooks/webhooks.module.ts`
- Create: `src/webhooks/meta-webhook.controller.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `META_VERIFY_TOKEN` from ConfigService.
- Produces: `GET /api/webhooks/meta` endpoint that responds to Meta's `hub.challenge`.

- [ ] **Step 1: Create WebhooksModule**
```typescript
// src/webhooks/webhooks.module.ts
import { Module } from '@nestjs/common';
import { MetaWebhookController } from './meta-webhook.controller';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'incoming-messages',
    }),
  ],
  controllers: [MetaWebhookController],
})
export class WebhooksModule {}
```

- [ ] **Step 2: Import WebhooksModule into AppModule**
Add `WebhooksModule` to `imports` in `src/app.module.ts`.

- [ ] **Step 3: Create GET endpoint in MetaWebhookController**
```typescript
// src/webhooks/meta-webhook.controller.ts
import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Controller('api/webhooks/meta')
export class MetaWebhookController {
  constructor(private configService: ConfigService) {}

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
}
```

- [ ] **Step 4: Commit**
```bash
git add src/webhooks/ src/app.module.ts
git commit -m "feat: add meta webhook verification endpoint"
```

### Task 4: Implement Meta Signature Validation Guard

**Files:**
- Create: `src/webhooks/guards/meta-signature.guard.ts`
- Modify: `src/main.ts` (to ensure raw body is available)

**Interfaces:**
- Consumes: `X-Hub-Signature-256` header, raw request body, `META_APP_SECRET`.
- Produces: Boolean indicating if the request is valid.

- [ ] **Step 1: Enable raw body in main.ts**
Meta signature validation requires the exact raw payload before JSON parsing.
Modify `src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable rawBody for signature validation
  });
  await app.listen(3000);
}
bootstrap();
```

- [ ] **Step 2: Create MetaSignatureGuard**
```typescript
// src/webhooks/guards/meta-signature.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class MetaSignatureGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const signatureHeader = request.headers['x-hub-signature-256'] as string;

    if (!signatureHeader) {
      throw new ForbiddenException('Missing signature header');
    }

    const appSecret = this.configService.get<string>('META_APP_SECRET');
    if (!appSecret) {
      throw new Error('META_APP_SECRET is not configured');
    }

    // req.rawBody is available because we set { rawBody: true } in main.ts
    const rawBody = (request as any).rawBody;
    
    if (!rawBody) {
       throw new ForbiddenException('Raw body is missing');
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')}`;

    if (signatureHeader !== expectedSignature) {
      throw new ForbiddenException('Invalid signature');
    }

    return true;
  }
}
```

- [ ] **Step 3: Commit**
```bash
git add src/webhooks/guards/ src/main.ts
git commit -m "feat: implement meta signature validation guard"
```

### Task 5: Implement Webhook POST Endpoint with Idempotency & Queueing

**Files:**
- Create: `src/webhooks/redis.service.ts`
- Modify: `src/webhooks/meta-webhook.controller.ts`
- Modify: `src/webhooks/webhooks.module.ts`

**Interfaces:**
- Consumes: Validated Meta payload (containing `wamid` or similar Event ID).
- Produces: Enqueues job to `incoming-messages` queue and returns 200 OK.

- [ ] **Step 1: Create RedisService for idempotency**
```typescript
// src/webhooks/redis.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.redisClient = new Redis(this.configService.get<string>('REDIS_URL'));
  }

  onModuleDestroy() {
    this.redisClient.quit();
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redisClient.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }
}
```
Add `RedisService` to `providers` in `WebhooksModule`.

- [ ] **Step 2: Implement POST endpoint**
Update `src/webhooks/meta-webhook.controller.ts`:
```typescript
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

  // ... (keep existing GET endpoint) ...

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
```

- [ ] **Step 3: Commit**
```bash
git add src/webhooks/
git commit -m "feat: implement POST webhook with idempotency and bullmq"
```
